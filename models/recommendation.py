"""
Models for recommendations and outfits.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime


@dataclass
class ItemRecommendation:
    """Model for individual item recommendations."""

    item_id: str
    score: float
    match_reasons: List[str] = field(default_factory=list)
    complementary_items: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "item_id": self.item_id,
            "score": self.score,
            "match_reasons": self.match_reasons,
            "complementary_items": self.complementary_items,
        }


@dataclass
class OutfitRecommendation:
    """Model for complete outfit recommendations."""

    outfit_id: str
    items: List[str]  # List of item_ids
    score: float
    occasion: str
    match_reasons: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "outfit_id": self.outfit_id,
            "items": self.items,
            "score": self.score,
            "occasion": self.occasion,
            "match_reasons": self.match_reasons,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class RecommendationResponse:
    """Model for API responses containing recommendations."""

    user_id: str
    timestamp: datetime = field(default_factory=datetime.now)
    recommended_items: List[ItemRecommendation] = field(default_factory=list)
    recommended_outfits: List[OutfitRecommendation] = field(default_factory=list)
    recommendation_context: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "recommended_items": [item.to_dict() for item in self.recommended_items],
            "recommended_outfits": [
                outfit.to_dict() for outfit in self.recommended_outfits
            ],
            "recommendation_context": self.recommendation_context,
        }
