/**
 * Enhanced celebrity name extraction and outfit parsing utilities for WhoWhatWear scraper
 * Used to improve precision and reduce false positives in social proof extraction
 */

import { celebrityNames } from './data/celebrityNames';

// Product category words that should be filtered out to avoid false positives
const PRODUCT_WORDS = [
  // Generic product types
  'shopping', 'trends', 'trending', 'pieces', 'essentials', 'basics', 'items',
  'wardrobe', 'closet', 'collection', 'clothes', 'clothing', 'fashion', 'outfit',
  'accessories', 'recommendations', 'picks', 'editor', 'must-have', 'guide',
  
  // Marketing language
  'best', 'favorite', 'affordable', 'expensive', 'cheap', 'designer', 'luxury',
  'discount', 'sale', 'ordering', 'shopping', 'holiday', 'editorial',
  'lookbook', 'buying', 'selling', 'gifts', 'gifting', 'buying',
  
  // Seasons/occasions
  'summer', 'winter', 'spring', 'fall', 'wedding', 'vacation', 'holiday',
  'office', 'work', 'weekend', 'party', 'evening', 'daytime', 'seasonal'
];

// Specific garment types to extract from outfit descriptions
export const GARMENT_TYPES = {
  tops: [
    'top', 'shirt', 'blouse', 't-shirt', 'tee', 'tank top', 'tank', 'camisole',
    'sweater', 'sweatshirt', 'hoodie', 'cardigan', 'turtleneck', 'tunic', 'crop top',
    'button-down', 'button-up', 'vest', 'polo'
  ],
  bottoms: [
    'pants', 'jeans', 'trousers', 'slacks', 'skirt', 'shorts', 'leggings', 
    'culottes', 'chinos', 'joggers', 'sweatpants', 'skinny jeans', 'boyfriend jeans',
    'wide-leg pants', 'bell bottoms', 'flare jeans', 'capri pants', 'cargo pants'
  ],
  dresses: [
    'dress', 'gown', 'maxi dress', 'mini dress', 'midi dress', 'slip dress',
    'bodycon dress', 'a-line dress', 'shift dress', 'wrap dress', 'evening gown',
    'cocktail dress', 'sheath dress', 'sundress', 'shirtdress', 'jumpsuit', 'romper'
  ],
  outerwear: [
    'jacket', 'coat', 'blazer', 'cardigan', 'trench coat', 'parka', 'peacoat',
    'denim jacket', 'leather jacket', 'bomber jacket', 'windbreaker', 'cape',
    'poncho', 'raincoat', 'overcoat', 'puffer'
  ],
  shoes: [
    'shoes', 'boots', 'heels', 'sneakers', 'sandals', 'flats', 'loafers', 'pumps',
    'ankle boots', 'knee-high boots', 'combat boots', 'stilettos', 'mules', 'clogs',
    'wedges', 'espadrilles', 'oxfords', 'slippers', 'platforms'
  ],
  accessories: [
    'bag', 'purse', 'handbag', 'clutch', 'tote', 'backpack', 'satchel', 'crossbody',
    'shoulder bag', 'jewelry', 'necklace', 'earrings', 'bracelet', 'ring', 'watch',
    'sunglasses', 'hat', 'cap', 'beanie', 'scarf', 'belt', 'gloves', 'headband'
  ]
};

// Verbs and phrases that indicate someone wore something
const CELEBRITY_ACTION_WORDS = [
  'wore', 'spotted', 'seen in', 'dressed in', 'stepped out in', 'donned', 'sported',
  'rocked', 'arrived in', 'attended', 'styled', 'showcased', 'flaunted', 'modeled',
  'paired', 'matched', 'accessorized', 'coordinated', 'complemented', 'elevated',
  'draped', 'layered', 'appeared', 'demonstrated', 'proved', 'shows'
];

