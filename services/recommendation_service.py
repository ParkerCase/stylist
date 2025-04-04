"""
Core recommendation service for The Stylist.
"""

import uuid
import random
from typing import Dict, List, Set, Tuple, Optional
from datetime import datetime
import logging

from models.user import UserProfile
from models.clothing import ClothingItem, RetailerInventory
from models.recommendation import (
    ItemRecommendation,
    OutfitRecommendation,
    RecommendationResponse,
)
from services.style_analysis_service import StyleAnalysisService
from config import WEIGHTS, MAX_RECOMMENDATIONS

logger = logging.getLogger(__name__)


class RecommendationService:
    """Service for generating personalized fashion recommendations."""

    @staticmethod
    def calculate_item_match_score(
        item: ClothingItem, user_style_profile: Dict[str, float]
    ) -> Tuple[float, List[str]]:
        """
        Calculate how well an item matches the user's style profile.
        Returns a score between 0 and 1, and a list of reasons for the match.
        """
        score_components = {
            "style_match": 0.0,
            "color_match": 0.0,
            "fit_match": 0.0,
            "occasion_match": 0.0,
            "trending_bonus": 0.0,
        }

        match_reasons = []

        # Check style tags match
        style_matches = 0
        for tag in item.style_tags:
            style_key = f"style_{tag.lower()}"
            liked_key = f"liked_tag_{tag.lower()}"

            if style_key in user_style_profile and user_style_profile[style_key] > 0:
                style_matches += user_style_profile[style_key]
                match_reasons.append(f"Matches your {tag} style preference")

            if liked_key in user_style_profile and user_style_profile[liked_key] > 0:
                style_matches += user_style_profile[liked_key]
                match_reasons.append(f"Similar to items you've liked")

        # Normalize style match score
        if item.style_tags:
            score_components["style_match"] = min(
                style_matches / len(item.style_tags), 1.0
            )

        # Check color match
        color_matches = 0
        for color in item.colors:
            color_key = f"color_{color.lower()}"
            liked_color_key = f"liked_color_{color.lower()}"

            if color_key in user_style_profile and user_style_profile[color_key] > 0:
                color_matches += user_style_profile[color_key]
                match_reasons.append(f"Matches your {color} color preference")

            if (
                liked_color_key in user_style_profile
                and user_style_profile[liked_color_key] > 0
            ):
                color_matches += user_style_profile[liked_color_key]
                match_reasons.append(f"Similar color to items you've liked")

        # Normalize color match score
        if item.colors:
            score_components["color_match"] = min(color_matches / len(item.colors), 1.0)

        # Check fit match
        if item.fit_type:
            fit_key = (
                f"top_fit_{item.fit_type.lower()}"
                if item.category.lower() in ["tops", "shirts", "t-shirts"]
                else f"bottom_fit_{item.fit_type.lower()}"
            )

            if fit_key in user_style_profile and user_style_profile[fit_key] > 0:
                score_components["fit_match"] = user_style_profile[fit_key]
                match_reasons.append(f"Matches your preferred {item.fit_type} fit")

        # Check occasion match
        occasion_matches = 0
        for occasion in item.occasion_tags:
            occasion_key = f"occasion_{occasion.lower()}"

            if (
                occasion_key in user_style_profile
                and user_style_profile[occasion_key] > 0
            ):
                occasion_matches += user_style_profile[occasion_key]
                match_reasons.append(f"Great for {occasion} occasions")

        # Normalize occasion match score
        if item.occasion_tags:
            score_components["occasion_match"] = min(
                occasion_matches / len(item.occasion_tags), 1.0
            )

        # Add trending bonus
        score_components["trending_bonus"] = item.trending_score
        if item.trending_score > 0.7:
            match_reasons.append("Currently trending")

        # Check for negative preferences (disliked items)
        for tag in item.style_tags:
            disliked_key = f"disliked_tag_{tag.lower()}"
            if (
                disliked_key in user_style_profile
                and user_style_profile[disliked_key] < 0
            ):
                return 0.0, []  # User explicitly dislikes this style

        for color in item.colors:
            disliked_color_key = f"disliked_color_{color.lower()}"
            if (
                disliked_color_key in user_style_profile
                and user_style_profile[disliked_color_key] < 0
            ):
                return 0.0, []  # User explicitly dislikes this color

        # Calculate final weighted score
        final_score = sum(
            score * WEIGHTS[component] for component, score in score_components.items()
        )

        # Filter reasons to avoid repetition
        unique_reasons = []
        seen = set()
        for reason in match_reasons:
            if reason not in seen:
                seen.add(reason)
                unique_reasons.append(reason)

        # Limit to top 3 reasons
        top_reasons = unique_reasons[:3]

        return final_score, top_reasons

    @staticmethod
    def find_complementary_items(
        item: ClothingItem,
        all_items: List[ClothingItem],
        user_style_profile: Dict[str, float],
        limit: int = 3,
    ) -> List[str]:
        """
        Find items that would pair well with the given item.
        Returns a list of item_ids.
        """
        complementary_categories = {
            "tops": ["bottoms", "shoes", "accessories"],
            "shirts": ["pants", "jeans", "shoes", "accessories"],
            "t-shirts": ["jeans", "shorts", "shoes", "accessories"],
            "blouses": ["skirts", "pants", "accessories"],
            "bottoms": ["tops", "shoes", "accessories"],
            "pants": ["shirts", "t-shirts", "shoes", "accessories"],
            "jeans": ["t-shirts", "shirts", "shoes", "accessories"],
            "skirts": ["blouses", "tops", "shoes", "accessories"],
            "dresses": ["shoes", "accessories"],
            "outerwear": ["tops", "bottoms", "shoes"],
            "shoes": ["tops", "bottoms"],
            "accessories": ["tops", "bottoms", "dresses"],
        }

        item_category = item.category.lower()
        if item.subcategory:
            item_category = item.subcategory.lower()

        target_categories = complementary_categories.get(item_category, [])

        # Filter items by complementary categories
        complementary_candidates = []
        for candidate in all_items:
            candidate_category = candidate.category.lower()
            if candidate.subcategory:
                candidate_category = candidate.subcategory.lower()

            if candidate_category in target_categories:
                complementary_candidates.append(candidate)

        # Score candidates based on style match
        scored_candidates = []
        for candidate in complementary_candidates:
            # Check color compatibility
            color_compatible = RecommendationService.are_colors_compatible(
                item.colors, candidate.colors
            )

            # Calculate style match
            match_score, _ = RecommendationService.calculate_item_match_score(
                candidate, user_style_profile
            )

            # Boost score for color compatibility
            if color_compatible:
                match_score *= 1.2

            scored_candidates.append((candidate.item_id, match_score))

        # Sort by score and return top items
        sorted_candidates = sorted(scored_candidates, key=lambda x: x[1], reverse=True)
        return [candidate[0] for candidate in sorted_candidates[:limit]]

    @staticmethod
    def are_colors_compatible(colors1: List[str], colors2: List[str]) -> bool:
        """
        Check if two sets of colors are compatible for an outfit.
        """
        # Convert to lowercase
        colors1 = [c.lower() for c in colors1]
        colors2 = [c.lower() for c in colors2]

        # Define color compatibility groups
        neutral_colors = ["black", "white", "gray", "beige", "tan", "cream", "navy"]

        # If either contains neutral colors, they're compatible
        if any(color in neutral_colors for color in colors1) or any(
            color in neutral_colors for color in colors2
        ):
            return True

        # Define complementary color pairs
        complementary_pairs = [
            ({"blue"}, {"orange", "brown"}),
            ({"red"}, {"green"}),
            ({"yellow"}, {"purple"}),
            ({"pink"}, {"olive", "green"}),
        ]

        # Check for complementary colors
        for group1, group2 in complementary_pairs:
            if (
                any(color in group1 for color in colors1)
                and any(color in group2 for color in colors2)
            ) or (
                any(color in group2 for color in colors1)
                and any(color in group1 for color in colors2)
            ):
                return True

        # Check for monochromatic (same color family)
        color_families = {
            "blue": ["lightblue", "navy", "skyblue", "teal", "cyan"],
            "red": ["maroon", "crimson", "burgundy", "pink"],
            "green": ["olive", "lime", "forest", "mint", "emerald"],
            "purple": ["lavender", "violet", "plum", "mauve"],
            "yellow": ["gold", "mustard", "amber"],
            "orange": ["peach", "coral", "salmon"],
            "brown": ["tan", "beige", "khaki", "camel"],
            "gray": ["silver", "charcoal"],
        }

        # Check if colors belong to the same family
        for family, variations in color_families.items():
            family_set = {family} | set(variations)
            if any(color in family_set for color in colors1) and any(
                color in family_set for color in colors2
            ):
                return True

        # Default: assume not compatible
        return False

    @classmethod
    def generate_outfit_recommendation(
        cls,
        base_item: ClothingItem,
        all_items: List[ClothingItem],
        user_style_profile: Dict[str, float],
        occasion: str,
    ) -> Optional[OutfitRecommendation]:
        """
        Generate a complete outfit recommendation based on a base item.
        """
        outfit_items = [base_item.item_id]
        outfit_categories = {base_item.category.lower()}
        if base_item.subcategory:
            outfit_categories.add(base_item.subcategory.lower())

        # Define essential categories for a complete outfit
        if occasion.lower() in ["formal", "business", "date night"]:
            essential_categories = {"tops", "bottoms", "shoes", "accessories"}
            # Allow dresses to replace tops+bottoms
            if "dresses" in outfit_categories:
                essential_categories.remove("tops")
                essential_categories.remove("bottoms")
        else:  # Casual outfits
            essential_categories = {"tops", "bottoms", "shoes"}
            # Allow dresses to replace tops+bottoms
            if "dresses" in outfit_categories:
                essential_categories.remove("tops")
                essential_categories.remove("bottoms")

        # Filter out categories we already have
        needed_categories = essential_categories - outfit_categories

        # Find complementary items for each needed category
        for category in needed_categories:
            # Filter items by category
            category_items = [
                item
                for item in all_items
                if item.category.lower() == category
                or (item.subcategory and item.subcategory.lower() == category)
            ]

            if not category_items:
                continue  # Skip if no items in this category

            # Score items based on compatibility with current outfit
            scored_items = []
            for item in category_items:
                # Check compatibility with all current outfit items
                compatible = True
                for outfit_item_id in outfit_items:
                    outfit_item = next(
                        (i for i in all_items if i.item_id == outfit_item_id), None
                    )
                    if outfit_item and not cls.are_colors_compatible(
                        outfit_item.colors, item.colors
                    ):
                        compatible = False
                        break

                if not compatible:
                    continue

                # Calculate style match
                match_score, _ = cls.calculate_item_match_score(
                    item, user_style_profile
                )
                scored_items.append((item, match_score))

            # Sort by score and add the best item
            if scored_items:
                scored_items.sort(key=lambda x: x[1], reverse=True)
                best_item = scored_items[0][0]
                outfit_items.append(best_item.item_id)
                outfit_categories.add(best_item.category.lower())
                if best_item.subcategory:
                    outfit_categories.add(best_item.subcategory.lower())

        # Check if we have a valid outfit (at least 3 items)
        if len(outfit_items) >= 3:
            # Calculate overall outfit score
            outfit_items_objects = [
                next((i for i in all_items if i.item_id == item_id), None)
                for item_id in outfit_items
            ]
            outfit_items_objects = [i for i in outfit_items_objects if i is not None]

            total_score = sum(
                cls.calculate_item_match_score(item, user_style_profile)[0]
                for item in outfit_items_objects
            )
            avg_score = total_score / len(outfit_items_objects)

            # Generate match reasons
            if "dresses" in outfit_categories:
                outfit_type = "dress"
            elif "tops" in outfit_categories and "bottoms" in outfit_categories:
                outfit_type = "separates"
            else:
                outfit_type = "outfit"

            match_reasons = [
                f"Complete {outfit_type} for {occasion}",
                f"Coordinated colors and styles",
                f"Matches your personal style preferences",
            ]

            # Create and return the outfit recommendation
            return OutfitRecommendation(
                outfit_id=f"outfit_{uuid.uuid4().hex[:8]}",
                items=outfit_items,
                score=avg_score,
                occasion=occasion,
                match_reasons=match_reasons,
                created_at=datetime.now(),
            )

        return None  # Could not create a valid outfit

    @classmethod
    def generate_recommendations(
        cls,
        user: UserProfile,
        available_items: List[ClothingItem],
        context: Optional[str] = None,
    ) -> RecommendationResponse:
        """
        Generate personalized recommendations for a user.

        Args:
            user: The user profile
            available_items: List of available items to recommend from
            context: Optional context for recommendation (e.g., "date_night", "work", "casual")

        Returns:
            RecommendationResponse object with recommended items and outfits
        """
        # Generate user style profile
        user_style_profile = StyleAnalysisService.generate_user_style_profile(user)

        # Filter already owned items
        user_owned_ids = {item.item_id for item in user.closet_items}
        available_items = [
            item for item in available_items if item.item_id not in user_owned_ids
        ]

        # Filter by context if provided
        if context:
            context_items = []
            for item in available_items:
                if any(tag.lower() == context.lower() for tag in item.occasion_tags):
                    context_items.append(item)

            # If we have enough context-specific items, use only those
            if len(context_items) >= 10:
                available_items = context_items

        # Score all available items
        scored_items = []
        for item in available_items:
            score, reasons = cls.calculate_item_match_score(item, user_style_profile)
            if score > 0.5:  # Only consider items with a reasonable match
                scored_items.append((item, score, reasons))

        # Sort by score
        scored_items.sort(key=lambda x: x[1], reverse=True)

        # Get top individual recommendations
        top_items = scored_items[:MAX_RECOMMENDATIONS]

        # Create item recommendations with complementary items
        item_recommendations = []
        for item, score, reasons in top_items:
            complementary_items = cls.find_complementary_items(
                item, available_items, user_style_profile
            )

            item_recommendations.append(
                ItemRecommendation(
                    item_id=item.item_id,
                    score=score,
                    match_reasons=reasons,
                    complementary_items=complementary_items,
                )
            )

        # Generate outfit recommendations
        outfit_recommendations = []

        # Use top-scoring items as base for outfits
        for item, _, _ in top_items[:5]:  # Use top 5 items as outfit bases
            # Determine most appropriate occasion for this item
            occasion = "Everyday Casual"  # Default
            if item.occasion_tags:
                occasion = item.occasion_tags[0]

            outfit = cls.generate_outfit_recommendation(
                item, available_items, user_style_profile, occasion
            )

            if outfit and outfit.score > 0.6:  # Only include good outfits
                outfit_recommendations.append(outfit)

        # Create and return the response
        return RecommendationResponse(
            user_id=user.user_id,
            timestamp=datetime.now(),
            recommended_items=item_recommendations,
            recommended_outfits=outfit_recommendations,
            recommendation_context=context,
        )
