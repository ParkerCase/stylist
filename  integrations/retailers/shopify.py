"""
Shopify API integration for The Stylist.
"""

import logging
import json
import base64
import hmac
import hashlib
import time
from typing import Dict, List, Any, Optional, Union
from urllib.parse import urlencode

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerConfig,
    RetailerAPIError,
)
from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.integrations.transformers.data_transformers import transform_from_shopify

logger = logging.getLogger(__name__)


class ShopifyAPI(RetailerAPI):
    """Shopify API client for accessing product data."""

    def __init__(self, config: RetailerConfig, cache: Optional[Any] = None):
        """
        Initialize the Shopify API client.

        Args:
            config: RetailerConfig object
            cache: Cache implementation (defaults to MemoryCache if None)
        """
        super().__init__(config, cache)

        # Validate required configuration
        if not config.api_key or not config.api_secret:
            raise ValueError("Shopify API requires api_key and api_secret")

        # Initialize API session with authentication
        auth_string = f"{config.api_key}:{config.api_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()

        self.session.headers.update(
            {
                "Authorization": f"Basic {encoded_auth}",
                "X-Shopify-Access-Token": config.api_secret,
            }
        )

    def _build_url(self, endpoint: str) -> str:
        """
        Build a fully qualified Shopify API URL.

        Args:
            endpoint: API endpoint

        Returns:
            Full API URL
        """
        # Clean endpoint to ensure it starts with admin/api
        if not endpoint.startswith("admin/api"):
            if self.config.api_version:
                endpoint = f"admin/api/{self.config.api_version}/{endpoint}"
            else:
                endpoint = f"admin/api/2023-10/{endpoint}"  # Default to recent version

        return f"{self.config.api_url}/{endpoint}"

    def get_inventory(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> RetailerInventory:
        """
        Get product inventory from Shopify.

        Args:
            limit: Maximum number of items to retrieve
            page: Page number for pagination
            category: Optional category filter (collection handle in Shopify)

        Returns:
            RetailerInventory object

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            # Prepare query parameters
            params = {
                "limit": min(limit, 250),  # Shopify max is 250
                "page": page,
                "status": "active",
                "fields": "id,title,body_html,vendor,product_type,tags,images,variants,options,collections",
            }

            if category:
                # If category provided, we need to first get the collection ID
                collection_id = self._get_collection_id(category)
                if collection_id:
                    endpoint = f"products.json?collection_id={collection_id}"
                else:
                    logger.warning(
                        f"Collection '{category}' not found for {self.config.retailer_name}"
                    )
                    endpoint = "products.json"
            else:
                endpoint = "products.json"

            # Make API request
            products_data = self.request("GET", endpoint, params=params)

            # Transform to our data model
            items = transform_from_shopify(
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
            logger.error(f"Error getting Shopify inventory: {str(e)}")
            raise RetailerAPIError(
                message=f"Error getting inventory: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get details for a specific Shopify product.

        Args:
            item_id: ID of the item to retrieve (Shopify product ID)

        Returns:
            ClothingItem object or None if not found

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        try:
            # Extract Shopify product ID from our item_id format
            if item_id.startswith(f"{self.config.retailer_id}_"):
                shopify_id = item_id.split("_", 1)[1]
            else:
                shopify_id = item_id

            # Make API request
            endpoint = f"products/{shopify_id}.json"
            product_data = self.request("GET", endpoint)

            # Transform to our data model
            items = transform_from_shopify(
                {"products": [product_data.get("product", {})]},
                self.config.retailer_id,
                self.config.retailer_name,
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
            logger.error(f"Error getting Shopify product {item_id}: {str(e)}")
            raise RetailerAPIError(
                message=f"Error getting product: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for multiple Shopify products.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)

        Raises:
            RetailerAPIError: If the API returns an error response
        """
        result = {}

        try:
            # Process in batches of 50 to avoid exceeding API limits
            batch_size = 50
            for i in range(0, len(item_ids), batch_size):
                batch = item_ids[i : i + batch_size]
                batch_result = self._check_batch_availability(batch)
                result.update(batch_result)

            return result

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error checking Shopify product availability: {str(e)}")
            raise RetailerAPIError(
                message=f"Error checking availability: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def _check_batch_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for a batch of Shopify products.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)
        """
        result = {}

        # Extract Shopify IDs
        shopify_ids = []
        id_mapping = {}  # Map Shopify IDs back to our item_ids

        for item_id in item_ids:
            if item_id.startswith(f"{self.config.retailer_id}_"):
                shopify_id = item_id.split("_", 1)[1]
            else:
                shopify_id = item_id

            shopify_ids.append(shopify_id)
            id_mapping[shopify_id] = item_id

        # Construct comma-separated list of IDs
        ids_str = ",".join(shopify_ids)

        # Make API request to get inventory levels
        endpoint = f"products.json?ids={ids_str}&fields=id,variants.inventory_quantity,variants.inventory_policy"
        products_data = self.request("GET", endpoint)

        # Process each product
        for product in products_data.get("products", []):
            product_id = str(product.get("id"))

            # Get mapped item_id
            item_id = id_mapping.get(product_id, product_id)

            # Check variants for availability
            available = False
            for variant in product.get("variants", []):
                inventory_quantity = variant.get("inventory_quantity", 0)
                inventory_policy = variant.get("inventory_policy", "")

                # If inventory policy is "continue", the product is always available
                if inventory_policy == "continue" or inventory_quantity > 0:
                    available = True
                    break

            result[item_id] = available

        # Set availability false for any product not found
        for item_id in item_ids:
            if item_id not in result:
                result[item_id] = False

        return result

    def search_items(self, query: str, limit: int = 20) -> List[ClothingItem]:
        """
        Search for Shopify products by query.

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
            params = {
                "limit": min(limit, 250),
                "fields": "id,title,body_html,vendor,product_type,tags,images,variants,options,collections",
            }

            # Make API request
            endpoint = f"products/search.json?query={query}"
            search_data = self.request("GET", endpoint, params=params)

            # Transform to our data model
            items = transform_from_shopify(
                search_data, self.config.retailer_id, self.config.retailer_name
            )

            return items

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error searching Shopify products: {str(e)}")
            raise RetailerAPIError(
                message=f"Error searching products: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def _get_collection_id(self, collection_handle: str) -> Optional[str]:
        """
        Get collection ID from collection handle (slug).

        Args:
            collection_handle: Collection handle/slug

        Returns:
            Collection ID or None if not found
        """
        try:
            # Try to get collection by handle
            endpoint = f"collections.json?handle={collection_handle}"
            collections_data = self.request("GET", endpoint)

            collections = collections_data.get("collections", [])
            if collections:
                return str(collections[0].get("id"))

            return None

        except Exception as e:
            logger.warning(
                f"Error getting collection ID for {collection_handle}: {str(e)}"
            )
            return None
