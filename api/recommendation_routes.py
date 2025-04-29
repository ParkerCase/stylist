"""
API routes for the recommendation system.
"""

from typing import Dict, List, Any, Optional, Tuple, Union
import logging
import json
import uuid
import os
from datetime import datetime
import jsonschema
from jsonschema import validate, ValidationError
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, Response

from models.user import UserProfile, StyleQuizResults, UserClosetItem
from models.clothing import ClothingItem
from models.recommendation import RecommendationResponse
from services.recommendation_service import RecommendationService
from services.style_analysis_service import StyleAnalysisService
from utils.recommendation_utils import (
    parse_style_quiz_answers,
    format_recommendation_response,
)

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api", tags=["recommendations"])

# Initialize Style Analysis Service
style_analysis_service = StyleAnalysisService()

# Mock database for demo purposes
# In a real implementation, these would be connected to a database
mock_users = {}
mock_items = {}

# Define JSON schemas for validation
USER_SCHEMA = {
    "type": "object",
    "required": [],
    "properties": {
        "user_id": {"type": "string"},
        "style_quiz": {"type": "object"},
        "closet_items": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["category"],
                "properties": {
                    "item_id": {"type": "string"},
                    "category": {"type": "string", "minLength": 1},
                    "subcategory": {"type": ["string", "null"]},
                    "color": {"type": "string"},
                    "brand": {"type": ["string", "null"]},
                    "size": {"type": ["string", "null"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "favorite": {"type": "boolean"},
                },
            },
        },
    },
}

FEEDBACK_SCHEMA = {
    "type": "object",
    "properties": {"liked": {"type": "boolean"}},
    "required": ["liked"],
}

OUTFIT_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {"type": "array", "items": {"type": "string"}, "minItems": 2}
    },
    "required": ["items"],
}


def validate_request_data(
    data: Dict[str, Any], schema: Dict[str, Any]
) -> Tuple[bool, Optional[str]]:
    """
    Validate request data against a JSON schema.

    Args:
        data: The data to validate
        schema: The schema to validate against

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        validate(instance=data, schema=schema)
        return True, None
    except ValidationError as e:
        return False, f"Validation error: {e.message}"
    except Exception as e:
        return False, f"Unexpected error during validation: {str(e)}"


@router.post("/users", response_model=Dict[str, Any])
async def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new user profile.

    Args:
        user_data: User profile data

    Returns:
        Created user profile

    Raises:
        HTTPException: If input data validation fails
    """
    # Validate input data
    is_valid, error = validate_request_data(user_data, USER_SCHEMA)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    user_id = user_data.get("user_id", f"user_{uuid.uuid4().hex[:8]}")

    # Check if user already exists
    if user_id in mock_users:
        raise HTTPException(status_code=409, detail=f"User with ID {user_id} already exists")

    # Parse style quiz if available
    style_quiz = None
    if "style_quiz" in user_data:
        try:
            style_quiz = parse_style_quiz_answers(user_data["style_quiz"])
        except Exception as e:
            logger.error(f"Error parsing style quiz: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid style quiz data: {str(e)}")

    # Create user profile
    user = UserProfile(
        user_id=user_id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        style_quiz=style_quiz,
    )

    # Parse closet items if available
    if "closet_items" in user_data:
        for item_data in user_data["closet_items"]:
            try:
                item = UserClosetItem(
                    item_id=item_data.get("item_id", f"closet_{uuid.uuid4().hex[:8]}"),
                    category=item_data.get("category", ""),
                    subcategory=item_data.get("subcategory"),
                    color=item_data.get("color", ""),
                    brand=item_data.get("brand"),
                    size=item_data.get("size"),
                    tags=item_data.get("tags", []),
                    favorite=item_data.get("favorite", False),
                )
                user.closet_items.append(item)
            except Exception as e:
                logger.error(f"Error creating closet item: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid closet item data: {str(e)}")

    # Store in mock database
    try:
        mock_users[user_id] = user
        logger.info(f"Created new user with ID: {user_id}")
    except Exception as e:
        logger.error(f"Error storing user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to store user: {str(e)}")

    return user.to_dict()


