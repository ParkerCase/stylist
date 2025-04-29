// Provider for data synchronization across the application
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSyncService, SyncState } from './syncService';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { useUserStore } from '../store/userStore';

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
  const syncService = useSyncService();
  const network = useNetworkStatus();
  const userStore = useUserStore();
  const [isMounted, setIsMounted] = useState(false);
  
  // Initial sync when the component mounts and user is available
  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    
    if (userStore.user && network.isOnline) {
      syncService.syncNow();
    }
  }, [isMounted, userStore.user, network.isOnline, syncService]);
  
  // Perform sync when coming back online
  useEffect(() => {
    if (network.isOnline && userStore.user) {
      // Slight delay to ensure stable connection
      const timer = setTimeout(() => {
        syncService.syncNow();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [network.isOnline, userStore.user, syncService]);
  
  // Perform sync on page visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && network.isOnline && userStore.user) {
        syncService.syncNow();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
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
  
  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export default SyncProvider;