// Mock data for product-related endpoints
import { mockData } from '../utils/mockData';
import { 
  RecommendationItem, 
  Outfit, 
  RecommendationResponse, 
  RecommendationRequest,
  SimilarItemsRequest,
  CompleteOutfitRequest
} from '../types';

// Use the existing comprehensive mock data
const {
  products,
  outfits,
  categories,
  brands,
  colors
} = mockData;

/**
 * Filter products based on request parameters
 * @param allProducts - All available products
 * @param options - Filter options
 * @returns Filtered products
 */
const filterProducts = (
  allProducts: RecommendationItem[], 
  options: any
): RecommendationItem[] => {
  let filtered = [...allProducts];
  
  // Apply category filter
  if (options.category) {
    filtered = filtered.filter(p => 
      p.category.toLowerCase() === options.category.toLowerCase()
    );
  }
  
  // Apply brand filter
  if (options.brands && Array.isArray(options.brands) && options.brands.length > 0) {
    filtered = filtered.filter(p => 
      options.brands.some((b: string) => p.brand.toLowerCase().includes(b.toLowerCase()))
    );
  }
  
  // Apply color filter
  if (options.colors && Array.isArray(options.colors) && options.colors.length > 0) {
    filtered = filtered.filter(p => 
      p.colors.some(c => 
        options.colors.some((oc: string) => c.toLowerCase().includes(oc.toLowerCase()))
      )
    );
  }
  
  // Apply price range filter
  if (options.priceRange) {
    const { min, max } = options.priceRange;
    
    if (typeof min === 'number') {
      filtered = filtered.filter(p => p.price >= min);
    }
    
    if (typeof max === 'number') {
      filtered = filtered.filter(p => p.price <= max);
    }
  }
  
  // Apply retailer filter
  if (options.filterByRetailers && Array.isArray(options.filterByRetailers) && options.filterByRetailers.length > 0) {
    filtered = filtered.filter(p => 
      options.filterByRetailers.includes(p.retailerId)
    );
  }
  
  // Apply in-stock filter
  if (options.inStock === true) {
    filtered = filtered.filter(p => p.inStock === true);
  }
  
  // Adjust match scores based on context
  if (options.context) {
    const contextFactors: Record<string, number> = {
      'personal': 0.1,
      'trending': 0.15,
      'seasonal': 0.05,
      'complete_look': 0.2,
      'occasion': 0.1
    };
    
    const factor = contextFactors[options.context] || 0;
    
    // Adjust match scores
    filtered = filtered.map(p => ({
      ...p,
      matchScore: Math.min(1, p.matchScore + factor)
    }));
  }
  
  // Sort results by match score (descending)
  filtered.sort((a, b) => b.matchScore - a.matchScore);
  
  return filtered;
};

/**
 * Filter outfits based on request parameters
 * @param allOutfits - All available outfits
 * @param options - Filter options
 * @returns Filtered outfits
 */
const filterOutfits = (
  allOutfits: Outfit[], 
  options: any
): Outfit[] => {
  let filtered = [...allOutfits];
  
  // Apply occasion filter
  if (options.occasion) {
    filtered = filtered.filter(o => 
      o.occasion.toLowerCase() === options.occasion.toLowerCase()
    );
  }
  
  // Sort by match score (descending)
  filtered.sort((a, b) => b.matchScore - a.matchScore);
  
  return filtered;
};

/**
 * Get recommendations based on request criteria
 */
const getRecommendations = (
  options: any = {}
): RecommendationResponse => {
  // Destructure options or use defaults
  const { 
    userId = 'demo_user',
    limit = 20,
    includeOutfits = true
  } = options;
  
  // Filter products based on criteria
  const filteredProducts = filterProducts(products, options);
  
  // Apply limit - make sure we get the right number of items
  const limitedProducts = filteredProducts.slice(0, limit);
  
  // Get outfits if requested
  let responseOutfits: Outfit[] = [];
  if (includeOutfits) {
    const filteredOutfits = filterOutfits(outfits, options);
    responseOutfits = filteredOutfits.slice(0, Math.min(5, outfits.length));
  }
  
  // Build response
  return {
    userId,
    timestamp: new Date(),
    items: limitedProducts,
    outfits: responseOutfits
  };
};

/**
 * Get products with optional filtering
 */
const getProducts = (
  options: any = {}
): { products: RecommendationItem[], total: number } => {
  // Filter products
  const filteredProducts = filterProducts(products, options);
  
  // Apply pagination
  const page = Number(options.page) || 1;
  const pageSize = Number(options.limit) || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  // Slice results for current page
  const paginatedProducts = filteredProducts.slice(start, end);
  
  return {
    products: paginatedProducts,
    total: filteredProducts.length
  };
};

/**
 * Search products by query string
 */
const searchProducts = (
  options: any = {}
): { results: RecommendationItem[], total: number } => {
  const { query = '', limit = 20 } = options;
  
  // If no query, return empty results
  if (!query) {
    return { results: [], total: 0 };
  }
  
  // Search by name, brand, category
  const normalizedQuery = query.trim().toLowerCase();
  
  const results = products.filter(product => 
    product.name.toLowerCase().includes(normalizedQuery) ||
    product.brand.toLowerCase().includes(normalizedQuery) ||
    product.category.toLowerCase().includes(normalizedQuery) ||
    (product.colors && product.colors.some(color => 
      color.toLowerCase().includes(normalizedQuery)
    ))
  );
  
  // Sort by relevance (exact matches first)
  results.sort((a, b) => {
    const aNameMatch = a.name.toLowerCase() === normalizedQuery ? 3 :
                      a.name.toLowerCase().startsWith(normalizedQuery) ? 2 :
                      a.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
    
    const bNameMatch = b.name.toLowerCase() === normalizedQuery ? 3 :
                      b.name.toLowerCase().startsWith(normalizedQuery) ? 2 :
                      b.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
    
    return bNameMatch - aNameMatch;
  });
  
  // Apply limit
  const limitedResults = results.slice(0, limit);
  
  return {
    results: limitedResults,
    total: results.length
  };
};

