"""
Initialize a mock retailer for The Stylist application when no real retailer credentials are available.
"""

import os
import logging
from dotenv import load_dotenv
from api.retailer_routes import add_retailer

logger = logging.getLogger(__name__)

def initialize_mock_retailer():
    """
    Initialize a mock retailer for testing when USE_MOCK_RETAILER is set to true.
    """
    # Load environment variables
    load_dotenv()
    
    use_mock = os.getenv("USE_MOCK_RETAILER", "false").lower() == "true"
    
    if not use_mock:
        logger.info("USE_MOCK_RETAILER is not set to true, skipping mock retailer initialization")
        return
    
    logger.info("Initializing mock retailer for testing")
    
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
            "item_count": 100  # Number of mock items to generate
        }
        
        # Add the mock retailer
        result = add_retailer(mock_config)
        logger.info(f"Mock retailer initialized: {result}")
        
        return result
    except Exception as e:
        logger.error(f"Error initializing mock retailer: {str(e)}")
        return {"error": str(e)}