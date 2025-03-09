"""
Demo script for The Stylist recommendation system.
This script demonstrates how to use the core functions for the recommendation system.
"""

import json
import uuid
import random
from datetime import datetime
from pprint import pprint
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import core modules
from stylist.models.user import (
    UserProfile,
    StyleQuizResults,
    UserClosetItem,
    UserFeedback,
)
from stylist.models.clothing import ClothingItem
from stylist.services.recommendation_service import RecommendationService
from stylist.services.style_analysis_service import StyleAnalysisService
from stylist.utils.recommendation_utils import (
    parse_style_quiz_answers,
    format_recommendation_response,
)
from stylist.config import StyleCategory, ColorPalette, FitPreference, OccasionType


def create_sample_data():
    """Create sample data for demonstration."""

    # Create sample clothing items
    sample_items = []

    # Sample tops
    tops = [
        {
            "item_id": f"top_{i}",
            "name": f"T-Shirt {i}",
            "brand": random.choice(["Zara", "H&M", "Nike", "Adidas"]),
            "category": "tops",
            "subcategory": "t-shirts",
            "colors": [random.choice(["black", "white", "blue", "red", "green"])],
            "sizes": ["S", "M", "L", "XL"],
            "price": random.uniform(15.0, 40.0),
            "images": [f"https://example.com/image{i}.jpg"],
            "style_tags": random.sample(
                ["casual", "minimalist", "classic", "sporty"], 2
            ),
            "fit_type": random.choice(["fitted", "oversized", "regular"]),
            "occasion_tags": ["casual"],
            "season_tags": ["all-season"],
            "trending_score": random.uniform(0.1, 1.0),
        }
        for i in range(1, 11)
    ]
    sample_items.extend([ClothingItem(**item) for item in tops])

    # Sample bottoms
    bottoms = [
        {
            "item_id": f"bottom_{i}",
            "name": f"Jeans {i}",
            "brand": random.choice(["Levi's", "Wrangler", "Diesel", "Gap"]),
            "category": "bottoms",
            "subcategory": "jeans",
            "colors": [random.choice(["blue", "black", "grey"])],
            "sizes": ["28", "30", "32", "34", "36"],
            "price": random.uniform(40.0, 100.0),
            "images": [f"https://example.com/jeans{i}.jpg"],
            "style_tags": random.sample(["casual", "classic", "streetwear"], 2),
            "fit_type": random.choice(["skinny", "straight", "relaxed", "boot-cut"]),
            "occasion_tags": ["casual", "weekend"],
            "season_tags": ["all-season"],
            "trending_score": random.uniform(0.1, 1.0),
        }
        for i in range(1, 11)
    ]
    sample_items.extend([ClothingItem(**item) for item in bottoms])

    # Sample shoes
    shoes = [
        {
            "item_id": f"shoe_{i}",
            "name": f"Sneakers {i}",
            "brand": random.choice(["Nike", "Adidas", "Converse", "Vans"]),
            "category": "shoes",
            "subcategory": "sneakers",
            "colors": [random.choice(["white", "black", "multi"])],
            "sizes": ["7", "8", "9", "10", "11", "12"],
            "price": random.uniform(50.0, 150.0),
            "images": [f"https://example.com/sneakers{i}.jpg"],
            "style_tags": random.sample(["casual", "sporty", "streetwear"], 2),
            "occasion_tags": ["casual", "weekend"],
            "season_tags": ["all-season"],
            "trending_score": random.uniform(0.1, 1.0),
        }
        for i in range(1, 11)
    ]
    sample_items.extend([ClothingItem(**item) for item in shoes])

    # Create a sample user with style quiz results
    user_id = f"user_{uuid.uuid4().hex[:8]}"

    # Sample style quiz results
    quiz_data = {
        "overall_style": ["Minimalist & Clean", "Sporty & Casual"],
        "priorities": ["Comfort", "Versatility & Functionality"],
        "color_palette": ["Neutrals", "Monochrome or All-Black"],
        "pattern_preference": "Rarely",
        "preferred_patterns": ["Stripes"],
        "top_fit": ["Oversized & Relaxed"],
        "bottom_fit": ["Straight-Leg / Classic Fit", "Skinny / Slim-Fit Pants"],
        "layering_preference": "Sometimes",
        "occasion_preferences": ["Everyday Casual", "Streetwear & Trendy Looks"],
        "shoe_preference": ["Sneakers"],
        "accessory_preference": ["Watches & Bracelets"],
        "favorite_brands": ["Nike / Adidas", "Zara / H&M"],
        "shopping_frequency": "Monthly",
        "budget_range": "$50 - $100",
        "sustainability_priority": False,
        "secondhand_interest": False,
        "seasonal_preference": "Year-Round Basics",
        "trend_following": "Somewhat",
        "style_statement": "I want my wardrobe to be stylish but practical.",
    }

    style_quiz = parse_style_quiz_answers(quiz_data)

    # Sample closet items
    closet_items = [
        UserClosetItem(
            item_id=f"closet_{i}",
            category="tops" if i <= 3 else "bottoms" if i <= 6 else "shoes",
            subcategory="t-shirts" if i <= 3 else "jeans" if i <= 6 else "sneakers",
            color=random.choice(["black", "white", "blue", "grey"]),
            brand=random.choice(["Nike", "Adidas", "Zara", "H&M", "Levi's"]),
            tags=random.sample(["casual", "favorite", "weekend", "comfortable"], 2),
            favorite=random.choice([True, False]),
        )
        for i in range(1, 10)
    ]

    # Sample feedback
    feedback = UserFeedback(
        liked_items=set([f"top_{i}" for i in range(1, 4)]),
        disliked_items=set([f"bottom_{i}" for i in range(8, 11)]),
        saved_outfits=[[f"top_1", f"bottom_2", f"shoe_3"]],
    )

    user = UserProfile(
        user_id=user_id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        closet_items=closet_items,
        style_quiz=style_quiz,
        feedback=feedback,
    )

    return user, sample_items


