// API client for user-related endpoints

import { ApiClient } from './apiClient';
import {
  UserProfile,
  StyleQuizQuestion,
  StyleQuizAnswer,
  StyleQuizResult,
  UserPreferences,
  ClosetItem
} from '../types/index';

export class UserApi {
  private client: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }
  
  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.client.get<UserProfile>(`/api/v1/users/${userId}`);
  }
  
  // Create user profile (anonymous or with email)
  async createUser(email?: string): Promise<UserProfile> {
    return this.client.post<UserProfile>('/api/v1/users', { email });
  }
  
  // Update user preferences
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserProfile> {
    return this.client.put<UserProfile>(`/api/v1/users/${userId}/preferences`, preferences);
  }
  
  // Get style quiz questions
  async getStyleQuiz(): Promise<StyleQuizQuestion[]> {
    return this.client.get<StyleQuizQuestion[]>('/api/v1/style-quiz');
  }
  
  // Submit style quiz answers
  async submitStyleQuiz(userId: string, answers: StyleQuizAnswer[]): Promise<StyleQuizResult> {
    return this.client.post<StyleQuizResult>(`/api/v1/users/${userId}/style-quiz`, { answers });
  }
  
  // Add item to user's closet
  async addClosetItem(userId: string, item: Omit<ClosetItem, 'id' | 'dateAdded'>): Promise<ClosetItem> {
    return this.client.post<ClosetItem>(`/api/v1/users/${userId}/closet`, item);
  }
  
  // Remove item from user's closet
  async removeClosetItem(userId: string, itemId: string): Promise<void> {
    return this.client.delete<void>(`/api/v1/users/${userId}/closet/${itemId}`);
  }
  
  // Update closet item
  async updateClosetItem(userId: string, itemId: string, updates: Partial<ClosetItem>): Promise<ClosetItem> {
    return this.client.put<ClosetItem>(`/api/v1/users/${userId}/closet/${itemId}`, updates);
  }
  
  // Mark item as favorite
  async toggleFavoriteItem(userId: string, itemId: string, favorite: boolean): Promise<void> {
    return this.client.put<void>(`/api/v1/users/${userId}/closet/${itemId}/favorite`, { favorite });
  }
}
