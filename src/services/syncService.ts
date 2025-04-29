// Data synchronization service for handling online/offline state
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '../store/userStore';
import useRecommendationStore from '../store/recommendationStore';
import { UserProfile, StyleQuizResult, ClosetItem } from '../types';
import { UserApi } from '../api/userApi';
import { ApiClient } from '../api/apiClient';
import { getWithExpiry, setWithExpiry } from '../utils/localStorage';

// Constants for sync operation
const SYNC_INTERVAL = 30000; // 30 seconds
const SYNC_STORAGE_PREFIX = 'stylist_sync_';
const SYNC_LAST_TIMESTAMP = 'stylist_last_sync';
const SYNC_QUEUE_KEY = 'stylist_sync_queue';
const SYNC_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// Sync operation types
export enum SyncOperationType {
  ADD_CLOSET_ITEM = 'ADD_CLOSET_ITEM',
  REMOVE_CLOSET_ITEM = 'REMOVE_CLOSET_ITEM',
  UPDATE_CLOSET_ITEM = 'UPDATE_CLOSET_ITEM',
  TOGGLE_FAVORITE = 'TOGGLE_FAVORITE',
  UPDATE_PREFERENCES = 'UPDATE_PREFERENCES',
  SUBMIT_QUIZ = 'SUBMIT_QUIZ',
  ADD_LIKED_ITEM = 'ADD_LIKED_ITEM',
  ADD_DISLIKED_ITEM = 'ADD_DISLIKED_ITEM',
  REMOVE_LIKED_ITEM = 'REMOVE_LIKED_ITEM',
  REMOVE_DISLIKED_ITEM = 'REMOVE_DISLIKED_ITEM',
  SAVE_OUTFIT = 'SAVE_OUTFIT',
  REMOVE_OUTFIT = 'REMOVE_OUTFIT'
}

// Interface for sync queue items
export interface SyncQueueItem {
  id: string;
  timestamp: number;
  userId: string;
  operation: SyncOperationType;
  data: any;
  retryCount: number;
  resolved: boolean;
}

// Interface for the sync state
export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number | null;
  pendingOperations: number;
  syncQueue: SyncQueueItem[];
}

// Create API client for sync operations
const createSyncApiClient = (): UserApi => {
  const apiClient = new ApiClient({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    timeout: 10000,
    maxRetries: 3,
    getAuthHeader: () => {
      const token = localStorage.getItem('stylist_auth_token');
      return token ? { Authorization: `Bearer ${token}` } : { Authorization: '' };
    }
  });
  
  return new UserApi(apiClient);
};

