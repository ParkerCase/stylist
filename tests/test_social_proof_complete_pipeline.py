"""
Test for the complete end-to-end social proof pipeline from scraping to recommendation
"""

import unittest
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.clothing import ClothingItem
from models.user import UserProfile, StyleQuizResults, UserFeedback
from models.recommendation import SocialProofContext
from services.recommendation_service import RecommendationService
from services.style_analysis_service import StyleAnalysisService
# Import disabled as it might not exist
# from utils.recommendation_utils import calculate_item_similarity

# Import the scraper (if running in non-test mode, comment this out)
try:
    from services.social_proof.whoWhatWearScraper import scrapeWhoWhatWear, generateMockData
    from services.social_proof.parseWhoWhatWear import extractOutfitElements, calculateCelebrityConfidence
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False
    print("Scraper not available, will use mock data only")


class TestCompleteProofPipeline(unittest.TestCase):
    """Tests for the complete social proof pipeline"""

    def setUp(self):
        # Create test user with strong style preferences
        from config import StyleCategory, ColorPalette, FitPreference, OccasionType
        
        # Create style quiz results
        style_quiz = StyleQuizResults()
        style_quiz.overall_style = [StyleCategory.MINIMALIST, StyleCategory.CLASSIC]
        style_quiz.color_palette = [ColorPalette.NEUTRALS, ColorPalette.MONOCHROME]
        style_quiz.top_fit = [FitPreference.FITTED, FitPreference.STRUCTURED]
        style_quiz.bottom_fit = ["slim", "regular"]
        style_quiz.favorite_brands = ["Zara", "Nike"]
        style_quiz.preferred_patterns = ["solid", "minimal"]
        style_quiz.pattern_preference = "solid"
        
        # Create feedback
        feedback = UserFeedback()
        feedback.liked_items = {"store1_123", "store2_789"}
        feedback.disliked_items = {"store2_456"}
        
        # Create the user
        self.user = UserProfile(
            user_id="test_user",
            created_at=datetime.now(),
            style_quiz=style_quiz,
            feedback=feedback
        )
        
        # Generate user style profile
        self.user_style_profile = StyleAnalysisService.generate_user_style_profile(self.user)
        
        # Create test items
        self.test_items = self._create_test_items()

    def _create_test_items(self) -> List[ClothingItem]:
        """Create a diverse set of test items for recommendation testing."""
        items = []
        
        # Basic clothing categories with variations in color, pattern, and style
        item_templates = [
            # Tops
            {
                "category": "tops",
                "subcategory": "t-shirts",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "basic", "fit": "regular"},
                    {"color": "white", "pattern": "solid", "style": "basic", "fit": "oversized"},
                    {"color": "blue", "pattern": "striped", "style": "casual", "fit": "slim"},
                    {"color": "red", "pattern": "graphic", "style": "streetwear", "fit": "oversized"},
                ]
            },
            {
                "category": "tops",
                "subcategory": "blouses",
                "variations": [
                    {"color": "white", "pattern": "solid", "style": "classic", "fit": "regular"},
                    {"color": "black", "pattern": "solid", "style": "minimalist", "fit": "oversized"},
                    {"color": "floral", "pattern": "floral", "style": "boho", "fit": "relaxed"},
                ]
            },
            {
                "category": "tops",
                "subcategory": "sweaters",
                "variations": [
                    {"color": "gray", "pattern": "solid", "style": "classic", "fit": "regular"},
                    {"color": "beige", "pattern": "cable-knit", "style": "preppy", "fit": "oversized"},
                    {"color": "blue", "pattern": "solid", "style": "minimalist", "fit": "slim"},
                ]
            },
            # Bottoms
            {
                "category": "bottoms",
                "subcategory": "jeans",
                "variations": [
                    {"color": "blue", "pattern": "solid", "style": "classic", "fit": "slim"},
                    {"color": "black", "pattern": "solid", "style": "minimalist", "fit": "skinny"},
                    {"color": "blue", "pattern": "distressed", "style": "casual", "fit": "boyfriend"},
                    {"color": "white", "pattern": "solid", "style": "summer", "fit": "wide-leg"},
                ]
            },
            {
                "category": "bottoms",
                "subcategory": "skirts",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "classic", "fit": "a-line"},
                    {"color": "floral", "pattern": "floral", "style": "boho", "fit": "maxi"},
                    {"color": "denim", "pattern": "solid", "style": "casual", "fit": "mini"},
                ]
            },
            {
                "category": "bottoms",
                "subcategory": "pants",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "formal", "fit": "slim"},
                    {"color": "beige", "pattern": "solid", "style": "casual", "fit": "relaxed"},
                    {"color": "green", "pattern": "solid", "style": "utility", "fit": "cargo"},
                ]
            },
            # Dresses
            {
                "category": "dresses",
                "subcategory": "casual",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "minimalist", "fit": "shift"},
                    {"color": "floral", "pattern": "floral", "style": "boho", "fit": "maxi"},
                    {"color": "red", "pattern": "solid", "style": "formal", "fit": "bodycon"},
                ]
            },
            # Outerwear
            {
                "category": "outerwear",
                "subcategory": "jackets",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "classic", "fit": "regular"},
                    {"color": "brown", "pattern": "solid", "style": "vintage", "fit": "oversized"},
                    {"color": "denim", "pattern": "solid", "style": "casual", "fit": "boyfriend"},
                ]
            },
            {
                "category": "outerwear",
                "subcategory": "blazers",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "formal", "fit": "tailored"},
                    {"color": "navy", "pattern": "solid", "style": "preppy", "fit": "regular"},
                    {"color": "beige", "pattern": "checkered", "style": "classic", "fit": "oversized"},
                ]
            },
            # Shoes
            {
                "category": "shoes",
                "subcategory": "sneakers",
                "variations": [
                    {"color": "white", "pattern": "solid", "style": "minimalist", "fit": "regular"},
                    {"color": "black", "pattern": "solid", "style": "sporty", "fit": "regular"},
                    {"color": "multicolor", "pattern": "colorblock", "style": "streetwear", "fit": "regular"},
                ]
            },
            {
                "category": "shoes",
                "subcategory": "boots",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "classic", "fit": "regular"},
                    {"color": "brown", "pattern": "solid", "style": "western", "fit": "regular"},
                    {"color": "white", "pattern": "solid", "style": "modern", "fit": "platform"},
                ]
            },
            # Accessories
            {
                "category": "accessories",
                "subcategory": "bags",
                "variations": [
                    {"color": "black", "pattern": "solid", "style": "minimalist", "fit": "crossbody"},
                    {"color": "brown", "pattern": "solid", "style": "classic", "fit": "tote"},
                    {"color": "beige", "pattern": "solid", "style": "luxury", "fit": "shoulder"},
                ]
            },
        ]
        
        # Generate items based on templates
        item_id_counter = 1
        for template in item_templates:
            category = template["category"]
            subcategory = template["subcategory"]
            
            for variant in template["variations"]:
                color = variant["color"]
                pattern = variant["pattern"]
                style = variant["style"]
                fit = variant["fit"]
                
                # Create a descriptive name
                if pattern != "solid":
                    name = f"{color.title()} {pattern.title()} {subcategory[:-1] if subcategory.endswith('s') else subcategory}"
                else:
                    name = f"{color.title()} {subcategory[:-1] if subcategory.endswith('s') else subcategory}"
                
                # Format colors list
                colors = [color]
                if color == "floral":
                    colors = ["multicolor", "green", "pink"]
                elif color == "striped":
                    colors = ["blue", "white"]
                elif color == "denim":
                    colors = ["blue"]
                elif color == "multicolor":
                    colors = ["red", "blue", "yellow", "green"]
                
                # Create the item
                item = ClothingItem(
                    item_id=f"store1_{item_id_counter}",
                    name=name,
                    brand=["Zara", "H&M", "Nike", "Gap", "Mango"][item_id_counter % 5],
                    description=f"{style.title()} {fit} {name.lower()} perfect for any occasion",
                    category=category,
                    subcategory=subcategory,
                    price=49.99 + (item_id_counter * 10 % 150),
                    colors=colors,
                    size=["XS", "S", "M", "L", "XL"] if category != "shoes" else ["38", "39", "40", "41", "42"],
                    available_sizes=["S", "M", "L"] if category != "shoes" else ["39", "40", "41"],
                    fit_type=fit,
                    pattern=pattern,
                    material=["cotton", "polyester", "elastane"],
                    style_tags=[style, "trendy" if item_id_counter % 4 == 0 else "", "versatile"],
                    occasion_tags=["casual", "everyday", "work" if style == "formal" else ""],
                    season=["all"],
                    trending_score=0.5 + (item_id_counter % 5) * 0.1,
                    url=f"https://example.com/products/{category}/{subcategory}/{item_id_counter}",
                    imageUrls=[f"https://example.com/images/{category}/{subcategory}/{item_id_counter}.jpg"],
                    inStock=True
                )
                
                items.append(item)
                item_id_counter += 1
        
        return items

    def _get_social_proof_contexts(self, count=3) -> List[SocialProofContext]:
        """Get social proof contexts either from scraper or mock data."""
        contexts = []
        
        # Use scraper if available, otherwise generate mock data
        if SCRAPER_AVAILABLE:
            try:
                # Try with real scraper (set to 0 in test environment)
                scraper_attempts = 0
                if scraper_attempts > 0:
                    social_items = scrapeWhoWhatWear({"itemLimit": count, "retryAttempts": 1})
                else:
                    # Use mock data for tests
                    social_items = generateMockData(count)
                
                # Convert to SocialProofContext objects
                for item in social_items:
                    context = SocialProofContext(
                        celebrity=item["celebrity"],
                        event=item.get("event", ""),
                        outfit_description=item["outfitDescription"],
                        outfit_tags=item.get("outfitTags", []),
                        patterns=item.get("patterns", []),
                        colors=item.get("colors", [])
                    )
                    contexts.append(context)
                    
            except Exception as e:
                print(f"Error using scraper: {e}")
                # Fallback to predefined contexts
                contexts = self._get_hardcoded_contexts(count)
        else:
            # Use hardcoded contexts for testing
            contexts = self._get_hardcoded_contexts(count)
            
        return contexts
    
    def _get_hardcoded_contexts(self, count=3) -> List[SocialProofContext]:
        """Get hardcoded social proof contexts for testing."""
        contexts = [
            SocialProofContext(
                celebrity="Zendaya",
                event="Movie Premiere",
                outfit_description="Zendaya stunned in an oversized black blazer with white shirt and slim-fit trousers at the Dune premiere. Her minimalist look was paired with simple gold jewelry.",
                outfit_tags=["oversized blazer", "white shirt", "slim trousers", "gold jewelry"],
                patterns=["solid"],
                colors=["black", "white", "gold"]
            ),
            SocialProofContext(
                celebrity="Hailey Bieber",
                event="Street Style",
                outfit_description="Hailey Bieber was spotted in a casual but chic outfit featuring baggy blue jeans, a white crop top, and an oversized leather jacket. She completed the look with white sneakers and minimal accessories.",
                outfit_tags=["baggy jeans", "crop top", "leather jacket", "sneakers"],
                patterns=["solid"],
                colors=["blue", "white", "black"]
            ),
            SocialProofContext(
                celebrity="Harry Styles",
                event="Concert",
                outfit_description="Harry Styles performed in a bold outfit featuring high-waisted flared pants with a vintage floral pattern, paired with a simple white shirt unbuttoned halfway. He accessorized with multiple necklaces and rings.",
                outfit_tags=["flared pants", "patterned pants", "white shirt", "necklaces"],
                patterns=["floral", "solid"],
                colors=["multicolor", "white"]
            ),
            SocialProofContext(
                celebrity="Blake Lively",
                event="Red Carpet",
                outfit_description="Blake Lively wore an elegant floor-length red gown with a fitted silhouette and subtle sparkle details. The dress featured a high slit and was paired with strappy gold heels.",
                outfit_tags=["gown", "red dress", "fitted dress", "heels"],
                patterns=["solid", "sequined"],
                colors=["red", "gold"]
            ),
            SocialProofContext(
                celebrity="Timothée Chalamet",
                event="Film Festival",
                outfit_description="Timothée Chalamet turned heads in a modern black suit with cropped pants and a collarless jacket. He wore the suit with a simple t-shirt underneath and chunky black boots.",
                outfit_tags=["suit", "cropped pants", "collarless jacket", "t-shirt", "boots"],
                patterns=["solid"],
                colors=["black", "white"]
            )
        ]
        
        return contexts[:count]
        
    def test_social_proof_parsing(self):
        """Test that outfit parsing extracts meaningful elements."""
        contexts = self._get_social_proof_contexts(3)
        
        for context in contexts:
            self.assertIsNotNone(context.celebrity, "Celebrity name should be extracted")
            self.assertIsNotNone(context.outfit_description, "Outfit description should be present")
            
            # Test outfit elements
            outfit_elements = extractOutfitElements(context.outfit_description) if SCRAPER_AVAILABLE else {
                "garments": context.outfit_tags,
                "colors": context.colors,
                "patterns": context.patterns,
                "styles": ["elegant", "casual", "formal"]
            }
            
            print(f"\nCelebrity: {context.celebrity}")
            print(f"Description: {context.outfit_description}")
            print(f"Extracted elements: {outfit_elements}")
            
            # Should extract at least some elements
            has_elements = (
                len(outfit_elements["garments"]) > 0 or
                len(outfit_elements["colors"]) > 0 or
                len(outfit_elements["patterns"]) > 0 or
                len(outfit_elements["styles"]) > 0
            )
            
            self.assertTrue(has_elements, "Should extract some outfit elements")
            
            # If we have the scraper available, verify confidence scores
            if SCRAPER_AVAILABLE:
                confidence = calculateCelebrityConfidence(
                    context.celebrity, 
                    ["Zendaya", "Hailey Bieber", "Harry Styles", "Blake Lively", "Timothée Chalamet"],
                    context.outfit_description
                )
                
                print(f"Celebrity confidence score: {confidence}")
                self.assertGreaterEqual(confidence, 0.5, "Celebrity confidence should be reasonable")
    
    def test_match_individual_items(self):
        """Test matching individual items to social proof contexts."""
        contexts = self._get_social_proof_contexts(3)
        
        for context in contexts:
            print(f"\nTesting matches for {context.celebrity}'s outfit:")
            print(f"Description: {context.outfit_description}")
            print(f"Tags: {context.outfit_tags}")
            print(f"Colors: {context.colors}")
            print(f"Patterns: {context.patterns}")
            
            # Get match scores for all items
            item_scores = []
            for item in self.test_items:
                match_score = RecommendationService.calculate_social_proof_match(
                    item, context
                )
                
                if match_score > 0:
                    item_scores.append((item, match_score))
                    print(f"Match: {item.name} ({item.category}/{item.subcategory}): {match_score:.2f}")
            
            # Sort by score
            item_scores.sort(key=lambda x: x[1], reverse=True)
            
            # We should have at least some matches
            self.assertTrue(len(item_scores) > 0, 
                           f"Should find at least some matches for {context.celebrity}'s outfit")
            
            # Top matches should have decent scores
            if item_scores:
                top_match = item_scores[0]
                print(f"Top match: {top_match[0].name} with score {top_match[1]:.2f}")
                self.assertGreaterEqual(top_match[1], 0.4, 
                                      "Top match should have a reasonable score (>=0.4)")
    
    def test_generate_social_recommendations(self):
        """Test generating recommendations with social proof."""
        for context in self._get_social_proof_contexts(2):
            print(f"\nGenerating recommendations inspired by {context.celebrity}'s outfit")
            
            # Score all items with just user profile (without social proof)
            base_scores = []
            for item in self.test_items:
                score, reasons = RecommendationService.calculate_item_match_score(
                    item, self.user_style_profile
                )
                base_scores.append((item, score))
            
            # Get base average
            base_avg = sum(score for _, score in base_scores) / len(base_scores) if base_scores else 0
            print(f"Average base score (without social proof): {base_avg:.2f}")
            
            # Generate recommendations with social proof
            recs = RecommendationService.generate_recommendations(
                self.user, self.test_items, "casual", context
            )
            
            # Check that we got recommendations
            self.assertIsNotNone(recs, "Should generate recommendations")
            self.assertTrue(len(recs.recommended_items) > 0, "Should have recommended items")
            
            # Check that at least some items reference social proof
            items_with_social = [item for item in recs.recommended_items 
                               if any(context.celebrity in reason for reason in item.match_reasons)]
            
            print(f"Items with social proof influence: {len(items_with_social)}/{len(recs.recommended_items)}")
            self.assertTrue(len(items_with_social) > 0, 
                           f"Some items should reference {context.celebrity} in match reasons")
            
            # Check outfits
            if recs.recommended_outfits:
                print(f"Generated {len(recs.recommended_outfits)} outfits inspired by {context.celebrity}")
                
                for outfit in recs.recommended_outfits:
                    print(f"Outfit score: {outfit.score:.2f}")
                    print(f"Reasons: {outfit.match_reasons}")
                    print(f"Items: {len(outfit.items)}")
                
                # Check if at least one outfit references the celebrity
                outfits_with_social = [outfit for outfit in recs.recommended_outfits 
                                     if any(context.celebrity in reason for reason in outfit.match_reasons)]
                
                print(f"Outfits with social proof influence: {len(outfits_with_social)}/{len(recs.recommended_outfits)}")
                self.assertTrue(len(outfits_with_social) > 0 or len(recs.recommended_outfits) == 0, 
                               f"Outfits should reference {context.celebrity} in match reasons if present")
            
            # Test the API serialization
            api_response = recs.to_dict()
            json_str = json.dumps(api_response)
            deserialized = json.loads(json_str)
            
            # Make sure we can serialize/deserialize
            self.assertEqual(len(deserialized["recommended_items"]), len(recs.recommended_items),
                            "Should serialize/deserialize properly")
            
            # Check for social proof attribution in API response
            items_with_social_in_api = [item for item in deserialized["recommended_items"] 
                                      if "social_proof_match" in item]
            
            # Print details for debugging
            print(f"Items with social proof in API: {len(items_with_social_in_api)}")
            
            if items_with_social_in_api:
                sample = items_with_social_in_api[0]["social_proof_match"]
                print(f"Sample social proof attribution: {sample}")
                self.assertEqual(sample["celebrity"], context.celebrity, 
                                "Should attribute correct celebrity")
    
    def test_partial_match_handling(self):
        """Test handling of partial matches based on different criteria."""
        # Use a celebrity with clear style elements
        context = self._get_hardcoded_contexts(1)[0]  # Zendaya context
        
        # Create specific test items with variations for partial matching
        color_test_item = ClothingItem(
            item_id="test_color_match",
            name="Black Blazer",
            brand="Test",
            description="Black blazer with a regular fit",
            category="tops",
            subcategory="blazers",
            price=99.99,
            colors=["black"],
            size=["S", "M", "L"],
            available_sizes=["S", "M", "L"],
            fit_type="regular",  # Not oversized as in the context
            pattern="solid",
            material=["polyester"],
            style_tags=["formal"],  # Not minimalist
            occasion_tags=["work", "formal"],
            inStock=True
        )
        
        garment_test_item = ClothingItem(
            item_id="test_garment_match",
            name="White Button-Up Shirt",
            brand="Test",
            description="White formal shirt",
            category="tops",
            subcategory="shirts",
            price=49.99,
            colors=["white"],
            size=["S", "M", "L"],
            available_sizes=["S", "M", "L"],
            fit_type="regular",
            pattern="solid",
            material=["cotton"],
            style_tags=["formal", "classic"],
            occasion_tags=["work", "formal"],
            inStock=True
        )
        
        style_test_item = ClothingItem(
            item_id="test_style_match",
            name="Minimalist White T-Shirt",
            brand="Test",
            description="Simple minimalist white t-shirt",
            category="tops",
            subcategory="t-shirts",  # Different garment type
            price=29.99,
            colors=["white"],
            size=["S", "M", "L"],
            available_sizes=["S", "M", "L"],
            fit_type="regular",
            pattern="solid",
            material=["cotton"],
            style_tags=["minimalist"],  # Matches style
            occasion_tags=["casual", "everyday"],
            inStock=True
        )
        
        silhouette_test_item = ClothingItem(
            item_id="test_silhouette_match",
            name="Oversized Denim Jacket",
            brand="Test",
            description="Oversized denim jacket with a relaxed fit",
            category="outerwear",
            subcategory="jackets",  # Different garment
            price=89.99,
            colors=["blue"],  # Different color
            size=["S", "M", "L"],
            available_sizes=["S", "M", "L"],
            fit_type="oversized",  # Matches silhouette
            pattern="solid",
            material=["denim"],
            style_tags=["casual"],
            occasion_tags=["casual", "everyday"],
            inStock=True
        )
        
        # Test all partial match types
        test_items = [color_test_item, garment_test_item, style_test_item, silhouette_test_item]
        
        for item in test_items:
            match_score = RecommendationService.calculate_social_proof_match(item, context)
            print(f"\nPartial match test for {item.name}:")
            print(f"Match score: {match_score:.2f}")
            
            # Should have some positive score for all items (testing partial matching)
            self.assertGreater(match_score, 0.0, 
                              f"{item.name} should have some match score with {context.celebrity}'s outfit")
            
            # Check match reason in recommendation
            _, reasons = RecommendationService.calculate_item_match_score(
                item, self.user_style_profile, context
            )
            
            print(f"Match reasons: {reasons}")
            self.assertTrue(any(context.celebrity in reason for reason in reasons),
                           f"Match reasons should mention {context.celebrity}")
    
    def test_complete_outfit_with_social_proof(self):
        """Test generating a complete outfit with social proof context."""
        # Get a context with clear garment types
        context = self._get_hardcoded_contexts(1)[0]  # Zendaya
        
        # Find the best matching items to use as base
        base_items = []
        for item in self.test_items:
            if item.subcategory == "blazers" and "black" in item.colors:
                base_items.append(item)
                break
        
        if not base_items:
            self.skipTest("Could not find suitable base item")
        
        base_item = base_items[0]
        print(f"\nGenerating outfit based on {base_item.name} with {context.celebrity} inspiration")
        
        # Generate outfit
        outfit = RecommendationService.generate_outfit_recommendation(
            base_item, self.test_items, self.user_style_profile, "evening", context
        )
        
        self.assertIsNotNone(outfit, "Should generate an outfit")
        self.assertTrue(len(outfit.items) >= 3, "Should include at least 3 items")
        
        print(f"Outfit score: {outfit.score:.2f}")
        print(f"Outfit items: {len(outfit.items)}")
        print(f"Reasons: {outfit.match_reasons}")
        
        # Check that outfit references the celebrity
        mentions_celebrity = any(context.celebrity in reason for reason in outfit.match_reasons)
        self.assertTrue(mentions_celebrity, 
                       f"Outfit should mention {context.celebrity} in match reasons")
        
        # Print items in the outfit
        for item_id in outfit.items:
            item = next((i for i in self.test_items if i.item_id == item_id), None)
            if item:
                print(f"- {item.name} ({item.category}/{item.subcategory})")
                print(f"  Colors: {item.colors}, Pattern: {item.pattern}, Fit: {item.fit_type}")
        
        # Test that outfit contains complementary pieces
        categories = set()
        for item_id in outfit.items:
            item = next((i for i in self.test_items if i.item_id == item_id), None)
            if item:
                categories.add(item.category)
        
        # Should have complementary categories
        self.assertTrue(len(categories) >= 2, "Outfit should include items from multiple categories")


if __name__ == "__main__":
    unittest.main()