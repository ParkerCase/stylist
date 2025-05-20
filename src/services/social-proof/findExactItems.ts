// findExactItems.ts
// Algorithm for finding exact items through brand and model matching

import { Recommendation } from '@/types';

export interface BrandIdentification {
  brandName: string;
  confidence: number;
  alternativeNames: string[];
  identifiedBy: 'text' | 'logo' | 'tag' | 'combined';
}

export interface ModelIdentification {
  modelName: string;
  productLine?: string;
  sku?: string;
  confidence: number;
}

export interface ExactMatchResult {
  item: Recommendation.RecommendationItem;
  exactMatch: boolean;
  confidence: number;
  brandMatch: boolean;
  brandConfidence: number;
  modelMatch: boolean;
  modelConfidence: number;
  matchDetails: string[];
  availabilityStatus: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  visualSimilarityScore?: number; // Added visual similarity score
  colorMatch?: boolean; // Color matching information
  patternMatch?: boolean; // Pattern matching information
  materialMatch?: boolean; // Material matching information
  sizeMatch?: number; // Percentage of size overlap
}

export interface FindExactOptions {
  searchExternal?: boolean;
  includeSimilarModels?: boolean;
  minConfidence?: number;
  includeOutOfStock?: boolean;
  prioritizeSameSizes?: boolean;
}

const DEFAULT_OPTIONS: FindExactOptions = {
  searchExternal: true,
  includeSimilarModels: false,
  minConfidence: 0.8,
  includeOutOfStock: true,
  prioritizeSameSizes: true
};

/**
 * Identify brand from product details
 */
export function identifyBrand(
  product: Recommendation.RecommendationItem,
  knownBrands: string[] = []
): BrandIdentification {
  // Start with the product's brand if available
  if (product.brand) {
    return {
      brandName: product.brand,
      confidence: 0.95,
      alternativeNames: [],
      identifiedBy: 'text'
    };
  }
  
  // Extract from name and description
  const productText = `${product.name} ${product.description || ''}`.toLowerCase();
  
  // Check for known brands in text
  for (const brand of knownBrands) {
    const brandLower = brand.toLowerCase();
    if (productText.includes(brandLower)) {
      return {
        brandName: brand,
        confidence: 0.8,
        alternativeNames: [],
        identifiedBy: 'text'
      };
    }
  }
  
  // Default response for when no brand is found
  return {
    brandName: 'Unknown',
    confidence: 0,
    alternativeNames: [],
    identifiedBy: 'text'
  };
}

/**
 * Identify product model from details
 */
