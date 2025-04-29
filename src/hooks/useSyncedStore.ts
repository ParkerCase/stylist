// Hook for automatically synchronizing store operations with backend
import { useEffect, useCallback } from 'react';
import { useUserStore } from '../store/userStore';
import useRecommendationStore from '../store/recommendationStore';
import { useSyncService, SyncOperationType } from '../services/syncService';
import { ClosetItem, UserPreferences, StyleQuizAnswer } from '../types';

/**
 * Hook that connects store operations to sync service
 * Ensures that changes to the store are synchronized with backend
 */
export const useSyncedStore = () => {
  const userStore = useUserStore();
  const recommendationStore = useRecommendationStore();
  const syncService = useSyncService();
  
  // Sync closet operations
  const addToCloset = useCallback((item: Omit<ClosetItem, 'id' | 'dateAdded'>) => {
    if (!userStore.user) return;
    
    // Add to local store first
    const now = new Date();
    const id = `item_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`;
    const newItem: ClosetItem = {
      ...item,
      id,
      dateAdded: now,
      favorite: item.favorite || false,
      tags: item.tags || []
    };
    
    userStore.addToCloset(newItem);
    
    // Queue for syncing
    syncService.addClosetItem(item, userStore.user.userId);
  }, [userStore, syncService]);
  
  const removeFromCloset = useCallback((itemId: string) => {
    if (!userStore.user) return;
    
    // Update local store first
    userStore.removeFromCloset(itemId);
    
    // Queue for syncing
    syncService.removeClosetItem(itemId, userStore.user.userId);
  }, [userStore, syncService]);
  
  const toggleItemFavorite = useCallback((itemId: string, favorite: boolean) => {
    if (!userStore.user) return;
    
    // Update local store first
    userStore.toggleItemFavorite(itemId, favorite);
    
    // Queue for syncing
    syncService.toggleFavorite(itemId, favorite, userStore.user.userId);
  }, [userStore, syncService]);
  
  // Sync user preferences
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    if (!userStore.user) return;
    
    // Update local store first
    userStore.updateUser({
      preferences: {
        ...userStore.user.preferences,
        ...preferences
      }
    });
    
    // Queue for syncing
    syncService.updatePreferences(preferences, userStore.user.userId);
  }, [userStore, syncService]);
  
  // Sync quiz results
  const submitStyleQuiz = useCallback((answers: StyleQuizAnswer[]) => {
    if (!userStore.user) return;
    
    // Submit to server (store update will happen when results are returned)
    syncService.submitQuiz(answers, userStore.user.userId);
  }, [userStore, syncService]);
  
  // Sync feedback data
  const addLikedItem = useCallback((itemId: string) => {
    if (!userStore.user) return;
    
    // Update local store first
    userStore.addLikedItem(itemId);
    
    // No need to queue this specifically, it will be synced with full profile
  }, [userStore]);
  
  const addDislikedItem = useCallback((itemId: string) => {
    if (!userStore.user) return;
    
    // Update local store first
    userStore.addDislikedItem(itemId);
    
    // No need to queue this specifically, it will be synced with full profile
  }, [userStore]);
  
  const saveOutfit = useCallback((outfit: any) => {
    if (!userStore.user) return;
    
    // Add to local recommendation store
    recommendationStore.saveOutfit(outfit);
    
    // Queue for syncing
    syncService.saveOutfit(outfit, userStore.user.userId);
  }, [userStore, recommendationStore, syncService]);
  
  const removeSavedOutfit = useCallback((outfitId: string) => {
    if (!userStore.user) return;
    
    // Remove from local recommendation store
    recommendationStore.removeSavedOutfit(outfitId);
    
    // Queue for syncing
    syncService.removeOutfit(outfitId, userStore.user.userId);
  }, [userStore, recommendationStore, syncService]);
  
  // Initial sync when component mounts
  useEffect(() => {
    if (userStore.user) {
      syncService.syncNow();
    }
  }, [userStore.user, syncService]);
  
  // Return wrapped functions that handle both local state and sync
  return {
    // Sync status
    syncState: syncService.state,
    syncNow: syncService.syncNow,
    
    // Closet operations
    addToCloset,
    removeFromCloset,
    toggleItemFavorite,
    
    // Preference operations
    updatePreferences,
    
    // Quiz operations
    submitStyleQuiz,
    
    // Feedback operations
    addLikedItem,
    addDislikedItem,
    
    // Outfit operations
    saveOutfit,
    removeSavedOutfit
  };
};

export default useSyncedStore;