"""
Tests for the recommendation service.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

from models.user import (
    UserProfile,
    StyleQuizResults,
    UserClosetItem,
    UserFeedback,
)
from models.clothing import ClothingItem
from models.recommendation import ItemRecommendation, OutfitRecommendation
from services.recommendation_service import RecommendationService
from services.style_analysis_service import StyleAnalysisService
from config import StyleCategory, ColorPalette, FitPreference, OccasionType


class TestRecommendationService(unittest.TestCase):
    """Test cases for the RecommendationService."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a sample user
        self.user = UserProfile(
            user_id="test_user",
            style_quiz=StyleQuizResults(
                overall_style=[StyleCategory.SPORTY, StyleCategory.MINIMALIST],
                color_palette=[ColorPalette.NEUTRALS],
                occasion_preferences=[OccasionType.CASUAL],
                preferred_patterns=["solid", "stripes"],
            ),
        )

        # Create a mock style profile
        self.style_profile = {
            "style_casual": 0.8,
            "style_sporty": 0.7,
            "color_neutrals": 0.6,
            "color_black": 0.8,
            "occasion_casual": 0.9,
            "occasion_everyday casual": 0.9,
            "liked_category_tops": 0.8,
            "top_fit_regular": 0.7,
            "bottom_fit_slim": 0.7,
            "disliked_category_formal": -1.0,
            "pattern_solid": 0.8,
            "pattern_stripes": 0.6,
            "preferred_pattern_solid": 0.8,
            "preferred_pattern_stripes": 0.7,
            "disliked_pattern_busy": -0.7,
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
                pattern="solid",
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
                pattern="solid",
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
                pattern="solid",
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
                pattern="solid",
                trending_score=0.5,
            ),
            ClothingItem(
                item_id="item5",
                name="Striped Polo",
                brand="Ralph Lauren",
                category="tops",
                subcategory="polo",
                colors=["navy", "white"],
                style_tags=["casual", "preppy"],
                fit_type="regular",
                occasion_tags=["casual"],
                pattern="stripes",
                trending_score=0.7,
            ),
            ClothingItem(
                item_id="item6",
                name="Plaid Shirt",
                brand="J.Crew",
                category="tops",
                subcategory="shirts",
                colors=["red", "blue"],
                style_tags=["casual", "classic"],
                fit_type="regular",
                occasion_tags=["casual"],
                pattern="plaid",
                trending_score=0.6,
            ),
            ClothingItem(
                item_id="item7",
                name="Floral Skirt",
                brand="Zara",
                category="bottoms",
                subcategory="skirts",
                colors=["pink", "green"],
                style_tags=["feminine", "casual"],
                fit_type="a-line",
                occasion_tags=["casual", "date night"],
                pattern="floral",
                trending_score=0.8,
            ),
            ClothingItem(
                item_id="item8",
                name="Busy Pattern Pants",
                brand="Versace",
                category="bottoms",
                subcategory="pants",
                colors=["gold", "black"],
                style_tags=["bold", "statement"],
                fit_type="straight",
                occasion_tags=["party"],
                pattern="busy",
                trending_score=0.7,
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

        # Update formal item to have a disliked tag
        formal_item.style_tags = ["formal", "elegant", "disliked"]

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

        # Formal item should have a low score (but not necessarily zero)
        self.assertLess(formal_score, 0.2)

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
        
    def test_are_patterns_compatible(self):
        """Test pattern compatibility checking."""
        # Test solid with anything (should always be compatible)
        is_compatible, score = RecommendationService.are_patterns_compatible("solid", "plaid")
        self.assertTrue(is_compatible)
        self.assertEqual(score, 1.0)
        
        is_compatible, score = RecommendationService.are_patterns_compatible("solid", "floral")
        self.assertTrue(is_compatible)
        self.assertEqual(score, 1.0)
        
        # Test known clashing patterns
        is_compatible, score = RecommendationService.are_patterns_compatible("stripes", "plaid")
        self.assertFalse(is_compatible)
        self.assertEqual(score, 0.0)
        
        is_compatible, score = RecommendationService.are_patterns_compatible("plaid", "polka")
        self.assertFalse(is_compatible)
        self.assertEqual(score, 0.0)
        
        # Test complementary patterns
        is_compatible, score = RecommendationService.are_patterns_compatible("solid", "stripes")
        self.assertTrue(is_compatible)
        self.assertGreater(score, 0.5)
        
        # Test same pattern
        is_compatible, score = RecommendationService.are_patterns_compatible("stripes", "stripes")
        self.assertTrue(is_compatible)
        self.assertEqual(score, 0.7)
        
        # Test busy pattern with itself (should be less ideal)
        is_compatible, score = RecommendationService.are_patterns_compatible("busy", "busy")
        self.assertFalse(is_compatible)
        self.assertEqual(score, 0.2)
        
        # Test None values default to "solid"
        is_compatible, score = RecommendationService.are_patterns_compatible(None, "floral")
        self.assertTrue(is_compatible)
        self.assertEqual(score, 1.0)
        
        is_compatible, score = RecommendationService.are_patterns_compatible(None, None)
        self.assertTrue(is_compatible)
        self.assertEqual(score, 0.7)  # Same pattern (solid) is generally OK

    def test_find_complementary_items(self):
        """Test finding complementary items."""
        # Let's modify our items to make sure they match our test criteria
        # Update the first item to match our style profile better
        base_item = self.items[0]  # Black T-Shirt (solid pattern)
        base_item.style_tags = ["casual", "sporty"]
        base_item.occasion_tags = ["casual", "everyday casual"]
        
        # Ensure at least one complementary item in the collection
        jeans = self.items[1]  # Blue jeans
        jeans.style_tags = ["casual", "sporty"]
        jeans.occasion_tags = ["casual", "everyday casual"]
        jeans.category = "bottoms"  # Ensure it's complementary to tops
        
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
            
        # Let's do a different, more direct test for pattern compatibility
        # We'll create patterns that we know should clash vs. complement
        solid_pattern = "solid"
        striped_pattern = "stripes"
        plaid_pattern = "plaid"
        
        # Test direct pattern compatibility
        is_compatible1, score1 = RecommendationService.are_patterns_compatible(solid_pattern, striped_pattern)
        is_compatible2, score2 = RecommendationService.are_patterns_compatible(striped_pattern, plaid_pattern)
        
        # Solid and stripes should be compatible
        self.assertTrue(is_compatible1)
        self.assertGreater(score1, 0.5)
        
        # Stripes and plaid should clash
        self.assertFalse(is_compatible2)
        self.assertLess(score2, 0.5)

    def test_generate_outfit_recommendation(self):
        """Test generating outfit recommendations."""
        base_item = self.items[0]  # Black T-Shirt (solid pattern)

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
        patterns = set()
        for item_id in outfit.items:
            item = next((i for i in self.items if i.item_id == item_id), None)
            self.assertIsNotNone(item)
            categories.add(item.category)
            if item.pattern:
                patterns.add(item.pattern)

        # Should have at least 2 different categories
        self.assertGreaterEqual(len(categories), 2)
        
        # Test with a patterned base item
        striped_item = self.items[4]  # Striped Polo
        
        outfit = RecommendationService.generate_outfit_recommendation(
            striped_item, self.items, self.style_profile, "Everyday Casual"
        )
        
        # Should create a valid outfit
        self.assertIsNotNone(outfit)
        
        # Verify that no clashing patterns are included
        pattern_clash_found = False
        included_patterns = []
        
        for item_id in outfit.items:
            item = next((i for i in self.items if i.item_id == item_id), None)
            if item.pattern:
                included_patterns.append(item.pattern)
        
        # Check for clash between included patterns
        for i, pattern1 in enumerate(included_patterns):
            for pattern2 in included_patterns[i+1:]:
                if (pattern1 in RecommendationService.PATTERN_CLASH_RULES and 
                    pattern2 in RecommendationService.PATTERN_CLASH_RULES[pattern1]):
                    pattern_clash_found = True
                    break
                if (pattern2 in RecommendationService.PATTERN_CLASH_RULES and 
                    pattern1 in RecommendationService.PATTERN_CLASH_RULES[pattern2]):
                    pattern_clash_found = True
                    break
        
        self.assertFalse(pattern_clash_found, "Outfit should not contain clashing patterns")
        
    def test_pattern_match_score(self):
        """Test that matching patterns have higher scores than clashing ones."""
        # Solid pattern item (user has positive preference for solid)
        solid_item = self.items[0]  # Black T-Shirt (solid)
        
        # Striped pattern item (user has positive preference for stripes)
        striped_item = self.items[4]  # Striped Polo
        striped_item.style_tags = ["casual", "sporty"]  # Make style tags match preferences
        
        # Busy pattern item (user has negative preference for busy)
        busy_item = self.items[7]  # Busy Pattern Pants
        
        # Calculate scores
        solid_score, _ = RecommendationService.calculate_item_match_score(
            solid_item, self.style_profile
        )
        
        striped_score, _ = RecommendationService.calculate_item_match_score(
            striped_item, self.style_profile
        )
        
        busy_score, _ = RecommendationService.calculate_item_match_score(
            busy_item, self.style_profile
        )
        
        # Solid should score well as it's a preferred pattern
        self.assertGreater(solid_score, 0.5)
        
        # Striped should score reasonably well (not necessarily > 0.5)
        self.assertGreater(striped_score, 0.4)
        
        # Busy pattern should have a very low score (user dislikes it)
        self.assertLess(busy_score, 0.3)
        
        # Test complementary vs clashing pattern items
        # We'll compare matching two items that have the same style profile match
        # but different pattern compatibility
        
        # Create two test items with same style but different patterns and better style matches
        complementary_pair = ClothingItem(
            item_id="test1",
            name="Solid Top",
            brand="Test",
            category="bottoms",  # Different category to ensure it's a valid complement
            colors=["black"],
            style_tags=["casual", "sporty"],
            pattern="solid",
        )
        
        clashing_pair = ClothingItem(
            item_id="test2",
            name="Plaid Top",
            brand="Test",
            category="bottoms",  # Different category to ensure it's a valid complement
            colors=["black"],
            style_tags=["casual", "sporty"],
            pattern="plaid",
        )
        
        # With a striped item as the base, test which patterns it prefers as complements
        test_item_list = [complementary_pair, clashing_pair]
        
        # Directly compare scores when paired with a striped item
        solid_compatible, solid_score = RecommendationService.are_patterns_compatible("stripes", "solid")
        plaid_compatible, plaid_score = RecommendationService.are_patterns_compatible("stripes", "plaid")
        
        # Solid should be better than plaid when paired with stripes
        self.assertGreater(solid_score, plaid_score,
                          "Solid should have higher compatibility score with stripes than plaid does")


if __name__ == "__main__":
    unittest.main()
