/**
 * Custom API Adapter for retailer API integration
 * 
 * This adapter allows integration with custom API endpoints that don't follow
 * a standard e-commerce platform format, such as proprietary retailer APIs.
 */

import { RetailerAPIAdapter, InventoryOptions, SearchOptions, InventoryResponse, SearchResponse, ItemDetails } from '../api_manager';
import { BaseAdapter, AdapterConfig, ApiResponse } from './base';
import { MockAdapter } from './mock';

/**
 * CustomAPIAdapter for integration with non-standard retailer APIs
 */
export class CustomAPIAdapter extends BaseAdapter implements RetailerAPIAdapter {
  private mockAdapter: MockAdapter | null = null;
  
  constructor(config: AdapterConfig) {
    super(config);
    
    // If no valid credentials, prepare for mock fallback
    if (!this.hasValidCredentials()) {
      console.warn('No valid Custom API credentials - will use mock data');
      this.mockAdapter = new MockAdapter(config);
    }
  }
  
  /**
   * Format the API URL based on endpoint and base URL
   */
  private formatApiUrl(endpoint: string): string {
    const baseUrl = this.config.apiUrl || '';
    
    // Normalize base URL
    const base = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;
      
    // Format the endpoint
    const path = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;
      
    return `${base}/${path}`;
  }
  
  /**
   * Map a custom API product to our standard format
   * This method should be customized based on the specific API
   */
  private mapProductToItemDetails(product: any): ItemDetails {
    // This is a simplified example - in a real implementation,
    // this would be customized to match the specific API response format
    
    return {
      id: product.id?.toString() || '',
      retailerId: 'custom',
      name: product.name || product.title || '',
      description: product.description || '',
      price: parseFloat(product.price) || 0,
      salePrice: product.sale_price ? parseFloat(product.sale_price) : undefined,
      currency: product.currency || 'USD',
      brand: product.brand || product.vendor || '',
      category: product.category || product.product_type || '',
      subcategory: product.subcategory || '',
      image: product.image || product.images?.[0]?.src || '',
      images: Array.isArray(product.images) 
        ? product.images.map((img: any) => img.src || img)
        : [product.image || ''],
      url: product.url || product.product_url || '',
      available: product.available || product.in_stock || false,
      availableSizes: Array.isArray(product.sizes) ? product.sizes : [],
      color: product.color || '',
      gender: product.gender || '',
      tags: Array.isArray(product.tags) 
        ? product.tags 
        : (typeof product.tags === 'string' ? product.tags.split(',') : []),
      metadata: {
        ...product.metadata,
        originalData: product
      }
    };
  }
  
  /**
   * Get inventory with optional filtering
   */
  async getInventory(options: InventoryOptions = {}): Promise<InventoryResponse> {
    // Use mock adapter if no valid credentials
    if (this.mockAdapter) {
      return this.mockAdapter.getInventory(options);
    }
    
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('getInventory', options);
    const cached = this.getCachedValue<InventoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Build query parameters based on options
      const params = new URLSearchParams();
      
      // Map our standard parameters to the custom API's expected parameters
      // This mapping would be customized for each specific API
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.page) params.append('page', options.page.toString());
      if (options.category) params.append('category', options.category);
      if (options.brand) params.append('brand', options.brand);
      if (options.priceMin) params.append('min_price', options.priceMin.toString());
      if (options.priceMax) params.append('max_price', options.priceMax.toString());
      if (options.gender) params.append('gender', options.gender);
      
      // Make the request
      const endpoint = 'products'; // Customize this endpoint based on the API
      const response = await this.makeRequest<any>(
        'GET',
        this.formatApiUrl(`${endpoint}?${params.toString()}`),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch products from custom API');
      }
      
      // Extract items from the response
      // This would be customized based on the API's response format
      const responseData = response.data;
      const items = Array.isArray(responseData.products || responseData.items || responseData)
        ? (responseData.products || responseData.items || responseData).map(this.mapProductToItemDetails.bind(this))
        : [];
        
      // Extract pagination details
      const totalCount = responseData.total || responseData.count || items.length;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const totalPages = responseData.pages || Math.ceil(totalCount / limit);
      
      // Create response
      const result: InventoryResponse = {
        items,
        totalCount,
        page,
        totalPages
      };
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Custom API getInventory error:', error);
      
      // Fall back to mock adapter on error
      if (!this.mockAdapter) {
        this.mockAdapter = new MockAdapter(this.config);
      }
      
