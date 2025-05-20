/**
 * API Manager - Frontend interface for the retailer API integration layer
 * 
 * This module provides a unified interface for integrating with different
 * e-commerce platforms, with configuration-based switching and graceful fallbacks.
 */

import { IS_PRODUCTION, STYLIST_API_KEY, getEnv } from '../src/utils/environment';

// API Adapter interfaces
export interface RetailerAPIAdapter {
  getInventory(options: InventoryOptions): Promise<InventoryResponse>;
  searchItems(query: string, options?: SearchOptions): Promise<SearchResponse>;
  getItemDetails(itemId: string): Promise<ItemDetails | null>;
  checkAvailability(itemIds: string[]): Promise<Record<string, boolean>>;
}

// Adapter implementations
import { WooCommerceAdapter } from './adapters/woocommerce';
import { ShopifyAdapter } from './adapters/shopify';
import { CustomAPIAdapter } from './adapters/custom';
import { MockAdapter } from './adapters/mock';

// Configuration types
export interface InventoryOptions {
  limit?: number;
  page?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  size?: string;
  gender?: string;
  onSale?: boolean;
  tags?: string[];
}

export interface SearchOptions extends InventoryOptions {
  exactMatch?: boolean;
  searchFields?: string[];
}

export interface InventoryResponse {
  items: ItemDetails[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface SearchResponse extends InventoryResponse {
  query: string;
}

export interface ItemDetails {
  id: string;
  retailerId: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  currency: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  image: string;
  images?: string[];
  url: string;
  available: boolean;
  availableSizes?: string[];
  color?: string;
  gender?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Adapter registry
const API_ADAPTERS: Record<string, new (...args: any[]) => RetailerAPIAdapter> = {
  'woocommerce': WooCommerceAdapter,
  'shopify': ShopifyAdapter,
  'custom': CustomAPIAdapter,
  'mock': MockAdapter,
};

/**
 * API Manager for creating and managing retailer API clients
 */
export class APIManager {
  private adapters: Map<string, RetailerAPIAdapter> = new Map();
  private defaultProvider: string;
  
  /**
   * Initialize the API manager with configuration options
   */
  constructor(defaultProvider: string = 'mock') {
    this.defaultProvider = defaultProvider;
    
    // Check for environment override
    const providerOverride = getEnv('API_PROVIDER', '');
    if (providerOverride && providerOverride in API_ADAPTERS) {
      this.defaultProvider = providerOverride;
      console.info(`Using environment-specified API provider: ${providerOverride}`);
    } else {
      console.info(`Using default API provider: ${defaultProvider}`);
    }
  }
  
  /**
   * Get or create an adapter instance for the specified provider
   */
  getAdapter(provider: string = this.defaultProvider): RetailerAPIAdapter {
    // Check if we already have an instance
    if (this.adapters.has(provider)) {
      return this.adapters.get(provider)!;
    }
    
    // Check if provider is valid
    if (!(provider in API_ADAPTERS)) {
      console.warn(`Unknown provider '${provider}'. Falling back to ${this.defaultProvider}`);
      provider = this.defaultProvider;
    }
    
    try {
      // Create new adapter instance
      const AdapterClass = API_ADAPTERS[provider];
      const adapter = new AdapterClass({
        apiKey: STYLIST_API_KEY,
        isProduction: IS_PRODUCTION,
      });
      
      // Store for reuse
      this.adapters.set(provider, adapter);
      return adapter;
    } catch (error) {
      console.error(`Error creating ${provider} adapter:`, error);
      
      // Fall back to mock if not already trying mock
      if (provider !== 'mock') {
        console.warn(`Falling back to mock adapter`);
        return this.getAdapter('mock');
      }
      
      // This should never happen - mock adapter should always work
      throw new Error(`Failed to create any working API adapter`);
    }
  }
  
  /**
   * Clear all cached adapters
   */
  clearAdapters(): void {
    this.adapters.clear();
  }
  
  /**
   * Create instance from environment configuration
   */
  static fromEnvironment(): APIManager {
    const defaultProvider = getEnv('DEFAULT_API_PROVIDER', 'mock');
    return new APIManager(defaultProvider);
  }
}

// Singleton instance for convenience
let defaultManager: APIManager | null = null;

/**
 * Get the default API manager instance
 */
export function getAPIManager(): APIManager {
  if (!defaultManager) {
    defaultManager = APIManager.fromEnvironment();
  }
  return defaultManager;
}

/**
 * Get an API adapter using the default manager
 */
export function getAPIAdapter(provider?: string): RetailerAPIAdapter {
  const manager = getAPIManager();
  return manager.getAdapter(provider);
}