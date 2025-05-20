// src/components/common/LoadingIndicator.tsx

import React, { useState, useEffect } from 'react';
import './LoadingIndicator.scss';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  secondaryText?: string;
  variant?: 'primary' | 'secondary' | 'light';
  animation?: 'spin' | 'pulse' | 'fade';
  showProgress?: boolean;
  progress?: number;
  inline?: boolean;
  overlay?: boolean;
  customColor?: string;
  isIndeterminate?: boolean;
  autoProgressDuration?: number;
}

/**
 * Enhanced LoadingIndicator component with multiple style options
 * 
 * Features:
 * - Multiple sizes, colors, and animation types
 * - Progress indicator option
 * - Automatic progress animation
 * - Overlay mode for full-container loading
 * - Inline layout option
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium', 
  text,
  secondaryText,
  variant = 'primary',
  animation = 'spin',
  showProgress = false,
  progress,
  inline = false,
  overlay = false,
  customColor,
  isIndeterminate = false,
  autoProgressDuration = 0
}) => {
  const [autoProgress, setAutoProgress] = useState(0);

  // Handle auto progress animation
  useEffect(() => {
    if (autoProgressDuration > 0 && isIndeterminate) {
      const interval = setInterval(() => {
        setAutoProgress((prevProgress) => {
          // Increment but cap at 90% for indeterminate progress
          const newProgress = prevProgress + (100 / (autoProgressDuration / 100));
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [autoProgressDuration, isIndeterminate]);

  // Determine the progress percentage to display
  const progressPercentage = progress !== undefined ? progress : autoProgress;

  // Build the class list based on props
  const classNames = [
    'stylist-loading-indicator',
    `stylist-loading-indicator--${size}`,
    variant && `stylist-loading-indicator--${variant}`,
    animation !== 'spin' && `stylist-loading-indicator--${animation}`,
    inline && 'stylist-loading-indicator--inline',
    overlay && 'stylist-loading-indicator--overlay'
  ].filter(Boolean).join(' ');

  // Custom style for the spinner if custom color is provided
  const spinnerStyle = customColor ? {
    borderColor: `${customColor}40`,
    borderTopColor: customColor
  } : undefined;

  // Custom style for progress bar
  const progressBarStyle = {
    width: `${progressPercentage}%`,
    ...(customColor ? { backgroundColor: customColor } : {})
  };

  // Render the core component
  const loadingContent = (
    <>
      <div className="stylist-loading-indicator__spinner" style={spinnerStyle}></div>
      
      {text && <div className="stylist-loading-indicator__text">{text}</div>}
      
      {secondaryText && 
        <div className="stylist-loading-indicator__text" style={{ opacity: 0.7, fontSize: '0.9em' }}>
          {secondaryText}
        </div>
      }
      
      {showProgress && (
        <div className="stylist-loading-indicator__progress">
          <div 
            className="stylist-loading-indicator__progress-bar"
            style={progressBarStyle}
          ></div>
        </div>
      )}
    </>
  );

  // Wrap in container if overlay mode is enabled
  return overlay ? (
    <div className={classNames}>
      <div className="stylist-loading-indicator__container">
        {loadingContent}
      </div>
    </div>
  ) : (
    <div className={classNames}>
      {loadingContent}
    </div>
  );
};

export default LoadingIndicator;