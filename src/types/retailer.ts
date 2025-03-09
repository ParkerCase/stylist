// Retailer-related types for the widget

export interface RetailerConfig {
    retailerId: string;
    retailerName: string;
    apiKey: string;
    apiUrl: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    allowWishlist?: boolean;
    allowCart?: boolean;
    allowSimilarItems?: boolean;
  }
  
  export interface RetailerInventoryResponse {
    retailerId: string;
    retailerName: string;
    items: RetailerItem[];
    total: number;
    page: number;
    limit: number;
    lastUpdated: Date;
  }
  
  export interface RetailerItem {
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
    tags: string[];
    inStock: boolean;
  }
  
  export interface AvailabilityResponse {
    retailerId: string;
    availability: {
      [itemId: string]: boolean;
    };
  }
  
  export interface CartItem {
    itemId: string;
    retailerId: string;
    quantity: number;
    size?: string;
    color?: string;
    addedAt: Date;
  }
  
  export interface WishlistItem {
    itemId: string;
    retailerId: string;
    addedAt: Date;
  }
  
  export interface AddToCartRequest {
    userId: string;
    itemId: string;
    retailerId: string;
    quantity: number;
    size?: string;
    color?: string;
  }
  
  export interface AddToWishlistRequest {
    userId: string;
    itemId: string;
    retailerId: string;
  }
  