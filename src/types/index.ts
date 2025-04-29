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
  init: (config: StylistWidgetConfig) => void;
  open: () => void;
  close: () => void;
  minimize: () => void;
  switchView: (view: 'chat' | 'lookbook') => void;
  openStyleQuiz: () => void;
  openVirtualTryOn: () => void;
  __debug?: {
    addMockItems: () => void;
  };
}

// Define window interface extensions for TypeScript global namespace
export interface StylistWindowExtensions {
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