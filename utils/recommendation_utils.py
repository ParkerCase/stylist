"""
Utility functions for the recommendation system.
"""

import re
import json
from typing import Dict, List, Any, Optional
import logging

from models.user import UserProfile, StyleQuizResults
from models.recommendation import RecommendationResponse

logger = logging.getLogger(__name__)


def parse_style_quiz_answers(quiz_data: Dict[str, Any]) -> StyleQuizResults:
    """
    Parse style quiz answers from raw input data.

    Args:
        quiz_data: Dictionary containing quiz answers

    Returns:
        StyleQuizResults object with parsed quiz data
    """
    from config import StyleCategory, ColorPalette, FitPreference, OccasionType

    quiz_results = StyleQuizResults()

    # Process style preferences
    if "overall_style" in quiz_data:
        styles = quiz_data["overall_style"]
        if isinstance(styles, str):
            styles = [styles]

        for style in styles:
            try:
                quiz_results.overall_style.append(
                    next(s for s in StyleCategory if s.value == style)
                )
            except StopIteration:
                logger.warning(f"Unknown style category: {style}")

    # Process priorities
    if "priorities" in quiz_data:
        priorities = quiz_data["priorities"]
        if isinstance(priorities, str):
            priorities = [priorities]
        quiz_results.priorities = priorities

    # Process color palette
    if "color_palette" in quiz_data:
        colors = quiz_data["color_palette"]
        if isinstance(colors, str):
            colors = [colors]

        for color in colors:
            try:
                quiz_results.color_palette.append(
                    next(c for c in ColorPalette if c.value == color)
                )
            except StopIteration:
                logger.warning(f"Unknown color palette: {color}")

    # Process pattern preferences
    if "pattern_preference" in quiz_data:
        quiz_results.pattern_preference = quiz_data["pattern_preference"]

    if "preferred_patterns" in quiz_data:
        patterns = quiz_data["preferred_patterns"]
        if isinstance(patterns, str):
            patterns = [patterns]
        quiz_results.preferred_patterns = patterns

    # Process fit preferences
    if "top_fit" in quiz_data:
        fits = quiz_data["top_fit"]
        if isinstance(fits, str):
            fits = [fits]

        for fit in fits:
            try:
                quiz_results.top_fit.append(
                    next(f for f in FitPreference if f.value == fit)
                )
            except StopIteration:
                logger.warning(f"Unknown fit preference: {fit}")

    if "bottom_fit" in quiz_data:
        fits = quiz_data["bottom_fit"]
        if isinstance(fits, str):
            fits = [fits]
        quiz_results.bottom_fit = fits

    # Process layering preference
    if "layering_preference" in quiz_data:
        quiz_results.layering_preference = quiz_data["layering_preference"]

    # Process occasion preferences
    if "occasion_preferences" in quiz_data:
        occasions = quiz_data["occasion_preferences"]
        if isinstance(occasions, str):
            occasions = [occasions]

        for occasion in occasions:
            try:
                quiz_results.occasion_preferences.append(
                    next(o for o in OccasionType if o.value == occasion)
                )
            except StopIteration:
                logger.warning(f"Unknown occasion type: {occasion}")

    # Process shoe and accessory preferences
    if "shoe_preference" in quiz_data:
        shoes = quiz_data["shoe_preference"]
        if isinstance(shoes, str):
            shoes = [shoes]
        quiz_results.shoe_preference = shoes

    if "accessory_preference" in quiz_data:
        accessories = quiz_data["accessory_preference"]
        if isinstance(accessories, str):
            accessories = [accessories]
        quiz_results.accessory_preference = accessories

    # Process brand preferences
    if "favorite_brands" in quiz_data:
        brands = quiz_data["favorite_brands"]
        if isinstance(brands, str):
            brands = [brands]
        quiz_results.favorite_brands = brands

    # Process shopping habits
    if "shopping_frequency" in quiz_data:
        quiz_results.shopping_frequency = quiz_data["shopping_frequency"]

    if "budget_range" in quiz_data:
        quiz_results.budget_range = quiz_data["budget_range"]

    # Process sustainability preferences
    if "sustainability_priority" in quiz_data:
        quiz_results.sustainability_priority = bool(
            quiz_data["sustainability_priority"]
        )

    if "secondhand_interest" in quiz_data:
        quiz_results.secondhand_interest = bool(quiz_data["secondhand_interest"])

    # Process seasonal preferences
    if "seasonal_preference" in quiz_data:
        quiz_results.seasonal_preference = quiz_data["seasonal_preference"]

    if "trend_following" in quiz_data:
        quiz_results.trend_following = quiz_data["trend_following"]

    # Process final statement
    if "style_statement" in quiz_data:
        quiz_results.style_statement = quiz_data["style_statement"]

    return quiz_results


