"""
API routes for inventory management and product data.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple
import jsonschema
from jsonschema import validate, ValidationError

from stylist.integrations.retailer_api import RetailerAPIError
from stylist.models.clothing import ClothingItem
from stylist.api.retailer_routes import retailer_clients

logger = logging.getLogger(__name__)


def get_inventory(
    retailer_id: str, limit: int = 100, page: int = 1, category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get inventory from a specific retailer.

    Args:
        retailer_id: ID of the retailer
        limit: Maximum number of items to retrieve
        page: Page number for pagination
        category: Optional category filter

    Returns:
        Dictionary with inventory data

    Raises:
        ValueError: If retailer doesn't exist or other error
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    client = retailer_clients[retailer_id]

    try:
        # Get inventory
        inventory = client.get_inventory(limit=limit, page=page, category=category)

        # Convert to dictionary for API response
        items_list = []
        for item_id, item in inventory.items.items():
            items_list.append(item.to_dict())

        return {
            "retailer_id": inventory.retailer_id,
            "retailer_name": inventory.retailer_name,
            "items_count": len(inventory.items),
            "page": page,
            "limit": limit,
            "items": items_list,
            "last_updated": inventory.last_updated,
        }

    except RetailerAPIError as e:
        logger.error(f"Retailer API error: {str(e)}")
        raise ValueError(f"Retailer API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting inventory: {str(e)}")
        raise ValueError(f"Error getting inventory: {str(e)}")


async def get_all_inventory(
    category: Optional[str] = None, limit_per_retailer: int = 50
) -> Dict[str, Any]:
    """
    Get inventory from all retailers asynchronously.

    Args:
        category: Optional category filter
        limit_per_retailer: Maximum number of items to retrieve per retailer

    Returns:
        Dictionary with combined inventory data
    """
    combined_items = []
    errors = []

    # Create tasks for each retailer
    tasks = []

    for retailer_id, client in retailer_clients.items():
        tasks.append(
            client.get_inventory_async(
                limit=limit_per_retailer, page=1, category=category
            )
        )

    # Run tasks concurrently
    if tasks:
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for i, result in enumerate(results):
                retailer_id = list(retailer_clients.keys())[i]

                if isinstance(result, Exception):
                    logger.error(
                        f"Error getting inventory from retailer {retailer_id}: {str(result)}"
                    )
                    errors.append({"retailer_id": retailer_id, "error": str(result)})
                else:
                    # Add items to combined list
                    for item in result.items.values():
                        combined_items.append(item.to_dict())

        except Exception as e:
            logger.error(f"Error in async inventory retrieval: {str(e)}")
            errors.append({"error": f"General error: {str(e)}"})

    return {
        "items_count": len(combined_items),
        "items": combined_items,
        "errors": errors,
    }


def get_item(retailer_id: str, item_id: str) -> Dict[str, Any]:
    """
    Get details for a specific item.

    Args:
        retailer_id: ID of the retailer
        item_id: ID of the item

    Returns:
        Dictionary with item data

    Raises:
        ValueError: If retailer or item doesn't exist
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    client = retailer_clients[retailer_id]

    try:
        # Get item
        item = client.get_item(item_id)

        if not item:
            raise ValueError(f"Item with ID {item_id} not found")

        return item.to_dict()

    except RetailerAPIError as e:
        logger.error(f"Retailer API error: {str(e)}")
        raise ValueError(f"Retailer API error: {str(e)}")
    except ValueError:
        # Re-raise ValueError for item not found
        raise
    except Exception as e:
        logger.error(f"Error getting item: {str(e)}")
        raise ValueError(f"Error getting item: {str(e)}")


