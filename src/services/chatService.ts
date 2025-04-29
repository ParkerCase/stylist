// src/services/chatService.ts

import { MessageSender, MessageType, ChatMessage, TextMessage, ChatTypes } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationApi } from '@/api/recommendationApi';
import { trackMessageSent } from '@/services/analytics/analyticsService';

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
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1',
      modelName: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      fallbackMode: !process.env.ANTHROPIC_API_KEY
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
  }

  /**
   * Process a user message and generate appropriate responses
   */
  async processMessage(text: string): Promise<ChatMessage[]> {
    // Track the message sent
    trackMessageSent(this.userId, text);

    // Initialize response messages array
    const responseMessages: ChatMessage[] = [];

    // Try to use Claude API if available
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
    
    // If Claude is not available or failed, use rule-based approach

    // Basic NLU to categorize user intent
    const intent = this.categorizeIntent(text);

    // Based on intent, generate appropriate responses
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
      
      // API endpoint - combine with base URL if needed
      const apiUrl = this.recommendationApi.apiClient 
        ? `${(this.recommendationApi.apiClient as any).baseURL || ''}/chat`
        : '/api/chat';
        
      console.log('Calling Claude API at:', apiUrl);
      
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