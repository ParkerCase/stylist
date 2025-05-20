// findSimilarItems.ts
// Algorithm for finding similar items based on style attributes

import { Recommendation } from '@/types';
import { SocialProofItem, ProductRecommendation } from '../../services/social-proof/types';

export interface StyleAttribute {
  type: 'color' | 'pattern' | 'material' | 'category' | 'brand' | 'silhouette' | 'detail';
  value: string;
  weight: number; // 0-1 weight for matching importance
}

export interface FindSimilarOptions {
  maxResults?: number;
  minMatchScore?: number;
  includeOutOfStock?: boolean;
  priceRange?: {
    min?: number;
    max?: number;
  };
  prioritizeAttributes?: Array<'color' | 'pattern' | 'material' | 'category' | 'brand' | 'silhouette' | 'detail'>;
  retailerRestriction?: 'current' | 'all';
}

const DEFAULT_OPTIONS: FindSimilarOptions = {
  maxResults: 15,
  minMatchScore: 0.5,
  includeOutOfStock: false,
  retailerRestriction: 'current'
};

/**
 * Extracts style attributes from product
 */
export function extractStyleAttributes(product: Recommendation.RecommendationItem): StyleAttribute[] {
  const attributes: StyleAttribute[] = [];
  
  // Extract category with high weight
  if (product.category) {
    attributes.push({
      type: 'category',
      value: product.category.toLowerCase(),
      weight: 0.9
    });
  }
  
  // Extract brand with medium weight
  if (product.brand) {
    attributes.push({
      type: 'brand',
      value: product.brand.toLowerCase(),
      weight: 0.6
    });
  }
  
  // Extract colors with high weight
  if (product.colors && product.colors.length) {
    product.colors.forEach(color => {
      attributes.push({
        type: 'color',
        value: color.toLowerCase(),
        weight: 0.8
      });
    });
  }
  
  // Extract patterns and materials from name and description
  const patterns = extractPatterns(product.name + ' ' + (product.description || ''));
  patterns.forEach(pattern => {
    attributes.push({
      type: 'pattern',
      value: pattern,
      weight: 0.7
    });
  });
  
  const materials = extractMaterials(product.name + ' ' + (product.description || ''));
  materials.forEach(material => {
    attributes.push({
      type: 'material',
      value: material,
      weight: 0.65
    });
  });
  
  // Extract silhouettes from name and description
  const silhouettes = extractSilhouettes(product.name + ' ' + (product.description || ''));
  silhouettes.forEach(silhouette => {
    attributes.push({
      type: 'silhouette',
      value: silhouette,
      weight: 0.75
    });
  });
  
  // Extract details from name and description
  const details = extractDetails(product.name + ' ' + (product.description || ''));
  details.forEach(detail => {
    attributes.push({
      type: 'detail',
      value: detail,
      weight: 0.6
    });
  });
  
  return attributes;
}

/**
 * Find similar items to a reference product
 */
export async function findSimilarItems(
  referenceProduct: Recommendation.RecommendationItem,
  availableProducts: Recommendation.RecommendationItem[],
  options: FindSimilarOptions = {}
): Promise<Recommendation.RecommendationItem[]> {
  // Merge with default options
  const mergedOptions: FindSimilarOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  // Extract style attributes from reference product
  const referenceAttributes = extractStyleAttributes(referenceProduct);
  
  // Filter available products
  let filteredProducts = [...availableProducts];
  
  // Filter out the reference product itself
  filteredProducts = filteredProducts.filter(product => product.id !== referenceProduct.id);
  
  // Apply price range filter if specified
  if (mergedOptions.priceRange) {
    if (mergedOptions.priceRange.min !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.price >= mergedOptions.priceRange!.min!
      );
    }
    
    if (mergedOptions.priceRange.max !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.price <= mergedOptions.priceRange!.max!
      );
    }
  }
  
  // Filter out of stock items if specified
  if (!mergedOptions.includeOutOfStock) {
    filteredProducts = filteredProducts.filter(product => product.inStock);
  }
  
  // Filter by retailer if specified
  if (mergedOptions.retailerRestriction === 'current' && referenceProduct.retailerId) {
    filteredProducts = filteredProducts.filter(product => 
      product.retailerId === referenceProduct.retailerId
    );
  }
  
  // Score each product by similarity
  const scoredProducts = filteredProducts.map(product => {
    const attributes = extractStyleAttributes(product);
    const score = calculateSimilarityScore(referenceAttributes, attributes, mergedOptions.prioritizeAttributes);
    
    return {
      ...product,
      matchScore: Math.round(score * 100),
      matchReasons: generateMatchReasons(referenceAttributes, attributes)
    };
  });
  
  // Filter by minimum match score
  const matchingProducts = scoredProducts.filter(
    product => (product.matchScore || 0) >= (mergedOptions.minMatchScore || 0) * 100
  );
  
  // Sort by score (descending) and limit results
  const sortedProducts = matchingProducts
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, mergedOptions.maxResults);
  
  return sortedProducts;
}

/**
 * Calculate similarity score between two sets of attributes
 */
