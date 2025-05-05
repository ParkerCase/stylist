// Purchase tracking service for the stylist widget

interface PurchaseTracking {
  productId: string;
  source: string;
  timestamp: Date;
  userId?: string;
  retailerId?: string;
}

// Track purchases in localStorage
const STORAGE_KEY = 'stylist_purchase_tracking';

export const purchaseTrackingService = {
  // Track a new purchase
  async trackPurchase(data: PurchaseTracking): Promise<boolean> {
    try {
      // Save to API
      const success = await this.savePurchaseToAPI(data);
      
      // Always save to localStorage as backup
      this.savePurchaseToLocalStorage(data);
      
      return success;
    } catch (error) {
      console.error('Error tracking purchase:', error);
      
      // Save to localStorage on API failure
      this.savePurchaseToLocalStorage(data);
      
      return false;
    }
  },
  
  // Save purchase tracking data to the API
  async savePurchaseToAPI(data: PurchaseTracking): Promise<boolean> {
    try {
      const response = await fetch('/api/trackPurchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save purchase to API:', error);
      return false;
    }
  },
  
  // Save purchase tracking data to localStorage
  savePurchaseToLocalStorage(data: PurchaseTracking): void {
    try {
      // Get existing data
      const existingData = this.getPurchasesFromLocalStorage();
      
      // Add new purchase tracking
      existingData.push(data);
      
      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('Failed to save purchase to localStorage:', error);
    }
  },
  
  // Get all tracked purchases from localStorage
  getPurchasesFromLocalStorage(): PurchaseTracking[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get purchases from localStorage:', error);
      return [];
    }
  },
  
  // Clear all purchase tracking data from localStorage
  clearPurchasesFromLocalStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear purchases from localStorage:', error);
    }
  }
};

export default purchaseTrackingService;