// Main sync service hook
export const useSyncService = () => {
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTimestamp: Number(localStorage.getItem(SYNC_LAST_TIMESTAMP)) || null,
    pendingOperations: 0,
    syncQueue: []
  });
  
  const userStore = useUserStore();
  const recommendationStore = useRecommendationStore();
  const syncIntervalRef = useRef<number | null>(null);
  const apiClient = useRef<UserApi>(createSyncApiClient());
  
  // Load sync queue from localStorage
  const loadSyncQueue = useCallback((): SyncQueueItem[] => {
    const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueStr) return [];
    
    try {
      return JSON.parse(queueStr);
    } catch (error) {
      console.error('Failed to parse sync queue:', error);
      return [];
    }
  }, []);
  
  // Save sync queue to localStorage
  const saveSyncQueue = useCallback((queue: SyncQueueItem[]) => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }, []);
  
  // Initialize or update sync queue
  useEffect(() => {
    const queue = loadSyncQueue();
    setState(prev => ({
      ...prev,
      syncQueue: queue,
      pendingOperations: queue.filter(item => !item.resolved).length
    }));
  }, [loadSyncQueue]);
  
  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Trigger immediate sync when coming back online
      syncData();
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Add an operation to the sync queue
  const queueOperation = useCallback((operation: SyncOperationType, data: any, userId: string) => {
    const newItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      userId,
      operation,
      data,
      retryCount: 0,
      resolved: false
    };
    
    setState(prev => {
      const updatedQueue = [...prev.syncQueue, newItem];
      saveSyncQueue(updatedQueue);
      return {
        ...prev,
        syncQueue: updatedQueue,
        pendingOperations: updatedQueue.filter(item => !item.resolved).length
      };
    });
    
    // If online, try to sync immediately
    if (navigator.onLine) {
      syncData();
    }
  }, [saveSyncQueue]);
  
  // Execute a specific operation against the API
  const executeOperation = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    const { operation, data, userId } = item;
    
    try {
      switch (operation) {
        case SyncOperationType.ADD_CLOSET_ITEM:
          await apiClient.current.addClosetItem(userId, data);
          break;
          
        case SyncOperationType.REMOVE_CLOSET_ITEM:
          await apiClient.current.removeClosetItem(userId, data.itemId);
          break;
          
        case SyncOperationType.UPDATE_CLOSET_ITEM:
          await apiClient.current.updateClosetItem(userId, data.itemId, data.updates);
          break;
          
        case SyncOperationType.TOGGLE_FAVORITE:
          await apiClient.current.toggleFavoriteItem(userId, data.itemId, data.favorite);
          break;
          
        case SyncOperationType.UPDATE_PREFERENCES:
          await apiClient.current.updatePreferences(userId, data);
          break;
          
        case SyncOperationType.SUBMIT_QUIZ:
          await apiClient.current.submitStyleQuiz(userId, data);
          break;
          
        case SyncOperationType.SAVE_OUTFIT:
          // Implement when server API is available
          console.log('Saving outfit to server:', data);
          break;
          
        case SyncOperationType.REMOVE_OUTFIT:
          // Implement when server API is available
          console.log('Removing outfit from server:', data);
          break;
          
        case SyncOperationType.ADD_LIKED_ITEM:
        case SyncOperationType.ADD_DISLIKED_ITEM:
        case SyncOperationType.REMOVE_LIKED_ITEM:
        case SyncOperationType.REMOVE_DISLIKED_ITEM:
          // These are handled in the full profile sync
          console.log('Preference feedback will be synced with full profile');
          break;
          
        default:
          console.warn('Unknown operation type:', operation);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error executing operation ${operation}:`, error);
      return false;
    }
  }, []);
  
  // Detect and resolve conflicts between local and server data
  const resolveConflicts = useCallback((localUser: UserProfile, serverUser: UserProfile): UserProfile => {
    if (!localUser || !serverUser) return serverUser || localUser;
    
    // Use the most recent data
    const localTimestamp = new Date(localUser.lastActive).getTime();
    const serverTimestamp = new Date(serverUser.lastActive).getTime();
    
    // If server data is newer, use it as the base
    let mergedUser = serverTimestamp > localTimestamp ? { ...serverUser } : { ...localUser };
    
    // Special handling for closet items - merge them intelligently
    const closetMap = new Map<string, ClosetItem>();
    
    // Add all server items to the map
    serverUser.closet.forEach(item => {
      closetMap.set(item.id, item);
    });
    
    // Merge or override with local items based on timestamp
    localUser.closet.forEach(localItem => {
      const serverItem = closetMap.get(localItem.id);
      
      if (!serverItem) {
        // Item exists only locally, add it
        closetMap.set(localItem.id, localItem);
      } else {
        // Item exists in both - use the newer one
        const localItemTime = new Date(localItem.dateAdded).getTime();
        const serverItemTime = new Date(serverItem.dateAdded).getTime();
        
        if (localItemTime > serverItemTime) {
          closetMap.set(localItem.id, localItem);
        }
      }
    });
    
    // Convert map back to array
    mergedUser.closet = Array.from(closetMap.values());
    
    // Merge feedback data - use sets to avoid duplicates
    const likedItems = new Set([...serverUser.feedback.likedItems, ...localUser.feedback.likedItems]);
    const dislikedItems = new Set([...serverUser.feedback.dislikedItems, ...localUser.feedback.dislikedItems]);
    const viewedItems = new Set([...serverUser.feedback.viewedItems, ...localUser.feedback.viewedItems]);
    
    // For saved outfits, keep all from both sources (can refine this later)
    // This is a simple approach, could be enhanced with more sophisticated merging
    const savedOutfits = [...serverUser.feedback.savedOutfits];
    localUser.feedback.savedOutfits.forEach(localOutfit => {
      if (!savedOutfits.some(outfit => 
        outfit.length === localOutfit.length && 
        outfit.every(id => localOutfit.includes(id))
      )) {
        savedOutfits.push(localOutfit);
      }
    });
    
    // Update feedback with merged data
    mergedUser.feedback = {
      ...mergedUser.feedback,
      likedItems: Array.from(likedItems),
      dislikedItems: Array.from(dislikedItems),
      viewedItems: Array.from(viewedItems),
      savedOutfits,
      lastInteraction: new Date(Math.max(
        new Date(localUser.feedback.lastInteraction).getTime(),
        new Date(serverUser.feedback.lastInteraction).getTime()
      ))
    };
    
    return mergedUser;
  }, []);
  
  // Pull latest data from the server and merge with local state
  const syncWithServer = useCallback(async (userId: string): Promise<void> => {
    if (!userId) return;
    
    try {
      // Get user profile from server
      const serverUser = await apiClient.current.getUserProfile(userId);
      // Get local user profile from store
      const localUser = userStore.user;
      
      if (serverUser && localUser) {
        // Resolve conflicts and update local state
        const mergedUser = resolveConflicts(localUser, serverUser);
        userStore.setUser(mergedUser);
      } else if (serverUser) {
        // No local user, just use server data
        userStore.setUser(serverUser);
      } else if (localUser) {
        // No server user, upload local data
        console.log('Server user not found, will upload local data on next sync');
      }
      
      // Update last sync timestamp
      const now = Date.now();
      localStorage.setItem(SYNC_LAST_TIMESTAMP, now.toString());
      setState(prev => ({ ...prev, lastSyncTimestamp: now }));
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [userStore, resolveConflicts]);
  
  // Main sync function - processes the sync queue and syncs with server
  const syncData = useCallback(async () => {
    // Skip if already syncing or offline
    if (state.isSyncing || !navigator.onLine || !userStore.user) return;
    
    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      // Load the latest queue
      const queue = loadSyncQueue();
      const pendingItems = queue.filter(item => !item.resolved);
      
      if (pendingItems.length > 0) {
        // Process pending operations
        const updatedQueue = [...queue];
        
        for (const item of pendingItems) {
          // Skip if already resolved
          if (item.resolved) continue;
          
          // Try to execute the operation
          const success = await executeOperation(item);
          
          if (success) {
            // Mark as resolved if successful
            const index = updatedQueue.findIndex(q => q.id === item.id);
            if (index !== -1) {
              updatedQueue[index] = { ...updatedQueue[index], resolved: true };
            }
          } else {
            // Increment retry count if failed
            const index = updatedQueue.findIndex(q => q.id === item.id);
            if (index !== -1) {
              const retryCount = updatedQueue[index].retryCount + 1;
              // If retried too many times, mark as resolved to prevent endless retries
              const resolved = retryCount >= 5;
              updatedQueue[index] = { 
                ...updatedQueue[index], 
                retryCount,
                resolved
              };
            }
          }
        }
        
        // Save updated queue
        saveSyncQueue(updatedQueue);
        
        // Update state
        setState(prev => ({
          ...prev,
          syncQueue: updatedQueue,
          pendingOperations: updatedQueue.filter(item => !item.resolved).length
        }));
      }
      
      // Pull latest data from server and merge with local state
      await syncWithServer(userStore.user?.userId || '');
      
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing, userStore.user, loadSyncQueue, executeOperation, saveSyncQueue, syncWithServer]);
  
  // Set up periodic sync
  useEffect(() => {
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }
    
    syncIntervalRef.current = window.setInterval(() => {
      if (navigator.onLine && userStore.user) {
        syncData();
      }
    }, SYNC_INTERVAL);
    
    return () => {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncData, userStore.user]);
  
  // Public API for the hook
  return {
    state,
    syncNow: syncData,
    
    // Queue specific operations
    addClosetItem: (item: Omit<ClosetItem, 'id' | 'dateAdded'>, userId: string) => {
      queueOperation(SyncOperationType.ADD_CLOSET_ITEM, item, userId);
    },
    
    removeClosetItem: (itemId: string, userId: string) => {
      queueOperation(SyncOperationType.REMOVE_CLOSET_ITEM, { itemId }, userId);
    },
    
    updateClosetItem: (itemId: string, updates: Partial<ClosetItem>, userId: string) => {
      queueOperation(SyncOperationType.UPDATE_CLOSET_ITEM, { itemId, updates }, userId);
    },
    
    toggleFavorite: (itemId: string, favorite: boolean, userId: string) => {
      queueOperation(SyncOperationType.TOGGLE_FAVORITE, { itemId, favorite }, userId);
    },
    
    updatePreferences: (preferences: any, userId: string) => {
      queueOperation(SyncOperationType.UPDATE_PREFERENCES, preferences, userId);
    },
    
    submitQuiz: (answers: any, userId: string) => {
      queueOperation(SyncOperationType.SUBMIT_QUIZ, answers, userId);
    },
    
    saveOutfit: (outfit: any, userId: string) => {
      queueOperation(SyncOperationType.SAVE_OUTFIT, outfit, userId);
    },
    
    removeOutfit: (outfitId: string, userId: string) => {
      queueOperation(SyncOperationType.REMOVE_OUTFIT, { outfitId }, userId);
    }
  };
};

// Utility function to check if data needs to be synced
export const needsSync = (): boolean => {
  const lastSync = localStorage.getItem(SYNC_LAST_TIMESTAMP);
  if (!lastSync) return true;
  
  const lastSyncTime = parseInt(lastSync, 10);
  const now = Date.now();
  
  // Sync if more than 15 minutes have passed
  return now - lastSyncTime > 15 * 60 * 1000;
};

// Utility to get the status of the sync queue
export const getSyncStatus = (): { pendingCount: number, isOnline: boolean } => {
  const queueStr = localStorage.getItem(SYNC_QUEUE_KEY);
  let pendingCount = 0;
  
  if (queueStr) {
    try {
      const queue = JSON.parse(queueStr);
      pendingCount = queue.filter((item: SyncQueueItem) => !item.resolved).length;
    } catch (error) {
      console.error('Error parsing sync queue:', error);
    }
  }
  
  return { 
    pendingCount,
    isOnline: navigator.onLine
  };
};

// Utility to get sync data for specific user
export const getUserSyncData = (userId: string): any => {
  const key = `${SYNC_STORAGE_PREFIX}${userId}`;
  return getWithExpiry(key);
};

// Utility to store sync data for specific user
export const storeUserSyncData = (userId: string, data: any): void => {
  const key = `${SYNC_STORAGE_PREFIX}${userId}`;
  setWithExpiry(key, data, SYNC_EXPIRY);
};