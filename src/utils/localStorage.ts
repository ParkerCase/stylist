// Utility functions for working with localStorage

// Check if localStorage is available
export const isLocalStorageAvailable = (): boolean => {
    const test = 'test';
    try {
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };
  
  // Get item from localStorage with expiry check
  export const getWithExpiry = <T>(key: string): T | null => {
    if (!isLocalStorageAvailable()) return null;
    
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    try {
      const item = JSON.parse(itemStr);
      
      // Check if item has expiry
      if (item.expiry && new Date().getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch {
      return null;
    }
  };
  
  // Set item in localStorage with expiry
  export const setWithExpiry = <T>(
    key: string,
    value: T,
    expiryInSeconds: number
  ): void => {
    if (!isLocalStorageAvailable()) return;
    
    const item = {
      value,
      expiry: new Date().getTime() + expiryInSeconds * 1000
    };
    
    localStorage.setItem(key, JSON.stringify(item));
  };
  
  // Remove item from localStorage
  export const removeItem = (key: string): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(key);
  };
  
  // Get user ID from localStorage or create a new one
  export const getUserId = (): string => {
    if (!isLocalStorageAvailable()) {
      return `anonymous_${Date.now()}`;
    }
    
    let userId = localStorage.getItem('stylist_user_id');
    
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('stylist_user_id', userId);
    }
    
    return userId;
  };
  
  // Set user ID in localStorage
  export const setUserId = (userId: string): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem('stylist_user_id', userId);
  };
  
  // Clear all Stylist-related localStorage items
  export const clearStylistStorage = (): void => {
    if (!isLocalStorageAvailable()) return;
    
    const stylistKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('stylist_')) {
        stylistKeys.push(key);
      }
    }
    
    stylistKeys.forEach((key) => localStorage.removeItem(key));
  };
  