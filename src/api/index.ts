// Export all API clients and create a configured instance

import { createApiClient, ApiClient } from './apiClient';
import { UserApi } from './userApi';
import { RecommendationApi } from './recommendationApi';

// Default API configuration
const DEFAULT_API_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT = 15000;

// API client configuration interface
export interface StylistApiConfig {
  apiUrl?: string;
  apiKey: string;
  timeout?: number;
  retailerId: string;
}

// Create and configure API clients
export const createStylistApi = (config: StylistApiConfig) => {
  const apiClient = createApiClient({
    baseURL: config.apiUrl || DEFAULT_API_URL,
    apiKey: config.apiKey,
    timeout: config.timeout || DEFAULT_TIMEOUT,
    headers: {
      'X-Retailer-ID': config.retailerId
    }
  });
  
  return {
    user: new UserApi(apiClient),
    recommendation: new RecommendationApi(apiClient)
  };
};

// Export types
export type { ApiClient };
export { UserApi, RecommendationApi };
