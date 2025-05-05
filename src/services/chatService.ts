// src/services/chatService.ts

import { MessageSender, MessageType, ChatMessage, TextMessage, ChatTypes } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationApi } from '@/api/recommendationApi';
import { trackMessageSent } from '@/services/analytics/analyticsService';
import { 
  ANTHROPIC_API_KEY, 
  CLAUDE_API_URL, 
  CLAUDE_MODEL,
  FORCE_DEMO_MODE,
  USE_CLAUDE_DEMO
} from '@/utils/environment';

interface ClaudeConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  fallbackMode: boolean;
}

export class ChatService {
  private recommendationApi: RecommendationApi;
  private userId: string;
  private claudeConfig: ClaudeConfig;
  private conversationContext: string[] = [];

  constructor(recommendationApi: RecommendationApi, userId: string) {
    this.recommendationApi = recommendationApi;
    this.userId = userId;
    
    // Initialize Claude configuration
    this.claudeConfig = {
      apiKey: ANTHROPIC_API_KEY,
      baseUrl: CLAUDE_API_URL,
      modelName: CLAUDE_MODEL,
      // Use fallback mode if API key is missing or demo mode is forced
      fallbackMode: !ANTHROPIC_API_KEY || FORCE_DEMO_MODE
    };
    
    // Add initial context for the conversation
    this.conversationContext = [
      `You are an AI style assistant for a fashion recommendation platform called "The Stylist". 
      The current date is ${new Date().toLocaleDateString()}.
      You help users discover clothing items and outfits that match their personal style.
      Keep responses concise, helpful, and focus on providing personalized fashion advice.
      When you recommend items, focus on why they would work for the user.
      If you don't know something specific about fashion, you can suggest general style principles.`
    ];
    
    // For demo purposes, print helpful info about Claude status
    if (USE_CLAUDE_DEMO) {
      console.info('🤖 Claude demo mode is ENABLED - will provide realistic AI responses without API key');
    }
    
    if (FORCE_DEMO_MODE) {
      console.info('🧪 Forced demo mode is ENABLED - using fallback for Claude API despite keys');
    } else if (ANTHROPIC_API_KEY) {
      console.info('✅ Claude API key present - will attempt to use real Claude API');
    } else {
      console.info('ℹ️ No Claude API key found - using rule-based fallback responses');
    }
  }

