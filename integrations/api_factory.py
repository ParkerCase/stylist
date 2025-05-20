"""
API Factory for The Stylist.

This module provides a unified factory for creating API clients
for different e-commerce platforms with configuration-based switching
and graceful fallbacks.
"""

import logging
import os
from typing import Dict, Optional, Type, Union, Any
import json

from .retailer_api import RetailerAPI, RetailerConfig
from .retailers.shopify import ShopifyAPI
from .retailers.woocommerce import WooCommerceAPI
from .retailers.generic_rest import GenericRestAPI
from .retailers.mock_retailer import MockRetailerAPI

logger = logging.getLogger(__name__)

# Registry of available retailer API implementations
RETAILER_APIS: Dict[str, Type[RetailerAPI]] = {
    "shopify": ShopifyAPI,
    "woocommerce": WooCommerceAPI,
    "generic": GenericRestAPI,
    "mock": MockRetailerAPI,
}

class APIFactory:
    """
    Factory for creating retailer API clients with configuration-based provider selection.
    
    Features:
    - Single environment variable to control provider selection
    - Graceful fallback to mock data when provider is unavailable
    - Transparent error handling and logging
    - Support for multiple simultaneous providers
    """
    
    def __init__(self, default_provider: str = "mock"):
        """
        Initialize the API factory with a default provider.
        
        Args:
            default_provider: The default provider to use when not specified
        """
        self.default_provider = default_provider
        
        # Check environment for provider override
        self.provider_override = os.getenv("STYLIST_API_PROVIDER")
        
        if self.provider_override and self.provider_override not in RETAILER_APIS:
            logger.warning(
                f"Unknown API provider '{self.provider_override}' specified in STYLIST_API_PROVIDER. "
                f"Using default '{default_provider}' instead."
            )
            self.provider_override = None
            
        # Log provider configuration
        if self.provider_override:
            logger.info(f"Using environment-specified API provider: {self.provider_override}")
        else:
            logger.info(f"Using default API provider: {default_provider}")

    def create_api_client(
        self, 
        retailer_config: RetailerConfig, 
        provider: Optional[str] = None
    ) -> RetailerAPI:
        """
        Create a retailer API client based on configuration.
        
        Args:
            retailer_config: Configuration for the retailer API
            provider: Optional provider override
            
        Returns:
            RetailerAPI implementation instance
            
        The provider is determined in this order:
        1. Provider parameter if specified
        2. Environment variable STYLIST_API_PROVIDER if set
        3. Default provider from constructor
        
        If the specified provider is not available, falls back to mock data.
        """
        # Determine which provider to use
        selected_provider = provider or self.provider_override or self.default_provider
        
        # If provider is unknown, fall back to mock
        if selected_provider not in RETAILER_APIS:
            logger.warning(
                f"Unknown provider '{selected_provider}' requested. "
                f"Falling back to mock provider."
            )
            selected_provider = "mock"
            
        try:
            # Get the API class and create an instance
            api_class = RETAILER_APIS[selected_provider]
            logger.info(f"Creating {selected_provider} API client for {retailer_config.retailer_id}")
            return api_class(retailer_config)
        except Exception as e:
            # If there's an error creating the specified provider, fall back to mock
            logger.error(
                f"Error creating {selected_provider} API client: {str(e)}. "
                f"Falling back to mock provider."
            )
            return MockRetailerAPI(retailer_config)
    
    def create_multi_provider_client(
        self,
        retailer_config: RetailerConfig,
        providers: list[str],
        strategy: str = "failover"
    ) -> Union[RetailerAPI, None]:
        """
        Create a client that can work with multiple providers using the specified strategy.
        
        Args:
            retailer_config: Configuration for the retailer API
            providers: List of provider names to try
            strategy: How to use multiple providers - "failover" or "aggregate"
            
        Returns:
            RetailerAPI implementation that manages multiple providers
            
        Strategies:
        - "failover": Try each provider in order until one succeeds
        - "aggregate": Use data from all providers and combine results
        
        If no providers are available, falls back to mock data.
        """
        # This would be implemented with a multi-provider adapter pattern
        # For now, just use the first valid provider
        for provider in providers:
            if provider in RETAILER_APIS:
                try:
                    return self.create_api_client(retailer_config, provider)
                except Exception as e:
                    logger.warning(f"Failed to create {provider} client: {str(e)}")
        
        # If all providers failed, fall back to mock
        logger.warning(f"All providers failed. Falling back to mock provider.")
        return MockRetailerAPI(retailer_config)
    
    @staticmethod
    def from_environment(config_file: Optional[str] = None) -> 'APIFactory':
        """
        Create an APIFactory using environment variables and optional config file.
        
        Args:
            config_file: Optional path to a JSON config file
            
        Returns:
            Configured APIFactory instance
        """
        # Default provider from environment
        default_provider = os.getenv("STYLIST_DEFAULT_API_PROVIDER", "mock")
        
        # If config file is specified, try to load it
        if config_file:
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    default_provider = config.get("default_provider", default_provider)
            except Exception as e:
                logger.warning(f"Failed to load config file {config_file}: {str(e)}")
        
        return APIFactory(default_provider)


# Singleton factory instance for convenience
_default_factory = None

def get_default_factory() -> APIFactory:
    """Get the default APIFactory singleton instance."""
    global _default_factory
    if _default_factory is None:
        _default_factory = APIFactory.from_environment()
    return _default_factory

def create_api_client(
    retailer_config: RetailerConfig, 
    provider: Optional[str] = None
) -> RetailerAPI:
    """
    Convenience function to create a retailer API client using the default factory.
    
    Args:
        retailer_config: Configuration for the retailer API
        provider: Optional provider override
        
    Returns:
        RetailerAPI implementation instance
    """
    factory = get_default_factory()
    return factory.create_api_client(retailer_config, provider)