#!/usr/bin/env python
"""
Script to run a full test of the social proof pipeline
"""

import unittest
import sys
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add necessary paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the social proof test
from tests.test_social_proof_complete_pipeline import TestCompleteProofPipeline

# Import other needed components
from models.clothing import ClothingItem
from models.user import UserProfile
from models.recommendation import SocialProofContext, RecommendationResponse
from services.recommendation_service import RecommendationService

# Try to import the scraper
try:
    from services.social_proof.whoWhatWearScraper import scrapeWhoWhatWear, generateMockData
    from services.social_proof.parseWhoWhatWear import extractOutfitElements
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False
    print("Scraper not available, will use mock data only")

def run_tests(verbose=True):
    """Run the test suite with selected verbosity"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestCompleteProofPipeline)
    
    verbosity = 2 if verbose else 1
    runner = unittest.TextTestRunner(verbosity=verbosity)
    return runner.run(suite)

def run_manual_pipeline_test():
    """Run a manual test of the full social proof pipeline and save results"""
    print("\n--- Running Manual Pipeline Test ---\n")
    
    # Create test instance
    test_instance = TestCompleteProofPipeline()
    test_instance.setUp()
    
    # Get some social proof contexts
    contexts = test_instance._get_social_proof_contexts(3)
    
    results = []
    
    # Run the pipeline for each context
    for context in contexts:
        result = {
            "celebrity": context.celebrity,
            "description": context.outfit_description,
            "tags": context.outfit_tags,
            "colors": context.colors,
            "patterns": context.patterns,
            "items": [],
            "outfits": []
        }
        
        print(f"\nTesting pipeline for {context.celebrity}'s outfit")
        print(f"Description: {context.outfit_description}")
        
        # Generate recommendations
        recs = RecommendationService.generate_recommendations(
            test_instance.user, test_instance.test_items, "casual", context
        )
        
        # Process recommended items
        for item_rec in recs.recommended_items:
            item = next((i for i in test_instance.test_items if i.item_id == item_rec.item_id), None)
            if item:
                result["items"].append({
                    "id": item.item_id,
                    "name": item.name,
                    "category": item.category,
                    "subcategory": item.subcategory,
                    "colors": item.colors,
                    "pattern": item.pattern,
                    "fit": item.fit_type,
                    "match_score": item_rec.score,
                    "match_reasons": item_rec.match_reasons,
                    "mentions_celebrity": any(context.celebrity in reason for reason in item_rec.match_reasons)
                })
        
        # Process recommended outfits
        for outfit_rec in recs.recommended_outfits:
            outfit_items = []
            for item_id in outfit_rec.items:
                item = next((i for i in test_instance.test_items if i.item_id == item_id), None)
                if item:
                    outfit_items.append({
                        "id": item.item_id,
                        "name": item.name,
                        "category": item.category,
                        "subcategory": item.subcategory
                    })
            
            result["outfits"].append({
                "id": outfit_rec.outfit_id,
                "score": outfit_rec.score,
                "match_reasons": outfit_rec.match_reasons,
                "mentions_celebrity": any(context.celebrity in reason for reason in outfit_rec.match_reasons),
                "items": outfit_items
            })
        
        results.append(result)
        
        # Print summary
        items_with_celeb = sum(1 for item in result["items"] if item["mentions_celebrity"])
        outfits_with_celeb = sum(1 for outfit in result["outfits"] if outfit["mentions_celebrity"])
        
        print(f"- Recommended items: {len(result['items'])}")
        print(f"- Items mentioning {context.celebrity}: {items_with_celeb}")
        print(f"- Recommended outfits: {len(result['outfits'])}")
        print(f"- Outfits mentioning {context.celebrity}: {outfits_with_celeb}")
    
    # Save results to a file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"social_proof_test_results_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nSaved detailed results to {filename}")
    return results

def test_scraper_if_available():
    """Test the scraper functionality if available"""
    if not SCRAPER_AVAILABLE:
        print("\nScraper not available, skipping scraper test")
        return None
    
    print("\n--- Testing WhoWhatWear Scraper ---\n")
    
    try:
        # Use mock data for testing to avoid network requests
        social_items = generateMockData(5)
        
        print(f"Generated {len(social_items)} mock celebrity outfits")
        
        for i, item in enumerate(social_items):
            print(f"\n{i+1}. {item['celebrity']}")
            print(f"   Event: {item.get('event', 'N/A')}")
            print(f"   Description: {item['outfitDescription'][:100]}...")
            
            # Extract outfit elements
            elements = extractOutfitElements(item['outfitDescription'])
            print(f"   Extracted elements:")
            print(f"     - Garments: {elements['garments']}")
            print(f"     - Colors: {elements['colors']}")
            print(f"     - Patterns: {elements['patterns']}")
            print(f"     - Styles: {elements['styles']}")
        
        return social_items
    
    except Exception as e:
        print(f"Error testing scraper: {e}")
        return None

if __name__ == "__main__":
    # Run the tests
    print("Running Social Proof Integration Tests\n")
    
    # Check if scraper is available
    if SCRAPER_AVAILABLE:
        print("Scraper is available - will use it for testing")
    else:
        print("Scraper is not available - will use mock data")
    
    # Add command line options
    if len(sys.argv) > 1 and sys.argv[1] == "--scraper-only":
        # Just test the scraper
        test_scraper_if_available()
    elif len(sys.argv) > 1 and sys.argv[1] == "--manual":
        # Run manual pipeline test
        run_manual_pipeline_test()
    else:
        # Run automated tests
        test_result = run_tests(verbose=True)
        
        if test_result.wasSuccessful():
            print("\nAll tests passed!")
            
            # Also run the manual pipeline test
            if len(sys.argv) > 1 and sys.argv[1] == "--with-manual":
                run_manual_pipeline_test()
        else:
            print("\nSome tests failed.")
            sys.exit(1)