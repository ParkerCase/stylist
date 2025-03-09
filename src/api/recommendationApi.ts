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
} from '@types/index';

export class RecommendationApi {
  private client: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }
  
  // Get personalized recommendations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    return this.client.post<RecommendationResponse>('/api/v1/recommendations', request);
  }
  
  // Get outfit recommendations
  async getOutfitRecommendations(
    userId: string,
    occasion?: string,
    limit?: number
  ): Promise<Outfit[]> {
    const params: Record<string, string> = {};
    if (occasion) params.occasion = occasion;
    if (limit) params.limit = limit.toString();
    
    return this.client.get<Outfit[]>(`/api/v1/users/${userId}/outfits/recommendations`, {
      params
    });
  }
  
  // Add item feedback (like/dislike)
  async addItemFeedback(feedback: ItemFeedback): Promise<void> {
    return this.client.post<void>(`/api/v1/users/${feedback.userId}/feedback/items/${feedback.itemId}`, {
      liked: feedback.liked,
      context: feedback.context
    });
  }
  
  // Add outfit feedback (like/dislike)
  async addOutfitFeedback(feedback: OutfitFeedback): Promise<void> {
    return this.client.post<void>(`/api/v1/users/${feedback.userId}/feedback/outfits/${feedback.outfitId}`, {
      liked: feedback.liked,
      context: feedback.context
    });
  }
  
  // Save outfit to user's favorites
  async saveOutfit(outfit: SavedOutfit): Promise<SavedOutfit> {
    return this.client.post<SavedOutfit>(`/api/v1/users/${outfit.userId}/outfits`, {
      outfitId: outfit.outfitId,
      items: outfit.items,
      name: outfit.name,
      notes: outfit.notes
    });
  }
  
  // Get saved outfits
  async getSavedOutfits(userId: string): Promise<SavedOutfit[]> {
    return this.client.get<SavedOutfit[]>(`/api/v1/users/${userId}/outfits`);
  }
  
  // Delete saved outfit
  async deleteSavedOutfit(userId: string, outfitId: string): Promise<void> {
    return this.client.delete<void>(`/api/v1/users/${userId}/outfits/${outfitId}`);
  }
  
  // Get similar items
  async getSimilarItems(request: SimilarItemsRequest): Promise<RecommendationItem[]> {
    return this.client.post<RecommendationItem[]>('/api/v1/similar-items', request);
  }
  
  // Complete an outfit based on selected items
  async completeOutfit(request: CompleteOutfitRequest): Promise<Outfit[]> {
    return this.client.post<Outfit[]>('/api/v1/complete-outfit', request);
  }
  
  // Log item view
  async logItemView(userId: string, itemId: string): Promise<void> {
    return this.client.post<void>(`/api/v1/users/${userId}/view-item/${itemId}`, {});
  }
}
