// src/services/chatService.ts

import { MessageSender, MessageType, ChatMessage, RecommendationMessage, OutfitMessage, TextMessage } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationApi } from '@/api/recommendationApi';
import { trackMessageSent } from '@/services/analytics/analyticsService';

export class ChatService {
  private recommendationApi: RecommendationApi;
  private userId: string;

  constructor(recommendationApi: RecommendationApi, userId: string) {
    this.recommendationApi = recommendationApi;
    this.userId = userId;
  }

  /**
   * Process a user message and generate appropriate responses
   */
  async processMessage(text: string): Promise<ChatMessage[]> {
    // Track the message sent
    trackMessageSent(this.userId, text);

    // Initialize response messages array
    const responseMessages: ChatMessage[] = [];

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
        try {
          const recommendations = await this.recommendationApi.getRecommendations({
            userId: this.userId,
            context: this.extractContext(text),
            limit: 4
          });
          
          // Add recommendation message
          if (recommendations.items.length > 0) {
            responseMessages.push(this.createRecommendationMessage(recommendations.items));
          }
          
          // If there are outfits, add outfit message
          if (recommendations.outfits.length > 0) {
            responseMessages.push(this.createTextMessage(
              'I also created a complete outfit for you:',
              MessageSender.ASSISTANT
            ));
            responseMessages.push(this.createOutfitMessage(recommendations.outfits[0]));
          }
        } catch (error) {
          console.error('Error getting recommendations:', error);
          responseMessages.push(this.createTextMessage(
            'Sorry, I had trouble getting recommendations. Please try again.',
            MessageSender.SYSTEM
          ));
        }
        break;
        
      case 'style_quiz':
        responseMessages.push(this.createTextMessage(
          'Would you like to take our style quiz? It will help me understand your preferences better so I can make more personalized recommendations.',
          MessageSender.ASSISTANT
        ));
        // In a real implementation, we could add a quiz message here
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
  private createRecommendationMessage(items: any[]): RecommendationMessage {
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
  private createOutfitMessage(outfit: any): OutfitMessage {
    return {
      id: uuidv4(),
      type: MessageType.OUTFIT,
      sender: MessageSender.ASSISTANT,
      outfit,
      timestamp: new Date()
    };
  }
}