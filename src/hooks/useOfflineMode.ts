/**
 * useOfflineMode Hook
 * 
 * React hook for accessing offline mode functionality in components
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  addNetworkStatusListener, 
  getNetworkStatus, 
  setOfflineMode as setOfflineModeService,
  isOfflineModeEnabled as checkOfflineModeEnabled
} from '../services/offlineService';

interface UseOfflineModeReturn {
  isOnline: boolean;
  isOfflineMode: boolean;
  setOfflineMode: (enabled: boolean) => void;
  hasOfflineData: boolean;
  isNetworkError: boolean;
}

/**
 * Hook for managing offline mode in components
 * 
 * @param hasOfflineData Whether the component has offline data available
 * @returns Object with offline mode state and controls
 */
export const useOfflineMode = (
  hasOfflineData: boolean = false
): UseOfflineModeReturn => {
  // Track network status
  const [isOnline, setIsOnline] = useState<boolean>(getNetworkStatus());
  
  // Track manual offline mode
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(checkOfflineModeEnabled());
  
  // Track if a network error occurred
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);

  // Listen for network status changes
  useEffect(() => {
    // Add listener and get cleanup function
    const removeListener = addNetworkStatusListener((online: boolean) => {
      setIsOnline(online);
      
      // Reset network error when connection is restored
      if (online) {
        setIsNetworkError(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      removeListener();
    };
  }, []);

  // Handler for setting offline mode
  const setOfflineMode = useCallback((enabled: boolean) => {
    setOfflineModeService(enabled);
    setIsOfflineMode(enabled);
  }, []);

  // Handler for reporting network errors
  const reportNetworkError = useCallback(() => {
    setIsNetworkError(true);
  }, []);

  return {
    isOnline,
    isOfflineMode,
    setOfflineMode,
    hasOfflineData,
    isNetworkError
  };
};

export default useOfflineMode;