// Provider for data synchronization across the application
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSyncService, SyncState } from './syncService';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { useUserStore } from '../store/userStore';

// Initialize lifecycle log
console.log('[LIFECYCLE:SyncProvider] Module load started');

// Create context for sync service
interface SyncContextValue {
  syncState: SyncState;
  syncNow: () => void;
  isOnline: boolean;
  isSlowConnection: boolean;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};

// Provider component
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[LIFECYCLE:SyncProvider] Provider component rendering');

  const syncService = useSyncService();
  const network = useNetworkStatus();
  const userStore = useUserStore();
  const [isMounted, setIsMounted] = useState(false);

  // Add diagnostic task tracking
  const backgroundTasksStarted = useRef(false);
  const backgroundTasksCompleted = useRef(false);
  const maxSyncTimeout = useRef<NodeJS.Timeout | null>(null);

  console.log('[LIFECYCLE:SyncProvider] Initial state:', {
    isMounted,
    isOnline: network.isOnline,
    hasUser: !!userStore.user,
    syncState: syncService.state
  });

  // Initial sync when the component mounts and user is available
  useEffect(() => {
    console.log('[LIFECYCLE:SyncProvider] Initial sync effect running', {
      isMounted,
      isOnline: network.isOnline,
      hasUser: !!userStore.user
    });

    if (!isMounted) {
      console.log('[LIFECYCLE:SyncProvider] First mount detected, setting isMounted true');
      setIsMounted(true);
      return;
    }

    // Start tracking background initialization tasks
    if (!backgroundTasksStarted.current) {
      backgroundTasksStarted.current = true;
      console.log('[TASK:START] Background initialization tasks starting');

      // Set an absolute maximum timeout to ensure background tasks always complete
      maxSyncTimeout.current = setTimeout(() => {
        if (!backgroundTasksCompleted.current) {
          console.warn('[LIFECYCLE:SyncProvider] Maximum timeout reached, forcing background tasks completion');
          backgroundTasksCompleted.current = true;
          console.log('[TASK:COMPLETE] Background initialization tasks completed (forced by timeout)');

          // Set a global flag to indicate background initialization is complete
          if (window && typeof window !== 'undefined') {
            (window as any).__STYLIST_BACKGROUND_INIT_COMPLETE = true;
          }
        }
      }, 15000); // 15 seconds absolute maximum
    }

    // Defer sync operation to avoid blocking initial render
    console.log('[LIFECYCLE:SyncProvider] Setting initial sync timeout (2000ms)');
    const timer = setTimeout(() => {
      console.log('[LIFECYCLE:SyncProvider] Initial sync timeout fired, checking conditions');
      if (userStore.user && network.isOnline) {
        console.log('[LIFECYCLE:SyncProvider] Conditions met, triggering initial sync');
        syncService.syncNow();
      } else {
        console.log('[LIFECYCLE:SyncProvider] Initial sync skipped - offline or no user', {
          isOnline: network.isOnline,
          hasUser: !!userStore.user
        });
      }

      // After sync attempt, mark background tasks as complete if not already done
      if (!backgroundTasksCompleted.current) {
        setTimeout(() => {
          if (!backgroundTasksCompleted.current) {
            console.log('[LIFECYCLE:SyncProvider] Marking background tasks as complete after sync attempt');
            backgroundTasksCompleted.current = true;
            console.log('[TASK:COMPLETE] Background initialization tasks completed after sync');

            // Set a global flag to indicate background initialization is complete
            if (window && typeof window !== 'undefined') {
              (window as any).__STYLIST_BACKGROUND_INIT_COMPLETE = true;
            }
          }
        }, 5000); // 5 seconds after sync attempt
      }
    }, 2000); // 2-second delay to ensure other components load first

    return () => {
      console.log('[LIFECYCLE:SyncProvider] Cleaning up initial sync timer');
      clearTimeout(timer);
      if (maxSyncTimeout.current) {
        clearTimeout(maxSyncTimeout.current);
      }
    };
  }, [isMounted, userStore.user, network.isOnline, syncService]);

  // Perform sync when coming back online
  useEffect(() => {
    console.log('[LIFECYCLE:SyncProvider] Network status change effect', {
      isOnline: network.isOnline,
      hasUser: !!userStore.user
    });

    if (network.isOnline && userStore.user) {
      // Slight delay to ensure stable connection
      console.log('[LIFECYCLE:SyncProvider] Online detected, setting sync timeout (2000ms)');
      const timer = setTimeout(() => {
        console.log('[LIFECYCLE:SyncProvider] Online sync timeout fired, triggering sync');
        syncService.syncNow();
      }, 2000);

      return () => {
        console.log('[LIFECYCLE:SyncProvider] Cleaning up online sync timer');
        clearTimeout(timer);
      };
    }
  }, [network.isOnline, userStore.user, syncService]);

  // Perform sync on page visibility change (user returns to tab)
  useEffect(() => {
    console.log('[LIFECYCLE:SyncProvider] Setting up visibility change listener');

    const handleVisibilityChange = () => {
      console.log('[LIFECYCLE:SyncProvider] Visibility changed', {
        visibilityState: document.visibilityState,
        isOnline: network.isOnline,
        hasUser: !!userStore.user
      });

      if (document.visibilityState === 'visible' && network.isOnline && userStore.user) {
        console.log('[LIFECYCLE:SyncProvider] Tab became visible while online, triggering sync');
        syncService.syncNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[LIFECYCLE:SyncProvider] Removing visibility change listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [network.isOnline, userStore.user, syncService]);
  
  // Provide sync service to children
  const value: SyncContextValue = {
    syncState: syncService.state,
    syncNow: syncService.syncNow,
    isOnline: network.isOnline,
    isSlowConnection: network.isSlowConnection
  };

  console.log('[LIFECYCLE:SyncProvider] Rendering provider with sync state:', {
    isSyncing: syncService.state.isSyncing,
    pendingOperations: syncService.state.pendingOperations,
    isOnline: network.isOnline,
    lastSyncTimestamp: syncService.state.lastSyncTimestamp ?
      new Date(syncService.state.lastSyncTimestamp).toISOString() : null
  });

  // Add effect to set render complete flag
  useEffect(() => {
    // Ensure we set the render complete flag after component has mounted
    const timer = setTimeout(() => {
      console.log('[LIFECYCLE:SyncProvider] Setting widget render complete flag');

      // Set global flag to indicate widget is fully rendered
      if (window && typeof window !== 'undefined') {
        (window as any).__STYLIST_WIDGET_RENDER_COMPLETE = true;

        // Log a diagnostic message
        console.log('[RENDER:COMPLETE] Widget rendering completed');
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <SyncContext.Provider value={value}>
      {(() => {
        console.log('[LIFECYCLE:SyncProvider] Before rendering children');
        return null;
      })()}
      {children}
      {(() => {
        console.log('[LIFECYCLE:SyncProvider] After rendering children');
        return null;
      })()}
    </SyncContext.Provider>
  );
};

export default SyncProvider;