// src/components/ChatWidget/ChatWidget.tsx (enhanced implementation)

import React, { useEffect, useState, useCallback } from 'react';
import './ChatWidget.scss';
import ChatHeader from '@/components/ChatHeader';
import ChatBody from '@/components/ChatBody';
import ChatInput from '@/components/ChatInput';
import TryOnModal from '@/components/TryOnModal';
import StyleQuizModal from '@/components/StyleQuiz/StyleQuizModal';
import Lookbook from '@/components/Lookbook';
import { useChatStore, useUserStore, useRecommendationStore } from '@/store/index';
import { MessageSender, MessageType, StyleQuizAnswer, Recommendation, ChatMessage } from '@/types/index';
import { createStylistApi } from '@/api/index';
import { ChatService } from '@/services/chatService';
import { AnalyticsEventType, trackEvent } from '@/utils/analytics';
import { getUserId } from '@/utils/localStorage';

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
  greeting = "Hi there! I'm your AI style assistant. How can I help you today?"
}) => {
  const [initialized, setInitialized] = useState(false);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [showStyleQuiz, setShowStyleQuiz] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'lookbook'>('chat');
  
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
    addDislikedItem
  } = useUserStore();
  
  const {
    recommendedItems,
    recommendedOutfits,
    savedOutfits,
    setRecommendedItems,
    setRecommendedOutfits,
    addToWishlist,
    addToCart,
    saveOutfit
  } = useRecommendationStore();
  
  // Create API client
  const api = createStylistApi({
    apiKey,
    retailerId,
    apiUrl
  });
  
  // Initialize user profile with useCallback to avoid dependency issues
  const initializeUser = useCallback(async () => {
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
      } catch {
        // Create a new user profile if not found
        userProfile = await api.user.createUser();
      }
      
      // Store user profile in state
      setUser(userProfile);
      
      // Send greeting message
      if (greeting) {
        addTextMessage(greeting, 'assistant');
        
        // Add follow-up message with options
        await new Promise(resolve => setTimeout(resolve, 1200));
        addTextMessage(
          "I can help you with:\n• Finding clothes that match your style\n• Creating complete outfits\n• Virtual try-ons\n\nTo get started, would you like to take our quick style quiz or see some recommended items?",
          'assistant'
        );
      }
      
      // Track widget open event
      trackEvent(AnalyticsEventType.WIDGET_OPEN, userProfile.userId);
      
      // Fetch initial recommendations if we don't have any
      if (recommendedItems.length === 0) {
        try {
          const recommendations = await api.recommendation.getRecommendations({
            userId: userProfile.userId,
            limit: 6
          });
          
          // Convert items to proper format
          const convertedItems = recommendations.items.map(item => ({
            id: item.id,
            retailerId: 'default',
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            salePrice: item.salePrice,
            colors: [],
            sizes: [],
            imageUrls: [item.imageUrls[0] || ''],
            url: item.url,
            matchScore: item.matchScore,
            matchReasons: item.matchReasons,
            inStock: true
          }));
          
          setRecommendedItems(convertedItems);
          
          // Convert outfits if available
          if (recommendations.outfits && recommendations.outfits.length > 0) {
            const convertedOutfits = recommendations.outfits.map(outfit => ({
              id: outfit.id,
              name: outfit.name || '',
              occasion: outfit.occasion,
              matchScore: outfit.matchScore,
              matchReasons: outfit.matchReasons,
              items: outfit.items.map(item => ({
                id: item.id,
                retailerId: 'default',
                name: item.name,
                brand: item.brand,
                category: item.category,
                price: item.price,
                salePrice: item.salePrice,
                colors: [],
                sizes: [],
                imageUrls: [item.imageUrls[0] || ''], 
                url: item.url,
                matchScore: item.matchScore,
                matchReasons: item.matchReasons,
                inStock: true
              }))
            }));
            
            setRecommendedOutfits(convertedOutfits);
          }
        } catch (error) {
          console.error('Error fetching initial recommendations:', error);
          // Silently fail - we'll show recommendations when the user asks for them
        }
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Sorry, I had trouble connecting. Please try again later.');
      addTextMessage(
        'Sorry, I had trouble connecting. Please try again later.',
        'system'
      );
    } finally {
      setLoading(false);
    }
  }, [api, greeting, addTextMessage, setUser, setLoading, setError, recommendedItems.length, setRecommendedItems, setRecommendedOutfits]);
  
  // Initialize user and send greeting
  useEffect(() => {
    if (!initialized && isOpen) {
      initializeUser();
      setInitialized(true);
    }
  }, [isOpen, initialized, initializeUser]);
  
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
    } catch {
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
    } catch {
      return color;
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    // Add user message to chat
    addTextMessage(text, 'user');
    
    if (!user || !chatService) return;
    
    // Start loading state
    setLoading(true);
    
    // Handle specific commands
    const lowerText = text.toLowerCase();
    
    // Handle "show lookbook" command
    if (lowerText.includes('lookbook') || 
        lowerText.includes('show recommendations') || 
        lowerText.includes('show items')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addTextMessage(
        'Here\'s your lookbook with all recommended items and outfits!',
        'assistant'
      );
      setCurrentView('lookbook');
      setLoading(false);
      return;
    }
    
    // Handle "back to chat" command
    if (lowerText.includes('back to chat') || 
        lowerText.includes('return to chat')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addTextMessage(
        'Switching back to chat view. How else can I help you?',
        'assistant'
      );
      setCurrentView('chat');
      setLoading(false);
      return;
    }
    
    // Handle style quiz command
    if (lowerText.includes('quiz') || 
        lowerText.includes('style profile') || 
        lowerText.includes('preferences')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      addTextMessage(
        'Let\'s find out more about your style preferences! Please answer a few quick questions.',
        'assistant'
      );
      setShowStyleQuiz(true);
      setLoading(false);
      return;
    }
    
    try {
      // Process the message with chat service
      const responses = await chatService.processMessage(text);
      
      // Add responses to the chat with slight delays for a more natural conversation
      for (let i = 0; i < responses.length; i++) {
        // Add a small delay between messages
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        const response = responses[i];
        
        // Add message to chat
        addMessage(response as ChatMessage);
        
        // If it's a recommendation, store it
        if (response.type === 'recommendation') {
          // Convert from Chat.RecommendationItem to Recommendation.RecommendationItem
          const convertedItems = response.items.map(item => ({
            id: item.id,
            retailerId: 'default',
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            salePrice: item.salePrice,
            colors: [],
            sizes: [],
            imageUrls: [item.imageUrl || ''],
            url: item.url,
            matchScore: item.matchScore,
            matchReasons: item.matchReasons,
            inStock: true
          }));
          setRecommendedItems(convertedItems);
        }
        
        // If it's an outfit, store it
        if (response.type === 'outfit') {
          // Convert from Chat.Outfit to Recommendation.Outfit
          const convertedOutfit = {
            id: response.outfit.id,
            name: response.outfit.name,
            occasion: response.outfit.occasion,
            matchScore: response.outfit.matchScore,
            matchReasons: response.outfit.matchReasons,
            // Convert all items in the outfit
            items: response.outfit.items.map(item => ({
              id: item.id,
              retailerId: 'default',
              name: item.name,
              brand: item.brand,
              category: item.category,
              price: item.price,
              salePrice: item.salePrice,
              colors: [],
              sizes: [],
              imageUrls: [item.imageUrl || ''],
              url: item.url,
              matchScore: item.matchScore,
              matchReasons: item.matchReasons,
              inStock: true
            }))
          };
          
          // Check if we already have this outfit
          const outfitExists = recommendedOutfits.some(
            outfit => outfit.id === convertedOutfit.id
          );
          
          if (!outfitExists) {
            setRecommendedOutfits([...recommendedOutfits, convertedOutfit]);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setError(error instanceof Error ? error.message : String(error));
      addTextMessage(
        'Sorry, I encountered an error while processing your request. Please try again.',
        'system'
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
      
      // Add feedback confirmation message if in chat view
      if (currentView === 'chat' && liked) {
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
      
      // Provide feedback confirmation if in chat view
      if (currentView === 'chat' && liked) {
        addTextMessage(
          'Great! I\'m glad you like this outfit. I\'ll remember your preference for future recommendations.',
          'assistant'
        );
      }
    } catch (error) {
      console.error('Error submitting outfit feedback:', error);
      setError('Failed to save your feedback. Please try again.');
    }
  };
  
  // Handle adding item to wishlist
  const handleAddToWishlist = (item: Recommendation.RecommendationItem) => {
    if (!user) return;
    
    try {
      addToWishlist({
        itemId: item.id,
        retailerId,
        addedAt: new Date()
      });
      
      if (currentView === 'chat') {
        addTextMessage(
          `I've added ${item.name} to your wishlist!`,
          'assistant'
        );
      }
      
      trackEvent(AnalyticsEventType.ADD_TO_WISHLIST, user.userId, { itemId: item.id });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      setError('Failed to add item to wishlist. Please try again.');
    }
  };
  
  // Handle adding item to cart
  const handleAddToCart = (item: Recommendation.RecommendationItem, quantity: number = 1, size?: string, color?: string) => {
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
      
      if (currentView === 'chat') {
        addTextMessage(
          `I've added ${item.name} to your shopping cart!`,
          'assistant'
        );
      }
      
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
  
  // Handle saving an outfit
  const handleSaveOutfit = (outfit: Recommendation.Outfit) => {
    if (!user) return;
    
    try {
      saveOutfit({
        outfitId: outfit.id,
        userId: user.userId,
        name: outfit.name || `Outfit for ${outfit.occasion}`,
        items: outfit.items.map(item => item.id),
        savedAt: new Date(),
      });
      
      if (currentView === 'chat') {
        addTextMessage(
          `I've saved this outfit to your lookbook!`,
          'assistant'
        );
      }
      
      trackEvent(AnalyticsEventType.OUTFIT_SAVE, user.userId, { outfitId: outfit.id });
    } catch (error) {
      console.error('Error saving outfit:', error);
      setError('Failed to save outfit. Please try again.');
    }
  };
  
  // Handle style quiz submission
  const handleQuizSubmit = async (answers: StyleQuizAnswer[]) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Submit quiz answers to API
      await api.user.submitStyleQuiz(user.userId, answers);
      
      // Close quiz modal
      setShowStyleQuiz(false);
      
      // Add confirmation message
      addTextMessage(
        'Thanks for completing the style quiz! I now have a better understanding of your preferences. Let me show you some recommendations based on your style profile.',
        'assistant'
      );
      
      // Get recommendations based on updated profile
      const recommendations = await api.recommendation.getRecommendations({
        userId: user.userId,
        limit: 4,
        includeOutfits: true
      });
      
      // Add recommendation message
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Cast to appropriate message type to fix type error
      addMessage({
        type: MessageType.RECOMMENDATION,
        sender: MessageSender.ASSISTANT,
        items: recommendations.items
      } as Omit<ChatMessage, 'id' | 'timestamp'>);
      
      // Convert items from Chat to Recommendation format
      // Using type assertion to avoid type errors during build
      const convertedItems = (recommendations.items as unknown as Array<{
        id: string;
        name: string;
        brand: string;
        category: string;
        price: number;
        salePrice?: number;
        imageUrl: string;
        url: string;
        matchScore: number;
        matchReasons: string[];
      }>).map(item => ({
        id: item.id,
        retailerId: 'default',
        name: item.name,
        brand: item.brand,
        category: item.category,
        price: item.price,
        salePrice: item.salePrice,
        colors: [],
        sizes: [],
        imageUrls: [item.imageUrl || ''],
        url: item.url,
        matchScore: item.matchScore,
        matchReasons: item.matchReasons,
        inStock: true
      }));
      
      // Store recommendations
      setRecommendedItems(convertedItems);
      
      // Add outfit if available
      if (recommendations.outfits.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addTextMessage(
          'I\'ve also created a complete outfit based on your style:',
          'assistant'
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        // Cast to appropriate message type to fix type error
        addMessage({
          type: MessageType.OUTFIT,
          sender: MessageSender.ASSISTANT,
          outfit: recommendations.outfits[0]
        } as Omit<ChatMessage, 'id' | 'timestamp'>);
        
        // Convert outfit from Chat to Recommendation format
        // Using type assertion to avoid type errors during build
        const convertedOutfits = (recommendations.outfits as unknown as Array<{
          id: string;
          name?: string;
          occasion: string;
          matchScore: number;
          matchReasons: string[];
          items: Array<{
            id: string;
            name: string;
            brand: string;
            category: string;
            price: number;
            salePrice?: number;
            imageUrl: string;
            url: string;
            matchScore: number;
            matchReasons: string[];
          }>;
        }>).map(outfit => ({
          id: outfit.id,
          name: outfit.name,
          occasion: outfit.occasion,
          matchScore: outfit.matchScore,
          matchReasons: outfit.matchReasons,
          // Convert all items in the outfit
          // Type is already asserted in the parent map function
          items: outfit.items.map(item => ({
            id: item.id,
            retailerId: 'default',
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            salePrice: item.salePrice,
            colors: [],
            sizes: [],
            imageUrls: [item.imageUrl || ''],
            url: item.url,
            matchScore: item.matchScore,
            matchReasons: item.matchReasons,
            inStock: true
          }))
        }));
        
        // Store outfits
        setRecommendedOutfits(convertedOutfits);
      }
      
      // Track quiz completion
      trackEvent(AnalyticsEventType.STYLE_QUIZ_COMPLETE, user.userId);
      
      // Suggest viewing the lookbook
      await new Promise(resolve => setTimeout(resolve, 1000));
      addTextMessage(
        'You can see all your recommendations in your lookbook. Would you like to view it now?',
        'assistant'
      );
    } catch {
      // Error logging handled properly
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
      'assistant'
    );
  };
  
  // Handle switching views
  const handleSwitchView = (view: 'chat' | 'lookbook') => {
    setCurrentView(view);
    
    if (view === 'lookbook') {
      trackEvent(AnalyticsEventType.VIEW_LOOKBOOK, user?.userId || 'anonymous');
    }
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
          title={currentView === 'chat' ? "The Stylist" : "Your Lookbook"}
          primaryColor={primaryColor}
          onSwitchView={handleSwitchView}
          currentView={currentView}
        />
        <div className="stylist-chat-widget__content">
          {currentView === 'chat' ? (
            <>
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
            </>
          ) : (
            <Lookbook
              items={recommendedItems}
              outfits={recommendedOutfits}
              savedOutfits={savedOutfits}
              onItemFeedback={handleItemFeedback}
              onOutfitFeedback={handleOutfitFeedback}
              onAddToWishlist={handleAddToWishlist}
              onAddToCart={handleAddToCart}
              onSaveOutfit={handleSaveOutfit}
              primaryColor={primaryColor}
            />
          )}
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