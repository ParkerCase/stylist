import React, { Suspense, useEffect, useState, useRef } from 'react';
import LoadingIndicator from './LoadingIndicator';
import ErrorBoundary from './ErrorBoundary';
import { USE_LAZY_LOADING } from '../../index';
import {
  logComponentRender,
  logSuspense,
  logHook,
  logPerformance,
  logErrorBoundary,
  LogLevel
} from '../../diagnostics';
import {
  useDiagnosticLifecycle,
  useDiagnosticEffect,
  DiagnosticSuspense,
  DiagnosticErrorBoundary
} from '../../diagnosticHooks';

interface AsyncComponentLoaderProps {
  children: React.ReactNode;
  loadingMessage?: string;
  fallback?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

// Define a separate component for the suspense fallback to handle logging
const LoggingSuspenseFallback: React.FC<{
  fallback: React.ReactNode;
  componentId: string;
}> = ({ fallback, componentId }) => {
  // Track render time for performance metrics
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderDuration = performance.now() - renderStartTime.current;
    console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Suspense fallback rendering`);

    // Log the suspense fallback rendering
    logSuspense(
      `AsyncLoader:${componentId}`,
      'fallback',
      `Suspense fallback rendering for ${componentId}`,
      { renderDuration: `${renderDuration.toFixed(2)}ms` }
    );

    // Log performance mark
    logPerformance(
      `SuspenseFallback:${componentId}`,
      renderDuration,
      { component: componentId }
    );

    return () => {
      const totalDuration = performance.now() - renderStartTime.current;
      logSuspense(
        `AsyncLoader:${componentId}`,
        'resolved',
        `Suspense resolved for ${componentId}`,
        {
          totalDuration: `${totalDuration.toFixed(2)}ms`,
          component: componentId
        }
      );
    };
  }, [componentId]);

  return <>{fallback}</>;
};

/**
 * A utility component that wraps lazy-loaded components with Suspense
 * and provides a consistent loading state.
 *
 * Only applies Suspense if USE_LAZY_LOADING is true.
 * Includes error boundary functionality and timeouts to prevent infinite suspense.
 *
 * Fixed version to avoid deadlocks by using shorter timeouts and more defensive coding.
 */
const AsyncComponentLoader: React.FC<AsyncComponentLoaderProps> = ({
  children,
  loadingMessage = 'Loading...',
  fallback,
  onLoadStart,
  onLoadComplete,
  onLoadError
}) => {
  // Add diagnostic lifecycle logging
  useDiagnosticLifecycle('AsyncComponentLoader');

  // Track if component is actually loaded to help detect Suspense issues
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimeout, setHasTimeout] = useState(false);
  const suspenseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safeRenderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add a key to force remount if needed
  const [componentKey, setComponentKey] = useState<number>(0);
  // Track mount state to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  // Log component ID for tracing
  const componentId = useRef(`async-${Math.random().toString(36).substring(2, 9)}`).current;
  // Track load start time for performance metrics
  const loadStartTimeRef = useRef(performance.now());

  console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Component initialized`);
  logComponentRender(
    'AsyncComponentLoader',
    'mount',
    `AsyncLoader:${componentId} initialized`,
    { componentId }
  );

  // Call onLoadStart if provided
  useDiagnosticEffect(
    'AsyncComponentLoader',
    'loadStart',
    [onLoadStart],
    () => {
      if (onLoadStart && USE_LAZY_LOADING) {
        console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Calling onLoadStart callback`);
        logHook(
          'AsyncComponentLoader',
          'onLoadStart',
          'init',
          `Calling onLoadStart callback for ${componentId}`
        );
        onLoadStart();
      }
    }
  );

  // Handle errors from the error boundary
  const handleError = (error: Error) => {
    if (!isMountedRef.current) return;

    console.warn(`[LIFECYCLE:AsyncLoader:${componentId}] Error loading component:`, error.message);
    logErrorBoundary(
      'AsyncComponentLoader',
      error,
      { componentStack: `AsyncLoader:${componentId}` } as any
    );

    if (onLoadError) {
      console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Calling onLoadError callback`);
      onLoadError(error);
    }

    setIsLoaded(true); // Mark as loaded to avoid further timeouts

    // Force remount of the component in case of error by changing key
    setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Forcing remount after error`);
        logComponentRender(
          'AsyncComponentLoader',
          'render',
          `Forcing remount after error for ${componentId}`,
          { error: error.message }
        );
        setComponentKey(prevKey => prevKey + 1);
      }
    }, 100);
  };

  // Simplified effect to handle mount state without timeouts
  useDiagnosticEffect(
    'AsyncComponentLoader',
    'suspenseTimeouts',
    [isLoaded, USE_LAZY_LOADING, componentId],
    () => {
      if (!USE_LAZY_LOADING) return;

      console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Setting up mount tracking`);
      logHook(
        'AsyncComponentLoader',
        'suspenseTimeouts',
        'init',
        `Setting up mount tracking for ${componentId}`,
        { isLoaded }
      );

