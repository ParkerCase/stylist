"""
Generic REST API client for retailer integration.
This can be configured to work with most RESTful inventory APIs.
"""

import logging
import json
import asyncio
from typing import Dict, List, Any, Optional, Set, Union, Callable
from datetime import datetime
import re

from stylist.integrations.retailer_api import RetailerAPI, RetailerConfig, InventoryFilter, RetailerAPIError
from stylist.models.clothing import ClothingItem, RetailerInventory
from stylist.config import StyleCategory

logger = logging.getLogger(__name__)


class GenericRestAPI(RetailerAPI):
    """
    A flexible, configurable client for generic REST APIs.
    Can be adapted to work with most RESTful e-commerce APIs.
    """

    def __init__(
        self,
        config: RetailerConfig,
        field_mapping: Dict[str, str],
        inventory_endpoint: str,
        item_endpoint_template: str,
        search_endpoint_template: str,
        availability_endpoint: Optional[str] = None,
        inventory_response_path: str = "products",
    ):
        """
        Initialize the client with configuration and field mappings.
        
        Args:
            config: RetailerConfig object
            field_mapping: Dictionary mapping API fields to internal fields
            inventory_endpoint: Endpoint for inventory list
            item_endpoint_template: Template for item endpoint (with {id} placeholder)
            search_endpoint_template: Template for search endpoint (with {query} placeholder)
            availability_endpoint: Optional endpoint for availability checking
            inventory_response_path: JSON path to inventory items in response
        """
        super().__init__(config)
        self.field_mapping = field_mapping
        self.inventory_endpoint = inventory_endpoint
        self.item_endpoint_template = item_endpoint_template
        self.search_endpoint_template = search_endpoint_template
        self.availability_endpoint = availability_endpoint
        self.inventory_response_path = inventory_response_path

    def get_inventory(
        self,
        limit: int = 100,
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None,
    ) -> RetailerInventory:
        """
        Get inventory items with pagination and filtering.
        
        Args:
            limit: Maximum number of items to return
            page: Page number for pagination
            category: Optional category filter
            filter_options: Additional filter options

        Returns:
            RetailerInventory object
        """
        # Check cache first
        cache_key = self._cache_key(
            "inventory", limit=limit, page=page, category=category, filter=filter_options
        )
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
                
        # Build query parameters
        params = {
            "limit": limit,
            "page": page,
        }
        
        # Map internal filter fields to API-specific fields
        if category and "category" in self.field_mapping:
            params[self.field_mapping["category"]] = category
            
        if filter_options:
            self._apply_filters(params, filter_options)
            
        # Synchronous request - runs the event loop to execute the async request
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Create a new event loop if none exists
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        result = loop.run_until_complete(self._fetch_inventory(params))
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, result)
            
        return result

    async def get_inventory_async(
        self,
        limit: int = 100,
        page: int = 1,
        category: Optional[str] = None,
        filter_options: Optional[InventoryFilter] = None,
    ) -> RetailerInventory:
        """
        Async version of get_inventory.
        
        Args:
            limit: Maximum number of items to return
            page: Page number for pagination
            category: Optional category filter
            filter_options: Additional filter options

        Returns:
            RetailerInventory object
        """
        # Check cache first
        cache_key = self._cache_key(
            "inventory", limit=limit, page=page, category=category, filter=filter_options
        )
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
                
        # Build query parameters
        params = {
            "limit": limit,
            "page": page,
        }
        
        # Map internal filter fields to API-specific fields
        if category and "category" in self.field_mapping:
            params[self.field_mapping["category"]] = category
            
        if filter_options:
            self._apply_filters(params, filter_options)
            
        # Fetch inventory
        result = await self._fetch_inventory(params)
        
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, result)
            
        return result

    async def _fetch_inventory(self, params: Dict[str, Any]) -> RetailerInventory:
        """
        Fetch inventory data from the API.
        
        Args:
            params: Query parameters
            
        Returns:
            RetailerInventory object
        """
        try:
            # Make the API request
            response_data = await self._make_request(
                "GET", self.inventory_endpoint, params=params
            )
            
            # Extract items using inventory_response_path
            items_data = self._extract_data_by_path(response_data, self.inventory_response_path)
            
            if not items_data or not isinstance(items_data, list):
                logger.warning(
                    f"No items found in response for {self.config.retailer_id} at path {self.inventory_response_path}"
                )
                return RetailerInventory(
                    retailer_id=self.config.retailer_id,
                    retailer_name=self.config.retailer_name,
                    items={},
                    timestamp=datetime.now(),
                )
                
            # Parse items
            items = {}
            for item_data in items_data:
                try:
                    clothing_item = self._parse_item(item_data)
                    if clothing_item:
                        items[clothing_item.item_id] = clothing_item
                except Exception as e:
                    logger.warning(f"Error parsing item: {str(e)}")
                    continue
                    
            # Create inventory object
            inventory = RetailerInventory(
                retailer_id=self.config.retailer_id,
                retailer_name=self.config.retailer_name,
                items=items,
                timestamp=datetime.now(),
            )
            
            logger.info(
                f"Fetched {len(items)} items from {self.config.retailer_id}"
            )
            return inventory
            
        except RetailerAPIError:
            # Re-raise API errors
            raise
        except Exception as e:
            logger.error(f"Error fetching inventory: {str(e)}")
            raise RetailerAPIError(f"Error fetching inventory: {str(e)}")

    def _apply_filters(self, params: Dict[str, Any], filter_options: InventoryFilter) -> None:
        """
        Apply filter options to query parameters.
        
        Args:
            params: Query parameters to modify
            filter_options: Filter options to apply
        """
        # Map filter options to API parameters using field mapping
        if filter_options.subcategory and "subcategory" in self.field_mapping:
            params[self.field_mapping["subcategory"]] = filter_options.subcategory
            
        if filter_options.brand and "brand" in self.field_mapping:
            params[self.field_mapping["brand"]] = filter_options.brand
            
        if filter_options.color and "color" in self.field_mapping:
            params[self.field_mapping["color"]] = filter_options.color
            
        if filter_options.gender and "gender" in self.field_mapping:
            params[self.field_mapping["gender"]] = filter_options.gender
            
        if filter_options.on_sale is not None and "on_sale" in self.field_mapping:
            params[self.field_mapping["on_sale"]] = filter_options.on_sale
            
        # Handle price range
        if filter_options.price_min is not None and "price_min" in self.field_mapping:
            params[self.field_mapping["price_min"]] = filter_options.price_min
            
        if filter_options.price_max is not None and "price_max" in self.field_mapping:
            params[self.field_mapping["price_max"]] = filter_options.price_max
            
        # Handle tags as an array
        if filter_options.tags and "tags" in self.field_mapping:
            tag_param = self.field_mapping["tags"]
            # Different APIs handle array parameters differently
            # Some use comma-separated strings, others use multiple parameters
            if "{value}" in tag_param:
                # Multiple parameters
                for tag in filter_options.tags:
                    param_name = tag_param.replace("{value}", tag)
                    params[param_name] = "true"
            else:
                # Comma-separated
                params[tag_param] = ",".join(filter_options.tags)

    def get_item(self, item_id: str) -> Optional[ClothingItem]:
        """
        Get a specific item by ID.
        
        Args:
            item_id: The item ID to retrieve
            
        Returns:
            ClothingItem object or None if not found
        """
        # Check cache first
        cache_key = self._cache_key("item", item_id=item_id)
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
                
        # Extract retailer-specific ID if needed
        # Expected format: {retailer_id}_{product_id}
        if item_id.startswith(f"{self.config.retailer_id}_"):
            product_id = item_id[len(self.config.retailer_id) + 1:]
        else:
            product_id = item_id
            
        # Prepare endpoint with ID
        endpoint = self.item_endpoint_template.format(id=product_id)
        
        try:
            # Synchronous request - runs the event loop to execute the async request
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Create a new event loop if none exists
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        try:
            # Make the API request
            response_data = loop.run_until_complete(self._make_request("GET", endpoint))
            
            # Parse the item
            item = self._parse_item(response_data)
            
            # Cache the result
            if self.cache and item:
                self.cache.set(cache_key, item)
                
            return item
            
        except RetailerAPIError as e:
            if e.status_code == 404:
                logger.warning(f"Item {item_id} not found")
                return None
            raise
        except Exception as e:
            logger.error(f"Error fetching item {item_id}: {str(e)}")
            return None

    def search_items(
        self, query: str, limit: int = 20, filter_options: Optional[InventoryFilter] = None
    ) -> List[ClothingItem]:
        """
        Search for items by query string.
        
        Args:
            query: Search query
            limit: Maximum number of items to return
            filter_options: Additional filter options
            
        Returns:
            List of ClothingItem objects
        """
        # Check cache first
        cache_key = self._cache_key("search", query=query, limit=limit, filter=filter_options)
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
                
        # Build query parameters
        params = {
            "limit": limit,
        }
        
        # Add search query parameter using field mapping
        if "search_param" in self.field_mapping:
            params[self.field_mapping["search_param"]] = query
        else:
            params["q"] = query  # Default search parameter
            
        # Apply filters
        if filter_options:
            self._apply_filters(params, filter_options)
            
        # Prepare endpoint with query
        endpoint = self.search_endpoint_template.format(query=query)
        
        try:
            # Synchronous request - runs the event loop to execute the async request
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Create a new event loop if none exists
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        try:
            # Make the API request
            response_data = loop.run_until_complete(self._make_request("GET", endpoint, params=params))
            
            # Extract items using inventory_response_path
            items_data = self._extract_data_by_path(response_data, self.inventory_response_path)
            
            if not items_data or not isinstance(items_data, list):
                logger.warning(
                    f"No search results found for {query} at path {self.inventory_response_path}"
                )
                return []
                
            # Parse items
            items = []
            for item_data in items_data:
                try:
                    clothing_item = self._parse_item(item_data)
                    if clothing_item:
                        items.append(clothing_item)
                except Exception as e:
                    logger.warning(f"Error parsing search result: {str(e)}")
                    continue
                    
            # Cache the result
            if self.cache:
                self.cache.set(cache_key, items)
                
            logger.info(f"Found {len(items)} search results for '{query}'")
            return items
            
        except Exception as e:
            logger.error(f"Error searching for '{query}': {str(e)}")
            return []

    def check_availability(self, item_ids: List[str]) -> Dict[str, bool]:
        """
        Check availability for multiple items.
        
        Args:
            item_ids: List of item IDs to check
            
        Returns:
            Dictionary mapping item IDs to availability status
        """
        # Check cache first
        cache_key = self._cache_key("availability", item_ids=",".join(sorted(item_ids)))
        
        if self.cache:
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
                
        result = {}
        
        # Extract retailer-specific IDs if needed
        retailer_prefix = f"{self.config.retailer_id}_"
        product_ids = []
        
        for item_id in item_ids:
            if item_id.startswith(retailer_prefix):
                product_ids.append(item_id[len(retailer_prefix):])
            else:
                product_ids.append(item_id)
                
        # If there's a dedicated availability endpoint, use it
        if self.availability_endpoint:
            try:
                # Synchronous request - runs the event loop to execute the async request
                loop = asyncio.get_event_loop()
            except RuntimeError:
                # Create a new event loop if none exists
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            try:
                # Make the API request
                response_data = loop.run_until_complete(
                    self._make_request(
                        "GET",
                        self.availability_endpoint,
                        params={"ids": ",".join(product_ids)},
                    )
                )
                
                # Parse availability data
                for item_id, product_id in zip(item_ids, product_ids):
                    # Try to find the item in the response
                    if isinstance(response_data, dict) and product_id in response_data:
                        availability = response_data[product_id]
                        if isinstance(availability, bool):
                            result[item_id] = availability
                        elif isinstance(availability, dict) and "available" in availability:
                            result[item_id] = availability["available"]
                        else:
                            # Default to available if format is unknown
                            result[item_id] = True
                    else:
                        # Default to available if not found
                        result[item_id] = True
                        
            except Exception as e:
                logger.error(f"Error checking availability: {str(e)}")
                # Default to available on error
                for item_id in item_ids:
                    result[item_id] = True
        else:
            # Otherwise, get each item individually
            for item_id, product_id in zip(item_ids, product_ids):
                try:
                    item = self.get_item(item_id)
                    result[item_id] = bool(item and item.in_stock)
                except Exception as e:
                    logger.error(f"Error checking availability for {item_id}: {str(e)}")
                    # Default to available on error
                    result[item_id] = True
                    
        # Cache the result
        if self.cache:
            self.cache.set(cache_key, result)
            
        return result

    def _parse_item(self, item_data: Dict[str, Any]) -> Optional[ClothingItem]:
        """
        Parse an item from API response data.
        
        Args:
            item_data: Item data from API
            
        Returns:
            ClothingItem object or None if parsing fails
        """
        try:
            # Extract ID
            if self.field_mapping.get("id") in item_data:
                item_id = str(item_data[self.field_mapping["id"]])
            else:
                # Try some common ID field names
                for id_field in ["id", "product_id", "sku", "item_id"]:
                    if id_field in item_data:
                        item_id = str(item_data[id_field])
                        break
                else:
                    logger.warning("Could not find ID field in item data")
                    return None
                    
            # Prefix with retailer_id
            prefixed_id = f"{self.config.retailer_id}_{item_id}"
            
            # Extract basic fields
            name = self._extract_field(item_data, "name", "")
            description = self._extract_field(item_data, "description", "")
            price = self._extract_field(item_data, "price", 0.0, float)
            sale_price = self._extract_field(item_data, "sale_price", 0.0, float)
            category = self._extract_field(item_data, "category", "")
            subcategory = self._extract_field(item_data, "subcategory", None)
            brand = self._extract_field(item_data, "brand", "")
            
            # Extract images
            image_url = self._extract_field(item_data, "image", "")
            additional_images = self._extract_field(item_data, "additional_images", [])
            if not isinstance(additional_images, list):
                additional_images = []
                
            # Extract colors
            colors = self._extract_field(item_data, "colors", [])
            if isinstance(colors, str):
                colors = [colors]
            elif not isinstance(colors, list):
                colors = []
                
            # Extract sizes
            sizes = self._extract_field(item_data, "sizes", [])
            if isinstance(sizes, str):
                sizes = [sizes]
            elif not isinstance(sizes, list):
                sizes = []
                
            # Extract availability/stock
            in_stock = self._extract_field(item_data, "in_stock", True, bool)
            stock_level = self._extract_field(item_data, "stock_level", None, int)
            
            # Extract tags
            tags = self._extract_field(item_data, "tags", [])
            if isinstance(tags, str):
                tags = [tag.strip() for tag in tags.split(",")]
            elif not isinstance(tags, list):
                tags = []
                
            # Extract style tags
            style_tags = self._extract_field(item_data, "style_tags", [])
            if isinstance(style_tags, str):
                style_tags = [tag.strip() for tag in style_tags.split(",")]
            elif not isinstance(style_tags, list):
                style_tags = []
                
            # If no style tags, try to infer from category/subcategory
            if not style_tags:
                inferred_tags = self._infer_style_tags(category, subcategory, name, description)
                style_tags.extend(inferred_tags)
                
            # Extract occasion tags
            occasion_tags = self._extract_field(item_data, "occasion_tags", [])
            if isinstance(occasion_tags, str):
                occasion_tags = [tag.strip() for tag in occasion_tags.split(",")]
            elif not isinstance(occasion_tags, list):
                occasion_tags = []
                
            # Extract gender
            gender = self._extract_field(item_data, "gender", None)
            
            # Create ClothingItem object
            return ClothingItem(
                item_id=prefixed_id,
                retailer_id=self.config.retailer_id,
                name=name,
                description=description,
                price=price,
                sale_price=sale_price,
                category=category,
                subcategory=subcategory,
                brand=brand,
                image_url=image_url,
                additional_images=additional_images,
                colors=colors,
                sizes=sizes,
                in_stock=in_stock,
                stock_level=stock_level,
                tags=tags,
                style_tags=style_tags,
                occasion_tags=occasion_tags,
                gender=gender,
            )
            
        except Exception as e:
            logger.warning(f"Error parsing item: {str(e)}")
            return None

    def _extract_field(
        self,
        data: Dict[str, Any],
        field: str,
        default: Any,
        cast_func: Callable = None,
    ) -> Any:
        """
        Extract a field from item data using field mapping.
        
        Args:
            data: Item data
            field: Field name to extract
            default: Default value if field not found
            cast_func: Optional function to cast the value
            
        Returns:
            Extracted field value
        """
        # Get mapped field name
        mapped_field = self.field_mapping.get(field)
        
        if not mapped_field:
            return default
            
        # Support dot notation for nested fields (e.g., "variants.0.price")
        if "." in mapped_field:
            parts = mapped_field.split(".")
            value = data
            
            for part in parts:
                # Handle array indexing
                if part.isdigit() and isinstance(value, list):
                    index = int(part)
                    if 0 <= index < len(value):
                        value = value[index]
                    else:
                        return default
                elif part in value:
                    value = value[part]
                else:
                    return default
        else:
            # Direct field access
            if mapped_field not in data:
                return default
            value = data[mapped_field]
            
        # Cast if needed
        if cast_func and value is not None:
            try:
                return cast_func(value)
            except (ValueError, TypeError):
                return default
                
        return value

    def _extract_data_by_path(self, data: Any, path: str) -> Any:
        """
        Extract data from a JSON response using a path string.
        
        Args:
            data: JSON data
            path: Dot-separated path to the data (e.g., "response.data.products")
            
        Returns:
            Extracted data
        """
        if not path:
            return data
            
        parts = path.split(".")
        current = data
        
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            elif isinstance(current, list) and part.isdigit():
                index = int(part)
                if 0 <= index < len(current):
                    current = current[index]
                else:
                    return None
            else:
                return None
                
        return current

    def _infer_style_tags(
        self, category: str, subcategory: Optional[str], name: str, description: str
    ) -> List[str]:
        """
        Infer style tags from category, subcategory, name, and description.
        
        Args:
            category: Item category
            subcategory: Item subcategory
            name: Item name
            description: Item description
            
        Returns:
            List of inferred style tags
        """
        tags = []
        
        # Convert to lowercase for matching
        category_lower = category.lower() if category else ""
        subcategory_lower = subcategory.lower() if subcategory else ""
        name_lower = name.lower() if name else ""
        description_lower = description.lower() if description else ""
        
        # Combined text for pattern matching
        text = f"{category_lower} {subcategory_lower} {name_lower} {description_lower}"
        
        # Match patterns for style categories
        style_patterns = {
            "classic": [
                r"classic",
                r"timeless",
                r"traditional",
                r"elegant",
                r"sophisticated",
            ],
            "minimalist": [
                r"minimalist",
                r"clean lines",
                r"simple",
                r"basic",
                r"essential",
            ],
            "trendy": [
                r"trend",
                r"fashion-forward",
                r"season",
                r"latest",
                r"contemporary",
            ],
            "edgy": [
                r"edgy",
                r"alternative",
                r"bold",
                r"statement",
                r"punk",
                r"rock",
                r"grunge",
            ],
            "sporty": [
                r"sport",
                r"athletic",
                r"active",
                r"casual",
                r"performance",
                r"workout",
                r"fitness",
            ],
            "bohemian": [
                r"boho",
                r"bohemian",
                r"free-spirit",
                r"ethnic",
                r"flowy",
                r"folk",
                r"hippie",
            ],
        }
        
        for style, patterns in style_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text):
                    tags.append(style)
                    break  # Only add each style once
                    
        # Specific category mappings
        category_styles = {
            "shirts": ["classic", "casual"],
            "t-shirts": ["casual", "sporty"],
            "blouses": ["classic", "feminine"],
            "sweaters": ["classic", "casual"],
            "hoodies": ["sporty", "casual"],
            "dresses": ["classic", "feminine"],
            "jeans": ["classic", "casual"],
            "pants": ["classic", "casual"],
            "skirts": ["classic", "feminine"],
            "shorts": ["casual", "sporty"],
            "jackets": ["classic", "casual"],
            "coats": ["classic", "formal"],
            "blazers": ["classic", "formal"],
            "activewear": ["sporty", "casual"],
            "swimwear": ["sporty", "casual"],
            "underwear": ["basic", "casual"],
            "socks": ["basic", "casual"],
            "shoes": ["classic", "casual"],
            "boots": ["classic", "casual"],
            "sneakers": ["sporty", "casual"],
            "sandals": ["casual", "bohemian"],
            "accessories": ["classic", "casual"],
            "bags": ["classic", "casual"],
            "jewelry": ["classic", "elegant"],
            "hats": ["casual", "sporty"],
            "scarves": ["classic", "casual"],
            "gloves": ["classic", "casual"],
            "belts": ["classic", "casual"],
            "sunglasses": ["classic", "casual"],
            "watches": ["classic", "elegant"],
        }
        
        # Add category-based styles
        for cat, styles in category_styles.items():
            if cat in category_lower or cat in subcategory_lower:
                tags.extend(styles)
                
        # Add occasion tags based on text analysis
        occasion_patterns = {
            "casual": [r"casual", r"everyday", r"daily", r"relax"],
            "formal": [r"formal", r"business", r"professional", r"office", r"work"],
            "party": [r"party", r"event", r"celebration", r"festive"],
            "outdoor": [r"outdoor", r"hiking", r"camping", r"adventure"],
            "wedding": [r"wedding", r"bridal", r"ceremony"],
            "date": [r"date", r"night out", r"dinner", r"romantic"],
            "vacation": [r"vacation", r"holiday", r"beach", r"resort", r"travel"],
            "workout": [r"workout", r"exercise", r"fitness", r"gym", r"training"],
        }
        
        # Remove duplicates and return
        return list(set(tags))