function calculateSimilarityScore(
  referenceAttributes: StyleAttribute[],
  targetAttributes: StyleAttribute[],
  priorityTypes?: Array<'color' | 'pattern' | 'material' | 'category' | 'brand' | 'silhouette' | 'detail'>
): number {
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Apply priority multipliers if specified
  const getPriorityMultiplier = (type: string): number => {
    if (!priorityTypes || priorityTypes.length === 0) return 1;
    return priorityTypes.includes(type as any) ? 1.5 : 0.75;
  };
  
  // Score each reference attribute
  referenceAttributes.forEach(refAttr => {
    // Apply priority multiplier to weight
    const adjustedWeight = refAttr.weight * getPriorityMultiplier(refAttr.type);
    maxPossibleScore += adjustedWeight;
    
    // Look for matching attributes in target
    let bestMatch = 0;
    
    targetAttributes.forEach(targetAttr => {
      if (refAttr.type === targetAttr.type) {
        // For exact value match
        if (refAttr.value === targetAttr.value) {
          bestMatch = 1;
        } 
        // For partial word matches
        else if (refAttr.value.includes(targetAttr.value) || targetAttr.value.includes(refAttr.value)) {
          bestMatch = Math.max(bestMatch, 0.7);
        }
        // For category similarity
        else if (refAttr.type === 'category' && areSimilarCategories(refAttr.value, targetAttr.value)) {
          bestMatch = Math.max(bestMatch, 0.8);
        }
        // For color similarity
        else if (refAttr.type === 'color' && areSimilarColors(refAttr.value, targetAttr.value)) {
          bestMatch = Math.max(bestMatch, 0.75);
        }
      }
    });
    
    totalScore += bestMatch * adjustedWeight;
  });
  
  // Normalize score to 0-1 range
  return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
}

/**
 * Generate human-readable reasons for the match
 */
function generateMatchReasons(
  referenceAttributes: StyleAttribute[],
  targetAttributes: StyleAttribute[]
): string[] {
  const reasons: string[] = [];
  const matchedTypes = new Set<string>();
  
  // Check for category matches
  const refCategories = referenceAttributes.filter(attr => attr.type === 'category');
  const targetCategories = targetAttributes.filter(attr => attr.type === 'category');
  
  if (refCategories.length > 0 && targetCategories.length > 0) {
    const refCategory = refCategories[0].value;
    const targetCategory = targetCategories[0].value;
    
    if (refCategory === targetCategory) {
      reasons.push(`Same ${refCategory} category`);
      matchedTypes.add('category');
    } else if (areSimilarCategories(refCategory, targetCategory)) {
      reasons.push(`Similar category type`);
      matchedTypes.add('category');
    }
  }
  
  // Check for color matches
  const refColors = referenceAttributes.filter(attr => attr.type === 'color');
  const targetColors = targetAttributes.filter(attr => attr.type === 'color');
  
  const matchedColors = refColors.filter(refColor => 
    targetColors.some(targetColor => 
      refColor.value === targetColor.value || areSimilarColors(refColor.value, targetColor.value)
    )
  );
  
  if (matchedColors.length > 0) {
    if (matchedColors.length === 1) {
      reasons.push(`Matching ${matchedColors[0].value} color`);
    } else if (matchedColors.length > 1) {
      reasons.push(`Matching color palette`);
    }
    matchedTypes.add('color');
  }
  
  // Check for pattern matches
  const refPatterns = referenceAttributes.filter(attr => attr.type === 'pattern');
  const targetPatterns = targetAttributes.filter(attr => attr.type === 'pattern');
  
  const matchedPatterns = refPatterns.filter(refPattern => 
    targetPatterns.some(targetPattern => refPattern.value === targetPattern.value)
  );
  
  if (matchedPatterns.length > 0) {
    reasons.push(`Similar ${matchedPatterns[0].value} pattern`);
    matchedTypes.add('pattern');
  }
  
  // Check for material matches
  const refMaterials = referenceAttributes.filter(attr => attr.type === 'material');
  const targetMaterials = targetAttributes.filter(attr => attr.type === 'material');
  
  const matchedMaterials = refMaterials.filter(refMaterial => 
    targetMaterials.some(targetMaterial => refMaterial.value === targetMaterial.value)
  );
  
  if (matchedMaterials.length > 0) {
    reasons.push(`Made with ${matchedMaterials[0].value}`);
    matchedTypes.add('material');
  }
  
  // Check for brand matches
  const refBrands = referenceAttributes.filter(attr => attr.type === 'brand');
  const targetBrands = targetAttributes.filter(attr => attr.type === 'brand');
  
  if (refBrands.length > 0 && targetBrands.length > 0 && refBrands[0].value === targetBrands[0].value) {
    reasons.push(`Same brand: ${refBrands[0].value}`);
    matchedTypes.add('brand');
  }
  
  // Check for silhouette matches
  const refSilhouettes = referenceAttributes.filter(attr => attr.type === 'silhouette');
  const targetSilhouettes = targetAttributes.filter(attr => attr.type === 'silhouette');
  
  const matchedSilhouettes = refSilhouettes.filter(refSilhouette => 
    targetSilhouettes.some(targetSilhouette => refSilhouette.value === targetSilhouette.value)
  );
  
  if (matchedSilhouettes.length > 0) {
    reasons.push(`Similar ${matchedSilhouettes[0].value} silhouette`);
    matchedTypes.add('silhouette');
  }
  
  // If we have very few specific reasons, add a general one
  if (reasons.length < 2) {
    const unmatchedTypes = ['style', 'look', 'design', 'aesthetic'].filter(type => !matchedTypes.has(type));
    if (unmatchedTypes.length > 0) {
      reasons.push(`Similar overall ${unmatchedTypes[0]}`);
    }
  }
  
  return reasons;
}

