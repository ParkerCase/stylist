// matchSocialOutfits.ts
// Matches scraped celebrity outfits to available products

import { SocialProofItem } from './types';
import { FashionAIConfig } from './config';
import { Recommendation } from './types';
import { ProductRecommendation } from './types';

// Mock RecommendationService for scraper module
const RecommendationService = {
  async searchProducts(options: any): Promise<Recommendation.RecommendationItem[]> {
    // In production, this would call the actual API
    return [];
  }
};

export interface MatchingOptions {
  matchThreshold?: number;
  maxProductsPerItem?: number;
  brandPriority?: boolean;
  colorPriority?: boolean;
}

// Rest of the code remains the same...
export async function matchSocialOutfits(
  scrapedItems: Partial<SocialProofItem>[],
  options: MatchingOptions = {}
): Promise<SocialProofItem[]> {
  const threshold = options.matchThreshold || 0.6;
  const maxProducts = options.maxProductsPerItem || 5;
  
  const matchedItems: SocialProofItem[] = [];

  for (const item of scrapedItems) {
    if (!item.id || !item.celebrity) continue;

    try {
      const matchedProducts = await findMatchingProducts(item, options);
      
      // Filter products by match threshold
      const filteredProducts = matchedProducts.filter(
        product => (product.matchScore || 0) >= threshold
      );

      // Sort by match score and limit results
      const topProducts = filteredProducts
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, maxProducts);

      // Complete the social proof item
      const completeItem: SocialProofItem = {
        id: item.id,
        celebrity: item.celebrity,
        event: item.event || 'Event',
        outfitTags: item.outfitTags || [],
        patterns: item.patterns,
        colors: item.colors,
        timestamp: item.timestamp || new Date().toISOString(),
        matchedProducts: topProducts
      };

      matchedItems.push(completeItem);
    } catch (error) {
      console.error(`Error matching outfit for ${item.celebrity}:`, error);
      // Continue with next item on error
    }
  }

  return matchedItems;
}
/**
 * Finds products that match a celebrity outfit
 */
async function findMatchingProducts(
  item: Partial<SocialProofItem>,
  options: MatchingOptions
): Promise<ProductRecommendation[]> {
  const { outfitTags = [], patterns = [], colors = [] } = item;
  
  // Generate search query from outfit elements
  const searchQueries = generateSearchQueries(outfitTags, patterns, colors);
  
  const allProducts: ProductRecommendation[] = [];

  for (const query of searchQueries) {
    try {
      const results = await searchProducts(query, options);
      allProducts.push(...results);
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }

  // Remove duplicates based on product ID
  const uniqueProducts = removeDuplicateProducts(allProducts);

  // Score each product's match to the outfit
  const scoredProducts = uniqueProducts.map(product => ({
    ...product,
    matchScore: calculateMatchScore(item, product, options)
  }));

  return scoredProducts;
}

/**
 * Generates search queries from outfit elements
 */
function generateSearchQueries(
  outfitTags: string[],
  patterns: string[],
  colors: string[]
): string[] {
  const queries: string[] = [];

  // Create specific searches from outfit tags
  outfitTags.forEach(tag => {
    // Extract garment type and attributes
    const parts = tag.toLowerCase().split(' ');
    const garmentType = findGarmentType(parts);
    
    if (garmentType) {
      const attributes = parts.filter(part => part !== garmentType);
      
      // Create queries with different levels of specificity
      queries.push(tag); // Full tag search
      queries.push(garmentType); // Just the garment type
      
      if (attributes.length > 0) {
        queries.push(`${attributes.join(' ')} ${garmentType}`);
      }
    }
  });

  // Add queries based on patterns and colors
  patterns.forEach(pattern => {
    queries.push(pattern);
    colors.forEach(color => {
      queries.push(`${color} ${pattern}`);
    });
  });

  // Limit to unique queries
  return [...new Set(queries)];
}

/**
 * Identifies the garment type from description parts
 */
function findGarmentType(parts: string[]): string | null {
  const garmentTypes = [
    'dress', 'gown', 'suit', 'blazer', 'jacket', 'pants', 'trousers',
    'skirt', 'shirt', 'blouse', 'sweater', 'coat', 'shoes', 'boots',
    'heels', 'sneakers', 'bag', 'handbag', 'clutch', 'scarf', 'hat'
  ];

  for (const part of parts) {
    if (garmentTypes.includes(part)) {
      return part;
    }
  }

  return null;
}

/**
 * Searches for products based on query
 */
async function searchProducts(query: string, options: MatchingOptions): Promise<ProductRecommendation[]> {
  if (FashionAIConfig.useMockData) {
    return getMockProducts(query);
  }

  try {
    // In production, search using the recommendation service
    const searchOptions = {
      query,
      limit: options.maxProductsPerItem || 10,
      categories: extractCategories(query)
    };

    const results = await RecommendationService.searchProducts(searchOptions);
    return transformRecommendations(results);
  } catch (error) {
    console.error('Error searching products:', error);
    return getMockProducts(query);
  }
}

/**
 * Returns mock products for demo mode
 */
function getMockProducts(query: string): ProductRecommendation[] {
  const mockProducts: ProductRecommendation[] = [
    {
      id: `prod-1-${Date.now()}`,
      name: 'Black Sequin Gown',
      description: 'Elegant black sequin gown with high slit',
      price: 499.99,
      brand: 'Luxury Fashion Co',
      category: 'dresses',
      imageUrl: 'https://via.placeholder.com/300x400?text=Black+Sequin+Gown',
      matchScore: 0.85,
      matchReasons: ['Matches black color', 'Has sequin pattern', 'Formal dress style']
    },
    {
      id: `prod-2-${Date.now()}`,
      name: 'Navy Power Suit',
      description: 'Professional navy blue power suit set',
      price: 699.99,
      brand: 'Executive Style',
      category: 'suits',
      imageUrl: 'https://via.placeholder.com/300x400?text=Navy+Power+Suit',
      matchScore: 0.92,
      matchReasons: ['Matches navy color', 'Professional style', 'Complete suit set']
    },
    {
      id: `prod-3-${Date.now()}`,
      name: 'Oversized Blazer',
      description: 'Trendy oversized black blazer',
      price: 149.99,
      brand: 'Street Chic',
      category: 'blazers',
      imageUrl: 'https://via.placeholder.com/300x400?text=Oversized+Blazer',
      matchScore: 0.78,
      matchReasons: ['Oversized fit', 'Black color', 'Blazer style']
    }
  ];

  // Filter based on query relevance
  return mockProducts.filter(product => 
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.description.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Transforms recommendation results to ProductRecommendation format
 */
function transformRecommendations(recommendations: Recommendation.RecommendationItem[]): ProductRecommendation[] {
  return recommendations.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    brand: item.brand,
    category: item.category,
    imageUrl: item.imageUrls?.[0] || '',
    matchScore: item.matchScore,
    matchReasons: item.matchReasons
  }));
}

