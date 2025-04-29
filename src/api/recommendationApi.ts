// API client for recommendation-related endpoints

import { ApiClient } from './apiClient';
import {
  RecommendationRequest,
  RecommendationResponse,
  ItemFeedback,
  OutfitFeedback,
  SavedOutfit,
  SimilarItemsRequest,
  CompleteOutfitRequest,
  Outfit,
  RecommendationItem
} from '../types/index';

// Mock data for fallback when API is unavailable
const MOCK_RECOMMENDATIONS: RecommendationResponse = {
  items: [
    {
      id: 'mock1',
      name: 'Classic White T-Shirt',
      brand: 'Essentials',
      category: 'Tops',
      price: 24.99,
      retailerId: 'demo_retailer',
      colors: ['white'],
      sizes: ['S', 'M', 'L', 'XL'],
      imageUrls: ['https://via.placeholder.com/300?text=White+T-Shirt'],
      url: '#',
      matchScore: 0.95,
      matchReasons: ['Versatile staple', 'Matches your style profile'],
      inStock: true
    },
    {
      id: 'mock2',
      name: 'Slim Fit Jeans',
      brand: 'DenimCo',
      category: 'Bottoms',
      price: 59.99,
      retailerId: 'demo_retailer',
      colors: ['blue'],
      sizes: ['28', '30', '32', '34'],
      imageUrls: ['https://via.placeholder.com/300?text=Slim+Jeans'],
      url: '#',
      matchScore: 0.92,
      matchReasons: ['Versatile staple', 'Complements your wardrobe'],
      inStock: true
    },
    {
      id: 'mock3',
      name: 'Casual Sneakers',
      brand: 'UrbanStep',
      category: 'Shoes',
      price: 79.99,
      retailerId: 'demo_retailer',
      colors: ['white', 'black'],
      sizes: ['8', '9', '10', '11'],
      imageUrls: ['https://via.placeholder.com/300?text=Sneakers'],
      url: '#',
      matchScore: 0.89,
      matchReasons: ['Comfortable', 'Versatile footwear'],
      inStock: true
    },
    {
      id: 'mock4',
      name: 'Oversized Hoodie',
      brand: 'Comfort+',
      category: 'Tops',
      price: 49.99,
      retailerId: 'demo_retailer',
      colors: ['gray', 'black', 'blue'],
      sizes: ['S', 'M', 'L', 'XL'],
      imageUrls: ['https://via.placeholder.com/300?text=Hoodie'],
      url: '#',
      matchScore: 0.87,
      matchReasons: ['Casual comfort', 'Trending style'],
      inStock: true
    }
  ],
  outfits: [
    {
      id: 'outfit1',
      name: 'Casual Weekend Look',
      occasion: 'Casual',
      matchScore: 0.93,
      matchReasons: ['Perfect for weekends', 'Easy to style'],
      items: [
        {
          id: 'mock1',
          name: 'Classic White T-Shirt',
          brand: 'Essentials',
          category: 'Tops',
          price: 24.99,
          retailerId: 'demo_retailer',
          colors: ['white'],
          sizes: ['S', 'M', 'L', 'XL'],
          imageUrls: ['https://via.placeholder.com/300?text=White+T-Shirt'],
          url: '#',
          matchScore: 0.95,
          matchReasons: ['Versatile staple'],
          inStock: true
        },
        {
          id: 'mock2',
          name: 'Slim Fit Jeans',
          brand: 'DenimCo',
          category: 'Bottoms',
          price: 59.99,
          retailerId: 'demo_retailer',
          colors: ['blue'],
          sizes: ['28', '30', '32', '34'],
          imageUrls: ['https://via.placeholder.com/300?text=Slim+Jeans'],
          url: '#',
          matchScore: 0.92,
          matchReasons: ['Versatile staple'],
          inStock: true
        },
        {
          id: 'mock3',
          name: 'Casual Sneakers',
          brand: 'UrbanStep',
          category: 'Shoes',
          price: 79.99, 
          retailerId: 'demo_retailer',
          colors: ['white', 'black'],
          sizes: ['8', '9', '10', '11'],
          imageUrls: ['https://via.placeholder.com/300?text=Sneakers'],
          url: '#',
          matchScore: 0.89,
          matchReasons: ['Comfortable'],
          inStock: true
        }
      ]
    }
  ]
};