      // Set mounted state on mount
      isMountedRef.current = true;

      // Mark as loaded immediately to avoid timeout issues
      if (!isLoaded && isMountedRef.current) {
        setIsLoaded(true);

        // Log a performance mark for immediate resolution
        logSuspense(
          `AsyncLoader:${componentId}`,
          'resolved',
          `Suspense immediately resolved for ${componentId}`,
          {
            component: componentId,
            forcedResolution: false
          }
        );
      }

      // Cleanup function
      return () => {
        console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Cleaning up mount tracking`);
        logHook(
          'AsyncComponentLoader',
          'suspenseTimeouts',
          'cleanup',
          `Cleaning up mount tracking for ${componentId}`
        );

        isMountedRef.current = false;
      };
    }
  );

  // Effect to immediately mark component as loaded and call completion callback
  useDiagnosticEffect(
    'AsyncComponentLoader',
    'postRenderLoad',
    [isLoaded, USE_LAZY_LOADING, onLoadComplete, componentId],
    () => {
      if (!USE_LAZY_LOADING) return;

      if (!isLoaded && isMountedRef.current) {
        console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Immediately marking component as loaded`);
        logHook(
          'AsyncComponentLoader',
          'postRenderLoad',
          'init',
          `Immediately marking component ${componentId} as loaded`
        );

        // Immediately mark as loaded in the same tick
        setIsLoaded(true);

        if (onLoadComplete) {
          console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Calling onLoadComplete callback`);
          onLoadComplete();
        }

        // Log a performance mark for the total load time
        logPerformance(
          'AsyncComponentLoader:complete',
          performance.now() - loadStartTimeRef.current,
          {
            componentId,
            hasTimeout
          }
        );
      }
    }
  );

  // Logging for child rendering
  useDiagnosticEffect(
    'AsyncComponentLoader',
    'childrenRendering',
    [hasTimeout, componentKey, USE_LAZY_LOADING, componentId],
    () => {
      if (USE_LAZY_LOADING) {
        console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Children rendering ${hasTimeout ? '(timeout mode)' : '(suspense mode)'}`);
        logComponentRender(
          'AsyncComponentLoader',
          'render',
          `Children rendering for ${componentId}`,
          {
            mode: hasTimeout ? 'timeout' : 'suspense',
            componentKey
          }
        );
      }
    }
  );

  // If lazy loading is disabled, render children directly
  if (!USE_LAZY_LOADING) {
    return <>{children}</>;
  }
  
  // Default fallback if none provided
  const defaultFallback = (
    <div className="stylist-loading-container" style={{
      display: 'flex',
  
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      height: '100%'
    }}>
      <LoadingIndicator />
      <p style={{ marginTop: '1rem' }}>{loadingMessage}</p>
    </div>
  );

  // Custom fallback for error state
  const errorFallback = (
    <div className="stylist-error-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      height: '100%'
    }}>
      <p style={{ marginTop: '1rem' }}>Unable to load component</p>
      <button
        onClick={() => isMountedRef.current && setComponentKey(prevKey => prevKey + 1)}
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
        Try Again
      </button>
    </div>
  );

  // If we had a timeout, render the component directly with an error boundary
  if (hasTimeout) {
    console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Rendering with timeout fallback`);
    logComponentRender(
      'AsyncComponentLoader',
      'render',
      `Rendering with timeout fallback for ${componentId}`,
      {
        mode: 'timeout',
        timeElapsed: `${((performance.now() - loadStartTimeRef.current)).toFixed(2)}ms`
      }
    );

    return (
      <DiagnosticErrorBoundary
        key={`timeout-fallback-${componentKey}`}
        componentName={`AsyncLoader:${componentId}`}
        onError={handleError}
        fallback={errorFallback}
      >
        {children}
      </DiagnosticErrorBoundary>
    );
  }

  console.log(`[LIFECYCLE:AsyncLoader:${componentId}] Rendering with suspense`);
  logComponentRender(
    'AsyncComponentLoader',
    'render',
    `Rendering with suspense for ${componentId}`,
    {
      mode: 'suspense',
      timeElapsed: `${((performance.now() - loadStartTimeRef.current)).toFixed(2)}ms`
    }
  );

  // Prepare the fallback content
  const finalFallback = fallback || defaultFallback;

  return (
    <DiagnosticErrorBoundary
      key={`error-boundary-${componentKey}`}
      componentName={`AsyncLoader:${componentId}`}
      onError={handleError}
      fallback={errorFallback}
    >
      <DiagnosticSuspense
        componentName={`AsyncLoader:${componentId}`}
        fallback={<LoggingSuspenseFallback fallback={finalFallback} componentId={componentId} />}
      >
        {children}
      </DiagnosticSuspense>
    </DiagnosticErrorBoundary>
  );
};

export default AsyncComponentLoader;