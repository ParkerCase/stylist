/**
 * Comprehensive Analytics System for the Stylist Application
 * 
 * This system integrates multiple analytics providers, manages user tracking consent,
 * captures structured events, and supports A/B testing.
 */

import { IS_PRODUCTION } from './environment';
import { AnalyticsEventType, AnalyticsEvent } from './analytics';
import { secureStore, secureRetrieve } from './security';

// Enum for analytics providers
export enum AnalyticsProvider {
  INTERNAL = 'internal',  // Our own backend
  SEGMENT = 'segment',    // Segment.io 
  GOOGLE = 'google',      // Google Analytics
  AMPLITUDE = 'amplitude', // Amplitude
  MIXPANEL = 'mixpanel'   // Mixpanel
}

// Structured event types for better typing
export interface UserEvent {
  userId: string;
  userAgent: string;
  deviceType: string;
  country?: string;
  language?: string;
  referrer?: string;
  anonymousId?: string;
}

export interface SessionEvent {
  sessionId: string;
  startTime: Date;
  duration?: number;
  isFirstSession: boolean;
  source?: string; 
  medium?: string;
  campaign?: string;
  landingPage?: string;
}

export interface FeatureUsageEvent {
  featureId: string;
  action: string;
  duration?: number;
  success?: boolean;
  parameters?: Record<string, unknown>;
}

export interface ConversionEvent {
  conversionType: string;
  value?: number;
  currency?: string;
  itemCount?: number;
  items?: any[];
  funnelStage?: string;
  conversionId?: string;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  errorCode?: string;
  stackTrace?: string;
  componentName?: string;
  recovered?: boolean;
}

export interface PerformanceEvent {
  metricName: string;
  value: number;
  unit: string;
  componentName?: string;
}

// Enhanced analytics event structure
export interface EnhancedAnalyticsEvent extends AnalyticsEvent {
  provider?: AnalyticsProvider;
  userInfo?: Partial<UserEvent>;
  sessionInfo?: Partial<SessionEvent>;
  featureInfo?: FeatureUsageEvent;
  conversionInfo?: ConversionEvent;
  errorInfo?: ErrorEvent;
  performanceInfo?: PerformanceEvent;
  experimentInfo?: ExperimentInfo;
  appInfo: {
    version: string;
    environment: string;
    buildId: string;
  };
}

// A/B Testing and Experimentation
export interface ExperimentInfo {
  experimentId: string;
  variant: string;
  segmentId?: string;
}

// Consent management
export enum ConsentCategory {
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  ANALYTICS = 'analytics',
  TARGETING = 'targeting',
  SOCIAL = 'social'
}

export interface ConsentSettings {
  essential: boolean; // Always true, can't be turned off
  functional: boolean;
  analytics: boolean;
  targeting: boolean;
  social: boolean;
  lastUpdated: Date;
}

// Default consent settings per region
const REGION_CONSENT_DEFAULTS: Record<string, Partial<ConsentSettings>> = {
  'EU': {
    essential: true,
    functional: false,
    analytics: false,
    targeting: false,
    social: false
  },
  'CA': {
    essential: true,
    functional: false,
    analytics: false,
    targeting: false,
    social: false
  },
  'US': {
    essential: true,
    functional: true,
    analytics: true,
    targeting: false,
    social: false
  },
  'default': {
    essential: true,
    functional: true,
    analytics: true,
    targeting: false,
    social: false
  }
};

// API keys and configuration for analytics providers
const ANALYTICS_PROVIDER_CONFIG = {
  [AnalyticsProvider.INTERNAL]: {
    endpoint: 'https://api.stylist-widget.com/api/v1/analytics/events',
    batchSize: 10,
    requiresConsent: false, // Essential for application functionality
    consentCategory: ConsentCategory.ESSENTIAL
  },
  [AnalyticsProvider.SEGMENT]: {
    apiKey: process.env.REACT_APP_SEGMENT_API_KEY || '',
    enabled: IS_PRODUCTION,
    requiresConsent: true,
    consentCategory: ConsentCategory.ANALYTICS
  },
  [AnalyticsProvider.GOOGLE]: {
    trackingId: process.env.REACT_APP_GA_TRACKING_ID || '',
    enabled: IS_PRODUCTION,
    requiresConsent: true,
    consentCategory: ConsentCategory.ANALYTICS
  },
  [AnalyticsProvider.AMPLITUDE]: {
    apiKey: process.env.REACT_APP_AMPLITUDE_API_KEY || '',
    enabled: false, // Not enabled by default
    requiresConsent: true,
    consentCategory: ConsentCategory.ANALYTICS
  },
  [AnalyticsProvider.MIXPANEL]: {
    apiKey: process.env.REACT_APP_MIXPANEL_TOKEN || '',
    enabled: false, // Not enabled by default
    requiresConsent: true,
    consentCategory: ConsentCategory.ANALYTICS
  }
};

