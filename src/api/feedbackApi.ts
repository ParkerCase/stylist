// Feedback API client for synchronizing user feedback

import { ApiClient } from './apiClient';
import { FeedbackItem } from '@/store/feedbackStore';

export interface SyncFeedbackRequest {
  userId: string;
  feedbackItems: FeedbackItem[];
}

export interface SyncFeedbackResponse {
  syncedItemIds: string[];
  success: boolean;
  message: string;
}

export class FeedbackApi {
  apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * Synchronize local feedback with the backend
   */
  async syncFeedback(request: SyncFeedbackRequest): Promise<SyncFeedbackResponse> {
    try {
      return await this.apiClient.post<SyncFeedbackResponse>(
        `/api/v1/users/${request.userId}/feedback/sync`,
        {
          feedbackItems: request.feedbackItems
        }
      );
    } catch (error) {
      console.warn('Failed to sync feedback, will retry later:', error);
      // Return a failed response
      return {
        syncedItemIds: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}