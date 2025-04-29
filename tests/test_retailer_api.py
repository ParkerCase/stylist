"""
Tests for the retailer API integration.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import os
import time
import logging
from datetime import datetime
import pytest

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerConfig,
    RetailerAPIError,
)
from stylist.integrations.retailers.mock_retailer import MockRetailerAPI
from stylist.integrations.cache.memory_cache import MemoryCache
from stylist.models.clothing import ClothingItem, RetailerInventory

# Configure logging for tests
logging.basicConfig(level=logging.ERROR)


@pytest.mark.timeout(30)  # Set a 30 second timeout for all API tests
class TestRetailerAPI(unittest.TestCase):
    """Test cases for the RetailerAPI integration."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a mock retailer config
        self.config = RetailerConfig(
            api_url="https://example.com/api",
            retailer_id="test_retailer",
            retailer_name="Test Retailer",
            api_key="test_key",
            api_secret="test_secret",
            timeout=5,
            cache_ttl=60,
            max_retries=2,
            use_cache=True,
        )

        # Create a mock retailer API
        self.api = MockRetailerAPI(self.config, item_count=50)

    def test_get_inventory(self):
        """Test getting inventory."""
        # Get inventory
        inventory = self.api.get_inventory(limit=10, page=1)

        # Check inventory data
        self.assertIsInstance(inventory, RetailerInventory)
        self.assertEqual(inventory.retailer_id, self.config.retailer_id)
        self.assertEqual(inventory.retailer_name, self.config.retailer_name)
        self.assertLessEqual(len(inventory.items), 10)

        # Check item data
        for item in inventory.items.values():
            self.assertIsInstance(item, ClothingItem)
            self.assertTrue(item.item_id.startswith(self.config.retailer_id))
            self.assertIsNotNone(item.name)
            self.assertIsNotNone(item.brand)
            self.assertIsNotNone(item.category)

    def test_get_inventory_with_category(self):
        """Test getting inventory filtered by category."""
        # Get inventory for a specific category
        category = "tops"
        inventory = self.api.get_inventory(limit=10, page=1, category=category)

        # Check that all items are in the specified category
        for item in inventory.items.values():
            self.assertEqual(item.category, category)

    def test_get_inventory_pagination(self):
        """Test inventory pagination."""
        # Get first page
        page1 = self.api.get_inventory(limit=5, page=1)

        # Get second page
        page2 = self.api.get_inventory(limit=5, page=2)

        # Check that pages contain different items
        page1_ids = set(page1.items.keys())
        page2_ids = set(page2.items.keys())

        self.assertLessEqual(len(page1_ids.intersection(page2_ids)), 0)

    def test_get_item(self):
        """Test getting a specific item."""
        # Get inventory to get an item ID
        inventory = self.api.get_inventory(limit=1)
        item_id = next(iter(inventory.items.keys()))

        # Get item
        item = self.api.get_item(item_id)

        # Check item data
        self.assertIsInstance(item, ClothingItem)
        self.assertEqual(item.item_id, item_id)
        self.assertTrue(item.name)
        self.assertTrue(item.brand)
        self.assertTrue(item.category)

    def test_get_nonexistent_item(self):
        """Test getting a nonexistent item."""
        # Try to get a nonexistent item
        item = self.api.get_item("nonexistent_item")

        # Should return None
        self.assertIsNone(item)

    def test_check_availability(self):
        """Test checking item availability."""
        # Get inventory to get some item IDs
        inventory = self.api.get_inventory(limit=5)
        item_ids = list(inventory.items.keys())

        # Check availability
        availability = self.api.check_availability(item_ids)

        # Check result structure
        self.assertIsInstance(availability, dict)
        self.assertEqual(len(availability), len(item_ids))

        # All items in the result should be in the original list
        for item_id in availability:
            self.assertIn(item_id, item_ids)
            self.assertIsInstance(availability[item_id], bool)

    def test_search_items(self):
        """Test searching for items."""
        # Get inventory to find a product name
        inventory = self.api.get_inventory(limit=1)
        item = next(iter(inventory.items.values()))

        # Extract a search term from the item name
        search_term = item.name.split()[0]

        # Search for items
        results = self.api.search_items(search_term, limit=10)

        # Check result structure
        self.assertIsInstance(results, list)
        self.assertLessEqual(len(results), 10)

        # Check that search results contain the search term
        for result in results:
            self.assertIsInstance(result, ClothingItem)
            term_found = (
                search_term.lower() in result.name.lower()
                or search_term.lower() in result.brand.lower()
                or search_term.lower() in result.category.lower()
            )
            self.assertTrue(term_found)

    def test_cache(self):
        """Test caching functionality."""
        # Get inventory (should be cached)
        self.api.get_inventory(limit=5)

        # Patch the actual API method to verify cache usage
        with patch.object(
            MockRetailerAPI,
            "get_inventory",
            return_value=RetailerInventory(
                retailer_id=self.config.retailer_id,
                retailer_name=self.config.retailer_name,
                items={},
                last_updated=datetime.now(),
            ),
        ) as mock_method:
            # Get inventory again with same parameters (should use cache)
            inventory = self.api.get_inventory(limit=5)

            # Verify that the method wasn't called (cache was used)
            mock_method.assert_not_called()

            # There should be items in the result (from cache)
            self.assertGreater(len(inventory.items), 0)

    def test_clear_cache(self):
        """Test clearing the cache."""
        # Get inventory (should be cached)
        self.api.get_inventory(limit=5)

        # Clear cache
        self.api.clear_cache()

        # Patch the actual API method to verify cache was cleared
        with patch.object(
            MockRetailerAPI,
            "get_inventory",
            return_value=RetailerInventory(
                retailer_id=self.config.retailer_id,
                retailer_name=self.config.retailer_name,
                items={},
                last_updated=datetime.now(),
            ),
        ) as mock_method:
            # Get inventory again (should not use cache)
            self.api.get_inventory(limit=5)

            # Verify that the method was called (cache was not used)
            mock_method.assert_called_once()


class TestMemoryCache(unittest.TestCase):
    """Test cases for the MemoryCache."""

    def setUp(self):
        """Set up test fixtures."""
        self.cache = MemoryCache()

    def test_set_get(self):
        """Test setting and getting cache values."""
        # Set a value
        self.cache.set("test_key", "test_value", ttl=10)

        # Get the value
        value = self.cache.get("test_key")

        # Check that we got the correct value
        self.assertEqual(value, "test_value")

    def test_ttl_expiration(self):
        """Test TTL expiration."""
        # Set a value with short TTL
        self.cache.set("test_key", "test_value", ttl=1)

        # Wait for TTL to expire
        time.sleep(1.5)

        # Get the value (should be None)
        value = self.cache.get("test_key")

        # Check that the value is gone
        self.assertIsNone(value)

    def test_delete(self):
        """Test deleting cache values."""
        # Set a value
        self.cache.set("test_key", "test_value")

        # Delete the value
        self.cache.delete("test_key")

        # Get the value (should be None)
        value = self.cache.get("test_key")

        # Check that the value is gone
        self.assertIsNone(value)

    def test_clear(self):
        """Test clearing the cache."""
        # Set multiple values
        self.cache.set("key1", "value1")
        self.cache.set("key2", "value2")

        # Clear the cache
        self.cache.clear()

        # Get the values (should be None)
        value1 = self.cache.get("key1")
        value2 = self.cache.get("key2")

        # Check that the values are gone
        self.assertIsNone(value1)
        self.assertIsNone(value2)


# Additional test cases for specific retailer API implementations would be added here

if __name__ == "__main__":
    unittest.main()