  /**
   * Process a user message and generate appropriate responses
   */
  async processMessage(text: string): Promise<ChatMessage[]> {
    // Track the message sent
    trackMessageSent(this.userId, text);

    // Initialize response messages array
    const responseMessages: ChatMessage[] = [];

    // Determine the intent for possible demo responses
    const intent = this.categorizeIntent(text);

    // Try to use Claude API if available and not in forced demo mode
    if (!this.claudeConfig.fallbackMode) {
      try {
        const claudeResponse = await this.callClaudeAPI(text);
        
        // Add the response from Claude
        responseMessages.push(this.createTextMessage(
          claudeResponse,
          MessageSender.ASSISTANT
        ));
        
        // Process for special instructions in Claude response
        if (this.containsRecommendationIntent(claudeResponse, text)) {
          // Add a recommendation message if Claude suggested showing items
          await this.addRecommendationMessage(responseMessages);
        }
        
        return responseMessages;
      } catch (error) {
        console.error('Error calling Claude API:', error);
        // Fall back to rule-based responses
      }
    }
    
    // Check for demo response if Claude demo mode is enabled
    const demoResponse = this.getDemoResponse(intent, text);
    if (demoResponse) {
      // This is a simulated Claude response in demo mode
      responseMessages.push(this.createTextMessage(
        demoResponse,
        MessageSender.ASSISTANT
      ));
      
      // If it's a wedding dress query, also add recommendations
      if (intent === 'wedding_dress') {
        // Add a recommendation message after the initial response
        await this.addRecommendationMessage(responseMessages, 'wedding');
      }
      
      return responseMessages;
    }
    
    // If no demo response and Claude is not available or failed, use rule-based approach
    switch (intent) {
      case 'recommendation':
        // Add a simple acknowledgment message
        responseMessages.push(this.createTextMessage(
          'I found some items that match your style! Here are my recommendations:',
          MessageSender.ASSISTANT
        ));
        
        // Get recommendations from API
        await this.addRecommendationMessage(responseMessages, this.extractContext(text));
        break;
        
      case 'style_quiz':
        responseMessages.push(this.createTextMessage(
          'Would you like to take our style quiz? It will help me understand your preferences better so I can make more personalized recommendations.',
          MessageSender.ASSISTANT
        ));
        break;
        
      case 'virtual_try_on':
        responseMessages.push(this.createTextMessage(
          'You can try on any clothing item by clicking the "Try On" button on a recommendation. Upload your photo, and see how the item looks on you!',
          MessageSender.ASSISTANT
        ));
        break;
        
      case 'greeting':
        responseMessages.push(this.createTextMessage(
          'Hello! I\'m your personal AI style assistant. I can help you discover clothing that matches your unique style. Would you like some personalized recommendations?',
          MessageSender.ASSISTANT
        ));
        break;
        
      case 'help':
        responseMessages.push(this.createTextMessage(
          'I can help you with: \n- Finding clothing recommendations based on your style\n- Creating complete outfits\n- Virtual try-on of garments\n- Style advice and tips\n\nJust let me know what you\'re looking for!',
          MessageSender.ASSISTANT
        ));
        break;
        
      case 'wedding_dress':
        // Special handling for wedding dress case when not in demo mode
        responseMessages.push(this.createTextMessage(
          'I can help you find the perfect wedding dress! Here are some recommendations based on current trends:',
          MessageSender.ASSISTANT
        ));
        
        // Get wedding dress recommendations
        await this.addRecommendationMessage(responseMessages, 'wedding');
        break;
        
      default:
        responseMessages.push(this.createTextMessage(
          'I can help you discover fashion items that match your style. Would you like to see some personalized recommendations?',
          MessageSender.ASSISTANT
        ));
    }
    
    return responseMessages;
  }