// Common adjectives used to describe fashion items
export const STYLE_ADJECTIVES = [
  // Colors already covered in a separate list

  // Patterns
  'striped', 'plaid', 'checked', 'checkered', 'polka dot', 'floral', 'animal print',
  'leopard', 'zebra', 'snakeskin', 'geometric', 'abstract', 'graphic', 'solid',
  'printed', 'embroidered', 'sequined', 'beaded', 'studded', 'textured',

  // Styles
  'casual', 'formal', 'elegant', 'chic', 'bohemian', 'boho', 'vintage', 'retro',
  'preppy', 'edgy', 'grunge', 'minimalist', 'maximalist', 'classic', 'trendy',
  'streetwear', 'athleisure', 'sporty', 'sophisticated', 'glamorous', 'punk',
  'feminine', 'masculine', 'androgynous', 'festival', 'vacation', 'business',
  'workwear', 'cocktail', 'black tie', 'evening', 'bridal',

  // Fits/silhouettes
  'oversized', 'baggy', 'loose', 'fitted', 'slim', 'skinny', 'tight', 'cropped',
  'high-waisted', 'low-rise', 'flared', 'straight-leg', 'wide-leg', 'bootcut',
  'relaxed', 'structured', 'tailored', 'unstructured', 'boyfriend', 'boxy',
  'bodycon', 'a-line', 'empire', 'drop-waist', 'peplum', 'pencil',

  // Materials/fabrics
  'cotton', 'linen', 'silk', 'satin', 'velvet', 'wool', 'cashmere', 'leather',
  'suede', 'denim', 'knit', 'knitted', 'crochet', 'mesh', 'lace', 'chiffon',
  'jersey', 'tweed', 'corduroy', 'nylon', 'polyester', 'spandex', 'lycra',
  'twill', 'canvas', 'chambray', 'flannel', 'fleece'
];

// Common color terms in fashion
export const COLORS = [
  // Basic colors
  'black', 'white', 'gray', 'grey', 'red', 'orange', 'yellow', 'green', 'blue',
  'purple', 'pink', 'brown', 'tan', 'beige', 'cream', 'ivory',
  
  // Specific colors
  'navy', 'teal', 'turquoise', 'aqua', 'mint', 'lime', 'olive', 'forest green',
  'emerald', 'sage', 'burgundy', 'maroon', 'crimson', 'scarlet', 'magenta',
  'fuchsia', 'hot pink', 'coral', 'salmon', 'peach', 'rust', 'copper',
  'bronze', 'gold', 'silver', 'metallic', 'lavender', 'lilac', 'violet',
  'mauve', 'plum', 'indigo', 'cobalt', 'royal blue', 'sky blue', 'baby blue',
  'khaki', 'camel', 'taupe', 'chocolate', 'charcoal', 'off-white'
];

// Scoring system for potential celebrity matches
interface CelebrityMatch {
  name: string;
  score: number;
  matchMethod: string;
}

/**
 * Enhanced celebrity name extraction with better filtering and prioritization
 * Reduces false positives and improves precision
 * 
 * @param element The DOM element to extract from
 * @param elementText The text content to analyze
 * @param celebrityList List of known celebrity names (optional, defaults to the internal list)
 * @returns The extracted celebrity name, or empty string if none found
 */
