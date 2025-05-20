// Embed script for retailers to include the full-featured widget on their site

import { useChatStore } from '@store/index';
import { StylistWidgetAPI, StylistWidgetConfig } from './types/index';

// Map window.STYLIST_CONFIG values to a global config object
// This is only needed for the standalone full-widget.html file
if (typeof window !== 'undefined' && (window as any).STYLIST_CONFIG) {
  const config = (window as any).STYLIST_CONFIG;
  
  // Create a global runtime config object instead of modifying process.env
  (window as any).__STYLIST_RUNTIME_CONFIG = {
    FORCE_DEMO_MODE: typeof config.forceDemoMode === 'boolean' ? config.forceDemoMode : false,
    USE_CLAUDE_DEMO: typeof config.useClaudeDemo === 'boolean' ? config.useClaudeDemo : false,
    USE_MOCK_RETAILER: typeof config.useMockRetailer === 'boolean' ? config.useMockRetailer : true,
    ANTHROPIC_API_KEY: config.anthropicApiKey || ''
  };
  
  // Log configuration
  console.log('Stylist widget runtime configuration loaded');
}

// Initialize the widget with all features enabled
function init(config: StylistWidgetConfig): { success: boolean; message: string } {
  try {
    // Store configuration
    (window as any).__StylistWidgetConfig = config;

    // Set widget to automatically open
    const store = useChatStore.getState();
    store.setCurrentView('chat');

    // Log initialization
    console.log('The Stylist widget initialized successfully with all features.');

    return {
      success: true,
      message: 'The Stylist widget initialized successfully with all features.'
    };
  } catch (error) {
    console.error('Error initializing widget:', error);
    return {
      success: false,
      message: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Open the widget
function open(): boolean {
  try {
    useChatStore.getState().toggleOpen();
    return true;
  } catch (error) {
    console.error('Error opening widget:', error);
    return false;
  }
}

// Close the widget
function close(): boolean {
  try {
    const { isOpen } = useChatStore.getState();
    if (isOpen) {
      useChatStore.getState().toggleOpen();
    }
    return true;
  } catch (error) {
    console.error('Error closing widget:', error);
    return false;
  }
}

// Minimize the widget
function minimize(): boolean {
  try {
    useChatStore.getState().toggleMinimize();
    return true;
  } catch (error) {
    console.error('Error minimizing widget:', error);
    return false;
  }
}

// Switch view between chat and lookbook
function switchView(view: 'chat' | 'lookbook'): boolean {
  try {
    useChatStore.getState().setCurrentView(view);
    return true;
  } catch (error) {
    console.error('Error switching view:', error);
    return false;
  }
}

// Start the style quiz
function openStyleQuiz(): boolean {
  try {
    // This function will be used by the ChatWidget component to show the quiz
    // Set the flag without resetting it - the component will handle state
    (window as any).__StylistShowStyleQuiz = true;

    // Emit an event if the event system is available
    if ((window as any).__StylistWidgetEvents) {
      (window as any).__StylistWidgetEvents.emit('styleQuiz:open');
    }
    return true;
  } catch (error) {
    console.error('Error opening style quiz:', error);
    return false;
  }
}

// Open virtual try-on
function openVirtualTryOn(): boolean {
  try {
    // Set the flag without resetting it - the component will handle state
    (window as any).__StylistShowVirtualTryOn = true;

    // Emit an event if the event system is available
    if ((window as any).__StylistWidgetEvents) {
      (window as any).__StylistWidgetEvents.emit('virtualTryOn:open');
    }
    return true;
  } catch (error) {
    console.error('Error opening virtual try-on:', error);
    return false;
  }
}

// Export the API
const widgetAPI: StylistWidgetAPI = {
  init,
  open,
  close,
  minimize,
  switchView,
  openStyleQuiz,
  openVirtualTryOn,
  __debug: {
    addMockItems: () => ({
      success: false,
      message: 'Mock items not available in embed version'
    }),
    getDiagnostics: () => ({
      logs: [],
      flags: {
        initialized: false,
        mounted: false,
        renderComplete: false,
        storesInitialized: false,
        backgroundInitComplete: false
      }
    }),
    clearDiagnostics: () => ({
      success: false,
      message: 'Diagnostics not available in embed version'
    })
  }
};

// Add to window object
if (typeof window !== 'undefined' && !(window as any).StylistWidget) {
  // Use type assertion to ensure TypeScript knows this is a valid operation
  (window as any).StylistWidget = widgetAPI;
}

export { init, open, close, minimize, switchView, openStyleQuiz, openVirtualTryOn };