def format_recommendation_response(
    response: RecommendationResponse, include_items: bool = True
) -> Dict[str, Any]:
    """
    Format recommendation response for API output.

    Args:
        response: The recommendation response object
        include_items: Whether to include detailed item information

    Returns:
        Dictionary with formatted response data
    """
    result = response.to_dict()

    # Additional formatting logic can be added here
    
    # Format for frontend compatibility - rename fields
    if "recommended_items" in result:
        result["items"] = result.pop("recommended_items")
    
    if "recommended_outfits" in result:
        result["outfits"] = result.pop("recommended_outfits")
    
    if "recommendation_context" in result:
        result["context"] = result.pop("recommendation_context")
        
    # Reformat each item to match frontend expectations
    if "items" in result and result["items"]:
        for item in result["items"]:
            if "item_id" in item:
                item["id"] = item.pop("item_id")
            
            if "score" in item:
                item["matchScore"] = item.pop("score")
                
            if "match_reasons" in item:
                item["matchReasons"] = item.pop("match_reasons")
                
            # Extract retailer ID from id
            if "id" in item and "_" in item["id"]:
                retailer_id = item["id"].split("_")[0] 
                item["retailerId"] = retailer_id
                
            # Ensure required frontend fields exist
            if "imageUrls" not in item:
                item["imageUrls"] = item.get("image_urls", [])
                
            # Default stock status
            if "inStock" not in item:
                item["inStock"] = item.get("in_stock", True)
    
    # Reformat each outfit to match frontend expectations
    if "outfits" in result and result["outfits"]:
        for outfit in result["outfits"]:
            if "outfit_id" in outfit:
                outfit["id"] = outfit.pop("outfit_id")
                
            if "score" in outfit:
                outfit["matchScore"] = outfit.pop("score")
                
            if "match_reasons" in outfit:
                outfit["matchReasons"] = outfit.pop("match_reasons")
                
            # Add a name if not present
            if "name" not in outfit and "occasion" in outfit:
                outfit["name"] = f"Outfit for {outfit['occasion']}"
            elif "name" not in outfit and "id" in outfit:
                outfit["name"] = f"Outfit {outfit['id']}"

    return result


def format_frontend_recommendation_response(
    response: RecommendationResponse, 
    item_details: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Format recommendation response specifically for frontend API consumption.
    This provides a more thorough transformation than the basic format_recommendation_response.

    Args:
        response: The recommendation response object
        item_details: Optional dictionary mapping item_ids to detailed item information

    Returns:
        Dictionary formatted for frontend consumption
    """
    # Start with the basic transformation
    result = format_recommendation_response(response)
    
    # If we have detailed item information, enhance the response
    if item_details:
        # Enhance items with detailed information
        if "items" in result and result["items"]:
            for i, item in enumerate(result["items"]):
                item_id = item.get("id")
                if item_id and item_id in item_details:
                    # Update with detailed information while preserving match data
                    match_score = item.get("matchScore", 0)
                    match_reasons = item.get("matchReasons", [])
                    
                    # Replace with detailed item but keep recommendation data
                    result["items"][i] = {**item_details[item_id], 
                                         "matchScore": match_score,
                                         "matchReasons": match_reasons}
        
        # Enhance outfits with detailed item information
        if "outfits" in result and result["outfits"]:
            for outfit in result["outfits"]:
                if "items" in outfit and isinstance(outfit["items"], list):
                    # Convert from just IDs to detailed items
                    detailed_items = []
                    for item_id in outfit["items"]:
                        if item_id in item_details:
                            detailed_items.append(item_details[item_id])
                        else:
                            # Fallback for items without details
                            detailed_items.append({
                                "id": item_id,
                                "name": f"Item {item_id}",
                                "imageUrls": []
                            })
                    
                    # Replace IDs with detailed items
                    outfit["items"] = detailed_items
    
    return result


def generate_explanation(item_recommendation: Dict[str, Any]) -> str:
    """
    Generate a natural language explanation for an item recommendation.

    Args:
        item_recommendation: Dictionary with item recommendation data

    Returns:
        String with natural language explanation
    """
    if (
        "match_reasons" not in item_recommendation
        or not item_recommendation["match_reasons"]
    ):
        return "This item matches your style preferences."

    reasons = item_recommendation["match_reasons"]

    if len(reasons) == 1:
        return reasons[0]

    if len(reasons) == 2:
        return f"{reasons[0]} and {reasons[1]}."

    # More than 2 reasons
    formatted_reasons = ", ".join(reasons[:-1]) + f", and {reasons[-1]}."
    return formatted_reasons


def extract_style_keywords(text: str) -> List[str]:
    """
    Extract style-related keywords from natural language text.
    Useful for processing user free-text inputs.

    Args:
        text: User input text

    Returns:
        List of extracted style keywords
    """
    # Define patterns for common style keywords
    patterns = [
        r"(casual|formal|business|streetwear|sporty|elegant|bohemian|vintage|retro|minimalist|classic)",
        r"(black|white|red|blue|green|yellow|purple|pink|gray|brown|navy|beige|tan)",
        r"(t-?shirt|jeans|dress|skirt|pants|shorts|jacket|coat|sweater|blazer|hoodie|shirt)",
        r"(sneakers|boots|heels|sandals|flats|loafers)",
        r"(summer|winter|fall|spring|autumn)",
        r"(work|date|casual|party|wedding|office|gym|workout)",
    ]

    keywords = []
    for pattern in patterns:
        matches = re.findall(pattern, text.lower())
        keywords.extend(matches)

    return list(set(keywords))  # Remove duplicates
