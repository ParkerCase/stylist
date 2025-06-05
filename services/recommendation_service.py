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
    SocialProofContext,
)
from services.style_analysis_service import StyleAnalysisService
from config import WEIGHTS, MAX_RECOMMENDATIONS

logger = logging.getLogger(__name__)


class RecommendationService:
    """Service for generating personalized fashion recommendations."""

    # Pattern compatibility rules
    PATTERN_CLASH_RULES = {
        "stripes": ["plaid", "polka", "busy", "geometric"],
        "plaid": ["stripes", "polka", "floral", "busy", "geometric"],
        "polka": ["stripes", "plaid", "busy", "geometric"],
        "floral": ["plaid", "busy", "geometric", "animal"],
        "animal": ["floral", "busy", "geometric", "tropical"],
        "camo": ["animal", "plaid", "tropical"],
        "tropical": ["plaid", "animal", "camo", "busy"],
        "geometric": ["stripes", "plaid", "polka", "floral", "busy"],
        "busy": [
            "stripes",
            "plaid",
            "polka",
            "floral",
            "geometric",
            "tropical",
            "animal",
        ],
    }

    # Pattern compatibility scores
    PATTERN_COMPLEMENT_RULES = {
        "solid": [
            "stripes",
            "plaid",
            "polka",
            "floral",
            "animal",
            "camo",
            "tropical",
            "geometric",
        ],  # Solid pairs with anything
        "minimal": [
            "stripes",
            "plaid",
            "polka",
            "floral",
            "animal",
            "geometric",
        ],  # Minimal patterns (like thin stripes) pair well with most
        "striped": [
            "solid",
            "minimal",
        ],  # Striped items pair well with solid or minimal patterns
        "textured": [
            "solid",
            "minimal",
        ],  # Textured items (like knits) pair well with solid
    }

    @classmethod
    def are_patterns_compatible(
        cls, pattern1: Optional[str], pattern2: Optional[str]
    ) -> Tuple[bool, float]:
        """
        Check if two patterns are compatible for an outfit.
        Returns a tuple of (is_compatible, compatibility_score).

        The compatibility score is:
        1.0: Perfectly complementary patterns (e.g., solid + anything)
        0.7: Compatible but not ideal pairing
        0.5: Neutral pairing (neither good nor bad)
        0.2: Not recommended but not terrible
        0.0: Clashing patterns (e.g., stripes + plaid)
        """
        # Default pattern to "solid" if not specified
        if not pattern1:
            pattern1 = "solid"
        if not pattern2:
            pattern2 = "solid"

        pattern1 = pattern1.lower()
        pattern2 = pattern2.lower()

        # If they're the same pattern, generally OK except for busy patterns
        if pattern1 == pattern2:
            if pattern1 in ["busy", "geometric", "plaid"]:
                return False, 0.2  # Same busy pattern is not ideal
            return True, 0.7  # Same pattern is generally OK

        # Check if either pattern is solid (goes with anything)
        if pattern1 == "solid" or pattern2 == "solid":
            return True, 1.0

        # Check if either pattern complements the other
        for base_pattern, complements in cls.PATTERN_COMPLEMENT_RULES.items():
            if (pattern1 == base_pattern and pattern2 in complements) or (
                pattern2 == base_pattern and pattern1 in complements
            ):
                return True, 0.9

        # Check for clashing patterns
        if (
            pattern1 in cls.PATTERN_CLASH_RULES
            and pattern2 in cls.PATTERN_CLASH_RULES[pattern1]
        ):
            return False, 0.0

        if (
            pattern2 in cls.PATTERN_CLASH_RULES
            and pattern1 in cls.PATTERN_CLASH_RULES[pattern2]
        ):
            return False, 0.0

        # Default: neutral compatibility
        return True, 0.5

    @staticmethod
    def calculate_item_match_score(
        item: ClothingItem,
        user_style_profile: Dict[str, float],
        social_proof_context: Optional[SocialProofContext] = None,
    ) -> Tuple[float, List[str]]:
        """
        Calculate how well an item matches the user's style profile.
        Returns a score between 0 and 1, and a list of reasons for the match.

        Args:
            item: The clothing item to evaluate
            user_style_profile: User's style preferences
            social_proof_context: Optional celebrity outfit context for social proof matching
        """
        score_components = {
            "style_match": 0.0,
            "color_match": 0.0,
            "fit_match": 0.0,
            "occasion_match": 0.0,
            "pattern_match": 0.0,  # Pattern matching component
            "trending_bonus": 0.0,
            "social_proof_match": 0.0,  # New component for social proof matching
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

        # Check pattern preference
        if item.pattern:
            pattern_key = f"pattern_{item.pattern.lower()}"
            liked_pattern_key = f"liked_pattern_{item.pattern.lower()}"
            preferred_pattern_key = f"preferred_pattern_{item.pattern.lower()}"

            # If the user has explicitly liked this pattern
            if (
                liked_pattern_key in user_style_profile
                and user_style_profile[liked_pattern_key] > 0
            ):
                score_components["pattern_match"] = user_style_profile[
                    liked_pattern_key
                ]
                match_reasons.append(f"Features your preferred {item.pattern} pattern")

            # If this pattern matches their style profile
            elif (
                pattern_key in user_style_profile
                and user_style_profile[pattern_key] > 0
            ):
                score_components["pattern_match"] = user_style_profile[pattern_key]
                match_reasons.append(
                    f"Has a {item.pattern} pattern that suits your style"
                )

            # If this is in their preferred patterns list
            elif (
                preferred_pattern_key in user_style_profile
                and user_style_profile[preferred_pattern_key] > 0
            ):
                score_components["pattern_match"] = user_style_profile[
                    preferred_pattern_key
                ]
                match_reasons.append(f"Features your preferred {item.pattern} pattern")

            # Default pattern score if no specific preference
            else:
                # Solid patterns are generally safe choices
                if item.pattern.lower() == "solid":
                    score_components["pattern_match"] = 0.8
                    match_reasons.append(
                        "Versatile solid pattern that pairs with anything"
                    )
                else:
                    score_components["pattern_match"] = (
                        0.5  # Neutral score for patterns
                    )
        else:
            # Default to solid if not specified
            score_components["pattern_match"] = 0.7

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

        # Check for disliked patterns
        if item.pattern:
            disliked_pattern_key = f"disliked_pattern_{item.pattern.lower()}"
            if (
                disliked_pattern_key in user_style_profile
                and user_style_profile[disliked_pattern_key] < 0
            ):
                return 0.0, []  # User explicitly dislikes this pattern

        # Apply social proof matching if context is provided
        if social_proof_context:
            social_proof_score = RecommendationService.calculate_social_proof_match(
                item, social_proof_context
            )

            if social_proof_score > 0:
                score_components["social_proof_match"] = social_proof_score

                # Add social proof match reason
                celebrity_reason = (
                    f"Inspired by {social_proof_context.celebrity}'s style"
                )
                match_reasons.append(celebrity_reason)

                # Add social proof match info to item's data (will be used in API responses)
                if not hasattr(item, "social_proof_match"):
                    item.social_proof_match = {
                        "celebrity": social_proof_context.celebrity,
                        "match_score": social_proof_score,
                    }
                    if social_proof_context.event:
                        item.social_proof_match["event"] = social_proof_context.event

        # Calculate final weighted score
        # We need to update the weights to include both pattern_match and social_proof_match components
        # First, calculate total of existing weights
        total_weight = sum(WEIGHTS.values())

        # Assign new weights (reducing from other components proportionally)
        pattern_weight = 0.15
        social_proof_weight = 0.2 if social_proof_context else 0

        new_weights_total = pattern_weight + social_proof_weight
        scale_factor = (total_weight - new_weights_total) / total_weight

        # Calculate final score with all components
        final_score = 0.0
        for component, score in score_components.items():
            if component == "pattern_match":
                final_score += score * pattern_weight
            elif component == "social_proof_match" and social_proof_context:
                final_score += score * social_proof_weight
            else:
                # Scale other weights proportionally
                if component in WEIGHTS:
                    final_score += score * (WEIGHTS[component] * scale_factor)

        # Filter reasons to avoid repetition
        unique_reasons = []
        seen = set()
        for reason in match_reasons:
            if reason not in seen:
                seen.add(reason)
                unique_reasons.append(reason)

        # Prioritize social proof reasons if present
        if social_proof_context and any("Inspired by" in r for r in unique_reasons):
            # Move social proof reasons to the front
            social_reasons = [
                r for r in unique_reasons if social_proof_context.celebrity in r
            ]
            other_reasons = [
                r for r in unique_reasons if social_proof_context.celebrity not in r
            ]
            unique_reasons = social_reasons + other_reasons

        # Limit to top 4 reasons (one more than before to account for social proof)
        top_reasons = unique_reasons[:4]

        # Create social proof match information for API responses if this was a good match
        if social_proof_context and score_components["social_proof_match"] > 0.6:
            # This will be stored in the ItemRecommendation object
            item_social_proof = {
                "celebrity": social_proof_context.celebrity,
                "match_score": score_components["social_proof_match"],
            }

            if social_proof_context.event:
                item_social_proof["event"] = social_proof_context.event

            if hasattr(item, "social_proof_match"):
                item.social_proof_match.update(item_social_proof)
            else:
                item.social_proof_match = item_social_proof

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

            # Check pattern compatibility
            pattern_compatible, pattern_score = (
                RecommendationService.are_patterns_compatible(
                    item.pattern, candidate.pattern
                )
            )

            # Calculate style match
            match_score, _ = RecommendationService.calculate_item_match_score(
                candidate, user_style_profile
            )

            # Boost or penalize score based on compatibility
            if color_compatible:
                match_score *= 1.2

            # Adjust score based on pattern compatibility
            if pattern_compatible:
                # Apply a boost based on how compatible the patterns are
                match_score *= 1.0 + (pattern_score * 0.3)
            else:
                # Penalize for clashing patterns
                match_score *= 1.0 - (1.0 - pattern_score) * 0.5

            # If both color and pattern are incompatible, apply extra penalty
            if not color_compatible and not pattern_compatible:
                match_score *= 0.5

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
        social_proof_context: Optional[SocialProofContext] = None,
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
                compatible_colors = True
                compatible_patterns = True
                pattern_total_score = 0

                for outfit_item_id in outfit_items:
                    outfit_item = next(
                        (i for i in all_items if i.item_id == outfit_item_id), None
                    )
                    if outfit_item:
                        # Check color compatibility
                        if not cls.are_colors_compatible(
                            outfit_item.colors, item.colors
                        ):
                            compatible_colors = False

                        # Check pattern compatibility
                        is_compatible, pattern_score = cls.are_patterns_compatible(
                            outfit_item.pattern, item.pattern
                        )
                        if not is_compatible:
                            compatible_patterns = False
                        pattern_total_score += pattern_score

                # Skip items with incompatible colors or severely clashing patterns
                if not compatible_colors or (
                    not compatible_patterns and pattern_total_score < 0.3
                ):
                    continue

                # Calculate style match (with social proof if available)
                match_score, _ = cls.calculate_item_match_score(
                    item, user_style_profile, social_proof_context
                )

                # Boost score for color compatibility
                if compatible_colors:
                    match_score *= 1.1

                # Adjust score based on pattern compatibility
                if compatible_patterns:
                    avg_pattern_score = pattern_total_score / len(outfit_items)
                    match_score *= 1.0 + (avg_pattern_score * 0.2)
                else:
                    # Minor penalty for slight pattern clashes
                    avg_pattern_score = pattern_total_score / len(outfit_items)
                    match_score *= 1.0 - ((1.0 - avg_pattern_score) * 0.2)

                # Apply social proof boost if applicable
                if social_proof_context and hasattr(item, "social_proof_match"):
                    # Boost score for items that match the celebrity outfit
                    social_match_score = item.social_proof_match.get("match_score", 0)
                    if social_match_score > 0.5:
                        match_score *= 1.0 + (social_match_score * 0.3)

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

            # Analyze patterns in the outfit
            patterns = [item.pattern for item in outfit_items_objects if item.pattern]
            pattern_message = ""

            if not patterns:
                pattern_message = "Simple solid colors that work well together"
            elif all(p.lower() == "solid" for p in patterns):
                pattern_message = "Clean solid colors throughout"
            elif any(p.lower() == "solid" for p in patterns) and len(set(patterns)) > 1:
                non_solid = [p for p in patterns if p.lower() != "solid"][0]
                pattern_message = f"Balanced {non_solid} pattern with solid pieces"
            else:
                pattern_message = "Harmonious pattern combinations"

            # Generate match reasons
            if "dresses" in outfit_categories:
                outfit_type = "dress"
            elif "tops" in outfit_categories and "bottoms" in outfit_categories:
                outfit_type = "separates"
            else:
                outfit_type = "outfit"

            match_reasons = [
                f"Complete {outfit_type} for {occasion}",
                f"Coordinated colors and {pattern_message.lower()}",
                f"Matches your personal style preferences",
            ]

            # Add social proof context if available
            if social_proof_context:
                celebrity = social_proof_context.celebrity

                # Check if there's a significant social proof match
                social_matched_items = [
                    item
                    for item in outfit_items_objects
                    if hasattr(item, "social_proof_match")
                    and item.social_proof_match.get("match_score", 0) > 0.5
                ]

                if social_matched_items:
                    # Determine if this is directly inspired or partially inspired
                    if len(social_matched_items) > len(outfit_items_objects) / 2:
                        match_reasons.insert(0, f"Inspired by {celebrity}'s style")
                    else:
                        match_reasons.insert(
                            0, f"Partially inspired by {celebrity}'s look"
                        )

            # Create and return the outfit recommendation
            return OutfitRecommendation(
                outfit_id=f"outfit_{uuid.uuid4().hex[:8]}",
                items=outfit_items,
                score=avg_score,
                occasion=occasion,
                match_reasons=match_reasons,
                created_at=datetime.now(),
                social_proof=social_proof_context if social_proof_context else None,
            )

        return None  # Could not create a valid outfit

    @staticmethod
    def calculate_social_proof_match(
        item: ClothingItem,
        social_proof: SocialProofContext,
    ) -> float:
        """
        Calculate how well an item matches with a celebrity's outfit in social proof context.
        Improved to handle partial matches based on silhouette, pattern, garment type, and color.

        Args:
            item: The clothing item to evaluate
            social_proof: Celebrity outfit context to match against

        Returns:
            Match score between 0 and 1, with 1 being a perfect match
        """
        if not social_proof or not social_proof.celebrity:
            return 0.0

        score_components = {
            "garment_match": 0.0,
            "color_match": 0.0,
            "pattern_match": 0.0,
            "style_match": 0.0,
            "silhouette_match": 0.0,  # New component for fit/silhouette matching
        }

        match_reasons = []

        # Match garment type/category from outfit tags
        if social_proof.outfit_tags:
            # Extract garment types from outfit tags
            garment_types = []
            for tag in social_proof.outfit_tags:
                # Common garment type words that might appear in tags
                garment_keywords = [
                    "dress",
                    "gown",
                    "suit",
                    "blazer",
                    "jacket",
                    "pants",
                    "trousers",
                    "skirt",
                    "shirt",
                    "blouse",
                    "sweater",
                    "coat",
                    "shoes",
                    "boots",
                    "heels",
                    "sneakers",
                    "bag",
                    "handbag",
                    "clutch",
                    "scarf",
                    "hat",
                    "top",
                    "jeans",
                    "shorts",
                    "jumpsuit",
                    "cardigan",
                    "t-shirt",
                    "tee",
                    "tank",
                    "camisole",
                    "hoodie",
                    "turtleneck",
                    "tunic",
                    "leggings",
                    "culottes",
                    "chinos",
                    "joggers",
                    "sweatpants",
                    "maxi",
                    "mini",
                    "midi",
                    "slip",
                    "bodycon",
                    "a-line",
                    "shift",
                    "wrap",
                    "cocktail",
                    "sheath",
                    "sundress",
                    "shirtdress",
                    "romper",
                    "trench",
                    "parka",
                    "peacoat",
                    "denim",
                    "leather",
                    "bomber",
                    "windbreaker",
                    "cape",
                    "poncho",
                    "raincoat",
                    "overcoat",
                    "puffer",
                    "flats",
                    "loafers",
                    "pumps",
                    "ankle boots",
                    "knee-high",
                    "combat",
                    "stilettos",
                    "mules",
                    "clogs",
                    "wedges",
                    "espadrilles",
                    "oxfords",
                    "slippers",
                    "platforms",
                    "purse",
                    "tote",
                    "backpack",
                    "satchel",
                    "crossbody",
                    "shoulder bag",
                ]

                # Check if any garment type appears in this tag
                for keyword in garment_keywords:
                    if keyword.lower() in tag.lower():
                        garment_types.append(keyword)

            # Check if item's category or subcategory matches any garment type
            item_category = item.category.lower()
            item_subcategory = item.subcategory.lower() if item.subcategory else ""

            # Garment type match score
            garment_match_score = 0.0
            matched_garment = ""

            for garment in garment_types:
                garment_lower = garment.lower()

                # Direct category match
                if garment_lower == item_category or garment_lower == item_subcategory:
                    garment_match_score = 1.0
                    matched_garment = garment
                    match_reasons.append(
                        f"Same {garment} as worn by {social_proof.celebrity}"
                    )
                    break

                # Related category match (expanded with more categories)
                # Footwear types
                elif (
                    garment_lower
                    in [
                        "boots",
                        "heels",
                        "sneakers",
                        "flats",
                        "loafers",
                        "pumps",
                        "stilettos",
                        "mules",
                        "clogs",
                        "wedges",
                        "espadrilles",
                        "oxfords",
                        "slippers",
                        "platforms",
                    ]
                    and item_category == "shoes"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Top types
                elif (
                    garment_lower
                    in [
                        "blouse",
                        "t-shirt",
                        "tee",
                        "tank",
                        "camisole",
                        "hoodie",
                        "turtleneck",
                        "tunic",
                    ]
                    and item_category == "tops"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Bottom types
                elif (
                    garment_lower
                    in ["trousers", "culottes", "chinos", "joggers", "sweatpants"]
                    and item_category == "pants"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Dress types
                elif (
                    garment_lower
                    in [
                        "gown",
                        "maxi",
                        "mini",
                        "midi",
                        "slip",
                        "bodycon",
                        "a-line",
                        "shift",
                        "wrap",
                        "cocktail",
                        "sheath",
                        "sundress",
                        "shirtdress",
                    ]
                    and item_category == "dresses"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Outerwear types
                elif (
                    garment_lower
                    in [
                        "blazer",
                        "trench",
                        "parka",
                        "peacoat",
                        "bomber",
                        "windbreaker",
                        "cape",
                        "poncho",
                        "raincoat",
                        "overcoat",
                        "puffer",
                    ]
                    and item_category == "outerwear"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Bag types
                elif (
                    garment_lower
                    in [
                        "clutch",
                        "purse",
                        "tote",
                        "backpack",
                        "satchel",
                        "crossbody",
                        "shoulder bag",
                    ]
                    and item_category == "bags"
                ):
                    garment_match_score = 0.8
                    matched_garment = garment
                    match_reasons.append(
                        f"Similar to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

                # Generic garment type match - partial credit for being in the same broad category
                elif (
                    (
                        garment_lower
                        in ["top", "shirt", "sweater", "blouse", "t-shirt", "tee"]
                        and item_category
                        in ["tops", "shirts", "t-shirts", "blouses", "sweaters"]
                    )
                    or (
                        garment_lower
                        in ["pants", "bottoms", "jeans", "skirt", "shorts"]
                        and item_category
                        in ["bottoms", "pants", "jeans", "skirts", "shorts"]
                    )
                    or (
                        garment_lower in ["dress", "gown"]
                        and item_category in ["dresses"]
                    )
                    or (
                        garment_lower in ["jacket", "coat", "blazer"]
                        and item_category
                        in ["outerwear", "jackets", "coats", "blazers"]
                    )
                    or (
                        garment_lower in ["shoes", "footwear", "boots", "heels"]
                        and item_category in ["shoes", "footwear"]
                    )
                ):
                    garment_match_score = 0.6
                    matched_garment = garment
                    match_reasons.append(
                        f"Related to the {garment} worn by {social_proof.celebrity}"
                    )
                    break

            score_components["garment_match"] = garment_match_score

            # If we have no garment match yet but there's a description, fallback to category-based matching
            if garment_match_score == 0.0 and social_proof.outfit_description:
                # Look for basic categories in description
                basic_categories = {
                    "tops": ["top", "shirt", "blouse", "t-shirt", "tee", "sweater"],
                    "bottoms": ["pants", "jeans", "skirt", "shorts", "trousers"],
                    "dresses": ["dress", "gown", "jumpsuit"],
                    "outerwear": ["jacket", "coat", "blazer", "cardigan"],
                    "shoes": ["shoes", "boots", "heels", "sandals", "sneakers"],
                    "accessories": [
                        "bag",
                        "purse",
                        "handbag",
                        "jewelry",
                        "scarf",
                        "hat",
                    ],
                }

                for category, keywords in basic_categories.items():
                    if any(
                        keyword in social_proof.outfit_description.lower()
                        for keyword in keywords
                    ):
                        if category.lower() == item_category or (
                            item_subcategory
                            and any(sub in item_subcategory for sub in keywords)
                        ):
                            score_components["garment_match"] = 0.5
                            match_reasons.append(
                                f"Matches {category} category from {social_proof.celebrity}'s outfit"
                            )
                            break

        # Color matching - enhanced with partial matching
        if (
            item.colors
        ):  # Always try to match colors even if social_proof doesn't specify them
            celebrity_colors = set()
            if social_proof.colors:
                celebrity_colors = set(c.lower() for c in social_proof.colors)

            # If no colors found in social proof but there's a description, extract colors from description
            if not celebrity_colors and social_proof.outfit_description:
                # Basic color keywords to extract from text
                color_keywords = [
                    "black",
                    "white",
                    "red",
                    "blue",
                    "green",
                    "yellow",
                    "purple",
                    "pink",
                    "gray",
                    "grey",
                    "brown",
                    "tan",
                    "beige",
                    "cream",
                    "ivory",
                    "navy",
                    "teal",
                    "burgundy",
                    "maroon",
                    "gold",
                    "silver",
                    "orange",
                ]

                for color in color_keywords:
                    if color in social_proof.outfit_description.lower():
                        celebrity_colors.add(color)

            item_colors = set(c.lower() for c in item.colors)

            # Direct color matches
            if celebrity_colors:
                color_matches = celebrity_colors.intersection(item_colors)
                if color_matches:
                    match_score = len(color_matches) / len(celebrity_colors)
                    score_components["color_match"] = match_score

                    # Add color match reason (limit to mentioning 2 colors max)
                    color_list = list(color_matches)[:2]
                    color_text = " and ".join(color_list)
                    match_reasons.append(
                        f"Matches the {color_text} color from {social_proof.celebrity}'s outfit"
                    )
                else:
                    # Check for similar colors (e.g., navy/blue, beige/tan)
                    similar_color_pairs = [
                        ({"navy", "dark blue"}, {"blue"}),
                        ({"beige", "tan", "khaki"}, {"cream", "sand", "stone"}),
                        ({"burgundy", "maroon", "wine"}, {"red", "crimson"}),
                        ({"gray", "grey"}, {"silver", "charcoal"}),
                        ({"forest green", "hunter green"}, {"green", "olive"}),
                    ]

                    matched_similar = False
                    for group1, group2 in similar_color_pairs:
                        if (
                            any(c in group1 for c in celebrity_colors)
                            and any(c in group2 for c in item_colors)
                        ) or (
                            any(c in group2 for c in celebrity_colors)
                            and any(c in group1 for c in item_colors)
                        ):
                            score_components["color_match"] = (
                                0.5  # Partial credit for similar colors
                            )
                            match_reasons.append(
                                f"Similar color palette to {social_proof.celebrity}'s outfit"
                            )
                            matched_similar = True
                            break

                    # Final fallback: neutral colors always get some credit
                    if not matched_similar and any(
                        c in {"black", "white", "gray", "grey", "beige", "navy"}
                        for c in item_colors
                    ):
                        score_components["color_match"] = 0.3
                        match_reasons.append(
                            f"Neutral color that complements {social_proof.celebrity}'s style"
                        )
            else:
                # If no celebrity colors specified, neutral colors get some credit
                if any(
                    c in {"black", "white", "gray", "grey", "beige", "navy"}
                    for c in item_colors
                ):
                    score_components["color_match"] = 0.3
                    match_reasons.append(
                        f"Versatile neutral color that works with {social_proof.celebrity}'s style"
                    )

        # Pattern matching - enhanced with better partial matching
        if item.pattern:
            celebrity_patterns = []
            if social_proof.patterns:
                celebrity_patterns = [p.lower() for p in social_proof.patterns]

            # If no patterns found in social proof but there's a description, extract patterns from description
            if not celebrity_patterns and social_proof.outfit_description:
                # Pattern keywords to extract from text
                pattern_keywords = [
                    "striped",
                    "stripes",
                    "plaid",
                    "checked",
                    "checkered",
                    "polka dot",
                    "floral",
                    "animal print",
                    "leopard",
                    "zebra",
                    "snake",
                    "geometric",
                    "abstract",
                    "solid",
                    "plain",
                    "textured",
                    "embroidered",
                    "sequined",
                    "beaded",
                ]

                for pattern in pattern_keywords:
                    if pattern in social_proof.outfit_description.lower():
                        celebrity_patterns.append(pattern)

            item_pattern = item.pattern.lower()

            if celebrity_patterns:
                # Direct pattern match
                if item_pattern in celebrity_patterns:
                    score_components["pattern_match"] = 1.0
                    match_reasons.append(
                        f"Features the {item_pattern} pattern from {social_proof.celebrity}'s look"
                    )
                # Partial pattern match
                elif any(
                    pattern in item_pattern or item_pattern in pattern
                    for pattern in celebrity_patterns
                ):
                    score_components["pattern_match"] = 0.7
                    match_reasons.append(
                        f"Similar pattern to {social_proof.celebrity}'s outfit"
                    )
                else:
                    # Pattern category matches (e.g., all animal prints are related)
                    pattern_categories = [
                        {"striped", "stripes", "pinstripe", "pinstriped"},
                        {"plaid", "checked", "checkered", "tartan"},
                        {"animal", "leopard", "zebra", "snake", "cheetah", "tiger"},
                        {"floral", "flower", "botanical", "tropical"},
                        {"polka dot", "polka", "dotted", "spots"},
                        {"geometric", "abstract", "graphic"},
                        {"embroidered", "embroidery", "needlework"},
                        {"sequined", "sequin", "sequins", "beaded", "embellished"},
                    ]

                    for category in pattern_categories:
                        celeb_patterns_in_category = [
                            p
                            for p in celebrity_patterns
                            if any(cat_pat in p for cat_pat in category)
                        ]
                        if celeb_patterns_in_category and any(
                            cat_pat in item_pattern for cat_pat in category
                        ):
                            score_components["pattern_match"] = 0.6
                            match_reasons.append(
                                f"Complementary pattern to {social_proof.celebrity}'s style"
                            )
                            break
            else:
                # If no celebrity patterns specified, solid/plain patterns get some credit
                if item_pattern in ["solid", "plain"]:
                    score_components["pattern_match"] = 0.3
                    match_reasons.append(
                        f"Versatile solid pattern that works with {social_proof.celebrity}'s style"
                    )

        # Silhouette/fit matching (new component)
        fit_keywords = {
            "oversized",
            "baggy",
            "loose",
            "fitted",
            "slim",
            "skinny",
            "tight",
            "cropped",
            "high-waisted",
            "low-rise",
            "flared",
            "straight-leg",
            "wide-leg",
            "bootcut",
            "relaxed",
            "structured",
            "tailored",
            "unstructured",
            "boxy",
            "bodycon",
            "a-line",
            "empire",
            "drop-waist",
            "peplum",
            "pencil",
        }

        # Extract fit information from various sources
        item_fit = item.fit_type.lower() if item.fit_type else ""

        # Look for fit indicators in style tags
        item_fit_indicators = [
            tag for tag in item.style_tags if tag.lower() in fit_keywords
        ]

        # Extract celebrity fit preferences
        celebrity_fit_indicators = []

        if social_proof.outfit_tags:
            for tag in social_proof.outfit_tags:
                tag_words = tag.lower().split()
                for word in tag_words:
                    if word in fit_keywords:
                        celebrity_fit_indicators.append(word)

        if social_proof.outfit_description:
            for keyword in fit_keywords:
                if keyword in social_proof.outfit_description.lower():
                    celebrity_fit_indicators.append(keyword)

        # Calculate silhouette match
        if celebrity_fit_indicators and (item_fit or item_fit_indicators):
            # Direct fit match
            if item_fit and item_fit in celebrity_fit_indicators:
                score_components["silhouette_match"] = 1.0
                match_reasons.append(
                    f"Same {item_fit} silhouette as {social_proof.celebrity}'s outfit"
                )

            # Tag-based fit match
            elif item_fit_indicators and any(
                fit in celebrity_fit_indicators for fit in item_fit_indicators
            ):
                matching_fits = [
                    fit
                    for fit in item_fit_indicators
                    if fit in celebrity_fit_indicators
                ]
                score_components["silhouette_match"] = 0.8
                match_reasons.append(
                    f"Matching {matching_fits[0]} silhouette to {social_proof.celebrity}'s style"
                )

            # Complementary fits
            else:
                # Group complementary silhouettes
                complementary_fits = [
                    {"oversized", "baggy", "loose", "relaxed", "boyfriend"},
                    {"fitted", "slim", "skinny", "tight", "bodycon"},
                    {"structured", "tailored"},
                    {"cropped", "high-waisted"},
                    {"flared", "wide-leg", "bootcut"},
                    {"straight-leg", "classic", "regular"},
                ]

                for group in complementary_fits:
                    celeb_fits_in_group = [
                        f for f in celebrity_fit_indicators if f in group
                    ]
                    item_fits_in_group = [f for f in item_fit_indicators if f in group]

                    if item_fit and item_fit in group:
                        item_fits_in_group.append(item_fit)

                    if celeb_fits_in_group and item_fits_in_group:
                        score_components["silhouette_match"] = 0.7
                        match_reasons.append(
                            f"Complementary silhouette to {social_proof.celebrity}'s style"
                        )
                        break

        # Style matching - enhanced with broader style categories
        style_keywords = set()

        # Extract style keywords from outfit description and tags
        if social_proof.outfit_description:
            description = social_proof.outfit_description.lower()
            style_indicators = [
                "casual",
                "formal",
                "elegant",
                "chic",
                "minimalist",
                "bold",
                "classic",
                "vintage",
                "retro",
                "preppy",
                "bohemian",
                "boho",
                "edgy",
                "streetwear",
                "glamorous",
                "sporty",
                "athleisure",
                "business",
                "professional",
                "feminine",
                "masculine",
                "androgynous",
                "romantic",
                "punk",
                "grunge",
                "hip-hop",
                "sophisticated",
                "trendy",
                "timeless",
                "modern",
                "contemporary",
                "urban",
                "festival",
                "party",
                "lounge",
                "vacation",
                "resort",
                "beach",
                "office",
                "workwear",
                "cocktail",
                "evening",
                "black tie",
            ]

            for style in style_indicators:
                if style in description:
                    style_keywords.add(style)

        # Add style keywords from outfit tags
        if social_proof.outfit_tags:
            for tag in social_proof.outfit_tags:
                tag_lower = tag.lower()
                for style in style_indicators:
                    if style in tag_lower:
                        style_keywords.add(style)

        # Match style keywords against item style tags
        if item.style_tags:
            item_styles = set(s.lower() for s in item.style_tags)

            # Direct style matches
            style_matches = style_keywords.intersection(item_styles)

            if style_matches:
                score_components["style_match"] = len(style_matches) / max(
                    len(style_keywords), 1
                )
                style_match = next(iter(style_matches))  # Get first matching style
                match_reasons.append(
                    f"Matches the {style_match} style of {social_proof.celebrity}'s outfit"
                )
            else:
                # Group complementary styles
                complementary_styles = [
                    {"casual", "relaxed", "comfortable", "everyday", "lounge"},
                    {
                        "formal",
                        "elegant",
                        "sophisticated",
                        "dressy",
                        "black tie",
                        "cocktail",
                        "evening",
                    },
                    {"minimalist", "clean", "simple", "streamlined"},
                    {"vintage", "retro", "classic", "timeless"},
                    {"bohemian", "boho", "free-spirited", "eclectic"},
                    {"edgy", "punk", "grunge", "rock", "alternative"},
                    {"sporty", "athleisure", "active", "athletic"},
                    {"streetwear", "urban", "hip-hop", "street style"},
                    {"professional", "business", "workwear", "office"},
                    {"trendy", "fashion-forward", "contemporary", "modern"},
                ]

                for group in complementary_styles:
                    celeb_styles_in_group = style_keywords.intersection(group)
                    item_styles_in_group = item_styles.intersection(group)

                    if celeb_styles_in_group and item_styles_in_group:
                        score_components["style_match"] = 0.6
                        celeb_style = next(iter(celeb_styles_in_group))
                        item_style = next(iter(item_styles_in_group))
                        match_reasons.append(
                            f"Complementary {item_style} style to {social_proof.celebrity}'s {celeb_style} look"
                        )
                        break

        # Calculate final weighted score with updated weights
        weighted_score = (
            score_components["garment_match"] * 0.30
            + score_components["color_match"] * 0.25
            + score_components["pattern_match"] * 0.15
            + score_components["silhouette_match"] * 0.15
            + score_components["style_match"] * 0.15
        )

        # Lower the threshold to accept more partial matches (0.4 instead of 0.5)
        if weighted_score > 0.4:
            return weighted_score
        else:
            return 0.0  # Not significant enough to count as a match

    @classmethod
    def generate_recommendations(
        cls,
        user: UserProfile,
        available_items: List[ClothingItem],
        context: Optional[str] = None,
        social_proof_context: Optional[SocialProofContext] = None,
    ) -> RecommendationResponse:
        """
        Generate personalized recommendations for a user, enforcing a 5/5 split:
        - 1/5 closet-based
        - 1/5 social proof
        - 1/5 trending
        - 1/5 similar brands
        - 2/5 AI best guess
        """
        user_style_profile = StyleAnalysisService.generate_user_style_profile(user)
        user_owned_ids = {item.item_id for item in user.closet_items}
        filtered_items = [
            item for item in available_items if item.item_id not in user_owned_ids
        ]

        # Determine bucket sizes
        total = MAX_RECOMMENDATIONS
        bucket_size = max(1, total // 5)
        best_guess_size = total - 4 * bucket_size

        # --- 1. Closet-based (items that go with user's closet) ---
        closet_items = []
        for item in filtered_items:
            for closet_item in user.closet_items:
                # Use color, style, or pattern compatibility
                if (
                    cls.are_colors_compatible(item.colors, closet_item.colors)
                    or cls.are_patterns_compatible(item.pattern, closet_item.pattern)[0]
                    or any(tag in closet_item.style_tags for tag in item.style_tags)
                ):
                    closet_items.append(item)
                    break
        closet_scored = [
            (item, cls.calculate_item_match_score(item, user_style_profile)[0])
            for item in closet_items
        ]
        closet_scored.sort(key=lambda x: x[1], reverse=True)
        closet_selected = [item for item, _ in closet_scored[:bucket_size]]

        # --- 2. Social Proof (celebrity/pop culture) ---
        social_items = []
        if social_proof_context:
            for item in filtered_items:
                score = cls.calculate_social_proof_match(item, social_proof_context)
                if score > 0.4:
                    social_items.append((item, score))
            social_items.sort(key=lambda x: x[1], reverse=True)
            social_selected = [item for item, _ in social_items[:bucket_size]]
        else:
            social_selected = []

        # --- 3. Trending Items ---
        trending_items = [
            item for item in filtered_items if getattr(item, "is_trending", False)
        ]
        trending_scored = [
            (item, cls.calculate_item_match_score(item, user_style_profile)[0])
            for item in trending_items
        ]
        trending_scored.sort(key=lambda x: x[1], reverse=True)
        trending_selected = [item for item, _ in trending_scored[:bucket_size]]

        # --- 4. Similar Brands ---
        favorite_brands = (
            set(user.favorite_brands) if hasattr(user, "favorite_brands") else set()
        )
        similar_brand_items = []
        for item in filtered_items:
            if item.brand not in favorite_brands and any(
                b.lower() in item.brand.lower() or item.brand.lower() in b.lower()
                for b in favorite_brands
            ):
                similar_brand_items.append(item)
        similar_brand_scored = [
            (item, cls.calculate_item_match_score(item, user_style_profile)[0])
            for item in similar_brand_items
        ]
        similar_brand_scored.sort(key=lambda x: x[1], reverse=True)
        similar_brand_selected = [
            item for item, _ in similar_brand_scored[:bucket_size]
        ]

        # --- 5. AI Best Guess (highest match score, not already selected) ---
        all_scored = [
            (item, cls.calculate_item_match_score(item, user_style_profile)[0])
            for item in filtered_items
        ]
        all_scored.sort(key=lambda x: x[1], reverse=True)
        # Remove already selected items
        already_selected_ids = {
            i.item_id
            for i in closet_selected
            + social_selected
            + trending_selected
            + similar_brand_selected
        }
        best_guess_candidates = [
            item for item, _ in all_scored if item.item_id not in already_selected_ids
        ]
        best_guess_selected = best_guess_candidates[:best_guess_size]

        # --- Combine and deduplicate ---
        final_items = (
            closet_selected
            + social_selected
            + trending_selected
            + similar_brand_selected
            + best_guess_selected
        )
        # Deduplicate while preserving order
        seen = set()
        deduped_items = []
        for item in final_items:
            if item.item_id not in seen:
                deduped_items.append(item)
                seen.add(item.item_id)
        # If we have fewer than total, fill from best guess
        if len(deduped_items) < total:
            for item, _ in all_scored:
                if item.item_id not in seen:
                    deduped_items.append(item)
                    seen.add(item.item_id)
                if len(deduped_items) == total:
                    break
        # Truncate to total
        deduped_items = deduped_items[:total]

        # --- Create item recommendations ---
        item_recommendations = []
        for item in deduped_items:
            complementary_items = cls.find_complementary_items(
                item, filtered_items, user_style_profile
            )
            item_recommendations.append(
                ItemRecommendation(
                    item_id=item.item_id,
                    score=cls.calculate_item_match_score(item, user_style_profile)[0],
                    match_reasons=cls.calculate_item_match_score(
                        item, user_style_profile
                    )[1],
                    complementary_items=complementary_items,
                )
            )

        # --- Generate outfit recommendations (unchanged) ---
        outfit_recommendations = []
        for item in deduped_items[:5]:
            occasion = "Everyday Casual"
            if item.occasion_tags:
                occasion = item.occasion_tags[0]
            outfit = cls.generate_outfit_recommendation(
                item, filtered_items, user_style_profile, occasion
            )
            if outfit and outfit.score > 0.6:
                outfit_recommendations.append(outfit)

        return RecommendationResponse(
            user_id=user.user_id,
            timestamp=datetime.now(),
            recommended_items=item_recommendations,
            recommended_outfits=outfit_recommendations,
            recommendation_context=context,
        )
