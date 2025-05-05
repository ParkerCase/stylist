// types.ts
// Type definitions for social proof system

export interface SocialProofItem {
    id: string;
    celebrity: string;
    event: string;
    outfitTags: string[]; // e.g. "black jumpsuit", "Gucci blazer"
    patterns?: string[];
    colors?: string[];
    timestamp: string;
    matchedProducts: ProductRecommendation[];
  }

  export interface Recommendation {
    id: string;
    userId: string;
    items: RecommendedItem[];
    confidence: number;
    reason: string;
    createdAt: Date;
    tags?: string[];
    source?: 'social_proof' | 'style_quiz' | 'closet_analysis';
  }
  
  export interface RecommendedItem {
    id: string;
    retailerId: string;
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    productUrl: string;
    category: string;
    color?: string;
    size?: string;
    confidence: number;
    reason: string;
  }
  
  export interface ProductRecommendation {
    id: string;
    name: string;
    description: string;
    price: number;
    brand: string;
    category: string;
    imageUrl: string;
    matchScore?: number;
    matchReasons?: string[];
  }
  
  export interface SocialProofConfig {
    dataSources: string[];
    scrapingFrequency: 'daily' | 'weekly' | 'hourly';
    maxItemsPerFetch: number;
    matchThreshold: number;
    cacheExpiry: number; // in milliseconds
  }
  
  export interface ScrapedData {
    source: string;
    scrapedAt: string;
    items: RawSocialProofItem[];
  }
  
  export interface RawSocialProofItem {
    celebrity: string;
    event?: string;
    description: string;
    imageUrl?: string;
    publishDate: string;
    // Raw HTML or structured data from source
    rawData?: any;
  }