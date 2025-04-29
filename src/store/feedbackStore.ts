// Feedback state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUserId } from '@/utils/localStorage';

export type FeedbackType = 'like' | 'dislike' | 'thumbsUp';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  timestamp: Date;
  entityType: 'item' | 'outfit' | 'recommendation';
  metadata?: Record<string, any>;
}

interface FeedbackState {
  likedItems: Set<string>;
  dislikedItems: Set<string>;
  likedOutfits: Set<string>;
  dislikedOutfits: Set<string>;
  thumbsUpMessages: Set<string>;
  feedbackHistory: FeedbackItem[];
  pendingSync: FeedbackItem[];
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  
  // Actions
  addItemFeedback: (itemId: string, type: 'like' | 'dislike') => void;
  addOutfitFeedback: (outfitId: string, type: 'like' | 'dislike') => void;
  addMessageThumbsUp: (messageId: string) => void;
  removeItemFeedback: (itemId: string) => void;
  removeOutfitFeedback: (outfitId: string) => void;
  removeMessageThumbsUp: (messageId: string) => void;
  markAsSynced: (feedbackIds: string[]) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  getItemFeedbackStatus: (itemId: string) => { liked: boolean; disliked: boolean };
  getOutfitFeedbackStatus: (outfitId: string) => { liked: boolean; disliked: boolean };
  isMessageThumbedUp: (messageId: string) => boolean;
  getPendingSyncItems: () => FeedbackItem[];
  clearSyncedItems: () => void;
}