def run_demo():
    """Run a demonstration of the recommendation system."""

    logger.info("Starting The Stylist recommendation system demo...")

    # Create sample data
    user, sample_items = create_sample_data()
    logger.info(f"Created sample user with ID: {user.user_id}")
    logger.info(f"Created {len(sample_items)} sample clothing items")

    # Step 1: Generate a style profile
    logger.info("\nStep 1: Generating style profile for user...")
    style_profile = StyleAnalysisService.generate_user_style_profile(user)

    logger.info("Top style preferences:")
    top_preferences = sorted(
        [(k, v) for k, v in style_profile.items() if v > 0.01],
        key=lambda x: x[1],
        reverse=True,
    )[:5]
    for key, value in top_preferences:
        logger.info(f"  {key}: {value:.2f}")

    # Step 2: Generate recommendations
    logger.info("\nStep 2: Generating recommendations...")
    recommendations = RecommendationService.generate_recommendations(
        user, sample_items, "casual"
    )

    logger.info(
        f"Generated {len(recommendations.recommended_items)} item recommendations"
    )
    logger.info(
        f"Generated {len(recommendations.recommended_outfits)} outfit recommendations"
    )

    # Display top 3 item recommendations
    logger.info("\nTop 3 recommended items:")
    for i, rec in enumerate(recommendations.recommended_items[:3]):
        item = next(
            (item for item in sample_items if item.item_id == rec.item_id), None
        )
        if item:
            logger.info(
                f"  {i+1}. {item.name} by {item.brand} (Score: {rec.score:.2f})"
            )
            logger.info(f"     Reasons: {', '.join(rec.match_reasons)}")
            logger.info(
                f"     Complementary items: {len(rec.complementary_items)} suggestions"
            )

    # Display outfit recommendation
    if recommendations.recommended_outfits:
        outfit = recommendations.recommended_outfits[0]
        logger.info(f"\nRecommended outfit for {outfit.occasion}:")
        logger.info(f"  Score: {outfit.score:.2f}")
        logger.info(f"  Reasons: {', '.join(outfit.match_reasons)}")

        logger.info("  Items in outfit:")
        for item_id in outfit.items:
            item = next(
                (item for item in sample_items if item.item_id == item_id), None
            )
            if item:
                logger.info(f"    - {item.name} by {item.brand} ({item.category})")

    # Step 3: Simulate user feedback
    logger.info("\nStep 3: Simulating user feedback...")

    # Like the first recommendation
    if recommendations.recommended_items:
        first_rec = recommendations.recommended_items[0]
        user.feedback.liked_items.add(first_rec.item_id)
        logger.info(f"User liked item: {first_rec.item_id}")

    # Dislike the second recommendation
    if len(recommendations.recommended_items) > 1:
        second_rec = recommendations.recommended_items[1]
        user.feedback.disliked_items.add(second_rec.item_id)
        logger.info(f"User disliked item: {second_rec.item_id}")

    # Save the recommended outfit
    if recommendations.recommended_outfits:
        outfit = recommendations.recommended_outfits[0]
        user.feedback.saved_outfits.append(outfit.items)
        logger.info(f"User saved outfit with {len(outfit.items)} items")

    # Step 4: Generate updated recommendations
    logger.info("\nStep 4: Generating updated recommendations after feedback...")
    updated_recommendations = RecommendationService.generate_recommendations(
        user, sample_items, "casual"
    )

    logger.info(
        f"Generated {len(updated_recommendations.recommended_items)} updated item recommendations"
    )

    # Compare recommendations before and after feedback
    original_rec_ids = [rec.item_id for rec in recommendations.recommended_items[:5]]
    updated_rec_ids = [
        rec.item_id for rec in updated_recommendations.recommended_items[:5]
    ]

    changes = sum(1 for item_id in updated_rec_ids if item_id not in original_rec_ids)
    logger.info(f"Recommendation changes after feedback: {changes}/5 items changed")

    logger.info("\nDemo completed successfully!")


if __name__ == "__main__":
    try:
        run_demo()
    except Exception as e:
        logger.error(f"Error in demo: {str(e)}")
