"""
Service for analyzing user style preferences based on quiz results and feedback.
"""

import re
from typing import Dict, List, Set, Tuple
import logging

from models.user import (
    UserProfile,
    StyleQuizResults,
    UserFeedback,
    UserClosetItem,
)
from models.clothing import ClothingItem
from config import (
    StyleCategory,
    ColorPalette,
    FitPreference,
    OccasionType,
    WEIGHTS,
)

logger = logging.getLogger(__name__)


class StyleAnalysisService:
    """Service for analyzing user style and preferences."""

    @staticmethod
    def analyze_style_quiz(quiz: StyleQuizResults) -> Dict[str, float]:
        """
        Analyze the style quiz results to create a style profile with weighted attributes.
        Returns a dictionary of style attributes with their normalized weights.
        """
        style_profile = {}

        # Process overall style preferences
        for style in quiz.overall_style:
            style_key = f"style_{style.name.lower()}"
            style_profile[style_key] = 1.0

        # Process color palette preferences
        for palette in quiz.color_palette:
            color_key = f"color_{palette.name.lower()}"
            style_profile[color_key] = 1.0

        # Process pattern preferences
        if quiz.pattern_preference:
            pattern_key = f"pattern_{quiz.pattern_preference.lower().replace(' ', '_')}"
            style_profile[pattern_key] = 1.0

        for pattern in quiz.preferred_patterns:
            pattern_key = f"pattern_{pattern.lower().replace(' ', '_')}"
            style_profile[pattern_key] = 1.0

        # Process fit preferences
        for fit in quiz.top_fit:
            fit_key = f"top_fit_{fit.name.lower()}"
            style_profile[fit_key] = 1.0

        for fit in quiz.bottom_fit:
            fit_key = f"bottom_fit_{fit.lower().replace(' ', '_')}"
            style_profile[fit_key] = 1.0

        # Process occasion preferences
        for occasion in quiz.occasion_preferences:
            occasion_key = f"occasion_{occasion.name.lower()}"
            style_profile[occasion_key] = 1.0

        # Process other preferences
        if quiz.sustainability_priority:
            style_profile["sustainability"] = 1.0

        if quiz.secondhand_interest:
            style_profile["secondhand"] = 1.0

        if quiz.seasonal_preference:
            season_key = f"season_{quiz.seasonal_preference.lower().replace(' ', '_')}"
            style_profile[season_key] = 1.0

        # Process budget range
        if quiz.budget_range:
            budget_map = {
                "Under $50": "budget_low",
                "$50 - $100": "budget_medium_low",
                "$100 - $250": "budget_medium_high",
                "$250+": "budget_high",
            }
            if quiz.budget_range in budget_map:
                style_profile[budget_map[quiz.budget_range]] = 1.0

        # Normalize the weights
        total_weight = sum(style_profile.values())
        if total_weight > 0:
            for key in style_profile:
                style_profile[key] /= total_weight

        return style_profile

    @staticmethod
    def analyze_closet(closet_items: List[UserClosetItem]) -> Dict[str, float]:
        """
        Analyze the user's closet to extract style preferences.
        Returns a dictionary of style attributes with their normalized weights.
        """
        if not closet_items:
            return {}

        closet_profile = {}

        # Count categories
        categories = {}
        for item in closet_items:
            cat = item.category.lower()
            categories[cat] = categories.get(cat, 0) + 1

            if item.subcategory:
                subcat = item.subcategory.lower()
                categories[f"{cat}_{subcat}"] = categories.get(f"{cat}_{subcat}", 0) + 1

        # Normalize category counts
        total_items = len(closet_items)
        for cat, count in categories.items():
            closet_profile[f"category_{cat}"] = count / total_items

        # Analyze colors
        colors = {}
        for item in closet_items:
            if item.color:
                color = item.color.lower()
                colors[color] = colors.get(color, 0) + 1

        # Normalize color counts
        for color, count in colors.items():
            closet_profile[f"color_{color}"] = count / total_items

        # Analyze brands
        brands = {}
        for item in closet_items:
            if item.brand:
                brand = item.brand.lower()
                brands[brand] = brands.get(brand, 0) + 1

        # Normalize brand counts
        for brand, count in brands.items():
            closet_profile[f"brand_{brand}"] = count / total_items

        # Analyze tags
        tags = {}
        for item in closet_items:
            for tag in item.tags:
                tag = tag.lower()
                tags[tag] = tags.get(tag, 0) + 1

        # Normalize tag counts
        for tag, count in tags.items():
            closet_profile[f"tag_{tag}"] = count / total_items

        # Consider favorite items as more important
        favorite_categories = {}
        favorite_colors = {}
        favorite_brands = {}
        favorite_tags = {}

        favorite_count = sum(1 for item in closet_items if item.favorite)

        if favorite_count > 0:
            for item in closet_items:
                if item.favorite:
                    cat = item.category.lower()
                    favorite_categories[cat] = favorite_categories.get(cat, 0) + 1

                    if item.color:
                        color = item.color.lower()
                        favorite_colors[color] = favorite_colors.get(color, 0) + 1

                    if item.brand:
                        brand = item.brand.lower()
                        favorite_brands[brand] = favorite_brands.get(brand, 0) + 1

                    for tag in item.tags:
                        tag = tag.lower()
                        favorite_tags[tag] = favorite_tags.get(tag, 0) + 1

            # Add favorite weights (with higher importance)
            for cat, count in favorite_categories.items():
                closet_profile[f"favorite_category_{cat}"] = (
                    count / favorite_count
                ) * 1.5

            for color, count in favorite_colors.items():
                closet_profile[f"favorite_color_{color}"] = (
                    count / favorite_count
                ) * 1.5

            for brand, count in favorite_brands.items():
                closet_profile[f"favorite_brand_{brand}"] = (
                    count / favorite_count
                ) * 1.5

            for tag, count in favorite_tags.items():
                closet_profile[f"favorite_tag_{tag}"] = (count / favorite_count) * 1.5

        return closet_profile

    @staticmethod
    def analyze_feedback(feedback: UserFeedback) -> Dict[str, float]:
        """
        Analyze user feedback on previous recommendations.
        Returns a dictionary of preferred and disliked attributes.
        """
        if not feedback.liked_items and not feedback.disliked_items:
            return {}

        feedback_profile = {}

        # We'll implement a simple version assuming item_ids follow patterns that reveal attributes
        # In a real implementation, you would look up the actual item details from a database

        # Process liked items (assume item_ids have format like "brand_category_color_etc")
        liked_brands = set()
        liked_categories = set()
        liked_colors = set()

        for item_id in feedback.liked_items:
            parts = item_id.split("_")
            if len(parts) >= 3:
                liked_brands.add(parts[0].lower())
                liked_categories.add(parts[1].lower())
                liked_colors.add(parts[2].lower())

        # Similarly for disliked items
        disliked_brands = set()
        disliked_categories = set()
        disliked_colors = set()

        for item_id in feedback.disliked_items:
            parts = item_id.split("_")
            if len(parts) >= 3:
                disliked_brands.add(parts[0].lower())
                disliked_categories.add(parts[1].lower())
                disliked_colors.add(parts[2].lower())

        # Add positive weights for liked attributes
        for brand in liked_brands:
            feedback_profile[f"liked_brand_{brand}"] = 1.0

        for category in liked_categories:
            feedback_profile[f"liked_category_{category}"] = 1.0

        for color in liked_colors:
            feedback_profile[f"liked_color_{color}"] = 1.0

        # Add negative weights for disliked attributes
        for brand in disliked_brands:
            feedback_profile[f"disliked_brand_{brand}"] = -1.0

        for category in disliked_categories:
            feedback_profile[f"disliked_category_{category}"] = -1.0

        for color in disliked_colors:
            feedback_profile[f"disliked_color_{color}"] = -1.0

        return feedback_profile

    @staticmethod
    def combine_style_profiles(
        quiz_profile: Dict[str, float],
        closet_profile: Dict[str, float],
        feedback_profile: Dict[str, float],
    ) -> Dict[str, float]:
        """
        Combine different style profiles into a single comprehensive profile.
        Applies appropriate weighting to each source.
        """
        combined_profile = {}

        # Define weights for each profile source
        source_weights = {
            "quiz": 0.5,  # Style quiz has highest weight
            "closet": 0.3,  # Closet analysis has medium weight
            "feedback": 0.2,  # Feedback has lowest weight but can override
        }

        # Add quiz profile attributes with quiz weight
        for key, value in quiz_profile.items():
            combined_profile[key] = value * source_weights["quiz"]

        # Add closet profile attributes with closet weight
        for key, value in closet_profile.items():
            if key in combined_profile:
                combined_profile[key] += value * source_weights["closet"]
            else:
                combined_profile[key] = value * source_weights["closet"]

        # Add feedback profile attributes with feedback weight
        for key, value in feedback_profile.items():
            # For disliked items, we apply a stronger negative weight
            if key.startswith("disliked_"):
                if key in combined_profile:
                    # Override with negative value
                    combined_profile[key] = -1.0
                else:
                    combined_profile[key] = -1.0
            else:
                if key in combined_profile:
                    combined_profile[key] += value * source_weights["feedback"]
                else:
                    combined_profile[key] = value * source_weights["feedback"]

        return combined_profile

    @classmethod
    def generate_user_style_profile(cls, user: UserProfile) -> Dict[str, float]:
        """
        Generate a comprehensive style profile for a user based on all available data.
        """
        # Process style quiz if available
        quiz_profile = {}
        if user.style_quiz:
            quiz_profile = cls.analyze_style_quiz(user.style_quiz)

        # Process closet items if available
        closet_profile = {}
        if user.closet_items:
            closet_profile = cls.analyze_closet(user.closet_items)

        # Process feedback if available
        feedback_profile = {}
        if user.feedback:
            feedback_profile = cls.analyze_feedback(user.feedback)

        # Combine all profiles
        return cls.combine_style_profiles(
            quiz_profile, closet_profile, feedback_profile
        )
