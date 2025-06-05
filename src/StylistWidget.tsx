// The Stylist Widget main component

import React, { useEffect, useRef, useState } from 'react';
import SyncStatusIndicator from '@/components/common/SyncStatusIndicator';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import DemoGuide from '@/components/DemoGuide';
import MockDataToggle from '@/components/common/MockDataToggle';
import { useChatStore } from '@/store/index';
import { SyncProvider } from '@/services/SyncProvider';
import { feedbackSyncService } from '@/services/feedbackSyncService';
import { offlineService } from '@/services/offlineService';
import DebugModeToggle from '@/components/common/DebugModeToggle';
import { USE_LAZY_LOADING, USE_PARALLEL_INIT } from './index';
import './styles/global.scss';

// Import diagnostics tools
import {
  logComponentRender,
  logGlobalFlag
} from './diagnostics';
import {
  useDiagnosticLifecycle,
  useDiagnosticEffect,
  monitoredLazy,
  DiagnosticErrorBoundary
} from './diagnosticHooks';

// Import the circular symbol component
import CircularSymbol from '@/components/CircularSymbol/CircularSymbol';

// Initialize widget lifecycle log
console.log('[LIFECYCLE:StylistWidget] Module load started');
logComponentRender('StylistWidget', 'render', 'Module load started');

// Conditionally import based on USE_LAZY_LOADING flag
// Import directly for development
import ChatWidgetRegular from '@/components/ChatWidget';

// Global initialization tracker to prevent double initialization
// This works across component instances and rehydration
if (typeof window !== 'undefined') {
  window.__STYLIST_WIDGET_INITIALIZED = window.__STYLIST_WIDGET_INITIALIZED || false;
  window.__STYLIST_STORES_AVAILABLE = window.__STYLIST_STORES_AVAILABLE || false;
}

// Create lazy-loaded versions with better error handling
const ChatWidgetLazy = monitoredLazy(() => {
  console.log('[LIFECYCLE:StylistWidget] ChatWidgetLazy import starting');
  return import(/* webpackChunkName: "chat-widget" */ '@/components/ChatWidget')
    .then(module => {
      console.log('[LIFECYCLE:StylistWidget] ChatWidgetLazy successfully loaded');
      return module;
    })
    .catch(error => {
      console.error('[LIFECYCLE:StylistWidget] Failed to load ChatWidget component:', error);
      // Return a module-like object with a default export to prevent crashes
      return { default: ChatWidgetRegular };
    });
}, 'ChatWidget');

// Create lazy-loaded versions of large feature components
// const VirtualTryOnLazy = monitoredLazy(() => ...);
// const StyleQuizLazy = monitoredLazy(() => ...);
// const SocialProofLazy = monitoredLazy(() => ...);
// const LookbookLazy = monitoredLazy(() => ...);

interface StylistWidgetProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
  showDemoToggle?: boolean;
  showDebugToggle?: boolean;
  showOfflineIndicator?: boolean;
  showMockDataToggle?: boolean;
  enableOfflineMode?: boolean;
  demoMode?: boolean;
  demoFlow?: 'newUser' | 'returning' | 'influencer' | 'powerUser';
}

const isTestOrDev = typeof window !== 'undefined' && (window['Cypress'] || process.env.NODE_ENV !== 'production');

