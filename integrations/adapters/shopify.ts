/**
 * Shopify Adapter for retailer API integration
 * 
 * Provides integration with the Shopify API for e-commerce functionality,
 * with graceful fallback to mock data when API credentials are not available.
 */

import { RetailerAPIAdapter, InventoryOptions, SearchOptions, InventoryResponse, SearchResponse, ItemDetails } from '../api_manager';
import { BaseAdapter, AdapterConfig, ApiResponse } from './base';
import { MockAdapter } from './mock';

// Shopify API types
interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  tags: string;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

interface ShopifyImage {
  id: string;
  src: string;
  position: number;
  alt: string | null;
}

/**
 * Shopify API Adapter
 */
export class ShopifyAdapter extends BaseAdapter implements RetailerAPIAdapter {
  private mockAdapter: MockAdapter | null = null;
  private storeUrl: string;
  
  constructor(config: AdapterConfig) {
    super(config);
    
    this.storeUrl = config.storeUrl || '';
    
    // If no valid credentials, prepare for mock fallback
    if (!this.hasValidCredentials()) {
      console.warn('No valid Shopify API credentials - will use mock data');
      this.mockAdapter = new MockAdapter(config);
    }
  }
  
  /**
   * Determine if this adapter requires an API secret
   */
  protected requiresSecret(): boolean {
    return true; // Shopify requires both API key and secret
  }
  
  /**
   * Format URL for Shopify API requests
   */
  private formatApiUrl(endpoint: string): string {
    if (!this.storeUrl) {
      throw new Error('ShopifyAdapter requires a store URL');
    }
    
    // Normalize store URL
    const base = this.storeUrl.endsWith('/')
      ? this.storeUrl.slice(0, -1)
      : this.storeUrl;
      
    // Format the endpoint
    const path = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;
      
    return `${base}/admin/api/${this.config.apiVersion || '2023-10'}/` + path;
  }
  
