// Mock data system for API fallback
import productData from './products';
import userData from './user';
import quizData from './quiz';
import socialProofData from './socialProof';
import { USE_MOCK_RETAILER, FORCE_DEMO_MODE } from '../utils/environment';

// Map endpoints to mock data handlers
const mockDataMap: Record<string, (options?: any, endpoint?: string) => any> = {
  // Product endpoints
  '/api/v1/recommendations': productData.getRecommendations,
  '/api/v1/products': productData.getProducts,
  '/api/v1/products/search': productData.searchProducts,
  '/api/v1/similar-items': productData.getSimilarItems,
  '/api/v1/complete-outfit': productData.completeOutfit,
  
  // User-related endpoints
  '/api/v1/users/profile': userData.getProfile,
  '/api/v1/users/outfits': userData.getSavedOutfits,
  '/api/v1/users/feedback/items': userData.addItemFeedback,
  '/api/v1/users/feedback/outfits': userData.addOutfitFeedback,
  
  // Quiz endpoints
  '/api/v1/quiz/questions': quizData.getQuestions,
  '/api/v1/quiz/results': quizData.getResults,
  
  // Social proof
  '/api/v1/social/celebrities': socialProofData.getCelebrities,
  '/api/v1/social/outfits': socialProofData.getOutfits,
  '/api/v1/social/matches': socialProofData.getMatches
};

// Helper to extract path parameters from an endpoint
const extractPathParams = (pattern: string, endpoint: string): Record<string, string> => {
  const patternParts = pattern.split('/');
  const endpointParts = endpoint.split('/');
  const params: Record<string, string> = {};

  if (patternParts.length !== endpointParts.length) {
    return params;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = endpointParts[i];
    }
  }

  return params;
};

/**
 * Get mock data for any endpoint
 * @param endpoint - API endpoint path
 * @param options - Request options (query params, body, etc)
 * @returns Mock response data
 */
export function get(endpoint: string, options: any = {}): any {
  console.debug(`[MOCK API] Request to ${endpoint}`, options);
  
  // Check for exact match first
  if (mockDataMap[endpoint]) {
    return mockDataMap[endpoint](options, endpoint);
  }
  
  // Try pattern matching for dynamic endpoints
  for (const [pattern, handler] of Object.entries(mockDataMap)) {
    // Extract path parameters
    if (pattern.includes(':')) {
      const regex = new RegExp(
        '^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$'
      );
      
      if (regex.test(endpoint)) {
        const params = extractPathParams(pattern, endpoint);
        return handler({ ...options, params }, endpoint);
      }
    }
    
    // Check if endpoint starts with pattern for catch-all handlers
    if (endpoint.startsWith(pattern) && pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1); // Remove the *
      if (endpoint.startsWith(basePattern)) {
        return handler(options, endpoint);
      }
    }
  }
  
  // Default empty response if no match
  console.warn(`[MOCK API] No mock data found for: ${endpoint}`);
  return { data: {} };
}

/**
 * Check if mock data should be used
 * @returns True if mock data should be used
 */
export function shouldUseMockData(): boolean {
  // Mock data is always used in demo mode
  if (FORCE_DEMO_MODE) {
    return true;
  }
  
  // Mock retailer mode uses mock data
  if (USE_MOCK_RETAILER) {
    return true;
  }
  
  // Check for UI toggle in localStorage
  try {
    return localStorage.getItem('STYLIST_DATA_MODE') === 'demo';
  } catch (e) {
    return false;
  }
}

/**
 * Toggle mock data mode
 * @param enable - Whether to enable mock data
 */
export function setMockDataMode(enable: boolean): void {
  try {
    localStorage.setItem('STYLIST_DATA_MODE', enable ? 'demo' : 'production');
  } catch (e) {
    console.error('Failed to set data mode:', e);
  }
}