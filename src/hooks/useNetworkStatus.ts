// Hook for detecting and managing network connectivity status
import { useState, useEffect, useCallback } from 'react';

interface NetworkStatusState {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string | null;
  lastChecked: number;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatusState>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    effectiveType: null,
    lastChecked: Date.now()
  });

  // Update connection quality information if available
  const updateConnectionQuality = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      setStatus(prev => ({
        ...prev,
        isSlowConnection: connection.effectiveType === 'slow-2g' || 
                         connection.effectiveType === '2g' ||
                         connection.saveData === true,
        effectiveType: connection.effectiveType,
        lastChecked: Date.now()
      }));
    }
  }, []);

  // Handle online status change
  const handleOnline = useCallback(() => {
    setStatus(prev => ({ 
      ...prev, 
      isOnline: true,
      lastChecked: Date.now()
    }));
    updateConnectionQuality();
  }, [updateConnectionQuality]);

  // Handle offline status change
  const handleOffline = useCallback(() => {
    setStatus(prev => ({ 
      ...prev, 
      isOnline: false,
      lastChecked: Date.now()
    }));
  }, []);

  // Handle connection change events
  const handleConnectionChange = useCallback(() => {
    updateConnectionQuality();
  }, [updateConnectionQuality]);

  // Set up event listeners for network status changes
  useEffect(() => {
    // Initial check
    updateConnectionQuality();
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Add connection change listener if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', handleConnectionChange);
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, updateConnectionQuality]);

  // Manual check function
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a tiny resource to verify connectivity
      // This is more reliable than just checking navigator.onLine
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const isConnected = response.ok;
      
      setStatus(prev => ({
        ...prev,
        isOnline: isConnected,
        lastChecked: Date.now()
      }));
      
      return isConnected;
    } catch (_) {
      // If fetch fails, we're likely offline
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastChecked: Date.now()
      }));
      
      return false;
    }
  }, []);

  return {
    ...status,
    checkConnection
  };
};

export default useNetworkStatus;