@router.put("/users/{user_id}", response_model=Dict[str, Any])
async def update_user(user_id: str, update_data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Update an existing user profile.

    Args:
        user_id: ID of the user to update
        update_data: Data to update

    Returns:
        Updated user profile

    Raises:
        HTTPException: If user not found or input data validation fails
    """
    # Validate input data
    is_valid, error = validate_request_data(update_data, USER_SCHEMA)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    if user_id not in mock_users:
        logger.error(f"User with ID {user_id} not found")
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    try:
        user = mock_users[user_id]
        user.updated_at = datetime.now()

        # Update style quiz if provided
        if "style_quiz" in update_data:
            try:
                user.style_quiz = parse_style_quiz_answers(update_data["style_quiz"])
                logger.info(f"Updated style quiz for user {user_id}")
            except Exception as e:
                logger.error(f"Error updating style quiz: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid style quiz data: {str(e)}")

        # Update or add closet items if provided
        if "closet_items" in update_data:
            for item_data in update_data["closet_items"]:
                try:
                    item_id = item_data.get("item_id")

                    # Check if item already exists
                    existing_item = next(
                        (item for item in user.closet_items if item.item_id == item_id),
                        None,
                    )

                    if existing_item:
                        # Update existing item
                        for key, value in item_data.items():
                            if hasattr(existing_item, key):
                                setattr(existing_item, key, value)
                        logger.debug(
                            f"Updated closet item {item_id} for user {user_id}"
                        )
                    else:
                        # Add new item
                        item = UserClosetItem(
                            item_id=item_id or f"closet_{uuid.uuid4().hex[:8]}",
                            category=item_data.get("category", ""),
                            subcategory=item_data.get("subcategory"),
                            color=item_data.get("color", ""),
                            brand=item_data.get("brand"),
                            size=item_data.get("size"),
                            tags=item_data.get("tags", []),
                            favorite=item_data.get("favorite", False),
                        )
                        user.closet_items.append(item)
                        logger.debug(f"Added new closet item for user {user_id}")
                except Exception as e:
                    logger.error(f"Error updating closet item: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Invalid closet item data: {str(e)}")

        # Update feedback if provided
        if "feedback" in update_data:
            try:
                feedback_data = update_data["feedback"]

                if "liked_items" in feedback_data:
                    for item_id in feedback_data["liked_items"]:
                        user.feedback.liked_items.add(item_id)
                        user.feedback.disliked_items.discard(
                            item_id
                        )  # Remove from disliked if present
                        logger.debug(f"Added liked item {item_id} for user {user_id}")

                if "disliked_items" in feedback_data:
                    for item_id in feedback_data["disliked_items"]:
                        user.feedback.disliked_items.add(item_id)
                        user.feedback.liked_items.discard(
                            item_id
                        )  # Remove from liked if present
                        logger.debug(
                            f"Added disliked item {item_id} for user {user_id}"
                        )

                if "saved_outfits" in feedback_data:
                    for outfit in feedback_data["saved_outfits"]:
                        if outfit not in user.feedback.saved_outfits:
                            user.feedback.saved_outfits.append(outfit)
                            logger.debug(f"Saved new outfit for user {user_id}")

                user.feedback.last_interaction = datetime.now()
            except Exception as e:
                logger.error(f"Error updating feedback: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid feedback data: {str(e)}")

        logger.info(f"Successfully updated user {user_id}")
        return user.to_dict()
    except ValueError as ve:
        # Re-raise ValueError exceptions
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected error updating user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


@router.get("/recommendations", response_model=Dict[str, Any])
async def get_recommendations(
    user_id: str = Query(..., description="User ID"),
    context: Optional[str] = Query(None, description="Optional context for recommendations")
) -> Dict[str, Any]:
    """
    Get personalized recommendations for a user.

    Args:
        user_id: ID of the user to get recommendations for
        context: Optional context for recommendations

    Returns:
        Dictionary with recommendation data
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if user_id not in mock_users:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    # Validate context if provided
    valid_contexts = [
        "casual",
        "formal",
        "business",
        "date_night",
        "weekend",
        "vacation",
        "workout",
    ]
    if context and context.lower() not in valid_contexts:
        logger.warning(
            f"Unrecognized context: {context}, proceeding with general recommendations"
        )

    try:
        user = mock_users[user_id]

        # Check if user has any style data
        if (
            not user.style_quiz
            and not user.closet_items
            and not (user.feedback.liked_items or user.feedback.disliked_items)
        ):
            logger.warning(
                f"User {user_id} has no style data available for recommendations"
            )
            # Return empty recommendations with a message
            return {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "recommended_items": [],
                "recommended_outfits": [],
                "recommendation_context": context,
                "message": "Not enough style data available. Please complete the style quiz or add items to your closet.",
            }

        # Get available items (in a real implementation, this would come from retailer APIs)
        available_items = list(mock_items.values())

        if not available_items:
            logger.warning("No items available in inventory for recommendations")
            return {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "recommended_items": [],
                "recommended_outfits": [],
                "recommendation_context": context,
                "message": "No items currently available for recommendations.",
            }

        # Generate recommendations
        recommendations = RecommendationService.generate_recommendations(
            user, available_items, context
        )

        # Format and return recommendations
        result = format_recommendation_response(recommendations)

        # Add cache headers or other metadata in a real implementation
        logger.info(
            f"Generated {len(recommendations.recommended_items)} item recommendations for user {user_id}"
        )

        return result
    except Exception as e:
        logger.error(f"Error generating recommendations for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.post("/feedback/item", response_model=Dict[str, Any])
async def add_item_feedback(
    user_id: str = Query(..., description="User ID"),
    item_id: str = Query(..., description="Item ID"),
    feedback_data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Add user feedback for an item.

    Args:
        user_id: ID of the user
        item_id: ID of the item
        feedback_data: Feedback data with "liked" boolean

    Returns:
        Updated user feedback data
    """
    # Validate input data
    is_valid, error = validate_request_data(feedback_data, FEEDBACK_SCHEMA)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    if not item_id:
        raise HTTPException(status_code=400, detail="Item ID is required")

    if user_id not in mock_users:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    # In a real implementation, verify the item exists
    item_exists = item_id in mock_items or any(
        item_id == item.item_id
        for user in mock_users.values()
        for item in user.closet_items
    )
    if not item_exists:
        logger.warning(f"Item with ID {item_id} not found in the catalog")
        # We'll still process the feedback even if the item isn't in our catalog

    try:
        user = mock_users[user_id]
        liked = feedback_data.get("liked", False)

        if liked:
            user.feedback.liked_items.add(item_id)
            user.feedback.disliked_items.discard(
                item_id
            )  # Remove from disliked if present
            logger.info(f"User {user_id} liked item {item_id}")
        else:
            user.feedback.disliked_items.add(item_id)
            user.feedback.liked_items.discard(item_id)  # Remove from liked if present
            logger.info(f"User {user_id} disliked item {item_id}")

        user.feedback.last_interaction = datetime.now()

        # In a real implementation, we might want to re-train or update our recommendation model
        # based on this new feedback

        return user.feedback.to_dict()
    except Exception as e:
        logger.error(
            f"Error processing feedback for user {user_id}, item {item_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Error processing feedback: {str(e)}")


@router.post("/outfits", response_model=Dict[str, Any])
async def save_outfit(
    user_id: str = Query(..., description="User ID"),
    outfit_data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Save an outfit to the user's saved outfits.

    Args:
        user_id: ID of the user
        outfit_data: Data with "items" list of item IDs in the outfit

    Returns:
        Updated user feedback data
    """
    # Validate input data
    is_valid, error = validate_request_data(outfit_data, OUTFIT_SCHEMA)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    if user_id not in mock_users:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    try:
        user = mock_users[user_id]
        outfit_items = outfit_data.get("items", [])

        if outfit_items not in user.feedback.saved_outfits:
            user.feedback.saved_outfits.append(outfit_items)

        user.feedback.last_interaction = datetime.now()

        return user.feedback.to_dict()
    except Exception as e:
        logger.error(f"Error saving outfit for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving outfit: {str(e)}")


@router.post("/users/{user_id}/style-quiz", response_model=Dict[str, Any])
async def submit_style_quiz(
    user_id: str, quiz_data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Submit style quiz answers for a user.
    
    Args:
        user_id: ID of the user
        quiz_data: Dictionary with quiz answers in the format {"answers": [...]}
        
    Returns:
        Dictionary with processed style profile
    """
    try:
        # Validate request
        if not user_id:
            raise HTTPException(
                status_code=400, detail="User ID is required"
            )
            
        if "answers" not in quiz_data:
            raise HTTPException(
                status_code=400, detail="Quiz answers are required"
            )
            
        # Check if user exists
        if user_id not in mock_users:
            # Create a new user if they don't exist
            logger.info(f"Creating new user with ID {user_id} for style quiz")
            mock_users[user_id] = UserProfile(
                user_id=user_id,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
        user = mock_users[user_id]
        
        # Process quiz answers
        answers = quiz_data["answers"]
        
        # Convert the raw quiz answers to a format our system can process
        formatted_quiz_data = {}
        
        # Process each answer
        for answer in answers:
            question_id = answer.get("questionId", "")
            answer_id = answer.get("answerId", "")
            answer_ids = answer.get("answerIds", [])
            answer_value = answer.get("answerValue", None)
            
            # Map question IDs to our expected format
            # For example, q1 (overall style) maps to overall_style
            if question_id == "q1":  # Overall style
                if answer_id:
                    formatted_quiz_data["overall_style"] = [answer_id]
            elif question_id == "q2":  # Color palette
                if answer_id:
                    formatted_quiz_data["color_palette"] = [answer_id]
            elif question_id == "q3":  # Occasion preferences
                if answer_ids:
                    formatted_quiz_data["occasion_preferences"] = answer_ids
            elif question_id == "q4":  # Pattern preferences
                if answer_ids:
                    formatted_quiz_data["preferred_patterns"] = answer_ids
            elif question_id == "q5":  # Top fit
                if answer_id:
                    formatted_quiz_data["top_fit"] = [answer_id]
            elif question_id == "q6":  # Bottom fit
                if answer_id:
                    formatted_quiz_data["bottom_fit"] = [answer_id]
            elif question_id == "q7":  # Top size
                if answer_id:
                    formatted_quiz_data["top_size"] = answer_id
            elif question_id == "q8":  # Bottom size
                if answer_id:
                    formatted_quiz_data["bottom_size"] = answer_id
            elif question_id == "q9":  # Budget range
                if answer_id:
                    formatted_quiz_data["budget_range"] = answer_id
            elif question_id == "q10":  # Brand preferences
                if answer_ids:
                    formatted_quiz_data["favorite_brands"] = answer_ids
            elif question_id == "q11":  # Celebrity style
                if answer_id:
                    formatted_quiz_data["style_inspiration"] = answer_id
            elif question_id == "q12":  # Shoe preferences
                if answer_ids:
                    formatted_quiz_data["shoe_preference"] = answer_ids
            elif question_id == "q13":  # Accessory preferences
                if answer_ids:
                    formatted_quiz_data["accessory_preference"] = answer_ids
            elif question_id == "q14":  # Seasonal preference
                if answer_id:
                    formatted_quiz_data["seasonal_preference"] = answer_id
            elif question_id == "q15":  # Layering preference
                if answer_id:
                    formatted_quiz_data["layering_preference"] = answer_id
            elif question_id == "q16":  # Shopping frequency
                if answer_id:
                    formatted_quiz_data["shopping_frequency"] = answer_id
            elif question_id == "q17":  # Trend following
                if answer_id:
                    formatted_quiz_data["trend_following"] = answer_id
            elif question_id == "q18":  # Comfort vs style priority
                if answer_value is not None:
                    # Convert slider value to preference
                    if answer_value < 25:
                        formatted_quiz_data["comfort_priority"] = "high"
                    elif answer_value < 75:
                        formatted_quiz_data["comfort_priority"] = "balanced"
                    else:
                        formatted_quiz_data["comfort_priority"] = "low"
            elif question_id == "q19":  # Sustainability
                if answer_id:
                    formatted_quiz_data["sustainability_priority"] = answer_id in ["very", "somewhat"]
            elif question_id == "q20":  # Secondhand
                if answer_id:
                    formatted_quiz_data["secondhand_interest"] = answer_id in ["frequently", "sometimes"]
            elif question_id == "q21":  # Work environment
                if answer_id:
                    formatted_quiz_data["work_environment"] = answer_id
            elif question_id == "q22":  # Active lifestyle
                if answer_id:
                    formatted_quiz_data["activity_level"] = answer_id
            elif question_id == "q23":  # Fabric preferences
                if answer_ids:
                    formatted_quiz_data["fabric_preferences"] = answer_ids
            elif question_id == "q24":  # Special requirements
                if answer_ids:
                    formatted_quiz_data["special_requirements"] = answer_ids
            elif question_id == "q25":  # Style goal
                if answer_id:
                    formatted_quiz_data["style_goal"] = answer_id
        
        # Parse the style quiz data
        try:
            user.style_quiz = parse_style_quiz_answers(formatted_quiz_data)
            logger.info(f"Successfully processed style quiz for user {user_id}")
        except Exception as e:
            logger.error(f"Error parsing style quiz data: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to process style quiz: {str(e)}"
            )
        
        # Update user profile with timestamp
        user.updated_at = datetime.now()
        
        # Generate style profile based on quiz results
        style_profile = style_analysis_service.analyze_style_quiz(user.style_quiz)
        logger.info(f"Generated style profile for user {user_id} with {len(style_profile)} attributes")
        
        # Return the processed style quiz and profile
        return {
            "user_id": user_id,
            "quiz_processed": True,
            "timestamp": datetime.now().isoformat(),
            "style_profile": style_profile,
            "message": "Style quiz processed successfully"
        }
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error processing style quiz for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process style quiz: {str(e)}"
        )

@router.post("/chat", response_model=Dict[str, str])
async def chat_with_assistant(request_data: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    """
    Process a chat message with the AI style assistant.
    
    This endpoint handles:
    1. User messages sent to the Claude AI
    2. Integration with user style preferences
    3. Fallback responses if Claude API is unavailable
    """
    try:
        # Extract request details
        user_id = request_data.get("userId")
        message = request_data.get("message")
        context = request_data.get("context", [])
        
        # Validate request
        if not user_id or not message:
            raise HTTPException(
                status_code=400, detail="userId and message are required fields"
            )
        
        # Check if user exists 
        if user_id not in mock_users:
            # For chat, we can be lenient and create a user if they don't exist
            logger.info(f"Creating new user with ID {user_id} for chat")
            mock_users[user_id] = UserProfile(
                user_id=user_id,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
        user = mock_users[user_id]
        
        # Check if Claude API is available
        anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
        
        if not anthropic_api_key:
            # Use fallback response if Claude API is not available
            response = style_analysis_service.answer_style_question(message, user)
            return {"response": response}
        
        # Use Claude API to generate response
        # Get user style profile for context
        user_preferences = ""
        if user.stylePreferences:
            prefs = user.stylePreferences
            if prefs.preferredStyles:
                user_preferences += f"- Preferred styles: {', '.join(prefs.preferredStyles)}\n"
            if prefs.preferredColors:
                user_preferences += f"- Preferred colors: {', '.join(prefs.preferredColors)}\n"
            if prefs.preferredOccasions:
                user_preferences += f"- Preferred occasions: {', '.join(prefs.preferredOccasions)}\n"
            if prefs.dislikedStyles:
                user_preferences += f"- Disliked styles: {', '.join(prefs.dislikedStyles)}\n"
        
        # Previous message context
        context_str = "\n".join(context) if context else ""
        
        # Generate AI response through style analysis service
        ai_response = style_analysis_service.answer_style_question(
            message, 
            user,
            context=context_str,
            user_preferences=user_preferences
        )
        
        return {"response": ai_response}
        
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}")
        # Provide a generic response in case of error
        return {
            "response": "I'm sorry, I had trouble processing your request. Could you try again?"
        }