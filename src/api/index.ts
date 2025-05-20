// Export all API clients and create a configured instance

import { createApiClient, ApiClient } from './apiClient';
import { createIntelligentApiClient } from './intelligentApiClient';
import { UserApi } from './userApi';
import { RecommendationApi } from './recommendationApi';
import { FeedbackApi } from './feedbackApi';

import { API_URL, API_TIMEOUT } from '../utils/environment';

// Default API configuration from environment
const DEFAULT_API_URL = API_URL;
const DEFAULT_TIMEOUT = API_TIMEOUT;

// API client configuration interface
export interface StylistApiConfig {
  apiUrl?: string;
  apiKey: string;
  timeout?: number;
  retailerId: string;
}

// Create and configure API clients with intelligent fallback
export const createStylistApi = (config: StylistApiConfig) => {
  // Use intelligent API client for built-in fallback
  const apiClient = createIntelligentApiClient({
    baseURL: config.apiUrl || DEFAULT_API_URL,
    apiKey: config.apiKey,
    timeout: config.timeout || DEFAULT_TIMEOUT,
    headers: {
      'X-Retailer-ID': config.retailerId
    }
  });
  
  return {
    user: new UserApi(apiClient),
    recommendation: new RecommendationApi(apiClient),
    feedback: new FeedbackApi(apiClient)
  };
};

// Create a default client for testing and development
const defaultApiClient = createIntelligentApiClient();

// Export default API services for convenience
export const defaultApiServices = {
  user: new UserApi(defaultApiClient),
  recommendation: new RecommendationApi(defaultApiClient),
  feedback: new FeedbackApi(defaultApiClient)
};

// Export types
export type { ApiClient };
export { UserApi, RecommendationApi, FeedbackApi };