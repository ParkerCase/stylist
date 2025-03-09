"""
WooCommerce API integration for The Stylist.
"""

import logging
import json
import time
import hmac
import hashlib
import base64
from typing import Dict, List, Any, Optional, Union
from urllib.parse import urlencode

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerConfig,
    RetailerAPIError,
)
from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.integrations.transformers.data_transformers import (
    transform_from_woocommerce,
)

logger = logging.getLogger(__name__)


class WooCommerceAPI(RetailerAPI):
    """WooCommerce API client for accessing product data."""

    def __init__(self, config: RetailerConfig, cache: Optional[Any] = None):
        """
        Initialize the WooCommerce API client.

        Args:
            config: RetailerConfig object
            cache: Cache implementation (defaults to MemoryCache if None)
        """
        super().__init__(config, cache)

        # Validate required configuration
        if not config.api_key or not config.api_secret:
            raise ValueError(
                "WooCommerce API requires api_key (consumer key) and api_secret (consumer secret)"
            )

    def _get_auth_params(self) -> Dict[str, str]:
        """
        Get authentication parameters for OAuth 1.0a.

        Returns:
            Dictionary of OAuth parameters
        """
        return {
            "consumer_key": self.config.api_key,
            "consumer_secret": self.config.api_secret,
        }

    def _build_url(self, endpoint: str) -> str:
        """
        Build a fully qualified WooCommerce API URL.

        Args:
            endpoint: API endpoint

        Returns:
            Full API URL
        """
        # Clean endpoint
        if not endpoint.startswith("wp-json/wc"):
            endpoint = f"wp-json/wc/v3/{endpoint.lstrip('/')}"

        return f"{self.config.api_url}/{endpoint}"

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
        Make a request to the WooCommerce API with authentication.

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
        # Add authentication parameters
        auth_params = self._get_auth_params()

        if params is None:
            params = {}

        # Add auth params to the request
        request_params = {**params, **auth_params}

        # Use parent implementation
        return super().request(
            method=method,
            endpoint=endpoint,
            params=request_params,
            data=data,
            headers=headers,
            use_cache=use_cache,
        )

    def get_inventory(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> RetailerInventory:
        """
        Get product inventory from WooCommerce.

        Args:
            limit: Maximum number of items to retrieve
            page: Page number for pagination
            category: Optional category filter (category ID or slug)

        Returns:
            RetailerInventory object

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            # Prepare query parameters
            params = {
                "per_page": min(limit, 100),  # WooCommerce max is 100
                "page": page,
                "status": "publish",
            }

            if category:
                # Check if category is a numeric ID or a slug
                if category.isdigit():
                    params["category"] = category
                else:
                    # Get category ID from slug
                    category_id = self._get_category_id_from_slug(category)
                    if category_id:
                        params["category"] = category_id

            # Make API request
            products_data = self.request("GET", "products", params=params)

            # Transform to our data model
            items = transform_from_woocommerce(
                products_data, self.config.retailer_id, self.config.retailer_name
            )

            # Create inventory dictionary
            items_dict = {item.item_id: item for item in items}

            # Create and return inventory
            inventory = RetailerInventory(
                retailer_id=self.config.retailer_id,
                retailer_name=self.config.retailer_name,
                items=items_dict,
                last_updated=time.time(),
            )

            return inventory

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error getting WooCommerce inventory: {str(e)}")
            raise RetailerAPIError(
                message=f"Error getting inventory: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get details for a specific WooCommerce product.

        Args:
            item_id: ID of the item to retrieve (WooCommerce product ID)

        Returns:
            ClothingItem object or None if not found

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            # Extract WooCommerce product ID from our item_id format
            if item_id.startswith(f"{self.config.retailer_id}_"):
                wc_id = item_id.split("_", 1)[1]
            else:
                wc_id = item_id

            # Make API request
            product_data = self.request("GET", f"products/{wc_id}")

            # Transform to our data model
            items = transform_from_woocommerce(
                [product_data], self.config.retailer_id, self.config.retailer_name
            )

            if items:
                return items[0]

            return None

        except RetailerAPIError as e:
            if e.status_code == 404:
                # Product not found, return None
                return None
            # Re-raise other API errors
            raise
        except Exception as e:
            logger.error(f"Error getting WooCommerce product {item_id}: {str(e)}")
            raise RetailerAPIError(
                message=f"Error getting product: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for multiple WooCommerce products.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        result = {}

        try:
            # Process in batches of 20 to avoid exceeding API limits
            batch_size = 20
            for i in range(0, len(item_ids), batch_size):
                batch = item_ids[i : i + batch_size]
                batch_result = self._check_batch_availability(batch)
                result.update(batch_result)

            return result

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error checking WooCommerce product availability: {str(e)}")
            raise RetailerAPIError(
                message=f"Error checking availability: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def _check_batch_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for a batch of WooCommerce products.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)
        """
        result = {}

        # Extract WooCommerce IDs
        wc_ids = []
        id_mapping = {}  # Map WooCommerce IDs back to our item_ids

        for item_id in item_ids:
            if item_id.startswith(f"{self.config.retailer_id}_"):
                wc_id = item_id.split("_", 1)[1]
            else:
                wc_id = item_id

            wc_ids.append(wc_id)
            id_mapping[wc_id] = item_id

        # Construct comma-separated list of IDs
        ids_str = ",".join(wc_ids)

        # Make API request
        params = {
            "include": ids_str,
            "per_page": len(wc_ids),
            "fields": "id,stock_status,stock_quantity,manage_stock",
        }

        products_data = self.request("GET", "products", params=params)

        # Process each product
        for product in products_data:
            product_id = str(product.get("id"))

            # Get mapped item_id
            item_id = id_mapping.get(product_id, product_id)

            # Check stock status
            stock_status = product.get("stock_status", "")
            manage_stock = product.get("manage_stock", False)
            stock_quantity = product.get("stock_quantity", 0)

            # Determine availability
            if stock_status == "instock" or (manage_stock and stock_quantity > 0):
                result[item_id] = True
            else:
                result[item_id] = False

        # Set availability false for any product not found
        for item_id in item_ids:
            if item_id not in result:
                result[item_id] = False

        return result

    def search_items(self, query: str, limit: int = 20) -> List[ClothingItem]:
        """
        Search for WooCommerce products by query.

        Args:
            query: Search query
            limit: Maximum number of items to retrieve

        Returns:
            List of ClothingItem objects

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            # Prepare query parameters
            params = {"search": query, "per_page": min(limit, 100)}

            # Make API request
            search_data = self.request("GET", "products", params=params)

            # Transform to our data model
            items = transform_from_woocommerce(
                search_data, self.config.retailer_id, self.config.retailer_name
            )

            return items

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error searching WooCommerce products: {str(e)}")
            raise RetailerAPIError(
                message=f"Error searching products: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def _get_category_id_from_slug(self, slug: str) -> Optional[str]:
        """
        Get category ID from slug.

        Args:
            slug: Category slug

        Returns:
            Category ID or None if not found
        """
        try:
            # Get category by slug
            params = {"slug": slug, "fields": "id"}

            categories = self.request("GET", "products/categories", params=params)

            if categories and len(categories) > 0:
                return str(categories[0].get("id"))

            return None

        except Exception as e:
            logger.warning(f"Error getting category ID for slug {slug}: {str(e)}")
            return None