export function extractCelebrityName(
  element: Element, 
  elementText: string, 
  celebrityList: string[] = celebrityNames
): string {
  const matches: CelebrityMatch[] = [];
  const lowerText = elementText.toLowerCase();
  
  // Check if this appears to be a product-focused article, not celebrity focused
  if (isProbablyProductArticle(elementText)) {
    // Apply stricter matching for product-focused content
    // Only exact matches from celebrity list will be considered
    const exactMatch = findExactCelebrityMatch(elementText, celebrityList);
    return exactMatch || '';
  }
  
  // STRATEGY 1: Exact matches with celebrity list (highest priority)
  for (const celeb of celebrityList) {
    // Check for exact match of full name (with word boundaries)
    const exactRegex = new RegExp(`\\b${celeb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (exactRegex.test(elementText)) {
      matches.push({
        name: celeb,
        score: 1.0, // Perfect score for exact match
        matchMethod: 'exact_match'
      });
    }
  }
  
  // If we have exact matches, return the highest-scoring one
  if (matches.length > 0) {
    return getBestMatch(matches).name;
  }
  
  // STRATEGY 2: Semantic context detection using action words
  for (const celeb of celebrityList) {
    // Look for patterns like "[Celebrity] wore..." or "[Celebrity] was spotted in..."
    for (const action of CELEBRITY_ACTION_WORDS) {
      if (lowerText.includes(`${celeb.toLowerCase()} ${action}`)) {
        matches.push({
          name: celeb,
          score: 0.95, // Very high confidence when celebrity + action word is found
          matchMethod: 'action_context'
        });
      }
    }
    
    // Possessive forms like "[Celebrity]'s outfit"
    if (lowerText.includes(`${celeb.toLowerCase()}'s outfit`) || 
        lowerText.includes(`${celeb.toLowerCase()}'s look`) ||
        lowerText.includes(`${celeb.toLowerCase()}'s style`)) {
      matches.push({
        name: celeb,
        score: 0.9,
        matchMethod: 'possessive'
      });
    }
  }
  
  // STRATEGY 3: Distinctive single-name celebrities
  for (const celeb of celebrityList) {
    // Only apply for unique/distinctive celebrity names to avoid false positives
    if (isDistinctiveName(celeb) && lowerText.includes(celeb.toLowerCase())) {
      matches.push({
        name: celeb,
        score: 0.85,
        matchMethod: 'distinctive_name'
      });
    }
  }
  
  // If we have matches from strategies 2-3, return the best one
  if (matches.length > 0) {
    return getBestMatch(matches).name;
  }
  
  // STRATEGY 4: Extract from headings (more likely to contain celebrity names)
  const headingElement = element.querySelector('h1, h2, h3, .title, [class*="title"], [class*="heading"]');
  const headingText = headingElement?.textContent || '';
  
  if (headingText) {
    // Check heading against celebrity list
    for (const celeb of celebrityList) {
      if (headingText.toLowerCase().includes(celeb.toLowerCase())) {
        matches.push({
          name: celeb,
          score: 0.8,
          matchMethod: 'heading_match'
        });
      }
    }
    
    // Extract potential celebrity name patterns from heading
    extractPotentialNames(headingText, celebrityList).forEach(match => {
      matches.push(match);
    });
  }
  
  // STRATEGY 5: Fallback pattern matching on entire text
  if (matches.length === 0) {
    extractPotentialNames(elementText, celebrityList).forEach(match => {
      matches.push(match);
    });
  }
  
  // If we have any matches, return the highest-scoring one
  if (matches.length > 0) {
    return getBestMatch(matches).name;
  }
  
  // No matches found
  return '';
}

/**
 * Extracts potential celebrity names using regex patterns
 * Returns matches with scores based on confidence
 */
function extractPotentialNames(text: string, celebrityList: string[]): CelebrityMatch[] {
  const matches: CelebrityMatch[] = [];
  
  // Filter known product words first to improve precision
  const processedText = filterProductWords(text);
  
  // Various patterns to extract potential celebrity names, ordered by confidence
  const patterns = [
    // NAME followed by a typical action (high confidence)
    { 
      regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(wore|was spotted|stepped out|attended|donned|styled|rocked|showcased)/i,
      score: 0.75,
      method: 'name_action'
    },
    
    // Possessive patterns (high confidence)
    { 
      regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)'s\s+(outfit|look|style|dress|ensemble|fashion)/i,
      score: 0.7,
      method: 'possessive_pattern'
    },
    
    // Name at start of sentence, followed by verb
    { 
      regex: /^([A-Z][a-z]+ [A-Z][a-z]+)\s+\w+ed/im,
      score: 0.65,
      method: 'sentence_start'
    },
    
    // Standard capitalized name pattern (medium confidence)
    { 
      regex: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/,
      score: 0.6,
      method: 'capitalized_name'
    },
    
    // Name with colon (often in headlines)
    { 
      regex: /^([A-Z][a-z]+ [A-Z][a-z]+):/im,
      score: 0.55,
      method: 'name_colon'
    },
    
    // Basic fallback pattern for capitalized words (low confidence)
    { 
      regex: /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/,
      score: 0.45,
      method: 'capital_words'
    }
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = processedText.match(pattern.regex);
    if (match && match[1]) {
      const potentialName = match[1];
      
      // Check if this matches or is close to a known celebrity
      const matchedCeleb = findClosestCelebrityMatch(potentialName, celebrityList);
      if (matchedCeleb) {
        matches.push({
          name: matchedCeleb,
          score: pattern.score + 0.2, // Boost score for names in our list
          matchMethod: `${pattern.method}_verified`
        });
      } else if (!isProbablyProduct(potentialName)) {
        // Add as a lower-confidence match if it's not a product term
        matches.push({
          name: potentialName,
          score: pattern.score,
          matchMethod: pattern.method
        });
      }
    }
  }
  
  return matches;
}

