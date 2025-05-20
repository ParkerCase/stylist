// src/components/ChatWidget/ChatWidget.tsx (enhanced implementation)

import React, { useEffect, useState, useCallback, lazy, useRef } from 'react';
import './ChatWidget.scss';
import ChatHeader from '@/components/ChatHeader';
import ChatBody from '@/components/ChatBody';
import ChatInput from '@/components/ChatInput';
import HomeButton from '@/components/HomeButton';
import TabNavigation, { TabId } from '@/components/TabNavigation';
import { useChatStore, useUserStore, useRecommendationStore } from '@/store/index';
import { useFeedbackStore } from '@/store/feedbackStore';
import { MessageSender, MessageType, StyleQuizAnswer, Recommendation, ChatMessage } from '@/types/index';
import { createStylistApi } from '@/api/index';
import { ChatService } from '@/services/chatService';
import { AnalyticsEventType, trackEvent } from '@/utils/analytics';
import { UserApi } from '@/api/userApi';
import { getUserId } from '@/utils/localStorage';
import AsyncComponentLoader from '@/components/common/AsyncComponentLoader';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TransitionSmoother from '@/components/common/TransitionSmoother';
import { USE_LAZY_LOADING, USE_PARALLEL_INIT } from '@/index';
import SuggestionGrid from '@/components/SuggestionGrid';

// Initialize widget lifecycle log
console.log('[LIFECYCLE:ChatWidget] Module load started');

// Import non-lazy versions for fallback
import TryOnModalRegular from '@/components/TryOnModal';
import StyleQuizModalRegular from '@/components/StyleQuiz/StyleQuizModal';
import LookbookRegular from '@/components/Lookbook';
import MyClosetRegular from '@/components/MyCloset';
import VirtualTryOnRegular from '@/components/VirtualTryOn';
import TrendingItemsRegular from '@/components/TrendingItems';
import SocialProofRegular from '@/components/SocialProof/SocialProofRenderer';

// Create lazy-loaded versions with fallbacks to non-lazy versions
const TryOnModalLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] TryOnModalLazy import starting');
  return import('@/components/TryOnModal')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] TryOnModalLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load TryOnModal component:', error);
      return { default: TryOnModalRegular };
    });
});

const StyleQuizModalLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] StyleQuizModalLazy import starting');
  return import('@/components/StyleQuiz/StyleQuizModal')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] StyleQuizModalLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load StyleQuizModal component:', error);
      return { default: StyleQuizModalRegular };
    });
});

const LookbookLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] LookbookLazy import starting');
  return import('@/components/Lookbook')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] LookbookLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load Lookbook component:', error);
      return { default: LookbookRegular };
    });
});

const MyClosetLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] MyClosetLazy import starting');
  return import('@/components/MyCloset')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] MyClosetLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load MyCloset component:', error);
      return { default: MyClosetRegular };
    });
});

const VirtualTryOnLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] VirtualTryOnLazy import starting');
  return import('@/components/VirtualTryOn')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] VirtualTryOnLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load VirtualTryOn component:', error);
      return { default: VirtualTryOnRegular };
    });
});

const TrendingItemsLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] TrendingItemsLazy import starting');
  return import('@/components/TrendingItems')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] TrendingItemsLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load TrendingItems component:', error);
      return { default: TrendingItemsRegular };
    });
});

const SocialProofLazy = lazy(() => {
  console.log('[LIFECYCLE:ChatWidget] SocialProofLazy import starting');
  return import('@/components/SocialProof/SocialProofRenderer')
    .then(module => {
      console.log('[LIFECYCLE:ChatWidget] SocialProofLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:ChatWidget] Failed to load SocialProof component:', error);
      return { default: SocialProofRegular };
    });
});