// Helper to convert sets to arrays for persistence
const setToArray = (set: Set<string>): string[] => Array.from(set);
const arrayToSet = (array: string[]): Set<string> => new Set(array);

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      likedItems: new Set<string>(),
      dislikedItems: new Set<string>(),
      likedOutfits: new Set<string>(),
      dislikedOutfits: new Set<string>(),
      thumbsUpMessages: new Set<string>(),
      feedbackHistory: [],
      pendingSync: [],
      isSyncing: false,
      lastSyncedAt: null,
      
      addItemFeedback: (itemId, type) => {
        const userId = getUserId();
        const timestamp = new Date();
        const feedbackItem: FeedbackItem = {
          id: `item_${type}_${itemId}_${timestamp.getTime()}`,
          type,
          timestamp,
          entityType: 'item',
          metadata: { itemId, userId }
        };
        
        if (type === 'like') {
          set((state) => ({
            likedItems: new Set(state.likedItems).add(itemId),
            dislikedItems: new Set(state.dislikedItems).delete(itemId) ? 
              new Set(state.dislikedItems) : state.dislikedItems,
            feedbackHistory: [...state.feedbackHistory, feedbackItem],
            pendingSync: [...state.pendingSync, feedbackItem]
          }));
        } else {
          set((state) => ({
            dislikedItems: new Set(state.dislikedItems).add(itemId),
            likedItems: new Set(state.likedItems).delete(itemId) ?
              new Set(state.likedItems) : state.likedItems,
            feedbackHistory: [...state.feedbackHistory, feedbackItem],
            pendingSync: [...state.pendingSync, feedbackItem]
          }));
        }
      },
      
      addOutfitFeedback: (outfitId, type) => {
        const userId = getUserId();
        const timestamp = new Date();
        const feedbackItem: FeedbackItem = {
          id: `outfit_${type}_${outfitId}_${timestamp.getTime()}`,
          type,
          timestamp,
          entityType: 'outfit',
          metadata: { outfitId, userId }
        };
        
        if (type === 'like') {
          set((state) => ({
            likedOutfits: new Set(state.likedOutfits).add(outfitId),
            dislikedOutfits: new Set(state.dislikedOutfits).delete(outfitId) ?
              new Set(state.dislikedOutfits) : state.dislikedOutfits,
            feedbackHistory: [...state.feedbackHistory, feedbackItem],
            pendingSync: [...state.pendingSync, feedbackItem]
          }));
        } else {
          set((state) => ({
            dislikedOutfits: new Set(state.dislikedOutfits).add(outfitId),
            likedOutfits: new Set(state.likedOutfits).delete(outfitId) ?
              new Set(state.likedOutfits) : state.likedOutfits,
            feedbackHistory: [...state.feedbackHistory, feedbackItem],
            pendingSync: [...state.pendingSync, feedbackItem]
          }));
        }
      },
      
      addMessageThumbsUp: (messageId) => {
        const userId = getUserId();
        const timestamp = new Date();
        const feedbackItem: FeedbackItem = {
          id: `message_thumbsUp_${messageId}_${timestamp.getTime()}`,
          type: 'thumbsUp',
          timestamp,
          entityType: 'recommendation',
          metadata: { messageId, userId }
        };
        
        set((state) => ({
          thumbsUpMessages: new Set(state.thumbsUpMessages).add(messageId),
          feedbackHistory: [...state.feedbackHistory, feedbackItem],
          pendingSync: [...state.pendingSync, feedbackItem]
        }));
      },
      
      removeItemFeedback: (itemId) => {
        set((state) => ({
          likedItems: new Set(state.likedItems).delete(itemId) ?
            new Set(state.likedItems) : state.likedItems,
          dislikedItems: new Set(state.dislikedItems).delete(itemId) ?
            new Set(state.dislikedItems) : state.dislikedItems
        }));
      },
      
      removeOutfitFeedback: (outfitId) => {
        set((state) => ({
          likedOutfits: new Set(state.likedOutfits).delete(outfitId) ?
            new Set(state.likedOutfits) : state.likedOutfits,
          dislikedOutfits: new Set(state.dislikedOutfits).delete(outfitId) ?
            new Set(state.dislikedOutfits) : state.dislikedOutfits
        }));
      },
      
      removeMessageThumbsUp: (messageId) => {
        set((state) => ({
          thumbsUpMessages: new Set(state.thumbsUpMessages).delete(messageId) ?
            new Set(state.thumbsUpMessages) : state.thumbsUpMessages
        }));
      },
      
      markAsSynced: (feedbackIds) => {
        set((state) => ({
          pendingSync: state.pendingSync.filter(item => !feedbackIds.includes(item.id)),
          lastSyncedAt: new Date()
        }));
      },
      
      setIsSyncing: (isSyncing) => {
        set({ isSyncing });
      },
      
      getItemFeedbackStatus: (itemId) => {
        const state = get();
        return {
          liked: state.likedItems.has(itemId),
          disliked: state.dislikedItems.has(itemId)
        };
      },
      
      getOutfitFeedbackStatus: (outfitId) => {
        const state = get();
        return {
          liked: state.likedOutfits.has(outfitId),
          disliked: state.dislikedOutfits.has(outfitId)
        };
      },
      
      isMessageThumbedUp: (messageId) => {
        return get().thumbsUpMessages.has(messageId);
      },
      
      getPendingSyncItems: () => {
        return get().pendingSync;
      },
      
      clearSyncedItems: () => {
        set({
          pendingSync: [],
          lastSyncedAt: new Date()
        });
      }
    }),
    {
      name: 'stylist-feedback-storage',
      // Custom serialization for Set objects (which aren't serializable by default)
      partialize: (state) => ({
        likedItems: setToArray(state.likedItems),
        dislikedItems: setToArray(state.dislikedItems),
        likedOutfits: setToArray(state.likedOutfits),
        dislikedOutfits: setToArray(state.dislikedOutfits),
        thumbsUpMessages: setToArray(state.thumbsUpMessages),
        feedbackHistory: state.feedbackHistory,
        pendingSync: state.pendingSync,
        lastSyncedAt: state.lastSyncedAt
      }),
      // Custom deserialization to convert arrays back to Set objects
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.likedItems = arrayToSet(state.likedItems as unknown as string[]);
          state.dislikedItems = arrayToSet(state.dislikedItems as unknown as string[]);
          state.likedOutfits = arrayToSet(state.likedOutfits as unknown as string[]);
          state.dislikedOutfits = arrayToSet(state.dislikedOutfits as unknown as string[]);
          state.thumbsUpMessages = arrayToSet(state.thumbsUpMessages as unknown as string[]);
        }
      }
    }
  )
);

export default useFeedbackStore;