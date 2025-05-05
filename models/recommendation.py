"""
Models for recommendations and outfits.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class SocialProofContext:
    """Model for social proof context for recommendations."""
    
    celebrity: str
    event: Optional[str] = None
    outfit_description: Optional[str] = None
    outfit_tags: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    colors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        return {
            "celebrity": self.celebrity,
            "event": self.event,
            "outfit_description": self.outfit_description,
            "outfit_tags": self.outfit_tags,
            "patterns": self.patterns,
            "colors": self.colors,
        }


@dataclass
class ItemRecommendation:
    """Model for individual item recommendations."""

    item_id: str
    score: float
    match_reasons: List[str] = field(default_factory=list)
    complementary_items: List[str] = field(default_factory=list)
    social_proof_match: Optional[Dict[str, Any]] = None  # Info about matching celebrity outfit
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        result = {
            "item_id": self.item_id,
            "score": self.score,
            "match_reasons": self.match_reasons,
            "complementary_items": self.complementary_items,
        }
        
        if self.social_proof_match:
            result["social_proof_match"] = self.social_proof_match
            
        return result


@dataclass
class OutfitRecommendation:
    """Model for complete outfit recommendations."""

    outfit_id: str
    items: List[str]  # List of item_ids
    score: float
    occasion: str
    match_reasons: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    social_proof: Optional[SocialProofContext] = None  # Celebrity outfit inspiration info

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        result = {
            "outfit_id": self.outfit_id,
            "items": self.items,
            "score": self.score,
            "occasion": self.occasion,
            "match_reasons": self.match_reasons,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        
        if self.social_proof:
            result["social_proof"] = self.social_proof.to_dict()
            
        return result


@dataclass
class RecommendationResponse:
    """Model for API responses containing recommendations."""

    user_id: str
    timestamp: datetime = field(default_factory=datetime.now)
    recommended_items: List[ItemRecommendation] = field(default_factory=list)
    recommended_outfits: List[OutfitRecommendation] = field(default_factory=list)
    recommendation_context: Optional[str] = None
    social_proof_source_id: Optional[str] = None  # ID of social proof item that inspired these recommendations

    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses."""
        result = {
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "recommended_items": [item.to_dict() for item in self.recommended_items],
            "recommended_outfits": [
                outfit.to_dict() for outfit in self.recommended_outfits
            ],
            "recommendation_context": self.recommendation_context,
        }
        
        if self.social_proof_source_id:
            result["social_proof_source_id"] = self.social_proof_source_id
            
        return result
