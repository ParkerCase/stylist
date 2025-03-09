"""
Mock retailer API implementation for testing.
"""

import time
import random
import uuid
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerConfig,
    RetailerAPIError,
)
from stylist.models.clothing import ClothingItem, RetailerInventory

logger = logging.getLogger(__name__)


class MockRetailerAPI(RetailerAPI):
    """Mock implementation of RetailerAPI for testing and development."""

    def __init__(
        self, config: RetailerConfig, item_count: int = 100, cache: Optional[Any] = None
    ):
        """
        Initialize the mock retailer API.

        Args:
            config: RetailerConfig object
            item_count: Number of mock items to generate
            cache: Cache implementation (defaults to MemoryCache if None)
        """
        super().__init__(config, cache)
        self._generate_mock_data(item_count)

    def _generate_mock_data(self, item_count: int) -> None:
        """
        Generate mock inventory data.

        Args:
            item_count: Number of mock items to generate
        """
        self.mock_items = {}

        # Mock categories
        categories = ["tops", "bottoms", "shoes", "dresses", "outerwear", "accessories"]
        subcategories = {
            "tops": ["t-shirts", "shirts", "blouses", "sweaters"],
            "bottoms": ["jeans", "pants", "shorts", "skirts"],
            "shoes": ["sneakers", "boots", "sandals", "heels"],
            "dresses": ["casual", "formal", "maxi", "mini"],
            "outerwear": ["jackets", "coats", "hoodies", "vests"],
            "accessories": ["hats", "bags", "jewelry", "scarves"],
        }

        # Mock brands
        brands = [
            "Nike",
            "Adidas",
            "Zara",
            "H&M",
            "Levi's",
            "Gap",
            "Prada",
            "Gucci",
            "Uniqlo",
        ]

        # Mock colors
        colors = [
            "black",
            "white",
            "blue",
            "red",
            "green",
            "yellow",
            "pink",
            "grey",
            "brown",
            "navy",
        ]

        # Mock sizes (varied by category)
        size_types = {
            "tops": ["XS", "S", "M", "L", "XL", "XXL"],
            "bottoms": ["28", "30", "32", "34", "36", "38", "40"],
            "shoes": ["5", "6", "7", "8", "9", "10", "11", "12"],
            "dresses": ["XS", "S", "M", "L", "XL", "XXL"],
            "outerwear": ["XS", "S", "M", "L", "XL", "XXL"],
            "accessories": ["One Size"],
        }

        # Mock style tags
        style_tags = [
            "casual",
            "formal",
            "business",
            "sporty",
            "classic",
            "trendy",
            "vintage",
        ]

        # Mock occasion tags
        occasion_tags = [
            "casual",
            "formal",
            "business",
            "party",
            "weekend",
            "vacation",
            "workout",
        ]

        # Mock season tags
        season_tags = ["summer", "winter", "fall", "spring", "all-season"]

        # Mock fit types
        fit_types = [
            "slim",
            "regular",
            "loose",
            "oversized",
            "fitted",
            "skinny",
            "relaxed",
        ]

        # Generate mock items
        for i in range(1, item_count + 1):
            # Pick a random category
            category = random.choice(categories)
            subcategory = random.choice(subcategories[category])

            # Generate unique ID
            item_id = f"{self.config.retailer_id}_{category}_{i}"

            # Generate mock item data
            item = ClothingItem(
                item_id=item_id,
                name=f"{random.choice(brands)} {subcategory.title()} {i}",
                brand=random.choice(brands),
                category=category,
                subcategory=subcategory,
                colors=[random.choice(colors) for _ in range(random.randint(1, 2))],
                sizes=random.sample(
                    size_types.get(category, ["S", "M", "L"]), random.randint(1, 4)
                ),
                price=round(random.uniform(20.0, 200.0), 2),
                sale_price=(
                    round(random.uniform(15.0, 150.0), 2)
                    if random.random() < 0.3
                    else None
                ),
                images=[f"https://example.com/{category}/{subcategory}/{i}.jpg"],
                description=f"This is a mock {subcategory} from our test data.",
                style_tags=random.sample(style_tags, random.randint(1, 3)),
                material=random.choice(
                    ["cotton", "polyester", "wool", "denim", "leather"]
                ),
                pattern=random.choice(
                    ["solid", "striped", "floral", "checkered", "graphic"]
                ),
                fit_type=random.choice(fit_types),
                occasion_tags=random.sample(occasion_tags, random.randint(1, 2)),
                season_tags=random.sample(season_tags, random.randint(1, 2)),
                sustainable=random.random() < 0.2,
                trending_score=random.random(),
                retailer_id=self.config.retailer_id,
            )

            self.mock_items[item_id] = item

        logger.info(
            f"Generated {len(self.mock_items)} mock items for {self.config.retailer_name}"
        )

    def get_inventory(
        self, limit: int = 100, page: int = 1, category: Optional[str] = None
    ) -> RetailerInventory:
        """
        Get mock inventory data.

        Args:
            limit: Maximum number of items to retrieve
            page: Page number for pagination
            category: Optional category filter

        Returns:
            RetailerInventory object
        """
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit

        # Filter by category if specified
        if category:
            filtered_items = {
                item_id: item
                for item_id, item in self.mock_items.items()
                if item.category.lower() == category.lower()
            }
        else:
            filtered_items = self.mock_items

        # Get paginated items
        item_ids = list(filtered_items.keys())
        paginated_ids = item_ids[start_idx:end_idx]
        paginated_items = {
            item_id: filtered_items[item_id] for item_id in paginated_ids
        }

        # Simulate API latency
        time.sleep(0.2)

        # Randomly fail requests to simulate API errors (for testing)
        if random.random() < 0.05:  # 5% failure rate
            raise RetailerAPIError(
                "Mock API error for testing",
                status_code=500,
                retailer_id=self.config.retailer_id,
            )

        # Create inventory object
        inventory = RetailerInventory(
            retailer_id=self.config.retailer_id,
            retailer_name=self.config.retailer_name,
            items=paginated_items,
            last_updated=datetime.now(),
        )

        return inventory

    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get a specific mock item.

        Args:
            item_id: ID of the item to retrieve

        Returns:
            ClothingItem object or None if not found
        """
        # Simulate API latency
        time.sleep(0.1)

        return self.mock_items.get(item_id)

    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for multiple mock items.

        Args:
            item_ids: List of item IDs to check

        Returns:
            Dictionary mapping item IDs to availability (True/False)
        """
        # Simulate API latency
        time.sleep(0.1 * len(item_ids))

        result = {}
        for item_id in item_ids:
            # Items have 80% chance of being available
            is_available = item_id in self.mock_items and random.random() < 0.8
            result[item_id] = is_available

        return result

    def search_items(self, query: str, limit: int = 20) -> List[ClothingItem]:
        """
        Search for mock items by query.

        Args:
            query: Search query
            limit: Maximum number of items to retrieve

        Returns:
            List of ClothingItem objects
        """
        # Simulate API latency
        time.sleep(0.3)

        query = query.lower()
        results = []

        for item in self.mock_items.values():
            # Check if query matches any of the item's fields
            if (
                query in item.name.lower()
                or query in item.brand.lower()
                or query in item.category.lower()
                or query in item.description.lower()
                or query in (item.subcategory or "").lower()
                or any(query in tag.lower() for tag in item.style_tags)
                or any(query in color.lower() for color in item.colors)
            ):
                results.append(item)

            # Stop once we reach the limit
            if len(results) >= limit:
                break

        return results
