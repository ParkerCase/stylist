"""
Demonstration script for The Stylist retailer API integration.
This script shows how to use the retailer API integration with the recommendation system.
"""

import logging
import json
import random
import asyncio
from pprint import pprint
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import core modules
from stylist.integrations.retailer_api import RetailerConfig
from stylist.integrations.retailers.mock_retailer import MockRetailerAPI
from stylist.models.user import UserProfile, StyleQuizResults
from stylist.services.recommendation_service import RecommendationService
from stylist.services.style_analysis_service import StyleAnalysisService
from stylist.config import StyleCategory, ColorPalette, FitPreference, OccasionType


def setup_mock_retailer():
    """Set up a mock retailer for demonstration."""
    # Create a retailer configuration
    config = RetailerConfig(
        api_url="https://example.com/api",
        retailer_id="mock_retailer",
        retailer_name="Mock Fashion Store",
        api_key="demo_key",
        api_secret="demo_secret",
        timeout=5,
        cache_ttl=60,
        max_retries=2,
        use_cache=True,
    )

    # Create the mock retailer API with 100 sample items
    return MockRetailerAPI(config, item_count=100)


def create_sample_user():
    """Create a sample user for demonstration."""
    # Create a style quiz
    style_quiz = StyleQuizResults(
        overall_style=[StyleCategory.CASUAL, StyleCategory.MINIMALIST],
        color_palette=[ColorPalette.NEUTRALS],
        top_fit=[FitPreference.OVERSIZED],
        occasion_preferences=[OccasionType.CASUAL],
    )

    # Create a user profile
    user = UserProfile(
        user_id="demo_user",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        style_quiz=style_quiz,
    )

    return user


async def run_demo():
    """Run a demonstration of the retailer API integration with the recommendation system."""

    logger.info("Starting The Stylist retailer API integration demo...")

    # Set up a mock retailer
    retailer = setup_mock_retailer()
    logger.info(f"Set up mock retailer: {retailer.config.retailer_name}")

    # Step 1: Get inventory data
    logger.info("\nStep 1: Getting inventory data...")

    inventory = retailer.get_inventory(limit=10)
    logger.info(f"Retrieved {len(inventory.items)} items from retailer.")

    # Display a few items
    logger.info("\nSample items:")
    sample_items = list(inventory.items.values())[:3]

    for i, item in enumerate(sample_items):
        logger.info(f"  {i+1}. {item.name} - {item.brand} - ${item.price:.2f}")
        logger.info(f"     Category: {item.category} / {item.subcategory}")
        logger.info(f"     Colors: {', '.join(item.colors)}")
        logger.info(f"     Style tags: {', '.join(item.style_tags)}")

    # Step 2: Create a user and generate recommendations
    logger.info("\nStep 2: Generating recommendations for a user...")

    user = create_sample_user()

    # Generate recommendations
    recommendations = RecommendationService.generate_recommendations(
        user, list(inventory.items.values()), "casual"
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
            (item for item in inventory.items.values() if item.item_id == rec.item_id),
            None,
        )
        if item:
            logger.info(
                f"  {i+1}. {item.name} by {item.brand} (Score: {rec.score:.2f})"
            )
            logger.info(f"     Reasons: {', '.join(rec.match_reasons)}")
            logger.info(
                f"     Complementary items: {len(rec.complementary_items)} suggestions"
            )

    # Step 3: Test the retailer search
    logger.info("\nStep 3: Testing retailer search...")

    # Pick a random search term from item names
    search_term = random.choice(list(inventory.items.values())).brand

    logger.info(f"Searching for: {search_term}")
    search_results = retailer.search_items(search_term, limit=5)

    logger.info(f"Found {len(search_results)} items matching '{search_term}':")
    for i, item in enumerate(search_results[:3]):
        logger.info(f"  {i+1}. {item.name} - {item.brand} - ${item.price:.2f}")

    # Step 4: Check item availability
    logger.info("\nStep 4: Checking item availability...")

    # Get some item IDs
    item_ids = [item.item_id for item in list(inventory.items.values())[:5]]

    availability = retailer.check_availability(item_ids)

    logger.info("Item availability:")
    for item_id, is_available in availability.items():
        item = inventory.items.get(item_id)
        if item:
            logger.info(
                f"  {item.name}: {'Available' if is_available else 'Not available'}"
            )

    # Step 5: Test async inventory retrieval
    logger.info("\nStep 5: Testing async inventory retrieval...")

    async_inventory = await retailer.get_inventory_async(limit=5)

    logger.info(f"Asynchronously retrieved {len(async_inventory.items)} items.")

    # Step 6: Show how to use cache
    logger.info("\nStep 6: Demonstrating cache usage...")

    # First request (not cached)
    start_time = time.time()
    retailer.get_inventory(limit=10)
    first_request_time = time.time() - start_time

    # Second request (should be cached)
    start_time = time.time()
    retailer.get_inventory(limit=10)
    second_request_time = time.time() - start_time

    logger.info(f"First request time: {first_request_time:.4f}s")
    logger.info(f"Second request time (cached): {second_request_time:.4f}s")
    logger.info(f"Cache speedup: {first_request_time / second_request_time:.1f}x")

    # Clear cache
    retailer.clear_cache()
    logger.info("Cache cleared")

    logger.info("\nDemo completed successfully!")


if __name__ == "__main__":
    import time

    try:
        # Run the async demo
        asyncio.run(run_demo())
    except Exception as e:
        logger.error(f"Error in demo: {str(e)}")
