"""
API routes for retailer configuration and management.
"""

import logging
from typing import Dict, List, Any, Optional
import json
import jsonschema
from jsonschema import validate, ValidationError

from integrations.retailer_api import RetailerConfig, RetailerAPI
from integrations.retailers.mock_retailer import MockRetailerAPI
from integrations.retailers.shopify import ShopifyAPI
from integrations.retailers.woocommerce import WooCommerceAPI
from integrations.retailers.generic_rest import GenericRestAPI

logger = logging.getLogger(__name__)

# Schema for retailer configuration validation
RETAILER_CONFIG_SCHEMA = {
    "type": "object",
    "required": ["retailer_id", "retailer_name", "api_url", "api_type"],
    "properties": {
        "retailer_id": {"type": "string", "minLength": 1},
        "retailer_name": {"type": "string", "minLength": 1},
        "api_url": {"type": "string", "format": "uri"},
        "api_type": {
            "type": "string",
            "enum": ["shopify", "woocommerce", "generic_rest", "mock"],
        },
        "api_key": {"type": ["string", "null"]},
        "api_secret": {"type": ["string", "null"]},
        "api_version": {"type": ["string", "null"]},
        "timeout": {"type": "integer", "minimum": 1},
        "cache_ttl": {"type": "integer", "minimum": 0},
        "max_retries": {"type": "integer", "minimum": 0},
        "use_cache": {"type": "boolean"},
        "headers": {"type": ["object", "null"]},
        "params": {"type": ["object", "null"]},
        # For generic REST API
        "field_mapping": {"type": ["object", "null"]},
        "inventory_endpoint": {"type": ["string", "null"]},
        "item_endpoint_template": {"type": ["string", "null"]},
        "search_endpoint_template": {"type": ["string", "null"]},
        "availability_endpoint": {"type": ["string", "null"]},
        "inventory_response_path": {"type": ["string", "null"]},
    },
}

# In-memory storage for retailer configurations and API clients
retailer_configs = {}
retailer_clients = {}


def create_retailer_api(config_data: Dict[str, Any]) -> RetailerAPI:
    """
    Create a RetailerAPI instance based on configuration.

    Args:
        config_data: Retailer configuration data

    Returns:
        RetailerAPI instance

    Raises:
        ValueError: If the API type is unsupported or configuration is invalid
    """
    # Validate configuration
    try:
        validate(instance=config_data, schema=RETAILER_CONFIG_SCHEMA)
    except ValidationError as e:
        raise ValueError(f"Invalid retailer configuration: {e.message}")

    # Create RetailerConfig
    config = RetailerConfig(
        api_url=config_data["api_url"],
        retailer_id=config_data["retailer_id"],
        retailer_name=config_data["retailer_name"],
        api_key=config_data.get("api_key"),
        api_secret=config_data.get("api_secret"),
        api_version=config_data.get("api_version"),
        timeout=config_data.get("timeout", 30),
        cache_ttl=config_data.get("cache_ttl", 3600),
        max_retries=config_data.get("max_retries", 3),
        use_cache=config_data.get("use_cache", True),
        headers=config_data.get("headers"),
        params=config_data.get("params"),
    )

    # Create API client based on type
    api_type = config_data["api_type"]

    if api_type == "shopify":
        return ShopifyAPI(config)

    elif api_type == "woocommerce":
        return WooCommerceAPI(config)

    elif api_type == "generic_rest":
        # Additional required fields for generic REST API
        if not all(
            k in config_data
            for k in [
                "field_mapping",
                "inventory_endpoint",
                "item_endpoint_template",
                "search_endpoint_template",
            ]
        ):
            raise ValueError(
                "Generic REST API requires field_mapping, inventory_endpoint, item_endpoint_template, and search_endpoint_template"
            )

        return GenericRestAPI(
            config=config,
            field_mapping=config_data["field_mapping"],
            inventory_endpoint=config_data["inventory_endpoint"],
            item_endpoint_template=config_data["item_endpoint_template"],
            search_endpoint_template=config_data["search_endpoint_template"],
            availability_endpoint=config_data.get("availability_endpoint"),
            inventory_response_path=config_data.get(
                "inventory_response_path", "products"
            ),
        )

    elif api_type == "mock":
        # For testing - create a mock API with sample data
        item_count = config_data.get("item_count", 100)
        return MockRetailerAPI(config, item_count=item_count)

    else:
        raise ValueError(f"Unsupported API type: {api_type}")