/**
 * Extract patterns from text
 */
function extractPatterns(text: string): string[] {
  const patternKeywords = [
    'striped', 'floral', 'polka dot', 'plaid', 'checkered', 'leopard', 
    'zebra', 'sequin', 'lace', 'mesh', 'print', 'graphic', 'tie-dye', 
    'geometric', 'paisley', 'herringbone', 'argyle', 'houndstooth'
  ];
  
  return extractKeywordsFromText(text, patternKeywords);
}

/**
 * Extract materials from text
 */
function extractMaterials(text: string): string[] {
  const materialKeywords = [
    'cotton', 'silk', 'linen', 'wool', 'cashmere', 'leather', 'suede', 
    'denim', 'velvet', 'satin', 'polyester', 'nylon', 'spandex', 'lycra', 
    'tweed', 'jersey', 'chiffon', 'corduroy', 'fleece', 'twill', 'canvas'
  ];
  
  return extractKeywordsFromText(text, materialKeywords);
}

/**
 * Extract silhouettes from text
 */
function extractSilhouettes(text: string): string[] {
  const silhouetteKeywords = [
    'oversized', 'fitted', 'slim-fit', 'relaxed', 'straight', 'cropped', 
    'high-waisted', 'low-rise', 'flared', 'bootcut', 'skinny', 'wide-leg', 
    'boyfriend', 'a-line', 'bodycon', 'shift', 'empire', 'wrap', 'pleated', 
    'peplum', 'pencil', 'maxi', 'midi', 'mini', 'boxy', 'tapered'
  ];
  
  return extractKeywordsFromText(text, silhouetteKeywords);
}

/**
 * Extract details from text
 */
function extractDetails(text: string): string[] {
  const detailKeywords = [
    'button', 'zipper', 'pocket', 'collar', 'v-neck', 'crew-neck', 'turtleneck', 
    'scoop-neck', 'off-shoulder', 'sleeveless', 'short-sleeve', 'long-sleeve', 
    'ruffle', 'frill', 'embroidery', 'beaded', 'embellished', 'ribbed', 'distressed', 
    'washed', 'frayed', 'raw-hem', 'cuffed', 'tassel', 'bow', 'tie-front', 'belted'
  ];
  
  return extractKeywordsFromText(text, detailKeywords);
}

/**
 * Extract keywords from text
 */
function extractKeywordsFromText(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      found.push(keyword);
    }
  });
  
  return found;
}

/**
 * Check if two categories are similar
 */
function areSimilarCategories(category1: string, category2: string): boolean {
  const categoryGroups = [
    ['dress', 'dresses', 'gown', 'gowns'],
    ['top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses', 'tee', 't-shirt'],
    ['pants', 'trousers', 'jeans', 'shorts', 'leggings'],
    ['skirt', 'skirts'],
    ['suit', 'suits', 'blazer', 'blazers', 'jacket', 'jackets'],
    ['sweater', 'sweaters', 'sweatshirt', 'hoodie', 'cardigan'],
    ['coat', 'coats', 'outerwear'],
    ['shoe', 'shoes', 'boots', 'sneakers', 'sandals', 'heels'],
    ['bag', 'bags', 'handbag', 'purse', 'backpack', 'tote'],
    ['accessory', 'accessories', 'jewelry', 'scarf', 'hat', 'gloves']
  ];
  
  // Check if categories are in the same group
  return categoryGroups.some(group => 
    group.includes(category1) && group.includes(category2)
  );
}

/**
 * Check if two colors are similar
 */
function areSimilarColors(color1: string, color2: string): boolean {
  const colorGroups = [
    ['black', 'charcoal'],
    ['white', 'off-white', 'ivory', 'cream'],
    ['red', 'burgundy', 'maroon', 'crimson', 'scarlet'],
    ['blue', 'navy', 'cobalt', 'teal', 'turquoise'],
    ['green', 'olive', 'emerald', 'forest', 'mint'],
    ['yellow', 'gold', 'mustard'],
    ['purple', 'lavender', 'violet', 'plum'],
    ['pink', 'rose', 'fuchsia', 'coral'],
    ['grey', 'gray', 'silver'],
    ['brown', 'tan', 'beige', 'camel', 'khaki']
  ];
  
  // Check if colors are in the same group
  return colorGroups.some(group => 
    group.includes(color1) && group.includes(color2)
  );
}

export default {
  findSimilarItems,
  extractStyleAttributes
};