interface ChatWidgetProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
  onFirstPaint?: () => void;
  showDemoToggle?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  apiKey,
  retailerId,
  apiUrl,
  position = 'bottom-right',
  primaryColor = '#4361ee',
  greeting = "Hi there! I'm your AI style assistant. How can I help you today?",
  onFirstPaint,
  showDemoToggle = false
}) => {
  // Track initialization status with multiple safeguards
  const [initialized, setInitialized] = useState(false);
  const initializationAttemptedRef = useRef<boolean>(false);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [showStyleQuiz, setShowStyleQuiz] = useState(false);

  // Get state and actions from stores
  const {
    messages,
    isOpen,
    isMinimized,
    isLoading,
    currentView,
    addTextMessage,
    addMessage,
    setLoading,
    setError,
    setCurrentView
  } = useChatStore();
  
  // Extended state for tab-based navigation
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  
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
  
  // Use our feedback store for user feedback
  const { addMessageThumbsUp } = useFeedbackStore();
  
  // Create API client
  const api = createStylistApi({
    apiKey,
    retailerId,
    apiUrl
  });
  
  // Initialize user profile with useCallback to avoid dependency issues
  const initializeUser = useCallback(async () => {
    console.log('[LIFECYCLE:ChatWidget] initializeUser starting');
    try {
      // Show loading indicator
      setLoading(true);

      // Get user ID from localStorage or create a new one
      const userId = getUserId();
      console.log('[LIFECYCLE:ChatWidget] Got user ID:', userId);

      // Get or create user profile
      let userProfile;
      try {
        console.log('[LIFECYCLE:ChatWidget] Attempting to get existing user profile');
        // Try to get existing user profile
        userProfile = await api.user.getUserProfile(userId);
        console.log('[LIFECYCLE:ChatWidget] Found existing user profile');
      } catch (e) {
        console.log('[LIFECYCLE:ChatWidget] No existing profile found, creating new user');
        // Create a new user profile if not found
        userProfile = await api.user.createUser();
        console.log('[LIFECYCLE:ChatWidget] New user profile created');
      }

      // Store user profile in state
      console.log('[LIFECYCLE:ChatWidget] Setting user profile in store');
      setUser(userProfile);

      // Send greeting message
      if (greeting) {
        console.log('[LIFECYCLE:ChatWidget] Sending greeting message');
        addTextMessage(greeting, 'assistant');

        // Add follow-up message with options
        console.log('[LIFECYCLE:ChatWidget] Setting timeout for follow-up message (1200ms)');
        await new Promise(resolve => setTimeout(resolve, 1200));
        console.log('[LIFECYCLE:ChatWidget] Sending follow-up message');
        addTextMessage(
          "I can help you with:\n• Finding clothes that match your style\n• Creating complete outfits\n• Virtual try-ons\n\nTo get started, would you like to take our quick style quiz or see some recommended items?",
          'assistant'
        );
      }

      // Track widget open event
      console.log('[LIFECYCLE:ChatWidget] Tracking widget open event');
      trackEvent(AnalyticsEventType.WIDGET_OPEN, userProfile.userId);

      // For optimized initialization, we'll defer recommendation fetching until after first paint
      if (USE_PARALLEL_INIT) {
        console.log('[LIFECYCLE:ChatWidget] Using parallel init, fetching recommendations immediately');
        // Original behavior: fetch immediately
        await fetchInitialRecommendations(userProfile.userId);
      } else {
        console.log('[LIFECYCLE:ChatWidget] Using optimized init, deferring recommendation fetch');
        // Optimized behavior: record initialization data for later
        // Use type assertion to ensure TypeScript is happy
        window.__STYLIST_PENDING_INITIALIZATIONS = {
          ...(window.__STYLIST_PENDING_INITIALIZATIONS || {}),
          recommendations: {
            userId: userProfile.userId
          }
        } as NonNullable<typeof window.__STYLIST_PENDING_INITIALIZATIONS>;
      }
      console.log('[LIFECYCLE:ChatWidget] initializeUser completed successfully');
    } catch (error) {
      console.error('[LIFECYCLE:ChatWidget] Error initializing user:', error);
      setError('Sorry, I had trouble connecting. Please try again later.');
      addTextMessage(
        'Sorry, I had trouble connecting. Please try again later.',
        'system'
      );
    } finally {
      setLoading(false);
      console.log('[LIFECYCLE:ChatWidget] initializeUser finished (loading set to false)');
    }
  }, [api, greeting, addTextMessage, setUser, setLoading, setError]);

  // Separated recommendation fetching into its own function for deferred execution
  const fetchInitialRecommendations = async (userId: string) => {
    console.log('[LIFECYCLE:ChatWidget] fetchInitialRecommendations starting for user:', userId);

    if (recommendedItems.length > 0) {
      console.log('[LIFECYCLE:ChatWidget] Skipping recommendation fetch - items already loaded');
      return; // Skip if we already have items
    }

    try {
      console.log('[LIFECYCLE:ChatWidget] Fetching recommendations from API');
      const recommendations = await api.recommendation.getRecommendations({
        userId,
        limit: 6
      });
      console.log('[LIFECYCLE:ChatWidget] Recommendations received:',
        recommendations.items?.length || 0, 'items',
        recommendations.outfits?.length || 0, 'outfits');

      // Convert items to proper format
      console.log('[LIFECYCLE:ChatWidget] Converting recommendation items to proper format');
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

      console.log('[LIFECYCLE:ChatWidget] Setting recommendedItems in store');
      setRecommendedItems(convertedItems);

      // Convert outfits if available
      if (recommendations.outfits && recommendations.outfits.length > 0) {
        console.log('[LIFECYCLE:ChatWidget] Converting recommendation outfits to proper format');
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

        console.log('[LIFECYCLE:ChatWidget] Setting recommendedOutfits in store');
        setRecommendedOutfits(convertedOutfits);
      }

      console.log('[LIFECYCLE:ChatWidget] fetchInitialRecommendations completed successfully');
    } catch (error) {
      console.error('[LIFECYCLE:ChatWidget] Error fetching initial recommendations:', error);
      // Silently fail - we'll show recommendations when the user asks for them
    }
  };
  
  // Flag to track if first paint was registered
  const [hasRegisteredFirstPaint, setHasRegisteredFirstPaint] = useState(false);
  const firstPaintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFiredFirstPaintRef = useRef<boolean>(false);

  // Initialize user and send greeting, with additional safeguards
  useEffect(() => {
    console.log('[LIFECYCLE:ChatWidget] Initialization effect running', {
      initialized,
      globallyInitialized: window.__STYLIST_CHAT_INITIALIZED === true,
      attemptedRef: initializationAttemptedRef.current
    });

    // Global/window initialization check
    const isGloballyInitialized = window.__STYLIST_CHAT_INITIALIZED === true;

    // Skip if either local or global init has happened
    if (initialized || isGloballyInitialized || initializationAttemptedRef.current) {
      console.log('[LIFECYCLE:ChatWidget] Initialization skipped - already initialized');
      return;
    }

    // Mark initialization attempted BEFORE async operation
    initializationAttemptedRef.current = true;
    console.log('[LIFECYCLE:ChatWidget] Starting user initialization');

    // Mark as globally initialized to prevent duplicate initialization
    window.__STYLIST_CHAT_INITIALIZED = true;

    // Set a safety timeout to ensure widget doesn't get stuck if initialization hangs
    console.log('[LIFECYCLE:ChatWidget] Setting initialization safety timeout (10s)');
    const safetyTimeout = setTimeout(() => {
      if (!initialized) {
        console.warn('[LIFECYCLE:ChatWidget] Initialization timed out after 10s, forcing completion');
        setInitialized(true);
      }
    }, 10000); // 10 second safety timeout

    // Run initialization and update state
    console.log('[LIFECYCLE:ChatWidget] Calling initializeUser()');
    initializeUser().then(() => {
      clearTimeout(safetyTimeout);
      console.log('[LIFECYCLE:ChatWidget] initializeUser resolved successfully');
      setInitialized(true);
      console.log('[LIFECYCLE:ChatWidget] Initialization marked as complete');

      // After initialization is complete, set up the first paint timer
      // This ensures first paint event happens after base UI renders
      if (!USE_PARALLEL_INIT && !hasFiredFirstPaintRef.current) {
        console.log('[LIFECYCLE:ChatWidget] Setting up first paint timer (100ms)');
        firstPaintTimeoutRef.current = setTimeout(() => {
          if (!hasFiredFirstPaintRef.current) {
            console.log('[LIFECYCLE:ChatWidget] First paint timer fired, triggering callback');
            // Trigger first paint event
            triggerFirstPaint();
          }
        }, 100); // Short timeout to allow render to complete
      }
    }).catch(error => {
      clearTimeout(safetyTimeout);
      console.error('[LIFECYCLE:ChatWidget] Initialization error:', error);
      // Still mark as initialized to prevent retry loops
      setInitialized(true);
      console.log('[LIFECYCLE:ChatWidget] Initialization marked as complete despite error');
    });

    // Clean up timeout if component unmounts
    return () => {
      console.log('[LIFECYCLE:ChatWidget] Cleaning up initialization timeouts');
      clearTimeout(safetyTimeout);
      if (firstPaintTimeoutRef.current) {
        clearTimeout(firstPaintTimeoutRef.current);
      }
    };
  }, [initialized, initializeUser]);

  // Function to trigger first paint event and load background items
  const triggerFirstPaint = () => {
    console.log('[LIFECYCLE:ChatWidget] triggerFirstPaint called', {
      alreadyFired: hasFiredFirstPaintRef.current
    });

    if (hasFiredFirstPaintRef.current) {
      console.log('[LIFECYCLE:ChatWidget] First paint already triggered, skipping');
      return;
    }

    console.log('[LIFECYCLE:ChatWidget] Marking first paint as fired');
    hasFiredFirstPaintRef.current = true;
    setHasRegisteredFirstPaint(true);

    // Call the callback if available
    if (typeof onFirstPaint === 'function') {
      console.log('[LIFECYCLE:ChatWidget] Calling onFirstPaint callback');
      onFirstPaint();
    }

    // If we're in optimized initialization mode, start background tasks
    if (!USE_PARALLEL_INIT && window.__STYLIST_PENDING_INITIALIZATIONS) {
      console.log('[LIFECYCLE:ChatWidget] Using optimized init, checking for pending initializations');

      // Load recommendations in background after short delay
      if (window.__STYLIST_PENDING_INITIALIZATIONS?.recommendations) {
        const { userId } = window.__STYLIST_PENDING_INITIALIZATIONS.recommendations;
        console.log('[LIFECYCLE:ChatWidget] Setting timeout for background recommendation fetch (1.5s)');

        setTimeout(() => {
          console.log('[LIFECYCLE:ChatWidget] Background recommendation timeout fired');
          fetchInitialRecommendations(userId);
        }, 1500); // 1.5s delay to ensure UI is responsive
      }

      // Add any other background tasks here
    } else {
      console.log('[LIFECYCLE:ChatWidget] No pending initializations to process');
    }
  };
  
  // Check for global flags and handle events for the widget
  useEffect(() => {
    console.log('[LIFECYCLE:ChatWidget] Global flags and events effect running');

    // Function to handle style quiz opening
    const handleStyleQuizOpen = () => {
      console.log('[LIFECYCLE:ChatWidget] Opening style quiz via global flag or event');
      setShowStyleQuiz(true);
    };

    // Function to handle virtual try-on opening
    const handleVirtualTryOnOpen = () => {
      console.log('[LIFECYCLE:ChatWidget] Virtual try-on opening requested');

      // Open the try-on modal
      if (recommendedItems.length > 0) {
        console.log('[LIFECYCLE:ChatWidget] Recommended items available for try-on:', recommendedItems.length);
        // Auto-select the first item for try-on
        const item = recommendedItems[0];
        try {
          // Open try-on modal with the first item
          console.log('[LIFECYCLE:ChatWidget] Opening try-on with item:', item.id);
          addTextMessage(
            `Let's see how ${item.name} looks on you!`,
            'assistant'
          );
        } catch (error) {
          console.error('[LIFECYCLE:ChatWidget] Error opening virtual try-on:', error);
        }
      } else {
        console.log('[LIFECYCLE:ChatWidget] Cannot open virtual try-on - no recommended items available');
      }
    };

    // Initial check for global flags on component mount
    console.log('[LIFECYCLE:ChatWidget] Checking for global style quiz flag:', !!(window as any).__StylistShowStyleQuiz);
    if ((window as any).__StylistShowStyleQuiz) {
      handleStyleQuizOpen();
      // Don't reset the flag, it could be needed by other components
    }

    console.log('[LIFECYCLE:ChatWidget] Checking for global try-on flag:', !!(window as any).__StylistShowVirtualTryOn);
    if ((window as any).__StylistShowVirtualTryOn) {
      handleVirtualTryOnOpen();
      // Don't reset the flag, it could be needed by other components
    }

    // Set up event listeners if the event system is available
    const hasEvents = !!(window as any).__StylistWidgetEvents;
    console.log('[LIFECYCLE:ChatWidget] Checking for widget events:', hasEvents);

    if (hasEvents) {
      console.log('[LIFECYCLE:ChatWidget] Setting up event listeners');
      (window as any).__StylistWidgetEvents.on('styleQuiz:open', handleStyleQuizOpen);
      (window as any).__StylistWidgetEvents.on('virtualTryOn:open', handleVirtualTryOnOpen);

      // Clean up on unmount
      return () => {
        console.log('[LIFECYCLE:ChatWidget] Removing event listeners');
        (window as any).__StylistWidgetEvents.off('styleQuiz:open', handleStyleQuizOpen);
        (window as any).__StylistWidgetEvents.off('virtualTryOn:open', handleVirtualTryOnOpen);
      };
    }
  }, [recommendedItems, addTextMessage]);
  
  // Initialize chat service when user is loaded
  useEffect(() => {
    console.log('[LIFECYCLE:ChatWidget] Chat service initialization effect running', {
      userExists: !!user,
      apiExists: !!api
    });

    if (user && api) {
      console.log('[LIFECYCLE:ChatWidget] Creating chat service for user:', user.userId);
      // Pass userApi as the third parameter for enhanced context awareness
      setChatService(new ChatService(api.recommendation, user.userId, api.user as UserApi));
      console.log('[LIFECYCLE:ChatWidget] Chat service created with enhanced context awareness');
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
      // Track quiz start event
      if (user) {
        trackEvent(AnalyticsEventType.STYLE_QUIZ_START, user.userId);
      }
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

  // Handle image upload for finding similar items
  const handleImageUpload = async (file: File) => {
    if (!user || !chatService) return;

    // Start loading state
    setLoading(true);

    try {
      // Track image upload event
      trackEvent(AnalyticsEventType.IMAGE_UPLOAD, user.userId);

      // Process the image with chat service
      const responses = await chatService.processImageUpload(file);

      // Add responses to the chat
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
          // Convert and store recommendations
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
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : String(error));
      addTextMessage(
        'Sorry, I encountered an error while processing your image. Please try again.',
        'system'
      );
    } finally {
      // End loading state
      setLoading(false);
    }
  };

  // Handle URL input for specific product lookup
  const handleURLSubmit = async (url: string) => {
    if (!user || !chatService) return;

    // Start loading state
    setLoading(true);

    try {
      // Track URL input event
      trackEvent(AnalyticsEventType.URL_INPUT, user.userId, { url });

      // Process the URL with chat service
      const responses = await chatService.processURLInput(url);

      // Add responses to the chat
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
          // Convert and store recommendations
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
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      setError(error instanceof Error ? error.message : String(error));
      addTextMessage(
        'Sorry, I encountered an error while processing your URL. Please try again.',
        'system'
      );
    } finally {
      // End loading state
      setLoading(false);
    }
  };

  // Handle voice input (currently just tracks event)
  const handleVoiceInput = () => {
    if (user) {
      trackEvent(AnalyticsEventType.VOICE_INPUT, user.userId);
      // Voice input is handled by the ChatInput component itself,
      // this function is just for tracking and potential future enhancement
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
  
  // Handle assistant message feedback (thumbs up)
  const handleMessageFeedback = async (messageId: string, helpful: boolean) => {
    if (!user || !helpful) return; // We only handle "helpful" feedback for now
    
    try {
      // Add to feedback store
      addMessageThumbsUp(messageId);
      
      // Track the event
      trackEvent(
        AnalyticsEventType.MESSAGE_THUMBS_UP,
        user.userId,
        { messageId }
      );
      
      // You could also send this feedback to the backend if needed
      // await api.recommendation.addMessageFeedback({
      //   userId: user.userId,
      //   messageId,
      //   helpful,
      //   timestamp: new Date()
      // });
      
      // No response needed as the thumbs up component will show its own feedback
    } catch (error) {
      console.error('Error saving message feedback:', error);
      // Silently fail - local storage will still have the feedback
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
      // Add to cart in state
      addToCart({
        itemId: item.id,
        retailerId,
        quantity,
        size,
        color,
        addedAt: new Date()
      });
      
      // Track purchase for bot-driven sales analytics
      import('@/services/purchaseTrackingService').then(({ purchaseTrackingService }) => {
        purchaseTrackingService.trackPurchase({
          productId: item.id,
          source: 'StylistBot',
          timestamp: new Date(),
          userId: user.userId,
          retailerId
        });
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
      
      // Check if all questions have been answered
      const TOTAL_QUESTIONS = 25; // We have 25 questions in our quiz
      if (answers.length < TOTAL_QUESTIONS) {
        // There are unanswered questions
        const answeredQuestionIds = answers.map(a => a.questionId);
        const unansweredQuestions = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => `q${i + 1}`)
          .filter(qId => !answeredQuestionIds.includes(qId));
        
        // Show warning but allow submission
        console.warn(`Some questions are unanswered: ${unansweredQuestions.join(', ')}`);
        
        // We'll proceed anyway, but log the warning
        trackEvent(AnalyticsEventType.STYLE_QUIZ_PARTIAL, user.userId, { 
          unansweredCount: unansweredQuestions.length 
        });
      }
      
      // Clear any saved progress from local storage
      try {
        localStorage.removeItem('stylist_quiz_progress_style-quiz-1');
      } catch (e) {
        console.error('Error clearing quiz progress:', e);
      }
      
      // Submit quiz answers to API
      try {
        await api.user.submitStyleQuiz(user.userId, answers);
      } catch (error) {
        console.error('Error submitting style quiz:', error);
        // Show error but don't return yet - we have fallback behavior
        setError('There was an issue saving your style preferences, but we can still provide recommendations.');
      }
      
      // Close quiz modal
      setShowStyleQuiz(false);
      
      // Add confirmation message
      addTextMessage(
        'Thanks for completing the style quiz! I now have a better understanding of your preferences. Let me show you some recommendations based on your style profile.',
        'assistant'
      );
      
      // Get recommendations based on updated profile
      let recommendations;
      try {
        recommendations = await api.recommendation.getRecommendations({
          userId: user.userId,
          limit: 4,
          includeOutfits: true
        });
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Sorry, there was an issue getting your personalized recommendations.');
        setLoading(false);
        return;
      }
      
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
      if (recommendations.outfits && recommendations.outfits.length > 0) {
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
    } catch (error) {
      console.error('Unexpected error processing quiz:', error);
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
  
  // Handle switching views (legacy function, used for compatibility)
  const handleSwitchView = (view: 'chat' | 'lookbook') => {
    // Use the store's setCurrentView instead of local state
    setCurrentView(view);
    
    // Update the active tab to match the view
    setActiveTab(view as TabId);
    
    if (view === 'lookbook') {
      trackEvent(AnalyticsEventType.VIEW_LOOKBOOK, user?.userId || 'anonymous');
    }
  };
  
  // Handle tab change in the new navigation system
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    
    // For backward compatibility - update currentView for chat and lookbook
    if (tabId === 'chat' || tabId === 'lookbook') {
      setCurrentView(tabId);
    }
    
    // Track analytics for tab changes
    const analyticsMap: { [key in TabId]?: AnalyticsEventType } = {
      'lookbook': AnalyticsEventType.VIEW_LOOKBOOK,
      'myCloset': AnalyticsEventType.VIEW_MY_CLOSET,
      'tryOn': AnalyticsEventType.VIEW_VIRTUAL_TRY_ON,
      'social': AnalyticsEventType.VIEW_SOCIAL_PROOF,
      'trending': AnalyticsEventType.VIEW_TRENDING_ITEMS
    };
    
    if (analyticsMap[tabId] && user) {
      trackEvent(analyticsMap[tabId], user.userId);
    }
  };
  
  // Widget position classes
  const positionClasses = {
    'bottom-right': 'stylist-chat-widget--bottom-right',
    'bottom-left': 'stylist-chat-widget--bottom-left',
    'top-right': 'stylist-chat-widget--top-right',
    'top-left': 'stylist-chat-widget--top-left'
  };
  
  // Get appropriate title for the current tab
  const getTitleForTab = (tabId: TabId): string => {
    const titleMap: { [key in TabId]: string } = {
      'chat': 'The Stylist',
      'lookbook': 'Your Lookbook',
      'myCloset': 'My Wardrobe',
      'tryOn': 'Virtual Try-On',
      'social': 'Celebrity Styles',
      'trending': 'Trending Items'
    };
    
    return titleMap[tabId] || 'The Stylist';
  };
  
  // Add state for loading suggestions
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Handler for manual suggestion generation
  const handleGenerateSuggestions = async () => {
    if (!user) return;
    setIsGeneratingSuggestions(true);
    try {
      await fetchInitialRecommendations(user.userId);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  if (!isOpen) return null;
  
  const widgetClasses = `stylist-chat-widget ${positionClasses[position]} ${isMinimized ? 'stylist-chat-widget--minimized' : ''}`;
  
  // Determine if we should show the non-essential components based on init strategy
  const shouldRenderNonEssentialComponents = () => {
    // In parallel init mode (original), always render everything
    if (USE_PARALLEL_INIT) {
      return true;
    }

    // In optimized mode, only render after first paint is registered
    return hasRegisteredFirstPaint || hasFiredFirstPaintRef.current;
  };

  // Use React.useEffect with an empty dependency array to trigger first paint
  // This will run after the component has rendered once
  useEffect(() => {
    // If no first paint callback has been triggered yet, trigger it now
    if (!USE_PARALLEL_INIT && !hasFiredFirstPaintRef.current) {
      // Very short timeout to ensure we trigger after paint
      setTimeout(triggerFirstPaint, 0);
    }
  }, []);

  return (
    <>
      <div className={widgetClasses} data-testid="stylist-chat-widget">
        <ChatHeader
          title={getTitleForTab(activeTab)}
          primaryColor={primaryColor}
          onSwitchView={handleSwitchView}
          currentView={currentView}
          showDemoToggle={showDemoToggle}
          activeTab={activeTab}
        />
        
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          primaryColor={primaryColor}
          enabledFeatures={{
            chat: true,
            recommendations: true,
            lookbook: true,
            myCloset: true,
            tryOn: true,
            social: true,
            trending: true
          }}
        />
        
        <HomeButton
          onClick={() => handleTabChange('chat')}
          primaryColor={primaryColor}
        />
        
        <div className="stylist-chat-widget__content">
          {/* Chat View */}
          <TransitionSmoother
            show={activeTab === 'chat'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            <ErrorBoundary
              fallback={
                <div className="stylist-error-container">
                  <h3>Chat Body Error</h3>
                  <p>Failed to load chat messages.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="stylist-error-retry-button"
                  >
                    Reload
                  </button>
                </div>
              }
            >
              <ChatBody
                messages={messages}
                onItemFeedback={handleItemFeedback}
                onOutfitFeedback={handleOutfitFeedback}
                onMessageFeedback={handleMessageFeedback}
                onAddToWishlist={handleAddToWishlist}
                onAddToCart={handleAddToCart}
                isLoading={isLoading}
                primaryColor={primaryColor}
              />
            </ErrorBoundary>
            <ErrorBoundary
              fallback={
                <div className="stylist-chat-input-error">
                  <p>Failed to load chat input.</p>
                </div>
              }
            >
              <ChatInput
                onSendMessage={handleSendMessage}
                onImageUpload={handleImageUpload}
                onURLSubmit={handleURLSubmit}
                onVoiceInput={handleVoiceInput}
                placeholder="Type your question here..."
                disabled={isLoading}
                primaryColor={primaryColor}
              />
            </ErrorBoundary>
          </TransitionSmoother>
          
          {/* Lookbook View */}
          <TransitionSmoother
            show={activeTab === 'lookbook'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            {shouldRenderNonEssentialComponents() ? (
              <>
                <React.Suspense fallback={
                  <div className="stylist-loading-container">
                    <div className="stylist-loading-spinner"></div>
                    <p>Loading lookbook...</p>
                  </div>
                }>
                  <ErrorBoundary
                    fallback={
                      <div className="stylist-error-container">
                        <h3>Lookbook Error</h3>
                        <p>Failed to load your lookbook.</p>
                        <button
                          onClick={() => handleTabChange('chat')}
                          className="stylist-error-retry-button"
                        >
                          Return to Chat
                        </button>
                      </div>
                    }
                  >
                    {USE_LAZY_LOADING ? (
                      <LookbookLazy
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
                    ) : (
                      <LookbookRegular
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
                  </ErrorBoundary>
                </React.Suspense>
              </>
            ) : (
              <div className="stylist-chat-widget__loading">
                <p>Initializing lookbook...</p>
              </div>
            )}
          </TransitionSmoother>
          
          {/* My Closet View */}
          <TransitionSmoother
            show={activeTab === 'myCloset'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            {shouldRenderNonEssentialComponents() ? (
              <>
                <React.Suspense fallback={
                  <div className="stylist-loading-container">
                    <div className="stylist-loading-spinner"></div>
                    <p>Loading my closet...</p>
                  </div>
                }>
                  <ErrorBoundary
                    fallback={
                      <div className="stylist-error-container">
                        <h3>My Closet Error</h3>
                        <p>Failed to load your closet.</p>
                        <button
                          onClick={() => handleTabChange('chat')}
                          className="stylist-error-retry-button"
                        >
                          Return to Chat
                        </button>
                      </div>
                    }
                  >
                    {USE_LAZY_LOADING ? (
                      <MyClosetLazy
                        onSelectItem={(item) => {
                          // Handle item selection
                          handleTabChange('chat');
                          addTextMessage(`I'd like to know more about this ${item.category} in my closet.`, 'user');
                        }}
                      />
                    ) : (
                      <MyClosetRegular
                        onSelectItem={(item) => {
                          // Handle item selection
                          handleTabChange('chat');
                          addTextMessage(`I'd like to know more about this ${item.category} in my closet.`, 'user');
                        }}
                      />
                    )}
                  </ErrorBoundary>
                </React.Suspense>
              </>
            ) : (
              <div className="stylist-chat-widget__loading">
                <p>Initializing my closet...</p>
              </div>
            )}
          </TransitionSmoother>
          
          {/* Virtual Try-On View */}
          <TransitionSmoother
            show={activeTab === 'tryOn'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            {shouldRenderNonEssentialComponents() ? (
              <>
                <React.Suspense fallback={
                  <div className="stylist-loading-container">
                    <div className="stylist-loading-spinner"></div>
                    <p>Loading virtual try-on...</p>
                  </div>
                }>
                  <ErrorBoundary
                    fallback={
                      <div className="stylist-error-container">
                        <h3>Virtual Try-On Error</h3>
                        <p>Failed to load virtual try-on.</p>
                        <button
                          onClick={() => handleTabChange('chat')}
                          className="stylist-error-retry-button"
                        >
                          Return to Chat
                        </button>
                      </div>
                    }
                  >
                    {USE_LAZY_LOADING ? (
                      <VirtualTryOnLazy
                        onClose={() => handleTabChange('chat')}
                        onSave={handleTryOnSave}
                        primaryColor={primaryColor}
                      />
                    ) : (
                      <VirtualTryOnRegular
                        onClose={() => handleTabChange('chat')}
                        onSave={handleTryOnSave}
                        primaryColor={primaryColor}
                      />
                    )}
                  </ErrorBoundary>
                </React.Suspense>
              </>
            ) : (
              <div className="stylist-chat-widget__loading">
                <p>Initializing virtual try-on...</p>
              </div>
            )}
          </TransitionSmoother>
          
          {/* Social Proof View */}
          <TransitionSmoother
            show={activeTab === 'social'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            {shouldRenderNonEssentialComponents() ? (
              <>
                <React.Suspense fallback={
                  <div className="stylist-loading-container">
                    <div className="stylist-loading-spinner"></div>
                    <p>Loading celebrity styles...</p>
                  </div>
                }>
                  <ErrorBoundary
                    fallback={
                      <div className="stylist-error-container">
                        <h3>Celebrity Styles Error</h3>
                        <p>Failed to load celebrity styles.</p>
                        <button
                          onClick={() => handleTabChange('chat')}
                          className="stylist-error-retry-button"
                        >
                          Return to Chat
                        </button>
                      </div>
                    }
                  >
                    {USE_LAZY_LOADING ? (
                      <SocialProofLazy
                        items={[]}  // Should be populated with real data
                        onItemFeedback={handleItemFeedback}
                        onAddToWishlist={handleAddToWishlist}
                        onAddToCart={handleAddToCart}
                        primaryColor={primaryColor}
                        isExpanded={true}
                      />
                    ) : (
                      <SocialProofRegular
                        items={[]}  // Should be populated with real data
                        onItemFeedback={handleItemFeedback}
                        onAddToWishlist={handleAddToWishlist}
                        onAddToCart={handleAddToCart}
                        primaryColor={primaryColor}
                        isExpanded={true}
                      />
                    )}
                  </ErrorBoundary>
                </React.Suspense>
              </>
            ) : (
              <div className="stylist-chat-widget__loading">
                <p>Initializing celebrity styles...</p>
              </div>
            )}
          </TransitionSmoother>
          
          {/* Trending Items View */}
          <TransitionSmoother
            show={activeTab === 'trending'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            {shouldRenderNonEssentialComponents() ? (
              <>
                <React.Suspense fallback={
                  <div className="stylist-loading-container">
                    <div className="stylist-loading-spinner"></div>
                    <p>Loading trending items...</p>
                  </div>
                }>
                  <ErrorBoundary
                    fallback={
                      <div className="stylist-error-container">
                        <h3>Trending Items Error</h3>
                        <p>Failed to load trending items.</p>
                        <button
                          onClick={() => handleTabChange('chat')}
                          className="stylist-error-retry-button"
                        >
                          Return to Chat
                        </button>
                      </div>
                    }
                  >
                    {USE_LAZY_LOADING ? (
                      <TrendingItemsLazy
                        apiKey={apiKey}
                        retailerId={retailerId}
                        apiUrl={apiUrl}
                        onItemFeedback={handleItemFeedback}
                        onAddToWishlist={handleAddToWishlist}
                        onAddToCart={handleAddToCart}
                        primaryColor={primaryColor}
                      />
                    ) : (
                      <TrendingItemsRegular
                        apiKey={apiKey}
                        retailerId={retailerId}
                        apiUrl={apiUrl}
                        onItemFeedback={handleItemFeedback}
                        onAddToWishlist={handleAddToWishlist}
                        onAddToCart={handleAddToCart}
                        primaryColor={primaryColor}
                      />
                    )}
                  </ErrorBoundary>
                </React.Suspense>
              </>
            ) : (
              <div className="stylist-chat-widget__loading">
                <p>Initializing trending items...</p>
              </div>
            )}
          </TransitionSmoother>
          
          {/* Suggestions View */}
          <TransitionSmoother
            show={activeTab === 'recommendations'}
            type="fade"
            duration={300}
            className="stylist-chat-widget__view"
          >
            <>
              {shouldRenderNonEssentialComponents() ? (
                <SuggestionGrid
                  items={recommendedItems}
                  onItemFeedback={handleItemFeedback}
                  onAddToWishlist={handleAddToWishlist}
                  onAddToCart={handleAddToCart}
                  onItemClick={undefined}
                  primaryColor={primaryColor}
                  onGenerate={handleGenerateSuggestions}
                  isLoading={isGeneratingSuggestions}
                />
              ) : (
                <div className="stylist-chat-widget__loading">
                  <p>Loading suggestions...</p>
                </div>
              )}
            </>
          </TransitionSmoother>
        </div>
      </div>

      {/* Only render non-essential components after first paint in optimized mode */}
      {console.log('[LIFECYCLE:ChatWidget] Checking if non-essential components should render:', shouldRenderNonEssentialComponents())}
      {shouldRenderNonEssentialComponents() && (
        <>
          {/* Virtual Try-On Modal */}
          {console.log('[LIFECYCLE:ChatWidget] Rendering TryOnModal with AsyncComponentLoader')}
          <React.Suspense fallback={
  <div className="stylist-loading-container">
    <div className="stylist-loading-spinner"></div>
    <p>Loading virtual try-on...</p>
  </div>
}>
  <AsyncComponentLoader
    loadingMessage="Loading virtual try-on..."
    onLoadStart={() => console.log('[LIFECYCLE:ChatWidget] TryOnModal loader starting')}
    onLoadComplete={() => console.log('[LIFECYCLE:ChatWidget] TryOnModal loader completed')}
    onLoadError={(error) => console.error('[LIFECYCLE:ChatWidget] TryOnModal loading error:', error)}
  >
    {(() => {
      console.log('[LIFECYCLE:ChatWidget] Before TryOnModal render');
      return null;
    })()}
    {USE_LAZY_LOADING ? (
      <TryOnModalLazy onSave={handleTryOnSave} />
    ) : (
      <TryOnModalRegular onSave={handleTryOnSave} />
    )}
    {(() => {
      console.log('[LIFECYCLE:ChatWidget] After TryOnModal render');
      return null;
    })()}
  </AsyncComponentLoader>
</React.Suspense>

          {/* Style Quiz Modal */}
          {(() => {
            console.log('[LIFECYCLE:ChatWidget] Checking if StyleQuizModal should render:', showStyleQuiz);
            return null;
          })()}
          {showStyleQuiz && (
            <>
              {(() => {
                console.log('[LIFECYCLE:ChatWidget] Rendering StyleQuizModal with AsyncComponentLoader');
                return null;
              })()}
              <React.Suspense fallback={
  <div className="stylist-loading-container">
    <div className="stylist-loading-spinner"></div>
    <p>Loading style quiz...</p>
  </div>
}>
  <AsyncComponentLoader
    loadingMessage="Loading style quiz..."
    onLoadStart={() => console.log('[LIFECYCLE:ChatWidget] StyleQuizModal loader starting')}
    onLoadComplete={() => console.log('[LIFECYCLE:ChatWidget] StyleQuizModal loader completed')}
    onLoadError={(error) => console.error('[LIFECYCLE:ChatWidget] StyleQuizModal loading error:', error)}
  >
    {(() => {
      console.log('[LIFECYCLE:ChatWidget] Before StyleQuizModal render');
      return null;
    })()}
    {USE_LAZY_LOADING ? (
      <StyleQuizModalLazy
        onSubmit={handleQuizSubmit}
        onClose={() => setShowStyleQuiz(false)}
        primaryColor={primaryColor}
      />
    ) : (
      <StyleQuizModalRegular
        onSubmit={handleQuizSubmit}
        onClose={() => setShowStyleQuiz(false)}
        primaryColor={primaryColor}
      />
    )}
    {(() => {
      console.log('[LIFECYCLE:ChatWidget] After StyleQuizModal render');
      return null;
    })()}
  </AsyncComponentLoader>
</React.Suspense>
            </>
          )}
        </>
      )}
    </>
  );
};

// Add global type definition
declare global {
  interface Window {
    __STYLIST_CHAT_INITIALIZED?: boolean;
    // Note: __STYLIST_PENDING_INITIALIZATIONS and __STYLIST_BACKGROUND_INIT_COMPLETE
    // are already declared in index.tsx to ensure consistent type definitions
  }
}

export default ChatWidget;