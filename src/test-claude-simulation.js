// Test script to demonstrate Claude response simulation for wedding dress query

// Import required modules
import { createStylistApi } from './api/index';
import { ChatService } from './services/chatService';

// Demo function to simulate Claude responses
const testClaudeSimulation = async () => {
  console.log('----- Claude Response Simulation Test -----');
  
  // 1. Test with API key scenario
  console.log('\n=== WITH API KEY ===');
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'demo-api-key';
  
  try {
    // Create API client
    const api = createStylistApi({
      apiKey: 'demo-key',
      retailerId: 'demo_retailer'
    });
    
    // Create chat service with API key
    const chatService = new ChatService(api.recommendation, 'demo_user');
    
    // Process wedding dress query
    console.log('Testing with wedding dress query...');
    const responseWithKey = await chatService.processMessage('I need a wedding dress');
    
    // Show API-based Claude response
    console.log('\nResponse with API key:');
    if (responseWithKey && responseWithKey.length > 0) {
      const textResponse = responseWithKey.find(msg => msg.type === 'text');
      console.log(`Claude response: "${textResponse?.text.substring(0, 150)}..."`);
      
      // Check if recommendations were generated
      const recResponse = responseWithKey.find(msg => msg.type === 'recommendation');
      console.log(`Recommendations included: ${recResponse ? 'Yes' : 'No'}`);
      console.log(`Total responses: ${responseWithKey.length}`);
    }
  } catch (err) {
    console.error('Error testing with API key:', err);
  }
  
  // 2. Test without API key (fallback mode)
  console.log('\n=== WITHOUT API KEY (FALLBACK MODE) ===');
  delete process.env.ANTHROPIC_API_KEY;
  process.env.FORCE_DEMO_MODE = 'true';
  
  try {
    // Create API client
    const fallbackApi = createStylistApi({
      apiKey: 'demo-key',
      retailerId: 'demo_retailer'
    });
    
    // Create chat service without API key
    const fallbackChatService = new ChatService(fallbackApi.recommendation, 'demo_user');
    
    // Process wedding dress query in fallback mode
    console.log('Testing with wedding dress query in fallback mode...');
    const fallbackResponse = await fallbackChatService.processMessage('I need a wedding dress');
    
    // Show fallback Claude response
    console.log('\nResponse in fallback mode:');
    if (fallbackResponse && fallbackResponse.length > 0) {
      const textResponse = fallbackResponse.find(msg => msg.type === 'text');
      console.log(`Fallback response: "${textResponse?.text.substring(0, 150)}..."`);
      
      // Check if recommendations were generated
      const recResponse = fallbackResponse.find(msg => msg.type === 'recommendation');
      console.log(`Recommendations included: ${recResponse ? 'Yes' : 'No'}`);
      console.log(`Total responses: ${fallbackResponse.length}`);
    }
  } catch (err) {
    console.error('Error testing without API key:', err);
  }
  
  // Restore original environment
  if (originalKey) {
    process.env.ANTHROPIC_API_KEY = originalKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
  delete process.env.FORCE_DEMO_MODE;
  
  console.log('\n----- Test Complete -----');
  console.log('This demonstrates how the system provides graceful fallback when Claude API is unavailable.');
  console.log('The actual implementation will show appropriate responses in both scenarios.');
};

// Export the test function
export default testClaudeSimulation;

// Log expected behavior
console.log(`
This script demonstrates how the chatService handles Claude API requests:

1. WITH ANTHROPIC_API_KEY:
   - Attempts to call Claude API directly
   - Returns personalized Claude response
   - Includes recommendations for clothing based on query

2. WITHOUT ANTHROPIC_API_KEY (fallback mode):
   - Uses pre-written demo responses based on intent
   - For wedding dress query: shows specialized wedding dress text
   - Still includes mock recommendations
   
The production system shows clean error handling and fallback, ensuring
a smooth user experience whether API is available or not.
`);