// Demo Mode Integration - Handles API mocking for demo/production toggle
import { mockData, isMockDataEnabled } from './mockData';

/**
 * Enhances an API call by providing mock data when in demo mode
 * @param apiCall The original API function
 * @param mockDataFn Function that returns mock data for this API call
 * @returns The original API call or a mock implementation based on demo mode
 */
export function withDemoMode<T, Args extends any[]>(
  apiCall: (...args: Args) => Promise<T>,
  mockDataFn: (...args: Args) => T
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    if (isMockDataEnabled()) {
      // In demo mode, return the mock data with a small delay for realism
      console.log('[DEMO MODE] Using mock data instead of API call');
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      return mockDataFn(...args);
    } else {
      // In production mode, use the real API call
      return apiCall(...args);
    }
  };
}

/**
 * Enhances an API instance by wrapping all methods with demo mode support
 * @param apiInstance The original API instance
 * @param mockImplementations An object with mock implementations for API methods
 * @returns A wrapped API instance that respects demo mode
 */
export function createDemoModeApi<T extends Record<string, any>>(
  apiInstance: T,
  mockImplementations: Partial<{
    [K in keyof T]: T[K] extends (...args: infer Args) => Promise<infer R>
      ? (...args: Args) => R
      : never;
  }>
): T {
  // Create a new object with the same prototype
  const enhancedApi = Object.create(Object.getPrototypeOf(apiInstance));
  
  // Copy all properties from the original instance
  Object.assign(enhancedApi, apiInstance);
  
  // For each mock implementation, enhance the corresponding method
  Object.keys(mockImplementations).forEach(key => {
    const methodName = key as keyof T;
    if (typeof apiInstance[methodName] === 'function') {
      enhancedApi[methodName] = withDemoMode(
        apiInstance[methodName] as any,
        mockImplementations[methodName] as any
      );
    }
  });
  
  return enhancedApi;
}

/**
 * Creates mock API responses based on the comprehensive mock data
 */
export const createMockApiResponses = () => {
  return {
    // User API mocks
    getUserProfile: (userId: string) => {
      return mockData.userProfile;
    },
    
    createUser: () => {
      return mockData.userProfile;
    },
    
    submitStyleQuiz: (userId: string, answers: any[]) => {
      console.log('[DEMO MODE] Style quiz submitted', { userId, answerCount: answers.length });
      return { success: true };
    },
    
    // Recommendation API mocks
    getRecommendations: ({ userId, limit = 10, includeOutfits = true }) => {
      const items = mockData.products.slice(0, limit);
      const outfits = includeOutfits ? mockData.outfits.slice(0, Math.ceil(limit / 3)) : [];
      
      return {
        userId,
        timestamp: new Date(),
        items,
        outfits
      };
    },
    
    getOutfitRecommendations: (userId: string, occasion?: string, limit = 5) => {
      let filteredOutfits = mockData.outfits;
      
      if (occasion) {
        filteredOutfits = filteredOutfits.filter(outfit => 
          outfit.occasion.toLowerCase() === occasion.toLowerCase()
        );
      }
      
      return filteredOutfits.slice(0, limit);
    },
    
    addItemFeedback: () => ({ success: true }),
    
    addOutfitFeedback: () => ({ success: true }),
    
    saveOutfit: (outfit: any) => {
      return {
        ...outfit,
        savedAt: new Date().toISOString()
      };
    },
    
    getSavedOutfits: () => {
      return mockData.outfits.slice(0, 3).map(outfit => ({
        outfitId: outfit.id,
        userId: mockData.userProfile.userId,
        name: outfit.name,
        items: outfit.items.map(item => item.id),
        savedAt: new Date().toISOString()
      }));
    },
    
    // Social Proof API mocks
    getSocialProofItems: (limit = 10) => {
      return mockData.socialProofItems.slice(0, limit);
    }
  };
};

export default {
  withDemoMode,
  createDemoModeApi,
  createMockApiResponses
};