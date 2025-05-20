// Mock data for social proof-related endpoints
import { mockData } from '../utils/mockData';
import { 
  SocialProofItem, 
  SocialProofMatch,
  ProductRecommendation,
  RecommendationItem 
} from '../types';

// Use the existing mock data
const { socialProofItems, products } = mockData;

/**
 * Get celebrity social proof items
 */
const getCelebrities = (options: any = {}): { 
  items: SocialProofItem[],
  total: number 
} => {
  const { limit = 20, offset = 0 } = options;
  
  // Apply pagination
  const paginatedItems = socialProofItems.slice(offset, offset + limit);
  
  // Sort by most recent first
  paginatedItems.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return {
    items: paginatedItems,
    total: socialProofItems.length
  };
};

/**
 * Get celebrity outfits
 */
const getOutfits = (options: any = {}): {
  items: SocialProofItem[],
  total: number 
} => {
  const { 
    celebrity = '', 
    limit = 20, 
    offset = 0 
  } = options;
  
  // Filter by celebrity if specified
  let filteredItems = [...socialProofItems];
  
  if (celebrity) {
    filteredItems = filteredItems.filter(item => 
      item.celebrity.toLowerCase().includes(celebrity.toLowerCase())
    );
  }
  
  // Apply pagination
  const paginatedItems = filteredItems.slice(offset, offset + limit);
  
  return {
    items: paginatedItems,
    total: filteredItems.length
  };
};

/**
 * Get similar products from social proof
 */
const getMatches = (options: any = {}): {
  exact: SocialProofMatch[],
  similar: SocialProofMatch[]
} => {
  const { 
    itemId,
    imageUrl,
    colors = [],
    patterns = [],
    category = '',
    limit = 10
  } = options;
  
  // In a real implementation, this would use image analysis
  // For mock data, we'll just return a selection of matches
  
  // If itemId is provided, find the specific product
  let itemMatches: SocialProofMatch[] = [];
  if (itemId) {
    // Find the product
    const product = products.find(p => p.id === itemId);
    
    if (product) {
      // Find social proof items that have matching products
      for (const socialItem of socialProofItems) {
        const matchedProduct = socialItem.matchedProducts.find(mp => 
          mp.id === product.id || 
          mp.name.toLowerCase().includes(product.name.toLowerCase())
        );
        
        if (matchedProduct) {
          itemMatches.push({
            id: matchedProduct.id,
            celebrityName: socialItem.celebrity || 'Celebrity',
            event: socialItem.event || 'Event',
            imageUrl: matchedProduct.imageUrl,
            matchedProducts: [{
              id: matchedProduct.id,
              name: matchedProduct.name,
              description: `${matchedProduct.brand} ${matchedProduct.name}`,
              price: matchedProduct.price,
              brand: matchedProduct.brand,
              category: matchedProduct.category,
              imageUrl: matchedProduct.imageUrl,
              matchScore: matchedProduct.matchScore,
              matchReasons: matchedProduct.matchReasons
            }],
            confidence: matchedProduct.matchScore || 0.8,
            source: 'social_proof',
            timestamp: socialItem.timestamp || new Date().toISOString()
          });
        }
      }
    }
  }
  
  // For similar items, find products that match the criteria
  let similarMatches: SocialProofMatch[] = [];
  
  // Generate similar matches based on category, colors, patterns
  for (const socialItem of socialProofItems) {
    // Check for color matches
    const hasColorMatch = colors.length === 0 || 
      socialItem.colors.some(c => colors.includes(c));
    
    // Check for pattern matches
    const hasPatternMatch = patterns.length === 0 || 
      socialItem.patterns.some(p => patterns.includes(p));
    
    // Check for category relevance
    const relevantCategory = !category || 
      socialItem.outfitTags.some(tag => tag.toLowerCase().includes(category.toLowerCase()));
    
    // If we have some matches, add the social proof item's products
    if ((hasColorMatch || hasPatternMatch) && relevantCategory) {
      for (const matchedProduct of socialItem.matchedProducts) {
        // Create a similarity score based on how many attributes match
        let matchScore = 0.5; // Base score
        
        if (hasColorMatch) matchScore += 0.2;
        if (hasPatternMatch) matchScore += 0.2;
        if (relevantCategory) matchScore += 0.1;
        
        // Create match reasons
        const matchReasons = [
          `Similar to ${socialItem.celebrity}'s style`,
          `Featured in ${socialItem.event}`
        ];
        
        if (hasColorMatch) {
          matchReasons.push(`Matching color palette`);
        }
        
        if (hasPatternMatch) {
          matchReasons.push(`Similar pattern`);
        }
        
        // Add to similar matches
        similarMatches.push({
          id: matchedProduct.id,
          celebrityName: socialItem.celebrity || 'Celebrity',
          event: socialItem.event || 'Event',
          imageUrl: matchedProduct.imageUrl,
          matchedProducts: [{
            id: matchedProduct.id,
            name: matchedProduct.name,
            description: `${matchedProduct.brand} ${matchedProduct.name}`,
            price: matchedProduct.price,
            brand: matchedProduct.brand,
            category: matchedProduct.category,
            imageUrl: matchedProduct.imageUrl,
            matchScore: matchScore,
            matchReasons: matchReasons.slice(0, 3)
          }],
          confidence: matchScore,
          source: 'social_proof',
          timestamp: socialItem.timestamp || new Date().toISOString()
        });
      }
    }
  }
  
  // Remove duplicates
  similarMatches = similarMatches.filter((match, index, self) => 
    index === self.findIndex(m => m.id === match.id)
  );
  
  // Sort by match score
  similarMatches.sort((a, b) => b.matchScore - a.matchScore);
  
  // Limit results
  return {
    exact: itemMatches.slice(0, limit),
    similar: similarMatches.slice(0, limit)
  };
};

export default {
  getCelebrities,
  getOutfits,
  getMatches
};