"""
API endpoints for The Stylist recommendation system.
"""

from stylist.api.recommendation_routes import (
    create_user,
    update_user,
    get_recommendations,
    add_item_feedback,
    save_outfit,
)

__all__ = [
    "create_user",
    "update_user",
    "get_recommendations",
    "add_item_feedback",
    "save_outfit",
]
