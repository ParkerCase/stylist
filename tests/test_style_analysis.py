"""
Tests for the style analysis service.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

from stylist.models.user import (
    UserProfile,
    StyleQuizResults,
    UserClosetItem,
    UserFeedback,
)
from stylist.services.style_analysis_service import StyleAnalysisService
from stylist.config import StyleCategory, ColorPalette, FitPreference, OccasionType


class TestStyleAnalysisService(unittest.TestCase):
    """Test cases for the StyleAnalysisService."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a sample style quiz
        self.style_quiz = StyleQuizResults(
            overall_style=[StyleCategory.CASUAL, StyleCategory.MINIMALIST],
            color_palette=[ColorPalette.NEUTRALS],
            top_fit=[FitPreference.OVERSIZED],
            occasion_preferences=[OccasionType.CASUAL],
        )

        # Create sample closet items
        self.closet_items = [
            UserClosetItem(
                item_id="item1",
                category="tops",
                subcategory="t-shirts",
                color="black",
                tags=["casual", "favorite"],
                favorite=True,
            ),
            UserClosetItem(
                item_id="item2",
                category="bottoms",
                subcategory="jeans",
                color="blue",
                tags=["casual", "everyday"],
                favorite=False,
            ),
            UserClosetItem(
                item_id="item3",
                category="shoes",
                subcategory="sneakers",
                color="white",
                tags=["sporty", "favorite"],
                favorite=True,
            ),
        ]

        # Create sample user feedback
        self.feedback = UserFeedback(
            liked_items={"brand_tops_black_casual", "brand_shoes_white_sporty"},
            disliked_items={"brand_bottoms_green_formal"},
        )

        # Create sample user
        self.user = UserProfile(
            user_id="test_user",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            closet_items=self.closet_items,
            style_quiz=self.style_quiz,
            feedback=self.feedback,
        )

    def test_analyze_style_quiz(self):
        """Test analyzing style quiz."""
        profile = StyleAnalysisService.analyze_style_quiz(self.style_quiz)

        # Check that profile contains expected keys
        self.assertIn("style_casual", profile)
        self.assertIn("style_minimalist", profile)
        self.assertIn("color_neutrals", profile)
        self.assertIn("top_fit_oversized", profile)
        self.assertIn("occasion_casual", profile)

        # Check that weights are normalized
        total_weight = sum(profile.values())
        self.assertAlmostEqual(total_weight, 1.0, places=5)

    def test_analyze_closet(self):
        """Test analyzing closet items."""
        profile = StyleAnalysisService.analyze_closet(self.closet_items)

        # Check that profile contains expected category keys
        self.assertIn("category_tops", profile)
        self.assertIn("category_bottoms", profile)
        self.assertIn("category_shoes", profile)

        # Check that profile contains subcategory keys
        self.assertIn("category_tops_t-shirts", profile)
        self.assertIn("category_bottoms_jeans", profile)
        self.assertIn("category_shoes_sneakers", profile)

        # Check that profile contains color keys
        self.assertIn("color_black", profile)
        self.assertIn("color_blue", profile)
        self.assertIn("color_white", profile)

        # Check that profile contains tag keys
        self.assertIn("tag_casual", profile)
        self.assertIn("tag_favorite", profile)
        self.assertIn("tag_sporty", profile)

        # Check that favorite items have higher weights
        self.assertIn("favorite_category_tops", profile)
        self.assertIn("favorite_tag_favorite", profile)

        # Verify categorical distribution
        self.assertAlmostEqual(profile["category_tops"], 1 / 3, places=5)
        self.assertAlmostEqual(profile["category_bottoms"], 1 / 3, places=5)
        self.assertAlmostEqual(profile["category_shoes"], 1 / 3, places=5)

    def test_analyze_feedback(self):
        """Test analyzing user feedback."""
        profile = StyleAnalysisService.analyze_feedback(self.feedback)

        # Check that profile contains liked keys
        self.assertIn("liked_brand_brand", profile)
        self.assertIn("liked_category_tops", profile)
        self.assertIn("liked_color_black", profile)

        # Check that profile contains disliked keys
        self.assertIn("disliked_brand_brand", profile)
        self.assertIn("disliked_category_bottoms", profile)
        self.assertIn("disliked_color_green", profile)

        # Check that liked items have positive weights
        self.assertGreater(profile["liked_category_tops"], 0)

        # Check that disliked items have negative weights
        self.assertLess(profile["disliked_category_bottoms"], 0)

    def test_combine_style_profiles(self):
        """Test combining different style profiles."""
        quiz_profile = {"style_casual": 1.0, "color_neutrals": 1.0}
        closet_profile = {"category_tops": 0.5, "color_black": 0.3, "color_blue": 0.2}
        feedback_profile = {
            "liked_category_tops": 1.0,
            "disliked_category_bottoms": -1.0,
        }

        combined = StyleAnalysisService.combine_style_profiles(
            quiz_profile, closet_profile, feedback_profile
        )

        # Check that all keys from input profiles are present
        for key in quiz_profile:
            self.assertIn(key, combined)

        for key in closet_profile:
            self.assertIn(key, combined)

        for key in feedback_profile:
            self.assertIn(key, combined)

        # Check that the weights are appropriately applied
        # Quiz weight: 0.5
        self.assertAlmostEqual(combined["style_casual"], 1.0 * 0.5, places=5)

        # Closet weight: 0.3
        self.assertAlmostEqual(combined["category_tops"], 0.5 * 0.3, places=5)

        # Feedback weight: 0.2 (but disliked items override)
        self.assertAlmostEqual(combined["disliked_category_bottoms"], -1.0, places=5)

    def test_generate_user_style_profile(self):
        """Test generating a complete user style profile."""
        profile = StyleAnalysisService.generate_user_style_profile(self.user)

        # Check that profile contains elements from all sources
        # From quiz
        self.assertIn("style_casual", profile)
        self.assertIn("color_neutrals", profile)

        # From closet
        self.assertIn("category_tops", profile)
        self.assertIn("color_black", profile)

        # From feedback
        self.assertIn("liked_category_tops", profile)
        self.assertIn("disliked_category_bottoms", profile)

        # Check that the profile has a reasonable number of attributes
        self.assertGreater(len(profile), 10)


if __name__ == "__main__":
    unittest.main()
