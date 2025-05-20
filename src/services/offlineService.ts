/**
 * Offline Service
 * 
 * Provides offline capabilities for the Stylist application including:
 * - Network status detection and monitoring
 * - Offline data storage and retrieval
 * - Data synchronization when connection is restored
 * - Offline mode UI state management
 */

import { debugLog } from '../utils/debugMode';

// Keys for offline storage
const STORAGE_KEYS = {
  PENDING_REQUESTS: 'stylist_pending_requests',
  OFFLINE_DATA: 'stylist_offline_data',
  OFFLINE_MODE: 'stylist_offline_mode'
};

// Types for offline data
type PendingRequest = {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
};

type OfflineData = {
  recommendations: any[];
  userPreferences: any;
  recentItems: any[];
  cachedProducts: Record<string, any>;
  lastUpdated: number;
};

// Network status and event management
let isOnline = navigator.onLine;
const listeners: Array<(online: boolean) => void> = [];

// Initialize offline data structure
const defaultOfflineData: OfflineData = {
  recommendations: [],
  userPreferences: null,
  recentItems: [],
  cachedProducts: {},
  lastUpdated: Date.now()
};

/**
 * Initialize the offline service
 */
export const initOfflineService = (): void => {
  debugLog('Initializing offline service');
  
  // Set up network status event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Check if there are any pending requests to process
  processPendingRequests();
};

/**
 * Clean up the offline service
 */
export const cleanupOfflineService = (): void => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  listeners.length = 0;
};

/**
 * Handle coming back online
 */
const handleOnline = (): void => {
  debugLog('Network connection restored');
  isOnline = true;
  
  // Notify all listeners
  listeners.forEach(listener => listener(true));
  
  // Process any pending requests
  processPendingRequests();
};

/**
 * Handle going offline
 */
const handleOffline = (): void => {
  debugLog('Network connection lost');
  isOnline = false;
  
  // Notify all listeners
  listeners.forEach(listener => listener(false));
};

/**
 * Add a network status change listener
 * @param listener Function to call when network status changes
 * @returns Function to remove the listener
 */
export const addNetworkStatusListener = (
  listener: (online: boolean) => void
): (() => void) => {
  listeners.push(listener);
  
  // Immediately call with current status
  listener(isOnline);
  
  // Return a function to remove the listener
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * Check if the device is currently online
 * @returns Current online status
 */
export const getNetworkStatus = (): boolean => {
  return isOnline;
};

/**
 * Save data for offline use
 * @param key The key in the offline data structure to update
 * @param data The data to save
 * @returns Promise that resolves when data is saved
 */
export const saveOfflineData = async <K extends keyof OfflineData>(
  key: K,
  data: OfflineData[K]
): Promise<void> => {
  try {
    // Get current offline data
    const offlineData = await getOfflineData();
    
    // Update with new data
    offlineData[key] = data;
    offlineData.lastUpdated = Date.now();
    
    // Save back to storage
    localStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(offlineData));
    debugLog(`Saved offline data for key: ${key}`);
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
};

/**
 * Get all offline data
 * @returns The offline data
 */
export const getOfflineData = async (): Promise<OfflineData> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_DATA);
    return data ? JSON.parse(data) : { ...defaultOfflineData };
  } catch (error) {
    console.error('Failed to get offline data:', error);
    return { ...defaultOfflineData };
  }
};

/**
 * Queue a request to be processed when online
 * @param request The request to queue
 * @returns Promise that resolves with request ID
 */
export const queueRequest = async (
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>,
  maxRetries = 5
): Promise<string> => {
  try {
    // Create a new pending request
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pendingRequest: PendingRequest = {
      id,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };
    
    // Get current pending requests
    const pendingRequests = await getPendingRequests();
    
    // Add to pending requests
    pendingRequests.push(pendingRequest);
    
    // Save back to storage
    localStorage.setItem(STORAGE_KEYS.PENDING_REQUESTS, JSON.stringify(pendingRequests));
    debugLog(`Queued request for later processing: ${method} ${url}`);
    
    return id;
  } catch (error) {
    console.error('Failed to queue request:', error);
    throw error;
  }
};

/**
 * Get all pending requests
 * @returns Array of pending requests
 */
export const getPendingRequests = async (): Promise<PendingRequest[]> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_REQUESTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get pending requests:', error);
    return [];
  }
};

/**
 * Process all pending requests
 * @returns Promise that resolves when all requests are processed
 */
