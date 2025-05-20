// React hooks for component lifecycle diagnostic monitoring
import React, { 
  useEffect, 
  useState, 
  useRef, 
  Suspense, 
  ComponentType, 
  ErrorInfo 
} from 'react';
import { 
  logComponentRender, 
  logSuspense, 
  logLazyLoad, 
  logErrorBoundary,
  logHook,
  LogLevel 
} from './diagnostics';

/**
 * Hook to monitor component lifecycle
 * @param componentName The name of the component to monitor
 */
export const useDiagnosticLifecycle = (componentName: string): void => {
  // Tracking mount state
  const mountedRef = useRef(false);
  // Tracking render count
  const renderCountRef = useRef(0);
  // Timing render performance
  const renderStartTimeRef = useRef(performance.now());
  
  // Log the first render
  if (!mountedRef.current) {
    renderStartTimeRef.current = performance.now();
    logComponentRender(
      componentName,
      'mount',
      `${componentName} initial render starting`
    );
  }
  
  // Increment render count and log updates
  renderCountRef.current += 1;
  const isInitialRender = renderCountRef.current === 1;
  
  if (!isInitialRender) {
    logComponentRender(
      componentName,
      'update',
      `${componentName} re-render #${renderCountRef.current - 1}`,
      { renderCount: renderCountRef.current }
    );
  }
  
  // Log mount completion on first effect
  useEffect(() => {
    if (!mountedRef.current) {
      const mountDuration = performance.now() - renderStartTimeRef.current;
      mountedRef.current = true;
      
      logComponentRender(
        componentName,
        'mount',
        `${componentName} mounted`,
        { 
          renderCount: renderCountRef.current,
          mountDuration: `${mountDuration.toFixed(2)}ms` 
        }
      );
    }
    
    // Log unmount
    return () => {
      logComponentRender(
        componentName,
        'unmount',
        `${componentName} unmounted`,
        { 
          totalRenderCount: renderCountRef.current 
        }
      );
    };
  }, [componentName]);
};

/**
 * Hook to monitor effects
 * @param componentName The name of the component
 * @param effectName Name of the effect for identification
 * @param deps The dependency array
 * @param effectFn The effect function
 */
export const useDiagnosticEffect = (
  componentName: string,
  effectName: string,
  deps: any[],
  effectFn: () => void | (() => void)
): void => {
  const effectRunCountRef = useRef(0);
  
  useEffect(() => {
    // Log effect starting
    effectRunCountRef.current += 1;
    const runCount = effectRunCountRef.current;
    
    logHook(
      componentName,
      effectName,
      'update',
      `${effectName} effect triggered in ${componentName}`,
      { 
        runCount,
        dependencies: deps ? `Dependencies array length: ${deps.length}` : 'No dependencies' 
      }
    );
    
    const startTime = performance.now();
    // Run the effect
    const cleanup = effectFn();
    const duration = performance.now() - startTime;
    
    logHook(
      componentName,
      effectName,
      'update',
      `${effectName} effect completed in ${componentName}`,
      { 
        runCount,
        duration: `${duration.toFixed(2)}ms`,
        hasCleanup: !!cleanup 
      }
    );
    
    // Return cleanup function
    return () => {
      if (cleanup) {
        logHook(
          componentName,
          effectName,
          'cleanup',
          `${effectName} effect cleanup in ${componentName}`,
          { runCount }
        );
        
        cleanup();
      }
    };
  }, deps);
};

/**
 * Hook to monitor state changes
 * @param componentName The name of the component
 * @param stateName Name of the state variable
 * @param initialValue The initial state value
 * @returns A tuple of [state, setState] just like useState
 */
export function useDiagnosticState<T>(
  componentName: string,
  stateName: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const updatesRef = useRef(0);
  const initialRef = useRef(true);
  
  if (initialRef.current) {
    logHook(
      componentName,
      `state:${stateName}`,
      'init',
      `${stateName} state initialized in ${componentName}`,
      { 
        initialValue: typeof initialValue === 'function' 
          ? '(function)'
          : initialValue 
      }
    );
    initialRef.current = false;
  }
  
  const setStateWithLogging = React.useCallback((
    value: React.SetStateAction<T>
  ) => {
    const updateCount = updatesRef.current + 1;
    updatesRef.current = updateCount;
    
    const valueIsFunction = typeof value === 'function';
    
    logHook(
      componentName,
      `state:${stateName}`,
      'update',
      `${stateName} state update in ${componentName}`,
      { 
        updateCount,
        setterType: valueIsFunction ? 'function' : 'value',
        newValue: !valueIsFunction ? value : '(function)'
      }
    );
    
    setState(value);
  }, [componentName, stateName]);
  
  return [state, setStateWithLogging];
}

/**
 * Creates a monitored lazy component
 * @param factory The component factory function
 * @param componentName Name of the component for logging
 * @returns A lazy component with monitoring
 */
export function monitoredLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  componentName: string
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    logLazyLoad(
      componentName,
      'start',
      `${componentName} lazy loading started`
    );
    
    const startTime = performance.now();
    
    return factory()
      .then(module => {
        const loadTime = performance.now() - startTime;
        
        logLazyLoad(
          componentName,
          'complete',
          `${componentName} lazy loading completed`,
          { 
            loadTime: `${loadTime.toFixed(2)}ms` 
          }
        );
        
        return module;
      })
      .catch(error => {
        logLazyLoad(
          componentName,
          'error',
          `${componentName} lazy loading error: ${error.message}`,
          { 
            error: error.message,
            stack: error.stack 
          }
        );
        
        throw error;
      });
  });
}

/**
 * A diagnostic suspense component that logs suspense events
 */
export const DiagnosticSuspense: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  componentName?: string;
}> = ({ children, fallback, componentName = 'unknown' }) => {
  const suspendedRef = useRef(false);
  const resolvedRef = useRef(false);
  const suspenseNameRef = useRef(`Suspense[${componentName}]`);
  
  // Use a wrapper to track when fallback is shown
  const FallbackTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
      if (!suspendedRef.current) {
        suspendedRef.current = true;
        
        logSuspense(
          suspenseNameRef.current,
          'fallback',
          `Suspense fallback shown for ${componentName}`
        );
      }
      
      return () => {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          
          logSuspense(
            suspenseNameRef.current,
            'resolved',
            `Suspense resolved for ${componentName}`
          );
        }
      };
    }, []);
    
    return <>{children}</>;
  };
  
  return (
    <Suspense fallback={<FallbackTracker>{fallback}</FallbackTracker>}>
      {children}
    </Suspense>
  );
};

/**
 * A diagnostic error boundary component that logs error boundary events
 */
export class DiagnosticErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode | ((error: Error, resetError: () => void) => React.ReactNode);
  componentName?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}> {
  state = { hasError: false, error: null as Error | null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    const { componentName = 'unknown', onError } = this.props;
    
    logErrorBoundary(
      componentName,
      error,
      info
    );
    
    if (onError) {
      onError(error, info);
    }
  }
  
  resetError = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    const { hasError, error } = this.state;
    const { children, fallback, componentName = 'unknown' } = this.props;
    
    if (hasError && error) {
      return typeof fallback === 'function'
        ? fallback(error, this.resetError)
        : fallback;
    }
    
    return children;
  }
}

export default {
  useDiagnosticLifecycle,
  useDiagnosticEffect,
  useDiagnosticState,
  monitoredLazy,
  DiagnosticSuspense,
  DiagnosticErrorBoundary
};