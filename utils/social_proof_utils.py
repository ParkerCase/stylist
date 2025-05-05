"""
Utility functions for working with social proof data in the recommendation system.
These functions help bridge the gap between the TypeScript scraper output and
the Python recommendation system.
"""

import json
import os
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from models.recommendation import SocialProofContext

logger = logging.getLogger(__name__)

def load_social_proof_data(file_path: str) -> List[Dict[str, Any]]:
    """
    Load social proof data from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing social proof data
        
    Returns:
        List of social proof items
    """
    try:
        if not os.path.exists(file_path):
            logger.warning(f"Social proof data file not found: {file_path}")
            return []
            
        with open(file_path, 'r') as f:
            data = json.load(f)
            
        if not isinstance(data, list):
            logger.warning(f"Social proof data is not a list: {file_path}")
            return []
            
        return data
    except Exception as e:
        logger.error(f"Error loading social proof data: {str(e)}")
        return []

def create_social_proof_context(item: Dict[str, Any]) -> Optional[SocialProofContext]:
    """
    Create a SocialProofContext from a social proof item.
    
    Args:
        item: Social proof item from the scraper
        
    Returns:
        SocialProofContext object or None if invalid data
    """
    try:
        # Validate required fields
        if not item.get('celebrity'):
            logger.warning("Social proof item missing required field: celebrity")
            return None
            
        if not item.get('outfitDescription'):
            logger.warning("Social proof item missing required field: outfitDescription")
            return None
            
        # Convert to SocialProofContext
        context = SocialProofContext(
            celebrity=item['celebrity'],
            event=item.get('event', ''),
            outfit_description=item['outfitDescription'],
            outfit_tags=item.get('outfitTags', []),
            patterns=item.get('patterns', []),
            colors=item.get('colors', [])
        )
        
        return context
    except Exception as e:
        logger.error(f"Error creating social proof context: {str(e)}")
        return None

