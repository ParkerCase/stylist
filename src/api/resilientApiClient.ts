/**
 * Resilient API Client
 * 
 * A robust API client with built-in error handling, retries, fallbacks,
 * and offline support. This extends the base apiClient with enhanced
 * resilience features for a better user experience.
 */

import { offlineFetch, offlineService } from '../services/offlineService';
import { debugLog, debugError } from '../utils/debugMode';

// Default options for requests
const DEFAULT_OPTIONS = {
  retries: 3,
  retryDelay: 1000,
  timeout: 15000,
  offlineable: true,
  fallbackData: null
};

/**
 * Makes a resilient fetch request with built-in error handling, retries,
 * and offline support.
 * 
 * @param url The URL to request
 * @param options Fetch options
 * @param resilientOptions Additional resilience options
 * @returns Promise that resolves with the response data
 */
export const resilientFetch = async (
  url: string,
  options: RequestInit = {},
  resilientOptions: {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    offlineable?: boolean;
    fallbackData?: any;
    onRetry?: (retryCount: number, error: Error) => void;
    onOfflineFallback?: () => void;
  } = {}
): Promise<any> => {
  // Merge options with defaults
  const {
    retries = DEFAULT_OPTIONS.retries,
    retryDelay = DEFAULT_OPTIONS.retryDelay,
    timeout = DEFAULT_OPTIONS.timeout,
    offlineable = DEFAULT_OPTIONS.offlineable,
    fallbackData = DEFAULT_OPTIONS.fallbackData,
    onRetry,
    onOfflineFallback
  } = resilientOptions;
  
  let lastError: Error | null = null;
  
  // Try the request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use offline-aware fetch
      const response = await offlineFetch(
        url,
        {
          ...options,
          signal: AbortSignal.timeout(timeout)
        },
        {
          offlineable,
          timeout,
          offlineData: fallbackData
        }
      );
      
      // Parse the response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType && contentType.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }
      
      // If response is not ok, throw error
      if (!response.ok) {
        throw new Error(
          typeof data === 'object'
            ? data.message || `Request failed with status ${response.status}`
            : `Request failed with status ${response.status}`
        );
      }
      
      return data;
    } catch (error) {
      lastError = error as Error;
      
      // If this is the last attempt, handle special cases
      if (attempt === retries) {
        debugError(`Request to ${url} failed after ${retries} retries`, error);
        
        // If offline mode is enabled, try to handle offline
        if (offlineService.isOfflineModeEnabled() && offlineable) {
          debugLog(`Handling request to ${url} in offline mode`);
          
          if (onOfflineFallback) {
            onOfflineFallback();
          }
          
          if (fallbackData) {
            return fallbackData;
          }
          
          throw new Error('Failed to fetch and no offline data available');
        }
        
        // Otherwise, just throw the error
        throw error;
      }
      
      // Not the last attempt, try again after delay
      debugLog(`Retry ${attempt + 1}/${retries} for ${url} after ${retryDelay}ms`);
      
      if (onRetry) {
        onRetry(attempt + 1, error as Error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Should never reach here due to the loop structure, but TypeScript needs it
  throw lastError || new Error('Unknown error during request');
};

/**
 * Creates a base URL for API requests
 * @param apiUrl Base API URL
 * @returns Complete base URL with protocol
 */
export const createBaseUrl = (apiUrl?: string): string => {
  const defaultUrl = 'https://api.stylist.ai';
  
  if (!apiUrl) return defaultUrl;
  
  // Add protocol if missing
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    return `https://${apiUrl}`;
  }
  
  return apiUrl;
};

/**
 * Creates request headers for API requests
 * @param apiKey API key for authentication
 * @param additionalHeaders Additional headers to include
 * @returns Headers object
 */
export const createHeaders = (
  apiKey: string,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    ...additionalHeaders
  };
};

/**
 * Creates a resilient API client for a specific API
 * @param baseUrl Base URL for the API
 * @param headers Default headers for requests
 * @returns API client object with HTTP methods
 */
export const createResilientApiClient = (
  baseUrl: string,
  headers: Record<string, string>
) => {
  return {
    /**
     * Make a GET request to the API
     * @param path API endpoint path
     * @param options Optional fetch options
     * @param resilientOptions Optional resilience options
     * @returns Promise that resolves with the response data
     */
    get: async <T = any>(
      path: string, 
      options: RequestInit = {}, 
      resilientOptions = {}
    ): Promise<T> => {
      const url = `${baseUrl}${path}`;
      return resilientFetch(
        url,
        {
          method: 'GET',
          headers: { ...headers, ...options.headers },
          ...options
        },
        resilientOptions
      );
    },
    
    /**
     * Make a POST request to the API
     * @param path API endpoint path
     * @param data Request body data
     * @param options Optional fetch options
     * @param resilientOptions Optional resilience options
     * @returns Promise that resolves with the response data
     */
    post: async <T = any>(
      path: string,
      data: any,
      options: RequestInit = {},
      resilientOptions = {}
    ): Promise<T> => {
      const url = `${baseUrl}${path}`;
      return resilientFetch(
        url,
        {
          method: 'POST',
          headers: { ...headers, ...options.headers },
          body: JSON.stringify(data),
          ...options
        },
        resilientOptions
      );
    },
    
    /**
     * Make a PUT request to the API
     * @param path API endpoint path
     * @param data Request body data
     * @param options Optional fetch options
     * @param resilientOptions Optional resilience options
     * @returns Promise that resolves with the response data
     */
    put: async <T = any>(
      path: string,
      data: any,
      options: RequestInit = {},
      resilientOptions = {}
    ): Promise<T> => {
      const url = `${baseUrl}${path}`;
      return resilientFetch(
        url,
        {
          method: 'PUT',
          headers: { ...headers, ...options.headers },
          body: JSON.stringify(data),
          ...options
        },
        resilientOptions
      );
    },
    
    /**
     * Make a DELETE request to the API
     * @param path API endpoint path
     * @param options Optional fetch options
     * @param resilientOptions Optional resilience options
     * @returns Promise that resolves with the response data
     */
    delete: async <T = any>(
      path: string,
      options: RequestInit = {},
      resilientOptions = {}
    ): Promise<T> => {
      const url = `${baseUrl}${path}`;
      return resilientFetch(
        url,
        {
          method: 'DELETE',
          headers: { ...headers, ...options.headers },
          ...options
        },
        resilientOptions
      );
    }
  };
};

// Export a factory function to create API clients
export const createResilientApi = (
  apiKey: string,
  apiUrl?: string,
  additionalHeaders: Record<string, string> = {}
) => {
  const baseUrl = createBaseUrl(apiUrl);
  const headers = createHeaders(apiKey, additionalHeaders);
  
  return createResilientApiClient(baseUrl, headers);
};