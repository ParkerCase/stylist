"""
Configuration settings for The Stylist backend application.
"""

import os
from enum import Enum
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=True)

# Style categories
class StyleCategory(Enum):
    CLASSIC = "Classic & Timeless"
    MINIMALIST = "Minimalist & Clean"
    TRENDY = "Trendy & Fashion-Forward"
    EDGY = "Edgy & Alternative"
    SPORTY = "Sporty & Casual"
    BOHEMIAN = "Bohemian & Free-Spirited"


# Color palettes
class ColorPalette(Enum):
    NEUTRALS = "Neutrals"
    EARTH_TONES = "Earthy Tones"
    PASTELS = "Pastels"
    BOLD = "Bold & Bright Colors"
    MONOCHROME = "Monochrome or All-Black"


# Fit preferences
class FitPreference(Enum):
    OVERSIZED = "Oversized & Relaxed"
    FITTED = "Slim & Fitted"
    CROPPED = "Cropped"
    STRUCTURED = "Boxy & Structured"


# Occasion types
class OccasionType(Enum):
    CASUAL = "Everyday Casual"
    BUSINESS = "Workwear & Business Casual"
    STREETWEAR = "Streetwear & Trendy Looks"
    DATE_NIGHT = "Date Night & Going Out"
    FORMAL = "Formal & Special Events"


# Recommendation scoring weights
WEIGHTS = {
    "style_match": 0.35,
    "color_match": 0.20,
    "fit_match": 0.15,
    "occasion_match": 0.20,
    "trending_bonus": 0.05,
    "retailer_availability": 0.05,
}

# API configuration
API_VERSION = "v1"
DEFAULT_PAGE_SIZE = 10
MAX_RECOMMENDATIONS = int(os.getenv("MAX_RECOMMENDATIONS", "20"))

# Environment specific settings
DEBUG = os.getenv("STYLIST_DEBUG", "False").lower() == "true"
API_KEY = os.getenv("STYLIST_API_KEY", "development_key")

# Server configuration
PORT = int(os.getenv("PORT", "8000"))

# Retailer Configuration
USE_MOCK_RETAILER = os.getenv("USE_MOCK_RETAILER", "True").lower() == "true"

# Shopify Integration Settings
SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY", "")
SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET", "")
SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL", "")

# WooCommerce Integration Settings
WOOCOMMERCE_CONSUMER_KEY = os.getenv("WOOCOMMERCE_CONSUMER_KEY", "")
WOOCOMMERCE_CONSUMER_SECRET = os.getenv("WOOCOMMERCE_CONSUMER_SECRET", "")
WOOCOMMERCE_STORE_URL = os.getenv("WOOCOMMERCE_STORE_URL", "")

# Cache Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))
RECOMMENDATION_CACHE_TTL = int(os.getenv("RECOMMENDATION_CACHE_TTL", "1800"))

# Auth Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev_jwt_secret_change_me_in_production")

# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")

# Background Removal
REMOVE_BG_API_KEY = os.getenv("REMOVE_BG_API_KEY", "")

# Anthropic API for Style Assistance
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
