"""
Models for clothing items and retail products.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime


@dataclass
class ClothingItem:
    """Base model for clothing items."""

    item_id: str
    name: str
    brand: str
    category: str  # E.g., "tops", "bottoms", "shoes"
    subcategory: Optional[str] = None  # E.g., "t-shirts", "jeans"
    colors: List[str] = field(default_factory=list)
    sizes: List[str] = field(default_factory=list)
    price: float = 0.0
    sale_price: Optional[float] = None
    images: List[str] = field(default_factory=list)  # URLs to product images
    description: str = ""
    style_tags: List[str] = field(default_factory=list)
    material: Optional[str] = None
    pattern: Optional[str] = None
    fit_type: Optional[str] = None
    occasion_tags: List[str] = field(default_factory=list)
    season_tags: List[str] = field(default_factory=list)
    sustainable: bool = False
    trending_score: float = 0.0  # 0-1 score indicating how trending the item is
    retailer_id: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "item_id": self.item_id,
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "subcategory": self.subcategory,
            "colors": self.colors,
            "sizes": self.sizes,
            "price": self.price,
            "sale_price": self.sale_price,
            "images": self.images,
            "description": self.description,
            "style_tags": self.style_tags,
            "material": self.material,
            "pattern": self.pattern,
            "fit_type": self.fit_type,
            "occasion_tags": self.occasion_tags,
            "season_tags": self.season_tags,
            "sustainable": self.sustainable,
            "trending_score": self.trending_score,
            "retailer_id": self.retailer_id,
        }


@dataclass
class RetailerInventory:
    """Model for retailer inventory data."""

    retailer_id: str
    retailer_name: str
    items: Dict[str, ClothingItem] = field(
        default_factory=dict
    )  # item_id -> ClothingItem
    last_updated: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer_name,
            "items_count": len(self.items),
            "last_updated": (
                self.last_updated.isoformat() if self.last_updated else None
            ),
        }
