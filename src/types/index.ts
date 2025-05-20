// Export all types from the types directory

// Re-export from chat.ts
import * as ChatTypes from './chat';
// Export ChatTypes for direct access
export { ChatTypes };
import { MessageType, MessageSender } from './chat';

export {
  MessageType,
  MessageSender
};

export type {
  Message,
  TextMessage,
  LoadingMessage,
  ErrorMessage,
  QuizMessage,
  ChatMessage,
  ChatConfig
} from './chat';

// Re-export from user.ts
export * from './user';

// Re-export from recommendation.ts, avoiding duplicates with chat.ts
import * as RecommendationTypes from './recommendation';
export type {
  RecommendationRequest,
  RecommendationResponse,
  ItemFeedback,
  OutfitFeedback,
  SavedOutfit,
  SimilarItemsRequest,
  CompleteOutfitRequest,
  WishlistItem,
  CartItem
} from './recommendation';

// Handle ambiguous types using namespaces
// These need to be namespaces (not interfaces) for proper TypeScript support
/* eslint-disable @typescript-eslint/no-namespace */
export namespace Chat {
  export type RecommendationItem = ChatTypes.RecommendationItem;
  export type Outfit = ChatTypes.Outfit;
}

export namespace Recommendation {
  export type RecommendationItem = RecommendationTypes.RecommendationItem;
  export type Outfit = RecommendationTypes.Outfit;
  export type SavedOutfit = RecommendationTypes.SavedOutfit;
}

// For backward compatibility, export one set as the default
export type RecommendationItem = RecommendationTypes.RecommendationItem;
export type Outfit = RecommendationTypes.Outfit;

// Re-export from retailer.ts
export * from './retailer';

// Define shared widget API interface
export interface StylistWidgetConfig {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
}

// Define shared widget API interface
export interface StylistWidgetAPI {
  // Core Widget API
  init: (config: StylistWidgetConfig) => { success: boolean; message: string };
  open: () => boolean;
  close: () => boolean;
  minimize: () => boolean;
  switchView: (view: 'chat' | 'lookbook') => boolean;
  openStyleQuiz: () => boolean;
  openVirtualTryOn: () => boolean;

  // Debug/Diagnostic API
  __debug: {
    // Add mock items to the widget for testing
    addMockItems: () => {
      success: boolean;
      message: string;
      data?: { itemCount: number; outfitCount: number };
      error?: string;
    };

    // Retrieve diagnostics logs and global flags
    getDiagnostics: () => {
      logs: any[];
      flags: {
        initialized: boolean;
        mounted: boolean;
        renderComplete: boolean;
        storesInitialized: boolean;
        backgroundInitComplete: boolean;
      }
    };

    // Clear diagnostics logs
    clearDiagnostics: () => {
      success: boolean;
      message: string
    };
  };
}

// Define social proof related interfaces
export interface SocialProofMatch {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  brand?: string;
  category?: string;
  imageUrl: string;
  matchScore?: number;
  matchReasons?: string[];
  celebrityName?: string;
  event?: string;
  matchedProducts: ProductRecommendation[];
  confidence?: number;
  source?: string;
  timestamp?: string;
}

// Product recommendation in social proof
export interface ProductRecommendation {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  imageUrl: string;
  matchScore?: number;
  matchReasons?: string[];
}

export interface SocialProofItem {
  id: string;
  celebrity: string;
  event: string;
  outfitTags: string[];
  patterns: string[];
  colors: string[];
  timestamp: string;
  matchedProducts: SocialProofMatch[];
}

// Define window interface extensions for TypeScript global namespace
export interface StylistWindowExtensions {
  // Configuration
  __StylistWidgetConfig?: StylistWidgetConfig;
  StylistWidget: StylistWidgetAPI;

  // Store access
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

  // Widget lifecycle flags
  __STYLIST_WIDGET_INITIALIZED?: boolean;
  __STYLIST_WIDGET_DOM_MOUNTED?: boolean;
  __STYLIST_WIDGET_RENDER_COMPLETE?: boolean;
  __STYLIST_STORES_INITIALIZED?: boolean;
  __STYLIST_STORES_INITIALIZING?: boolean;
  __STYLIST_CHAT_INITIALIZED?: boolean;
  __STYLIST_BACKGROUND_INIT_COMPLETE?: boolean;

  // Initialization queues
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

  // Diagnostic module
  __STYLIST_DIAGNOSTICS?: {
    logs: any[];
    enabled: boolean;
    originalConsole: {
      log: typeof console.log;
      warn: typeof console.warn;
      error: typeof console.error;
      info: typeof console.info;
      debug: typeof console.debug;
    };
  };

  // Feature flags
  __StylistShowStyleQuiz?: boolean;
  __StylistShowVirtualTryOn?: boolean;
  __STYLIST_DIAGNOSTICS_LOG_TO_TEMP?: boolean;
}