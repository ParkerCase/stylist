// src/store/__tests__/recommendationStore.test.ts
import { act, renderHook } from '@testing-library/react-hooks';
import useRecommendationStore from '../recommendationStore';
import { Recommendation } from '@/types/index';

describe('Recommendation Store', () => {
  // Sample test data
  const sampleItems: Recommendation.RecommendationItem[] = [
    {
      id: 'item1',
      name: 'Test Item 1',
      brand: 'Test Brand',
      price: 29.99,
      category: 'tops',
      retailerId: 'test',
      inStock: true,
      imageUrls: ['test1.jpg'],
      matchScore: 0.8,
      matchReasons: ['Matches your style'],
      colors: [],
      sizes: [],
      url: 'https://example.com/item1'
    },
    {
      id: 'item2',
      name: 'Test Item 2',
      brand: 'Test Brand',
      price: 39.99,
      category: 'bottoms',
      retailerId: 'test',
      inStock: true,
      imageUrls: ['test2.jpg'],
      matchScore: 0.7,
      matchReasons: ['Matches your style'],
      colors: [],
      sizes: [],
      url: 'https://example.com/item2'
    }
  ];
  
  const sampleOutfits: Recommendation.Outfit[] = [
    {
      id: 'outfit1',
      name: 'Test Outfit 1',
      items: [
        {
          id: 'item1',
          name: 'Test Item 1',
          brand: 'Test Brand',
          price: 29.99,
          category: 'tops',
          retailerId: 'test',
          inStock: true,
          imageUrls: ['test1.jpg'],
          matchScore: 0.8,
          matchReasons: ['Matches your style'],
          colors: [],
          sizes: [],
          url: 'https://example.com/item1'
        },
        {
          id: 'item2',
          name: 'Test Item 2',
          brand: 'Test Brand',
          price: 39.99,
          category: 'bottoms',
          retailerId: 'test',
          inStock: true,
          imageUrls: ['test2.jpg'],
          matchScore: 0.7,
          matchReasons: ['Matches your style'],
          colors: [],
          sizes: [],
          url: 'https://example.com/item2'
        }
      ],
      occasion: 'casual',
      matchScore: 0.9,
      matchReasons: ['Matches your casual style']
    }
  ];
  
  // Reset store before each test
  beforeEach(() => {
    act(() => {
      useRecommendationStore.getState().clearRecommendations();
    });
  });
  
  test('should initialize with empty recommendations', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    expect(result.current.recommendedItems).toEqual([]);
    expect(result.current.recommendedOutfits).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  test('should set recommended items', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    act(() => {
      result.current.setRecommendedItems(sampleItems);
    });
    
    expect(result.current.recommendedItems).toEqual(sampleItems);
  });
  
  test('should set recommended outfits', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    act(() => {
      result.current.setRecommendedOutfits(sampleOutfits);
    });
    
    expect(result.current.recommendedOutfits).toEqual(sampleOutfits);
  });
  
  test('should add individual items', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    act(() => {
      result.current.addRecommendedItem(sampleItems[0]);
    });
    
    expect(result.current.recommendedItems).toEqual([sampleItems[0]]);
    
    // Add another item
    act(() => {
      result.current.addRecommendedItem(sampleItems[1]);
    });
    
    expect(result.current.recommendedItems).toEqual(sampleItems);
  });
  
  test('should add individual outfits', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    act(() => {
      result.current.addRecommendedOutfit(sampleOutfits[0]);
    });
    
    expect(result.current.recommendedOutfits).toEqual(sampleOutfits);
  });
  
  test('should handle loading state', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    expect(result.current.loading).toBe(false);
    
    act(() => {
      result.current.setLoading(true);
    });
    
    expect(result.current.loading).toBe(true);
    
    act(() => {
      result.current.setLoading(false);
    });
    
    expect(result.current.loading).toBe(false);
  });
  
  test('should handle error state', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    expect(result.current.error).toBe(null);
    
    const testError = 'Test error message';
    
    act(() => {
      result.current.setError(testError);
    });
    
    expect(result.current.error).toBe(testError);
    
    act(() => {
      result.current.setError(null);
    });
    
    expect(result.current.error).toBe(null);
  });
  
  test('should clear recommendations', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Add some recommendations
    act(() => {
      result.current.setRecommendedItems(sampleItems);
      result.current.setRecommendedOutfits(sampleOutfits);
    });
    
    // Verify they were added
    expect(result.current.recommendedItems).toEqual(sampleItems);
    expect(result.current.recommendedOutfits).toEqual(sampleOutfits);
    
    // Clear recommendations
    act(() => {
      result.current.clearRecommendations();
    });
    
    // Verify they were cleared
    expect(result.current.recommendedItems).toEqual([]);
    expect(result.current.recommendedOutfits).toEqual([]);
  });
  
  test('should filter items by category', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Add sample items
    act(() => {
      result.current.setRecommendedItems(sampleItems);
    });
    
    // Filter by tops category
    let filteredItems = result.current.getItemsByCategory('tops');
    expect(filteredItems).toHaveLength(1);
    expect(filteredItems[0].id).toBe('item1');
    
    // Filter by bottoms category
    filteredItems = result.current.getItemsByCategory('bottoms');
    expect(filteredItems).toHaveLength(1);
    expect(filteredItems[0].id).toBe('item2');
    
    // Filter by non-existent category
    filteredItems = result.current.getItemsByCategory('shoes');
    expect(filteredItems).toHaveLength(0);
  });
  
  test('should sort recommendations by match score', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Create items with different match scores
    const unsortedItems = [
      { ...sampleItems[0], matchScore: 0.5 },
      { ...sampleItems[1], matchScore: 0.9 }
    ];
    
    // Add items in an unsorted order
    act(() => {
      result.current.setRecommendedItems(unsortedItems);
    });
    
    // Get items sorted by match score (higher first)
    const sortedItems = result.current.getItemsSortedByMatchScore();
    
    expect(sortedItems[0].id).toBe('item2'); // Higher match score (0.9)
    expect(sortedItems[1].id).toBe('item1'); // Lower match score (0.5)
  });
  
  test('should get outfit by id', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Add sample outfits
    act(() => {
      result.current.setRecommendedOutfits(sampleOutfits);
    });
    
    // Get outfit by id
    const outfit = result.current.getOutfitById('outfit1');
    expect(outfit).toBeDefined();
    expect(outfit?.id).toBe('outfit1');
    
    // Try to get non-existent outfit
    const nonExistentOutfit = result.current.getOutfitById('non-existent');
    expect(nonExistentOutfit).toBeUndefined();
  });
  
  test('should get item by id', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Add sample items
    act(() => {
      result.current.setRecommendedItems(sampleItems);
    });
    
    // Get item by id
    const item = result.current.getItemById('item1');
    expect(item).toBeDefined();
    expect(item?.id).toBe('item1');
    
    // Try to get non-existent item
    const nonExistentItem = result.current.getItemById('non-existent');
    expect(nonExistentItem).toBeUndefined();
  });
  
  test('should update item properties', () => {
    const { result } = renderHook(() => useRecommendationStore());
    
    // Add sample items
    act(() => {
      result.current.setRecommendedItems(sampleItems);
    });
    
    // Update item price
    act(() => {
      result.current.updateItem('item1', { price: 19.99, salePrice: 14.99 });
    });
    
    // Get updated item
    const updatedItem = result.current.getItemById('item1');
    expect(updatedItem?.price).toBe(19.99);
    expect(updatedItem?.salePrice).toBe(14.99);
    
    // Other properties should remain unchanged
    expect(updatedItem?.name).toBe('Test Item 1');
    expect(updatedItem?.brand).toBe('Test Brand');
  });
});