def check_availability(retailer_id: str, item_ids: List[str]) -> Dict[str, Any]:
    """
    Check availability for multiple items.

    Args:
        retailer_id: ID of the retailer
        item_ids: List of item IDs to check

    Returns:
        Dictionary with availability data

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    # Validate input
    if not item_ids:
        raise ValueError("No item IDs provided")

    if len(item_ids) > 100:
        raise ValueError("Maximum of 100 item IDs allowed")

    client = retailer_clients[retailer_id]

    try:
        # Check availability
        availability = client.check_availability(item_ids)

        return {"retailer_id": retailer_id, "availability": availability}

    except RetailerAPIError as e:
        logger.error(f"Retailer API error: {str(e)}")
        raise ValueError(f"Retailer API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}")
        raise ValueError(f"Error checking availability: {str(e)}")


def search_items(retailer_id: str, query: str, limit: int = 20) -> Dict[str, Any]:
    """
    Search for items in a specific retailer.

    Args:
        retailer_id: ID of the retailer
        query: Search query
        limit: Maximum number of items to retrieve

    Returns:
        Dictionary with search results

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    # Validate input
    if not query:
        raise ValueError("Search query is required")

    client = retailer_clients[retailer_id]

    try:
        # Search items
        items = client.search_items(query, limit=limit)

        # Convert to dictionary for API response
        items_list = [item.to_dict() for item in items]

        return {
            "retailer_id": retailer_id,
            "query": query,
            "items_count": len(items),
            "items": items_list,
        }

    except RetailerAPIError as e:
        logger.error(f"Retailer API error: {str(e)}")
        raise ValueError(f"Retailer API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error searching items: {str(e)}")
        raise ValueError(f"Error searching items: {str(e)}")


def search_all_retailers(query: str, limit_per_retailer: int = 10) -> Dict[str, Any]:
    """
    Search for items across all retailers.

    Args:
        query: Search query
        limit_per_retailer: Maximum number of items to retrieve per retailer

    Returns:
        Dictionary with combined search results
    """
    # Validate input
    if not query:
        raise ValueError("Search query is required")

    combined_items = []
    errors = []

    for retailer_id, client in retailer_clients.items():
        try:
            # Search items
            items = client.search_items(query, limit=limit_per_retailer)

            # Add items to combined list
            for item in items:
                combined_items.append(item.to_dict())

        except Exception as e:
            logger.error(f"Error searching items from retailer {retailer_id}: {str(e)}")
            errors.append({"retailer_id": retailer_id, "error": str(e)})

    return {
        "query": query,
        "items_count": len(combined_items),
        "items": combined_items,
        "errors": errors,
    }


# Example Flask routes implementation
"""
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/v1/inventory/<retailer_id>', methods=['GET'])
def api_get_inventory(retailer_id):
    try:
        limit = int(request.args.get('limit', 100))
        page = int(request.args.get('page', 1))
        category = request.args.get('category')
        
        inventory = get_inventory(retailer_id, limit=limit, page=page, category=category)
        return jsonify(inventory)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/inventory', methods=['GET'])
async def api_get_all_inventory():
    try:
        category = request.args.get('category')
        limit = int(request.args.get('limit', 50))
        
        inventory = await get_all_inventory(category=category, limit_per_retailer=limit)
        return jsonify(inventory)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/items/<retailer_id>/<item_id>', methods=['GET'])
def api_get_item(retailer_id, item_id):
    try:
        item = get_item(retailer_id, item_id)
        return jsonify(item)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/availability/<retailer_id>', methods=['POST'])
def api_check_availability(retailer_id):
    try:
        data = request.json
        if not data or 'item_ids' not in data:
            return jsonify({"error": "item_ids is required"}), 400
            
        item_ids = data['item_ids']
        availability = check_availability(retailer_id, item_ids)
        return jsonify(availability)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/search/<retailer_id>', methods=['GET'])
def api_search_items(retailer_id):
    try:
        query = request.args.get('q')
        if not query:
            return jsonify({"error": "Query parameter 'q' is required"}), 400
            
        limit = int(request.args.get('limit', 20))
        
        results = search_items(retailer_id, query, limit=limit)
        return jsonify(results)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/search', methods=['GET'])
def api_search_all_retailers():
    try:
        query = request.args.get('q')
        if not query:
            return jsonify({"error": "Query parameter 'q' is required"}), 400
            
        limit = int(request.args.get('limit', 10))
        
        results = search_all_retailers(query, limit_per_retailer=limit)
        return jsonify(results)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
"""