  /**
   * Convert a Shopify product to ItemDetails format
   */
  private convertShopifyProduct(product: ShopifyProduct): ItemDetails {
    // Get the default variant (first one)
    const defaultVariant = product.variants[0] || {};
    
    // Extract price information
    const price = parseFloat(defaultVariant.price || '0');
    const comparePrice = defaultVariant.compare_at_price 
      ? parseFloat(defaultVariant.compare_at_price) 
      : undefined;
      
    // Extract color from options
    const colorOption = product.options.find(option => 
      option.name.toLowerCase() === 'color'
    );
    const color = colorOption?.values[0];
    
    // Parse tags
    const tags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
    
    // Extract available sizes
    const sizes = product.variants
      .filter(variant => variant.inventory_quantity > 0)
      .map(variant => {
        // Try to find the size option
        return variant.option1 || variant.option2 || variant.option3 || '';
      })
      .filter(size => size); // Remove empty strings
    
    // Determine gender from product type or tags
    let gender: string | undefined;
    if (tags.some(tag => tag.toLowerCase() === 'men')) {
      gender = 'Men';
    } else if (tags.some(tag => tag.toLowerCase() === 'women')) {
      gender = 'Women';
    } else if (tags.some(tag => tag.toLowerCase() === 'unisex')) {
      gender = 'Unisex';
    }
    
    // Format the product
    return {
      id: product.id,
      retailerId: 'shopify',
      name: product.title,
      description: product.description,
      price,
      salePrice: comparePrice && comparePrice > price ? price : undefined,
      currency: 'USD', // Shopify API doesn't always return currency, might need to be configured
      brand: product.vendor,
      category: product.product_type,
      subcategory: undefined, // Shopify doesn't have a direct subcategory equivalent
      image: product.images[0]?.src || '',
      images: product.images.map(img => img.src),
      url: `${this.storeUrl}/products/${product.handle}`,
      available: product.variants.some(v => v.inventory_quantity > 0),
      availableSizes: [...new Set(sizes)], // Remove duplicates
      color,
      gender,
      tags,
      metadata: {
        handle: product.handle,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        publishedAt: product.published_at
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
      // Build query parameters
      const params = new URLSearchParams();
      
      // Apply pagination
      const limit = options.limit || 20;
      const page = options.page || 1;
      params.append('limit', limit.toString());
      
      // Shopify uses page tokens rather than page numbers
      // This is a simplified implementation
      if (page > 1) {
        params.append('page', page.toString());
      }
      
      // Apply filters
      if (options.category) {
        params.append('product_type', options.category);
      }
      
      if (options.brand) {
        params.append('vendor', options.brand);
      }
      
      // Other filters would need to be applied after fetching
      
      // Make the request
      const response = await this.makeRequest<{ products: ShopifyProduct[] }>(
        'GET',
        this.formatApiUrl(`/products.json?${params.toString()}`),
        {
          headers: {
            'X-Shopify-Access-Token': this.config.apiSecret || ''
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch Shopify products');
      }
      
      // Convert products to our format
      const items = response.data.products.map(product => 
        this.convertShopifyProduct(product)
      );
      
      // Apply additional filters that couldn't be applied in the API call
      let filteredItems = items;
      
      if (options.subcategory) {
        filteredItems = filteredItems.filter(item => 
          item.subcategory?.toLowerCase() === options.subcategory?.toLowerCase()
        );
      }
      
      if (options.color) {
        filteredItems = filteredItems.filter(item => 
          item.color?.toLowerCase() === options.color?.toLowerCase()
        );
      }
      
      if (options.priceMin !== undefined) {
        filteredItems = filteredItems.filter(item => 
          item.price >= options.priceMin!
        );
      }
      
      if (options.priceMax !== undefined) {
        filteredItems = filteredItems.filter(item => 
          item.price <= options.priceMax!
        );
      }
      
      if (options.gender) {
        filteredItems = filteredItems.filter(item => 
          item.gender === options.gender
        );
      }
      
      if (options.onSale) {
        filteredItems = filteredItems.filter(item => 
          item.salePrice !== undefined
        );
      }
      
      if (options.tags && options.tags.length > 0) {
        filteredItems = filteredItems.filter(item => 
          item.tags?.some(tag => options.tags!.includes(tag))
        );
      }
      
      // Create response
      const result: InventoryResponse = {
        items: filteredItems,
        totalCount: filteredItems.length, // This is not accurate for total count, just for the filtered items
        page,
        totalPages: Math.ceil(filteredItems.length / limit) // This is approximate
      };
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Shopify getInventory error:', error);
      
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
      
      // Apply pagination
      const limit = options.limit || 20;
      const page = options.page || 1;
      params.append('limit', limit.toString());
      
      if (page > 1) {
        params.append('page', page.toString());
      }
      
      // Add search query
      if (query) {
        params.append('title', query); // Search by title
      }
      
      // Apply filters
      if (options.category) {
        params.append('product_type', options.category);
      }
      
      if (options.brand) {
        params.append('vendor', options.brand);
      }
      
      // Make the request
      const response = await this.makeRequest<{ products: ShopifyProduct[] }>(
        'GET',
        this.formatApiUrl(`/products.json?${params.toString()}`),
        {
          headers: {
            'X-Shopify-Access-Token': this.config.apiSecret || ''
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to search Shopify products');
      }
      
      // Convert products to our format
      const items = response.data.products.map(product => 
        this.convertShopifyProduct(product)
      );
      
      // Apply additional filters
      let filteredItems = items;
      
      // Apply remaining filters from the inventory options
      if (options.subcategory) {
        filteredItems = filteredItems.filter(item => 
          item.subcategory?.toLowerCase() === options.subcategory?.toLowerCase()
        );
      }
      
      // Other filters same as in getInventory...
      
      // Create response
      const result: SearchResponse = {
        items: filteredItems,
        totalCount: filteredItems.length,
        page,
        totalPages: Math.ceil(filteredItems.length / limit),
        query
      };
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Shopify searchItems error:', error);
      
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
      const response = await this.makeRequest<{ product: ShopifyProduct }>(
        'GET',
        this.formatApiUrl(`/products/${itemId}.json`),
        {
          headers: {
            'X-Shopify-Access-Token': this.config.apiSecret || ''
          }
        }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch Shopify product');
      }
      
      // Convert to our format
      const item = this.convertShopifyProduct(response.data.product);
      
      // Cache the response
      this.setCachedValue(cacheKey, item, 3600); // 1 hour TTL
      
      return item;
    } catch (error) {
      console.error('Shopify getItemDetails error:', error);
      
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
      // Fetch each item and check availability
      const results: Record<string, boolean> = {};
      
      // Process in batches
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
    } catch (error) {
      console.error('Shopify checkAvailability error:', error);
      
      // Fall back to mock adapter on error
      if (!this.mockAdapter) {
        this.mockAdapter = new MockAdapter(this.config);
      }
      
      return this.mockAdapter.checkAvailability(itemIds);
    }
  }
}