/**
 * Filter out product category words from text
 * This helps reduce false positives by removing sections about products
 */
function filterProductWords(text: string): string {
  let processedText = text;
  
  // Replace known product category sections with spaces
  // For patterns like "10 Best Dresses for Summer"
  const productPhrasePatterns = [
    /\d+\s+best\s+\w+/gi,
    /shopping\s+guide/gi,
    /editor'?s?\s+picks/gi,
    /best\s+\w+\s+to\s+buy/gi,
    /\w+\s+to\s+shop/gi,
    /trending\s+\w+/gi,
    /favorite\s+\w+/gi
  ];
  
  for (const pattern of productPhrasePatterns) {
    processedText = processedText.replace(pattern, ' ');
  }
  
  return processedText;
}

/**
 * Checks if a name is likely a distinctive celebrity name
 * Used for single-name celebrities or uniquely identifiable names
 */
function isDistinctiveName(name: string): boolean {
  // Single-name celebrities are distinctive
  if (name.split(' ').length === 1) {
    return true;
  }
  
  // Very unique names (unlikely to match other things)
  const uniqueNames = [
    'Dua Lipa', 'Timothée Chalamet', 'Zendaya', 'A$AP Rocky', 'Lupita Nyong\'o',
    'Bad Bunny', 'Lizzo', 'BTS', 'Rihanna', 'Beyoncé'
  ];
  
  return uniqueNames.includes(name);
}

/**
 * Determines if text is primarily about products rather than celebrities
 */
function isProbablyProductArticle(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for common product article patterns
  const productIndicators = [
    /\d+\s+best\s+\w+/i,
    /\d+\s+\w+\s+to\s+shop/i,
    /shopping\s+guide/i,
    /editor'?s?\s+picks/i,
    /what\s+to\s+buy/i,
    /what\s+to\s+wear/i,
    /how\s+to\s+style/i,
    /where\s+to\s+shop/i
  ];
  
  // If multiple indicators appear, it's likely a product article
  let indicatorCount = 0;
  for (const indicator of productIndicators) {
    if (indicator.test(lowerText)) {
      indicatorCount++;
    }
  }
  
  // Count product category words
  let productWordCount = 0;
  for (const word of PRODUCT_WORDS) {
    if (lowerText.includes(word)) {
      productWordCount++;
    }
  }
  
  // If significant number of product words or multiple indicators, it's likely a product article
  return indicatorCount >= 2 || productWordCount >= 5;
}

/**
 * Check if a potential name is likely to be a product description
 */
