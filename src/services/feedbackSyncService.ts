// Feedback synchronization service
// This service periodically syncs locally stored feedback with the backend

import { createStylistApi } from '@/api';
import { useFeedbackStore } from '@/store/feedbackStore';
import { getUserId } from '@/utils/localStorage';
import { trackEvent, AnalyticsEventType } from '@/utils/analytics';

export class FeedbackSyncService {
  private syncIntervalId: number | null = null;
  private syncInterval = 60000; // 1 minute
  private isInitialized = false;
  private apiConfig: any = null;
  
  /**
   * Initialize the feedback sync service
   */
  initialize(apiConfig: any): void {
    if (this.isInitialized) return;
    
    this.apiConfig = apiConfig;
    this.isInitialized = true;
    
    // Register with the network online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Check if currently online and start sync if needed
    if (navigator.onLine) {
      this.startSyncInterval();
    }
  }
  
  /**
   * Start the sync interval
   */
  private startSyncInterval(): void {
    if (this.syncIntervalId !== null) return;
    
    // Perform initial sync
    this.syncFeedback();
    
    // Set up recurring sync
    this.syncIntervalId = window.setInterval(() => {
      this.syncFeedback();
    }, this.syncInterval) as unknown as number;
  }
  
  /**
   * Stop the sync interval
   */
  private stopSyncInterval(): void {
    if (this.syncIntervalId === null) return;
    
    window.clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
  }
  
  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.startSyncInterval();
  }
  
  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.stopSyncInterval();
  }
  
  /**
   * Sync feedback with the backend
   */
  async syncFeedback(): Promise<void> {
    if (!this.isInitialized || !this.apiConfig) return;
    
    const feedbackStore = useFeedbackStore.getState();
    const pendingItems = feedbackStore.getPendingSyncItems();
    
    // No items to sync
    if (pendingItems.length === 0) return;
    
    // Don't try to sync if already syncing
    if (feedbackStore.isSyncing) return;
    
    try {
      feedbackStore.setIsSyncing(true);
      
      const userId = getUserId();
      const api = createStylistApi(this.apiConfig);
      
      const response = await api.feedback.syncFeedback({
        userId,
        feedbackItems: pendingItems
      });
      
      if (response.success && response.syncedItemIds.length > 0) {
        // Mark items as synced
        feedbackStore.markAsSynced(response.syncedItemIds);
        
        // Track successful sync
        trackEvent(AnalyticsEventType.FEEDBACK_SYNCED, userId, {
          count: response.syncedItemIds.length
        });
      }
    } catch (error) {
      console.error('Error syncing feedback:', error);
    } finally {
      feedbackStore.setIsSyncing(false);
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopSyncInterval();
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.isInitialized = false;
  }
}

// Create singleton instance
export const feedbackSyncService = new FeedbackSyncService();