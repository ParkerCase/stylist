// scrapeSocialProof.ts
// Scrapes celebrity fashion data from editorial sources

import { SocialProofItem } from './types';
import { FashionAIConfig } from './config';

export interface ScrapeSocialProofOptions {
  sources?: string[];
  limit?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Editorial sources to scrape (configurable)
const DEFAULT_SOURCES = [
  'whoWhatWear',  // WhoWhatWear celebrity fashion
  'vogue',        // Vogue style section
  'styleCaster',  // StyleCaster celebrity looks
  'harpersBazaar',// Harper's Bazaar style
  'elleUK'        // Elle UK celebrity fashion
];

// Mock scraped results for demo mode
const MOCK_SCRAPED_DATA: Partial<SocialProofItem>[] = [
  {
    id: 'social-proof-1',
    celebrity: 'Emma Watson',
    event: 'Met Gala 2023',
    outfitTags: ['off-white gown', 'sequin dress', 'high slit', 'Stella McCartney'],
    patterns: ['sequin', 'fitted'],
    colors: ['off-white', 'silver'],
    timestamp: '2024-05-01T20:00:00Z'
  },
  {
    id: 'social-proof-2',
    celebrity: 'Zendaya',
    event: 'Street Style NYC',
    outfitTags: ['oversized blazer', 'wide-leg trousers', 'Tom Ford sunglasses'],
    patterns: ['pinstripe', 'oversized'], 
    colors: ['black', 'white'],
    timestamp: '2024-05-15T14:30:00Z'
  },
  {
    id: 'social-proof-3',
    celebrity: 'Rihanna',
    event: 'Business Event',
    outfitTags: ['power suit', 'blazer', 'matching pants', 'Louis Vuitton'],
    patterns: ['structured', 'fitted'],
    colors: ['navy blue', 'pinstripe'],
    timestamp: '2024-05-20T10:00:00Z'
  }
];

// Cache for scraped data to avoid duplicate effort
const scrapedCache = new Map<string, SocialProofItem>();

/**
 * Scrapes celebrity fashion data from editorial sources
 * In production mode, this would make real HTTP requests to scraping endpoints
 * In mock mode, returns predefined data
 */
export async function scrapeSocialProof(options: ScrapeSocialProofOptions = {}): Promise<Partial<SocialProofItem>[]> {
  const sources = options.sources || DEFAULT_SOURCES;
  const limit = options.limit || 100;
  
  if (FashionAIConfig.useMockData) {
    // Return mock data for demo mode
    return Promise.resolve(MOCK_SCRAPED_DATA);
  }

  try {
    // In production mode, make API request to scraping service
    const response = await fetch(`${FashionAIConfig.api.baseUrl}/scrape/social-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FashionAIConfig.auth.getToken() || ''}`
      },
      body: JSON.stringify({
        sources,
        limit,
        dateRange: options.dateRange || getDefaultDateRange()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape social proof: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error scraping social proof:', error);
    
    // Fallback to cached data if scraping fails
    if (scrapedCache.size > 0) {
      console.log('Falling back to cached social proof data');
      return Array.from(scrapedCache.values());
    }
    
    // Final fallback to mock data
    console.log('Falling back to mock social proof data');
    return MOCK_SCRAPED_DATA;
  }
}

/**
 * Parses raw scraped HTML/JSON data into structured social proof items
 * This would contain the actual parsing logic for different sources
 */
export function parseScrapedData(source: string, rawData: any): Partial<SocialProofItem>[] {
  const parsers = {
    whoWhatWear: parseWhoWhatWear,
    vogue: parseVogue,
    styleCaster: parseStyleCaster,
    harpersBazaar: parseHarpersBazaar,
    elleUK: parseElleUK
  };

  const parser = parsers[source as keyof typeof parsers];
  if (!parser) {
    console.warn(`No parser found for source: ${source}`);
    return [];
  }

  return parser(rawData);
}

// Source-specific parsers (would contain actual parsing logic)
function parseWhoWhatWear(data: any): Partial<SocialProofItem>[] {
  // Convert scraped WhoWhatWear data into standardized SocialProofItem format
  if (!data || !Array.isArray(data)) {
    console.warn('Invalid WhoWhatWear data format');
    return [];
  }

  return data.map((item, index) => {
    // Extract style elements from outfit description
    const { brands, garmentTypes, colors, patterns } = extractStyleElements(item.outfitDescription || '');
    
    // Create outfitTags from description components
    const outfitTags = [
      ...brands,
      ...garmentTypes.map(type => {
        // Try to pair colors with garment types when possible
        const colorMatches = colors.filter(color => 
          item.outfitDescription?.toLowerCase().includes(`${color} ${type}`)
        );
        
        if (colorMatches.length > 0) {
          return `${colorMatches[0]} ${type}`;
        }
        return type;
      }),
      // Add any patterns found
      ...patterns.map(p => p)
    ];

    // Generate a stable ID based on celebrity name and content
    const idBase = `${item.celebrity || 'unknown'}-${item.outfitDescription?.substring(0, 20) || 'outfit'}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const id = `social-proof-${idBase}-${index}`;
    
    return {
      id,
      celebrity: item.celebrity || 'Unknown Celebrity',
      event: item.event || '',
      outfitTags,
      patterns,
      colors,
      timestamp: item.timestamp || new Date().toISOString(),
      matchedProducts: [] // Will be populated by product matching service
    };
  });
}

function parseVogue(data: any): Partial<SocialProofItem>[] {
  // Vogue-specific parsing logic
  return [];
}

function parseStyleCaster(data: any): Partial<SocialProofItem>[] {
  // StyleCaster-specific parsing logic
  return [];
}

function parseHarpersBazaar(data: any): Partial<SocialProofItem>[] {
  // Harper's Bazaar parsing logic
  return [];
}

function parseElleUK(data: any): Partial<SocialProofItem>[] {
  // Elle UK parsing logic
  return [];
}

/**
 * Gets default date range for scraping (last 7 days)
 */
function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return { from, to };
}

/**
 * Extracts style elements from outfit descriptions using NLP/regex
 */
export function extractStyleElements(description: string): {
  brands: string[];
  garmentTypes: string[];
  colors: string[];
  patterns: string[];
} {
  const brands: string[] = [];
  const garmentTypes: string[] = [];
  const colors: string[] = [];
  const patterns: string[] = [];

  // Common brand patterns (would be more comprehensive in production)
  const brandPatterns = [
    'Louis Vuitton', 'Gucci', 'Prada', 'Chanel', 'Dior', 'Versace', 
    'Tom Ford', 'Ralph Lauren', 'Giorgio Armani', 'Stella McCartney',
    'Balenciaga', 'Saint Laurent', 'Michael Kors', 'Burberry', 'Fendi'
  ];

  // Extract brands
  brandPatterns.forEach(brand => {
    if (description.toLowerCase().includes(brand.toLowerCase())) {
      brands.push(brand);
    }
  });

  // Extract garment types
  const garmentPatterns = [
    'dress', 'gown', 'suit', 'blazer', 'jacket', 'pants', 'trousers',
    'skirt', 'shirt', 'blouse', 'sweater', 'coat', 'shoes', 'boots',
    'heels', 'sneakers', 'bag', 'handbag', 'clutch', 'accessory'
  ];

  garmentPatterns.forEach(type => {
    const regex = new RegExp(`\\b${type}\\b`, 'gi');
    if (regex.test(description)) {
      garmentTypes.push(type);
    }
  });

  // Extract colors
  const colorPatterns = [
    'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink',
    'grey', 'brown', 'navy', 'burgundy', 'beige', 'cream', 'silver', 'gold'
  ];

  colorPatterns.forEach(color => {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    if (regex.test(description)) {
      colors.push(color);
    }
  });

  // Extract patterns and styles
  const patternPatterns = [
    'striped', 'floral', 'polka dot', 'plaid', 'leopard', 'zebra',
    'sequin', 'lace', 'mesh', 'leather', 'suede', 'silk', 'cotton',
    'oversized', 'fitted', 'cropped', 'high-waisted', 'low-cut'
  ];

  patternPatterns.forEach(pattern => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    if (regex.test(description)) {
      patterns.push(pattern);
    }
  });

  return { brands, garmentTypes, colors, patterns };
}

// Export for integration with the rest of the system
export default {
  scrapeSocialProof,
  parseScrapedData,
  extractStyleElements
};