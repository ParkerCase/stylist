"""
Configuration settings for The Stylist backend application.
"""

import os
from enum import Enum


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
MAX_RECOMMENDATIONS = 20

# Environment specific settings
DEBUG = os.getenv("STYLIST_DEBUG", "False").lower() == "true"
API_KEY = os.getenv("STYLIST_API_KEY", "development_key")