      return this.mockAdapter.getInventory(options);
    }
  }
  
  /**
   * Search for items matching a query
   */
  async searchItems(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    // Use mock adapter if no valid credentials
    if (this.mockAdapter) {
      return this.mockAdapter.searchItems(query, options);
    }
    
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('searchItems', { query, ...options });
    const cached = this.getCachedValue<SearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add search query
      params.append('query', query);
      
      // Map our standard parameters to the custom API's expected parameters
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.page) params.append('page', options.page.toString());
      if (options.category) params.append('category', options.category);
      if (options.brand) params.append('brand', options.brand);
      
      // Make the request
      const endpoint = 'search'; // Customize this endpoint based on the API
      const response = await this.makeRequest<any>(
        'GET',
        this.formatApiUrl(`${endpoint}?${params.toString()}`),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to search products from custom API');
      }
      
      // Extract items from the response
      const responseData = response.data;
      const items = Array.isArray(responseData.products || responseData.items || responseData)
        ? (responseData.products || responseData.items || responseData).map(this.mapProductToItemDetails.bind(this))
        : [];
        
      // Extract pagination details
      const totalCount = responseData.total || responseData.count || items.length;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const totalPages = responseData.pages || Math.ceil(totalCount / limit);
      
      // Create response
      const result: SearchResponse = {
        items,
        totalCount,
        page,
        totalPages,
        query
      };
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Custom API searchItems error:', error);
      
      // Fall back to mock adapter on error
      if (!this.mockAdapter) {
        this.mockAdapter = new MockAdapter(this.config);
      }
      
      return this.mockAdapter.searchItems(query, options);
    }
  }
  
  /**
   * Get detailed information for a specific item
   */
  async getItemDetails(itemId: string): Promise<ItemDetails | null> {
    // Use mock adapter if no valid credentials
    if (this.mockAdapter) {
      return this.mockAdapter.getItemDetails(itemId);
    }
    
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('getItemDetails', { itemId });
    const cached = this.getCachedValue<ItemDetails | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    try {
      // Make the request
      const endpoint = `products/${itemId}`; // Customize this endpoint based on the API
      const response = await this.makeRequest<any>(
        'GET',
        this.formatApiUrl(endpoint),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch product details from custom API');
      }
      
      // Convert to our format
      const item = this.mapProductToItemDetails(response.data.product || response.data);
      
      // Cache the response
      this.setCachedValue(cacheKey, item, 3600); // 1 hour TTL
      
      return item;
    } catch (error) {
      console.error('Custom API getItemDetails error:', error);
      
      // For 404 errors, cache null result
      if (error instanceof Error && error.message.includes('404')) {
        this.setCachedValue(cacheKey, null, 3600); // 1 hour TTL
        return null;
      }
      
      // Fall back to mock adapter on error
      if (!this.mockAdapter) {
        this.mockAdapter = new MockAdapter(this.config);
      }
      
      return this.mockAdapter.getItemDetails(itemId);
    }
  }
  
  /**
   * Check availability for multiple items
   */
  async checkAvailability(itemIds: string[]): Promise<Record<string, boolean>> {
    // Use mock adapter if no valid credentials
    if (this.mockAdapter) {
      return this.mockAdapter.checkAvailability(itemIds);
    }
    
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('checkAvailability', { itemIds: itemIds.sort() });
    const cached = this.getCachedValue<Record<string, boolean>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Some custom APIs might support batch availability checking
      const endpoint = 'availability'; // Customize this endpoint based on the API
      const response = await this.makeRequest<any>(
        'POST',
        this.formatApiUrl(endpoint),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: itemIds })
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to check availability from custom API');
      }
      
      // Extract availability information
      // This would be customized based on the API's response format
      const availability = response.data.availability || {};
      
      // Ensure all requested IDs are in the result
      const result: Record<string, boolean> = {};
      for (const id of itemIds) {
        result[id] = availability[id] || false;
      }
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Custom API checkAvailability error:', error);
      
      // Many APIs don't support batch availability checking,
      // so we might need to fall back to individual item checks
      try {
        const results: Record<string, boolean> = {};
        
        // Process in batches to avoid too many parallel requests
        const batchSize = 5;
        for (let i = 0; i < itemIds.length; i += batchSize) {
          const batch = itemIds.slice(i, i + batchSize);
          
          // Fetch items in parallel
          const items = await Promise.all(
            batch.map(id => this.getItemDetails(id))
          );
          
          // Check availability
          batch.forEach((id, index) => {
            results[id] = items[index]?.available || false;
          });
        }
        
        // Cache the response
        this.setCachedValue(cacheKey, results, 300); // 5 minute TTL
        
        return results;
      } catch (fallbackError) {
        console.error('Custom API individual availability check error:', fallbackError);
        
        // Fall back to mock adapter if both approaches fail
        if (!this.mockAdapter) {
          this.mockAdapter = new MockAdapter(this.config);
        }
        
        return this.mockAdapter.checkAvailability(itemIds);
      }
    }
  }
}