// Main Analytics System class
export class AnalyticsSystem {
  private static instance: AnalyticsSystem;
  private initialized: boolean = false;
  private userId: string = '';
  private sessionId: string = '';
  private sessionStartTime: Date = new Date();
  private eventQueue: EnhancedAnalyticsEvent[] = [];
  private isSending: boolean = false;
  private flushInterval: number = 10000; // 10 seconds
  private flushIntervalId?: NodeJS.Timeout;
  private providers: AnalyticsProvider[] = [AnalyticsProvider.INTERNAL];
  private consentSettings: ConsentSettings;
  private deviceInfo: Partial<UserEvent> = {};
  private experiments: Record<string, string> = {}; // Experiment ID to variant mapping
  private appVersion: string = process.env.REACT_APP_VERSION || '1.0.0';
  private buildId: string = process.env.REACT_APP_BUILD_ID || 'development';
  
  // Private constructor for singleton pattern
  private constructor() {
    // Initialize with default consent based on region
    this.consentSettings = this.getDefaultConsentSettings();
    
    // Load consent settings from storage
    const storedConsent = secureRetrieve('analytics_consent');
    if (storedConsent) {
      try {
        const parsedConsent = JSON.parse(storedConsent) as ConsentSettings;
        this.consentSettings = {
          ...this.consentSettings,
          ...parsedConsent,
          // Essential is always true
          essential: true
        };
      } catch (error) {
        console.error('Error parsing stored consent settings', error);
      }
    }
    
    // Setup automatic flush interval
    this.flushIntervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);
    