/**
 * Get similar items to a reference item
 */
const getSimilarItems = (
  options: any = {}
): RecommendationItem[] => {
  const { itemId, limit = 10 } = options;
  
  // Find the reference item
  const referenceItem = products.find(p => p.id === itemId);
  
  if (!referenceItem) {
    return [];
  }
  
  // Find items with similar attributes
  const similarItems = products
    .filter(p => p.id !== itemId) // Exclude reference item
    .map(product => {
      // Calculate similarity score based on various factors
      let similarityScore = 0;
      
      // Same category (high weight)
      if (product.category === referenceItem.category) {
        similarityScore += 0.4;
      }
      
      // Same brand (medium weight)
      if (product.brand === referenceItem.brand) {
        similarityScore += 0.2;
      }
      
      // Similar price range (medium weight)
      const priceRatio = Math.min(product.price, referenceItem.price) / 
                        Math.max(product.price, referenceItem.price);
      similarityScore += priceRatio * 0.2;
      
      // Color overlap (low weight)
      const colorOverlap = product.colors.filter(c => 
        referenceItem.colors.includes(c)
      ).length;
      
      if (colorOverlap > 0) {
        similarityScore += (colorOverlap / product.colors.length) * 0.1;
      }
      
      // Pattern overlap (low weight)
      if (product.patterns && referenceItem.patterns) {
        const patternOverlap = product.patterns.filter(p => 
          referenceItem.patterns?.includes(p)
        ).length;
        
        if (patternOverlap > 0) {
          similarityScore += (patternOverlap / product.patterns.length) * 0.1;
        }
      }
      
      return {
        ...product,
        matchScore: similarityScore
      };
    })
    .filter(product => product.matchScore > 0.3) // Threshold for similarity
    .sort((a, b) => b.matchScore - a.matchScore); // Sort by similarity
  
  return similarItems.slice(0, limit);
};

/**
 * Complete an outfit based on selected items
 */
const completeOutfit = (
  options: any = {}
): Outfit[] => {
  const { 
    itemIds = [], 
    userId = 'demo_user',
    occasion
  } = options;
  
  if (!itemIds.length) {
    return [];
  }
  
  // Find selected items
  const selectedItems = products.filter(p => itemIds.includes(p.id));
  
  if (!selectedItems.length) {
    return [];
  }
  
  // Identify what categories are missing from a complete outfit
  const selectedCategories = selectedItems.map(item => item.category);
  
  // Define essential outfit categories
  const essentialCategories = ['Tops', 'Bottoms', 'Footwear'];
  const complementaryCategories = ['Outerwear', 'Accessories', 'Bags', 'Jewelry'];
  
  // Find missing essential categories
  const missingEssentials = essentialCategories.filter(
    category => !selectedCategories.includes(category)
  );
  
  // Find missing complementary categories
  const missingComplementary = complementaryCategories.filter(
    category => !selectedCategories.includes(category)
  );
  
  // Generate outfit suggestions (up to 3)
  const outfitSuggestions: Outfit[] = [];
  
  for (let i = 0; i < 3; i++) {
    // Start with selected items
    const outfitItems = [...selectedItems];
    const outfitCategories = [...selectedCategories];
    
    // Add missing essential items first
    for (const category of missingEssentials) {
      // Find matching items from this category
      const candidates = products
        .filter(p => p.category === category && !itemIds.includes(p.id))
        .sort(() => 0.5 - Math.random()); // Randomize
      
      if (candidates.length) {
        // Add the first candidate
        outfitItems.push(candidates[0]);
        outfitCategories.push(category);
      }
    }
    
    // Add some complementary items (up to 2)
    const complementsToAdd = missingComplementary
      .sort(() => 0.5 - Math.random()) // Randomize
      .slice(0, 2);
    
    for (const category of complementsToAdd) {
      // Find matching items from this category
      const candidates = products
        .filter(p => p.category === category && !itemIds.includes(p.id))
        .sort(() => 0.5 - Math.random()); // Randomize
      
      if (candidates.length) {
        // Add the first candidate
        outfitItems.push(candidates[0]);
        outfitCategories.push(category);
      }
    }
    
    // Generate outfit name
    const outfitOccasion = occasion || 'everyday';
    const outfitName = `${
      outfitOccasion.charAt(0).toUpperCase() + outfitOccasion.slice(1)
    } Outfit ${i + 1}`;
    
    // Calculate match score
    const avgMatchScore = outfitItems.reduce(
      (sum, item) => sum + item.matchScore, 0
    ) / outfitItems.length;
    
    // Generate match reasons
    const matchReasons = [
      `Completes your look with coordinated items`,
      `Balanced outfit for ${outfitOccasion} occasions`,
      `Colors and styles complement each other`
    ];
    
    outfitSuggestions.push({
      id: `outfit_${Date.now()}_${i}`,
      name: outfitName,
      occasion: outfitOccasion,
      items: outfitItems,
      matchScore: avgMatchScore,
      matchReasons
    });
  }
  
  return outfitSuggestions;
};

export default {
  getRecommendations,
  getProducts,
  searchProducts,
  getSimilarItems,
  completeOutfit
};