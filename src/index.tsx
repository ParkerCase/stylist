// Main entry point for the widget

import React from 'react';
import { createRoot } from 'react-dom/client';
import StylistWidget from './StylistWidget';
import { useChatStore, useRecommendationStore } from './store/index';
import { RecommendationItem, Outfit, StylistWidgetAPI, StylistWidgetConfig } from './types/index';

// Create a container for the widget if it doesn't exist
const stylistContainer = document.getElementById('stylist-widget-container') || createWidgetContainer();

// Create root for React rendering
const root = createRoot(stylistContainer);

// Get configuration from the global object
const config = (window as any).__StylistWidgetConfig || {
  apiKey: 'demo_key',
  retailerId: 'demo_retailer'
};

// Render the widget
root.render(
  <React.StrictMode>
    <StylistWidget {...config} />
  </React.StrictMode>
);

// Helper function to create the widget container
function createWidgetContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'stylist-widget-container';
  document.body.appendChild(container);
  return container;
}

// Export the StylistWidget component for direct use
export default StylistWidget;

// Create a widget API
const widgetAPI: StylistWidgetAPI = {
  init: (config) => {
    (window as any).__StylistWidgetConfig = {
      ...(window as any).__StylistWidgetConfig,
      ...config
    };
    
    // Ensure root is present
    if (!document.getElementById('stylist-widget-container')) {
      createWidgetContainer();
    }
  },
  
  open: () => {
    const chatStore = useChatStore.getState();
    if (!chatStore.isOpen) {
      chatStore.toggleOpen();
    }
  },
  
  close: () => {
    const chatStore = useChatStore.getState();
    if (chatStore.isOpen) {
      chatStore.toggleOpen();
    }
  },
  
  minimize: () => {
    const chatStore = useChatStore.getState();
    chatStore.toggleMinimize();
  },
  
  switchView: (view) => {
    const chatStore = useChatStore.getState();
    chatStore.setCurrentView(view);
  },
  
  __debug: {
    addMockItems: () => {
      const recStore = useRecommendationStore.getState();
      
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
      
      recStore.setRecommendedItems(mockItems);
      recStore.setRecommendedOutfits([mockOutfit]);
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
  }
}