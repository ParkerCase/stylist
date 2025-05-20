/**
 * Base Adapter for retailer API integration
 * 
 * This abstract class provides the foundation for all retailer API adapters
 * with common utilities for error handling, caching, and retry logic.
 */

import { InventoryOptions, SearchOptions, InventoryResponse, SearchResponse, ItemDetails } from '../api_manager';

export interface AdapterConfig {
  apiKey: string;
  apiSecret?: string;
  apiUrl?: string;
  timeout?: number;
  maxRetries?: number;
  isProduction?: boolean;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string | number;
    details?: any;
  };
}

/**
 * Abstract base class for retailer API adapters
 */
export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected cache: Map<string, { data: any; expires: number }> = new Map();
  protected requestsCount = 0;
  
  /**
   * Create a new adapter instance
   */
  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      isProduction: false,
      ...config
    };
    
    // Validate required configuration
    if (!config.apiKey) {
      console.warn('No API key provided - adapter will operate in demo/mock mode');
    }
  }
  
  /**
   * Check if adapter can operate with real API credentials
   */
  protected hasValidCredentials(): boolean {
    const { apiKey, apiSecret } = this.config;
    
    // Different adapters may have different requirements
    return Boolean(
      apiKey && 
      apiKey !== 'demo_key' && 
      (!this.requiresSecret() || (apiSecret && apiSecret !== 'demo_secret'))
    );
  }
  
  /**
   * Determine if this adapter requires an API secret
   * (override in subclasses as needed)
   */
  protected requiresSecret(): boolean {
    return false;
  }
  
  /**
   * Get a cached value if available and not expired
   */
  protected getCachedValue<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    return null;
  }
  
  /**
   * Store a value in the cache with expiration
   */
  protected setCachedValue<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  /**
   * Generate a cache key from operation and parameters
   */
  protected getCacheKey(operation: string, params: Record<string, any> = {}): string {
    const sortedEntries = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    
    const paramsString = sortedEntries
      .map(([key, value]) => {
        // Handle arrays and objects for consistent keys
        if (Array.isArray(value)) {
          return `${key}=${value.sort().join(',')}`;
        } else if (typeof value === 'object' && value !== null) {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
      })
      .join('&');
    
    return `${operation}:${paramsString}`;
  }
  
  /**
   * Clear all cached values
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Make an API request with retry logic
   */
  protected async makeRequest<T>(
    method: string,
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;
    
    while (retries <= maxRetries) {
      try {
        this.requestsCount++;
        
        // Add default options
        const requestOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {})
          },
          ...options
        };
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
        requestOptions.signal = controller.signal;
        
        // Make the request
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        // Handle response
        if (!response.ok) {
          // Handle specific error codes
          if (response.status === 429) {
            // Rate limiting - retry with exponential backoff
            retries++;
            if (retries <= maxRetries) {
              const delay = Math.pow(2, retries) * 1000;
              console.warn(`Rate limit hit, retrying in ${delay}ms (${retries}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // Other error
          let errorDetail;
          try {
            errorDetail = await response.json();
          } catch (e) {
            errorDetail = await response.text();
          }
          
          return {
            success: false,
            error: {
              message: `API error: ${response.status} ${response.statusText}`,
              code: response.status,
              details: errorDetail
            }
          };
        }
        
        // Parse response based on content type
        const contentType = response.headers.get('Content-Type') || '';
        let data: any;
        
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        return { success: true, data: data as T };
      } catch (error: any) {
        // Network error or abort
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: {
              message: 'Request timed out',
              code: 'TIMEOUT',
              details: error
            }
          };
        }
        
        // Other errors - retry if possible
        retries++;
        if (retries <= maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          console.warn(`Request failed, retrying in ${delay}ms (${retries}/${maxRetries})`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          return {
            success: false,
            error: {
              message: `Request failed after ${maxRetries} retries: ${error.message}`,
              code: 'NETWORK_ERROR',
              details: error
            }
          };
        }
      }
    }
    
    // This should never be reached due to the return in the catch block
    return {
      success: false,
      error: {
        message: 'Unknown error occurred',
        code: 'UNKNOWN'
      }
    };
  }
  
  // Abstract methods that must be implemented by subclasses
  abstract getInventory(options: InventoryOptions): Promise<InventoryResponse>;
  abstract searchItems(query: string, options?: SearchOptions): Promise<SearchResponse>;
  abstract getItemDetails(itemId: string): Promise<ItemDetails | null>;
  abstract checkAvailability(itemIds: string[]): Promise<Record<string, boolean>>;
}