export function identifyModel(
  product: Recommendation.RecommendationItem
): ModelIdentification {
  // Default result
  const defaultResult: ModelIdentification = {
    modelName: product.name,
    confidence: 0.5
  };
  
  // Extract potential model information from name and description
  const productName = product.name || '';
  const productDesc = product.description || '';
  
  // Look for model numbers/names that follow common patterns
  const modelPatterns = [
    /model\s*[#:]?\s*([a-z0-9\-_]+)/i,
    /style\s*[#:]?\s*([a-z0-9\-_]+)/i,
    /item\s*[#:]?\s*([a-z0-9\-_]+)/i,
    /sku\s*[#:]?\s*([a-z0-9\-_]+)/i,
    /([a-z0-9]{2,}\-[a-z0-9]{2,})/i // Looking for patterns like XX-1234
  ];
  
  // Check product description first for model info
  for (const pattern of modelPatterns) {
    const descMatch = productDesc.match(pattern);
    if (descMatch && descMatch[1]) {
      return {
        modelName: product.name,
        sku: descMatch[1],
        confidence: 0.85
      };
    }
  }
  
  // Then check product name
  for (const pattern of modelPatterns) {
    const nameMatch = productName.match(pattern);
    if (nameMatch && nameMatch[1]) {
      return {
        modelName: product.name,
        sku: nameMatch[1],
        confidence: 0.75
      };
    }
  }
  
  // If no specific model identifiers found, use the product name
  return defaultResult;
}

/**
 * Find exact matches for a product
 */
export async function findExactItems(
  referenceProduct: Recommendation.RecommendationItem,
  availableProducts: Recommendation.RecommendationItem[],
  knownBrands: string[] = [],
  options: FindExactOptions = {}
): Promise<ExactMatchResult[]> {
  // Merge with default options
  const mergedOptions: FindExactOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  // Identify brand and model of reference product
  const brandInfo = identifyBrand(referenceProduct, knownBrands);
  const modelInfo = identifyModel(referenceProduct);

  // Filter and score available products
  const results: ExactMatchResult[] = [];

  for (const product of availableProducts) {
    // Skip the reference product itself
    if (product.id === referenceProduct.id) continue;

    // Match brand
    const productBrandInfo = identifyBrand(product, knownBrands);
    const brandMatch = isBrandMatch(brandInfo, productBrandInfo);
    const brandConfidence = calculateBrandMatchConfidence(brandInfo, productBrandInfo);

    // Match model
    const productModelInfo = identifyModel(product);
    const modelMatch = isModelMatch(modelInfo, productModelInfo, mergedOptions.includeSimilarModels || false);
    const modelConfidence = calculateModelMatchConfidence(modelInfo, productModelInfo);

    // Calculate visual similarity score (new addition)
    const visualSimilarityScore = calculateVisualSimilarity(referenceProduct, product);

    // Check for color match
    const colorMatch = hasColorMatch(referenceProduct, product);

    // Check for pattern match
    const patternMatch = hasPatternMatch(referenceProduct, product);

    // Check for material match
    const materialMatch = hasMaterialMatch(referenceProduct, product);

    // Calculate size overlap
    const sizeMatch = referenceProduct.sizes && product.sizes ?
      calculateSizeOverlap(referenceProduct.sizes, product.sizes) : 0;

    // Determine overall match - now enhanced with visual similarity
    const isExactMatch = brandMatch && modelMatch;

    // Improved confidence calculation that includes visual similarity
    const baseConfidence = combinedMatchConfidence(brandConfidence, modelConfidence);
    const visualBoost = visualSimilarityScore * 0.15; // Visual similarity can boost confidence by up to 15%
    const confidence = Math.min(baseConfidence + visualBoost, 1.0);

    // Skip if below confidence threshold
    if (confidence < (mergedOptions.minConfidence || 0)) continue;

    // Skip if out of stock and option is set
    if (!mergedOptions.includeOutOfStock && !product.inStock) continue;

    // Generate enhanced match details
    const matchDetails = generateEnhancedMatchDetails(
      brandMatch, brandInfo, productBrandInfo,
      modelMatch, modelInfo, productModelInfo,
      colorMatch, patternMatch, materialMatch,
      visualSimilarityScore, sizeMatch
    );

    // Determine availability
    let availabilityStatus: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued' = 'out_of_stock';

    if (product.inStock) {
      const hasSizes = product.sizes && product.sizes.length > 0;

      if (hasSizes) {
        // Check if all sizes are in stock
        const allSizesAvailable = true; // Would need actual stock info per size
        availabilityStatus = allSizesAvailable ? 'in_stock' : 'limited';
      } else {
        availabilityStatus = 'in_stock';
      }
    } else {
      // If the product exists but is not in stock, it's not necessarily discontinued
      availabilityStatus = 'out_of_stock';
    }

    results.push({
      item: product,
      exactMatch: isExactMatch,
      confidence,
      brandMatch,
      brandConfidence,
      modelMatch,
      modelConfidence,
      matchDetails,
      availabilityStatus,
      visualSimilarityScore, // New fields for enhanced matching
      colorMatch,
      patternMatch,
      materialMatch,
      sizeMatch
    });
  }

  // Sort by confidence (descending)
  results.sort((a, b) => b.confidence - a.confidence);

  // If prioritizing same sizes and reference product has sizes, sort by size match
  if (mergedOptions.prioritizeSameSizes && referenceProduct.sizes && referenceProduct.sizes.length > 0) {
    results.sort((a, b) => {
      // Exact matches should always remain on top
      if (a.exactMatch !== b.exactMatch) {
        return a.exactMatch ? -1 : 1;
      }

      // Use the pre-calculated size match value
      const aSizeMatch = a.sizeMatch || 0;
      const bSizeMatch = b.sizeMatch || 0;

      return bSizeMatch - aSizeMatch;
    });
  }

  return results;
}

/**
 * Check if two brands match
 */
function isBrandMatch(
  brand1: BrandIdentification,
  brand2: BrandIdentification
): boolean {
  if (brand1.brandName.toLowerCase() === brand2.brandName.toLowerCase()) {
    return true;
  }
  
  // Check alternative names
  for (const alt1 of brand1.alternativeNames) {
    if (alt1.toLowerCase() === brand2.brandName.toLowerCase()) {
      return true;
    }
    
    for (const alt2 of brand2.alternativeNames) {
      if (alt1.toLowerCase() === alt2.toLowerCase()) {
        return true;
      }
    }
  }
  
  for (const alt2 of brand2.alternativeNames) {
    if (brand1.brandName.toLowerCase() === alt2.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate brand match confidence
 */
function calculateBrandMatchConfidence(
  brand1: BrandIdentification,
  brand2: BrandIdentification
): number {
  if (isBrandMatch(brand1, brand2)) {
    // Average the confidence levels of the two brand identifications
    return (brand1.confidence + brand2.confidence) / 2;
  }
  
  return 0;
}

/**
 * Check if two models match
 */
function isModelMatch(
  model1: ModelIdentification,
  model2: ModelIdentification,
  includeSimilar: boolean
): boolean {
  // If we have SKUs for both, compare them directly
  if (model1.sku && model2.sku) {
    if (model1.sku.toLowerCase() === model2.sku.toLowerCase()) {
      return true;
    }
  }
  
  // If names match exactly
  if (model1.modelName.toLowerCase() === model2.modelName.toLowerCase()) {
    return true;
  }
  
  // If similar models are included, check for partial matches
  if (includeSimilar) {
    // Check if model names share significant words
    const words1 = model1.modelName.toLowerCase().split(/\s+/);
    const words2 = model2.modelName.toLowerCase().split(/\s+/);
    
    // Get non-common words (like "the", "and", etc.)
    const common = ['the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at'];
    const significant1 = words1.filter(word => word.length > 3 && !common.includes(word));
    const significant2 = words2.filter(word => word.length > 3 && !common.includes(word));
    
    // Check for significant word overlap
    let matchCount = 0;
    for (const word1 of significant1) {
      if (significant2.includes(word1)) {
        matchCount++;
      }
    }
    
    const minWordsNeeded = Math.min(significant1.length, significant2.length) / 2;
    if (matchCount >= minWordsNeeded && matchCount >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate model match confidence
 */
function calculateModelMatchConfidence(
  model1: ModelIdentification,
  model2: ModelIdentification
): number {
  // If SKUs match exactly
  if (model1.sku && model2.sku && model1.sku.toLowerCase() === model2.sku.toLowerCase()) {
    return 0.95;
  }
  
  // If model names match exactly
  if (model1.modelName.toLowerCase() === model2.modelName.toLowerCase()) {
    return 0.9;
  }
  
  // Check for partial model name match
  const words1 = model1.modelName.toLowerCase().split(/\s+/);
  const words2 = model2.modelName.toLowerCase().split(/\s+/);
  
  // Get non-common words
  const common = ['the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at'];
  const significant1 = words1.filter(word => word.length > 3 && !common.includes(word));
  const significant2 = words2.filter(word => word.length > 3 && !common.includes(word));
  
  // Calculate overlap
  let matchCount = 0;
  for (const word1 of significant1) {
    if (significant2.includes(word1)) {
      matchCount++;
    }
  }
  
  if (significant1.length === 0 || significant2.length === 0) {
    return 0;
  }
  
  const overlapRatio = matchCount / Math.max(significant1.length, significant2.length);
  
  // Scale to confidence value based on overlap
  return overlapRatio * 0.85;
}

/**
 * Calculate combined match confidence
 */
function combinedMatchConfidence(
  brandConfidence: number,
  modelConfidence: number
): number {
  // Brand match is more important than model match
  const weightedBrand = brandConfidence * 0.6;
  const weightedModel = modelConfidence * 0.4;
  
  return weightedBrand + weightedModel;
}

/**
 * Calculate visual similarity between two products
 */
function calculateVisualSimilarity(
  product1: Recommendation.RecommendationItem,
  product2: Recommendation.RecommendationItem
): number {
  let similarityScore = 0;
  let totalFactors = 0;

  // 1. Compare colors (if available)
  if (product1.colors && product2.colors &&
      product1.colors.length > 0 && product2.colors.length > 0) {

    totalFactors++;
    const colorOverlap = calculateColorOverlap(product1.colors, product2.colors);
    similarityScore += colorOverlap;
  }

  // 2. Compare category
  if (product1.category && product2.category) {
    totalFactors++;

    if (product1.category === product2.category) {
      similarityScore += 1.0;
    } else {
      // Check for related categories
      const categorySimilarity = calculateCategorySimilarity(product1.category, product2.category);
      similarityScore += categorySimilarity;
    }
  }

  // 3. Compare product descriptions for materials and patterns (if available)
  if (product1.description && product2.description) {
    // Extract materials
    const materials1 = extractMaterials(product1.description);
    const materials2 = extractMaterials(product2.description);

    if (materials1.length > 0 && materials2.length > 0) {
      totalFactors++;
      const materialOverlap = calculateArrayOverlap(materials1, materials2);
      similarityScore += materialOverlap;
    }

    // Extract patterns
    const patterns1 = extractPatterns(product1.description);
    const patterns2 = extractPatterns(product2.description);

    if (patterns1.length > 0 && patterns2.length > 0) {
      totalFactors++;
      const patternOverlap = calculateArrayOverlap(patterns1, patterns2);
      similarityScore += patternOverlap;
    }
  }

  // 4. Image similarity would be ideal but not implemented here
  // In a real implementation, this would use computer vision APIs

  // Calculate final score
  return totalFactors > 0 ? similarityScore / totalFactors : 0;
}

/**
 * Calculate the overlap between two color arrays
 */
function calculateColorOverlap(colors1: string[], colors2: string[]): number {
  // Normalize colors
  const normalizedColors1 = colors1.map(c => c.toLowerCase());
  const normalizedColors2 = colors2.map(c => c.toLowerCase());

  // Direct overlap
  const directOverlap = normalizedColors1.filter(c => normalizedColors2.includes(c)).length;

  // Check for similar colors
  let similarityCount = 0;

  for (const color1 of normalizedColors1) {
    for (const color2 of normalizedColors2) {
      if (color1 !== color2 && areSimilarColors(color1, color2)) {
        similarityCount++;
      }
    }
  }

  // Calculate overlap score (0-1)
  const totalPossibleMatches = Math.max(normalizedColors1.length, normalizedColors2.length);

  if (totalPossibleMatches === 0) return 0;

  // Direct matches count full, similar colors count partially
  return Math.min((directOverlap + similarityCount * 0.5) / totalPossibleMatches, 1);
}

/**
 * Check if two products have matching colors
 */
function hasColorMatch(
  product1: Recommendation.RecommendationItem,
  product2: Recommendation.RecommendationItem
): boolean {
  if (!product1.colors || !product2.colors ||
      product1.colors.length === 0 || product2.colors.length === 0) {
    return false;
  }

  const normalizedColors1 = product1.colors.map(c => c.toLowerCase());
  const normalizedColors2 = product2.colors.map(c => c.toLowerCase());

  // Check for exact color matches
  for (const color1 of normalizedColors1) {
    if (normalizedColors2.includes(color1)) {
      return true;
    }
  }

  // Check for similar colors
  for (const color1 of normalizedColors1) {
    for (const color2 of normalizedColors2) {
      if (areSimilarColors(color1, color2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two products have matching patterns
 */
function hasPatternMatch(
  product1: Recommendation.RecommendationItem,
  product2: Recommendation.RecommendationItem
): boolean {
  // Extract patterns from name and description
  const patterns1: string[] = [];
  const patterns2: string[] = [];

  if (product1.description) {
    patterns1.push(...extractPatterns(product1.description));
  }
  if (product1.name) {
    patterns1.push(...extractPatterns(product1.name));
  }

  if (product2.description) {
    patterns2.push(...extractPatterns(product2.description));
  }
  if (product2.name) {
    patterns2.push(...extractPatterns(product2.name));
  }

  if (patterns1.length === 0 || patterns2.length === 0) {
    return false;
  }

  // Check for pattern matches
  for (const pattern1 of patterns1) {
    if (patterns2.includes(pattern1)) {
      return true;
    }

    // Check for similar patterns
    for (const pattern2 of patterns2) {
      if (areSimilarPatterns(pattern1, pattern2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two materials are similar
 */
function areSimilarPatterns(pattern1: string, pattern2: string): boolean {
  if (pattern1 === pattern2) return true;

  const patternGroups = [
    ['striped', 'stripes', 'pinstripe'],
    ['floral', 'flower', 'botanical'],
    ['polka dot', 'dotted', 'polka dots'],
    ['plaid', 'checkered', 'check', 'gingham', 'tartan'],
    ['animal print', 'leopard', 'zebra', 'snake'],
    ['geometric', 'abstract'],
    ['paisley', 'medallion']
  ];

  return patternGroups.some(group =>
    group.includes(pattern1.toLowerCase()) && group.includes(pattern2.toLowerCase())
  );
}

/**
 * Extract patterns from text
 */
function extractPatterns(text: string): string[] {
  const patternKeywords = [
    'striped', 'stripes', 'floral', 'polka dot', 'dotted', 'plaid', 'checkered',
    'leopard', 'zebra', 'print', 'geometric', 'paisley', 'tartan', 'gingham'
  ];

  const lowerText = text.toLowerCase();
  return patternKeywords.filter(pattern => lowerText.includes(pattern));
}

/**
 * Extract materials from text
 */
function extractMaterials(text: string): string[] {
  const materialKeywords = [
    'cotton', 'silk', 'linen', 'wool', 'cashmere', 'leather', 'suede',
    'denim', 'velvet', 'satin', 'polyester', 'nylon', 'spandex', 'lycra'
  ];

  const lowerText = text.toLowerCase();
  return materialKeywords.filter(material => lowerText.includes(material));
}

/**
 * Check if two products have matching materials
 */
function hasMaterialMatch(
  product1: Recommendation.RecommendationItem,
  product2: Recommendation.RecommendationItem
): boolean {
  // Extract materials from description
  const materials1: string[] = [];
  const materials2: string[] = [];

  if (product1.description) {
    materials1.push(...extractMaterials(product1.description));
  }
  if (product1.name) {
    materials1.push(...extractMaterials(product1.name));
  }

  if (product2.description) {
    materials2.push(...extractMaterials(product2.description));
  }
  if (product2.name) {
    materials2.push(...extractMaterials(product2.name));
  }

  if (materials1.length === 0 || materials2.length === 0) {
    return false;
  }

  // Check for material matches
  for (const material1 of materials1) {
    if (materials2.includes(material1)) {
      return true;
    }

    // Check for similar materials
    for (const material2 of materials2) {
      if (areSimilarMaterials(material1, material2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two materials are similar
 */
function areSimilarMaterials(material1: string, material2: string): boolean {
  if (material1 === material2) return true;

  const materialGroups = [
    ['cotton', 'jersey'],
    ['silk', 'satin'],
    ['wool', 'cashmere'],
    ['leather', 'suede'],
    ['polyester', 'nylon', 'synthetic'],
    ['spandex', 'lycra', 'elastane']
  ];

  return materialGroups.some(group =>
    group.includes(material1.toLowerCase()) && group.includes(material2.toLowerCase())
  );
}

/**
 * Check if two colors are similar
 */
function areSimilarColors(color1: string, color2: string): boolean {
  if (color1 === color2) return true;
  
  const colorGroups = [
    ['black', 'charcoal', 'jet', 'onyx'],
    ['white', 'ivory', 'cream', 'off-white', 'eggshell'],
    ['red', 'maroon', 'crimson', 'scarlet', 'ruby', 'burgundy'],
    ['blue', 'navy', 'royal blue', 'sky blue', 'teal', 'aqua', 'turquoise'],
    ['green', 'olive', 'forest green', 'mint', 'emerald', 'sage'],
    ['yellow', 'gold', 'mustard', 'amber', 'lemon'],
    ['purple', 'violet', 'lavender', 'plum', 'lilac', 'mauve'],
    ['pink', 'rose', 'fuchsia', 'magenta', 'coral'],
    ['grey', 'gray', 'silver', 'slate', 'charcoal'],
    ['brown', 'tan', 'khaki', 'beige', 'camel', 'taupe']
  ];
  
  return colorGroups.some(group => 
    group.includes(color1.toLowerCase()) && group.includes(color2.toLowerCase())
  );
}

/**
 * Calculate overlap between two arrays
 */
function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map(item => item.toLowerCase()));
  const set2 = new Set(arr2.map(item => item.toLowerCase()));

  // Find intersection
  const intersection = [...set1].filter(item => set2.has(item));

  // Calculate overlap ratio (Jaccard similarity)
  return intersection.length / Math.max(set1.size, set2.size);
}

/**
 * Calculate category similarity
 */
function calculateCategorySimilarity(category1: string, category2: string): number {
  if (category1 === category2) return 1.0;

  // If categories are in the same group, return high similarity
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

  for (const group of categoryGroups) {
    if (group.includes(category1.toLowerCase()) && group.includes(category2.toLowerCase())) {
      return 0.85;
    }
  }

  return 0;
}

/**
 * Generate enhanced human-readable match details
 */
function generateEnhancedMatchDetails(
  brandMatch: boolean,
  brand1: BrandIdentification,
  brand2: BrandIdentification,
  modelMatch: boolean,
  model1: ModelIdentification,
  model2: ModelIdentification,
  colorMatch: boolean,
  patternMatch: boolean,
  materialMatch: boolean,
  visualSimilarityScore: number,
  sizeMatch: number
): string[] {
  const details: string[] = [];

  // Brand match details
  if (brandMatch) {
    details.push(`Same brand: ${brand1.brandName}`);
  } else {
    details.push(`Different brand: ${brand2.brandName} (not ${brand1.brandName})`);
  }

  // Model match details
  if (modelMatch) {
    if (model1.sku && model2.sku && model1.sku === model2.sku) {
      details.push(`Exact SKU match: ${model1.sku}`);
    } else {
      details.push(`Matching model: ${model2.modelName}`);
    }
  } else if (model1.modelName !== model2.modelName) {
    details.push(`Similar model name`);

    // Check for similar colors, styles, etc.
    const words1 = model1.modelName.toLowerCase().split(/\s+/);
    const words2 = model2.modelName.toLowerCase().split(/\s+/);

    // Check for color differences
    const colorKeywords = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'grey', 'brown', 'beige'];

    const colors1 = words1.filter(word => colorKeywords.includes(word));
    const colors2 = words2.filter(word => colorKeywords.includes(word));

    if (colors1.length > 0 && colors2.length > 0 && !arraysHaveOverlap(colors1, colors2)) {
      details.push(`Different color: ${colors2.join(', ')} (not ${colors1.join(', ')})`);
    }
  }

  // Add visual similarity details
  if (visualSimilarityScore > 0.8) {
    details.push(`Very similar appearance (${Math.round(visualSimilarityScore * 100)}% visual match)`);
  } else if (visualSimilarityScore > 0.6) {
    details.push(`Similar appearance (${Math.round(visualSimilarityScore * 100)}% visual match)`);
  } else if (visualSimilarityScore > 0.4) {
    details.push(`Somewhat similar appearance (${Math.round(visualSimilarityScore * 100)}% visual match)`);
  }

  // Add specific attribute matches
  if (colorMatch) {
    details.push("Matching colors");
  }

  if (patternMatch) {
    details.push("Matching pattern");
  }

  if (materialMatch) {
    details.push("Same material");
  }

  // Add size match information
  if (sizeMatch > 0) {
    if (sizeMatch >= 0.8) {
      details.push(`Excellent size availability match (${Math.round(sizeMatch * 100)}%)`);
    } else if (sizeMatch >= 0.5) {
      details.push(`Good size availability match (${Math.round(sizeMatch * 100)}%)`);
    } else {
      details.push(`Limited size availability match (${Math.round(sizeMatch * 100)}%)`);
    }
  }

  return details;
}

/**
 * Calculate size overlap percentage
 */
function calculateSizeOverlap(sizes1: string[], sizes2: string[]): number {
  if (sizes1.length === 0 || sizes2.length === 0) {
    return 0;
  }
  
  // Normalize size values
  const normalizedSizes1 = sizes1.map(size => normalizeSize(size));
  const normalizedSizes2 = sizes2.map(size => normalizeSize(size));
  
  // Count matching sizes
  let matchCount = 0;
  for (const size1 of normalizedSizes1) {
    if (normalizedSizes2.includes(size1)) {
      matchCount++;
    }
  }
  
  // Return percentage of overlap
  return matchCount / Math.max(normalizedSizes1.length, normalizedSizes2.length);
}

/**
 * Normalize size value for comparison
 */
function normalizeSize(size: string): string {
  // Remove whitespace and convert to lowercase
  let normalized = size.trim().toLowerCase();
  
  // Handle special cases
  if (['extra small', 'x-small', 'xsmall'].includes(normalized)) {
    return 'xs';
  } else if (['extra large', 'x-large', 'xlarge'].includes(normalized)) {
    return 'xl';
  } else if (['xx-large', 'xxlarge', '2xlarge', '2x-large'].includes(normalized)) {
    return 'xxl';
  } else if (['small', 'sm'].includes(normalized)) {
    return 's';
  } else if (['medium', 'med'].includes(normalized)) {
    return 'm';
  } else if (['large', 'lg'].includes(normalized)) {
    return 'l';
  }
  
  return normalized;
}

/**
 * Check if arrays have any overlapping elements
 */
function arraysHaveOverlap(arr1: any[], arr2: any[]): boolean {
  return arr1.some(item => arr2.includes(item));
}

export default {
  findExactItems,
  identifyBrand,
  identifyModel
};