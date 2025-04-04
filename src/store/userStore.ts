// User state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, StyleQuizResult, ClosetItem } from '../types/index';

interface UserState {
  user: UserProfile | null;
  styleQuizResult: StyleQuizResult | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  setStyleQuizResult: (result: StyleQuizResult | null) => void;
  addToCloset: (item: ClosetItem) => void;
  removeFromCloset: (itemId: string) => void;
  toggleItemFavorite: (itemId: string, favorite: boolean) => void;
  addLikedItem: (itemId: string) => void;
  addDislikedItem: (itemId: string) => void;
  removeLikedItem: (itemId: string) => void;
  removeDislikedItem: (itemId: string) => void;
  addViewedItem: (itemId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      styleQuizResult: null,
      isLoading: false,
      error: null,
      
      setUser: (user) => {
        set({ user });
      },
      
      updateUser: (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            ...updates
          }
        });
      },
      
      setStyleQuizResult: (result) => {
        set({ styleQuizResult: result });
      },
      
      addToCloset: (item) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            closet: [...currentUser.closet, item]
          }
        });
      },
      
      removeFromCloset: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            closet: currentUser.closet.filter((item) => item.id !== itemId)
          }
        });
      },
      
      toggleItemFavorite: (itemId, favorite) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            closet: currentUser.closet.map((item) =>
              item.id === itemId ? { ...item, favorite } : item
            )
          }
        });
      },
      
      addLikedItem: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        // Add to liked items if not already there
        if (!currentUser.feedback.likedItems.includes(itemId)) {
          set({
            user: {
              ...currentUser,
              feedback: {
                ...currentUser.feedback,
                likedItems: [...currentUser.feedback.likedItems, itemId],
                // If it was previously disliked, remove from disliked
                dislikedItems: currentUser.feedback.dislikedItems.filter(
                  (id) => id !== itemId
                ),
                lastInteraction: new Date()
              }
            }
          });
        }
      },
      
      addDislikedItem: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        // Add to disliked items if not already there
        if (!currentUser.feedback.dislikedItems.includes(itemId)) {
          set({
            user: {
              ...currentUser,
              feedback: {
                ...currentUser.feedback,
                dislikedItems: [...currentUser.feedback.dislikedItems, itemId],
                // If it was previously liked, remove from liked
                likedItems: currentUser.feedback.likedItems.filter(
                  (id) => id !== itemId
                ),
                lastInteraction: new Date()
              }
            }
          });
        }
      },
      
      removeLikedItem: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            feedback: {
              ...currentUser.feedback,
              likedItems: currentUser.feedback.likedItems.filter(
                (id) => id !== itemId
              ),
              lastInteraction: new Date()
            }
          }
        });
      },
      
      removeDislikedItem: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            feedback: {
              ...currentUser.feedback,
              dislikedItems: currentUser.feedback.dislikedItems.filter(
                (id) => id !== itemId
              ),
              lastInteraction: new Date()
            }
          }
        });
      },
      
      addViewedItem: (itemId) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        // Add to viewed items if not already there
        if (!currentUser.feedback.viewedItems.includes(itemId)) {
          set({
            user: {
              ...currentUser,
              feedback: {
                ...currentUser.feedback,
                viewedItems: [...currentUser.feedback.viewedItems, itemId],
                lastInteraction: new Date()
              }
            }
          });
        }
      },
      
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      logout: () => {
        set({
          user: null,
          styleQuizResult: null
        });
      }
    }),
    {
      name: 'stylist-user-storage',
      partialize: (state) => ({
        user: state.user,
        styleQuizResult: state.styleQuizResult
      })
    }
  )
);