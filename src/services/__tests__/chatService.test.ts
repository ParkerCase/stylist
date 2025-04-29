// src/services/__tests__/chatService.test.ts
import { ChatService } from '../chatService';
import { RecommendationApi } from '@/api/recommendationApi';
import { MessageSender, MessageType } from '@/types/index';
import { trackMessageSent } from '@/services/analytics/analyticsService';

// Mock dependencies
jest.mock('@/api/recommendationApi');
jest.mock('@/services/analytics/analyticsService', () => ({
  trackMessageSent: jest.fn()
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ChatService', () => {
  let chatService: ChatService;
  let mockRecommendationApi: jest.Mocked<RecommendationApi>;
  const mockUserId = 'test-user-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_URL;
    delete process.env.CLAUDE_MODEL;
    
    // Setup mock recommendation API
    mockRecommendationApi = {
      getRecommendations: jest.fn()
    } as unknown as jest.Mocked<RecommendationApi>;
    
    // Initialize chat service
    chatService = new ChatService(mockRecommendationApi, mockUserId);
  });
  
  test('should process user message with fallback mode when Claude is not available', async () => {
    // Setup mock recommendations
    mockRecommendationApi.getRecommendations.mockResolvedValueOnce({
      userId: mockUserId,
      timestamp: new Date(),
      items: [
        {
          id: 'item1',
          name: 'Test Item',
          brand: 'Test Brand',
          price: 29.99,
          imageUrls: ['test-image.jpg'],
          category: 'tops',
          matchScore: 0.8,
          matchReasons: ['Matches your style'],
          url: 'https://example.com/item1',
          retailerId: 'test-retailer',
          colors: [],
          sizes: [],
          inStock: true
        }
      ],
      outfits: []
    });
    
    // Process recommendation request
    const responses = await chatService.processMessage('recommend some shirts');
    
    // Verify analytics event was tracked
    expect(trackMessageSent).toHaveBeenCalledWith(mockUserId, 'recommend some shirts');
    
    // Should have text response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect(responses[0].sender).toBe(MessageSender.ASSISTANT);
    
    // Should have called recommendation API
    expect(mockRecommendationApi.getRecommendations).toHaveBeenCalledWith({
      userId: mockUserId,
      context: 'shirts',
      limit: 4
    });
    
    // Should include recommendation message if API returned items
    const recommendationMessage = responses.find(msg => msg.type === MessageType.RECOMMENDATION) as any;
    expect(recommendationMessage).toBeDefined();
    expect(recommendationMessage?.items?.length).toBe(1);
  });
  
  test('should use Claude API when it is available', async () => {
    // Configure environment for using Claude
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    // Recreate service with updated config
    chatService = new ChatService(mockRecommendationApi, mockUserId);
    
    // Mock Claude API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'I recommend you try a casual shirt for your style!' })
    });
    
    // Setup mock recommendations
    mockRecommendationApi.getRecommendations.mockResolvedValueOnce({
      userId: mockUserId,
      timestamp: new Date(),
      items: [
        {
          id: 'item1',
          name: 'Test Item',
          brand: 'Test Brand',
          price: 29.99,
          imageUrls: ['test-image.jpg'],
          category: 'tops',
          matchScore: 0.8,
          matchReasons: ['Matches your style'],
          url: 'https://example.com/item1',
          retailerId: 'test-retailer',
          colors: [],
          sizes: [],
          inStock: true
        }
      ],
      outfits: []
    });
    
    // Process message
    const responses = await chatService.processMessage('What should I wear to a party?');
    
    // Verify Claude API was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      }),
      body: expect.any(String)
    }));
    
    // Verify request body contained expected data
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.userId).toBe(mockUserId);
    expect(requestBody.message).toBe('What should I wear to a party?');
    expect(requestBody.context).toBeInstanceOf(Array);
    
    // Verify Claude response is included in the messages
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect(responses[0].sender).toBe(MessageSender.ASSISTANT);
    expect((responses[0] as any).text).toBe('I recommend you try a casual shirt for your style!');
    
    // Should have generated recommendations based on Claude's response
    expect(mockRecommendationApi.getRecommendations).toHaveBeenCalled();
    expect(responses.some(msg => msg.type === MessageType.RECOMMENDATION)).toBe(true);
  });
  
  test('should handle Claude API error gracefully', async () => {
    // Configure environment for using Claude
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    // Recreate service with updated config
    chatService = new ChatService(mockRecommendationApi, mockUserId);
    
    // Mock Claude API error
    mockFetch.mockRejectedValueOnce(new Error('API error'));
    
    // Setup mock recommendations for fallback
    mockRecommendationApi.getRecommendations.mockResolvedValueOnce({
      userId: mockUserId,
      timestamp: new Date(),
      items: [
        {
          id: 'item1',
          name: 'Test Item',
          brand: 'Test Brand',
          price: 29.99,
          imageUrls: ['test-image.jpg'],
          category: 'tops',
          matchScore: 0.8,
          matchReasons: ['Matches your style'],
          url: 'https://example.com/item1',
          retailerId: 'test-retailer',
          colors: [],
          sizes: [],
          inStock: true
        }
      ],
      outfits: []
    });
    
    // Should not throw error and fall back to rule-based approach
    const responses = await chatService.processMessage('recommend some shirts');
    
    // Should have text response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect(responses[0].sender).toBe(MessageSender.ASSISTANT);
    
    // Should have called recommendation API
    expect(mockRecommendationApi.getRecommendations).toHaveBeenCalled();
  });
  
  test('should handle outfits in recommendation response', async () => {
    // Setup mock recommendations with an outfit
    mockRecommendationApi.getRecommendations.mockResolvedValueOnce({
      userId: mockUserId,
      timestamp: new Date(),
      items: [
        {
          id: 'item1',
          name: 'Test Item',
          brand: 'Test Brand',
          price: 29.99,
          imageUrls: ['test-image.jpg'],
          category: 'tops',
          matchScore: 0.8,
          matchReasons: ['Matches your style'],
          url: 'https://example.com/item1',
          retailerId: 'test-retailer',
          colors: [],
          sizes: [],
          inStock: true
        }
      ],
      outfits: [
        {
          id: 'outfit1',
          name: 'Casual Weekend',
          occasion: 'casual',
          matchScore: 0.9,
          matchReasons: ['Matches your casual style'],
          items: [
            {
              id: 'item1',
              name: 'Test Shirt',
              brand: 'Test Brand',
              price: 29.99,
              imageUrls: ['test-shirt.jpg'],
              category: 'tops',
              matchScore: 0.8,
              matchReasons: ['Matches your style'],
              url: 'https://example.com/item1',
              retailerId: 'test-retailer',
              colors: [],
              sizes: [],
              inStock: true
            },
            {
              id: 'item2',
              name: 'Test Jeans',
              brand: 'Test Brand',
              price: 39.99,
              imageUrls: ['test-jeans.jpg'],
              category: 'bottoms',
              matchScore: 0.7,
              matchReasons: ['Matches your style'],
              url: 'https://example.com/item2',
              retailerId: 'test-retailer',
              colors: [],
              sizes: [],
              inStock: true
            }
          ]
        }
      ]
    });
    
    // Process recommendation request
    const responses = await chatService.processMessage('show me some outfits');
    
    // Should include outfit message
    const outfitMessage = responses.find(msg => msg.type === MessageType.OUTFIT) as any;
    expect(outfitMessage).toBeDefined();
    expect(outfitMessage?.outfit?.id).toBe('outfit1');
    expect(outfitMessage?.outfit?.items?.length).toBe(2);
  });
  
  test('should handle error when getting recommendations', async () => {
    // Setup mock error from recommendation API
    mockRecommendationApi.getRecommendations.mockRejectedValueOnce(new Error('API error'));
    
    // Process recommendation request
    const responses = await chatService.processMessage('recommend some shirts');
    
    // Should include error message
    const errorMessage = responses.find(msg => msg.sender === MessageSender.SYSTEM);
    expect(errorMessage).toBeDefined();
    expect((errorMessage as any).text).toContain('trouble getting recommendations');
  });
  
  test('should handle style quiz intent', async () => {
    // Process style quiz request
    const responses = await chatService.processMessage('I want to take the style quiz');
    
    // Should have appropriate response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect((responses[0] as any).text).toContain('style quiz');
  });
  
  test('should handle virtual try-on intent', async () => {
    // Process virtual try-on request
    const responses = await chatService.processMessage('How can I try on clothes?');
    
    // Should have appropriate response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect((responses[0] as any).text).toContain('Try On');
  });
  
  test('should handle greeting intent', async () => {
    // Process greeting
    const responses = await chatService.processMessage('Hello!');
    
    // Should have appropriate response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect((responses[0] as any).text).toContain('Hello');
  });
  
  test('should handle help intent', async () => {
    // Process help request
    const responses = await chatService.processMessage('What can you do?');
    
    // Should have appropriate response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect((responses[0] as any).text).toContain('I can help you with');
  });
  
  test('should handle general intent when no specific intent is detected', async () => {
    // Process general message
    const responses = await chatService.processMessage('I like fashion');
    
    // Should have appropriate response
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe(MessageType.TEXT);
    expect((responses[0] as any).text).toContain('match your style');
  });
});