export const processPendingRequests = async (): Promise<void> => {
  if (!isOnline) {
    debugLog('Cannot process pending requests while offline');
    return;
  }
  
  try {
    const pendingRequests = await getPendingRequests();
    
    if (pendingRequests.length === 0) {
      return;
    }
    
    debugLog(`Processing ${pendingRequests.length} pending requests`);
    
    // Process each request
    const results = await Promise.allSettled(
      pendingRequests.map(async (request) => {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body ? JSON.stringify(request.body) : undefined,
          });
          
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          
          return request.id;
        } catch (error) {
          // If max retries not reached, keep in queue with incremented retry count
          if (request.retryCount < request.maxRetries) {
            request.retryCount++;
            return null; // null means keep in queue
          }
          
          // Otherwise, remove from queue
          return request.id;
        }
      })
    );
    
    // Filter out successful requests and those that exceeded max retries
    const successfulRequestIds = results
      .map((result, index) => 
        result.status === 'fulfilled' && result.value !== null
          ? result.value
          : null
      )
      .filter(Boolean) as string[];
    
    // Update pending requests
    const updatedPendingRequests = pendingRequests.filter(
      request => !successfulRequestIds.includes(request.id)
    );
    
    // Save back to storage
    localStorage.setItem(
      STORAGE_KEYS.PENDING_REQUESTS, 
      JSON.stringify(updatedPendingRequests)
    );
    
    debugLog(`Processed ${successfulRequestIds.length} pending requests successfully`);
  } catch (error) {
    console.error('Failed to process pending requests:', error);
  }
};

/**
 * Set the application's offline mode
 * @param enabled Whether offline mode should be enabled
 */
export const setOfflineMode = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(enabled));
    debugLog(`Offline mode ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to set offline mode:', error);
  }
};

/**
 * Check if offline mode is enabled
 * @returns Whether offline mode is enabled
 */
export const isOfflineModeEnabled = (): boolean => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Failed to check offline mode:', error);
    return false;
  }
};

/**
 * Clear all offline data
 */
export const clearOfflineData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA);
    localStorage.removeItem(STORAGE_KEYS.PENDING_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_MODE);
    debugLog('Cleared all offline data');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
  }
};

// Create a fetch wrapper for offline-enabled API calls
export const offlineFetch = async (
  url: string,
  options: RequestInit = {},
  offlineOptions?: {
    offlineable?: boolean;
    timeout?: number;
    offlineData?: any;
  }
): Promise<Response> => {
  const {
    offlineable = true,
    timeout = 10000,
    offlineData = null
  } = offlineOptions || {};
  
  // If we're online, try to fetch
  if (isOnline) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeout);
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ]);
      
      // If fetch succeeded and this is an offlineable request, cache the data
      if (response.ok && offlineable && options.method?.toUpperCase() === 'GET') {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          // Cache based on URL path segments
          const urlPath = new URL(url).pathname;
          const segments = urlPath.split('/').filter(Boolean);
          
          if (segments.length > 0) {
            // Determine which offline data category to use based on URL
            if (urlPath.includes('recommendations')) {
              await saveOfflineData('recommendations', data);
            } else if (urlPath.includes('products')) {
              const offlineData = await getOfflineData();
              const productId = segments[segments.length - 1];
              offlineData.cachedProducts[productId] = data;
              await saveOfflineData('cachedProducts', offlineData.cachedProducts);
            }
          }
        } catch (error) {
          console.error('Failed to cache response:', error);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Fetch failed:', error);
      
      // If fetch failed and this is a write operation, queue it for later
      if (offlineable && options.method?.toUpperCase() !== 'GET') {
        await queueRequest(
          url,
          options.method || 'GET',
          options.body,
          options.headers as Record<string, string>
        );
      }
      
      // Fall through to offline handling
    }
  }
  
  // If we're offline or fetch failed, handle offline
  if (offlineable) {
    const offlineResponse = await handleOfflineRequest(url, options, offlineData);
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // If we couldn't handle it offline, throw a network error
  throw new Error('Network request failed and no offline data available');
};

/**
 * Handle a request while offline
 * @param url The request URL
 * @param options The request options
 * @param offlineData Optional offline data to use
 * @returns A Response object or null if the request can't be handled offline
 */
const handleOfflineRequest = async (
  url: string,
  options: RequestInit,
  offlineData: any
): Promise<Response | null> => {
  // If explicit offline data was provided, use that
  if (offlineData !== null) {
    return new Response(JSON.stringify(offlineData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Otherwise, try to find cached data
  const urlPath = new URL(url).pathname;
  const data = await getOfflineData();
  
  // GET requests can be served from cache
  if (options.method?.toUpperCase() === 'GET') {
    if (urlPath.includes('recommendations')) {
      return new Response(JSON.stringify(data.recommendations), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (urlPath.includes('products')) {
      const segments = urlPath.split('/').filter(Boolean);
      const productId = segments[segments.length - 1];
      
      if (data.cachedProducts[productId]) {
        return new Response(JSON.stringify(data.cachedProducts[productId]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } else {
    // Non-GET requests are queued for later
    await queueRequest(
      url,
      options.method || 'GET',
      options.body,
      options.headers as Record<string, string>
    );
    
    // Return a fake successful response
    return new Response(JSON.stringify({ queued: true }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // If we couldn't handle it, return null
  return null;
};

// Export a hook-friendly object
export const offlineService = {
  initOfflineService,
  cleanupOfflineService,
  addNetworkStatusListener,
  getNetworkStatus,
  saveOfflineData,
  getOfflineData,
  queueRequest,
  processPendingRequests,
  setOfflineMode,
  isOfflineModeEnabled,
  clearOfflineData,
  offlineFetch
};