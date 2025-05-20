// Intelligent API client with automatic fallback to mock data
import { ApiClient, createApiClient } from './apiClient';
import { setupMockApiInterceptors } from '../services/mockApiMiddleware';
import { USE_MOCK_RETAILER, FORCE_DEMO_MODE, API_URL, API_TIMEOUT } from '../utils/environment';
import { shouldUseMockData } from '../mock-data';

/**
 * Create an API client with intelligent fallback to mock data
 * This is the main client that should be used throughout the application
 */
export function createIntelligentApiClient(
  config: {
    baseURL?: string;
    apiKey?: string;
    timeout?: number;
    headers?: Record<string, string>;
    getAuthHeader?: () => Record<string, string>;
  } = {}
): ApiClient {
  // Create base API client
  const apiClient = createApiClient({
    baseURL: config.baseURL || API_URL,
    apiKey: config.apiKey,
    timeout: config.timeout || API_TIMEOUT,
    headers: config.headers,
    getAuthHeader: config.getAuthHeader,
    // Always use at least 2 retries in case of network issues
    maxRetries: 2
  });

  // Enable mock data capabilities
  const enhancedApiClient = setupMockApiInterceptors(apiClient);
  
  // Log configuration for debugging
  console.debug('Intelligent API Client initialized:', {
    useMockData: shouldUseMockData() || FORCE_DEMO_MODE,
    useMockRetailer: USE_MOCK_RETAILER,
    forceDemo: FORCE_DEMO_MODE,
    baseURL: config.baseURL || API_URL
  });
  
  return enhancedApiClient;
}

// Export a singleton instance for general use
export const intelligentApiClient = createIntelligentApiClient();