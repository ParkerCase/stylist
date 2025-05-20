// Mock API middleware for intercepting requests and providing mock responses
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelToken } from 'axios';
import { ApiClient } from '../api/apiClient';
import { get, shouldUseMockData } from '../mock-data';
import { FORCE_DEMO_MODE, USE_MOCK_RETAILER } from '../utils/environment';

/**
 * Setup mock API interceptors on an API client
 * @param apiClient - The ApiClient instance to enhance with mock capability
 * @returns The enhanced API client
 */
export function setupMockApiInterceptors(apiClient: ApiClient): ApiClient {
  // Store original request method
  const originalRequestWithRetry = apiClient['requestWithRetry'].bind(apiClient);
  
  // Override requestWithRetry method to handle mock data
  apiClient['requestWithRetry'] = async function<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Determine if we should use mock data
    if (shouldUseMockResponseForRequest(url, method)) {
      try {
        // Log the intercepted request
        console.debug(`[MockAPI] Intercepting ${method.toUpperCase()} request to ${url}`);
        
        // Build options from request data
        const options = {
          ...(config?.params ? config.params : {}),
          ...(data ? (typeof data === 'object' ? data : {}) : {}),
          url,
          method
        };
        
        // Generate mock response
        const mockResponse = get(url, options);
        
        // Simulate network delay for realism
        await simulateNetworkDelay();
        
        // Log the mock response
        console.debug(`[MockAPI] Returning mock data for ${url}`, mockResponse);
        
        return mockResponse;
      } catch (error) {
        console.error(`[MockAPI] Error generating mock response for ${url}:`, error);
        // Fall through to real API request on error
      }
    }
    
    // Proceed with the original request if we're not using mock data
    return originalRequestWithRetry(method, url, data, config) as Promise<T>;
  };
  
  return apiClient;
}

/**
 * Setup a proper axios interceptor for use with other instances
 * @param axiosInstance - Axios instance to add interceptors to 
 */
export function setupAxiosMockInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.request.use(
    async (config) => {
      const url = config.url || '';
      const method = config.method as 'get' | 'post' | 'put' | 'delete';
      
      // Proceed with real request if we shouldn't mock this request
      if (!shouldUseMockResponseForRequest(url, method)) {
        return config;
      }
      
      // Create a canceled request that will be replaced with mock data
      const cancelToken = new axios.CancelToken((cancel) => {
        cancel('Request intercepted by mock API middleware');
      });
      
      return { ...config, cancelToken };
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor to provide mock data for canceled requests
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Check if this error was from our cancellation
      if (axios.isCancel(error)) {
        const url = error.config.url || '';
        const method = error.config.method as 'get' | 'post' | 'put' | 'delete';
        
        // Build options from request data
        const options = {
          ...(error.config.params ? error.config.params : {}),
          ...(error.config.data ? 
            (typeof error.config.data === 'string' ? 
              JSON.parse(error.config.data) : 
              error.config.data
            ) : {}
          ),
          url,
          method
        };
        
        // Generate mock response
        const mockResponse = get(url, options);
        
        // Simulate network delay
        await simulateNetworkDelay();
        
        // Create a synthetic response
        const response: AxiosResponse = {
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
        };
        
        return response;
      }
      
      // For real errors, reject the promise
      return Promise.reject(error);
    }
  );
}

/**
 * Determine if we should use a mock response for this request
 */
function shouldUseMockResponseForRequest(url: string, method: string): boolean {
  // Always use mock data if forced demo mode is enabled
  if (FORCE_DEMO_MODE) {
    return true;
  }
  
  // Check if we should use mock data based on environment and settings
  if (shouldUseMockData()) {
    return true;
  }
  
  // Use mock data for retailer-specific endpoints if mock retailer is enabled
  if (USE_MOCK_RETAILER && 
     (url.includes('/products') || 
      url.includes('/inventory') || 
      url.includes('/recommendations'))) {
    return true;
  }
  
  // Add other specific endpoint rules here
  
  // Default to real API
  return false;
}

/**
 * Simulate realistic network delay
 */
async function simulateNetworkDelay(): Promise<void> {
  // Randomize delay between 100-500ms for realism
  const delay = 100 + Math.random() * 400;
  return new Promise(resolve => setTimeout(resolve, delay));
}