const StylistWidget: React.FC<StylistWidgetProps> = (props) => {
  // Log component lifecycle
  useDiagnosticLifecycle('StylistWidget');

  // Create a store initialization state to prevent rendering before stores are ready
  const [storesReady, setStoresReady] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);
  const chatStore = useChatStore();

  // Log render with store status
  logComponentRender(
    'StylistWidget',
    'render',
    `StylistWidget rendering with store status: ${chatStore ? 'available' : 'unavailable'}`,
    { storesReady, initAttempted }
  );

  // Safe store access with default values
  const isOpen = chatStore?.isOpen ?? false;
  const toggleOpen = chatStore?.toggleOpen ?? (() => console.warn('Chat store not initialized'));

  // Create a component instance initialization ref
  const componentInitializedRef = useRef<boolean>(false);

  // Initialize offline service
  useEffect(() => {
    if (props.enableOfflineMode) {
      offlineService.initOfflineService();

      // Clean up on unmount
      return () => {
        offlineService.cleanupOfflineService();
      };
    }
  }, [props.enableOfflineMode]);

  // Initialize stores immediately and synchronously
  useDiagnosticEffect(
    'StylistWidget',
    'storeInitialization',
    [chatStore, initAttempted],
    () => {
      console.log('[LIFECYCLE:StylistWidget] Store initialization effect running', {
        initAttempted,
        chatStoreExists: !!chatStore
      });

      // Mark init as attempted to prevent multiple attempts
      if (!initAttempted) {
        setInitAttempted(true);
        console.log('[LIFECYCLE:StylistWidget] First initialization attempt marked');
        logGlobalFlag('STYLIST_INIT_ATTEMPTED', true, 'First initialization attempt marked');

        // Always mark stores as ready immediately to prevent mounting issues
        console.log('[LIFECYCLE:StylistWidget] Stores marked as ready immediately');
        logGlobalFlag('STYLIST_STORES_READY', true, 'Stores marked as ready immediately');
        setStoresReady(true);

        // Additional log if the store is actually available
        if (chatStore) {
          console.log('[LIFECYCLE:StylistWidget] Store is actually available');
          logGlobalFlag('STYLIST_STORES_AVAILABLE', true, 'Store is actually available');
        } else {
          console.log('[LIFECYCLE:StylistWidget] Store will be available soon');
          logGlobalFlag('STYLIST_STORES_AVAILABLE', false, 'Store will be available soon');
        }
      }
    }
  );

  // Simplified secondary check only logs store availability
  useDiagnosticEffect(
    'StylistWidget',
    'secondaryStoreCheck',
    [chatStore, storesReady],
    () => {
      console.log('[LIFECYCLE:StylistWidget] Secondary store check effect running', {
        storesReady,
        chatStoreExists: !!chatStore
      });

      // Only log store availability without changing state
      if (chatStore && !window.__STYLIST_STORES_AVAILABLE) {
        console.log('[LIFECYCLE:StylistWidget] Store became available');
        logGlobalFlag('STYLIST_STORES_AVAILABLE', true, 'Store became available');
        window.__STYLIST_STORES_AVAILABLE = true;
      }
    }
  );

  // Prevent double initialization with global flag
  useDiagnosticEffect(
    'StylistWidget',
    'mainInitialization',
    [],
    () => {
      console.log('[LIFECYCLE:StylistWidget] Main initialization effect running', {
        alreadyInitialized: window.__STYLIST_WIDGET_INITIALIZED,
        locallyInitialized: componentInitializedRef.current,
        parallelInit: USE_PARALLEL_INIT
      });

      // Skip if already initialized
      if (window.__STYLIST_WIDGET_INITIALIZED) {
        console.log('[LIFECYCLE:StylistWidget] Already mounted, skipping initialization');
        logGlobalFlag('__STYLIST_WIDGET_INITIALIZED', true, 'Widget already initialized, skipping');
        return;
      }

      // Mark as initialized both locally and globally
      componentInitializedRef.current = true;
      window.__STYLIST_WIDGET_INITIALIZED = true;
      logGlobalFlag('__STYLIST_WIDGET_INITIALIZED', true, 'Widget marked as initialized');

      console.log('[LIFECYCLE:StylistWidget] Initializing widget instance');

      // Initialize critical paths immediately, defer non-critical operations
      if (USE_PARALLEL_INIT) {
        console.log('[LIFECYCLE:StylistWidget] Using parallel initialization strategy');
        logGlobalFlag('USE_PARALLEL_INIT', true, 'Using parallel initialization strategy');
        // Original parallel initialization behavior
        console.log('[LIFECYCLE:StylistWidget] Initializing feedbackSyncService immediately');
        feedbackSyncService.initialize({
          apiKey: props.apiKey,
          retailerId: props.retailerId,
          apiUrl: props.apiUrl
        });
      } else {
        // Only register the feedback service for later background initialization
        // The actual initialization will be triggered by the ChatWidget's onFirstPaint callback
        console.log('[LIFECYCLE:StylistWidget] Deferring feedback sync service initialization until first paint');
        logGlobalFlag('USE_PARALLEL_INIT', false, 'Using optimized initialization with delayed services');
        // Make TypeScript happy by using type assertion
        window.__STYLIST_PENDING_INITIALIZATIONS = {
          ...(window.__STYLIST_PENDING_INITIALIZATIONS || {}),
          feedbackSync: {
            apiKey: props.apiKey,
            retailerId: props.retailerId,
            apiUrl: props.apiUrl
          }
        } as NonNullable<typeof window.__STYLIST_PENDING_INITIALIZATIONS>;

        logGlobalFlag('__STYLIST_PENDING_INITIALIZATIONS', true, 'Pending initializations registered', {
          services: ['feedbackSync']
        });
      }

      // Clean up on unmount, but don't reset initialization flag
      // This prevents re-initialization if we're transitioning views
      return () => {
        console.log('[LIFECYCLE:StylistWidget] Cleaning up feedbackSyncService');
        feedbackSyncService.cleanup();
      };
    }
  );

  // Inject CSS variables for theme colors
  useDiagnosticEffect(
    'StylistWidget',
    'themeColors',
    [props.primaryColor],
    () => {
      console.log('[LIFECYCLE:StylistWidget] Theme color effect running', {
        primaryColor: props.primaryColor
      });

      if (props.primaryColor) {
        console.log('[LIFECYCLE:StylistWidget] Setting theme CSS variables');
        document.documentElement.style.setProperty('--stylist-primary-color', props.primaryColor);

        // Generate lighter and darker variants
        document.documentElement.style.setProperty(
          '--stylist-primary-color-light',
          lightenColor(props.primaryColor, 0.2)
        );

        document.documentElement.style.setProperty(
          '--stylist-primary-color-dark',
          darkenColor(props.primaryColor, 0.2)
        );
      }
    }
  );

  // Helper function to lighten a color
  const lightenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');

      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);

      // Lighten each component
      const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
      const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
      const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch {
      return color;
    }
  };

  // Helper function to darken a color
  const darkenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');

      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);

      // Darken each component
      const newR = Math.max(0, Math.floor(r * (1 - amount)));
      const newG = Math.max(0, Math.floor(g * (1 - amount)));
      const newB = Math.max(0, Math.floor(b * (1 - amount)));

      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch {
      return color;
    }
  };

  // Choose between lazy-loaded and direct import based on feature flag
  const ChatWidgetComponent = USE_LAZY_LOADING ? ChatWidgetLazy : ChatWidgetRegular;

  // Create a handler for first paint/mount callback from ChatWidget
  const handleFirstPaint = () => {
    console.log('[LIFECYCLE:StylistWidget] First paint callback triggered from ChatWidget');

    if (!USE_PARALLEL_INIT && window.__STYLIST_PENDING_INITIALIZATIONS) {
      console.log('[LIFECYCLE:StylistWidget] Initializing background tasks immediately');

      // Initialize feedback sync service immediately without delay
      if (window.__STYLIST_PENDING_INITIALIZATIONS?.feedbackSync) {
        console.log('[LIFECYCLE:StylistWidget] Initializing feedback sync service in background');
        try {
          feedbackSyncService.initialize(window.__STYLIST_PENDING_INITIALIZATIONS.feedbackSync);
          console.log('[LIFECYCLE:StylistWidget] Feedback sync service initialized successfully');
        } catch (error) {
          console.error('[LIFECYCLE:StylistWidget] Error initializing feedback sync service:', error);
        }
      }

      // Mark background initialization as complete
      // Use type assertion to avoid TypeScript errors
      window.__STYLIST_BACKGROUND_INIT_COMPLETE = true;
      console.log('[LIFECYCLE:StylistWidget] Background initialization marked as complete');
    }
  };

  // Improved widget content with better error boundaries and no AsyncComponentLoader
  const widgetContent = (
    <DiagnosticErrorBoundary
      componentName="StylistWidget"
      fallback={
        <div className="stylist-error-container" style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#721c24',
          backgroundColor: '#f8d7da',
          borderRadius: '4px',
          margin: '1rem'
        }}>
          <h3>Widget Error</h3>
          <p>The widget encountered an error during loading.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--stylist-primary-color, #4361ee)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      }
    >
      <>
        {/* Hidden #open-stylist button for E2E/legacy test compatibility */}
        {isTestOrDev && (
          <button
            id="open-stylist"
            style={{ position: 'fixed', left: 20, bottom: 20, width: 48, height: 48, opacity: 1, pointerEvents: 'auto', zIndex: 2147483647, background: '#222', color: '#fff', borderRadius: '50%', border: '2px solid #fff', fontWeight: 'bold', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
            tabIndex={0}
            aria-label="Open Stylist Widget (Test Only)"
            onClick={toggleOpen}
            data-cy="widget-open-button"
          >
            Open Stylist
          </button>
        )}
        {/* Only render ChatWidget when isOpen is true */}
        {isOpen && (
          <React.Suspense
            fallback={
              <div className="stylist-loading-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                height: '100%'
              }}>
                <div className="stylist-loading-spinner"></div>
                <p style={{ marginTop: '1rem' }}>Loading Stylist Widget...</p>
              </div>
            }
          >
            <ChatWidgetComponent
              {...props}
              key="stylist-chat-widget-singleton"
              onFirstPaint={handleFirstPaint}
              showDemoToggle={props.showDemoToggle}
            />
          </React.Suspense>
        )}
        {/* Only render CircularSymbol when isOpen is false */}
        {!isOpen && (
          <CircularSymbol
            onClick={toggleOpen}
            isOpen={isOpen}
          />
        )}
        <SyncStatusIndicator />
        {props.showDebugToggle && <DebugModeToggle />}
        {props.showMockDataToggle && <MockDataToggle />}
        {props.showOfflineIndicator && props.enableOfflineMode &&
          <OfflineIndicator
            position="top"
            showControls={true}
            hasOfflineData={true}
          />
        }
        {props.demoMode &&
          <DemoGuide
            flowId={props.demoFlow}
            position="right"
            showControls={true}
          />
        }
      </>
    </DiagnosticErrorBoundary>
  );

  // With parallel init, wrap in SyncProvider normally
  // With optimized init, only use SyncProvider if needed immediately
  return USE_PARALLEL_INIT ? (
    <SyncProvider>
      {widgetContent}
    </SyncProvider>
  ) : (
    <>{widgetContent}</>
  );
};

// Add these types to make TypeScript happy
// Note: We declare widget-specific flags here
// Other window properties are already declared in index.tsx
declare global {
  interface Window {
    __STYLIST_WIDGET_INITIALIZED?: boolean; // Make optional to match other declarations
    __STYLIST_STORES_AVAILABLE: boolean;
    // Other global properties (__STYLIST_PENDING_INITIALIZATIONS, __STYLIST_BACKGROUND_INIT_COMPLETE)
    // are declared in index.tsx to ensure type consistency
  }
}

// Set default props
StylistWidget.defaultProps = {
  showDebugToggle: false,
  showMockDataToggle: true,
  showDemoToggle: false,
  showOfflineIndicator: false,
  enableOfflineMode: false,
  demoMode: false
};

export default StylistWidget;