/**
 * Removes duplicate products based on ID
 */
function removeDuplicateProducts(products: ProductRecommendation[]): ProductRecommendation[] {
  const uniqueProductMap = new Map<string, ProductRecommendation>();
  
  products.forEach(product => {
    if (!uniqueProductMap.has(product.id)) {
      uniqueProductMap.set(product.id, product);
    }
  });

  return Array.from(uniqueProductMap.values());
}

/**
 * Calculates match score between outfit and product
 */
function calculateMatchScore(
  item: Partial<SocialProofItem>,
  product: ProductRecommendation,
  options: MatchingOptions
): number {
  let score = 0;
  let maxScore = 0;

  // Brand matching (optional)
  if (options.brandPriority && item.outfitTags?.some(tag => tag.includes(product.brand))) {
    score += 30;
  }
  maxScore += 30;

  // Color matching
  const productColors = extractColors(product.name);
  const outfitColors = item.colors || [];
  const colorMatches = outfitColors.filter(color => productColors.includes(color)).length;
  if (colorMatches > 0) {
    score += 25 * (colorMatches / Math.max(outfitColors.length, 1));
  }
  maxScore += 25;

  // Pattern matching
  const productPatterns = extractPatterns(product.description);
  const outfitPatterns = item.patterns || [];
  const patternMatches = outfitPatterns.filter(pattern => productPatterns.includes(pattern)).length;
  if (patternMatches > 0) {
    score += 20 * (patternMatches / Math.max(outfitPatterns.length, 1));
  }
  maxScore += 20;

  // Category/type matching
  if (item.outfitTags?.some(tag => tag.includes(product.category))) {
    score += 25;
  }
  maxScore += 25;

  // Normalize score to 0-1 range
  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Extracts colors from product name or description
 */
function extractColors(text: string): string[] {
  const colorKeywords = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink',
    'grey', 'brown', 'navy', 'burgundy', 'beige', 'cream', 'silver', 'gold'
  ];

  const colors: string[] = [];
  const lowerText = text.toLowerCase();

  colorKeywords.forEach(color => {
    if (lowerText.includes(color)) {
      colors.push(color);
    }
  });

  return colors;
}

/**
 * Extracts patterns from product description
 */
function extractPatterns(text: string): string[] {
  const patternKeywords = [
    'striped', 'floral', 'polka dot', 'plaid', 'leopard', 'zebra',
    'sequin', 'lace', 'mesh', 'leather', 'suede', 'silk', 'cotton',
    'oversized', 'fitted', 'cropped', 'high-waisted', 'low-cut'
  ];

  const patterns: string[] = [];
  const lowerText = text.toLowerCase();

  patternKeywords.forEach(pattern => {
    if (lowerText.includes(pattern)) {
      patterns.push(pattern);
    }
  });

  return patterns;
}

/**
 * Extracts category filters from search query
 */
function extractCategories(query: string): string[] {
  const categoryMap: { [key: string]: string } = {
    'dress': 'dresses',
    'gown': 'dresses',
    'suit': 'suits',
    'blazer': 'blazers',
    'jacket': 'jackets',
    'pants': 'pants',
    'trousers': 'pants',
    'skirt': 'skirts',
    'shirt': 'shirts',
    'blouse': 'shirts',
    'sweater': 'sweaters',
    'shoes': 'shoes',
    'boots': 'shoes',
    'heels': 'shoes',
    'sneakers': 'shoes',
    'bag': 'bags',
    'handbag': 'bags',
    'clutch': 'bags'
  };

  const categories: string[] = [];
  const lowerQuery = query.toLowerCase();

  Object.entries(categoryMap).forEach(([keyword, category]) => {
    if (lowerQuery.includes(keyword)) {
      categories.push(category);
    }
  });

  return [...new Set(categories)];
}

export default {
  matchSocialOutfits,
  findMatchingProducts,
  calculateMatchScore
};