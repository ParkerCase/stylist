import React, { useEffect, useMemo, useState } from 'react';
import { getAnimationComplexity } from '../../../utils/animationUtils';
import './TransitionSmoother.scss';

interface TransitionSmootherProps {
  children: React.ReactNode;
  show: boolean;
  type?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale';
  duration?: number;
  className?: string;
  onEnter?: () => void; 
  onExit?: () => void;
}

/**
 * TransitionSmoother - A component that provides smooth transitions with adaptive complexity
 * based on device capabilities.
 * 
 * This component optimizes performance by:
 * 1. Adjusting animation complexity based on device capabilities
 * 2. Using CSS transitions instead of JS animations where possible
 * 3. Debouncing rapid transitions to prevent jank
 */
const TransitionSmoother: React.FC<TransitionSmootherProps> = ({
  children,
  show,
  type = 'fade',
  duration = 300,
  className = '',
  onEnter,
  onExit
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get the appropriate animation complexity level
  const animationClass = useMemo(() => {
    return getAnimationComplexity({
      high: 'animation--high',
      medium: 'animation--medium',
      low: 'animation--low',
      none: 'animation--none'
    });
  }, []);
  
  // Calculate the actual duration based on device capabilities
  const actualDuration = useMemo(() => {
    if (animationClass === 'animation--none') {
      // No animation for very low-end devices
      return 0;
    } else if (animationClass === 'animation--low') {
      // Shorter duration for low-end devices
      return Math.round(duration * 0.7);
    } else if (animationClass === 'animation--medium') {
      // Slightly shorter duration for medium devices
      return Math.round(duration * 0.85);
    }
    return duration;
  }, [duration, animationClass]);
  
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (show) {
      // When showing, make the element visible immediately
      setIsVisible(true);
      setIsAnimating(true);
      
      if (onEnter) {
        onEnter();
      }
      
      timer = setTimeout(() => {
        setIsAnimating(false);
      }, actualDuration);
    } else {
      // When hiding, start the exit animation
      setIsAnimating(true);
      
      if (onExit) {
        onExit();
      }
      
      // Remove the element after the animation completes
      timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, actualDuration);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [show, actualDuration, onEnter, onExit]);
  
  // Don't render anything if not visible
  if (!isVisible && !isAnimating) {
    return null;
  }
  
  // Get transition classes based on type and direction
  const getTransitionClasses = () => {
    const baseClass = `transition-smoother--${type}`;
    const stateClass = show ? 'transition-smoother--enter' : 'transition-smoother--exit';
    
    return `${baseClass} ${stateClass} ${animationClass}`;
  };
  
  return (
    <div 
      className={`transition-smoother ${getTransitionClasses()} ${className}`}
      style={{ 
        '--transition-duration': `${actualDuration}ms`,
      } as React.CSSProperties}
      data-testid="content"
    >
      {children}
    </div>
  );
};

export default TransitionSmoother;