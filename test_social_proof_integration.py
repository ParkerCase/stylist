#!/usr/bin/env python3
"""
Test script for validating the social proof system end-to-end.
"""

import json
import os
import sys
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SocialProofTest")

# Import modules from the project
from models.user import UserProfile
from models.recommendation import SocialProofContext
from services.recommendation_service import RecommendationService
from services.style_analysis_service import StyleAnalysisService

def load_scraped_data():
    """Load real scraped data from WhoWhatWear."""
    scraped_data_path = os.path.join(
        "services", "social-proof", "__tests__", "debug", "production-scrape-results.json"
    )
    
    try:
        with open(scraped_data_path, "r") as f:
            scraped_items = json.load(f)
        logger.info(f"Loaded {len(scraped_items)} scraped items from {scraped_data_path}")
        return scraped_items
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Failed to load scraped data: {e}")
        return []

def enrich_celebrity_data(scraped_items):
    """Enrich scraped data with additional extracted information."""
    for i, item in enumerate(scraped_items):
        logger.info(f"Item {i+1}:")
        logger.info(f"  Celebrity: {item.get('celebrity', 'Unknown')}")
        logger.info(f"  Event: {item.get('event', 'N/A')}")
        logger.info(f"  Outfit Description: {item.get('outfitDescription', 'N/A')[:100]}...")
        logger.info(f"  Image: {'✅ Available' if item.get('imageUrl') else '❌ Missing'}")
        
        # Add outfit tags for better matching (extracting key terms from description)
        if "outfitTags" not in item:
            # Extract potential outfit elements from description
            desc = item.get("outfitDescription", "").lower()
            potential_tags = []
            
            # List of common clothing items to look for
            clothing_items = [
                "dress", "gown", "jacket", "blazer", "suit", "pants", "jeans", 
                "skirt", "top", "t-shirt", "blouse", "sweater", "cardigan",
                "coat", "shorts", "jumpsuit", "romper", "boots", "shoes",
                "heels", "sneakers", "sandals", "bag", "handbag", "scarf"
            ]
            
            for clothing in clothing_items:
                if clothing in desc:
                    # Look for adjectives before the clothing item
                    # This is a simple approach - in production you'd want more sophisticated NLP
                    words = desc.split()
                    for i, word in enumerate(words):
                        if word == clothing and i > 0:
                            # Check if previous word might be an adjective (color, style, etc.)
                            potential_tags.append(f"{words[i-1]} {clothing}")
                    
                    # Add just the clothing item too
                    potential_tags.append(clothing)
            
            item["outfitTags"] = potential_tags
            
        # Extract color information if not present
        if "colors" not in item or not item["colors"]:
            item["colors"] = extract_colors(item.get("outfitDescription", ""))
            
        # Extract pattern information if not present
        if "patterns" not in item or not item["patterns"]:
            item["patterns"] = extract_patterns(item.get("outfitDescription", ""))
        
        # Add ID if not present
        if "id" not in item:
            item["id"] = f"celeb_{i+1}"
            
        logger.info(f"  Outfit Tags: {item.get('outfitTags', [])}")
        logger.info(f"  Colors: {item.get('colors', [])}")
        logger.info(f"  Patterns: {item.get('patterns', [])}")
        logger.info("")
    
    return scraped_items

def extract_colors(text: str) -> List[str]:
    """Extract color information from text description."""
    color_keywords = [
        "black", "white", "red", "blue", "green", "yellow", "purple", 
        "pink", "grey", "gray", "brown", "orange", "navy", "teal",
        "burgundy", "beige", "cream", "tan", "gold", "silver"
    ]
    
    found_colors = []
    text_lower = text.lower()
    
    for color in color_keywords:
        if color in text_lower:
            found_colors.append(color)
    
    return found_colors

def extract_patterns(text: str) -> List[str]:
    """Extract pattern information from text description."""
    pattern_keywords = [
        "stripes", "striped", "floral", "plaid", "checked", "checkered",
        "polka dot", "dotted", "animal print", "leopard", "zebra",
        "geometric", "plain", "solid", "textured", "embroidered",
        "sequined", "beaded", "lace", "denim", "leather"
    ]
    
    found_patterns = []
    text_lower = text.lower()
    
    for pattern in pattern_keywords:
        if pattern in text_lower:
            found_patterns.append(pattern)
    
    return found_patterns

