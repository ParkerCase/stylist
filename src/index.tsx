// Main entry point for the widget

import React from 'react';
import { createRoot } from 'react-dom/client';
import StylistWidget from './StylistWidget';
import { useChatStore, useRecommendationStore, useUserStore } from './store/index';
import { RecommendationItem, Outfit, StylistWidgetAPI, StylistWidgetConfig } from './types/index';
import {
  logGlobalFlag,
  logComponentRender,
  logStore,
  logPerformance,
  LogLevel,
  LogEntryType
} from './diagnostics';
import { monitorExistingStore } from './storeMonitor';

// Feature flag for lazy loading - set to true to enable lazy loading
export const USE_LAZY_LOADING = true;

// Feature flag for controlling parallel vs sequential initialization
// Set to false for optimized background initialization (better performance)
export const USE_PARALLEL_INIT = false;

// Create safe store selectors that won't crash if the store isn't initialized
const getSafeStoreValue = <T, >(store: any, selector: (state: any) => T, defaultValue: T): T => {
  try {
    // First check if store exists and has getState method
    if (store && typeof store.getState === 'function') {
      const state = store.getState();
      // Then check if selector can be safely applied
      return selector(state) ?? defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.warn('Error accessing store:', error);
    return defaultValue;
  }
};

// Initialize stores early to prevent race conditions
// This ensures stores are ready before any UI renders
const initializeStores = () => {
  try {
    // Prevent duplicate initialization
    if ((window as any).__STYLIST_STORES_INITIALIZING) {
      console.log('Store initialization already in progress, skipping');
      logStore('global', 'init', 'Store initialization already in progress, skipping');
      return false;
    }

    // Performance tracking for store initialization
    const initStartTime = performance.now();
    logPerformance('storeInitialization:start', 0, { phase: 'start' });

    // Set initializing flag to prevent concurrent initialization
    (window as any).__STYLIST_STORES_INITIALIZING = true;
    logGlobalFlag('__STYLIST_STORES_INITIALIZING', true, 'Setting store initialization flag');

    // Touch each store to initialize it - with proper error handling for each
    try {
      const chatInitialState = useChatStore.getState();
      console.log('Chat store initialized');

      // Monitor the chat store
      monitorExistingStore('chatStore', useChatStore);

      logStore('chatStore', 'init', 'Chat store successfully initialized', {
        isOpen: chatInitialState.isOpen,
        hasMessages: chatInitialState.messages.length > 0,
        currentView: chatInitialState.currentView
      });
    } catch (e) {
      console.error('Failed to initialize chat store:', e);
      logStore('chatStore', 'init', 'Failed to initialize chat store', {
        error: e instanceof Error ? e.message : String(e)
      });
    }

    try {
      const userInitialState = useUserStore.getState();
      console.log('User store initialized');

      // Monitor the user store
      monitorExistingStore('userStore', useUserStore);

      logStore('userStore', 'init', 'User store successfully initialized', {
        hasUser: !!userInitialState.user
      });
    } catch (e) {
      console.error('Failed to initialize user store:', e);
      logStore('userStore', 'init', 'Failed to initialize user store', {
        error: e instanceof Error ? e.message : String(e)
      });
    }

    try {
      const recInitialState = useRecommendationStore.getState();
      console.log('Recommendation store initialized');

      // Monitor the recommendation store
      monitorExistingStore('recommendationStore', useRecommendationStore);

      logStore('recommendationStore', 'init', 'Recommendation store successfully initialized', {
        itemCount: recInitialState.recommendedItems.length,
        outfitCount: recInitialState.recommendedOutfits.length
      });
    } catch (e) {
      console.error('Failed to initialize recommendation store:', e);
      logStore('recommendationStore', 'init', 'Failed to initialize recommendation store', {
        error: e instanceof Error ? e.message : String(e)
      });
    }

    // Performance tracking for completion
    const initDuration = performance.now() - initStartTime;
    logPerformance('storeInitialization:complete', initDuration, {
      phase: 'complete',
      duration: `${initDuration.toFixed(2)}ms`
    });

    // Log successful initialization
    console.log('Store initialization completed');
    logStore('global', 'init', 'All stores initialized successfully', {
      initDuration: `${initDuration.toFixed(2)}ms`
    });

    // Add a global flag to indicate stores are ready
    (window as any).__STYLIST_STORES_INITIALIZED = true;
    (window as any).__STYLIST_STORES_INITIALIZING = false;
    logGlobalFlag('__STYLIST_STORES_INITIALIZED', true, 'Stores successfully initialized');
    logGlobalFlag('__STYLIST_STORES_INITIALIZING', false, 'Cleared store initialization flag');

    return true;
  } catch (error) {
    console.error('Critical error during store initialization:', error);
    logStore('global', 'init', 'Critical error during store initialization', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    (window as any).__STYLIST_STORES_INITIALIZING = false;
    logGlobalFlag('__STYLIST_STORES_INITIALIZING', false, 'Cleared store initialization flag after error');

    return false;
  }
};

// Initialize stores immediately, but with safety timeout
const initTimeout = setTimeout(() => {
  if (!(window as any).__STYLIST_STORES_INITIALIZED) {
    console.warn('Store initialization taking too long, forcing completion');
    logStore('global', 'init', 'Store initialization timeout - forcing completion', {
      timeoutDuration: '5000ms'
    });

    (window as any).__STYLIST_STORES_INITIALIZED = true;
    (window as any).__STYLIST_STORES_INITIALIZING = false;

    logGlobalFlag('__STYLIST_STORES_INITIALIZED', true, 'Forced store initialization to complete due to timeout');
    logGlobalFlag('__STYLIST_STORES_INITIALIZING', false, 'Cleared store initialization flag after timeout');
  }
}, 5000); // 5 second safety timeout

// Start initialization
logComponentRender('index', 'mount', 'Main entry point initialized');
initializeStores();

// Use a self-invoking function to encapsulate the widget creation and prevent duplication
(function mountWidgetOnce() {
  // Track performance for widget mounting
  const mountStartTime = performance.now();
  logPerformance('widgetMount:start', 0, { phase: 'start' });

  // Check if widget is already mounted
  if ((window as any).__STYLIST_WIDGET_DOM_MOUNTED === true) {
    console.log('Widget DOM already mounted, skipping render');
    logComponentRender('index', 'render', 'Widget DOM already mounted, skipping render');
    return;
  }

  // Get or create a container for the widget
  let stylistContainer = document.getElementById('stylist-widget-container');

  // Only create a new container if one doesn't exist
  if (!stylistContainer) {
    console.log('Creating widget container as it does not exist');
    logComponentRender('index', 'render', 'Creating widget container');
    stylistContainer = createWidgetContainer();
  } else {
    console.log('Using existing widget container');
    logComponentRender('index', 'render', 'Using existing widget container');
  }

  // Set mounting flag BEFORE creating root to prevent any race conditions
  (window as any).__STYLIST_WIDGET_DOM_MOUNTED = true;
  logGlobalFlag('__STYLIST_WIDGET_DOM_MOUNTED', true, 'Setting widget DOM mounted flag');

  // Set a safety timeout to clear the widget mounted flag if rendering fails
  // This allows a future retry if the initial attempt fails
  const safetyTimeout = setTimeout(() => {
    if (!(window as any).__STYLIST_WIDGET_RENDER_COMPLETE) {
      console.warn('Stylist Widget render did not complete within the timeout period, resetting initialization flags');
      logGlobalFlag('__STYLIST_WIDGET_DOM_MOUNTED', false, 'Resetting DOM mounted flag after render timeout', {
        timeoutDuration: '10000ms',
        elapsedTime: `${((performance.now() - mountStartTime) / 1000).toFixed(1)}s`
      });

      // Reset the mount flag to allow another initialization attempt
      (window as any).__STYLIST_WIDGET_DOM_MOUNTED = false;
    }
  }, 10000); // 10 second safety timeout

  try {
    // Create root for React rendering
    const root = createRoot(stylistContainer);
    logComponentRender('index', 'render', 'Created React root for rendering');

    // Get configuration from the global object with fallback
    const config = (window as any).__StylistWidgetConfig || {
      apiKey: 'demo_key',
      retailerId: 'demo_retailer'
    };

    logComponentRender('index', 'render', 'Using widget configuration', {
      hasConfig: !!(window as any).__StylistWidgetConfig,
      apiKey: config.apiKey === 'demo_key' ? 'demo_key' : 'custom_key',
      retailerId: config.retailerId === 'demo_retailer' ? 'demo_retailer' : 'custom_retailer'
    });

    // Import the SyncProvider
    const { SyncProvider } = require('./services/SyncProvider');
    
    // Render the widget with SyncProvider
    root.render(
      <React.StrictMode>
        <SyncProvider>
          <StylistWidget {...config} />
        </SyncProvider>
      </React.StrictMode>
    );

    // Mark render as complete
    (window as any).__STYLIST_WIDGET_RENDER_COMPLETE = true;
    clearTimeout(safetyTimeout);
    console.log('Widget root rendered successfully');

    const mountDuration = performance.now() - mountStartTime;
    logGlobalFlag('__STYLIST_WIDGET_RENDER_COMPLETE', true, 'Widget render completed successfully');
    logPerformance('widgetMount:complete', mountDuration, {
      phase: 'complete',
      duration: `${mountDuration.toFixed(2)}ms`
    });

  } catch (error) {
    console.error('Error mounting Stylist Widget:', error);
    logComponentRender('index', 'error', 'Error mounting Stylist Widget', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Only keep the DOM mounted flag if render actually succeeded
    (window as any).__STYLIST_WIDGET_RENDER_COMPLETE = false;
    clearTimeout(safetyTimeout);

    logGlobalFlag('__STYLIST_WIDGET_RENDER_COMPLETE', false, 'Widget render failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
})();

// Helper function to create the widget container
function createWidgetContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'stylist-widget-container';
  document.body.appendChild(container);
  return container;
}

// Export the StylistWidget component for direct use
export default StylistWidget;

// Create a widget API with safe store access
const widgetAPI: StylistWidgetAPI = {
  init: (config) => {
    logComponentRender('API', 'init', 'StylistWidget API initialization', {
      hasApiKey: !!config?.apiKey,
      hasRetailerId: !!config?.retailerId
    });

    (window as any).__StylistWidgetConfig = {
      ...(window as any).__StylistWidgetConfig,
      ...config
    };

    logGlobalFlag('__StylistWidgetConfig', true, 'Widget configuration set via API', {
      hasApiKey: !!config?.apiKey,
      hasRetailerId: !!config?.retailerId
    });

    // Ensure root is present
    if (!document.getElementById('stylist-widget-container')) {
      logComponentRender('API', 'init', 'Creating widget container via API');
      createWidgetContainer();
    }

    // Ensure stores are initialized
    logComponentRender('API', 'init', 'Initializing stores via API');
    const initResult = initializeStores();
    logComponentRender('API', 'init', 'Store initialization result', { success: initResult });

    return {
      success: true,
      message: 'Stylist Widget initialized successfully'
    };
  },

  open: () => {
    logComponentRender('API', 'action', 'Open widget requested via API');

    // Safely get isOpen and use toggleOpen only if needed
    const isOpen = getSafeStoreValue(useChatStore, state => state.isOpen, false);
    if (!isOpen) {
      const chatStore = useChatStore.getState();
      if (chatStore && typeof chatStore.toggleOpen === 'function') {
        logComponentRender('API', 'action', 'Opening widget via store action');
        chatStore.toggleOpen();
        return true;
      } else {
        logComponentRender('API', 'error', 'Failed to open widget - store not available', {
          error: 'Chat store not available or toggleOpen not a function'
        });
        return false;
      }
    } else {
      logComponentRender('API', 'action', 'Widget already open, no action needed');
      return true;
    }
  },

  close: () => {
    logComponentRender('API', 'action', 'Close widget requested via API');

    // Safely get isOpen and use toggleOpen only if needed
    const isOpen = getSafeStoreValue(useChatStore, state => state.isOpen, false);
    if (isOpen) {
      const chatStore = useChatStore.getState();
      if (chatStore && typeof chatStore.toggleOpen === 'function') {
        logComponentRender('API', 'action', 'Closing widget via store action');
        chatStore.toggleOpen();
        return true;
      } else {
        logComponentRender('API', 'error', 'Failed to close widget - store not available', {
          error: 'Chat store not available or toggleOpen not a function'
        });
        return false;
      }
    } else {
      logComponentRender('API', 'action', 'Widget already closed, no action needed');
      return true;
    }
  },

  minimize: () => {
    logComponentRender('API', 'action', 'Minimize widget requested via API');

    const chatStore = useChatStore.getState();
    if (chatStore && typeof chatStore.toggleMinimize === 'function') {
      logComponentRender('API', 'action', 'Minimizing widget via store action');
      chatStore.toggleMinimize();
      return true;
    } else {
      logComponentRender('API', 'error', 'Failed to minimize widget - store not available', {
        error: 'Chat store not available or toggleMinimize not a function'
      });
      return false;
    }
  },

  switchView: (view) => {
    logComponentRender('API', 'action', 'Switch view requested via API', { view });

    const chatStore = useChatStore.getState();
    if (chatStore && typeof chatStore.setCurrentView === 'function') {
      logComponentRender('API', 'action', `Switching to ${view} view via store action`);
      chatStore.setCurrentView(view);
      return true;
    } else {
      logComponentRender('API', 'error', 'Failed to switch view - store not available', {
        error: 'Chat store not available or setCurrentView not a function',
        requestedView: view
      });
      return false;
    }
  },

  openStyleQuiz: () => {
    logComponentRender('API', 'action', 'Open style quiz requested via API');

    // Set the global flag to show style quiz
    (window as any).__StylistShowStyleQuiz = true;
    logGlobalFlag('__StylistShowStyleQuiz', true, 'Style quiz flag set via API');

    // Make sure the widget is open - with safety checks
    const chatStore = useChatStore.getState();
    if (chatStore && typeof chatStore.setIsOpen === 'function') {
      logComponentRender('API', 'action', 'Opening widget for style quiz');
      chatStore.setIsOpen(true);
      return true;
    } else {
      logComponentRender('API', 'warning', 'Style quiz flag set but widget could not be opened', {
        error: 'Chat store not available or setIsOpen not a function'
      });
      return false;
    }
  },

  openVirtualTryOn: () => {
    logComponentRender('API', 'action', 'Open virtual try-on requested via API');

    // Set the global flag to show virtual try-on
    (window as any).__StylistShowVirtualTryOn = true;
    logGlobalFlag('__StylistShowVirtualTryOn', true, 'Virtual try-on flag set via API');

    // Make sure the widget is open - with safety checks
    const chatStore = useChatStore.getState();
    if (chatStore && typeof chatStore.setIsOpen === 'function') {
      logComponentRender('API', 'action', 'Opening widget for virtual try-on');
      chatStore.setIsOpen(true);
      return true;
    } else {
      logComponentRender('API', 'warning', 'Virtual try-on flag set but widget could not be opened', {
        error: 'Chat store not available or setIsOpen not a function'
      });
      return false;
    }
  },

  __debug: {
    addMockItems: () => {
      logComponentRender('API', 'debug', 'Adding mock items via debug API');

      try {
        const recStore = useRecommendationStore.getState();
        if (!recStore || typeof recStore.setRecommendedItems !== 'function') {
          console.warn('Recommendation store not initialized');
          logComponentRender('API', 'error', 'Failed to add mock items - store not initialized');
          return {
            success: false,
            message: 'Recommendation store not initialized'
          };
        }

        // Create properly typed mock items
        const mockItems: RecommendationItem[] = [
          {
            id: 'mock1',
            name: 'Stylish Jeans',
            brand: 'DenimCo',
            category: 'Pants',
            price: 79.99,
            retailerId: 'demo',
            imageUrls: ['https://via.placeholder.com/150'],
            colors: [],
            sizes: [],
            url: '#',
            matchScore: 0.95,
            matchReasons: ['Based on your style profile'],
            inStock: true
          },
          {
            id: 'mock2',
            name: 'Casual T-Shirt',
            brand: 'Basics',
            category: 'Tops',
            price: 24.99,
            retailerId: 'demo',
            imageUrls: ['https://via.placeholder.com/150'],
            colors: [],
            sizes: [],
            url: '#',
            matchScore: 0.92,
            matchReasons: ['Matches your preferences'],
            inStock: true
          },
          {
            id: 'mock3',
            name: 'Leather Boots',
            brand: 'Footwear',
            category: 'Shoes',
            price: 129.99,
            retailerId: 'demo',
            imageUrls: ['https://via.placeholder.com/150'],
            colors: [],
            sizes: [],
            url: '#',
            matchScore: 0.88,
            matchReasons: ['Complements your style'],
            inStock: true
          }
        ];

        // Create properly typed mock outfit
        const mockOutfit: Outfit = {
          id: 'outfit1',
          name: 'Casual Weekend Look',
          occasion: 'Casual',
          items: mockItems,
          matchScore: 0.93,
          matchReasons: ['Perfect for weekends']
        };

        logComponentRender('API', 'debug', 'Setting mock items in recommendation store');
        recStore.setRecommendedItems(mockItems);

        if (typeof recStore.setRecommendedOutfits === 'function') {
          logComponentRender('API', 'debug', 'Setting mock outfits in recommendation store');
          recStore.setRecommendedOutfits([mockOutfit]);
        }

        return {
          success: true,
          message: 'Mock items and outfit added successfully',
          data: {
            itemCount: mockItems.length,
            outfitCount: 1
          }
        };
      } catch (error) {
        console.error('Error adding mock items:', error);
        logComponentRender('API', 'error', 'Error adding mock items', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        return {
          success: false,
          message: 'Error adding mock items',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },

    getDiagnostics: () => {
      // Export diagnostic logs to the consumer
      if (typeof window !== 'undefined' && (window as any).__STYLIST_DIAGNOSTICS) {
        logComponentRender('API', 'debug', 'Getting diagnostics via debug API');
        return {
          logs: (window as any).__STYLIST_DIAGNOSTICS.logs || [],
          flags: {
            initialized: !!(window as any).__STYLIST_WIDGET_INITIALIZED,
            mounted: !!(window as any).__STYLIST_WIDGET_DOM_MOUNTED,
            renderComplete: !!(window as any).__STYLIST_WIDGET_RENDER_COMPLETE,
            storesInitialized: !!(window as any).__STYLIST_STORES_INITIALIZED,
            backgroundInitComplete: !!(window as any).__STYLIST_BACKGROUND_INIT_COMPLETE
          }
        };
      } else {
        return {
          logs: [],
          flags: {
            initialized: false,
            mounted: false,
            renderComplete: false,
            storesInitialized: false,
            backgroundInitComplete: false
          }
        };
      }
    },

    clearDiagnostics: () => {
      logComponentRender('API', 'debug', 'Clearing diagnostics via debug API');

      // If we have the diagnostics module, use it to clear logs
      if (typeof window !== 'undefined' && (window as any).__STYLIST_DIAGNOSTICS) {
        (window as any).__STYLIST_DIAGNOSTICS.logs = [];

        // Also try to remove from localStorage
        try {
          localStorage.removeItem('__STYLIST_DIAGNOSTICS_LOGS');
        } catch (e) {
          // Silently fail if localStorage is not available
        }

        return { success: true, message: 'Diagnostics cleared successfully' };
      }

      return { success: false, message: 'Diagnostics module not initialized' };
    }
  }
};

// Add to global window object
// Use type assertion to ensure TypeScript knows this is a valid operation
(window as any).StylistWidget = widgetAPI;

// Add types to window object for TypeScript
declare global {
  interface Window {
    __StylistWidgetConfig?: StylistWidgetConfig;
    StylistWidget: StylistWidgetAPI;
    __STYLIST_STORES_INITIALIZED?: boolean;
    __STYLIST_STORE__?: {
      chat: {
        toggleOpen: () => void;
        toggleMinimize: () => void;
        setCurrentView: (view: 'chat' | 'lookbook') => void;
        currentView?: 'chat' | 'lookbook';
        isOpen: boolean;
      };
      recommendations: {
        setRecommendedItems: (items: RecommendationItem[]) => void;
        setRecommendedOutfits: (outfits: Outfit[]) => void;
        recommendedItems?: RecommendationItem[];
        recommendedOutfits?: Outfit[];
      };
    };
    __STYLIST_PENDING_INITIALIZATIONS?: {
      feedbackSync?: {
        apiKey: string;
        retailerId: string;
        apiUrl?: string;
      };
      recommendations?: {
        userId: string;
      };
      [key: string]: any;
    };
    __STYLIST_BACKGROUND_INIT_COMPLETE?: boolean;
  }
}