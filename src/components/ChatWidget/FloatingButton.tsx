// Floating button component for chat widget activation
import React, { useState, useEffect } from 'react';

interface FloatingButtonProps {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onClick: () => void;
  primaryColor?: string;
  isOpen?: boolean;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({
  position,
  onClick,
  primaryColor,
  isOpen = false
}) => {
  // All hooks must be called before any return
  const [animateState, setAnimateState] = useState('animate-in');
  
  // Position classes for the button
  const positionClasses = {
    'bottom-right': 'stylist-floating-button--bottom-right',
    'bottom-left': 'stylist-floating-button--bottom-left',
    'top-right': 'stylist-floating-button--top-right',
    'top-left': 'stylist-floating-button--top-left'
  };
  
  // Custom style for primary color
  const buttonStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;
  
  // Handle animation states when opening/closing
  useEffect(() => {
    if (isOpen) {
      setAnimateState('animate-out');
    } else {
      setAnimateState('animate-in');
    }
  }, [isOpen]);
  
  // Only render if not open
  const shouldRender = !isOpen;
  if (!shouldRender) return null;
  
  return (
    <div 
      className={`stylist-floating-button ${positionClasses[position]} ${animateState}`}
      onClick={onClick}
      style={buttonStyle}
      data-testid="stylist-floating-button"
      aria-label="Open chat assistant"
    >
      <div className="stylist-floating-button__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
        </svg>
      </div>
    </div>
  );
};

export default FloatingButton;