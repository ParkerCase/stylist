"""
Tests for the recommendation service.
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
from stylist.models.clothing import ClothingItem
from stylist.models.recommendation import ItemRecommendation, OutfitRecommendation
from stylist.services.recommendation_service import RecommendationService
from stylist.services.style_analysis_service import StyleAnalysisService
from stylist.config import StyleCategory, ColorPalette, FitPreference, OccasionType


class TestRecommendationService(unittest.TestCase):
    """Test cases for the RecommendationService."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a sample user
        self.user = UserProfile(
            user_id="test_user",
            style_quiz=StyleQuizResults(
                overall_style=[StyleCategory.CASUAL, StyleCategory.SPORTY],
                color_palette=[ColorPalette.NEUTRALS],
                occasion_preferences=[OccasionType.CASUAL],
            ),
        )

        # Create a mock style profile
        self.style_profile = {
            "style_casual": 0.4,
            "style_sporty": 0.3,
            "color_neutrals": 0.2,
            "color_black": 0.1,
            "occasion_casual": 0.5,
            "liked_category_tops": 0.2,
            "disliked_category_formal": -1.0,
        }

        # Create sample clothing items
        self.items = [
            ClothingItem(
                item_id="item1",
                name="Black T-Shirt",
                brand="Nike",
                category="tops",
                subcategory="t-shirts",
                colors=["black"],
                style_tags=["casual", "sporty"],
                fit_type="regular",
                occasion_tags=["casual"],
                trending_score=0.8,
            ),
            ClothingItem(
                item_id="item2",
                name="Blue Jeans",
                brand="Levi's",
                category="bottoms",
                subcategory="jeans",
                colors=["blue"],
                style_tags=["casual", "classic"],
                fit_type="slim",
                occasion_tags=["casual"],
                trending_score=0.6,
            ),
            ClothingItem(
                item_id="item3",
                name="White Sneakers",
                brand="Adidas",
                category="shoes",
                subcategory="sneakers",
                colors=["white"],
                style_tags=["sporty", "casual"],
                occasion_tags=["casual", "sporty"],
                trending_score=0.9,
            ),
            ClothingItem(
                item_id="item4",
                name="Formal Shirt",
                brand="Zara",
                category="tops",
                subcategory="shirts",
                colors=["white"],
                style_tags=["formal", "elegant"],
                fit_type="slim",
                occasion_tags=["formal", "business"],
                trending_score=0.5,
            ),
        ]

    @patch.object(StyleAnalysisService, "generate_user_style_profile")
    def test_generate_recommendations(self, mock_generate_profile):
        """Test generating recommendations."""
        # Mock the style profile generation
        mock_generate_profile.return_value = self.style_profile

        # Generate recommendations
        recommendations = RecommendationService.generate_recommendations(
            self.user, self.items
        )

        # Check that we got recommendations
        self.assertIsNotNone(recommendations)
        self.assertEqual(recommendations.user_id, self.user.user_id)

        # Check we have item recommendations
        self.assertGreater(len(recommendations.recommended_items), 0)

        # Verify we don't recommend disliked categories
        for rec in recommendations.recommended_items:
            item = next((i for i in self.items if i.item_id == rec.item_id), None)
            self.assertIsNotNone(item)
            self.assertNotIn("formal", item.style_tags)

    def test_calculate_item_match_score(self):
        """Test calculating item match scores."""
        casual_item = self.items[0]  # Black T-Shirt (casual)
        formal_item = self.items[3]  # Formal Shirt

        # Calculate scores
        casual_score, casual_reasons = RecommendationService.calculate_item_match_score(
            casual_item, self.style_profile
        )

        formal_score, formal_reasons = RecommendationService.calculate_item_match_score(
            formal_item, self.style_profile
        )

        # Casual item should have a good score
        self.assertGreater(casual_score, 0.5)
        self.assertGreater(len(casual_reasons), 0)

        # Formal item should have a low or zero score (due to disliked tag)
        self.assertLess(formal_score, 0.1)

    def test_are_colors_compatible(self):
        """Test color compatibility checking."""
        # Test neutral colors (should be compatible with anything)
        self.assertTrue(RecommendationService.are_colors_compatible(["black"], ["red"]))

        self.assertTrue(
            RecommendationService.are_colors_compatible(["white"], ["blue"])
        )

        # Test complementary colors
        self.assertTrue(
            RecommendationService.are_colors_compatible(["blue"], ["orange"])
        )

        # Test same color family
        self.assertTrue(RecommendationService.are_colors_compatible(["blue"], ["navy"]))

        # Test colors that aren't specifically compatible
        # This is a bit subjective but let's test the function's logic
        self.assertFalse(
            RecommendationService.are_colors_compatible(["red"], ["purple"])
        )

    def test_find_complementary_items(self):
        """Test finding complementary items."""
        base_item = self.items[0]  # Black T-Shirt

        complementary_items = RecommendationService.find_complementary_items(
            base_item, self.items, self.style_profile
        )

        # Should find at least one complementary item
        self.assertGreater(len(complementary_items), 0)

        # Should not include the base item
        self.assertNotIn(base_item.item_id, complementary_items)

        # Should prioritize items from complementary categories (bottoms, shoes)
        for item_id in complementary_items:
            item = next((i for i in self.items if i.item_id == item_id), None)
            self.assertIsNotNone(item)
            self.assertNotEqual(item.category, base_item.category)

    def test_generate_outfit_recommendation(self):
        """Test generating outfit recommendations."""
        base_item = self.items[0]  # Black T-Shirt

        outfit = RecommendationService.generate_outfit_recommendation(
            base_item, self.items, self.style_profile, "Everyday Casual"
        )

        # Should create a valid outfit
        self.assertIsNotNone(outfit)
        self.assertIsInstance(outfit, OutfitRecommendation)

        # Outfit should contain the base item
        self.assertIn(base_item.item_id, outfit.items)

        # Outfit should have a reasonable number of items (at least 3)
        self.assertGreaterEqual(len(outfit.items), 3)

        # Outfit should include items from different categories
        categories = set()
        for item_id in outfit.items:
            item = next((i for i in self.items if i.item_id == item_id), None)
            self.assertIsNotNone(item)
            categories.add(item.category)

        # Should have at least 2 different categories
        self.assertGreaterEqual(len(categories), 2)


if __name__ == "__main__":
    unittest.main()
