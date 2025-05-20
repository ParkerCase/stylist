// Enhanced ChatService with context awareness and advanced input features
// src/services/chatService.ts

import { MessageSender, MessageType, ChatMessage, TextMessage, ChatTypes } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';
import { RecommendationApi } from '@/api/recommendationApi';
import { UserApi } from '@/api/userApi';
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

interface UserContext {
  stylePreferences: Record<string, any>;
  closetItems: any[];
  likedItems: string[];
  dislikedItems: string[];
  recentSearches: string[];
  recentInteractions: any[];
  lastMessageTimestamp?: Date;
}

interface SpecialCommand {
  pattern: RegExp;
  handler: (text: string, matches: RegExpMatchArray) => Promise<ChatMessage[]>;
}

export class ChatService {
  private recommendationApi: RecommendationApi;
  private userApi?: UserApi;
  private userId: string;
  private claudeConfig: ClaudeConfig;
  private conversationHistory: ChatMessage[] = [];
  private conversationContext: string[] = [];
  private userContext: UserContext = {
    stylePreferences: {},
    closetItems: [],
    likedItems: [],
    dislikedItems: [],
    recentSearches: [],
    recentInteractions: []
  };
  private specialCommands: SpecialCommand[] = [];

  constructor(recommendationApi: RecommendationApi, userId: string, userApi?: UserApi) {
    this.recommendationApi = recommendationApi;
    this.userApi = userApi;
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
      If you don't know something specific about fashion, you can suggest general style principles.
      
      Remember to be conversational yet professional. Reference the user's past preferences and items in their closet when relevant.
      You can handle multiple types of input including text, image uploads for finding similar items, and URL inputs for specific product lookups.
      `
    ];
    
    // Initialize special commands
    this.initializeSpecialCommands();
    
    // Initialize user context if possible
    this.loadUserContext();
    
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
   * Initialize special commands/queries the chat can handle
   */
  /**
   * Generate insights about trending items
   */
  private generateTrendInsights(category: string, trendingItems: any[]): string {
    // Extract patterns from trending items
    const brands = trendingItems.map(item => item.brand).filter(Boolean);
    const uniqueBrands = [...new Set(brands)];

    // Extract colors from trending items if they exist in the data
    const colors: string[] = [];
    trendingItems.forEach(item => {
      if (item.colors && Array.isArray(item.colors)) {
        colors.push(...item.colors);
      }
    });
    const uniqueColors = [...new Set(colors)];

    let insights = '';

    if (category) {
      insights += `Current ${category} trends are focused on `;
    } else {
      insights += 'Current fashion trends are highlighting ';
    }

    // Add color insights if available
    if (uniqueColors.length > 0) {
      insights += `${uniqueColors.slice(0, 3).join(', ')} colors`;

      // Add brand insights if available
      if (uniqueBrands.length > 0) {
        insights += ` with designers like ${uniqueBrands.slice(0, 2).join(' and ')} leading the way`;
      }
    }
    // If no colors but have brands
    else if (uniqueBrands.length > 0) {
      insights += `styles from ${uniqueBrands.slice(0, 3).join(', ')}`;
    }
    // Generic fallback
    else {
      insights += 'innovative designs and fresh styles';
    }

    insights += '. These trends are expected to continue gaining popularity over the coming weeks.';

    return insights;
  }

  private initializeSpecialCommands() {
    // Special command: Show me dresses for [event]
    this.specialCommands.push({
      pattern: /show\s+me\s+([\w\s]+)(?:\s+for\s+([\w\s]+))?/i,
      handler: async (text, matches) => {
        const itemType = matches[1]?.trim().toLowerCase() || '';
        const occasion = matches[2]?.trim().toLowerCase() || '';

        const context = occasion || itemType;
        this.userContext.recentSearches.push(context);

        const messages: ChatMessage[] = [];
        messages.push(this.createTextMessage(
          `I'd be happy to show you ${itemType}${occasion ? ` for ${occasion}` : ''}! Here are some recommendations:`,
          MessageSender.ASSISTANT
        ));

        await this.addRecommendationMessage(messages, context);
        return messages;
      }
    });

    // Special command: Match this with my closet
    this.specialCommands.push({
      pattern: /match\s+this\s+with\s+my\s+closet/i,
      handler: async () => {
        const messages: ChatMessage[] = [];

        if (this.userContext.closetItems.length === 0) {
          messages.push(this.createTextMessage(
            "I don't see any items in your closet yet. Would you like to add some items first? You can upload photos of your clothing to your closet.",
            MessageSender.ASSISTANT
          ));
          return messages;
        }

        messages.push(this.createTextMessage(
          "Let me find items that would pair well with what's in your closet!",
          MessageSender.ASSISTANT
        ));

        await this.addRecommendationMessage(messages, 'closet_match');
        return messages;
      }
    });

    // Special command: Find under $[price]
    this.specialCommands.push({
      pattern: /find\s+(?:items|clothes|clothing)?\s*under\s*\$?(\d+)/i,
      handler: async (text, matches) => {
        const priceLimit = parseInt(matches[1] || '0', 10);
        const messages: ChatMessage[] = [];

        messages.push(this.createTextMessage(
          `Here are some stylish options under $${priceLimit}:`,
          MessageSender.ASSISTANT
        ));

        await this.addRecommendationMessage(messages, `under_${priceLimit}`);
        return messages;
      }
    });

    // Special command: Complete this outfit
    this.specialCommands.push({
      pattern: /complete\s+this\s+outfit/i,
      handler: async () => {
        const messages: ChatMessage[] = [];

        messages.push(this.createTextMessage(
          "I'll help you complete your outfit with these complementary pieces:",
          MessageSender.ASSISTANT
        ));

        // Get a complete outfit recommendation
        try {
          const recommendations = await this.recommendationApi.getRecommendations({
            userId: this.userId,
            context: 'complete_outfit',
            includeOutfits: true,
            limit: 1
          });

          if (recommendations.outfits.length > 0) {
            // Add the outfit
            const outfit = recommendations.outfits[0];
            const chatOutfit = this.convertRecommendationOutfitToChatOutfit(outfit);
            messages.push(this.createOutfitMessage(chatOutfit));
          } else {
            // Fallback if no outfit is returned
            await this.addRecommendationMessage(messages, 'outfit_pieces');
          }
        } catch (error) {
          console.error('Error getting outfit recommendations:', error);
          messages.push(this.createTextMessage(
            "I'm having trouble finding the perfect outfit pieces right now. Please try again.",
            MessageSender.SYSTEM
          ));
        }

        return messages;
      }
    });

    // Special command: What's trending in [category]
    this.specialCommands.push({
      pattern: /what(?:'s|\s+is)\s+trending\s+(?:in\s+)([\w\s]+)/i,
      handler: async (text, matches) => {
        const category = matches[1]?.trim().toLowerCase() || '';
        const messages: ChatMessage[] = [];

        messages.push(this.createTextMessage(
          `Here are the top trending ${category} items right now:`,
          MessageSender.ASSISTANT
        ));

        await this.addRecommendationMessage(messages, `trending_${category}`);
        return messages;
      }
    });

    // Special command: /outfit [item] - Generate complete outfit based on item
    this.specialCommands.push({
      pattern: /^\/outfit(?:\s+([\w\s]+))?$/i,
      handler: async (text, matches) => {
        const itemType = matches[1]?.trim().toLowerCase() || '';
        const messages: ChatMessage[] = [];

        if (itemType) {
          messages.push(this.createTextMessage(
            `Creating a complete outfit based on ${itemType}. Here's what I recommend:`,
            MessageSender.ASSISTANT
          ));
        } else {
          messages.push(this.createTextMessage(
            "Let me create a complete outfit for you based on your style preferences:",
            MessageSender.ASSISTANT
          ));
        }

        // Get a complete outfit recommendation
        try {
          const recommendations = await this.recommendationApi.getRecommendations({
            userId: this.userId,
            context: itemType ? `outfit_${itemType}` : 'complete_outfit',
            includeOutfits: true,
            limit: 1
          });

          if (recommendations.outfits.length > 0) {
            // Add the outfit
            const outfit = recommendations.outfits[0];
            const chatOutfit = this.convertRecommendationOutfitToChatOutfit(outfit);
            messages.push(this.createOutfitMessage(chatOutfit));

            // Add explanation of the outfit
            messages.push(this.createTextMessage(
              `This outfit combines pieces that work well together based on color harmony, style consistency, and your preferences. Each item was selected to create a cohesive look that's appropriate for ${outfit.occasion || 'everyday wear'}.`,
              MessageSender.ASSISTANT
            ));
          } else {
            // Fallback if no outfit is returned
            await this.addRecommendationMessage(messages, itemType ? `items_${itemType}` : 'outfit_pieces');
          }
        } catch (error) {
          console.error('Error getting outfit recommendations:', error);
          messages.push(this.createTextMessage(
            "I'm having trouble generating a complete outfit right now. Please try again.",
            MessageSender.SYSTEM
          ));
        }

        return messages;
      }
    });

    // Special command: /trends [category] - Show trending items for a specific category
    this.specialCommands.push({
      pattern: /^\/trends(?:\s+([\w\s]+))?$/i,
      handler: async (text, matches) => {
        const category = matches[1]?.trim().toLowerCase() || '';
        const messages: ChatMessage[] = [];

        if (category) {
          messages.push(this.createTextMessage(
            `Here are the trending ${category} items right now:`,
            MessageSender.ASSISTANT
          ));
        } else {
          messages.push(this.createTextMessage(
            "Here are the trending fashion items across all categories:",
            MessageSender.ASSISTANT
          ));
        }

        try {
          const recommendations = await this.recommendationApi.getRecommendations({
            userId: this.userId,
            context: category ? `trending_${category}` : 'trending',
            trending: true,
            category: category || undefined,
            limit: 6
          });

          if (recommendations.items.length > 0) {
            // Generate trend insights
            const trendInsights = this.generateTrendInsights(category, recommendations.items);
            messages.push(this.createTextMessage(
              trendInsights,
              MessageSender.ASSISTANT
            ));

            // Add recommendation message
            const chatItems = this.convertRecommendationItemsToChatItems(recommendations.items);
            messages.push(this.createRecommendationMessage(chatItems));
          } else {
            messages.push(this.createTextMessage(
              "I couldn't find any trending items at the moment. Please try again later.",
              MessageSender.SYSTEM
            ));
          }
        } catch (error) {
          console.error('Error getting trending recommendations:', error);
          messages.push(this.createTextMessage(
            "I'm having trouble finding trending items right now. Please try again.",
            MessageSender.SYSTEM
          ));
        }

        return messages;
      }
    });

    // Special command: /quiz - Start the style quiz
    this.specialCommands.push({
      pattern: /^\/quiz$/i,
      handler: async () => {
        const messages: ChatMessage[] = [];

        messages.push(this.createTextMessage(
          "I've opened the style quiz for you! Complete it to help me understand your fashion preferences better.",
          MessageSender.ASSISTANT
        ));

        messages.push(this.createTextMessage(
          "After completing the quiz, I'll be able to provide more personalized recommendations that match your unique style profile.",
          MessageSender.ASSISTANT
        ));

        return messages;
      }
    });

    // Special command: /find [item] - Deep search functionality
    this.specialCommands.push({
      pattern: /^\/find(?:\s+([\w\s]+))?$/i,
      handler: async (text, matches) => {
        const searchQuery = matches[1]?.trim() || '';
        const messages: ChatMessage[] = [];

        if (!searchQuery) {
          messages.push(this.createTextMessage(
            "Please provide a search term after the /find command. For example: /find black dress",
            MessageSender.SYSTEM
          ));
          return messages;
        }

        messages.push(this.createTextMessage(
          `Searching across all inventory for "${searchQuery}"...`,
          MessageSender.ASSISTANT
        ));

        try {
          const recommendations = await this.recommendationApi.getRecommendations({
            userId: this.userId,
            context: `search_${searchQuery}`,
            deepSearch: true,
            limit: 8
          });

          if (recommendations.items.length > 0) {
            messages.push(this.createTextMessage(
              `Here are the best matches for "${searchQuery}" from our complete inventory:`,
              MessageSender.ASSISTANT
            ));

            // Add recommendation message
            const chatItems = this.convertRecommendationItemsToChatItems(recommendations.items);
            messages.push(this.createRecommendationMessage(chatItems));
          } else {
            messages.push(this.createTextMessage(
              `I couldn't find any items matching "${searchQuery}". Try a different search term or browse our trending items instead.`,
              MessageSender.ASSISTANT
            ));
          }
        } catch (error) {
          console.error('Error performing deep search:', error);
          messages.push(this.createTextMessage(
            "I'm having trouble searching our inventory right now. Please try again.",
            MessageSender.SYSTEM
          ));
        }

        return messages;
      }
    });
  }

  /**
   * Process a user message and generate appropriate responses
   */
  async processMessage(text: string): Promise<ChatMessage[]> {
    // Track the message sent
    trackMessageSent(this.userId, text);
    
    // Add to recent searches for context
    this.userContext.recentSearches.push(text);
    if (this.userContext.recentSearches.length > 5) {
      this.userContext.recentSearches.shift();
    }
    
    // Update last message timestamp
    this.userContext.lastMessageTimestamp = new Date();

    // Initialize response messages array
    const responseMessages: ChatMessage[] = [];
    
    // Create user message for conversation history
    const userMessage: TextMessage = {
      id: uuidv4(),
      type: MessageType.TEXT,
      sender: MessageSender.USER,
      text,
      timestamp: new Date()
    };
    
    // Add to conversation history
    this.conversationHistory.push(userMessage);
    
    // Check for special commands first
    const specialCommandResponse = await this.processSpecialCommands(text);
    if (specialCommandResponse.length > 0) {
      // Add responses to conversation history
      this.conversationHistory.push(...specialCommandResponse);
      return specialCommandResponse;
    }

    // Determine the intent for possible demo responses
    const intent = this.categorizeIntent(text);

    // Try to use Claude API if available and not in forced demo mode
    if (!this.claudeConfig.fallbackMode) {
      try {
        const claudeResponse = await this.callClaudeAPI(text);
        
        // Add the response from Claude
        const responseMessage = this.createTextMessage(
          claudeResponse,
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(responseMessage);
        responseMessages.push(responseMessage);
        
        // Process for special instructions in Claude response
        if (this.containsRecommendationIntent(claudeResponse, text)) {
          // Add a recommendation message if Claude suggested showing items
          const additionalMessages = await this.addRecommendationMessage([], this.extractContext(text));
          
          // Add to conversation history and response
          this.conversationHistory.push(...additionalMessages);
          responseMessages.push(...additionalMessages);
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
      const responseMessage = this.createTextMessage(
        demoResponse,
        MessageSender.ASSISTANT
      );
      
      // Add to conversation history
      this.conversationHistory.push(responseMessage);
      responseMessages.push(responseMessage);
      
      // If it's a wedding dress query, also add recommendations
      if (intent === 'wedding_dress') {
        // Add a recommendation message after the initial response
        const additionalMessages = await this.addRecommendationMessage([], 'wedding');
        
        // Add to conversation history and response
        this.conversationHistory.push(...additionalMessages);
        responseMessages.push(...additionalMessages);
      }
      
      return responseMessages;
    }
    
    // If no demo response and Claude is not available or failed, use rule-based approach
    switch (intent) {
      case 'recommendation':
        // Add a simple acknowledgment message
        const acknowledgeMessage = this.createTextMessage(
          'I found some items that match your style! Here are my recommendations:',
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(acknowledgeMessage);
        responseMessages.push(acknowledgeMessage);
        
        // Get recommendations from API
        const additionalMessages = await this.addRecommendationMessage([], this.extractContext(text));
        
        // Add to conversation history and response
        this.conversationHistory.push(...additionalMessages);
        responseMessages.push(...additionalMessages);
        break;
        
      case 'style_quiz':
        const quizMessage = this.createTextMessage(
          'Would you like to take our style quiz? It will help me understand your preferences better so I can make more personalized recommendations.',
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(quizMessage);
        responseMessages.push(quizMessage);
        break;
        
      case 'virtual_try_on':
        const tryOnMessage = this.createTextMessage(
          'You can try on any clothing item by clicking the "Try On" button on a recommendation. Upload your photo, and see how the item looks on you!',
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(tryOnMessage);
        responseMessages.push(tryOnMessage);
        break;
        
      case 'greeting':
        // Use context awareness to personalize greeting
        let greeting = 'Hello! I\'m your personal AI style assistant. I can help you discover clothing that matches your unique style. ';
        
        if (this.userContext.stylePreferences && Object.keys(this.userContext.stylePreferences).length > 0) {
          greeting += 'Based on your style preferences, I can give you personalized recommendations. ';
        }
        
        if (this.userContext.lastMessageTimestamp) {
          const lastMsgTime = this.userContext.lastMessageTimestamp;
          const now = new Date();
          const hoursSinceLastMessage = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastMessage < 24) {
            greeting = 'Welcome back! Glad to see you again. ';
          }
        }
        
        greeting += 'Would you like some personalized recommendations?';
        
        const greetingMessage = this.createTextMessage(
          greeting,
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(greetingMessage);
        responseMessages.push(greetingMessage);
        break;
        
      case 'help':
        const helpMessage = this.createTextMessage(
          'I can help you with: \n- Finding clothing recommendations based on your style\n- Creating complete outfits\n- Virtual try-on of garments\n- Style advice and tips\n\nTry these special commands:\n- "Show me dresses for wedding"\n- "Match this with my closet"\n- "Find under $50"\n- "Complete this outfit"\n- "What\'s trending in shoes"\n- "/trends [category]" - Show trending items\n- "/quiz" - Start style quiz\n- "/find [item]" - Deep search our inventory\n- "/outfit [item]" - Create complete outfit\n\nJust let me know what you\'re looking for!',
          MessageSender.ASSISTANT
        );

        // Add to conversation history
        this.conversationHistory.push(helpMessage);
        responseMessages.push(helpMessage);
        break;
        
      case 'wedding_dress':
        // Special handling for wedding dress case when not in demo mode
        const weddingMessage = this.createTextMessage(
          'I can help you find the perfect wedding dress! Here are some recommendations based on current trends:',
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(weddingMessage);
        responseMessages.push(weddingMessage);
        
        // Get wedding dress recommendations
        const weddingRecommendations = await this.addRecommendationMessage([], 'wedding');
        
        // Add to conversation history and response
        this.conversationHistory.push(...weddingRecommendations);
        responseMessages.push(...weddingRecommendations);
        break;
        
      default:
        const defaultMessage = this.createTextMessage(
          'I can help you discover fashion items that match your style. Would you like to see some personalized recommendations?',
          MessageSender.ASSISTANT
        );
        
        // Add to conversation history
        this.conversationHistory.push(defaultMessage);
        responseMessages.push(defaultMessage);
    }
    
    return responseMessages;
  }

  /**
   * Process image upload to find similar items
   */
  async processImageUpload(imageFile: File): Promise<ChatMessage[]> {
    const responseMessages: ChatMessage[] = [];
    
    try {
      // Create a message to acknowledge the image upload
      const uploadMessage = this.createTextMessage(
        "I've received your image and I'm analyzing it to find similar items...",
        MessageSender.ASSISTANT
      );
      
      // Add to conversation history
      this.conversationHistory.push(uploadMessage);
      responseMessages.push(uploadMessage);
      
      // Here you would normally upload the image to your backend
      // For now we'll simulate a successful analysis
      const analysisDelay = new Promise(resolve => setTimeout(resolve, 1500));
      await analysisDelay;
      
      // Create a response message
      const analysisMessage = this.createTextMessage(
        "I found several items that match the style in your image. Here are the closest matches:",
        MessageSender.ASSISTANT
      );
      
      // Add to conversation history
      this.conversationHistory.push(analysisMessage);
      responseMessages.push(analysisMessage);
      
      // Get recommendations with image context
      const additionalMessages = await this.addRecommendationMessage([], 'image_match');
      
      // Add to conversation history and response
      this.conversationHistory.push(...additionalMessages);
      responseMessages.push(...additionalMessages);
      
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = this.createTextMessage(
        "I'm sorry, I encountered an error while analyzing your image. Please try again or describe what you're looking for instead.",
        MessageSender.SYSTEM
      );
      
      // Add to conversation history
      this.conversationHistory.push(errorMessage);
      responseMessages.push(errorMessage);
    }
    
    return responseMessages;
  }

  /**
   * Process URL input to find specific product
   */
  async processURLInput(url: string): Promise<ChatMessage[]> {
    const responseMessages: ChatMessage[] = [];
    
    try {
      // Create a message to acknowledge the URL input
      const urlMessage = this.createTextMessage(
        `I'm looking up the product at this URL: ${url}...`,
        MessageSender.ASSISTANT
      );
      
      // Add to conversation history
      this.conversationHistory.push(urlMessage);
      responseMessages.push(urlMessage);
      
      // Here you would normally send the URL to your backend for processing
      // For now we'll simulate a successful lookup
      const lookupDelay = new Promise(resolve => setTimeout(resolve, 1000));
      await lookupDelay;
      
      // Create a response message
      const productMessage = this.createTextMessage(
        "I found the product! Here are the details and some items that would go well with it:",
        MessageSender.ASSISTANT
      );
      
      // Add to conversation history
      this.conversationHistory.push(productMessage);
      responseMessages.push(productMessage);
      
      // Get recommendations with URL context
      const additionalMessages = await this.addRecommendationMessage([], 'product_url');
      
      // Add to conversation history and response
      this.conversationHistory.push(...additionalMessages);
      responseMessages.push(...additionalMessages);
      
    } catch (error) {
      console.error('Error processing URL:', error);
      const errorMessage = this.createTextMessage(
        "I'm sorry, I couldn't retrieve information about this product. The URL might be invalid or the product might not be available. Please try another URL or describe what you're looking for.",
        MessageSender.SYSTEM
      );
      
      // Add to conversation history
      this.conversationHistory.push(errorMessage);
      responseMessages.push(errorMessage);
    }
    
    return responseMessages;
  }
  
  /**
   * Process special commands
   */
  private async processSpecialCommands(text: string): Promise<ChatMessage[]> {
    for (const command of this.specialCommands) {
      const matches = text.match(command.pattern);
      if (matches) {
        try {
          return await command.handler(text, matches);
        } catch (error) {
          console.error(`Error processing special command: ${text}`, error);
          return [
            this.createTextMessage(
              "I'm sorry, I had trouble processing that command. Please try again.",
              MessageSender.SYSTEM
            )
          ];
        }
      }
    }
    return [];
  }

  /**
   * Load user context from backend or localStorage
   */
  private async loadUserContext() {
    try {
      if (this.userApi) {
        // Try to get user profile from API
        const userProfile = await this.userApi.getUserProfile(this.userId);
        
        if (userProfile) {
          // Update style preferences - access from preferences property
          this.userContext.stylePreferences = userProfile.preferences || {};
          
          // Get user closet if available
          try {
            // Fallback to user profile closet since getUserCloset doesn't exist in the interface
            const closet = { items: userProfile.closet || [] };
            this.userContext.closetItems = closet?.items || [];
          } catch (e) {
            console.error('Error loading user closet:', e);
          }
          
          // Get user liked/disliked items if available
          try {
            // Get feedback from user profile instead since API methods don't have the right structure
            const feedback = userProfile.feedback || { likedItems: [], dislikedItems: [] };
            this.userContext.likedItems = feedback.likedItems || [];
            this.userContext.dislikedItems = feedback.dislikedItems || [];
          } catch (e) {
            console.error('Error loading item feedback:', e);
          }
        }
      } else {
        // Try to load from localStorage as fallback
        try {
          const savedContext = localStorage.getItem(`stylist_chat_context_${this.userId}`);
          if (savedContext) {
            const parsedContext = JSON.parse(savedContext);
            this.userContext = { ...this.userContext, ...parsedContext };
          }
        } catch (e) {
          console.error('Error loading user context from localStorage:', e);
        }
      }
      
      // Update conversation context with user preferences
      this.updateConversationContext();
      
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  }
  
  /**
   * Update conversation context with user preferences
   */
  private updateConversationContext() {
    const contextUpdates = [];
    
    // Add style preferences to context
    if (Object.keys(this.userContext.stylePreferences).length > 0) {
      const stylePrefs = this.userContext.stylePreferences;
      
      let stylesContext = 'User style preferences: ';
      
      // Add key style preferences from quiz
      if (stylePrefs.favoriteColors) {
        stylesContext += `Favorite colors: ${stylePrefs.favoriteColors.join(', ')}. `;
      }
      
      if (stylePrefs.stylePersona) {
        stylesContext += `Style persona: ${stylePrefs.stylePersona}. `;
      }
      
      if (stylePrefs.preferredFit) {
        stylesContext += `Preferred fit: ${stylePrefs.preferredFit}. `;
      }
      
      contextUpdates.push(stylesContext);
    }
    
    // Add closet items to context
    if (this.userContext.closetItems.length > 0) {
      const closetSummary = `User has ${this.userContext.closetItems.length} items in their closet.`;
      contextUpdates.push(closetSummary);
    }
    
    // Add liked/disliked items to context
    if (this.userContext.likedItems.length > 0 || this.userContext.dislikedItems.length > 0) {
      let feedbackContext = 'User preferences based on feedback: ';
      
      if (this.userContext.likedItems.length > 0) {
        feedbackContext += `Liked ${this.userContext.likedItems.length} items. `;
      }
      
      if (this.userContext.dislikedItems.length > 0) {
        feedbackContext += `Disliked ${this.userContext.dislikedItems.length} items. `;
      }
      
      contextUpdates.push(feedbackContext);
    }
    
    // Add recent searches to context
    if (this.userContext.recentSearches.length > 0) {
      const recentSearches = `Recent user searches: ${this.userContext.recentSearches.slice(-3).join(', ')}`;
      contextUpdates.push(recentSearches);
    }
    
    // Add to conversation context if we have updates
    if (contextUpdates.length > 0) {
      // Only update if we have more than the initial system prompt
      if (this.conversationContext.length <= 1) {
        this.conversationContext.push(contextUpdates.join('\n'));
      } else {
        // Replace the existing context with updated info
        this.conversationContext[1] = contextUpdates.join('\n');
      }
    }
  }

  /**
   * Call the Claude API to get a response
   */
  private async callClaudeAPI(userMessage: string): Promise<string> {
    try {
      // Add the user message to context
      this.conversationContext.push(userMessage);
      
      // Make sure context is updated with latest user preferences
      this.updateConversationContext();
      
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
      'i can recommend',
      'here\'s what i found',
      'similar items',
      'items that match'
    ];
    
    // Recommendation phrases in user message
    const userRecommendPhrases = [
      'show me',
      'recommend',
      'what should i wear',
      'find me',
      'can you show',
      'give me ideas',
      'what would look good',
      'similar to',
      'like this',
      'matching'
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
  private async addRecommendationMessage(responseMessages: ChatMessage[], context?: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];
    
    try {
      const recommendations = await this.recommendationApi.getRecommendations({
        userId: this.userId,
        context: context,
        limit: 4
      });
      
      // Add recommendation message
      if (recommendations.items.length > 0) {
        // Convert from Recommendation to Chat format
        const chatItems = this.convertRecommendationItemsToChatItems(recommendations.items);
        const recommendationMessage = this.createRecommendationMessage(chatItems);
        messages.push(recommendationMessage);
      }
      
      // If there are outfits, add outfit message
      if (recommendations.outfits?.length > 0) {
        const outfitIntroMessage = this.createTextMessage(
          'I also created a complete outfit for you:',
          MessageSender.ASSISTANT
        );
        messages.push(outfitIntroMessage);
        
        // Convert from Recommendation to Chat format
        const outfit = recommendations.outfits[0];
        const chatOutfit = this.convertRecommendationOutfitToChatOutfit(outfit);
        messages.push(this.createOutfitMessage(chatOutfit));
      }
      
      // Add all messages to the response if provided
      if (responseMessages) {
        responseMessages.push(...messages);
      }
      
    } catch (error) {
      console.error('Error getting recommendations:', error);
      const errorMessage = this.createTextMessage(
        'Sorry, I had trouble getting recommendations. Please try again.',
        MessageSender.SYSTEM
      );
      
      messages.push(errorMessage);
      
      // Add error message to the response if provided
      if (responseMessages) {
        responseMessages.push(errorMessage);
      }
    }
    
    return messages;
  }
  
  /**
   * Convert recommendation items to chat items
   */
  private convertRecommendationItemsToChatItems(items: any[]): ChatTypes.RecommendationItem[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      salePrice: item.salePrice,
      imageUrl: item.imageUrls?.[0] || '',
      url: item.url,
      matchScore: item.matchScore,
      matchReasons: item.matchReasons
    }));
  }
  
  /**
   * Convert recommendation outfit to chat outfit
   */
  private convertRecommendationOutfitToChatOutfit(outfit: any): ChatTypes.Outfit {
    return {
      id: outfit.id,
      name: outfit.name,
      occasion: outfit.occasion,
      matchScore: outfit.matchScore,
      matchReasons: outfit.matchReasons,
      items: this.convertRecommendationItemsToChatItems(outfit.items)
    };
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
        // Use context-aware greeting
        let greeting = `Hello! I'm your personal style assistant. I'm here to help you discover clothing that matches your unique style preferences. `;
        
        if (Object.keys(this.userContext.stylePreferences).length > 0) {
          greeting += `Based on your style quiz results, I can provide tailored recommendations. `;
        }
        
        if (this.userContext.closetItems.length > 0) {
          greeting += `I can also suggest items that would coordinate well with the ${this.userContext.closetItems.length} items in your closet. `;
        }
        
        greeting += `I can recommend outfits, help you find specific items, provide style advice, or even let you virtually try on clothes. What kind of fashion help are you looking for today?`;
        
        return greeting;
        
      case 'help':
        return `I'm your AI fashion assistant, and I can help you with:

- Finding personalized clothing recommendations
- Creating complete outfits for specific occasions
- Virtually trying on garments with our try-on feature
- Answering style questions and providing fashion advice
- Helping you complete our style quiz to better understand your preferences

You can also use these special commands:
- "Show me dresses for wedding"
- "Match this with my closet"
- "Find under $50"
- "Complete this outfit"
- "What's trending in shoes"

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