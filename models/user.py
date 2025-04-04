"""
User model and related data structures for storing user preferences.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime

from config import StyleCategory, ColorPalette, FitPreference, OccasionType

@dataclass
class UserClosetItem:
    """Represents an item in the user's closet."""
    item_id: str
    category: str  # E.g., "tops", "bottoms", "shoes"
    subcategory: Optional[str] = None  # E.g., "t-shirts", "jeans"
    color: str = ""
    brand: Optional[str] = None
    size: Optional[str] = None
    upload_date: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    favorite: bool = False
    worn_count: int = 0
    last_worn: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "item_id": self.item_id,
            "category": self.category,
            "subcategory": self.subcategory,
            "color": self.color,
            "brand": self.brand,
            "size": self.size,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "tags": self.tags,
            "favorite": self.favorite,
            "worn_count": self.worn_count,
            "last_worn": self.last_worn.isoformat() if self.last_worn else None,
        }

@dataclass
class StyleQuizResults:
    """Stores the results of the user's style quiz."""
    overall_style: List[StyleCategory] = field(default_factory=list)
    priorities: List[str] = field(default_factory=list)
    color_palette: List[ColorPalette] = field(default_factory=list)
    pattern_preference: str = ""
    preferred_patterns: List[str] = field(default_factory=list)
    top_fit: List[FitPreference] = field(default_factory=list)
    bottom_fit: List[str] = field(default_factory=list)
    layering_preference: str = ""
    occasion_preferences: List[OccasionType] = field(default_factory=list)
    shoe_preference: List[str] = field(default_factory=list)
    accessory_preference: List[str] = field(default_factory=list)
    favorite_brands: List[str] = field(default_factory=list)
    shopping_frequency: str = ""
    budget_range: str = ""
    sustainability_priority: bool = False
    secondhand_interest: bool = False
    seasonal_preference: str = ""
    trend_following: str = ""
    style_statement: str = ""
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "overall_style": [style.value for style in self.overall_style],
            "priorities": self.priorities,
            "color_palette": [palette.value for palette in self.color_palette],
            "pattern_preference": self.pattern_preference,
            "preferred_patterns": self.preferred_patterns,
            "top_fit": [fit.value for fit in self.top_fit],
            "bottom_fit": self.bottom_fit,
            "layering_preference": self.layering_preference,
            "occasion_preferences": [occasion.value for occasion in self.occasion_preferences],
            "shoe_preference": self.shoe_preference,
            "accessory_preference": self.accessory_preference,
            "favorite_brands": self.favorite_brands,
            "shopping_frequency": self.shopping_frequency,
            "budget_range": self.budget_range,
            "sustainability_priority": self.sustainability_priority,
            "secondhand_interest": self.secondhand_interest,
            "seasonal_preference": self.seasonal_preference,
            "trend_following": self.trend_following,
            "style_statement": self.style_statement,
        }

@dataclass
class UserFeedback:
    """Stores user feedback on recommendations."""
    liked_items: Set[str] = field(default_factory=set)
    disliked_items: Set[str] = field(default_factory=set)
    saved_outfits: List[List[str]] = field(default_factory=list)
    last_interaction: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "liked_items": list(self.liked_items),
            "disliked_items": list(self.disliked_items),
            "saved_outfits": self.saved_outfits,
            "last_interaction": self.last_interaction.isoformat() if self.last_interaction else None,
        }

@dataclass
class UserProfile:
    """Main user profile model."""
    user_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    closet_items: List[UserClosetItem] = field(default_factory=list)
    style_quiz: Optional[StyleQuizResults] = None
    feedback: UserFeedback = field(default_factory=UserFeedback)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "closet_items": [item.to_dict() for item in self.closet_items],
            "style_quiz": self.style_quiz.to_dict() if self.style_quiz else None,
            "feedback": self.feedback.to_dict(),
        }
