/**
 * Mock Adapter for retailer API integration
 * 
 * This adapter provides realistic mock data for development and testing,
 * and serves as a fallback when real API credentials are not available.
 */

import { RetailerAPIAdapter, InventoryOptions, SearchOptions, InventoryResponse, SearchResponse, ItemDetails } from '../api_manager';
import { BaseAdapter, AdapterConfig } from './base';

// Sample data for mock implementation
import { generateMockInventory, generateMockItem } from '../mock_data';

export class MockAdapter extends BaseAdapter implements RetailerAPIAdapter {
  private inventory: ItemDetails[] = [];
  
  constructor(config: AdapterConfig) {
    super(config);
    
    // Initialize with sample data
    this.inventory = generateMockInventory(100);
    console.info(`MockAdapter initialized with ${this.inventory.length} items`);
  }
  
  /**
   * Get inventory with optional filtering
   */
  async getInventory(options: InventoryOptions = {}): Promise<InventoryResponse> {
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('getInventory', options);
    const cached = this.getCachedValue<InventoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Apply filtering
    let filteredItems = [...this.inventory];
    
    if (options.category) {
      filteredItems = filteredItems.filter(item => 
        item.category?.toLowerCase() === options.category?.toLowerCase()
      );
    }
    
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
        item.price >= (options.priceMin || 0)
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
        item.salePrice !== undefined && item.salePrice < item.price
      );
    }
    
    if (options.tags && options.tags.length > 0) {
      filteredItems = filteredItems.filter(item => 
        item.tags?.some(tag => options.tags!.includes(tag))
      );
    }
    
    // Apply pagination
    const limit = options.limit || 20;
    const page = options.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    const response: InventoryResponse = {
      items: paginatedItems,
      totalCount: filteredItems.length,
      page,
      totalPages: Math.ceil(filteredItems.length / limit)
    };
    
    // Cache the response
    this.setCachedValue(cacheKey, response, 300); // 5 minute TTL
    
    return response;
  }
  
  /**
   * Search for items matching a query
   */
  async searchItems(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('searchItems', { query, ...options });
    const cached = this.getCachedValue<SearchResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Normalize query
    const normalizedQuery = query.trim().toLowerCase();
    
    if (!normalizedQuery) {
      // Empty query returns empty results
      return {
        items: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
        query
      };
    }
    
    // Get base inventory with filtering
    const { items, ...rest } = await this.getInventory(options);
    
    // Apply search filter
    const searchFields = options.searchFields || ['name', 'description', 'brand', 'category', 'tags'];
    
    const matchingItems = items.filter(item => {
      // Check each search field
      return searchFields.some(field => {
        const value = (item as any)[field];
        
        if (Array.isArray(value)) {
          // For arrays (like tags), check if any value contains the query
          return value.some((v: any) => 
            String(v).toLowerCase().includes(normalizedQuery)
          );
        } else if (value) {
          // For string fields, check if value contains the query
          return String(value).toLowerCase().includes(normalizedQuery);
        }
        
        return false;
      });
    });
    
    const response: SearchResponse = {
      ...rest,
      items: matchingItems,
      totalCount: matchingItems.length,
      totalPages: Math.ceil(matchingItems.length / (options.limit || 20)),
      query
    };
    
    // Cache the response
    this.setCachedValue(cacheKey, response, 300); // 5 minute TTL
    
    return response;
  }
  
  /**
   * Get detailed information for a specific item
   */
  async getItemDetails(itemId: string): Promise<ItemDetails | null> {
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('getItemDetails', { itemId });
    const cached = this.getCachedValue<ItemDetails | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Find the item in the inventory
    const item = this.inventory.find(item => item.id === itemId);
    
    // Cache the response (including null results)
    this.setCachedValue(cacheKey, item || null, 3600); // 1 hour TTL
    
    return item || null;
  }
  
  /**
   * Check availability for multiple items
   */
  async checkAvailability(itemIds: string[]): Promise<Record<string, boolean>> {
    // Apply cache if appropriate
    const cacheKey = this.getCacheKey('checkAvailability', { itemIds: itemIds.sort() });
    const cached = this.getCachedValue<Record<string, boolean>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // For mock data, simulate some items being unavailable
    const result: Record<string, boolean> = {};
    
    for (const itemId of itemIds) {
      const item = await this.getItemDetails(itemId);
      // Item exists and is available 80% of the time
      result[itemId] = item !== null && (Math.random() < 0.8);
    }
    
    // Cache the response
    this.setCachedValue(cacheKey, result, 300); // 5 minute TTL
    
    return result;
  }
}