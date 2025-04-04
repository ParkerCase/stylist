"""
Base classes and interfaces for retailer API integration.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Union
import logging
import time
import json
import aiohttp
import asyncio
from datetime import datetime, timedelta

from models.clothing import ClothingItem, RetailerInventory
from integrations.cache.memory_cache import MemoryCache
from integrations.cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)


@dataclass
class RetailerConfig:
    """Configuration for a retailer API client."""

    retailer_id: str
    retailer_name: str
    api_url: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    api_version: Optional[str] = None
    timeout: int = 30
    cache_ttl: int = 3600  # 1 hour
    max_retries: int = 3
    use_cache: bool = True
    # Optional custom headers and params
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, str]] = None


@dataclass
class InventoryFilter:
    """Filter options for inventory requests."""

    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    price_min: Optional[float] = None


@dataclass
class InventoryData:
    """Data structure for inventory response."""
    
    items: List[ClothingItem]
    total_count: int
    page: int = 1
    total_pages: int = 1
    price_max: Optional[float] = None
    size: Optional[str] = None
    gender: Optional[str] = None
    on_sale: Optional[bool] = None
    tags: Optional[List[str]] = None


class RetailerAPIError(Exception):
    """Base exception for RetailerAPI errors."""

    def __init__(
        self, message: str, status_code: Optional[int] = None, details: Any = None
    ):
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class RetailerAPI(ABC):
    """Base class for retailer API clients."""

    def __init__(self, config: RetailerConfig):
        self.config = config
        self.client_session = None
        self.requests_made = 0

        # Set up cache
        if config.use_cache:
            try:
                self.cache = RedisCache(f"retailer:{config.retailer_id}", config.cache_ttl)
                logger.info(
                    f"Using Redis cache for retailer {config.retailer_id} with TTL {config.cache_ttl}s"
                )
            except Exception as e:
                logger.warning(
                    f"Redis cache initialization failed, falling back to memory cache: {str(e)}"
                )
                self.cache = MemoryCache(config.cache_ttl)
        else:
            self.cache = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session."""
        if self.client_session is None or self.client_session.closed:
            self.client_session = aiohttp.ClientSession(
                headers=self._get_headers(),
                timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            )
        return self.client_session

    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        headers = {"Content-Type": "application/json"}
        
        # Add API key if present
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        
        # Add custom headers
        if self.config.headers:
            headers.update(self.config.headers)
            
        return headers

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an HTTP request to the API."""
        url = f"{self.config.api_url}/{endpoint.lstrip('/')}"
        
        # Combine default params with provided params
        request_params = {}
        if self.config.params:
            request_params.update(self.config.params)
        if params:
            request_params.update(params)
            
        # Combine default headers with provided headers
        request_headers = self._get_headers()
        if headers:
            request_headers.update(headers)
            
        session = await self._get_session()
        retries = 0
        last_error = None
        
        while retries <= self.config.max_retries:
            try:
                self.requests_made += 1
                
                if method.upper() == "GET":
                    async with session.get(
                        url, params=request_params, headers=request_headers
                    ) as response:
                        return await self._handle_response(response)
                        
                elif method.upper() == "POST":
                    async with session.post(
                        url,
                        params=request_params,
                        json=data,
                        headers=request_headers,
                    ) as response:
                        return await self._handle_response(response)
                        
                elif method.upper() == "PUT":
                    async with session.put(
                        url,
                        params=request_params,
                        json=data,
                        headers=request_headers,
                    ) as response:
                        return await self._handle_response(response)
                        
                elif method.upper() == "DELETE":
                    async with session.delete(
                        url, params=request_params, headers=request_headers
                    ) as response:
                        return await self._handle_response(response)
                        
                else:
                    raise RetailerAPIError(f"Unsupported HTTP method: {method}")
                    
            except aiohttp.ClientError as e:
                last_error = RetailerAPIError(
                    f"HTTP client error: {str(e)}", details={"exception": str(e)}
                )
                
            except RetailerAPIError as e:
                # If it's a rate limit error, retry after delay
                if e.status_code in (429, 503):
                    delay = 2 ** retries  # Exponential backoff
                    logger.warning(
                        f"Rate limit hit for {self.config.retailer_id}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    retries += 1
                    last_error = e
                    continue
                else:
                    # For other API errors, don't retry
                    raise
                    
            except Exception as e:
                last_error = RetailerAPIError(
                    f"Unexpected error: {str(e)}", details={"exception": str(e)}
                )
                
            # If we get here, there was an error
            retries += 1
            if retries <= self.config.max_retries:
                delay = 2 ** retries  # Exponential backoff
                logger.warning(
                    f"Request failed for {self.config.retailer_id}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"Request failed after {retries} retries for {self.config.retailer_id}"
                )
                if last_error:
                    raise last_error
                raise RetailerAPIError("Request failed after max retries")

    async def _handle_response(self, response: aiohttp.ClientResponse) -> Any:
        """Handle API response and return parsed data."""
        content_type = response.headers.get("Content-Type", "")
        
        if response.status >= 400:
            error_detail = None
            
            if "application/json" in content_type:
                try:
                    error_detail = await response.json()
                except:
                    error_detail = await response.text()
            else:
                error_detail = await response.text()
                
            raise RetailerAPIError(
                f"API error: {response.status} {response.reason}",
                status_code=response.status,
                details=error_detail,
            )
            
        if "application/json" in content_type:
            return await response.json()
        else:
            return await response.text()

    def _cache_key(self, operation: str, **kwargs) -> str:
        """Generate a cache key for an operation."""
        # Sort kwargs to ensure consistent key
        sorted_kwargs = sorted(kwargs.items())
        # Create a string representation of kwargs
        kwargs_str = "_".join(f"{k}={v}" for k, v in sorted_kwargs)
        return f"{self.config.retailer_id}:{operation}:{kwargs_str}"

    def clear_cache(self) -> None:
        """Clear the cache for this retailer."""
        if self.cache:
            self.cache.clear()
            logger.info(f"Cache cleared for retailer {self.config.retailer_id}")

    @abstractmethod
    def get_inventory(
        self,
        limit: int = 100,
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None,
    ) -> RetailerInventory:
        """Get inventory items with pagination and filtering."""
        pass

    async def get_inventory_async(
        self,
        limit: int = 100,
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None,
    ) -> RetailerInventory:
        """Async version of get_inventory."""
        # Default implementation runs the sync version in a thread
        return self.get_inventory(limit, page, category, filter_options)

    @abstractmethod
    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """Get a specific item by ID."""
        pass

    @abstractmethod
    def search_items(
        self, query: str, limit: int = 20, filter_options: Optional[InventoryFilter] = None
    ) -> List[ClothingItem]:
        """Search for items by query string."""
        pass

    @abstractmethod
    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """Check availability for multiple items."""
        pass

    def close(self) -> None:
        """Close the API client and release resources."""
        if self.client_session and not self.client_session.closed:
            asyncio.create_task(self.client_session.close())
            logger.debug(f"Closed client session for retailer {self.config.retailer_id}")

    def __del__(self):
        """Cleanup when the object is garbage collected."""
        self.close()