  /**
   * Call the Claude API to get a response
   */
  private async callClaudeAPI(userMessage: string): Promise<string> {
    try {
      // Add the user message to context
      this.conversationContext.push(userMessage);
      
      // API endpoint - prioritize direct Claude API if we have API key
      if (this.claudeConfig.apiKey) {
        try {
          return await this.callDirectClaudeAPI(userMessage);
        } catch (directError) {
          console.error('Direct Claude API call failed, falling back to backend proxy:', directError);
          // Fall back to proxy
        }
      }
      
      // Fall back to backend proxy
      const apiUrl = this.recommendationApi.apiClient 
        ? `${(this.recommendationApi.apiClient as any).baseURL || ''}/chat`
        : '/api/chat';
        
      console.log('Calling Claude API via backend proxy at:', apiUrl);
      
      // Prepare the API request to backend proxy
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': (this.recommendationApi.apiClient as any).apiKey || '',
        },
        body: JSON.stringify({
          userId: this.userId,
          message: userMessage,
          context: this.conversationContext.slice(-5) // Keep last 5 messages for context
        }),
      });
      
      if (!response.ok) {
        console.warn(`Claude API request failed with status: ${response.status}`);
        // Don't throw error - return fallback response instead
        return "I'm having trouble connecting to my backend services. Let me show you some recommendations based on your request.";
      }
      
      const data = await response.json();
      
      // Add the response to context
      this.conversationContext.push(data.response);
      
      return data.response;
    } catch (error) {
      console.error('Error calling Claude API via backend:', error);
      // Return fallback response instead of throwing
      return "I'm having trouble connecting right now. Let me show you some recommendations instead.";
    }
  }
  
  /**
   * Call the Claude API directly from the frontend
   */
  private async callDirectClaudeAPI(userMessage: string): Promise<string> {
    if (!this.claudeConfig.apiKey) {
      throw new Error('No Claude API key available');
    }
    
    const apiUrl = this.claudeConfig.baseUrl || 'https://api.anthropic.com';
    const model = this.claudeConfig.modelName || 'claude-3-haiku-20240307';
    
    console.log(`Calling Claude API directly with model: ${model}`);
    
    // Prepare the messages array for Claude API
    const messages = this.conversationContext.slice(-5).map((message, index) => {
      // First message is system prompt, then alternate between user and assistant
      if (index === 0) {
        return { role: "system", content: message };
      } else {
        return { 
          role: index % 2 === 1 ? "user" : "assistant", 
          content: message 
        };
      }
    });
    
    // Add the current user message
    messages.push({ role: "user", content: userMessage });
    
    // Prepare the request to the Claude API
    const response = await fetch(`${apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeConfig.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API direct request failed: ${response.status} - ${errorText}`);
      throw new Error(`Failed to get response from Claude API: ${response.statusText}`);
    }
    
    const data = await response.json();
    const assistantResponse = data.content?.[0]?.text || '';
    
    // Add the response to context
    this.conversationContext.push(assistantResponse);
    
    return assistantResponse;
  }

  /**
   * Check if the AI response or user message suggests recommendations
   */
  private containsRecommendationIntent(aiResponse: string, userMessage: string): boolean {
    const lowerAiResponse = aiResponse.toLowerCase();
    const lowerUserMessage = userMessage.toLowerCase();
    
    // Recommendation phrases in AI response
    const aiRecommendPhrases = [
      'here are some recommendations',
      'i recommend',
      'would you like to see',
      'i can show you',
      'i\'ll show you some items',
      'i can recommend'
    ];
    
    // Recommendation phrases in user message
    const userRecommendPhrases = [
      'show me',
      'recommend',
      'what should i wear',
      'find me',
      'can you show',
      'give me ideas',
      'what would look good'
    ];
    
    // Check AI response for recommendation intent
    for (const phrase of aiRecommendPhrases) {
      if (lowerAiResponse.includes(phrase)) {
        return true;
      }
    }
    
    // Check user message for recommendation intent
    for (const phrase of userRecommendPhrases) {
      if (lowerUserMessage.includes(phrase)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Add recommendation message to the response
   */
  private async addRecommendationMessage(responseMessages: ChatMessage[], context?: string): Promise<void> {
    try {
      const recommendations = await this.recommendationApi.getRecommendations({
        userId: this.userId,
        context: context,
        limit: 4
      });
      
      // Add recommendation message
      if (recommendations.items.length > 0) {
        // Convert from Recommendation to Chat format
        const chatItems = recommendations.items.map(item => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          price: item.price,
          salePrice: item.salePrice,
          imageUrl: item.imageUrls[0] || '',
          url: item.url,
          matchScore: item.matchScore,
          matchReasons: item.matchReasons
        }));
        responseMessages.push(this.createRecommendationMessage(chatItems));
      }
      
      // If there are outfits, add outfit message
      if (recommendations.outfits.length > 0) {
        responseMessages.push(this.createTextMessage(
          'I also created a complete outfit for you:',
          MessageSender.ASSISTANT
        ));
        // Convert from Recommendation to Chat format
        const outfit = recommendations.outfits[0];
        const chatOutfit = {
          id: outfit.id,
          name: outfit.name,
          occasion: outfit.occasion,
          matchScore: outfit.matchScore,
          matchReasons: outfit.matchReasons,
          items: outfit.items.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            salePrice: item.salePrice,
            imageUrl: item.imageUrls[0] || '',
            url: item.url,
            matchScore: item.matchScore,
            matchReasons: item.matchReasons
          }))
        };
        responseMessages.push(this.createOutfitMessage(chatOutfit));
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      responseMessages.push(this.createTextMessage(
        'Sorry, I had trouble getting recommendations. Please try again.',
        MessageSender.SYSTEM
      ));
    }
  }

  /**
   * Categorize user intent based on message text
   */
  private categorizeIntent(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Handle the wedding dress case specially for the demo
    if (lowerText.includes('wedding dress') || 
        lowerText.includes('bridal') || 
        (lowerText.includes('wedding') && lowerText.includes('dress'))) {
      return 'wedding_dress';
    }
    
    if (lowerText.includes('recommend') || 
        lowerText.includes('suggestion') || 
        lowerText.includes('find') || 
        lowerText.includes('show me')) {
      return 'recommendation';
    }
    
    if (lowerText.includes('quiz') || 
        lowerText.includes('style profile') || 
        lowerText.includes('preferences')) {
      return 'style_quiz';
    }
    
    if (lowerText.includes('try on') || 
        lowerText.includes('virtual') || 
        lowerText.includes('how does it look')) {
      return 'virtual_try_on';
    }
    
    if (lowerText.includes('hello') || 
        lowerText.includes('hi') || 
        lowerText.includes('hey')) {
      return 'greeting';
    }
    
    if (lowerText.includes('help') || 
        lowerText.includes('what can you do') || 
        lowerText.includes('how does this work')) {
      return 'help';
    }
    
    return 'general';
  }
  
  /**
   * Get a realistic Claude-like response for demo purposes
   * These responses mock what the real API would return for specific queries
   */
  private getDemoResponse(intent: string, query: string): string {
    // Special demo responses for specific query types
    switch (intent) {
      case 'wedding_dress':
        return `I'd be happy to help you find the perfect wedding dress! Based on current trends and classic styles, here are some suggestions:

For a traditional look, A-line and ball gown silhouettes create a timeless, romantic appearance. If you prefer something more modern, consider a fitted mermaid or trumpet style that accentuates your curves.

Material is important too - delicate lace creates a romantic feel, while silk or satin offers elegant simplicity. For spring/summer weddings, lighter fabrics like chiffon or organza are beautiful options.

Would you like to see specific dress recommendations? I can show you some options across different styles and price points that might match what you're looking for.`;
        
      case 'greeting':
        return `Hello! I'm your personal style assistant. I'm here to help you discover clothing that matches your unique style preferences. I can recommend outfits, help you find specific items, provide style advice, or even let you virtually try on clothes. What kind of fashion help are you looking for today?`;
        
      case 'help':
        return `I'm your AI fashion assistant, and I can help you with:

- Finding personalized clothing recommendations
- Creating complete outfits for specific occasions
- Virtually trying on garments with our try-on feature
- Answering style questions and providing fashion advice
- Helping you complete our style quiz to better understand your preferences

Just let me know what you're looking for, and I'll guide you through the process!`;

      default:
        if (USE_CLAUDE_DEMO) {
          return `I'd be happy to help you with "${query}". This is a simulated Claude response in demo mode. In a real implementation with an API key, you would get a personalized response from Claude based on your specific query. Would you like to see some clothing recommendations related to this topic?`;
        } else {
          return ''; // Fall back to rule-based responses with empty string instead of null
        }
    }
  }

  /**
   * Extract context from message text
   */
  private extractContext(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    // Extract clothing categories
    const categories = [
      'tops', 'shirts', 't-shirts', 'blouses',
      'bottoms', 'pants', 'jeans', 'shorts', 'skirts',
      'dresses', 'gowns',
      'outerwear', 'jackets', 'coats',
      'shoes', 'sneakers', 'boots', 'heels',
      'accessories'
    ];
    
    for (const category of categories) {
      if (lowerText.includes(category)) {
        return category;
      }
    }
    
    // Extract occasions
    const occasions = [
      'casual', 'formal', 'business', 'work',
      'party', 'date', 'wedding', 'weekend',
      'vacation', 'summer', 'winter', 'spring', 'fall'
    ];
    
    for (const occasion of occasions) {
      if (lowerText.includes(occasion)) {
        return occasion;
      }
    }
    
    return undefined;
  }

  /**
   * Create a text message
   */
  private createTextMessage(text: string, sender: MessageSender): TextMessage {
    return {
      id: uuidv4(),
      type: MessageType.TEXT,
      sender,
      text,
      timestamp: new Date()
    };
  }

  /**
   * Create a recommendation message
   */
  private createRecommendationMessage(items: ChatTypes.RecommendationItem[]): ChatTypes.RecommendationMessage {
    return {
      id: uuidv4(),
      type: MessageType.RECOMMENDATION,
      sender: MessageSender.ASSISTANT,
      items,
      timestamp: new Date()
    };
  }

  /**
   * Create an outfit message
   */
  private createOutfitMessage(outfit: ChatTypes.Outfit): ChatTypes.OutfitMessage {
    return {
      id: uuidv4(),
      type: MessageType.OUTFIT,
      sender: MessageSender.ASSISTANT,
      outfit,
      timestamp: new Date()
    };
  }
}