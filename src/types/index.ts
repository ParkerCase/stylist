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