def add_retailer(config_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add a new retailer configuration.

    Args:
        config_data: Retailer configuration data

    Returns:
        Dictionary with result message

    Raises:
        ValueError: If retailer already exists or configuration is invalid
    """
    retailer_id = config_data.get("retailer_id")

    if not retailer_id:
        raise ValueError("retailer_id is required")

    if retailer_id in retailer_configs:
        raise ValueError(f"Retailer with ID {retailer_id} already exists")

    try:
        # Create API client
        client = create_retailer_api(config_data)

        # Store configuration and client
        retailer_configs[retailer_id] = config_data
        retailer_clients[retailer_id] = client

        logger.info(
            f"Added retailer: {retailer_id} ({config_data.get('retailer_name')})"
        )

        return {
            "message": f"Retailer {retailer_id} added successfully",
            "retailer_id": retailer_id,
        }

    except Exception as e:
        logger.error(f"Error adding retailer {retailer_id}: {str(e)}")
        raise ValueError(f"Error adding retailer: {str(e)}")


def update_retailer(retailer_id: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an existing retailer configuration.

    Args:
        retailer_id: ID of the retailer to update
        config_data: New configuration data

    Returns:
        Dictionary with result message

    Raises:
        ValueError: If retailer doesn't exist or configuration is invalid
    """
    if retailer_id not in retailer_configs:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    # Ensure retailer_id in config matches path parameter
    if "retailer_id" in config_data and config_data["retailer_id"] != retailer_id:
        raise ValueError("retailer_id in configuration doesn't match URL parameter")

    # Set retailer_id in config data
    config_data["retailer_id"] = retailer_id

    try:
        # Create new API client
        client = create_retailer_api(config_data)

        # Update configuration and client
        retailer_configs[retailer_id] = config_data

        # Clear cache from old client if it exists
        if retailer_id in retailer_clients:
            try:
                retailer_clients[retailer_id].clear_cache()
            except Exception as e:
                logger.warning(
                    f"Error clearing cache for retailer {retailer_id}: {str(e)}"
                )

        retailer_clients[retailer_id] = client

        logger.info(f"Updated retailer: {retailer_id}")

        return {"message": f"Retailer {retailer_id} updated successfully"}

    except Exception as e:
        logger.error(f"Error updating retailer {retailer_id}: {str(e)}")
        raise ValueError(f"Error updating retailer: {str(e)}")


def delete_retailer(retailer_id: str) -> Dict[str, Any]:
    """
    Delete a retailer configuration.

    Args:
        retailer_id: ID of the retailer to delete

    Returns:
        Dictionary with result message

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_configs:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    try:
        # Clear cache before removing
        if retailer_id in retailer_clients:
            try:
                retailer_clients[retailer_id].clear_cache()
            except Exception as e:
                logger.warning(
                    f"Error clearing cache for retailer {retailer_id}: {str(e)}"
                )

        # Remove configuration and client
        del retailer_configs[retailer_id]
        del retailer_clients[retailer_id]

        logger.info(f"Deleted retailer: {retailer_id}")

        return {"message": f"Retailer {retailer_id} deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting retailer {retailer_id}: {str(e)}")
        raise ValueError(f"Error deleting retailer: {str(e)}")


def get_retailer(retailer_id: str) -> Dict[str, Any]:
    """
    Get retailer configuration.

    Args:
        retailer_id: ID of the retailer

    Returns:
        Retailer configuration (without sensitive data)

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_configs:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    # Return configuration without sensitive data
    config = retailer_configs[retailer_id].copy()

    # Remove sensitive fields
    if "api_secret" in config:
        config["api_secret"] = "******"

    return config


def list_retailers() -> List[Dict[str, Any]]:
    """
    List all retailer configurations.

    Returns:
        List of retailer configurations (without sensitive data)
    """
    result = []

    for retailer_id, config in retailer_configs.items():
        # Copy configuration and remove sensitive data
        retailer_info = config.copy()

        if "api_secret" in retailer_info:
            retailer_info["api_secret"] = "******"

        result.append(retailer_info)

    return result


def test_retailer_connection(retailer_id: str) -> Dict[str, Any]:
    """
    Test connection to a retailer API.

    Args:
        retailer_id: ID of the retailer

    Returns:
        Dictionary with test result

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    client = retailer_clients[retailer_id]

    try:
        # Try to get a small amount of inventory
        inventory = client.get_inventory(limit=1)

        return {
            "message": "Connection successful",
            "status": "success",
            "items_count": len(inventory.items),
        }

    except Exception as e:
        logger.error(f"Error testing connection to retailer {retailer_id}: {str(e)}")

        return {"message": f"Connection failed: {str(e)}", "status": "error"}


def clear_retailer_cache(retailer_id: str) -> Dict[str, Any]:
    """
    Clear cache for a retailer.

    Args:
        retailer_id: ID of the retailer

    Returns:
        Dictionary with result message

    Raises:
        ValueError: If retailer doesn't exist
    """
    if retailer_id not in retailer_clients:
        raise ValueError(f"Retailer with ID {retailer_id} not found")

    client = retailer_clients[retailer_id]

    try:
        client.clear_cache()

        logger.info(f"Cleared cache for retailer: {retailer_id}")

        return {"message": f"Cache cleared for retailer {retailer_id}"}

    except Exception as e:
        logger.error(f"Error clearing cache for retailer {retailer_id}: {str(e)}")
        raise ValueError(f"Error clearing cache: {str(e)}")


# Example Flask routes implementation
"""
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/v1/retailers', methods=['GET'])
def api_list_retailers():
    try:
        retailers = list_retailers()
        return jsonify(retailers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/retailers', methods=['POST'])
def api_add_retailer():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400
            
        result = add_retailer(data)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/retailers/<retailer_id>', methods=['GET'])
def api_get_retailer(retailer_id):
    try:
        retailer = get_retailer(retailer_id)
        return jsonify(retailer)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/retailers/<retailer_id>', methods=['PUT'])
def api_update_retailer(retailer_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Request body cannot be empty"}), 400
            
        result = update_retailer(retailer_id, data)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/retailers/<retailer_id>', methods=['DELETE'])
def api_delete_retailer(retailer_id):
    try:
        result = delete_retailer(retailer_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/retailers/<retailer_id>/test', methods=['GET'])
def api_test_retailer(retailer_id):
    try:
        result = test_retailer_connection(retailer_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/v1/retailers/<retailer_id>/cache', methods=['DELETE'])
def api_clear_retailer_cache(retailer_id):
    try:
        result = clear_retailer_cache(retailer_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
"""
