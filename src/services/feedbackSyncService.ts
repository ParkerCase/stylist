// Feedback synchronization service
// This service periodically syncs locally stored feedback with the backend

import { createStylistApi } from '@/api';
import { useFeedbackStore } from '@/store/feedbackStore';
import { getUserId } from '@/utils/localStorage';
import { trackEvent, AnalyticsEventType } from '@/utils/analytics';

// Initialize lifecycle log
console.log('[LIFECYCLE:FeedbackSync] Module load started');

export class FeedbackSyncService {
  private syncIntervalId: number | null = null;
  private syncInterval = 60000; // 1 minute
  private isInitialized = false;
  private apiConfig: any = null;
  
  /**
   * Initialize the feedback sync service
   */
  initialize(apiConfig: any): void {
    console.log('[LIFECYCLE:FeedbackSync] Initialize called', {
      isAlreadyInitialized: this.isInitialized,
      apiKeyProvided: !!apiConfig?.apiKey,
      retailerIdProvided: !!apiConfig?.retailerId
    });

    if (this.isInitialized) {
      console.log('[LIFECYCLE:FeedbackSync] Already initialized, skipping');
      return;
    }

    console.log('[LIFECYCLE:FeedbackSync] Setting up service with config');
    this.apiConfig = apiConfig;
    this.isInitialized = true;

    // Register with the network online/offline events
    console.log('[LIFECYCLE:FeedbackSync] Adding online/offline event listeners');
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Delay sync initialization to avoid blocking initial render
    console.log('[LIFECYCLE:FeedbackSync] Setting initialization delay timeout (3000ms)');
    setTimeout(() => {
      console.log('[LIFECYCLE:FeedbackSync] Initialization delay completed, checking online status');
      // Check if currently online and start sync if needed
      if (navigator.onLine) {
        console.log('[LIFECYCLE:FeedbackSync] Device is online, starting sync interval');
        this.startSyncInterval();
      } else {
        console.log('[LIFECYCLE:FeedbackSync] Device is offline, deferring sync');
      }
    }, 3000); // 3-second delay to ensure widget loads smoothly
  }
  
  /**
   * Start the sync interval
   */
  private startSyncInterval(): void {
    console.log('[LIFECYCLE:FeedbackSync] startSyncInterval called', {
      hasExistingInterval: this.syncIntervalId !== null
    });

    if (this.syncIntervalId !== null) {
      console.log('[LIFECYCLE:FeedbackSync] Sync interval already active, skipping');
      return;
    }

    // Perform initial sync
    console.log('[LIFECYCLE:FeedbackSync] Performing initial feedback sync');
    this.syncFeedback();

    // Set up recurring sync
    console.log(`[LIFECYCLE:FeedbackSync] Setting up recurring sync every ${this.syncInterval}ms`);
    this.syncIntervalId = window.setInterval(() => {
      console.log('[LIFECYCLE:FeedbackSync] Recurring sync interval triggered');
      this.syncFeedback();
    }, this.syncInterval) as unknown as number;
  }

  /**
   * Stop the sync interval
   */
  private stopSyncInterval(): void {
    console.log('[LIFECYCLE:FeedbackSync] stopSyncInterval called', {
      hasActiveInterval: this.syncIntervalId !== null
    });

    if (this.syncIntervalId === null) {
      console.log('[LIFECYCLE:FeedbackSync] No active sync interval to stop');
      return;
    }

    console.log('[LIFECYCLE:FeedbackSync] Clearing sync interval');
    window.clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
    console.log('[LIFECYCLE:FeedbackSync] Sync interval stopped');
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('[LIFECYCLE:FeedbackSync] Online event detected');
    this.startSyncInterval();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('[LIFECYCLE:FeedbackSync] Offline event detected');
    this.stopSyncInterval();
  }
  
  /**
   * Sync feedback with the backend
   */
  async syncFeedback(): Promise<void> {
    console.log('[LIFECYCLE:FeedbackSync] syncFeedback called', {
      isInitialized: this.isInitialized,
      hasApiConfig: !!this.apiConfig
    });

    if (!this.isInitialized || !this.apiConfig) {
      console.log('[LIFECYCLE:FeedbackSync] Cannot sync - not initialized or missing config');
      return;
    }

    const feedbackStore = useFeedbackStore.getState();
    const pendingItems = feedbackStore.getPendingSyncItems();

    console.log('[LIFECYCLE:FeedbackSync] Pending feedback items:', pendingItems.length);

    // No items to sync
    if (pendingItems.length === 0) {
      console.log('[LIFECYCLE:FeedbackSync] No pending items to sync');
      return;
    }

    // Don't try to sync if already syncing
    if (feedbackStore.isSyncing) {
      console.log('[LIFECYCLE:FeedbackSync] Already syncing, skipping');
      return;
    }

    try {
      console.log('[LIFECYCLE:FeedbackSync] Starting sync process');
      feedbackStore.setIsSyncing(true);

      const userId = getUserId();
      console.log('[LIFECYCLE:FeedbackSync] Creating API client for sync');
      const api = createStylistApi(this.apiConfig);

      console.log('[LIFECYCLE:FeedbackSync] Sending sync request to API', {
        userId,
        itemCount: pendingItems.length
      });

      const response = await api.feedback.syncFeedback({
        userId,
        feedbackItems: pendingItems
      });

      console.log('[LIFECYCLE:FeedbackSync] Sync response received', {
        success: response.success,
        syncedCount: response.syncedItemIds?.length || 0
      });

      if (response.success && response.syncedItemIds.length > 0) {
        // Mark items as synced
        console.log('[LIFECYCLE:FeedbackSync] Marking items as synced');
        feedbackStore.markAsSynced(response.syncedItemIds);

        // Track successful sync
        console.log('[LIFECYCLE:FeedbackSync] Tracking sync event');
        trackEvent(AnalyticsEventType.FEEDBACK_SYNCED, userId, {
          count: response.syncedItemIds.length
        });
      }
    } catch (error) {
      console.error('[LIFECYCLE:FeedbackSync] Error syncing feedback:', error);
    } finally {
      console.log('[LIFECYCLE:FeedbackSync] Completing sync process');
      feedbackStore.setIsSyncing(false);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log('[LIFECYCLE:FeedbackSync] Cleanup called');

    this.stopSyncInterval();

    console.log('[LIFECYCLE:FeedbackSync] Removing event listeners');
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    this.isInitialized = false;
    console.log('[LIFECYCLE:FeedbackSync] Service marked as uninitialized');
  }
}

// Create singleton instance
export const feedbackSyncService = new FeedbackSyncService();