function isProbablyProduct(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  // Check if it contains any product words
  for (const word of PRODUCT_WORDS) {
    if (lowerName.includes(word)) {
      return true;
    }
  }
  
  // Check for product patterns
  const productPatterns = [
    /\d+\s+\w+/i,  // "10 Dresses"
    /best\s+\w+/i,  // "Best Jeans"
    /new\s+\w+/i,   // "New Collection"
    /\w+\s+trend/i  // "Summer Trend"
  ];
  
  for (const pattern of productPatterns) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Returns the best match from a list of potential matches
 */
function getBestMatch(matches: CelebrityMatch[]): CelebrityMatch {
  if (matches.length === 0) {
    throw new Error('No matches provided');
  }
  
  // Sort by score in descending order
  return matches.sort((a, b) => b.score - a.score)[0];
}

/**
 * Checks for exact match from celebrity list
 */
function findExactCelebrityMatch(text: string, celebrityList: string[]): string | null {
  const lowerText = text.toLowerCase();
  
  for (const celeb of celebrityList) {
    // Check for exact case-insensitive match with word boundaries
    const exactRegex = new RegExp(`\\b${celeb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (exactRegex.test(text)) {
      return celeb; // Return name with proper capitalization from our list
    }
  }
  
  return null;
}

/**
 * Enhanced version of findClosestCelebrityMatch with better fuzzy matching
 */
/**
 * Enhanced garment extraction from outfit descriptions
 * Uses comprehensive fashion vocabulary to extract detailed outfit elements
 * 
 * @param description Outfit description to parse
 * @returns Object with extracted garments, colors, patterns, and styles
 */
export function extractOutfitElements(description: string) {
  if (!description) {
    return {
      garments: [],
      colors: [],
      patterns: [],
      styles: []
    };
  }
  
  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/\s+/);
  
  // Results storage
  const result = {
    garments: [] as string[],
    colors: [] as string[],
    patterns: [] as string[],
    styles: [] as string[]
  };
  
  // Extract garments by category
  Object.entries(GARMENT_TYPES).forEach(([category, items]) => {
    items.forEach(garment => {
      // Check for exact garment matches
      if (lowerDesc.includes(garment)) {
        // Look for adjectives before garment
        const index = lowerDesc.indexOf(garment);
        if (index > 0) {
          // Get up to 3 words before the garment to find adjectives
          const start = Math.max(0, lowerDesc.lastIndexOf(' ', index - 2));
          const adjPhrase = lowerDesc.substring(start, index).trim();
          
          if (adjPhrase) {
            // Add the complete phrase (adjective + garment)
            result.garments.push(`${adjPhrase} ${garment}`);
          } else {
            result.garments.push(garment);
          }
        } else {
          result.garments.push(garment);
        }
      }
    });
  });
  
  // Extract colors using sliding window for multi-word colors
  for (let i = 0; i < words.length; i++) {
    // Check single-word colors
    if (COLORS.includes(words[i])) {
      result.colors.push(words[i]);
      continue;
    }
    
    // Check two-word colors (e.g., "forest green")
    if (i < words.length - 1) {
      const twoWordColor = `${words[i]} ${words[i + 1]}`;
      if (COLORS.includes(twoWordColor)) {
        result.colors.push(twoWordColor);
        i++; // Skip the next word as it's part of this color
        continue;
      }
    }
    
    // Check three-word colors (less common but possible)
    if (i < words.length - 2) {
      const threeWordColor = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (COLORS.includes(threeWordColor)) {
        result.colors.push(threeWordColor);
        i += 2; // Skip the next two words
      }
    }
  }
  
  // Extract pattern adjectives
  const patternAdjectives = STYLE_ADJECTIVES.slice(0, 20); // First 20 items are pattern adjectives
  patternAdjectives.forEach(pattern => {
    if (lowerDesc.includes(pattern)) {
      result.patterns.push(pattern);
    }
  });
  
  // Extract style adjectives
  const styleAdjectives = STYLE_ADJECTIVES.slice(20, 52); // Items 20-52 are style adjectives
  styleAdjectives.forEach(style => {
    if (lowerDesc.includes(style)) {
      result.styles.push(style);
    }
  });
  
  // Extract fit/silhouette adjectives
  const fitAdjectives = STYLE_ADJECTIVES.slice(52, 74); // Items 52-74 are fit adjectives
  fitAdjectives.forEach(fit => {
    if (lowerDesc.includes(fit)) {
      result.styles.push(fit); // Add to styles for now
    }
  });
  
  // Extract fabric/material adjectives
  const materialAdjectives = STYLE_ADJECTIVES.slice(74); // Items after 74 are material adjectives
  materialAdjectives.forEach(material => {
    if (lowerDesc.includes(material)) {
      // Create compound garment entries
      result.garments.forEach((garment, index) => {
        if (lowerDesc.includes(`${material} ${garment}`)) {
          result.garments[index] = `${material} ${garment}`;
        }
      });
      
      // Also record the material itself
      result.styles.push(material);
    }
  });
  
  // Remove duplicates
  return {
    garments: [...new Set(result.garments)],
    colors: [...new Set(result.colors)],
    patterns: [...new Set(result.patterns)],
    styles: [...new Set(result.styles)]
  };
}

/**
 * Calculate confidence score for celebrity name extraction
 * Higher scores (0-1) indicate greater confidence in the match
 * 
 * @param name Potential celebrity name
 * @param celebrityList Known celebrity list
 * @param context Text context surrounding the name
 * @returns Confidence score between 0-1
 */
export function calculateCelebrityConfidence(name: string, celebrityList: string[], context: string): number {
  if (!name) return 0;
  
  const matchedCeleb = findClosestCelebrityMatch(name, celebrityList);
  if (!matchedCeleb) return 0;
  
  let score = 0.5; // Base score for matching name
  
  // Adjust score based on match type
  if (matchedCeleb.toLowerCase() === name.toLowerCase()) {
    score += 0.3; // Exact match bonus
  } else {
    score += 0.1; // Partial match smaller bonus
  }
  
  // Check for celebrity action words in context
  const hasActionWord = CELEBRITY_ACTION_WORDS.some(word => context.toLowerCase().includes(word));
  if (hasActionWord) {
    score += 0.2;
  }
  
  // Check for fashion-related terms in context
  const hasOutfitContext = ['outfit', 'wore', 'wearing', 'dressed', 'style', 'look'].some(
    word => context.toLowerCase().includes(word)
  );
  if (hasOutfitContext) {
    score += 0.1;
  }
  
  // Cap at 1.0
  return Math.min(score, 1.0);
}

export function findClosestCelebrityMatch(name: string, celebrityList: string[]): string | null {
  if (!name) return null;
  
  const nameLower = name.toLowerCase();
  
  // 1. Exact match (case insensitive)
  for (const celeb of celebrityList) {
    if (celeb.toLowerCase() === nameLower) {
      return celeb; // Return properly capitalized name
    }
  }
  
  // 2. Try partial match with better handling of name variations
  for (const celeb of celebrityList) {
    // Split into name parts
    const celebParts = celeb.toLowerCase().split(' ');
    const nameParts = nameLower.split(' ');
    
    // Must have same number of name parts
    if (celebParts.length === nameParts.length) {
      let matchCount = 0;
      let totalMatchQuality = 0;
      
      for (let i = 0; i < celebParts.length; i++) {
        // Direct starts-with check
        if (celebParts[i].startsWith(nameParts[i]) || nameParts[i].startsWith(celebParts[i])) {
          matchCount++;
          
          // Calculate match quality (how close the parts are)
          const lengthRatio = Math.min(celebParts[i].length, nameParts[i].length) / 
                           Math.max(celebParts[i].length, nameParts[i].length);
          totalMatchQuality += lengthRatio;
        }
      }
      
      // All parts match at least by prefix, and have high average match quality
      if (matchCount === celebParts.length && (totalMatchQuality / celebParts.length) > 0.6) {
        return celeb;
      }
    }
  }
  
  // 3. Special case for exceptional names (check specially for unique names like A$AP Rocky, etc.)
  for (const celeb of celebrityList) {
    if (isDistinctiveName(celeb)) {
      // For distinctive names, more aggressive partial matching
      const celebLower = celeb.toLowerCase();
      
      // For special cases like "A$AP Rocky" - may appear as "ASAP Rocky" in text
      if (celebLower.includes('$') || celebLower.includes('-')) {
        const normalized = celebLower.replace(/[$\-]/g, '');
        const normalizedName = nameLower.replace(/[$\-]/g, '');
        
        if (normalizedName.includes(normalized) || normalized.includes(normalizedName)) {
          return celeb;
        }
      }
    }
  }
  
  return null;
}