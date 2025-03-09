// src/services/analytics/analyticsService.ts
import { AnalyticsEventType, trackEvent } from '@utils/analytics';

// Configure analytics provider
let analyticsInitialized = false;

/**
 * Initialize analytics
 */
export const initializeAnalytics = (): void => {
  if (analyticsInitialized) return;
  
  // Load analytics script
  const script = document.createElement('script');
  script.src = 'https://cdn.thestylist.ai/analytics.js';
  script.async = true;
  document.head.appendChild(script);
  
  // Set initialized flag
  analyticsInitialized = true;
};

/**
 * Track widget open event
 */
export const trackWidgetOpen = (userId: string): void => {
  trackEvent(AnalyticsEventType.WIDGET_OPEN, userId);
};

/**
 * Track widget close event
 */
export const trackWidgetClose = (userId: string): void => {
  trackEvent(AnalyticsEventType.WIDGET_CLOSE, userId);
};

/**
 * Track message sent event
 */
export const trackMessageSent = (userId: string, text: string): void => {
  trackEvent(AnalyticsEventType.MESSAGE_SENT, userId, { text });
};

/**
 * Track item view event
 */
export const trackItemView = (userId: string, itemId: string): void => {
  trackEvent(AnalyticsEventType.ITEM_VIEW, userId, { itemId });
};

/**
 * Track item feedback event
 */
export const trackItemFeedback = (userId: string, itemId: string, liked: boolean): void => {
  trackEvent(
    liked ? AnalyticsEventType.ITEM_LIKE : AnalyticsEventType.ITEM_DISLIKE, 
    userId, 
    { itemId }
  );
};

/**
 * Track outfit save event
 */
export const trackOutfitSave = (userId: string, outfitId: string): void => {
  trackEvent(AnalyticsEventType.OUTFIT_SAVE, userId, { outfitId });
};

/**
 * Track style quiz events
 */
export const trackStyleQuizStart = (userId: string): void => {
  trackEvent(AnalyticsEventType.STYLE_QUIZ_START, userId);
};

export const trackStyleQuizComplete = (userId: string): void => {
  trackEvent(AnalyticsEventType.STYLE_QUIZ_COMPLETE, userId);
};

export const trackStyleQuizAbandon = (userId: string): void => {
  trackEvent(AnalyticsEventType.STYLE_QUIZ_ABANDON, userId);
};

/**
 * Track error events
 */
export const trackError = (userId: string, errorMessage: string, errorCode?: string): void => {
  trackEvent(AnalyticsEventType.ERROR, userId, { 
    errorMessage, 
    errorCode 
  });
};