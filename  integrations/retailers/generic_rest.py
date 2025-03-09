"""
Generic REST API integration for The Stylist.
Supports any REST API with custom field mapping.
"""

import logging
import time
from typing import Dict, List, Any, Optional, Union, Callable

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerConfig,
    RetailerAPIError,
)
from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.integrations.transformers.data_transformers import transform_from_generic

logger = logging.getLogger(__name__)


class GenericRestAPI(RetailerAPI):
    """Generic REST API client for any retailer with custom mapping."""

    def __init__(
        self,
        config: RetailerConfig,
        field_mapping: Dict[str, str],
        inventory_endpoint: str,
        item_endpoint_template: str,
        search_endpoint_template: str,
        availability_endpoint: Optional[str] = None,
        inventory_response_path: str = "products",
        cache: Optional[Any] = None,
    ):
        """
        Initialize the generic REST API client.

        Args:
            config: RetailerConfig object
            field_mapping: Dictionary mapping API fields to ClothingItem fields
            inventory_endpoint: Endpoint for getting inventory
            item_endpoint_template: Endpoint template for getting item details (use {id} placeholder)
            search_endpoint_template: Endpoint template for searching (use {query} placeholder)
            availability_endpoint: Optional endpoint for checking availability
            inventory_response_path: JSON path to the products list in inventory response
            cache: Cache implementation (defaults to MemoryCache if None)
        """
        super().__init__(config, cache)

        self.field_mapping = field_mapping
        self.inventory_endpoint = inventory_endpoint
        self.item_endpoint_template = item_endpoint_template
        self.search_endpoint_template = search_endpoint_template
        self.availability_endpoint = availability_endpoint
        self.inventory_response_path = inventory_response_path

    def _extract_data(self, response_data: Dict[str, Any], path: str) -> Any:
        """
        Extract data from a nested response using dot notation path.

        Args:
            response_data: API response data
            path: Dot notation path to data (e.g., "data.products")

        Returns:
            Extracted data or empty list if not found
        """
        if not path:
            return response_data

        parts = path.split(".")
        result = response_data

        for part in parts:
            if isinstance(result, dict) and part in result:
                result = result[part]
            else:
                return []

        return result

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
        try:
            # Prepare query parameters
            params = {"limit": limit, "page": page}

            if category:
                params["category"] = category

            # Make API request
            response_data = self.request("GET", self.inventory_endpoint, params=params)

            # Extract products data using path
            products_data = self._extract_data(
                response_data, self.inventory_response_path
            )

            # Transform to our data model using field mapping
            items = transform_from_generic(
                products_data,
                self.config.retailer_id,
                self.config.retailer_name,
                self.field_mapping,
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
            logger.error(
                f"Error getting inventory from {self.config.retailer_name}: {str(e)}"
            )
            raise RetailerAPIError(
                message=f"Error getting inventory: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

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
        try:
            # Extract retailer product ID from our item_id format
            if item_id.startswith(f"{self.config.retailer_id}_"):
                product_id = item_id.split("_", 1)[1]
            else:
                product_id = item_id

            # Create endpoint with ID
            endpoint = self.item_endpoint_template.format(id=product_id)

            # Make API request
            response_data = self.request("GET", endpoint)

            # Transform to our data model
            items = transform_from_generic(
                {"product": response_data},
                self.config.retailer_id,
                self.config.retailer_name,
                self.field_mapping,
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
            logger.error(
                f"Error getting product {item_id} from {self.config.retailer_name}: {str(e)}"
            )
            raise RetailerAPIError(
                message=f"Error getting product: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

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
        # If an availability endpoint is not provided, fall back to individual item checks
        if not self.availability_endpoint:
            return self._check_availability_individual(item_ids)

        try:
            # Extract retailer product IDs
            product_ids = []
            id_mapping = {}  # Map retailer IDs back to our item_ids

            for item_id in item_ids:
                if item_id.startswith(f"{self.config.retailer_id}_"):
                    product_id = item_id.split("_", 1)[1]
                else:
                    product_id = item_id

                product_ids.append(product_id)
                id_mapping[product_id] = item_id

            # Make API request
            params = {"ids": ",".join(product_ids)}

            response_data = self.request(
                "GET", self.availability_endpoint, params=params
            )

            # Process availability data
            result = {}
            availability_data = response_data.get("availability", {})

            for product_id, status in availability_data.items():
                # Map back to our item_id
                item_id = id_mapping.get(product_id, product_id)

                # Determine availability based on status
                if isinstance(status, bool):
                    result[item_id] = status
                elif isinstance(status, dict) and "available" in status:
                    result[item_id] = status["available"]
                elif isinstance(status, str) and status.lower() in [
                    "in_stock",
                    "instock",
                    "available",
                    "true",
                ]:
                    result[item_id] = True
                else:
                    result[item_id] = False

            # Set availability false for any product not found
            for item_id in item_ids:
                if item_id not in result:
                    result[item_id] = False

            return result

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(
                f"Error checking availability from {self.config.retailer_name}: {str(e)}"
            )
            raise RetailerAPIError(
                message=f"Error checking availability: {str(e)}",
                retailer_id=self.config.retailer_id,
            )

    def _check_availability_individual(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability by fetching each item individually.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)
        """
        result = {}

        for item_id in item_ids:
            try:
                item = self.get_item(item_id)
                result[item_id] = item is not None
            except Exception:
                result[item_id] = False

        return result

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
        try:
            # Create endpoint with query
            endpoint = self.search_endpoint_template.format(query=query)

            # Prepare query parameters
            params = {"limit": limit}

            # Make API request
            response_data = self.request("GET", endpoint, params=params)

            # Transform to our data model
            items = transform_from_generic(
                response_data,
                self.config.retailer_id,
                self.config.retailer_name,
                self.field_mapping,
            )

            return items

        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(
                f"Error searching products from {self.config.retailer_name}: {str(e)}"
            )
            raise RetailerAPIError(
                message=f"Error searching products: {str(e)}",
                retailer_id=self.config.retailer_id,
            )
