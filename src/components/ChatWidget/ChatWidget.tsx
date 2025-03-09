// src/components/ChatWidget/ChatWidget.tsx (enhancing the existing implementation)

import React, { useEffect, useState, useCallback } from 'react';
import './ChatWidget.scss';
import ChatHeader from '@components/ChatHeader';
import ChatBody from '@components/ChatBody';
import ChatInput from '@components/ChatInput';
import TryOnModal from '@components/TryOnModal';
import StyleQuizModal from '@components/StyleQuiz/StyleQuizModal';
import { useChatStore, useUserStore, useRecommendationStore } from '@store/index';
import { MessageSender, MessageType, ProcessingStatus } from '@types/index';
import { createStylistApi } from '@api/index';
import { ChatService } from '@/services/chatService';
import { AnalyticsEventType, trackEvent } from '@utils/analytics';
import { getUserId } from '@utils/localStorage';
import LoadingIndicator from '@components/common/LoadingIndicator';
import ErrorMessage from '@components/common/ErrorMessage';

interface ChatWidgetProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  apiKey,
  retailerId,
  apiUrl,
  position = 'bottom-right',
  primaryColor = '#4361ee',
  greeting = 'Hi there! I'm your AI style assistant. How can I help you today?'
}) => {
  const [initialized, setInitialized] = useState(false);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [showStyleQuiz, setShowStyleQuiz] = useState(false);
  
  // Get state and actions from stores
  const {
    messages,
    isOpen,
    isMinimized,
    isLoading,
    addTextMessage,
    addMessage,
    setLoading,
    setError
  } = useChatStore();
  
  const {
    user,
    setUser,
    addLikedItem,
    addDislikedItem,
    addViewedItem
  } = useUserStore();
  
  const {
    setRecommendedItems,
    setRecommendedOutfits,
    addToWishlist,
    addToCart
  } = useRecommendationStore();
  
  // Create API client
  const api = createStylistApi({
    apiKey,
    retailerId,
    apiUrl
  });
  
  // Initialize user and send greeting
  useEffect(() => {
    if (!initialized && isOpen) {
      initializeUser();
      setInitialized(true);
    }
  }, [isOpen]);
  
  // Initialize chat service when user is loaded
  useEffect(() => {
    if (user && api) {
      setChatService(new ChatService(api.recommendation, user.userId));
    }
  }, [user, api]);
  
  // Inject CSS variables for theme colors
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--stylist-primary-color', primaryColor);
      
      // Generate lighter and darker variants
      document.documentElement.style.setProperty(
        '--stylist-primary-color-light',
        lightenColor(primaryColor, 0.2)
      );
      
      document.documentElement.style.setProperty(
        '--stylist-primary-color-dark',
        darkenColor(primaryColor, 0.2)
      );
    }
  }, [primaryColor]);
  
  // Helper function to lighten a color
  const lightenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');
      
      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      
      // Lighten each component
      const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
      const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
      const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
      
      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color;
    }
  };
  
  // Helper function to darken a color
  const darkenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');
      
      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      
      // Darken each component
      const newR = Math.max(0, Math.floor(r * (1 - amount)));
      const newG = Math.max(0, Math.floor(g * (1 - amount)));
      const newB = Math.max(0, Math.floor(b * (1 - amount)));
      
      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color;
    }
  };
  
  // Initialize user profile
  const initializeUser = async () => {
    try {
      // Show loading indicator
      setLoading(true);
      
      // Get user ID from localStorage or create a new one
      const userId = getUserId();
      
      // Get or create user profile
      let userProfile;
      try {
        // Try to get existing user profile
        userProfile = await api.user.getUserProfile(userId);
      } catch (error) {
        // Create a new user profile if not found
        userProfile = await api.user.createUser();
      }
      
      // Store user profile in state
      setUser(userProfile);
      
      // Send greeting message
      if (greeting) {
        addTextMessage(greeting, MessageSender.ASSISTANT);
      }
      
      // Track widget open event
      trackEvent(AnalyticsEventType.WIDGET_OPEN, userProfile.userId);
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Sorry, I had trouble connecting. Please try again later.');
      addTextMessage(
        'Sorry, I had trouble connecting. Please try again later.',
        MessageSender.SYSTEM
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    // Add user message to chat
    addTextMessage(text, MessageSender.USER);
    
    if (!user || !chatService) return;
    
    // Start loading state
    setLoading(true);
    
    try {
      // Process the message
      const responses = await chatService.processMessage(text);
      
      // Add responses to the chat with slight delays for a more natural conversation
      for (let i = 0; i < responses.length; i++) {
        // Add a small delay between messages
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        const response = responses[i];
        
        // Add message to chat
        addMessage(response);
        
        // If it's a recommendation, store it
        if (response.type === MessageType.RECOMMENDATION) {
          setRecommendedItems(response.items);
        }
        
        // If it's an outfit, store it
        if (response.type === MessageType.OUTFIT) {
          setRecommendedOutfits([response.outfit]);
        }
      }
      
      // Check for style quiz trigger
      if (text.toLowerCase().includes('quiz') || 
          text.toLowerCase().includes('style profile') || 
          text.toLowerCase().includes('preferences')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowStyleQuiz(true);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setError(error instanceof Error ? error.message : String(error));
      addTextMessage(
        'Sorry, I encountered an error while processing your request. Please try again.',
        MessageSender.SYSTEM
      );
    } finally {
      // End loading state
      setLoading(false);
    }
  };
  
  // Handle item feedback
  const handleItemFeedback = async (itemId: string, liked: boolean) => {
    if (!user) return;
    
    try {
      if (liked) {
        addLikedItem(itemId);
        trackEvent(AnalyticsEventType.ITEM_LIKE, user.userId, { itemId });
      } else {
        addDislikedItem(itemId);
        trackEvent(AnalyticsEventType.ITEM_DISLIKE, user.userId, { itemId });
      }
      
      // Submit feedback to API
      await api.recommendation.addItemFeedback({
        userId: user.userId,
        itemId,
        liked,
        timestamp: new Date()
      });
      
      // Add feedback confirmation message
      if (liked) {
        addTextMessage(
          'Great! I\'ve noted that you like this item. I\'ll keep this in mind for future recommendations.',
          MessageSender.ASSISTANT
        );
      }
    } catch (error) {
      console.error('Error submitting item feedback:', error);
      setError('Failed to save your feedback. Please try again.');
    }
  };
  
  // Handle outfit feedback
  const handleOutfitFeedback = async (outfitId: string, liked: boolean) => {
    if (!user) return;
    
    try {
      trackEvent(
        liked ? AnalyticsEventType.OUTFIT_LIKE : AnalyticsEventType.OUTFIT_DISLIKE,
        user.userId,
        { outfitId }
      );
      
      // Submit feedback to API
      await api.recommendation.addOutfitFeedback({
        userId: user.userId,
        outfitId,
        liked,
        timestamp: new Date()
      });
      
      // Provide feedback confirmation
      if (liked) {
        addTextMessage(
          'Great! I\'m glad you like this outfit. I\'ll remember your preference for future recommendations.',
          MessageSender.ASSISTANT
        );
      }
    } catch (error) {
      console.error('Error submitting outfit feedback:', error);
      setError('Failed to save your feedback. Please try again.');
    }
  };
  
  // Handle adding item to wishlist
  const handleAddToWishlist = (item: any) => {
    if (!user) return;
    
    try {
      addToWishlist({
        itemId: item.id,
        retailerId,
        addedAt: new Date()
      });
      
      addTextMessage(
        `I've added ${item.name} to your wishlist!`,
        MessageSender.ASSISTANT
      );
      
      trackEvent(AnalyticsEventType.ADD_TO_WISHLIST, user.userId, { itemId: item.id });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      setError('Failed to add item to wishlist. Please try again.');
    }
  };
  
  // Handle adding item to cart
  const handleAddToCart = (item: any, quantity: number = 1, size?: string, color?: string) => {
    if (!user) return;
    
    try {
      addToCart({
        itemId: item.id,
        retailerId,
        quantity,
        size,
        color,
        addedAt: new Date()
      });
      
      addTextMessage(
        `I've added ${item.name} to your shopping cart!`,
        MessageSender.ASSISTANT
      );
      
      trackEvent(AnalyticsEventType.ADD_TO_CART, user.userId, { 
        itemId: item.id,
        quantity,
        size,
        color
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Failed to add item to cart. Please try again.');
    }
  };
  
  // Handle style quiz submission
  const handleQuizSubmit = async (answers: any) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Submit quiz answers to API
      const result = await api.user.submitStyleQuiz(user.userId, answers);
      
      // Close quiz modal
      setShowStyleQuiz(false);
      
      // Add confirmation message
      addTextMessage(
        'Thanks for completing the style quiz! I now have a better understanding of your preferences. Let me show you some recommendations based on your style profile.',
        MessageSender.ASSISTANT
      );
      
      // Get recommendations based on updated profile
      const recommendations = await api.recommendation.getRecommendations({
        userId: user.userId,
        limit: 4,
        includeOutfits: true
      });
      
      // Add recommendation message
      await new Promise(resolve => setTimeout(resolve, 1000));
      addMessage({
        id: uuidv4(),
        type: MessageType.RECOMMENDATION,
        sender: MessageSender.ASSISTANT,
        items: recommendations.items,
        timestamp: new Date()
      });
      
      // Store recommendations
      setRecommendedItems(recommendations.items);
      
      // Add outfit if available
      if (recommendations.outfits.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addTextMessage(
          'I\'ve also created a complete outfit based on your style:',
          MessageSender.ASSISTANT
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        addMessage({
          id: uuidv4(),
          type: MessageType.OUTFIT,
          sender: MessageSender.ASSISTANT,
          outfit: recommendations.outfits[0],
          timestamp: new Date()
        });
        
        // Store outfits
        setRecommendedOutfits(recommendations.outfits);
      }
      
      // Track quiz completion
      trackEvent(AnalyticsEventType.STYLE_QUIZ_COMPLETE, user.userId);
    } catch (error) {
      console.error('Error processing quiz:', error);
      setError('Failed to process the style quiz. Please try again later.');
      
      // Close quiz modal
      setShowStyleQuiz(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle try-on result save
  const handleTryOnSave = (resultUrl: string) => {
    if (!user) return;
    
    // Track event
    trackEvent(AnalyticsEventType.TRY_ON_SAVED, user.userId, { resultUrl });
    
    // Add a message with the try-on result
    addTextMessage(
      'Great! I\'ve saved your virtual try-on. How does it look?',
      MessageSender.ASSISTANT
    );
  };
  
  // Widget position classes
  const positionClasses = {
    'bottom-right': 'stylist-chat-widget--bottom-right',
    'bottom-left': 'stylist-chat-widget--bottom-left',
    'top-right': 'stylist-chat-widget--top-right',
    'top-left': 'stylist-chat-widget--top-left'
  };
  
  if (!isOpen) return null;
  
  const widgetClasses = `stylist-chat-widget ${positionClasses[position]} ${isMinimized ? 'stylist-chat-widget--minimized' : ''}`;
  
  return (
    <>
      <div className={widgetClasses} data-testid="stylist-chat-widget">
        <ChatHeader
          title="The Stylist"
          primaryColor={primaryColor}
        />
        <div className="stylist-chat-widget__content">
          <ChatBody
            messages={messages}
            onItemFeedback={handleItemFeedback}
            onOutfitFeedback={handleOutfitFeedback}
            onAddToWishlist={handleAddToWishlist}
            onAddToCart={handleAddToCart}
            isLoading={isLoading}
            primaryColor={primaryColor}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder="Type your question here..."
            disabled={isLoading}
            primaryColor={primaryColor}
          />
        </div>
      </div>
      
      {/* Virtual Try-On Modal */}
      <TryOnModal onSave={handleTryOnSave} />
      
      {/* Style Quiz Modal */}
      {showStyleQuiz && (
        <StyleQuizModal 
          onSubmit={handleQuizSubmit} 
          onClose={() => setShowStyleQuiz(false)} 
          primaryColor={primaryColor}
        />
      )}
    </>
  );
};

export default ChatWidget;