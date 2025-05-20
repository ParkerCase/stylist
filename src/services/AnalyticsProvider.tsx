/**
 * Analytics Provider Component
 * 
 * This component provides a context for the analytics and experiment systems
 * and initializes them with the current user information.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { analytics } from '../utils/analyticsSystem';
import { experiments } from '../utils/experimentSystem';
import { IS_PRODUCTION } from '../utils/environment';
// Import from a more reliable source
import { AnalyticsEventType } from '../utils/analytics';

// Context type
interface AnalyticsContextType {
  trackEvent: (eventType: AnalyticsEventType, data?: Record<string, unknown>) => void;
  trackFeatureUsage: (featureId: string, action: string, parameters?: Record<string, unknown>) => void;
  trackConversion: (conversionType: string, value?: number, items?: any[], additionalData?: Record<string, unknown>) => void;
  trackError: (errorType: string, errorMessage: string, errorCode?: string, componentName?: string, stackTrace?: string) => void;
  trackPerformance: (metricName: string, value: number, unit?: string, componentName?: string) => void;
  getExperimentVariant: (experimentId: string) => string | null;
  setUserAttribute: (key: string, value: any) => void;
  updateConsentSettings: (settings: Record<string, boolean>) => void;
  isInitialized: boolean;
  isConsentRequired: boolean;
  isConsented: boolean;
}

// Create context with default values
const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
  trackFeatureUsage: () => {},
  trackConversion: () => {},
  trackError: () => {},
  trackPerformance: () => {},
  getExperimentVariant: () => null,
  setUserAttribute: () => {},
  updateConsentSettings: () => {},
  isInitialized: false,
  isConsentRequired: false,
  isConsented: false
});

// Props for provider component
interface AnalyticsProviderProps {
  children: ReactNode;
  userId?: string;
  environmentAttributes?: Record<string, any>;
}

/**
 * Analytics Provider Component
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children, 
  userId,
  environmentAttributes = {} 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConsented, setIsConsented] = useState(false);
  const [isConsentRequired, setIsConsentRequired] = useState(false);
  
  // Initialize analytics and experiments
  useEffect(() => {
    // Skip initialization if no user ID
    if (!userId) return;
    
    // Get device and environment information
    const deviceAttributes = getDeviceAttributes();
    
    // Initialize analytics
    analytics.init(userId);
    
    // Initialize experiments
    experiments.init(userId, {
      ...deviceAttributes,
      ...environmentAttributes
    });
    
    // Check consent status
    const consentSettings = analytics.getConsent();
    setIsConsented(consentSettings.analytics);
    
    // Detect if in EU/region requiring explicit consent
    setIsConsentRequired(
      consentSettings.functional === false || 
      consentSettings.analytics === false
    );
    
    // Track page load
    analytics.trackEvent(AnalyticsEventType.WIDGET_OPEN, {
      isPageLoad: true,
      url: window.location.href,
      referrer: document.referrer,
      title: document.title
    });
    
    // Set init flag
    setIsInitialized(true);
    
    // Cleanup on unmount
    return () => {
      analytics.cleanup();
    };
  }, [userId, environmentAttributes]);
  
  // Track performance metrics for render times
  useEffect(() => {
    if (!isInitialized) return;
    
    // Use PerformanceObserver to track render and load times
    if (typeof PerformanceObserver !== 'undefined') {
      // Track paint metrics (FCP, LCP)
      const paintObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach(entry => {
          analytics.trackPerformance(
            entry.name,
            entry.startTime,
            'ms',
            'Core Web Vitals'
          );
        });
      });
      
      // Track layout shifts (CLS)
      const layoutObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach(entry => {
          analytics.trackPerformance(
            'CumulativeLayoutShift',
            (entry as any).value, // Type casting as LayoutShift
            'score',
            'Core Web Vitals'
          );
        });
      });
      
      // Start observers
      try {
        paintObserver.observe({ type: 'paint', buffered: true });
        layoutObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Some browsers might not support all types
        if (!IS_PRODUCTION) {
          console.warn('Could not observe all performance metrics:', e);
        }
      }
      
      // Cleanup
      return () => {
        paintObserver.disconnect();
        layoutObserver.disconnect();
      };
    }
  }, [isInitialized]);
  
  // Context value
  const contextValue: AnalyticsContextType = {
    trackEvent: (eventType, data) => {
      if (isInitialized) {
        analytics.trackEvent(eventType, data);
      }
    },
    trackFeatureUsage: (featureId, action, parameters) => {
      if (isInitialized) {
        analytics.trackFeatureUsage(featureId, action, parameters);
      }
    },
    trackConversion: (conversionType, value, items, additionalData) => {
      if (isInitialized) {
        analytics.trackConversion(conversionType, value, items, additionalData);
      }
    },
    trackError: (errorType, errorMessage, errorCode, componentName, stackTrace) => {
      if (isInitialized) {
        analytics.trackError(errorType, errorMessage, errorCode, componentName, stackTrace);
      }
    },
    trackPerformance: (metricName, value, unit, componentName) => {
      if (isInitialized) {
        analytics.trackPerformance(metricName, value, unit, componentName);
      }
    },
    getExperimentVariant: (experimentId) => {
      if (!isInitialized) return null;
      return experiments.getVariant(experimentId);
    },
    setUserAttribute: (key, value) => {
      if (isInitialized) {
        experiments.setUserAttribute(key, value);
      }
    },
    updateConsentSettings: (settings) => {
      if (isInitialized) {
        analytics.updateConsent(settings);
        setIsConsented(settings.analytics || false);
      }
    },
    isInitialized,
    isConsentRequired,
    isConsented
  };
  
  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Hook to use analytics throughout the app
 */
