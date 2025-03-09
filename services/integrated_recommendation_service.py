"""
Integrated recommendation service combining retailer API and core recommendation logic.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Set
from datetime import datetime

from stylist.models.user import UserProfile
from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.models.recommendation import (
    ItemRecommendation,
    OutfitRecommendation,
    RecommendationResponse,
)
from stylist.services.recommendation_service import RecommendationService
from stylist.services.style_analysis_service import StyleAnalysisService
from stylist.api.retailer_routes import retailer_clients
from stylist.integrations.retailer_api import RetailerAPIError

logger = logging.getLogger(__name__)


class IntegratedRecommendationService:
    """Service combining retailer API with the core recommendation service."""

    @staticmethod
    async def get_recommendations_with_availability(
        user: UserProfile,
        retailer_ids: Optional[List[str]] = None,
        category: Optional[str] = None,
        context: Optional[str] = None,
        limit_per_retailer: int = 50,
        check_availability: bool = True,
    ) -> RecommendationResponse:
        """
        Get personalized recommendations with real-time availability checking.

        Args:
            user: User profile
            retailer_ids: Optional list of retailer IDs to include (if None, use all)
            category: Optional category filter
            context: Optional context for recommendations
            limit_per_retailer: Maximum number of items to retrieve per retailer
            check_availability: Whether to check availability for recommended items

        Returns:
            RecommendationResponse object
        """
        # Get available retailers
        available_retailers = retailer_clients

        if retailer_ids:
            # Filter to specified retailers
            available_retailers = {
                retailer_id: client
                for retailer_id, client in retailer_clients.items()
                if retailer_id in retailer_ids
            }

        if not available_retailers:
            logger.warning("No retailers available for recommendations")
            return RecommendationResponse(user_id=user.user_id)

        # Get inventory from all retailers asynchronously
        all_items = []
        inventory_tasks = []

        for retailer_id, client in available_retailers.items():
            inventory_tasks.append(
                client.get_inventory_async(
                    limit=limit_per_retailer, page=1, category=category
                )
            )

        # Run tasks concurrently
        if inventory_tasks:
            try:
                results = await asyncio.gather(*inventory_tasks, return_exceptions=True)

                # Process results
                for result in results:
                    if isinstance(result, Exception):
                        logger.error(f"Error retrieving inventory: {str(result)}")
                        continue

                    # Add items to combined list
                    all_items.extend(result.items.values())

            except Exception as e:
                logger.error(f"Error in async inventory retrieval: {str(e)}")

        # Generate recommendations
        recommendations = RecommendationService.generate_recommendations(
            user, all_items, context
        )

        # If requested, check availability for recommended items
        if check_availability and recommendations.recommended_items:
            await IntegratedRecommendationService._check_and_update_availability(
                recommendations
            )

        return recommendations

    @staticmethod
    async def _check_and_update_availability(
        recommendations: RecommendationResponse,
    ) -> None:
        """
        Check availability for recommended items and update recommendations.

        Args:
            recommendations: RecommendationResponse object to update
        """
        # Group items by retailer
        retailer_items: Dict[str, List[str]] = {}

        # Process individual item recommendations
        for item_rec in recommendations.recommended_items:
            item_id = item_rec.item_id
            retailer_id = item_id.split("_")[0] if "_" in item_id else None

            if retailer_id and retailer_id in retailer_clients:
                if retailer_id not in retailer_items:
                    retailer_items[retailer_id] = []
                retailer_items[retailer_id].append(item_id)

        # Process outfit recommendations
        for outfit_rec in recommendations.recommended_outfits:
            for item_id in outfit_rec.items:
                retailer_id = item_id.split("_")[0] if "_" in item_id else None

                if retailer_id and retailer_id in retailer_clients:
                    if retailer_id not in retailer_items:
                        retailer_items[retailer_id] = []
                    retailer_items[retailer_id].append(item_id)

        # Check availability for each retailer
        availability_results: Dict[str, bool] = {}
        availability_tasks = []

        for retailer_id, item_ids in retailer_items.items():
            client = retailer_clients[retailer_id]

            # Create a task for checking availability
            async def check_retailer_availability(r_id, ids):
                try:
                    result = client.check_availability(ids)
                    return r_id, result
                except Exception as e:
                    logger.error(
                        f"Error checking availability for retailer {r_id}: {str(e)}"
                    )
                    return r_id, {item_id: False for item_id in ids}

            availability_tasks.append(
                check_retailer_availability(retailer_id, item_ids)
            )

        # Run tasks concurrently
        if availability_tasks:
            try:
                availability_results_list = await asyncio.gather(*availability_tasks)

                # Process results
                for retailer_id, result in availability_results_list:
                    availability_results.update(result)

            except Exception as e:
                logger.error(f"Error in async availability checking: {str(e)}")

        # Update recommendations based on availability
        if availability_results:
            # Filter out unavailable items
            available_items = []
            for item_rec in recommendations.recommended_items:
                if availability_results.get(item_rec.item_id, True):
                    available_items.append(item_rec)

            # Update recommendations
            recommendations.recommended_items = available_items

            # Filter outfits with unavailable items
            available_outfits = []
            for outfit_rec in recommendations.recommended_outfits:
                if all(
                    availability_results.get(item_id, True)
                    for item_id in outfit_rec.items
                ):
                    available_outfits.append(outfit_rec)

            # Update outfit recommendations
            recommendations.recommended_outfits = available_outfits

    @staticmethod
    def get_similar_items(
        item_id: str,
        user: Optional[UserProfile] = None,
        category: Optional[str] = None,
        limit: int = 10,
    ) -> List[ClothingItem]:
        """
        Get items similar to a specific item, optionally personalized for a user.

        Args:
            item_id: ID of the reference item
            user: Optional user profile for personalization
            category: Optional category filter
            limit: Maximum number of items to return

        Returns:
            List of similar ClothingItem objects

        Raises:
            ValueError: If item not found
        """
        # Extract retailer ID
        retailer_id = item_id.split("_")[0] if "_" in item_id else None

        if not retailer_id or retailer_id not in retailer_clients:
            raise ValueError(f"Invalid item ID or unknown retailer: {item_id}")

        # Get the reference item
        client = retailer_clients[retailer_id]
        reference_item = client.get_item(item_id)

        if not reference_item:
            raise ValueError(f"Item not found: {item_id}")

        # Get items from the same retailer
        try:
            inventory = client.get_inventory(limit=100, category=category)
            available_items = list(inventory.items.values())

            # Remove the reference item from results
            available_items = [
                item for item in available_items if item.item_id != item_id
            ]

            # Define similarity score function
            def similarity_score(item: ClothingItem) -> float:
                score = 0.0

                # Same category
                if item.category == reference_item.category:
                    score += 0.3

                # Same subcategory
                if (
                    reference_item.subcategory
                    and item.subcategory == reference_item.subcategory
                ):
                    score += 0.2

                # Similar style tags
                ref_styles = set(reference_item.style_tags)
                item_styles = set(item.style_tags)
                style_overlap = len(ref_styles.intersection(item_styles))
                if style_overlap > 0:
                    score += 0.2 * (style_overlap / max(len(ref_styles), 1))

                # Similar colors
                ref_colors = set(reference_item.colors)
                item_colors = set(item.colors)
                color_overlap = len(ref_colors.intersection(item_colors))
                if color_overlap > 0:
                    score += 0.15 * (color_overlap / max(len(ref_colors), 1))

                # Same brand
                if item.brand == reference_item.brand:
                    score += 0.1

                # Similar price range (within 30%)
                if reference_item.price > 0 and item.price > 0:
                    price_ratio = min(item.price, reference_item.price) / max(
                        item.price, reference_item.price
                    )
                    if price_ratio > 0.7:
                        score += 0.05 * price_ratio

                return score

            # If user provided, personalize further
            if user:
                user_style_profile = StyleAnalysisService.generate_user_style_profile(
                    user
                )

                # Get personalization score for each item
                personalized_items = []
                for item in available_items:
                    base_score = similarity_score(item)

                    # Calculate match score for user
                    user_score, _ = RecommendationService.calculate_item_match_score(
                        item, user_style_profile
                    )

                    # Combine scores (70% similarity, 30% personalization)
                    combined_score = (base_score * 0.7) + (user_score * 0.3)

                    personalized_items.append((item, combined_score))

                # Sort by combined score
                sorted_items = sorted(
                    personalized_items, key=lambda x: x[1], reverse=True
                )

                # Return top items
                return [item for item, _ in sorted_items[:limit]]

            else:
                # Without user, just use similarity score
                scored_items = [
                    (item, similarity_score(item)) for item in available_items
                ]
                sorted_items = sorted(scored_items, key=lambda x: x[1], reverse=True)

                # Return top items
                return [item for item, _ in sorted_items[:limit]]

        except Exception as e:
            logger.error(f"Error finding similar items: {str(e)}")
            raise ValueError(f"Error finding similar items: {str(e)}")

    @staticmethod
    async def complete_outfit(
        item_ids: List[str],
        user: UserProfile,
        occasion: Optional[str] = None,
        limit: int = 5,
    ) -> List[OutfitRecommendation]:
        """
        Complete an outfit based on provided items.

        Args:
            item_ids: List of item IDs to build outfit around
            user: User profile for personalization
            occasion: Optional occasion type
            limit: Maximum number of outfit suggestions

        Returns:
            List of OutfitRecommendation objects

        Raises:
            ValueError: If fewer than 1 item provided, or items not found
        """
        if not item_ids:
            raise ValueError("At least one item ID is required")

        # Get user style profile
        user_style_profile = StyleAnalysisService.generate_user_style_profile(user)

        # Extract retailer IDs
        retailer_ids = set()
        for item_id in item_ids:
            retailer_id = item_id.split("_")[0] if "_" in item_id else None
            if retailer_id and retailer_id in retailer_clients:
                retailer_ids.add(retailer_id)

        if not retailer_ids:
            raise ValueError("No valid retailer IDs found in item IDs")

        # Get base items
        base_items = []
        for item_id in item_ids:
            retailer_id = item_id.split("_")[0] if "_" in item_id else None

            if retailer_id in retailer_clients:
                try:
                    item = retailer_clients[retailer_id].get_item(item_id)
                    if item:
                        base_items.append(item)
                except Exception as e:
                    logger.warning(f"Error retrieving item {item_id}: {str(e)}")

        if not base_items:
            raise ValueError("None of the provided items could be found")

        # Determine needed categories
        existing_categories = {item.category for item in base_items}

        # Determine default occasion if not provided
        if not occasion:
            # Try to infer from provided items
            occasion_tags = []
            for item in base_items:
                occasion_tags.extend(item.occasion_tags)

            if occasion_tags:
                # Use most common occasion tag
                occasion_counts = {}
                for tag in occasion_tags:
                    occasion_counts[tag] = occasion_counts.get(tag, 0) + 1

                occasion = max(occasion_counts.items(), key=lambda x: x[1])[0]
            else:
                # Default to casual
                occasion = "casual"

        # Get needed categories based on occasion
        all_needed = {"tops", "bottoms", "shoes"}
        if occasion.lower() in ["formal", "business", "date_night"]:
            all_needed.add("accessories")

        # Allow dresses to replace tops+bottoms
        if "dresses" in existing_categories:
            all_needed.discard("tops")
            all_needed.discard("bottoms")

        # Determine what categories we still need
        needed_categories = all_needed - existing_categories

        if not needed_categories:
            # Already have a complete outfit
            outfit = OutfitRecommendation(
                outfit_id=f"outfit_{hash(''.join(sorted(item_ids)))[:8]}",
                items=item_ids,
                score=1.0,
                occasion=occasion,
                match_reasons=[f"Complete outfit for {occasion}"],
                created_at=datetime.now(),
            )

            return [outfit]

        # Get additional items from all retailers asynchronously
        all_items = base_items.copy()
        inventory_tasks = []

        for retailer_id in retailer_ids:
            client = retailer_clients[retailer_id]

            for category in needed_categories:
                inventory_tasks.append(
                    client.get_inventory_async(limit=20, page=1, category=category)
                )

        # Run tasks concurrently
        if inventory_tasks:
            try:
                results = await asyncio.gather(*inventory_tasks, return_exceptions=True)

                # Process results
                for result in results:
                    if isinstance(result, Exception):
                        logger.error(f"Error retrieving inventory: {str(result)}")
                        continue

                    # Add items to combined list (excluding base items)
                    base_item_ids = {item.item_id for item in base_items}
                    new_items = [
                        item
                        for item in result.items.values()
                        if item.item_id not in base_item_ids
                    ]
                    all_items.extend(new_items)

            except Exception as e:
                logger.error(f"Error in async inventory retrieval: {str(e)}")

        # Generate outfit suggestions
        outfit_suggestions = []

        # Try each base item as the style anchor
        for base_item in base_items:
            try:
                outfit = RecommendationService.generate_outfit_recommendation(
                    base_item, all_items, user_style_profile, occasion
                )

                if outfit:
                    # Ensure base items are included
                    missing_base_items = [
                        item_id for item_id in item_ids if item_id not in outfit.items
                    ]
                    if missing_base_items:
                        # Add missing base items to outfit
                        outfit.items.extend(missing_base_items)

                    outfit_suggestions.append(outfit)
            except Exception as e:
                logger.warning(
                    f"Error generating outfit for base item {base_item.item_id}: {str(e)}"
                )

        # Sort by score and return top suggestions
        outfit_suggestions.sort(key=lambda x: x.score, reverse=True)
        return outfit_suggestions[:limit]