def filter_social_proof_items(
    items: List[Dict[str, Any]], 
    min_confidence: float = 0.6,
    required_fields: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Filter social proof items based on quality criteria.
    
    Args:
        items: List of social proof items
        min_confidence: Minimum confidence score for celebrity identification
        required_fields: List of fields that must be present
        
    Returns:
        Filtered list of social proof items
    """
    if required_fields is None:
        required_fields = ['celebrity', 'outfitDescription']
        
    filtered_items = []
    
    for item in items:
        # Check required fields
        if not all(field in item and item[field] for field in required_fields):
            continue
            
        # Check confidence score if available
        if 'confidenceScore' in item and item['confidenceScore'] < min_confidence:
            continue
            
        # Check if it has enough outfit elements
        element_count = sum([
            len(item.get('outfitTags', [])),
            len(item.get('colors', [])),
            len(item.get('patterns', []))
        ])
        
        if element_count < 2:
            continue
            
        filtered_items.append(item)
    
    return filtered_items

def get_social_proof_item_by_celebrity(
    items: List[Dict[str, Any]], 
    celebrity_name: str
) -> Optional[Dict[str, Any]]:
    """
    Find a social proof item for a specific celebrity.
    
    Args:
        items: List of social proof items
        celebrity_name: Name of the celebrity to find
        
    Returns:
        Social proof item or None if not found
    """
    name_lower = celebrity_name.lower()
    
    for item in items:
        if item.get('celebrity', '').lower() == name_lower:
            return item
    
    # Try partial match
    for item in items:
        if name_lower in item.get('celebrity', '').lower():
            return item
    
    return None

def merge_social_proof_data(
    item1: Dict[str, Any],
    item2: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merge two social proof items for the same celebrity to get more complete data.
    
    Args:
        item1: First social proof item
        item2: Second social proof item
        
    Returns:
        Merged social proof item
    """
    # Ensure they are for the same celebrity
    if item1.get('celebrity', '').lower() != item2.get('celebrity', '').lower():
        return item1
    
    merged = item1.copy()
    
    # Merge outfit tags, colors, patterns, styles
    for field in ['outfitTags', 'colors', 'patterns', 'styles']:
        if field in item2:
            merged_list = list(set(merged.get(field, []) + item2[field]))
            merged[field] = merged_list
    
    # Use the more detailed description
    if len(item2.get('outfitDescription', '')) > len(merged.get('outfitDescription', '')):
        merged['outfitDescription'] = item2['outfitDescription']
    
    # Use event if available
    if not merged.get('event') and item2.get('event'):
        merged['event'] = item2['event']
    
    # Use better image if available
    if not merged.get('imageUrl') and item2.get('imageUrl'):
        merged['imageUrl'] = item2['imageUrl']
    
    # Use higher confidence score if available
    if item2.get('confidenceScore', 0) > merged.get('confidenceScore', 0):
        merged['confidenceScore'] = item2['confidenceScore']
    
    return merged

def save_social_proof_data(
    items: List[Dict[str, Any]],
    file_path: str
) -> bool:
    """
    Save social proof data to a JSON file.
    
    Args:
        items: List of social proof items
        file_path: Path to save the JSON file
        
    Returns:
        True if saved successfully, False otherwise
    """
    try:
        # Add timestamp
        data = {
            'timestamp': datetime.now().isoformat(),
            'count': len(items),
            'items': items
        }
        
        # Ensure directory exists
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        return True
    except Exception as e:
        logger.error(f"Error saving social proof data: {str(e)}")
        return False

def generate_social_proof_report(
    items: List[Dict[str, Any]],
    include_details: bool = True
) -> str:
    """
    Generate a report on the social proof data.
    
    Args:
        items: List of social proof items
        include_details: Whether to include detailed information for each item
        
    Returns:
        Report text
    """
    if not items:
        return "No social proof data available."
    
    report = f"Social Proof Data Report\n"
    report += f"------------------------\n"
    report += f"Total items: {len(items)}\n\n"
    
    # Count by celebrity
    celebrity_counts = {}
    for item in items:
        celeb = item.get('celebrity', 'Unknown')
        celebrity_counts[celeb] = celebrity_counts.get(celeb, 0) + 1
    
    report += "Celebrity counts:\n"
    for celeb, count in sorted(celebrity_counts.items(), key=lambda x: x[1], reverse=True):
        report += f"- {celeb}: {count}\n"
    
    report += "\n"
    
    # Count outfit elements
    total_tags = sum(len(item.get('outfitTags', [])) for item in items)
    total_colors = sum(len(item.get('colors', [])) for item in items)
    total_patterns = sum(len(item.get('patterns', [])) for item in items)
    total_styles = sum(len(item.get('styles', [])) for item in items)
    
    report += f"Outfit elements:\n"
    report += f"- Total garments/tags: {total_tags} (avg: {total_tags/len(items):.1f})\n"
    report += f"- Total colors: {total_colors} (avg: {total_colors/len(items):.1f})\n"
    report += f"- Total patterns: {total_patterns} (avg: {total_patterns/len(items):.1f})\n"
    report += f"- Total styles: {total_styles} (avg: {total_styles/len(items):.1f})\n"
    
    # Item details
    if include_details:
        report += "\nItem Details:\n"
        for i, item in enumerate(items):
            report += f"\n{i+1}. {item.get('celebrity', 'Unknown')}\n"
            
            if 'event' in item and item['event']:
                report += f"   Event: {item['event']}\n"
                
            report += f"   Description: {item.get('outfitDescription', '')[:100]}{'...' if len(item.get('outfitDescription', '')) > 100 else ''}\n"
            
            if 'outfitTags' in item and item['outfitTags']:
                report += f"   Garments: {', '.join(item['outfitTags'])}\n"
                
            if 'colors' in item and item['colors']:
                report += f"   Colors: {', '.join(item['colors'])}\n"
                
            if 'patterns' in item and item['patterns']:
                report += f"   Patterns: {', '.join(item['patterns'])}\n"
                
            if 'styles' in item and item['styles']:
                report += f"   Styles: {', '.join(item['styles'])}\n"
                
            if 'confidenceScore' in item:
                report += f"   Confidence: {item['confidenceScore']:.2f}\n"
    
    return report