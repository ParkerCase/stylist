// Types for social proof services

import { RecommendationItem } from '../../../types';

export interface SocialProofItem {
  id: string;
  celebrity: string;
  event: string;
  outfitTags: string[];
  patterns: string[];
  colors: string[];
  timestamp: string;
  matchedProducts: SocialProofMatch[];
}

export interface SocialProofMatch {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  imageUrl: string;
  matchScore: number;
  matchReasons: string[];
}

export interface ProductRecommendation {
  productId: string;
  similarityScore: number;
  matchReason: string;
}

export interface SocialProofSource {
  id: string;
  name: string;
  url: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastScraped?: Date;
  active: boolean;
}

export interface Celebrity {
  id: string;
  name: string;
  social?: {
    instagram?: string;
    twitter?: string;
  };
  popularity: number;
  categories: string[];
}

export interface SocialProofImage {
  id: string;
  celebrityId: string;
  url: string;
  thumbnailUrl?: string;
  date: Date;
  source: string;
  event?: string;
  tags: string[];
}

export interface ColorMatch {
  color1: string;
  color2: string;
  similarity: number;
}

export function areSimilarColors(color1: string, color2: string): boolean {
  // Simple implementation - could be expanded with actual color similarity algorithm
  return color1.toLowerCase() === color2.toLowerCase();
}

export interface ItemMatch {
  type: 'exact' | 'similar';
  score: number;
  item: RecommendationItem;
  matchReason: string[];
}

export interface ScrapeResult {
  success: boolean;
  source: string;
  imagesFound: number;
  itemsMatched: number;
  date: Date;
  errors?: string[];
}