// src/services/social-proof/types.ts
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

export interface SocialProofMatch {
  id: string;
  name?: string; // Product name for compatibility
  celebrityName?: string;
  event?: string;
  description?: string;
  price?: number;
  brand?: string;
  category?: string;
  imageUrl: string;
  matchedProducts: ProductRecommendation[];
  matchScore?: number;
  matchReasons?: string[];
  confidence?: number;
  source?: string;
  timestamp?: string;
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