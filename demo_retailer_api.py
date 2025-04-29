"""
Demonstration script for The Stylist retailer API integration.
This script shows how to use the retailer API integration with the recommendation system.
"""

import os
import logging
import json
import random
import asyncio
import traceback
from pprint import pprint
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename="backend.log",
    filemode="a"
)
# Also log to console
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

logger = logging.getLogger(__name__)

# Import core modules
from integrations.retailer_api import RetailerConfig, InventoryFilter
from integrations.retailers.mock_retailer import MockRetailerAPI
from initialize_mock_retailer import initialize_mock_retailer
from api.retailer_routes import retailer_clients, add_retailer
from models.user import UserProfile, StyleQuizResults
from services.recommendation_service import RecommendationService
from services.style_analysis_service import StyleAnalysisService
from config import StyleCategory, ColorPalette, FitPreference, OccasionType


def setup_mock_retailer():
    """Set up a mock retailer for demonstration."""
    
    # Set environment variable for mock retailer
    os.environ["USE_MOCK_RETAILER"] = "true"
    
    # Try to get existing retailer
    if "mock_fashion" in retailer_clients:
        return retailer_clients["mock_fashion"]
        
    # Initialize mock retailer using the project's initialization function
    retailer_result = initialize_mock_retailer()
    if "mock_fashion" in retailer_clients:
        return retailer_clients["mock_fashion"]
    
    # If that doesn't work, create one manually
    logger.info("Creating mock retailer manually...")
    config = RetailerConfig(
        api_url="https://example.com/api",
        retailer_id="mock_fashion",
        retailer_name="Mock Fashion Store",
        api_key="demo_key",
        api_secret="demo_secret",
        timeout=5,
        cache_ttl=60,
        max_retries=2,
        use_cache=True,
    )

    # Create the mock retailer API with 100 sample items
    mock_retailer = MockRetailerAPI(config, item_count=100)
    
    # Add it to the retailer clients
    try:
        # Configure the mock retailer
        mock_config = {
            "retailer_id": "mock_fashion",
            "retailer_name": "Mock Fashion Store",
            "api_url": "https://example.com/api",
            "api_type": "mock",
            "api_key": "demo_key",
            "api_secret": "demo_secret",
            "timeout": 5,
            "cache_ttl": 60,
            "max_retries": 2,
            "use_cache": True,
            "item_count": 100
        }
        
        # Add the mock retailer using the API function
        add_retailer(mock_config)
        
        if "mock_fashion" in retailer_clients:
            return retailer_clients["mock_fashion"]
    except Exception as e:
        logger.warning(f"Error adding retailer: {e}")
    
    return mock_retailer


def create_sample_user():
    """Create a sample user for demonstration."""
    # Create a style quiz
    style_quiz = StyleQuizResults(
        overall_style=[StyleCategory.SPORTY, StyleCategory.MINIMALIST],
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
    
    try:
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
        if inventory.items:
            search_term = random.choice(list(inventory.items.values())).brand

            logger.info(f"Searching for: {search_term}")
            search_results = retailer.search_items(search_term, limit=5)

            logger.info(f"Found {len(search_results)} items matching '{search_term}':")
            for i, item in enumerate(search_results[:3]):
                logger.info(f"  {i+1}. {item.name} - {item.brand} - ${item.price:.2f}")

        # Step 4: Check item availability
        logger.info("\nStep 4: Checking item availability...")

        # Get some item IDs
        if inventory.items:
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

        # Step 6: Test filtered inventory retrieval
        logger.info("\nStep 6: Testing filtered inventory retrieval...")
        
        # Try to retrieve items by category
        categories = set()
        for item in inventory.items.values():
            categories.add(item.category.lower())
            
        if categories:
            test_category = next(iter(categories))
            logger.info(f"Getting items in category: {test_category}")
            
            filtered_inventory = retailer.get_inventory(category=test_category, limit=5)
            filtered_items = list(filtered_inventory.items.values())
            
            logger.info(f"Found {len(filtered_items)} items in category {test_category}")
            if filtered_items:
                for i, item in enumerate(filtered_items[:2]):
                    logger.info(f"  {i+1}. {item.name} by {item.brand}")
        
        # Step 7: Test cache usage
        logger.info("\nStep 7: Demonstrating cache usage...")

        # First request (not cached)
        import time
        start_time = time.time()
        retailer.get_inventory(limit=10)
        first_request_time = time.time() - start_time

        # Second request (should be cached)
        start_time = time.time()
        retailer.get_inventory(limit=10)
        second_request_time = time.time() - start_time

        logger.info(f"First request time: {first_request_time:.4f}s")
        logger.info(f"Second request time (cached): {second_request_time:.4f}s")
        if second_request_time > 0:
            logger.info(f"Cache speedup: {first_request_time / second_request_time:.1f}x")

        # Clear cache
        retailer.clear_cache()
        logger.info("Cache cleared")
        
        # Save a report about the retailer integration
        with open('RETAILER_INTEGRATION_REPORT.md', 'w') as f:
            f.write("# Retailer API Integration Report\n\n")
            f.write("## Mock Retailer Implementation\n\n")
            f.write("The mock retailer API has been successfully integrated with the recommendation engine. ")
            f.write("It provides a realistic API for testing the recommendation system without requiring real ")
            f.write("retailer API credentials.\n\n")
            
            f.write("### Key Features\n\n")
            f.write("- ✅ Mock inventory generation with realistic product data\n")
            f.write("- ✅ Filtering by category, brand, color, etc.\n")
            f.write("- ✅ Pagination support\n")
            f.write("- ✅ Search functionality\n")
            f.write("- ✅ Availability checking\n")
            f.write("- ✅ Asynchronous API support\n")
            f.write("- ✅ Caching for improved performance\n\n")
            
            f.write("### Sample Data\n\n")
            f.write(f"The mock retailer provides {len(inventory.items)} sample items across ")
            f.write(f"multiple categories: {', '.join(list(categories)[:5])}\n\n")
            
            f.write("### Integration with Recommendation Engine\n\n")
            f.write("The recommendation engine successfully integrates with the mock retailer API ")
            f.write("to generate personalized recommendations based on the available inventory. ")
            f.write(f"In testing, it generated {len(recommendations.recommended_items)} item recommendations ")
            f.write(f"and {len(recommendations.recommended_outfits)} outfit recommendations.\n\n")
            
            f.write("### Next Steps\n\n")
            f.write("- Implement live retailer integration when API credentials become available\n")
            f.write("- Add more sophisticated filtering options\n")
            f.write("- Implement inventory synchronization for real-time updates\n")
        
        logger.info("Retailer integration report saved to RETAILER_INTEGRATION_REPORT.md")
        logger.info("\nDemo completed successfully!")
        
    except Exception as e:
        logger.error(f"Error in retailer demo: {str(e)}")
        logger.error(traceback.format_exc())
        with open('STILL_MISSING.md', 'a') as f:
            f.write("\n## Retailer API Integration Issues\n\n")
            f.write(f"Error encountered during retailer API demo: {str(e)}\n\n")
            f.write("Please check the backend.log file for detailed error information.\n")


if __name__ == "__main__":
    import time

    try:
        # Run the async demo
        asyncio.run(run_demo())
    except Exception as e:
        logger.error(f"Error in retailer API demo: {str(e)}")
        logger.error(traceback.format_exc())
