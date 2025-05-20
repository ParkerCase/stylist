// Recommendation-related types for the widget

export interface RecommendationRequest {
    userId: string;
    context?: string;
    category?: string;
    occasion?: string;
    limit?: number;
    includeOutfits?: boolean;
    filterByRetailers?: string[];
    trending?: boolean; // Flag to get trending items
    deepSearch?: boolean; // Flag to perform an inventory-wide search
    priceRange?: {
      min?: number;
      max?: number;
    };
    filters?: {
      trending?: boolean; // For backward compatibility
      size?: string;
      style?: string;
      age?: string;
      gender?: string;
      season?: string;
      isNewArrival?: boolean;
      [key: string]: any;
    };
    layout?: string; // Layout configuration (e.g., "2x50 grid")
    message?: string; // For error messages in response
  }
  
  export interface RecommendationResponse {
    userId: string;
    timestamp: Date;
    items: RecommendationItem[];
    outfits: Outfit[];
    context?: string;
    message?: string; // For error messages
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
    trending?: boolean;
    trendingScore?: number; // Score used for trending ranking algorithm
    trendingRank?: number; // Position in trending items
    likeCount?: number; // Number of likes for trending calculation
    dislikeCount?: number; // Number of dislikes for trending calculation
    recentViews?: number; // Number of recent views for activity weight
    releaseDate?: Date; // Date when item was added to inventory
    seasonality?: string; // Season the item is most relevant for
    targetDemographics?: {
      age?: string[];
      gender?: string[];
    };
    isNewArrival?: boolean;
    imageUrl?: string; // For backward compatibility
    materials?: string[]; // Materials used in the item
    patterns?: string[]; // Patterns on the item
    isRealTimeUpdate?: boolean; // For trending items that are updated in real-time
    isNewTrend?: boolean; // For newly trending items
    lastUpdated?: Date; // When the item was last updated
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
    // Additional fields required by components
    id?: string;
    imageUrl?: string;
    createdAt?: Date;
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
    url?: string;
    category?: string;
    salePrice?: number;
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
  