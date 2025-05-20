// src/components/common/FallbackProvider.tsx

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import './FallbackProvider.scss';
import { debugLog, getDebugMode } from '../../utils/debugMode';

interface FallbackProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  loadingFallback?: ReactNode;
  timeoutFallback?: ReactNode;
  timeout?: number;
  retryOnError?: boolean;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onMaxRetriesReached?: () => void;
}

/**
 * FallbackProvider Component
 * 
 * A comprehensive error boundary that provides graceful fallbacks for various
 * error scenarios including loading, errors, and timeouts.
 */
const FallbackProvider: React.FC<FallbackProviderProps> = ({
  children,
  fallback,
  errorFallback,
  loadingFallback,
  timeoutFallback,
  timeout = 0,
  retryOnError = false,
  maxRetries = 3,
  onError,
  onRetry,
  onMaxRetriesReached
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Handle component errors
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    debugLog('FallbackProvider caught error:', error, errorInfo);
    
    setHasError(true);
    setError(error);
    setErrorInfo(errorInfo);
    
    // Call optional error handler
    if (onError) {
      onError(error, errorInfo);
    }
  };
  
  // Handle retry logic
  const handleRetry = () => {
    if (retryCount >= maxRetries) {
      // Max retries reached
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }
    
    // Increment retry count
    setRetryCount(retryCount + 1);
    
    // Reset error state
    setHasError(false);
    setError(null);
    setErrorInfo(null);
    
    // Call optional retry handler
    if (onRetry) {
      onRetry();
    }
  };
  
  // Handle timeout
  useEffect(() => {
    if (timeout <= 0) return;
    
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      setIsTimedOut(true);
      setIsLoading(false);
    }, timeout);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timeout]);
  
  // Handle content loaded
  useEffect(() => {
    if (React.Children.count(children) > 0) {
      setIsLoading(false);
    }
  }, [children]);
  
  // If component has error, show error fallback
  if (hasError) {
    return (
      <div className="stylist-fallback-provider stylist-fallback-provider--error">
        {errorFallback ? (
          errorFallback
        ) : (
          <div className="stylist-fallback-provider__error">
            <div className="stylist-fallback-provider__error-icon">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path 
                  fill="currentColor" 
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
                />
              </svg>
            </div>
            <h3>Something went wrong</h3>
            <p>We're sorry, but there was an error loading this component.</p>
            
            {/* Show error details in debug mode */}
            {getDebugMode() && error && (
              <div className="stylist-fallback-provider__error-details">
                <strong>Error: {error.toString()}</strong>
                <pre>{errorInfo?.componentStack}</pre>
              </div>
            )}
            
            {retryOnError && retryCount < maxRetries && (
              <button 
                className="stylist-fallback-provider__retry-btn"
                onClick={handleRetry}
              >
                Retry ({retryCount}/{maxRetries})
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // If timed out, show timeout fallback
  if (isTimedOut) {
    return (
      <div className="stylist-fallback-provider stylist-fallback-provider--timeout">
        {timeoutFallback ? (
          timeoutFallback
        ) : (
          <div className="stylist-fallback-provider__timeout">
            <div className="stylist-fallback-provider__timeout-icon">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path 
                  fill="currentColor" 
                  d="M11 17c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm0-14v4h2V5.08c3.39.49 6 3.39 6 6.92 0 3.87-3.13 7-7 7s-7-3.13-7-7c0-1.68.59-3.22 1.58-4.42L12 13l1.41-1.41-6.8-6.8v.02C4.42 6.45 3 9.05 3 12c0 4.97 4.02 9 9 9 4.97 0 9-4.03 9-9s-4.03-9-9-9h-1zm7 9c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1zM6 12c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z" 
                />
              </svg>
            </div>
            <h3>Loading taking too long</h3>
            <p>This is taking longer than expected. You can continue to wait or try again later.</p>
            
            <button 
              className="stylist-fallback-provider__retry-btn"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // If loading, show loading fallback
  if (isLoading) {
    return (
      <div className="stylist-fallback-provider stylist-fallback-provider--loading">
        {loadingFallback ? (
          loadingFallback
        ) : (
          <div className="stylist-fallback-provider__loading">
            <div className="stylist-fallback-provider__spinner"></div>
            <p>Loading...</p>
          </div>
        )}
      </div>
    );
  }
  
  try {
    // Render children
    return (
      <React.Fragment>
        {children || fallback}
      </React.Fragment>
    );
  } catch (error) {
    // Catch any synchronous errors in render
    handleError(error as Error, { componentStack: '' });
    
    return (
      <div className="stylist-fallback-provider stylist-fallback-provider--error">
        {errorFallback ? (
          errorFallback
        ) : (
          <div className="stylist-fallback-provider__error">
            <div className="stylist-fallback-provider__error-icon">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path 
                  fill="currentColor" 
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
                />
              </svg>
            </div>
            <h3>Something went wrong</h3>
            <p>We're sorry, but there was an error loading this component.</p>
            
            {/* Show error details in debug mode */}
            {getDebugMode() && error && (
              <div className="stylist-fallback-provider__error-details">
                <strong>Error: {error.toString()}</strong>
              </div>
            )}
            
            {retryOnError && retryCount < maxRetries && (
              <button 
                className="stylist-fallback-provider__retry-btn"
                onClick={handleRetry}
              >
                Retry ({retryCount}/{maxRetries})
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
};

export default FallbackProvider;