export class RecommendationApi {
  apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  // Get personalized recommendations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      return await this.apiClient.post<RecommendationResponse>('/api/v1/recommendations', request);
    } catch (error) {
      console.warn('Failed to fetch recommendations from API, using mock data:', error);
      // Return mock data as fallback
      return MOCK_RECOMMENDATIONS;
    }
  }
  
  // Get outfit recommendations
  async getOutfitRecommendations(
    userId: string,
    occasion?: string,
    limit?: number
  ): Promise<Outfit[]> {
    try {
      const params: Record<string, string> = {};
      if (occasion) params.occasion = occasion;
      if (limit) params.limit = limit.toString();
      
      return await this.apiClient.get<Outfit[]>(`/api/v1/users/${userId}/outfits/recommendations`, {
        params
      });
    } catch (error) {
      console.warn('Failed to fetch outfit recommendations, using mock data:', error);
      // Return mock outfit data as fallback
      return MOCK_RECOMMENDATIONS.outfits;
    }
  }
  
  // Add item feedback (like/dislike)
  async addItemFeedback(feedback: ItemFeedback): Promise<void> {
    try {
      return await this.apiClient.post<void>(`/api/v1/users/${feedback.userId}/feedback/items/${feedback.itemId}`, {
        liked: feedback.liked,
        context: feedback.context
      });
    } catch (error) {
      console.warn('Failed to add item feedback, ignoring:', error);
      // Silently fail - UI will still update but backend won't persist
    }
  }
  
  // Add outfit feedback (like/dislike)
  async addOutfitFeedback(feedback: OutfitFeedback): Promise<void> {
    try {
      return await this.apiClient.post<void>(`/api/v1/users/${feedback.userId}/feedback/outfits/${feedback.outfitId}`, {
        liked: feedback.liked,
        context: feedback.context
      });
    } catch (error) {
      console.warn('Failed to add outfit feedback, ignoring:', error);
      // Silently fail - UI will still update but backend won't persist
    }
  }
  
  // Save outfit to user's favorites
  async saveOutfit(outfit: SavedOutfit): Promise<SavedOutfit> {
    return this.apiClient.post<SavedOutfit>(`/api/v1/users/${outfit.userId}/outfits`, {
      outfitId: outfit.outfitId,
      items: outfit.items,
      name: outfit.name,
      notes: outfit.notes
    });
  }
  
  // Get saved outfits
  async getSavedOutfits(userId: string): Promise<SavedOutfit[]> {
    return this.apiClient.get<SavedOutfit[]>(`/api/v1/users/${userId}/outfits`);
  }
  
  // Delete saved outfit
  async deleteSavedOutfit(userId: string, outfitId: string): Promise<void> {
    return this.apiClient.delete<void>(`/api/v1/users/${userId}/outfits/${outfitId}`);
  }
  
  // Get similar items
  async getSimilarItems(request: SimilarItemsRequest): Promise<RecommendationItem[]> {
    return this.apiClient.post<RecommendationItem[]>('/api/v1/similar-items', request);
  }
  
  // Complete an outfit based on selected items
  async completeOutfit(request: CompleteOutfitRequest): Promise<Outfit[]> {
    return this.apiClient.post<Outfit[]>('/api/v1/complete-outfit', request);
  }
  
  // Log item view
  async logItemView(userId: string, itemId: string): Promise<void> {
    return this.apiClient.post<void>(`/api/v1/users/${userId}/view-item/${itemId}`, {});
  }
}
