"""
Tests for social proof integration with recommendation engine.
"""

import unittest
import json
from datetime import datetime
from typing import Dict, List, Any

from stylist.models.clothing import ClothingItem
from stylist.models.user import UserProfile
from stylist.models.recommendation import SocialProofContext
from stylist.services.recommendation_service import RecommendationService
from stylist.services.style_analysis_service import StyleAnalysisService


class TestSocialProofIntegration(unittest.TestCase):
    """Tests for the social proof integration with the recommendation system."""

    def setUp(self):
        # Create test user
        self.user = UserProfile(
            user_id="test_user",
            name="Test User",
            email="test@example.com",
            preferences={
                "favorite_colors": ["black", "blue", "white"],
                "preferred_styles": ["casual", "minimalist"],
                "disliked_patterns": ["animal"]
            },
            style_quiz_results={
                "preferred_fit": "regular",
                "favorite_brands": ["Zara", "Nike"]
            },
            feedback_history=[
                {"item_id": "store1_123", "liked": True},
                {"item_id": "store2_456", "liked": False}
            ],
            created_at=datetime.now()
        )
        
        # Generate user style profile
        self.user_style_profile = StyleAnalysisService.generate_user_style_profile(self.user)
        
        # Create test items
        self.test_items = self._create_test_items()
        
        # Create social proof context (celebrity outfit)
        self.celebrity_outfit = SocialProofContext(
            celebrity="Zendaya",
            event="Movie Premiere",
            outfit_description="Looked stunning in an oversized black blazer with white shirt and slim-fit trousers",
            outfit_tags=["oversized blazer", "white shirt", "slim trousers"],
            patterns=["solid"],
            colors=["black", "white"]
        )

    def _create_test_items(self) -> List[ClothingItem]:
        """Create test items for recommendation tests."""
        items = []
        
        # Item 1: Good match for the celebrity outfit
        items.append(ClothingItem(
            item_id="store1_blazer1",
            name="Oversized Black Blazer",
            brand="Zara",
            description="Elegant oversized black blazer with structured shoulders",
            category="tops",
            subcategory="blazers",
            price=129.99,
            colors=["black"],
            size=["S", "M", "L"],
            available_sizes=["S", "M", "L"],
            fit_type="oversized",
            pattern="solid",
            material=["polyester", "cotton"],
            style_tags=["formal", "elegant", "minimalist"],
            occasion_tags=["work", "evening"],
            season=["fall", "winter", "spring"],
            trending_score=0.8,
            url="https://example.com/products/blazer1",
            imageUrls=["https://example.com/images/blazer1.jpg"],
            inStock=True
        ))
        
        # Item 2: Good color match but different item type
        items.append(ClothingItem(
            item_id="store1_shirt1",
            name="Classic White Button-Down Shirt",
            brand="Gap",
            description="Crisp white button-down shirt in classic fit",
            category="tops",
            subcategory="shirts",
            price=49.99,
            colors=["white"],
            size=["S", "M", "L", "XL"],
            available_sizes=["S", "M", "L", "XL"],
            fit_type="regular",
            pattern="solid",
            material=["cotton"],
            style_tags=["classic", "formal", "minimalist"],
            occasion_tags=["work", "casual"],
            season=["all"],
            trending_score=0.5,
            url="https://example.com/products/shirt1",
            imageUrls=["https://example.com/images/shirt1.jpg"],
            inStock=True
        ))
        
        # Item 3: Matching trousers
        items.append(ClothingItem(
            item_id="store1_pants1",
            name="Slim Fit Black Trousers",
            brand="Zara",
            description="Slim fit black trousers perfect for any occasion",
            category="bottoms",
            subcategory="pants",
            price=79.99,
            colors=["black"],
            size=["28", "30", "32", "34"],
            available_sizes=["28", "30", "32", "34"],
            fit_type="slim",
            pattern="solid",
            material=["polyester", "elastane"],
            style_tags=["formal", "minimalist", "classic"],
            occasion_tags=["work", "evening"],
            season=["all"],
            trending_score=0.7,
            url="https://example.com/products/pants1",
            imageUrls=["https://example.com/images/pants1.jpg"],
            inStock=True
        ))
        
        # Item 4: Not matching (different color, style)
        items.append(ClothingItem(
            item_id="store1_blazer2",
            name="Red Patterned Blazer",
            brand="H&M",
            description="Bold red blazer with floral pattern",
            category="tops",
            subcategory="blazers",
            price=99.99,
            colors=["red", "multicolor"],
            size=["S", "M", "L"],
            available_sizes=["S", "L"],
            fit_type="regular",
            pattern="floral",
            material=["polyester"],
            style_tags=["bold", "statement", "party"],
            occasion_tags=["party", "date_night"],
            season=["spring", "summer"],
            trending_score=0.9,
            url="https://example.com/products/blazer2",
            imageUrls=["https://example.com/images/blazer2.jpg"],
            inStock=True
        ))
        
        # Item 5: Shoes to complete outfit
        items.append(ClothingItem(
            item_id="store1_shoes1",
            name="Black Leather Oxford Shoes",
            brand="Aldo",
            description="Classic black leather oxford shoes",
            category="shoes",
            subcategory="formal",
            price=129.99,
            colors=["black"],
            size=["8", "9", "10", "11", "12"],
            available_sizes=["8", "9", "10", "11", "12"],
            fit_type="regular",
            pattern="solid",
            material=["leather"],
            style_tags=["formal", "classic", "minimalist"],
            occasion_tags=["work", "formal", "evening"],
            season=["all"],
            trending_score=0.6,
            url="https://example.com/products/shoes1",
            imageUrls=["https://example.com/images/shoes1.jpg"],
            inStock=True
        ))
        
        return items

    def test_social_proof_match_calculation(self):
        """Test the social proof match calculation."""
        # Test good match (oversized black blazer)
        black_blazer = self.test_items[0]
        match_score = RecommendationService.calculate_social_proof_match(
            black_blazer, self.celebrity_outfit
        )
        self.assertGreater(match_score, 0.7, "Black blazer should have high match score with celebrity outfit")
        
        # Test partial match (white shirt)
        white_shirt = self.test_items[1]
        match_score = RecommendationService.calculate_social_proof_match(
            white_shirt, self.celebrity_outfit
        )
        self.assertGreater(match_score, 0.5, "White shirt should have decent match score")
        
        # Test partial match (black trousers)
        black_pants = self.test_items[2]
        match_score = RecommendationService.calculate_social_proof_match(
            black_pants, self.celebrity_outfit
        )
        self.assertGreater(match_score, 0.5, "Black pants should have decent match score")
        
        # Test poor match (red blazer)
        red_blazer = self.test_items[3]
        match_score = RecommendationService.calculate_social_proof_match(
            red_blazer, self.celebrity_outfit
        )
        self.assertLess(match_score, 0.5, "Red blazer should have low match score")

    def test_item_match_score_with_social_proof(self):
        """Test that item match scores incorporate social proof context."""
        # Test with black blazer (good match to celebrity outfit)
        black_blazer = self.test_items[0]
        
        # Score without social proof
        score_without_social, reasons_without = RecommendationService.calculate_item_match_score(
            black_blazer, self.user_style_profile
        )
        
        # Score with social proof
        score_with_social, reasons_with = RecommendationService.calculate_item_match_score(
            black_blazer, self.user_style_profile, self.celebrity_outfit
        )
        
        # Score should be higher with social proof
        self.assertGreater(score_with_social, score_without_social,
                          "Score should be higher with social proof context")
        
        # Check for celebrity mention in reasons
        celebrity_mentioned = any(self.celebrity_outfit.celebrity in reason for reason in reasons_with)
        self.assertTrue(celebrity_mentioned, 
                       f"Match reasons should mention the celebrity: {reasons_with}")
        
        # Check that item has social_proof_match attribute
        self.assertTrue(hasattr(black_blazer, 'social_proof_match'),
                       "Item should have social_proof_match attribute")
        
        # Check attribute contents
        self.assertEqual(black_blazer.social_proof_match.get('celebrity'), 
                        self.celebrity_outfit.celebrity,
                        "Social proof match should have correct celebrity name")

    def test_outfit_recommendation_with_social_proof(self):
        """Test that outfit recommendations incorporate social proof."""
        # Create an outfit recommendation with the blazer as base
        black_blazer = self.test_items[0]
        
        # Generate outfit without social proof
        outfit_without_social = RecommendationService.generate_outfit_recommendation(
            black_blazer, self.test_items, self.user_style_profile, "evening"
        )
        
        # Generate outfit with social proof
        outfit_with_social = RecommendationService.generate_outfit_recommendation(
            black_blazer, self.test_items, self.user_style_profile, "evening", 
            self.celebrity_outfit
        )
        
        # Both outfits should be generated successfully
        self.assertIsNotNone(outfit_without_social, "Should generate outfit without social proof")
        self.assertIsNotNone(outfit_with_social, "Should generate outfit with social proof")
        
        # Outfit with social proof should have higher score
        self.assertGreaterEqual(outfit_with_social.score, outfit_without_social.score,
                             "Outfit with social proof should have equal or higher score")
        
        # Check that social proof is saved in the outfit
        self.assertIsNotNone(outfit_with_social.social_proof,
                            "Outfit should have social_proof attribute")
        
        # Check that match reasons mention the celebrity
        celebrity_mentioned = any(self.celebrity_outfit.celebrity in reason 
                                for reason in outfit_with_social.match_reasons)
        self.assertTrue(celebrity_mentioned,
                       f"Outfit match reasons should mention celebrity: {outfit_with_social.match_reasons}")
        
        # Inspect the outfit components
        self.assertGreaterEqual(len(outfit_with_social.items), 3,
                             "Should include at least 3 items for a complete outfit")

    def test_recommendations_with_social_proof(self):
        """Test generating a full recommendation response with social proof."""
        # Generate recommendations without social proof
        recs_without_social = RecommendationService.generate_recommendations(
            self.user, self.test_items, "evening"
        )
        
        # Generate recommendations with social proof
        recs_with_social = RecommendationService.generate_recommendations(
            self.user, self.test_items, "evening", self.celebrity_outfit
        )
        
        # Both should have items and outfits
        self.assertTrue(len(recs_without_social.recommended_items) > 0, 
                       "Should have items without social proof")
        self.assertTrue(len(recs_with_social.recommended_items) > 0,
                       "Should have items with social proof")
        
        # Convert to dictionary (testing API response format)
        response_dict = recs_with_social.to_dict()
        
        # Serialize and deserialize (testing JSON compatibility)
        json_str = json.dumps(response_dict)
        parsed_dict = json.loads(json_str)
        
        # Check if some items have social proof match info
        has_social_proof = False
        for item in parsed_dict["recommended_items"]:
            if "social_proof_match" in item:
                has_social_proof = True
                self.assertEqual(item["social_proof_match"]["celebrity"],
                                self.celebrity_outfit.celebrity,
                                "Should have correct celebrity name")
        
        self.assertTrue(has_social_proof, 
                       "At least one item should have social proof match information")


if __name__ == "__main__":
    unittest.main()