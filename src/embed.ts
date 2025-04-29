// Embed script for retailers to include the full-featured widget on their site

import { useChatStore } from '@store/index';
import { StylistWidgetAPI, StylistWidgetConfig } from './types/index';

// Initialize the widget with all features enabled
function init(config: StylistWidgetConfig): void {
  // Store configuration
  (window as any).__StylistWidgetConfig = config;
  
  // Set widget to automatically open
  const store = useChatStore.getState();
  store.setCurrentView('chat');

  // Log initialization
  console.log('The Stylist widget initialized successfully with all features.');
}

// Open the widget
function open(): void {
  useChatStore.getState().toggleOpen();
}

// Close the widget
function close(): void {
  const { isOpen } = useChatStore.getState();
  if (isOpen) {
    useChatStore.getState().toggleOpen();
  }
}

// Minimize the widget
function minimize(): void {
  useChatStore.getState().toggleMinimize();
}

// Switch view between chat and lookbook
function switchView(view: 'chat' | 'lookbook'): void {
  useChatStore.getState().setCurrentView(view);
}

// Start the style quiz
function openStyleQuiz(): void {
  // This function will be used by the ChatWidget component to show the quiz
  (window as any).__StylistShowStyleQuiz = true;
  // Reset after a delay
  setTimeout(() => {
    (window as any).__StylistShowStyleQuiz = false;
  }, 100);
}

// Open virtual try-on
function openVirtualTryOn(): void {
  (window as any).__StylistShowVirtualTryOn = true;
  // Reset after a delay
  setTimeout(() => {
    (window as any).__StylistShowVirtualTryOn = false;
  }, 100);
}

// Export the API
const widgetAPI: StylistWidgetAPI = {
  init,
  open,
  close,
  minimize,
  switchView,
  openStyleQuiz,
  openVirtualTryOn
};

// Add to window object
if (typeof window !== 'undefined' && !(window as any).StylistWidget) {
  // Use type assertion to ensure TypeScript knows this is a valid operation
  (window as any).StylistWidget = widgetAPI;
}

export { init, open, close, minimize, switchView, openStyleQuiz, openVirtualTryOn };