import React, { useState, useEffect } from 'react';
import './ErrorWithRetry.scss';

interface ErrorWithRetryProps {
  message: string;
  retryAction: () => Promise<void>;
  maxRetries?: number;
  retryInterval?: number;
  onMaxRetriesReached?: () => void;
  fallbackMessage?: string;
}

/**
 * ErrorWithRetry Component
 * 
 * Displays an error message with automatic retry functionality
 * plus a manual retry button
 */
const ErrorWithRetry: React.FC<ErrorWithRetryProps> = ({
  message,
  retryAction,
  maxRetries = 3,
  retryInterval = 3000,
  onMaxRetriesReached,
  fallbackMessage = "We're having trouble connecting. Please try again later."
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(retryInterval / 1000);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  // Reset timer when retry interval changes
  useEffect(() => {
    setTimeLeft(retryInterval / 1000);
  }, [retryInterval]);

  // Handle automatic retry
  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Only setup automatic retry if enabled and not at max retries
    if (autoRetryEnabled && retryCount < maxRetries && !isRetrying) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleRetry();
            return retryInterval / 1000;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [retryCount, isRetrying, autoRetryEnabled, maxRetries, retryInterval]);

  // Handle retry action
  const handleRetry = async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    try {
      await retryAction();
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      // Increment retry count on failure
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Check if max retries reached
      if (newRetryCount >= maxRetries) {
        setAutoRetryEnabled(false);
        setShowFallback(true);
        if (onMaxRetriesReached) {
          onMaxRetriesReached();
        }
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Toggle automatic retry
  const toggleAutoRetry = () => {
    setAutoRetryEnabled(!autoRetryEnabled);
  };

  // Manual retry handler
  const handleManualRetry = () => {
    setTimeLeft(retryInterval / 1000);
    handleRetry();
  };

  return (
    <div className="stylist-error-with-retry">
      <div className="stylist-error-with-retry__icon">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
        </svg>
      </div>
      
      {showFallback ? (
        <div className="stylist-error-with-retry__message">{fallbackMessage}</div>
      ) : (
        <div className="stylist-error-with-retry__message">{message}</div>
      )}
      
      <div className="stylist-error-with-retry__actions">
        <button 
          className="stylist-error-with-retry__retry-btn" 
          onClick={handleManualRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Retrying...' : 'Retry Now'}
        </button>
        
        <label className="stylist-error-with-retry__auto-toggle">
          <input
            type="checkbox"
            checked={autoRetryEnabled}
            onChange={toggleAutoRetry}
          />
          <span>Auto retry</span>
        </label>
      </div>
      
      {autoRetryEnabled && retryCount < maxRetries && !isRetrying && (
        <div className="stylist-error-with-retry__countdown">
          <div className="stylist-error-with-retry__progress">
            <div 
              className="stylist-error-with-retry__progress-bar"
              style={{ width: `${(timeLeft / (retryInterval / 1000)) * 100}%` }}
            ></div>
          </div>
          <div className="stylist-error-with-retry__timer">
            Retrying in {timeLeft} seconds
          </div>
        </div>
      )}
      
      {retryCount > 0 && (
        <div className="stylist-error-with-retry__attempts">
          Attempt {retryCount} of {maxRetries}
        </div>
      )}
    </div>
  );
};

export default ErrorWithRetry;