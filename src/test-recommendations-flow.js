// Test script for demonstrating the complete recommendation flow

// Import necessary modules
import { createStylistApi } from './api/index';
import { useRecommendationStore } from './store/recommendationStore';

// Demo function to trace recommendation flow
const testRecommendationFlow = async () => {
  console.log('----- Recommendation Flow Test -----');
  console.log('This test demonstrates the complete flow from frontend to backend for recommendations');
  
  // Step 1: Initialize API client
  console.log('\nStep 1: Creating API client...');
  const api = createStylistApi({
    apiUrl: 'http://localhost:8000',
    apiKey: 'demo-key',
    retailerId: 'demo_retailer'
  });
  
  // Step 2: Set up request data
  console.log('\nStep 2: Preparing recommendation request...');
  const userId = 'demo_user';
  const requestData = {
    userId: userId,
    context: 'wedding',
    retailerIds: ['demo_retailer'],
    category: 'dresses'
  };
  
  console.log('Request data:', JSON.stringify(requestData, null, 2));
  
  // Step 3: Make the API call
  console.log('\nStep 3: Sending POST request to /api/v1/recommendations...');
  try {
    // Demo successful flow
    const recommendations = await api.recommendation.getRecommendations(requestData);
    
    // Step 4: Process the response
    console.log('\nStep 4: Processing recommendation response...');
    console.log(`Received ${recommendations.items.length} items and ${recommendations.outfits?.length || 0} outfits`);
    
    if (recommendations.items.length > 0) {
      // Show first item sample
      const firstItem = recommendations.items[0];
      console.log('\nSample item:');
      console.log(`- ID: ${firstItem.id}`);
      console.log(`- Name: ${firstItem.name}`);
      console.log(`- Brand: ${firstItem.brand}`);
      console.log(`- Price: $${firstItem.price}`);
      console.log(`- Match Score: ${(firstItem.matchScore * 100).toFixed(0)}%`);
      console.log(`- Match Reasons: ${firstItem.matchReasons.join(', ')}`);
    }
    
    // Step 5: Update the recommendation store
    console.log('\nStep 5: Updating recommendation store...');
    const store = useRecommendationStore.getState();
    store.setRecommendedItems(recommendations.items);
    if (recommendations.outfits) {
      store.setRecommendedOutfits(recommendations.outfits);
    }
    
    // Step 6: Simulating UI rendering
    console.log('\nStep 6: Frontend would now render the recommendations...');
    console.log('Store updated with the following:');
    console.log(`- ${store.recommendedItems.length} items in recommendedItems`);
    console.log(`- ${store.recommendedOutfits.length} outfits in recommendedOutfits`);
    
    // Success message
    console.log('\n✅ TEST PASSED: Full recommendation flow completed successfully');
    
  } catch (error) {
    // Log error details for troubleshooting
    console.error('\n❌ ERROR in recommendation flow:', error);
    
    // Explain fallback behavior
    console.log('\nIn production, fallback mechanism is triggered:');
    console.log('1. Error is logged for diagnostics');
    console.log('2. Mock recommendations are shown to user');
    console.log('3. UI continues to function with sample data');
    
    // Show sample mock data
    console.log('\nSample mock data that would be displayed:');
    const mockItem = {
      id: 'mock1',
      name: 'Classic Wedding Dress',
      brand: 'Luxe Bridal',
      price: 1499.99,
      matchScore: 0.95,
      matchReasons: ['Matches your style profile', 'Perfect for wedding occasions']
    };
    console.log(JSON.stringify(mockItem, null, 2));
  }
  
  console.log('\n----- Test Complete -----');
};

// Export the test function
export default testRecommendationFlow;

// Log documentation for demonstration
console.log(`
This script demonstrates the full recommendation flow:

Frontend (Generate Suggestions button) → 
  RecommendationApi.getRecommendations() → 
    API call to POST /api/v1/recommendations with user data →
      Backend processes request (filters, personalization) →
        Response with items and outfits →
          Recommendation store update →
            UI rendering of results

The system is built with robust error handling and fallback mechanisms 
to ensure continuous functionality even when API calls fail.
`);