    // Setup device info
    this.setupDeviceInfo();
  }
  
  /**
   * Get singleton instance of analytics system
   */
  public static getInstance(): AnalyticsSystem {
    if (!AnalyticsSystem.instance) {
      AnalyticsSystem.instance = new AnalyticsSystem();
    }
    return AnalyticsSystem.instance;
  }
  
  /**
   * Initialize the analytics system
   * @param userId User identifier
   * @param additionalProviders Optional additional analytics providers
   */
  public init(userId: string, additionalProviders: AnalyticsProvider[] = []): void {
    if (this.initialized) {
      return;
    }
    
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    
    // Add additional providers if enabled
    this.providers = [AnalyticsProvider.INTERNAL];
    additionalProviders.forEach(provider => {
      const config = ANALYTICS_PROVIDER_CONFIG[provider];
      // Handle different config types appropriately
      if (config) {
        if ('enabled' in config && config.enabled) {
          // Only add if enabled in config
          this.providers.push(provider);
        } else if ('endpoint' in config) {
          // For internal provider which doesn't have 'enabled' property
          this.providers.push(provider);
        }
      }
    });
    
    // Initialize third-party analytics if consent is given
    this.initializeProviders();
    
    this.initialized = true;
    
    // Track initialization as event
    this.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      isInitialLoad: true
    });
    
    // Load experiments
    this.loadExperiments();
    
    // Log initialization in development
    if (!IS_PRODUCTION) {
      console.log('[Analytics] Initialized with providers:', this.providers);
      console.log('[Analytics] Consent settings:', this.consentSettings);
    }
  }
  
  /**
   * Track an analytics event
   * @param type Event type
   * @param data Additional event data
   */
  public trackEvent(type: AnalyticsEventType, data?: Record<string, unknown>): void {
    if (!this.initialized) {
      console.warn('[Analytics] Attempted to track event before initialization');
      return;
    }
    
    const event: EnhancedAnalyticsEvent = {
      type,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      data,
      appInfo: {
        version: this.appVersion,
        environment: process.env.NODE_ENV || 'development',
        buildId: this.buildId
      },
      userInfo: { ...this.deviceInfo },
    };
    
    // Add active experiments if any
    if (Object.keys(this.experiments).length > 0) {
      event.experimentInfo = {
        experimentId: Object.keys(this.experiments)[0], // Most recent experiment
        variant: Object.values(this.experiments)[0]
      };
    }
    
    // Log event to console in development
    if (!IS_PRODUCTION) {
      console.log('[Analytics Event]:', event);
    }
    
    // Queue event for sending to all enabled providers
    this.queueEvent(event);
  }
  
  /**
   * Track feature usage
   */
  public trackFeatureUsage(
    featureId: string, 
    action: string, 
    parameters?: Record<string, unknown>
  ): void {
    this.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      featureInfo: {
        featureId,
        action,
        parameters,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Track conversion event (purchase, signup, etc.)
   */
  public trackConversion(
    conversionType: string,
    value?: number,
    items?: any[],
    additionalData?: Record<string, unknown>
  ): void {
    const conversionInfo: ConversionEvent = {
      conversionType,
      value,
      currency: 'USD', // Default currency
      itemCount: items?.length || 0,
      items,
      conversionId: `conv_${Date.now()}`,
      ...additionalData
    };
    
    this.trackEvent(AnalyticsEventType.ADD_TO_CART, {
      conversionInfo,
      ...additionalData
    });
  }
  
  /**
   * Track error event
   */
  public trackError(
    errorType: string,
    errorMessage: string,
    errorCode?: string,
    componentName?: string,
    stackTrace?: string
  ): void {
    this.trackEvent(AnalyticsEventType.ERROR, {
      errorInfo: {
        errorType,
        errorMessage,
        errorCode,
        componentName,
        stackTrace,
        recovered: false
      }
    });
  }
  
  /**
   * Track performance metric
   */
  public trackPerformance(
    metricName: string,
    value: number,
    unit: string = 'ms',
    componentName?: string
  ): void {
    this.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      performanceInfo: {
        metricName,
        value,
        unit,
        componentName
      }
    });
  }
  
  /**
   * Update user consent settings
   */
  public updateConsent(settings: Partial<ConsentSettings>): void {
    // Essential consent cannot be turned off
    const newSettings = {
      ...this.consentSettings,
      ...settings,
      essential: true,
      lastUpdated: new Date()
    };
    
    this.consentSettings = newSettings;
    
    // Save to storage
    secureStore('analytics_consent', JSON.stringify(newSettings));
    
    // Reinitialize providers based on new consent
    this.initializeProviders();
    
    // Track consent update
    this.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      consentUpdate: true,
      consentSettings: { ...newSettings, lastUpdated: newSettings.lastUpdated.toISOString() }
    });
  }
  
  /**
   * Get current consent settings
   */
  public getConsent(): ConsentSettings {
    return { ...this.consentSettings };
  }
  
  /**
   * Set user in experiment
   */
  public setExperiment(experimentId: string, variant: string): void {
    this.experiments[experimentId] = variant;
    
    // Save to storage
    secureStore('analytics_experiments', JSON.stringify(this.experiments));
    
    // Track experiment assignment
    this.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      experimentInfo: {
        experimentId,
        variant
      }
    });
  }
  
  /**
   * Get user's variant for experiment
   */
  public getExperimentVariant(experimentId: string): string | null {
    return this.experiments[experimentId] || null;
  }
  
  /**
   * Clean up resources on unmount
   */
  public cleanup(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
    
    // Flush remaining events
    this.flush(true);
  }
  
  /**
   * Flush events queue immediately
   */
  public flush(immediate: boolean = false): void {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    if (!this.isSending || immediate) {
      this.sendQueuedEvents();
    }
  }
  
  /**
   * Queue an event for sending
   */
  private queueEvent(event: EnhancedAnalyticsEvent): void {
    this.eventQueue.push(event);
    
    // Start sending if not already in progress
    if (!this.isSending && this.eventQueue.length >= ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.INTERNAL].batchSize) {
      this.sendQueuedEvents();
    }
  }
  
  /**
   * Send queued events to all enabled providers
   */
  private async sendQueuedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      this.isSending = false;
      return;
    }
    
    this.isSending = true;
    
    // Take a batch of events to send
    const batchSize = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.INTERNAL].batchSize;
    const batch = this.eventQueue.slice(0, batchSize);
    
    // Send to each provider
    await Promise.all(
      this.providers.map(provider => this.sendEventsToProvider(provider, batch))
    );
    
    // Remove sent events from queue
    this.eventQueue = this.eventQueue.slice(batch.length);
    
    // Continue with remaining events
    this.sendQueuedEvents();
  }
  
  /**
   * Send events to a specific provider
   */
  private async sendEventsToProvider(
    provider: AnalyticsProvider, 
    events: EnhancedAnalyticsEvent[]
  ): Promise<void> {
    const config = ANALYTICS_PROVIDER_CONFIG[provider];
    
    // Check consent for this provider
    const consentCategory = config.consentCategory;
    if (config.requiresConsent && !this.consentSettings[consentCategory]) {
      return;
    }
    
    try {
      switch (provider) {
        case AnalyticsProvider.INTERNAL:
          await this.sendToInternalApi(events);
          break;
          
        case AnalyticsProvider.SEGMENT:
          this.sendToSegment(events);
          break;
          
        case AnalyticsProvider.GOOGLE:
          this.sendToGoogleAnalytics(events);
          break;
          
        case AnalyticsProvider.AMPLITUDE:
          this.sendToAmplitude(events);
          break;
          
        case AnalyticsProvider.MIXPANEL:
          this.sendToMixpanel(events);
          break;
      }
    } catch (err) {
      if (!IS_PRODUCTION) {
        console.error(`Failed to send analytics events to ${provider}:`, err);
      }
      
      // Only retry internal API
      if (provider === AnalyticsProvider.INTERNAL) {
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  /**
   * Send events to internal API
   */
  private async sendToInternalApi(events: EnhancedAnalyticsEvent[]): Promise<void> {
    const endpoint = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.INTERNAL].endpoint;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.REACT_APP_STYLIST_API_KEY || ''
      },
      body: JSON.stringify({
        events
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send events to internal API: ${response.status}`);
    }
  }
  
  /**
   * Send events to Segment
   */
  private sendToSegment(events: EnhancedAnalyticsEvent[]): void {
    if (typeof window === 'undefined' || !window.analytics) {
      return;
    }
    
    events.forEach(event => {
      window.analytics.track(event.type, {
        ...event.data,
        userId: event.userId,
        timestamp: event.timestamp
      });
    });
  }
  
  /**
   * Send events to Google Analytics
   */
  private sendToGoogleAnalytics(events: EnhancedAnalyticsEvent[]): void {
    if (typeof window === 'undefined' || !window.gtag) {
      return;
    }
    
    events.forEach(event => {
      window.gtag('event', event.type, {
        ...event.data,
        send_to: ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.GOOGLE].trackingId,
        user_id: event.userId
      });
    });
  }
  
  /**
   * Send events to Amplitude
   */
  private sendToAmplitude(events: EnhancedAnalyticsEvent[]): void {
    if (typeof window === 'undefined' || !window.amplitude) {
      return;
    }
    
    events.forEach(event => {
      window.amplitude.getInstance().logEvent(event.type, {
        ...event.data,
        user_id: event.userId,
        session_id: event.sessionId
      });
    });
  }
  
  /**
   * Send events to Mixpanel
   */
  private sendToMixpanel(events: EnhancedAnalyticsEvent[]): void {
    if (typeof window === 'undefined' || !window.mixpanel) {
      return;
    }
    
    events.forEach(event => {
      window.mixpanel.track(event.type, {
        ...event.data,
        distinct_id: event.userId,
        $device_id: event.sessionId
      });
    });
  }
  
  /**
   * Initialize third-party analytics providers
   */
  private initializeProviders(): void {
    // Segment
    if (
      this.providers.includes(AnalyticsProvider.SEGMENT) && 
      this.consentSettings[ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.SEGMENT].consentCategory]
    ) {
      this.initializeSegment();
    }
    
    // Google Analytics
    if (
      this.providers.includes(AnalyticsProvider.GOOGLE) && 
      this.consentSettings[ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.GOOGLE].consentCategory]
    ) {
      this.initializeGoogleAnalytics();
    }
    
    // Amplitude
    if (
      this.providers.includes(AnalyticsProvider.AMPLITUDE) && 
      this.consentSettings[ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.AMPLITUDE].consentCategory]
    ) {
      this.initializeAmplitude();
    }
    
    // Mixpanel
    if (
      this.providers.includes(AnalyticsProvider.MIXPANEL) && 
      this.consentSettings[ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.MIXPANEL].consentCategory]
    ) {
      this.initializeMixpanel();
    }
  }
  
  /**
   * Initialize Segment analytics
   */
  private initializeSegment(): void {
    if (typeof window === 'undefined') return;
    
    const apiKey = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.SEGMENT].apiKey;
    if (!apiKey) return;
    
    // Add Segment snippet
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn.segment.com/analytics.js/v1/${apiKey}/analytics.min.js`;
    
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);
    
    // Initialize analytics
    (window.analytics = window.analytics || []);
    if (window.analytics.initialize) return;
    if (window.analytics.invoked) {
      if (!IS_PRODUCTION) {
        console.error('Segment snippet included twice.');
      }
      return;
    }
    
    window.analytics.invoked = true;
    window.analytics.methods = [
      'trackSubmit',
      'trackClick',
      'trackLink',
      'trackForm',
      'pageview',
      'identify',
      'reset',
      'group',
      'track',
      'ready',
      'alias',
      'debug',
      'page',
      'once',
      'off',
      'on',
      'addSourceMiddleware',
      'addIntegrationMiddleware',
      'setAnonymousId',
      'addDestinationMiddleware'
    ];
    
    window.analytics.factory = function(method) {
      return function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(method);
        window.analytics.push(args);
        return window.analytics;
      };
    };
    
    for (var i = 0; i < window.analytics.methods.length; i++) {
      var key = window.analytics.methods[i];
      window.analytics[key] = window.analytics.factory(key);
    }
    
    window.analytics.load = function(key, options) {
      if (document.getElementById('segment-io')) {
        return;
      }
      
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'segment-io';
      script.async = true;
      script.src = 'https://cdn.segment.com/analytics.js/v1/' + key + '/analytics.min.js';
      
      var first = document.getElementsByTagName('script')[0];
      first.parentNode?.insertBefore(script, first);
      window.analytics._loadOptions = options;
    };
    
    window.analytics._writeKey = apiKey;
    window.analytics.SNIPPET_VERSION = '4.15.3';
    window.analytics.load(apiKey);
    
    // Identify user if we have a user ID
    if (this.userId) {
      window.analytics.identify(this.userId);
    }
    
    // Track page view
    window.analytics.page();
  }
  
  /**
   * Initialize Google Analytics
   */
  private initializeGoogleAnalytics(): void {
    if (typeof window === 'undefined') return;
    
    const trackingId = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.GOOGLE].trackingId;
    if (!trackingId) return;
    
    // Add Google Analytics snippet
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', trackingId, {
      send_page_view: true,
      user_id: this.userId
    });
  }
  
  /**
   * Initialize Amplitude analytics
   */
  private initializeAmplitude(): void {
    if (typeof window === 'undefined') return;
    
    const apiKey = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.AMPLITUDE].apiKey;
    if (!apiKey) return;
    
    // Add Amplitude snippet
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.amplitude.com/libs/amplitude-8.5.0-min.gz.js';
    
    document.head.appendChild(script);
    
    script.onload = () => {
      if (window.amplitude) {
        window.amplitude.getInstance().init(apiKey, this.userId, {
          includeReferrer: true,
          includeUtm: true,
          includeGclid: true
        });
      }
    };
  }
  
  /**
   * Initialize Mixpanel analytics
   */
  private initializeMixpanel(): void {
    if (typeof window === 'undefined') return;
    
    const apiKey = ANALYTICS_PROVIDER_CONFIG[AnalyticsProvider.MIXPANEL].apiKey;
    if (!apiKey) return;
    
    // Add Mixpanel snippet
    (function(f, b) {
      if (!b.__SV) {
        var e, g, i, h;
        window.mixpanel = b;
        b._i = [];
        b.init = function(e, f, c) {
          function g(a, d) {
            var b = d.split('.');
            2 == b.length && ((a = a[b[0]]), (d = b[1]));
            a[d] = function() {
              a.push([d].concat(Array.prototype.slice.call(arguments, 0)));
            };
          }
          var a = b;
          'undefined' !== typeof c ? (a = b[c] = []) : (c = 'mixpanel');
          a.people = a.people || [];
          a.toString = function(a) {
            var d = 'mixpanel';
            'mixpanel' !== c && (d += '.' + c);
            a || (d += ' (stub)');
            return d;
          };
          a.people.toString = function() {
            return a.toString(1) + '.people (stub)';
          };
          i = 'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(
            ' '
          );
          for (h = 0; h < i.length; h++) g(a, i[h]);
          var j = 'set set_once union unset remove delete'.split(' ');
          a.get_group = function() {
            function b(c) {
              d[c] = function() {
                let call2_args = arguments;
                let call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                a.push([e, call2]);
              };
            }
            for (
              var d = {},
                e = ['get_group'].concat(Array.prototype.slice.call(arguments, 0)),
                c = 0;
              c < j.length;
              c++
            )
              b(j[c]);
            return d;
          };
          b._i.push([e, f, c]);
        };
        b.__SV = 1.2;
        e = f.createElement('script');
        e.type = 'text/javascript';
        e.async = !0;
        // Define MIXPANEL_CUSTOM_LIB_URL as undefined, since it's not defined anywhere else
        const MIXPANEL_CUSTOM_LIB_URL = undefined;
        e.src =
          'undefined' !== typeof MIXPANEL_CUSTOM_LIB_URL
            ? MIXPANEL_CUSTOM_LIB_URL as string
            : 'file:' === f.location.protocol &&
              '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'.match(/^\/\//)
            ? 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
            : '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
        g = f.getElementsByTagName('script')[0];
        g.parentNode?.insertBefore(e, g);
      }
    })(document, window.mixpanel || []);
    
    window.mixpanel.init(apiKey);
    
    // Identify user if we have a user ID
    if (this.userId) {
      window.mixpanel.identify(this.userId);
    }
  }
  
  /**
   * Get default consent settings based on user's region
   */
  private getDefaultConsentSettings(): ConsentSettings {
    const region = this.getUserRegion();
    const defaults = REGION_CONSENT_DEFAULTS[region] || REGION_CONSENT_DEFAULTS.default;
    
    return {
      essential: true, // Always required
      functional: defaults.functional || false,
      analytics: defaults.analytics || false,
      targeting: defaults.targeting || false,
      social: defaults.social || false,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Try to determine user's region for default consent
   */
  private getUserRegion(): string {
    if (typeof navigator === 'undefined') {
      return 'default';
    }
    
    const language = navigator.language || '';
    
    // Simple approach based on language - a more robust solution would use IP geolocation
    if (language.includes('en-US')) return 'US';
    if (language.includes('en-CA') || language.includes('fr-CA')) return 'CA';
    if (language.startsWith('de') || language.startsWith('fr') || language.startsWith('it') || 
        language.startsWith('es') || language.startsWith('nl') || language.startsWith('pt')) {
      return 'EU';
    }
    
    return 'default';
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Setup device information
   */
  private setupDeviceInfo(): void {
    if (typeof navigator === 'undefined') {
      return;
    }
    
    // Determine device type
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile';
      
      if (/iPad|tablet|Tablet/i.test(userAgent)) {
        deviceType = 'tablet';
      }
    }
    
    this.deviceInfo = {
      userAgent,
      deviceType,
      language: navigator.language,
      referrer: document.referrer,
      anonymousId: this.getUserAnonymousId()
    };
  }
  
  /**
   * Get or create anonymous user ID
   */
  private getUserAnonymousId(): string {
    let anonymousId = localStorage.getItem('stylist_anonymous_id');
    
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('stylist_anonymous_id', anonymousId);
    }
    
    return anonymousId;
  }
  
  /**
   * Load experiment assignments from storage
   */
  private loadExperiments(): void {
    const storedExperiments = secureRetrieve('analytics_experiments');
    if (storedExperiments) {
      try {
        this.experiments = JSON.parse(storedExperiments) || {};
      } catch (error) {
        console.error('Error parsing stored experiments', error);
        this.experiments = {};
      }
    }
  }
}

// Types for third-party libraries
declare global {
  interface Window {
    analytics?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    amplitude?: any;
    mixpanel?: any;
  }
}

// Export singleton instance
export const analytics = AnalyticsSystem.getInstance();

// Export legacy functions for backward compatibility
export const trackEvent = (
  type: AnalyticsEventType,
  userId: string,
  data?: Record<string, unknown>
): void => {
  analytics.trackEvent(type, data);
};