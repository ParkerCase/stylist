// src/components/common/LoadingIndicator.tsx

import React from 'react';
import './LoadingIndicator.scss';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  primaryColor?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium', 
  text, 
  primaryColor 
}) => {
  const sizeClass = `stylist-loading-indicator--${size}`;
  const spinnerStyle = primaryColor ? { borderTopColor: primaryColor } : undefined;
  
  return (
    <div className={`stylist-loading-indicator ${sizeClass}`}>
      <div className="stylist-loading-indicator__spinner" style={spinnerStyle}></div>
      {text && <div className="stylist-loading-indicator__text">{text}</div>}
    </div>
  );
};

export default LoadingIndicator;