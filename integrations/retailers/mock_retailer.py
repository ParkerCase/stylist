"""
Mock Retailer API for The Stylist demo and testing.

This module implements a fake retailer API that can be used for testing
and demonstration purposes when real retailer credentials are not available.
"""

import time
import random
import asyncio
from typing import Dict, List, Set, Optional
import logging
from datetime import datetime

from ..retailer_api import RetailerAPI, RetailerConfig, InventoryFilter
from models.clothing import ClothingItem

logger = logging.getLogger(__name__)


class MockRetailerAPI(RetailerAPI):
    """Mock implementation of a retailer API for demonstration and testing."""

    def __init__(self, config: RetailerConfig, item_count: int = 50):
        """
        Initialize the mock retailer API with sample data.
        
        Args:
            config: RetailerConfig with API settings
            item_count: Number of mock items to generate
        """
        super().__init__(config)
        self.item_count = item_count
        self._inventory = self._generate_mock_inventory(item_count)
        self._cache = {}
        logger.info(f"MockRetailerAPI initialized with {item_count} items")

    def _generate_mock_inventory(self, count: int) -> Dict[str, ClothingItem]:
        """Generate mock inventory items."""
        inventory = {}
        
        # Lists for random selection
        brands = ["Zara", "H&M", "Nike", "Adidas", "Levi's", "Gap", "Uniqlo", "Fashion Nova", "Urban Outfitters"]
        categories = ["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"]
        subcategories = {
            "tops": ["t-shirts", "blouses", "sweaters", "hoodies", "button-downs", "tank tops"],
            "bottoms": ["jeans", "pants", "shorts", "skirts", "leggings"],
            "outerwear": ["jackets", "coats", "cardigans", "blazers"],
            "dresses": ["casual dresses", "formal dresses", "party dresses", "maxi dresses"],
            "shoes": ["sneakers", "boots", "sandals", "heels", "flats", "loafers"],
            "accessories": ["hats", "bags", "jewelry", "belts", "scarves"]
        }
        colors = ["black", "white", "blue", "red", "green", "yellow", "pink", "grey", "brown", "navy", "purple", "orange"]
        style_tags = ["casual", "formal", "streetwear", "classic", "bohemian", "minimalist", "athleisure", "preppy", "vintage"]
        fit_types = ["slim", "regular", "oversized", "relaxed", "fitted"]
        occasion_tags = ["casual", "work", "evening", "weekend", "athletic", "formal", "date night"]
        season_tags = ["spring", "summer", "fall", "winter", "all-season"]
        
        # Generate random items
        for i in range(1, count + 1):
            category = random.choice(categories)
            subcategory = random.choice(subcategories[category])
            
            item_id = f"mock_{category}_{i}"
            
            item = ClothingItem(
                item_id=item_id,
                name=f"{random.choice(brands)} {subcategory.title()} {i}",
                brand=random.choice(brands),
                category=category,
                subcategory=subcategory,
                colors=[random.choice(colors) for _ in range(random.randint(1, 3))],
                sizes=self._generate_sizes(category),
                price=round(random.uniform(15.0, 150.0), 2),
                images=[f"https://example.com/{category}/{subcategory}/{i}.jpg"],
                style_tags=random.sample(style_tags, random.randint(1, 3)),
                fit_type=random.choice(fit_types),
                occasion_tags=random.sample(occasion_tags, random.randint(1, 3)),
                season_tags=random.sample(season_tags, random.randint(1, 2)),
                trending_score=round(random.uniform(0.1, 1.0), 2),
                description=f"This is a mock {subcategory} item for testing.",
                stock_quantity=random.randint(0, 100),
                discount_percentage=random.choice([0, 0, 0, 10, 15, 20, 25, 30]),
                date_added=datetime.now().isoformat(),
            )
            
            inventory[item_id] = item
            
        return inventory
    
    def _generate_sizes(self, category: str) -> List[str]:
        """Generate appropriate sizes based on the category."""
        if category in ["tops", "outerwear"]:
            return random.sample(["XS", "S", "M", "L", "XL", "XXL"], random.randint(3, 6))
        elif category == "bottoms":
            return [str(size) for size in random.sample(range(26, 42, 2), random.randint(4, 8))]
        elif category == "shoes":
            return [str(size) for size in random.sample(range(5, 13), random.randint(5, 8))]
        else:
            return random.sample(["XS", "S", "M", "L", "XL"], random.randint(3, 5))

    def get_inventory(self, limit: int = 100, offset: int = 0) -> InventoryData:
        """
        Get inventory data from the mock retailer.
        
        Args:
            limit: Maximum number of items to return
            offset: Offset for pagination
            
        Returns:
            InventoryData with mock items
        """
        # Simulate a slight delay for realism
        time.sleep(0.5)
        
        # Apply cache if enabled
        cache_key = f"inventory_{limit}_{offset}"
        if self.config.use_cache and cache_key in self._cache:
            logger.debug(f"Returning cached inventory data")
            return self._cache[cache_key]
        
        # Paginate the inventory
        items_list = list(self._inventory.values())
        paginated_items = items_list[offset:offset + limit]
        
        # Convert list back to dictionary
        items_dict = {item.item_id: item for item in paginated_items}
        
        inventory_data = InventoryData(
            items=items_dict,
            total_count=len(self._inventory),
            page=offset // limit + 1 if limit > 0 else 1,
            limit=limit,
            timestamp=datetime.now().isoformat()
        )
        
        # Cache the result if caching is enabled
        if self.config.use_cache:
            self._cache[cache_key] = inventory_data
        
        return inventory_data
    
    async def get_inventory_async(self, limit: int = 100, offset: int = 0) -> InventoryData:
        """
        Get inventory data asynchronously from the mock retailer.
        
        Args:
            limit: Maximum number of items to return
            offset: Offset for pagination
            
        Returns:
            InventoryData with mock items
        """
        # Simulate async operation with a delay
        await asyncio.sleep(0.5)
        return self.get_inventory(limit, offset)
    
    def search_items(self, query: str, limit: int = 10) -> List[ClothingItem]:
        """
        Search for items matching the query.
        
        Args:
            query: Search query string
            limit: Maximum number of items to return
            
        Returns:
            List of matching ClothingItems
        """
        # Simulate search delay
        time.sleep(0.3)
        
        query = query.lower()
        matches = []
        
        for item in self._inventory.values():
            # Check if query is in name, brand, category, etc.
            if (query in item.name.lower() or 
                query in item.brand.lower() or 
                query in item.category.lower() or 
                query in item.subcategory.lower() or
                any(query in color.lower() for color in item.colors) or
                any(query in tag.lower() for tag in item.style_tags)):
                matches.append(item)
                
            if len(matches) >= limit:
                break
                
        return matches
    
    def get_item_details(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get detailed information for a specific item.
        
        Args:
            item_id: The ID of the item to retrieve
            
        Returns:
            ClothingItem if found, None otherwise
        """
        # Simulate API call delay
        time.sleep(0.2)
        
        return self._inventory.get(item_id)
    
    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check the availability of multiple items.
        
        Args:
            item_ids: List of item IDs to check
            
        Returns:
            Dictionary mapping item IDs to availability (True/False)
        """
        # Simulate API call delay
        time.sleep(0.3)
        
        result = {}
        for item_id in item_ids:
            item = self._inventory.get(item_id)
            # Item is available if it exists and has stock
            if item and hasattr(item, 'stock_quantity'):
                result[item_id] = item.stock_quantity > 0
            else:
                result[item_id] = random.choice([True, True, True, False])  # 75% chance available
                
        return result
    
    def clear_cache(self) -> None:
        """Clear the API cache."""
        self._cache = {}
        logger.debug("MockRetailerAPI cache cleared")