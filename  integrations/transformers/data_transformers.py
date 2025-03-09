"""
Data transformers for converting retailer API data to our internal models.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime

from stylist.models.clothing import ClothingItem, RetailerInventory

logger = logging.getLogger(__name__)


def transform_to_clothing_items(
    items_data: List[Dict[str, Any]],
    retailer_id: str,
    retailer_name: str,
    mapping: Dict[str, str],
) -> List[ClothingItem]:
    """
    Transform raw API data to ClothingItem objects using a field mapping.

    Args:
        items_data: List of item data dictionaries from the API
        retailer_id: ID of the retailer
        retailer_name: Name of the retailer
        mapping: Dictionary mapping API field names to ClothingItem field names

    Returns:
        List of ClothingItem objects
    """
    result = []

    for item_data in items_data:
        try:
            item_dict = {
                "retailer_id": retailer_id,
            }

            # Apply mapping
            for source_field, target_field in mapping.items():
                # Handle nested fields with dot notation (e.g., "variants.price")
                if "." in source_field:
                    parts = source_field.split(".")
                    value = item_data
                    for part in parts:
                        if isinstance(value, dict) and part in value:
                            value = value[part]
                        else:
                            value = None
                            break
                else:
                    value = item_data.get(source_field)

                if value is not None:
                    item_dict[target_field] = value

            # Ensure required fields are present
            required_fields = ["item_id", "name", "category"]
            if not all(field in item_dict for field in required_fields):
                missing = [field for field in required_fields if field not in item_dict]
                logger.warning(
                    f"Skipping item from {retailer_name}: missing required fields: {missing}"
                )
                continue

            # Create and append the ClothingItem
            item = ClothingItem(**item_dict)
            result.append(item)

        except Exception as e:
            logger.error(f"Error transforming item from {retailer_name}: {str(e)}")
            # Continue processing other items
            continue

    return result


def transform_from_shopify(
    products_data: Dict[str, Any], retailer_id: str, retailer_name: str
) -> List[ClothingItem]:
    """
    Transform Shopify API product data to ClothingItem objects.

    Args:
        products_data: Data from Shopify API
        retailer_id: ID of the retailer
        retailer_name: Name of the retailer

    Returns:
        List of ClothingItem objects
    """
    items = []

    # Shopify returns products in a "products" list
    products = products_data.get("products", [])

    for product in products:
        try:
            # Get main product details
            product_id = str(product.get("id", ""))
            title = product.get("title", "")
            description = product.get("body_html", "")
            product_type = product.get("product_type", "")
            tags = (
                product.get("tags", "").split(", ")
                if isinstance(product.get("tags"), str)
                else product.get("tags", [])
            )

            # Process vendor (brand)
            brand = product.get("vendor", "")

            # Get images
            images = [img.get("src", "") for img in product.get("images", [])]

            # Process collections/categories
            collections = []
            for collection in product.get("collections", []):
                collections.append(collection.get("title", "").lower())

            # Map product_type to our category system
            category = "other"
            subcategory = None

            # Basic category mapping
            product_type_lower = product_type.lower()
            if any(
                term in product_type_lower for term in ["shirt", "tee", "top", "blouse"]
            ):
                category = "tops"
                subcategory = product_type_lower
            elif any(
                term in product_type_lower
                for term in ["pant", "jean", "trouser", "short", "skirt"]
            ):
                category = "bottoms"
                subcategory = product_type_lower
            elif any(
                term in product_type_lower
                for term in ["shoe", "sneaker", "boot", "sandal"]
            ):
                category = "shoes"
                subcategory = product_type_lower
            elif any(term in product_type_lower for term in ["dress"]):
                category = "dresses"
            elif any(
                term in product_type_lower
                for term in ["jacket", "coat", "hoodie", "sweater"]
            ):
                category = "outerwear"
                subcategory = product_type_lower
            elif any(
                term in product_type_lower
                for term in ["accessory", "hat", "bag", "jewelry"]
            ):
                category = "accessories"
                subcategory = product_type_lower

            # Extract style information from tags and product type
            style_tags = []
            for tag in tags:
                tag_lower = tag.lower()
                if tag_lower in [
                    "casual",
                    "formal",
                    "business",
                    "sporty",
                    "classic",
                    "trendy",
                    "vintage",
                ]:
                    style_tags.append(tag_lower)

            # Extract occasion information from tags
            occasion_tags = []
            for tag in tags:
                tag_lower = tag.lower()
                if tag_lower in [
                    "casual",
                    "formal",
                    "business",
                    "party",
                    "wedding",
                    "sport",
                ]:
                    occasion_tags.append(tag_lower)

            # Extract season information from tags
            season_tags = []
            for tag in tags:
                tag_lower = tag.lower()
                if tag_lower in ["summer", "winter", "fall", "spring", "all-season"]:
                    season_tags.append(tag_lower)

            # Process variants (sizes, colors, prices)
            variants = product.get("variants", [])
            all_sizes = []
            all_colors = []
            prices = []

            for variant in variants:
                # Get option values which often contain size and color info
                for option_name, option_value in zip(
                    product.get("options", []), variant.get("option_values", [])
                ):
                    option_name_lower = option_name.get("name", "").lower()
                    value = option_value.get("value", "")

                    if option_name_lower in ["size", "sizes"]:
                        all_sizes.append(value)
                    elif option_name_lower in ["color", "colours", "colors"]:
                        all_colors.append(value.lower())

                # Get price
                price = variant.get("price", 0)
                if price:
                    try:
                        prices.append(float(price))
                    except (ValueError, TypeError):
                        pass

                # Check for option1, option2 which are common in Shopify
                option1 = variant.get("option1")
                option2 = variant.get("option2")

                # Try to determine if options are sizes or colors
                if option1 and option1.lower() in [
                    "xs",
                    "s",
                    "m",
                    "l",
                    "xl",
                    "xxl",
                    "xxxl",
                ]:
                    all_sizes.append(option1)
                elif option1 and re.match(
                    r"^\d+$", option1
                ):  # Numeric sizes like 32, 34, etc.
                    all_sizes.append(option1)
                elif option1:
                    all_colors.append(option1.lower())

                if option2 and option2.lower() in [
                    "xs",
                    "s",
                    "m",
                    "l",
                    "xl",
                    "xxl",
                    "xxxl",
                ]:
                    all_sizes.append(option2)
                elif option2 and re.match(r"^\d+$", option2):  # Numeric sizes
                    all_sizes.append(option2)
                elif option2:
                    all_colors.append(option2.lower())

            # Remove duplicates
            all_sizes = list(set(all_sizes))
            all_colors = list(set(all_colors))

            # Calculate average price and sale price if available
            price = sum(prices) / len(prices) if prices else 0
            compare_at_price = None
            for variant in variants:
                if variant.get("compare_at_price"):
                    try:
                        compare_at_price = float(variant["compare_at_price"])
                        break
                    except (ValueError, TypeError):
                        pass

            # Map limited fit information
            fit_type = None
            for tag in tags:
                tag_lower = tag.lower()
                if tag_lower in [
                    "slim",
                    "regular",
                    "loose",
                    "oversized",
                    "fitted",
                    "skinny",
                    "relaxed",
                ]:
                    fit_type = tag_lower
                    break

            # Determine if sustainable
            sustainable = any(
                tag.lower() in ["sustainable", "eco", "organic", "recycled", "ethical"]
                for tag in tags
            )

            # Create a trending score (simplified)
            trending_score = 0.5  # Default medium score

            # Create ClothingItem object
            item = ClothingItem(
                item_id=f"{retailer_id}_{product_id}",
                name=title,
                brand=brand,
                category=category,
                subcategory=subcategory,
                colors=all_colors,
                sizes=all_sizes,
                price=price,
                sale_price=compare_at_price,
                images=images,
                description=description,
                style_tags=style_tags,
                fit_type=fit_type,
                occasion_tags=occasion_tags,
                season_tags=season_tags,
                sustainable=sustainable,
                trending_score=trending_score,
                retailer_id=retailer_id,
            )

            items.append(item)

        except Exception as e:
            logger.error(f"Error processing Shopify product: {str(e)}")
            continue

    return items


def transform_from_woocommerce(
    products_data: List[Dict[str, Any]], retailer_id: str, retailer_name: str
) -> List[ClothingItem]:
    """
    Transform WooCommerce API product data to ClothingItem objects.

    Args:
        products_data: Data from WooCommerce API
        retailer_id: ID of the retailer
        retailer_name: Name of the retailer

    Returns:
        List of ClothingItem objects
    """
    items = []

    for product in products_data:
        try:
            # Get main product details
            product_id = str(product.get("id", ""))
            name = product.get("name", "")
            description = product.get("description", "")
            short_description = product.get("short_description", "")

            # Combine descriptions
            full_description = description or short_description

            # Get categories
            categories = []
            subcategory = None
            for category in product.get("categories", []):
                cat_name = category.get("name", "").lower()
                categories.append(cat_name)
                if subcategory is None and "slug" in category:
                    subcategory = cat_name

            # Map to our main category
            category = "other"
            if any(
                "tops" in cat or "shirts" in cat or "t-shirts" in cat
                for cat in categories
            ):
                category = "tops"
            elif any(
                "bottoms" in cat or "pants" in cat or "jeans" in cat or "shorts" in cat
                for cat in categories
            ):
                category = "bottoms"
            elif any(
                "shoes" in cat or "footwear" in cat or "sneakers" in cat
                for cat in categories
            ):
                category = "shoes"
            elif any("dresses" in cat for cat in categories):
                category = "dresses"
            elif any(
                "outerwear" in cat or "jackets" in cat or "coats" in cat
                for cat in categories
            ):
                category = "outerwear"
            elif any("accessories" in cat for cat in categories):
                category = "accessories"

            # Get tags
            tag_list = []
            for tag in product.get("tags", []):
                tag_list.append(tag.get("name", "").lower())

            # Extract style, occasion, and season tags
            style_tags = []
            occasion_tags = []
            season_tags = []

            for tag in tag_list:
                if tag in [
                    "casual",
                    "formal",
                    "business",
                    "sporty",
                    "classic",
                    "trendy",
                    "vintage",
                ]:
                    style_tags.append(tag)
                elif tag in [
                    "casual",
                    "formal",
                    "business",
                    "party",
                    "wedding",
                    "sport",
                ]:
                    occasion_tags.append(tag)
                elif tag in ["summer", "winter", "fall", "spring", "all-season"]:
                    season_tags.append(tag)

            # Get images
            images = []
            for image in product.get("images", []):
                src = image.get("src", "")
                if src:
                    images.append(src)

            # Get attributes (sizes, colors)
            attributes = product.get("attributes", [])
            sizes = []
            colors = []

            for attr in attributes:
                name = attr.get("name", "").lower()
                options = attr.get("options", [])

                if name in ["size", "sizes"]:
                    sizes.extend(options)
                elif name in ["color", "colours", "colors"]:
                    colors.extend([color.lower() for color in options])

            # Get price
            price = 0
            try:
                price = float(product.get("price", 0))
            except (ValueError, TypeError):
                pass

            # Get sale price
            sale_price = None
            if product.get("on_sale", False):
                try:
                    sale_price = float(product.get("sale_price", 0))
                except (ValueError, TypeError):
                    pass

            # Get brand
            brand = ""
            for attr in attributes:
                if attr.get("name", "").lower() == "brand":
                    options = attr.get("options", [])
                    if options:
                        brand = options[0]
                        break

            # If brand not found in attributes, try to extract from tags or name
            if not brand:
                # Check product tags for potential brand names
                for tag in tag_list:
                    if tag.istitle():  # Brands are often title-cased
                        brand = tag
                        break

            # Determine if sustainable
            sustainable = any(
                tag in ["sustainable", "eco", "organic", "recycled", "ethical"]
                for tag in tag_list
            )

            # Create a trending score (simplified)
            trending_score = 0.5  # Default medium score

            # Get fit type
            fit_type = None
            for attr in attributes:
                if attr.get("name", "").lower() == "fit":
                    options = attr.get("options", [])
                    if options:
                        fit_type = options[0].lower()
                        break

            # Try to extract fit type from tags if not found in attributes
            if not fit_type:
                for tag in tag_list:
                    if tag in [
                        "slim",
                        "regular",
                        "loose",
                        "oversized",
                        "fitted",
                        "skinny",
                        "relaxed",
                    ]:
                        fit_type = tag
                        break

            # Create ClothingItem object
            item = ClothingItem(
                item_id=f"{retailer_id}_{product_id}",
                name=name,
                brand=brand,
                category=category,
                subcategory=subcategory,
                colors=colors,
                sizes=sizes,
                price=price,
                sale_price=sale_price,
                images=images,
                description=full_description,
                style_tags=style_tags,
                fit_type=fit_type,
                occasion_tags=occasion_tags,
                season_tags=season_tags,
                sustainable=sustainable,
                trending_score=trending_score,
                retailer_id=retailer_id,
            )

            items.append(item)

        except Exception as e:
            logger.error(f"Error processing WooCommerce product: {str(e)}")
            continue

    return items


def transform_from_generic(
    products_data: Dict[str, Any],
    retailer_id: str,
    retailer_name: str,
    mapping: Dict[str, str],
) -> List[ClothingItem]:
    """
    Transform generic API product data to ClothingItem objects using a custom mapping.

    Args:
        products_data: Data from generic API
        retailer_id: ID of the retailer
        retailer_name: Name of the retailer
        mapping: Dictionary mapping API field names to ClothingItem field names

    Returns:
        List of ClothingItem objects
    """
    # Extract the actual list of items from the response
    # Different APIs might structure this differently
    items_data = []

    # Handle common response structures
    if "products" in products_data:
        items_data = products_data["products"]
    elif "items" in products_data:
        items_data = products_data["items"]
    elif "data" in products_data:
        items_data = products_data["data"]
    elif isinstance(products_data, list):
        items_data = products_data
    else:
        logger.warning(f"Unknown API response structure from {retailer_name}")
        return []

    return transform_to_clothing_items(items_data, retailer_id, retailer_name, mapping)
