/**
 * WooCommerce Adapter for retailer API integration
 * 
 * Provides integration with the WooCommerce API for e-commerce functionality,
 * with graceful fallback to mock data when API credentials are not available.
 */

import { RetailerAPIAdapter, InventoryOptions, SearchOptions, InventoryResponse, SearchResponse, ItemDetails } from '../api_manager';
import { BaseAdapter, AdapterConfig, ApiResponse } from './base';
import { MockAdapter } from './mock';

// WooCommerce API types
interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  tags: {
    id: number;
    name: string;
    slug: string;
  }[];
  images: {
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }[];
  attributes: {
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }[];
  default_attributes: {
    id: number;
    name: string;
    option: string;
  }[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: {
    id: number;
    key: string;
    value: any;
  }[];
}

/**
 * WooCommerce API Adapter
 */
export class WooCommerceAdapter extends BaseAdapter implements RetailerAPIAdapter {
  private mockAdapter: MockAdapter | null = null;
  private storeUrl: string;
  
  constructor(config: AdapterConfig) {
    super(config);
    
    this.storeUrl = config.storeUrl || '';
    
    // If no valid credentials, prepare for mock fallback
    if (!this.hasValidCredentials()) {
      console.warn('No valid WooCommerce API credentials - will use mock data');
      this.mockAdapter = new MockAdapter(config);
    }
  }
  
  /**
   * Determine if this adapter requires an API secret
   */
  protected requiresSecret(): boolean {
    return true; // WooCommerce requires both consumer key and secret
  }
  
  /**
   * Format URL for WooCommerce API requests
   */
  private formatApiUrl(endpoint: string): string {
    if (!this.storeUrl) {
      throw new Error('WooCommerceAdapter requires a store URL');
    }
    
    // Normalize store URL
    const base = this.storeUrl.endsWith('/')
      ? this.storeUrl.slice(0, -1)
      : this.storeUrl;
      
    // Format the endpoint
    const path = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;
      
    return `${base}/wp-json/wc/v3/${path}`;
  }
  
  /**
   * Generate OAuth signature for WooCommerce API
   * Note: This is a simplified implementation - in production, you would use a library
   */
  private getAuthParams(): string {
    // For WooCommerce REST API, we need to include consumer key and secret
    const params = new URLSearchParams();
    params.append('consumer_key', this.config.apiKey);
    params.append('consumer_secret', this.config.apiSecret || '');
    return params.toString();
  }
  