export const useAnalytics = () => useContext(AnalyticsContext);

/**
 * Get device and browser information
 */
function getDeviceAttributes(): Record<string, any> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'unknown',
      browser: 'unknown',
      os: 'unknown',
      screenSize: 'unknown'
    };
  }
  
  // Detect device type
  let deviceType = 'desktop';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    deviceType = 'mobile';
    
    if (/iPad|tablet|Tablet/i.test(navigator.userAgent)) {
      deviceType = 'tablet';
    }
  }
  
  // Detect browser
  let browser = 'unknown';
  if (/Chrome/i.test(navigator.userAgent)) browser = 'chrome';
  else if (/Firefox/i.test(navigator.userAgent)) browser = 'firefox';
  else if (/Safari/i.test(navigator.userAgent)) browser = 'safari';
  else if (/Edge/i.test(navigator.userAgent)) browser = 'edge';
  else if (/MSIE|Trident/i.test(navigator.userAgent)) browser = 'ie';
  
  // Detect OS
  let os = 'unknown';
  if (/Windows/i.test(navigator.userAgent)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(navigator.userAgent)) os = 'mac';
  else if (/Linux/i.test(navigator.userAgent)) os = 'linux';
  else if (/Android/i.test(navigator.userAgent)) os = 'android';
  else if (/iOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) os = 'ios';
  
  // Detect screen size
  let screenSize = 'unknown';
  const width = window.innerWidth;
  if (width < 576) screenSize = 'xs';
  else if (width < 768) screenSize = 'sm';
  else if (width < 992) screenSize = 'md';
  else if (width < 1200) screenSize = 'lg';
  else screenSize = 'xl';
  
  return {
    deviceType,
    browser,
    os,
    screenSize,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isOnline: navigator.onLine,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

/**
 * Error boundary that tracks errors in analytics
 */
export class AnalyticsErrorBoundary extends React.Component<{
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
}> {
  state = { hasError: false, error: null };
  
  static contextType = AnalyticsContext;
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error in analytics
    const analyticsContext = this.context as AnalyticsContextType;
    analyticsContext.trackError(
      'react_error',
      error.message,
      error.name,
      this.props.componentName,
      errorInfo.componentStack
    );
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }
    
    return this.props.children;
  }
}