// Analytics utilities for tracking user interactions

// Define event types
export enum AnalyticsEventType {
    WIDGET_OPEN = 'widget_open',
    WIDGET_CLOSE = 'widget_close',
    WIDGET_MINIMIZE = 'widget_minimize',
    MESSAGE_SENT = 'message_sent',
    ITEM_VIEW = 'item_view',
    ITEM_LIKE = 'item_like',
    ITEM_DISLIKE = 'item_dislike',
    OUTFIT_VIEW = 'outfit_view',
    OUTFIT_LIKE = 'outfit_like',
    OUTFIT_DISLIKE = 'outfit_dislike',
    OUTFIT_SAVE = 'outfit_save',
    ADD_TO_WISHLIST = 'add_to_wishlist',
    ADD_TO_CART = 'add_to_cart',
    STYLE_QUIZ_START = 'style_quiz_start',
    STYLE_QUIZ_COMPLETE = 'style_quiz_complete',
    STYLE_QUIZ_ABANDON = 'style_quiz_abandon',
    TRY_ON_START = 'try_on_start',
    TRY_ON_COMPLETE = 'try_on_complete',
    TRY_ON_SAVED = 'try_on_saved',
    VIEW_LOOKBOOK = 'view_lookbook',
    ERROR = 'error'
  }
  
  // Analytics event structure
  export interface AnalyticsEvent {
    type: AnalyticsEventType;
    timestamp: Date;
    userId: string;
    sessionId: string;
    data?: Record<string, unknown>;
  }
  
  // Generate a unique session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };
  
  // Get or create a session ID
  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('stylist_session_id');
    
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('stylist_session_id', sessionId);
    }
    
    return sessionId;
  };
  
  // Track an analytics event
  export const trackEvent = (
    type: AnalyticsEventType,
    userId: string,
    data?: Record<string, unknown>
  ): void => {
    const event: AnalyticsEvent = {
      type,
      timestamp: new Date(),
      userId,
      sessionId: getSessionId(),
      data
    };
    
    // Log event to console in development
    // Only log in development 
    if (process.env.NODE_ENV !== 'production') {
      console.log('Analytics Event:', event);
    }
    
    // Queue event for sending to backend
    queueEvent(event);
  };
  
  // Queue of events to send
  let eventQueue: AnalyticsEvent[] = [];
  let isSending = false;
  
  // Queue an event for sending
  const queueEvent = (event: AnalyticsEvent): void => {
    eventQueue.push(event);
    
    // Start sending if not already in progress
    if (!isSending) {
      sendQueuedEvents();
    }
  };
  
  // Send queued events to backend
  const sendQueuedEvents = async (): Promise<void> => {
    if (eventQueue.length === 0) {
      isSending = false;
      return;
    }
    
    isSending = true;
    
    // Take a batch of events to send
    const batch = eventQueue.slice(0, 10);
    
    try {
      // Send events to backend
      const response = await fetch('https://api.thestylist.ai/api/v1/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: batch
        })
      });
      
      if (response.ok) {
        // Remove sent events from queue
        eventQueue = eventQueue.slice(batch.length);
      } else {
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (err) {
      // Only log in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to send analytics events:', err);
      }
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Continue with remaining events
    sendQueuedEvents();
  };
  