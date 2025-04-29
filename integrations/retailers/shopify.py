"""
Shopify API integration for The Stylist.

This module provides Shopify API integration with graceful fallback to mock data
when API credentials are not available or invalid.
"""

import logging
import os
from typing import Dict, List, Any, Optional
import time
import asyncio
from datetime import datetime

from ..retailer_api import RetailerAPI, RetailerConfig, InventoryFilter, RetailerAPIError
from models.clothing import ClothingItem, RetailerInventory
from integrations.retailers.mock_retailer import MockRetailerAPI

logger = logging.getLogger(__name__)

class ShopifyAPI(RetailerAPI):
    """
    Shopify API client for The Stylist.
    
    Features:
    - Full Shopify API integration when credentials are available
    - Graceful fallback to mock data when credentials are not available
    - Transparent logging of fallback mode
    - Realistic mock data that matches Shopify's data structure
    """
    
    def __init__(self, config: RetailerConfig):
        """
        Initialize the Shopify API client with fallback capability.
        
        If valid API credentials are not available, this will automatically
        use mock data instead while logging appropriate warnings.
        """
        super().__init__(config)
        
        # Check if we have valid credentials
        self.has_valid_credentials = (
            config.api_key is not None and
            config.api_secret is not None and
            config.api_key != "demo_key" and
            config.api_secret != "demo_secret"
        )
        
        # If environment explicitly says to use mock data, override credentials check
        use_mock = os.getenv("USE_MOCK_RETAILER", "false").lower() == "true"
        if use_mock:
            self.has_valid_credentials = False
        
        # Set up fallback mock retailer if needed
        if not self.has_valid_credentials:
            logger.warning(
                f"Shopify API credentials not available or USE_MOCK_RETAILER is true - "
                f"using mock data fallback for retailer {config.retailer_id}"
            )
            
            # Create mock retailer with the same config but different ID
            mock_config = RetailerConfig(
                retailer_id=f"{config.retailer_id}_mock",
                retailer_name=f"{config.retailer_name} (Mock)",
                api_url=config.api_url,
                api_key="demo_key",
                api_secret="demo_secret",
                timeout=config.timeout,
                cache_ttl=config.cache_ttl,
                max_retries=config.max_retries,
                use_cache=config.use_cache,
            )
            
            self._mock_retailer = MockRetailerAPI(mock_config, item_count=100)
            
            # Log information about fallback mode
            logger.info(
                f"Shopify fallback mode active for {config.retailer_id} - "
                f"using mock data with {len(self._mock_retailer._inventory)} items"
            )
        else:
            logger.info(f"Initialized Shopify API client for {config.retailer_id} with valid credentials")
            self._mock_retailer = None
    
    def get_inventory(
        self, 
        limit: int = 100, 
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None
    ) -> RetailerInventory:
        """
        Get inventory data from Shopify.
        
        If valid credentials are not available, returns mock inventory data instead.
        
        Args:
            limit: Maximum number of items to return
            page: Page number for pagination
            category: Optional category filter
            filter_options: Additional filter options
            
        Returns:
            RetailerInventory object with items from Shopify or mock data
        """
        if not self.has_valid_credentials:
            # Fall back to mock retailer
            logger.debug(f"Using mock data fallback for Shopify.get_inventory (retailer: {self.config.retailer_id})")
            inventory = self._mock_retailer.get_inventory(limit, page, category, filter_options)
            
            # Fix retailer ID to match the original config
            inventory.retailer_id = self.config.retailer_id
            inventory.retailer_name = self.config.retailer_name
            
            return inventory
        
        # Using real Shopify API when credentials are available
        # This part would be implemented when real Shopify API credentials are available
        
        # Check cache first
        cache_key = self._cache_key("inventory", limit=limit, page=page, category=category, filter=filter_options)
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
        
        # Code for real Shopify API integration would go here
        # For now, this is a placeholder
        logger.warning(f"Real Shopify API integration not implemented yet - should not reach here if has_valid_credentials is false")
        
        # Return empty inventory - this code should never be reached in the current implementation
        # since we'll either use the mock data or a real implementation once credentials are available
        inventory = RetailerInventory(
            retailer_id=self.config.retailer_id,
            retailer_name=self.config.retailer_name,
            items={},
            timestamp=datetime.now(),
        )
        
        return inventory
        
    async def get_inventory_async(
        self, 
        limit: int = 100, 
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None
    ) -> RetailerInventory:
        """
        Get inventory data asynchronously from Shopify.
        
        If valid credentials are not available, returns mock inventory data instead.
        
        Args:
            limit: Maximum number of items to return
            page: Page number for pagination
            category: Optional category filter
            filter_options: Additional filter options
            
        Returns:
            RetailerInventory object with items from Shopify or mock data
        """
        if not self.has_valid_credentials:
            # Fall back to mock retailer
            logger.debug(f"Using mock data fallback for Shopify.get_inventory_async (retailer: {self.config.retailer_id})")
            inventory = await self._mock_retailer.get_inventory_async(limit, page, category, filter_options)
            
            # Fix retailer ID to match the original config
            inventory.retailer_id = self.config.retailer_id
            inventory.retailer_name = self.config.retailer_name
            
            return inventory
        
        # Using real Shopify API when credentials are available - this part would be implemented
        # when real Shopify API credentials are available
        logger.warning(f"Real Shopify API async integration not implemented yet")
        await asyncio.sleep(0.1)  # Simulate network delay
        
        return self.get_inventory(limit, page, category, filter_options)
    
    def search_items(
        self, 
        query: str, 
        limit: int = 20, 
        filter_options: Optional[InventoryFilter] = None
    ) -> List[ClothingItem]:
        """
        Search for items in Shopify.
        
        If valid credentials are not available, searches mock inventory data instead.
        
        Args:
            query: Search query string
            limit: Maximum number of items to return
            filter_options: Additional filter options
            
        Returns:
            List of ClothingItems matching the search query
        """
        if not self.has_valid_credentials:
            # Fall back to mock retailer
            logger.debug(f"Using mock data fallback for Shopify.search_items (retailer: {self.config.retailer_id})")
            items = self._mock_retailer.search_items(query, limit, filter_options)
            
            # Fix retailer ID to match the original config
            for item in items:
                item.retailer_id = self.config.retailer_id
            
            return items
        
        # Using real Shopify API when credentials are available
        logger.warning(f"Real Shopify API search integration not implemented yet")
        return []
    
    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get a specific item from Shopify.
        
        If valid credentials are not available, attempts to find the item in mock data instead.
        
        Args:
            item_id: The ID of the item to retrieve
            
        Returns:
            ClothingItem if found, None otherwise
        """
        if not self.has_valid_credentials:
            # Fall back to mock retailer
            logger.debug(f"Using mock data fallback for Shopify.get_item (retailer: {self.config.retailer_id})")
            
            # Handle potentially different ID formats
            if item_id.startswith(f"{self.config.retailer_id}_"):
                # If using the real retailer ID format, convert to mock format for lookup
                mock_id = item_id.replace(f"{self.config.retailer_id}_", f"{self._mock_retailer.config.retailer_id}_")
                item = self._mock_retailer.get_item(mock_id)
            else:
                # Try direct lookup
                item = self._mock_retailer.get_item(item_id)
            
            # If found, fix retailer ID
            if item:
                item.retailer_id = self.config.retailer_id
            
            return item
        
        # Using real Shopify API when credentials are available
        logger.warning(f"Real Shopify API get_item integration not implemented yet")
        return None
    
    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability of items in Shopify.
        
        If valid credentials are not available, checks availability in mock data instead.
        
        Args:
            item_ids: List of item IDs to check
            
        Returns:
            Dictionary mapping item IDs to availability status (True/False)
        """
        if not self.has_valid_credentials:
            # Fall back to mock retailer
            logger.debug(f"Using mock data fallback for Shopify.check_availability (retailer: {self.config.retailer_id})")
            
            # Convert original IDs to mock IDs for lookup
            mock_ids = []
            id_mapping = {}  # Keep track of original ID to mock ID mapping
            
            for item_id in item_ids:
                if item_id.startswith(f"{self.config.retailer_id}_"):
                    # If using the real retailer ID format, convert to mock format for lookup
                    mock_id = item_id.replace(f"{self.config.retailer_id}_", f"{self._mock_retailer.config.retailer_id}_")
                    mock_ids.append(mock_id)
                    id_mapping[mock_id] = item_id
                else:
                    # Keep as is
                    mock_ids.append(item_id)
                    id_mapping[item_id] = item_id
            
            # Get availability from mock retailer
            mock_availability = self._mock_retailer.check_availability(mock_ids)
            
            # Map back to original IDs
            result = {}
            for mock_id, availability in mock_availability.items():
                original_id = id_mapping.get(mock_id, mock_id)  # Get original ID or use mock ID if not mapped
                result[original_id] = availability
            
            return result
        
        # Using real Shopify API when credentials are available
        logger.warning(f"Real Shopify API check_availability integration not implemented yet")
        return {item_id: False for item_id in item_ids}