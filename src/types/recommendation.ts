// Recommendation-related types for the widget

export interface RecommendationRequest {
    userId: string;
    context?: string;
    category?: string;
    occasion?: string;
    limit?: number;
    includeOutfits?: boolean;
    filterByRetailers?: string[];
    priceRange?: {
      min?: number;
      max?: number;
    };
  }
  
  export interface RecommendationResponse {
    userId: string;
    timestamp: Date;
    items: RecommendationItem[];
    outfits: Outfit[];
    context?: string;
  }
  
  export interface RecommendationItem {
    id: string;
    retailerId: string;
    name: string;
    brand: string;
    category: string;
    subcategory?: string;
    price: number;
    salePrice?: number;
    colors: string[];
    sizes: string[];
    imageUrls: string[];
    url: string;
    description?: string;
    matchScore: number;
    matchReasons: string[];
    complementaryItems?: string[];
    inStock: boolean;
  }
  
  export interface Outfit {
    id: string;
    name?: string;
    items: RecommendationItem[];
    occasion: string;
    matchScore: number;
    matchReasons: string[];
  }
  
  export interface ItemFeedback {
    userId: string;
    itemId: string;
    liked: boolean;
    timestamp: Date;
    context?: string;
  }
  
  export interface OutfitFeedback {
    userId: string;
    outfitId: string;
    liked: boolean;
    timestamp: Date;
    context?: string;
  }
  
  export interface SavedOutfit {
    userId: string;
    outfitId: string;
    items: string[];
    name?: string;
    savedAt: Date;
    notes?: string;
  }
  
  export interface SimilarItemsRequest {
    itemId: string;
    userId?: string;
    limit?: number;
    filterByRetailers?: string[];
  }
  
  export interface CompleteOutfitRequest {
    userId: string;
    itemIds: string[];
    occasion?: string;
    limit?: number;
  }
  
  export interface WishlistItem {
    itemId: string;
    retailerId: string;
    addedAt: Date;
    notes?: string;
    imageUrl?: string;
    name?: string;
    brand?: string;
    price?: number;
  }
  
  export interface CartItem {
    itemId: string;
    retailerId: string;
    quantity: number;
    size?: string;
    color?: string;
    addedAt: Date;
    price?: number;
    name?: string;
    brand?: string;
    imageUrl?: string;
  }
  