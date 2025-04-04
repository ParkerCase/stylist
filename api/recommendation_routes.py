"""
API routes for the recommendation system.
"""

from typing import Dict, List, Any, Optional, Tuple, Union
import logging
import json
import uuid
from datetime import datetime
import jsonschema
from jsonschema import validate, ValidationError

from models.user import UserProfile, StyleQuizResults, UserClosetItem
from models.clothing import ClothingItem
from models.recommendation import RecommendationResponse
from services.recommendation_service import RecommendationService
from utils.recommendation_utils import (
    parse_style_quiz_answers,
    format_recommendation_response,
)

logger = logging.getLogger(__name__)

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


def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new user profile.

    Args:
        user_data: User profile data

    Returns:
        Created user profile

    Raises:
        ValueError: If input data validation fails
    """
    # Validate input data
    is_valid, error = validate_request_data(user_data, USER_SCHEMA)
    if not is_valid:
        raise ValueError(error)

    user_id = user_data.get("user_id", f"user_{uuid.uuid4().hex[:8]}")

    # Check if user already exists
    if user_id in mock_users:
        raise ValueError(f"User with ID {user_id} already exists")

    # Parse style quiz if available
    style_quiz = None
    if "style_quiz" in user_data:
        try:
            style_quiz = parse_style_quiz_answers(user_data["style_quiz"])
        except Exception as e:
            logger.error(f"Error parsing style quiz: {str(e)}")
            raise ValueError(f"Invalid style quiz data: {str(e)}")

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
                raise ValueError(f"Invalid closet item data: {str(e)}")

    # Store in mock database
    try:
        mock_users[user_id] = user
        logger.info(f"Created new user with ID: {user_id}")
    except Exception as e:
        logger.error(f"Error storing user: {str(e)}")
        raise ValueError(f"Failed to store user: {str(e)}")

    return user.to_dict()


def update_user(user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an existing user profile.

    Args:
        user_id: ID of the user to update
        update_data: Data to update

    Returns:
        Updated user profile

    Raises:
        ValueError: If user not found or input data validation fails
    """
    # Validate input data
    is_valid, error = validate_request_data(update_data, USER_SCHEMA)
    if not is_valid:
        raise ValueError(error)

    if user_id not in mock_users:
        logger.error(f"User with ID {user_id} not found")
        raise ValueError(f"User with ID {user_id} not found")

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
                raise ValueError(f"Invalid style quiz data: {str(e)}")

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
                    raise ValueError(f"Invalid closet item data: {str(e)}")

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
                raise ValueError(f"Invalid feedback data: {str(e)}")

        logger.info(f"Successfully updated user {user_id}")
        return user.to_dict()
    except ValueError:
        # Re-raise ValueError exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating user {user_id}: {str(e)}")
        raise ValueError(f"Error updating user: {str(e)}")


def get_recommendations(user_id: str, context: Optional[str] = None) -> Dict[str, Any]:
    """
    Get personalized recommendations for a user.

    Args:
        user_id: ID of the user to get recommendations for
        context: Optional context for recommendations

    Returns:
        Dictionary with recommendation data

    Raises:
        ValueError: If user not found or error generating recommendations
    """
    if not user_id:
        logger.error("User ID is required")
        raise ValueError("User ID is required")

    if user_id not in mock_users:
        logger.error(f"User with ID {user_id} not found")
        raise ValueError(f"User with ID {user_id} not found")

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
        raise ValueError(f"Failed to generate recommendations: {str(e)}")


def add_item_feedback(
    user_id: str, item_id: str, feedback_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Add user feedback for an item.

    Args:
        user_id: ID of the user
        item_id: ID of the item
        feedback_data: Feedback data with "liked" boolean

    Returns:
        Updated user feedback data

    Raises:
        ValueError: If user not found, item not found, or validation fails
    """
    # Validate input data
    is_valid, error = validate_request_data(feedback_data, FEEDBACK_SCHEMA)
    if not is_valid:
        raise ValueError(error)

    if not user_id:
        raise ValueError("User ID is required")

    if not item_id:
        raise ValueError("Item ID is required")

    if user_id not in mock_users:
        logger.error(f"User with ID {user_id} not found")
        raise ValueError(f"User with ID {user_id} not found")

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
        raise ValueError(f"Error processing feedback: {str(e)}")


def save_outfit(user_id: str, outfit_items: List[str]) -> Dict[str, Any]:
    """
    Save an outfit to the user's saved outfits.

    Args:
        user_id: ID of the user
        outfit_items: List of item IDs in the outfit

    Returns:
        Updated user feedback data
    """
    if user_id not in mock_users:
        raise ValueError(f"User with ID {user_id} not found")

    user = mock_users[user_id]

    if outfit_items not in user.feedback.saved_outfits:
        user.feedback.saved_outfits.append(outfit_items)

    user.feedback.last_interaction = datetime.now()

    return user.feedback.to_dict()


# The following would be real API routes in a Flask or FastAPI implementation
"""
Example API route implementations:

@app.route('/api/v1/users', methods=['POST'])
def api_create_user():
    data = request.json
    return jsonify(create_user(data))

@app.route('/api/v1/users/<user_id>', methods=['PUT'])
def api_update_user(user_id):
    data = request.json
    return jsonify(update_user(user_id, data))

@app.route('/api/v1/users/<user_id>/recommendations', methods=['GET'])
def api_get_recommendations(user_id):
    context = request.args.get('context')
    return jsonify(get_recommendations(user_id, context))

@app.route('/api/v1/users/<user_id>/feedback/items/<item_id>', methods=['POST'])
def api_add_item_feedback(user_id, item_id):
    data = request.json
    liked = data.get('liked', False)
    return jsonify(add_item_feedback(user_id, item_id, liked))

@app.route('/api/v1/users/<user_id>/outfits', methods=['POST'])
def api_save_outfit(user_id):
    data = request.json
    outfit_items = data.get('items', [])
    return jsonify(save_outfit(user_id, outfit_items))
"""
