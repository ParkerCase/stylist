"""
Integration package for The Stylist.
Provides connections to retailer APIs and data transformation utilities.
"""

from stylist.integrations.retailer_api import (
    RetailerAPI,
    RetailerAPIError,
    RetailerConfig,
)
from stylist.integrations.retailers.mock_retailer import MockRetailerAPI
from stylist.integrations.retailers.shopify import ShopifyAPI
from stylist.integrations.retailers.woocommerce import WooCommerceAPI
from stylist.integrations.retailers.generic_rest import GenericRestAPI
from stylist.integrations.cache.memory_cache import MemoryCache
from stylist.integrations.cache.redis_cache import RedisCache
from stylist.integrations.transformers.data_transformers import (
    transform_to_clothing_items,
    transform_from_shopify,
    transform_from_woocommerce,
    transform_from_generic,
)

__all__ = [
    "RetailerAPI",
    "RetailerAPIError",
    "RetailerConfig",
    "MockRetailerAPI",
    "ShopifyAPI",
    "WooCommerceAPI",
    "GenericRestAPI",
    "MemoryCache",
    "RedisCache",
    "transform_to_clothing_items",
    "transform_from_shopify",
    "transform_from_woocommerce",
    "transform_from_generic",
]