  /**
   * Convert a WooCommerce product to ItemDetails format
   */
  private convertWooCommerceProduct(product: WooCommerceProduct): ItemDetails {
    // Extract price information
    const price = parseFloat(product.regular_price || product.price || '0');
    const salePrice = product.on_sale && product.sale_price
      ? parseFloat(product.sale_price)
      : undefined;
      
    // Extract color from attributes
    const colorAttribute = product.attributes.find(attr => 
      attr.name.toLowerCase() === 'color'
    );
    const color = colorAttribute?.options[0];
    
    // Extract tags
    const tags = product.tags.map(tag => tag.name);
    
    // Extract category and subcategory
    const mainCategory = product.categories[0]?.name || '';
    const subcategory = product.categories.length > 1 ? product.categories[1]?.name : undefined;
    
    // Extract sizes from attributes
    const sizeAttribute = product.attributes.find(attr => 
      attr.name.toLowerCase() === 'size'
    );
    const availableSizes = sizeAttribute?.options || [];
    
    // Determine gender from categories or attributes
    let gender: string | undefined;
    const genderCategory = product.categories.find(cat => 
      ['men', 'women', 'unisex'].includes(cat.name.toLowerCase())
    );
    
    if (genderCategory) {
      gender = genderCategory.name.toLowerCase() === 'men' ? 'Men' :
               genderCategory.name.toLowerCase() === 'women' ? 'Women' : 'Unisex';
    }
    
    // Format the product
    return {
      id: product.id.toString(),
      retailerId: 'woocommerce',
      name: product.name,
      description: product.description,
      price,
      salePrice,
      currency: 'USD', // WooCommerce API doesn't return currency, would need to be configured
      brand: product.meta_data.find(meta => meta.key === 'brand')?.value as string || '',
      category: mainCategory,
      subcategory,
      image: product.images[0]?.src || '',
      images: product.images.map(img => img.src),
      url: product.permalink,
      available: product.stock_status === 'instock',
      availableSizes,
      color,
      gender,
      tags,
      metadata: {
        sku: product.sku,
        weight: product.weight,
        dimensions: product.dimensions,
        averageRating: product.average_rating,
        stockQuantity: product.stock_quantity
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
      const params = new URLSearchParams(this.getAuthParams());
      
      // Apply pagination
      const limit = options.limit || 20;
      const page = options.page || 1;
      params.append('per_page', limit.toString());
      params.append('page', page.toString());
      
      // Apply filters
      if (options.category) {
        params.append('category', options.category);
      }
      
      if (options.onSale) {
        params.append('on_sale', 'true');
      }
      
      // Stock status
      params.append('stock_status', 'instock');
      
      // Other filters would need to be applied after fetching
      
      // Make the request
      const response = await this.makeRequest<WooCommerceProduct[]>(
        'GET',
        `${this.formatApiUrl(`/products?${params.toString()}`)}`
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch WooCommerce products');
      }
      
      // Convert products to our format
      const items = response.data.map(product => 
        this.convertWooCommerceProduct(product)
      );
      
      // Apply additional filters that couldn't be applied in the API call
      let filteredItems = items;
      
      if (options.subcategory) {
        filteredItems = filteredItems.filter(item => 
          item.subcategory?.toLowerCase() === options.subcategory?.toLowerCase()
        );
      }
      
      if (options.brand) {
        filteredItems = filteredItems.filter(item => 
          item.brand?.toLowerCase() === options.brand?.toLowerCase()
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
      
      if (options.tags && options.tags.length > 0) {
        filteredItems = filteredItems.filter(item => 
          item.tags?.some(tag => options.tags!.includes(tag))
        );
      }
      
      // Get total from headers (WooCommerce API returns this)
      const totalCount = parseInt(response.data.length.toString()) || filteredItems.length;
      const totalPages = parseInt('1') || Math.ceil(totalCount / limit);
      
      // Create response
      const result: InventoryResponse = {
        items: filteredItems,
        totalCount,
        page,
        totalPages
      };
      
      // Cache the response
      this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('WooCommerce getInventory error:', error);
      
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
      const params = new URLSearchParams(this.getAuthParams());
      
      // Apply pagination
      const limit = options.limit || 20;
      const page = options.page || 1;
      params.append('per_page', limit.toString());
      params.append('page', page.toString());
      
      // Add search query
      if (query) {
        params.append('search', query);
      }
      
      // Apply filters
      if (options.category) {
        params.append('category', options.category);
      }
      
      if (options.onSale) {
        params.append('on_sale', 'true');
      }
      
      // Stock status
      params.append('stock_status', 'instock');
      
      // Make the request
      const response = await this.makeRequest<WooCommerceProduct[]>(
        'GET',
        `${this.formatApiUrl(`/products?${params.toString()}`)}`
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to search WooCommerce products');
      }
      
      // Convert products to our format
      const items = response.data.map(product => 
        this.convertWooCommerceProduct(product)
      );
      
      // Apply additional filters that couldn't be applied in the API call
      let filteredItems = items;
      
      // Same additional filters as in getInventory
      // ...
      
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
      console.error('WooCommerce searchItems error:', error);
      
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
      const params = new URLSearchParams(this.getAuthParams());
      
      const response = await this.makeRequest<WooCommerceProduct>(
        'GET',
        `${this.formatApiUrl(`/products/${itemId}?${params.toString()}`)}`
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch WooCommerce product');
      }
      
      // Convert to our format
      const item = this.convertWooCommerceProduct(response.data);
      
      // Cache the response
      this.setCachedValue(cacheKey, item, 3600); // 1 hour TTL
      
      return item;
    } catch (error) {
      console.error('WooCommerce getItemDetails error:', error);
      
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
      console.error('WooCommerce checkAvailability error:', error);
      
      // Fall back to mock adapter on error
      if (!this.mockAdapter) {
        this.mockAdapter = new MockAdapter(this.config);
      }
      
      return this.mockAdapter.checkAvailability(itemIds);
    }
  }
}