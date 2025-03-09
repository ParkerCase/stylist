"""
Base class for retailer API integration.
"""

import abc
import time
import logging
import hashlib
import json
from typing import Dict, List, Any, Optional, Union, Tuple, Callable
from datetime import datetime, timedelta
import asyncio
import aiohttp
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.integrations.cache.memory_cache import MemoryCache

logger = logging.getLogger(__name__)


class RetailerAPIError(Exception):
    """Exception raised for retailer API errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        retailer_id: Optional[str] = None,
        response_body: Optional[str] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.retailer_id = retailer_id
        self.response_body = response_body
        super().__init__(self.message)

    def __str__(self) -> str:
        error_parts = [self.message]
        if self.status_code:
            error_parts.append(f"Status code: {self.status_code}")
        if self.retailer_id:
            error_parts.append(f"Retailer: {self.retailer_id}")
        return " | ".join(error_parts)


class RetailerConfig:
    """Configuration for retailer API connections."""

    def __init__(
        self,
        api_url: str,
        retailer_id: str,
        retailer_name: str,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        api_version: Optional[str] = None,
        timeout: int = 30,
        cache_ttl: int = 3600,  # 1 hour default cache TTL
        max_retries: int = 3,
        use_cache: bool = True,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize retailer configuration.

        Args:
            api_url: Base URL for the retailer API
            retailer_id: Unique identifier for the retailer
            retailer_name: Display name of the retailer
            api_key: API key for authentication (if required)
            api_secret: API secret for authentication (if required)
            api_version: API version to use (if required)
            timeout: Request timeout in seconds
            cache_ttl: Cache time-to-live in seconds
            max_retries: Maximum number of retries for failed requests
            use_cache: Whether to use caching for this retailer
            headers: Additional headers to include in API requests
            params: Additional query parameters to include in API requests
        """
        self.api_url = api_url.rstrip("/")  # Remove trailing slash if present
        self.retailer_id = retailer_id
        self.retailer_name = retailer_name
        self.api_key = api_key
        self.api_secret = api_secret
        self.api_version = api_version
        self.timeout = timeout
        self.cache_ttl = cache_ttl
        self.max_retries = max_retries
        self.use_cache = use_cache
        self.headers = headers or {}
        self.params = params or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary (without sensitive data)."""
        return {
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer_name,
            "api_url": self.api_url,
            "api_version": self.api_version,
            "timeout": self.timeout,
            "cache_ttl": self.cache_ttl,
            "max_retries": self.max_retries,
            "use_cache": self.use_cache,
        }


class RetailerAPI(abc.ABC):
    """Abstract base class for retailer API clients."""

    def __init__(self, config: RetailerConfig, cache: Optional[Any] = None):
        """
        Initialize the retailer API client.

        Args:
            config: RetailerConfig object with API settings
            cache: Cache implementation (defaults to MemoryCache if None)
        """
        self.config = config
        self.cache = cache or MemoryCache()
        self.session = requests.Session()

        # Add default headers
        self.session.headers.update(
            {
                "User-Agent": "The-Stylist/1.0",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )

        # Add custom headers
        if config.headers:
            self.session.headers.update(config.headers)

    def _get_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """
        Generate a unique cache key for the request.

        Args:
            endpoint: API endpoint
            params: Request parameters

        Returns:
            String cache key
        """
        # Create a string representing the request
        param_str = json.dumps(params, sort_keys=True) if params else ""
        key_data = f"{self.config.retailer_id}:{endpoint}:{param_str}"

        # Generate a hash for the cache key
        return hashlib.md5(key_data.encode()).hexdigest()

    def _handle_response(
        self, response: requests.Response, endpoint: str
    ) -> Dict[str, Any]:
        """
        Handle API response and raise appropriate exceptions.

        Args:
            response: Requests response object
            endpoint: API endpoint for logging

        Returns:
            Dictionary with response data

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Log details for debugging
            error_message = f"HTTP error from {self.config.retailer_name} API: {str(e)}"
            logger.error(error_message)

            try:
                error_body = response.json()
                logger.error(f"Error response: {error_body}")
            except Exception:
                error_body = response.text
                if error_body:
                    logger.error(f"Error response text: {error_body}")

            raise RetailerAPIError(
                message=f"HTTP error accessing {endpoint}: {str(e)}",
                status_code=response.status_code,
                retailer_id=self.config.retailer_id,
                response_body=response.text,
            )
        except ValueError as e:
            # JSON parsing error
            logger.error(
                f"JSON parsing error for {self.config.retailer_name} API: {str(e)}"
            )
            raise RetailerAPIError(
                message=f"Invalid JSON response from {endpoint}: {str(e)}",
                retailer_id=self.config.retailer_id,
                response_body=response.text,
            )

    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        use_cache: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Make a request to the retailer API with retries and caching.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            params: Query parameters
            data: Request body data
            headers: Additional headers
            use_cache: Whether to use cache for this request (overrides config)

        Returns:
            Dictionary with response data

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        full_url = f"{self.config.api_url}/{endpoint.lstrip('/')}"

        # Merge params with default params from config
        request_params = {**self.config.params}
        if params:
            request_params.update(params)

        # Determine if we should use cache for this request
        should_use_cache = self.config.use_cache if use_cache is None else use_cache

        # Only use cache for GET requests
        if should_use_cache and method.upper() == "GET":
            cache_key = self._get_cache_key(endpoint, request_params)
            cached_data = self.cache.get(cache_key)

            if cached_data is not None:
                logger.debug(
                    f"Cache hit for {self.config.retailer_name} API: {endpoint}"
                )
                return cached_data

        # Prepare headers
        request_headers = {}
        if headers:
            request_headers.update(headers)

        # Implement retry logic
        retries = 0
        while retries <= self.config.max_retries:
            try:
                logger.debug(
                    f"Making {method} request to {self.config.retailer_name} API: {full_url}"
                )

                response = self.session.request(
                    method=method,
                    url=full_url,
                    params=request_params,
                    json=data,
                    headers=request_headers,
                    timeout=self.config.timeout,
                )

                result = self._handle_response(response, endpoint)

                # Cache successful GET responses
                if should_use_cache and method.upper() == "GET":
                    cache_key = self._get_cache_key(endpoint, request_params)
                    self.cache.set(cache_key, result, self.config.cache_ttl)

                return result

            except (Timeout, ConnectionError) as e:
                retries += 1
                if retries > self.config.max_retries:
                    logger.error(
                        f"Failed to connect to {self.config.retailer_name} API after "
                        f"{self.config.max_retries} retries: {str(e)}"
                    )
                    raise RetailerAPIError(
                        message=f"Connection error after {self.config.max_retries} retries: {str(e)}",
                        retailer_id=self.config.retailer_id,
                    )

                # Exponential backoff
                wait_time = 2**retries
                logger.warning(
                    f"Retrying {self.config.retailer_name} API request after {wait_time}s "
                    f"(attempt {retries}/{self.config.max_retries})"
                )
                time.sleep(wait_time)

            except RetailerAPIError:
                # Re-raise API errors without retrying
                raise

            except Exception as e:
                # Log unexpected errors
                logger.error(
                    f"Unexpected error accessing {self.config.retailer_name} API: {str(e)}"
                )
                raise RetailerAPIError(
                    message=f"Unexpected error: {str(e)}",
                    retailer_id=self.config.retailer_id,
                )

    def clear_cache(self) -> None:
        """Clear the cache for this retailer."""
        self.cache.clear()
        logger.info(f"Cleared cache for {self.config.retailer_name} API")

    @abc.abstractmethod
    def get_inventory(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> RetailerInventory:
        """
        Get inventory data from the retailer.

        Args:
            limit: Maximum number of items to retrieve
            page: Page number for pagination
            category: Optional category filter

        Returns:
            RetailerInventory object

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        pass

    @abc.abstractmethod
    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get details for a specific item.

        Args:
            item_id: ID of the item to retrieve

        Returns:
            ClothingItem object or None if not found

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        pass

    @abc.abstractmethod
    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for multiple items.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        pass

    @abc.abstractmethod
    def search_items(self, query: str, limit: int = 20) -> List[ClothingItem]:
        """
        Search for items by query.

        Args:
            query: Search query
            limit: Maximum number of items to retrieve

        Returns:
            List of ClothingItem objects

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        pass

    async def get_inventory_async(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> RetailerInventory:
        """
        Asynchronous version of get_inventory.
        Default implementation just calls the synchronous version.
        Override for true async implementation.

        Args:
            limit: Maximum number of items to retrieve
            page: Page number for pagination
            category: Optional category filter

        Returns:
            RetailerInventory object
        """
        # Default implementation just calls the synchronous version
        # Subclasses should override with a true async implementation
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self.get_inventory(limit=limit, page=page, category=category)
        )