def test_social_proof_matching():
    """Test social proof matching with the recommendation service."""
    
    logger.info("\n--- Testing Social Proof Recommendation Integration ---")
    
    # Step 1: Load real scraped data
    scraped_items = load_scraped_data()
    if not scraped_items:
        logger.error("No scraped data available - cannot proceed with test")
        return False
    
    # Step 2: Enrich data with tags, colors, patterns
    enriched_items = enrich_celebrity_data(scraped_items)
    
    # Step 3: Create mock items for testing
    mock_items = create_mock_items()
    logger.info(f"Created {len(mock_items)} mock clothing items for testing")
    
    # Step 4: Create a test user profile
    test_user = UserProfile(
        user_id="test_user_01",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    # Step 5: Generate a user style profile
    user_style_profile = StyleAnalysisService.generate_user_style_profile(test_user)
    logger.info("Generated user style profile for testing")
    
    # Step 6: Test social proof matching for each celebrity outfit
    success_count = 0
    
    for celebrity_item in enriched_items:
        logger.info(f"Testing social proof matching for celebrity: {celebrity_item.get('celebrity')}")
        
        # Create social proof context from celebrity item
        social_context = SocialProofContext(
            celebrity=celebrity_item.get("celebrity", "Unknown Celebrity"),
            event=celebrity_item.get("event", ""),
            outfit_description=celebrity_item.get("outfitDescription", ""),
            outfit_tags=celebrity_item.get("outfitTags", []),
            patterns=celebrity_item.get("patterns", []),
            colors=celebrity_item.get("colors", [])
        )
        
        # Test social proof matching for each clothing item
        matched_items = []
        
        for item in mock_items:
            match_score = RecommendationService.calculate_social_proof_match(item, social_context)
            
            if match_score > 0:
                logger.info(f"  ✅ Item {item.item_id} matched with score: {match_score:.2f}")
                matched_items.append((item, match_score))
        
        if matched_items:
            # Sort matches by score
            matched_items.sort(key=lambda x: x[1], reverse=True)
            
            # Show top matches
            logger.info(f"  Found {len(matched_items)} matching items for {social_context.celebrity}")
            for i, (item, score) in enumerate(matched_items[:3]):
                logger.info(f"  Top match {i+1}: {item.item_id} (Score: {score:.2f})")
                if hasattr(item, 'social_proof_match'):
                    logger.info(f"  Social proof info: {item.social_proof_match}")
            
            success_count += 1
        else:
            logger.warning(f"  ⚠️ No matches found for {social_context.celebrity}")
        
        logger.info("")
    
    # Step 7: Final results
    if success_count > 0:
        logger.info(f"✅ Successfully matched {success_count}/{len(enriched_items)} celebrity outfits")
        return True
    else:
        logger.warning("⚠️ No matches were found for any celebrity outfit")
        return False

def test_generate_recommendation_with_social_proof():
    """Test generating recommendations with social proof context."""
    
    logger.info("\n--- Testing Recommendation Generation with Social Proof ---")
    
    # Step 1: Load real scraped data
    scraped_items = load_scraped_data()
    if not scraped_items:
        logger.error("No scraped data available - cannot proceed with test")
        return False
    
    # Step 2: Enrich data with tags, colors, patterns
    enriched_items = enrich_celebrity_data(scraped_items)
    
    # Step 3: Create mock items for testing
    mock_items = create_mock_items()
    logger.info(f"Created {len(mock_items)} mock clothing items for testing")
    
    # Step 4: Create a test user profile
    test_user = UserProfile(
        user_id="test_user_01",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    # Step 5: Test generating recommendations for each celebrity outfit
    success_count = 0
    
    for celebrity_item in enriched_items:
        logger.info(f"Testing recommendation generation for: {celebrity_item.get('celebrity')}")
        
        # Create social proof context from celebrity item
        social_context = SocialProofContext(
            celebrity=celebrity_item.get("celebrity", "Unknown Celebrity"),
            event=celebrity_item.get("event", ""),
            outfit_description=celebrity_item.get("outfitDescription", ""),
            outfit_tags=celebrity_item.get("outfitTags", []),
            patterns=celebrity_item.get("patterns", []),
            colors=celebrity_item.get("colors", [])
        )
        
        try:
            # Generate recommendations using the social proof context
            recommendations = RecommendationService.generate_recommendations(
                test_user, mock_items, context=None, social_proof_context=social_context
            )
            
            # Check results
            if recommendations and recommendations.recommended_items:
                logger.info(f"  ✅ Generated {len(recommendations.recommended_items)} item recommendations")
                
                # Show top recommended items
                for i, item in enumerate(recommendations.recommended_items[:3]):
                    logger.info(f"  Top recommendation {i+1}: {item.item_id}")
                    logger.info(f"  Match reasons: {item.match_reasons}")
                    if hasattr(item, 'social_proof_match') and item.social_proof_match:
                        logger.info(f"  Social proof match: {item.social_proof_match}")
                
                # Check for social proof influence
                social_influenced = any(
                    social_context.celebrity in " ".join(item.match_reasons) 
                    for item in recommendations.recommended_items
                )
                
                if social_influenced:
                    logger.info(f"  ✅ Social proof context from {social_context.celebrity} influenced recommendations")
                    success_count += 1
                else:
                    logger.warning(f"  ⚠️ Social proof context from {social_context.celebrity} did not influence recommendations")
            else:
                logger.warning(f"  ⚠️ No recommendations generated for {social_context.celebrity}")
        except Exception as e:
            logger.error(f"  ❌ Error generating recommendations: {str(e)}")
            logger.error(traceback.format_exc())
        
        logger.info("")
    
    # Step 6: Final results
    if success_count > 0:
        logger.info(f"✅ Successfully generated recommendations influenced by {success_count}/{len(enriched_items)} celebrity outfits")
        return True
    else:
        logger.warning("⚠️ No recommendations were influenced by celebrity outfits")
        return False

def create_mock_items():
    """Create mock clothing items for testing."""
    mock_items = []
    
    # Import random here to ensure it's available for creating mock items
    import random
    from models.clothing import ClothingItem
    
    # Mock clothing categories
    categories = ["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"]
    subcategories = {
        "tops": ["t-shirts", "blouses", "shirts", "sweaters"],
        "bottoms": ["pants", "jeans", "skirts", "shorts"],
        "dresses": ["casual", "formal", "maxi", "mini"],
        "outerwear": ["jackets", "coats", "blazers"],
        "shoes": ["sneakers", "boots", "heels", "sandals"],
        "accessories": ["bags", "jewelry", "scarves", "hats"]
    }
    
    # Mock brands
    brands = ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"]
    
    # Mock colors
    colors = ["black", "white", "blue", "red", "green", "navy", "gray", "pink", "purple", "yellow"]
    
    # Mock patterns
    patterns = ["solid", "stripes", "plaid", "floral", "polka dot", "animal", "geometric"]
    
    # Mock style tags
    style_tags = ["casual", "formal", "elegant", "minimalist", "trendy", "classic", "vintage", "sporty"]
    
    # Generate mock items
    item_id = 1
    for category in categories:
        for subcategory in subcategories.get(category, ["generic"]):
            for _ in range(5):  # 5 items per subcategory
                # Create a clothing item with random attributes
                item = ClothingItem(
                    item_id=f"item_{item_id}",
                    retailer_id="test_retailer",
                    name=f"{subcategory.title()} {item_id}",
                    description=f"A nice {subcategory} item for testing",
                    price=random.randint(20, 200),
                    category=category,
                    subcategory=subcategory,
                    brand=random.choice(brands),
                    colors=[random.choice(colors), random.choice(colors)],
                    pattern=random.choice(patterns),
                    material="Cotton",
                    fit_type="regular",
                    style_tags=[random.choice(style_tags), random.choice(style_tags)],
                    occasion_tags=["casual", "everyday"],
                    images=[f"https://example.com/images/{item_id}.jpg"],
                    trending_score=random.random()
                )
                mock_items.append(item)
                item_id += 1
    
    return mock_items

if __name__ == "__main__":
    # Import modules needed for main execution
    import random
    
    print("="*80)
    print("Testing FashionAI Social Proof Integration")
    print("="*80)
    
    # First test: Social proof matching
    match_result = test_social_proof_matching()
    
    # Second test: Recommendation generation with social proof
    recommendation_result = test_generate_recommendation_with_social_proof()
    
    # Final summary
    print("\n" + "="*80)
    print("Social Proof Integration Test Results:")
    print(f"✅ Social Proof Matching: {'Passed' if match_result else 'Failed'}")
    print(f"✅ Recommendation Generation: {'Passed' if recommendation_result else 'Failed'}")
    print("="*80)
    
    if match_result and recommendation_result:
        print("\n✅ Social proof system is fully functional end-to-end!")
    else:
        print("\n⚠️ Social proof system has issues that need to be addressed")
        
    print("\nCheck the log output above for details on specific tests.")