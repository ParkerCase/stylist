import * as deviceCapabilities from './deviceCapabilities';

/**
 * Utility for managing animations with adaptive complexity based on device capabilities
 */

/**
 * Determines the appropriate animation duration based on device capabilities
 * @param defaultDuration Default animation duration in ms
 * @returns Adjusted duration in ms
 */
export const getAdaptiveDuration = (defaultDuration: number): number => {
  if (!deviceCapabilities.shouldEnableFeature('animations', 'medium')) {
    // For low-end devices, make animations 30% faster to reduce rendering load
    return Math.round(defaultDuration * 0.7);
  }
  return defaultDuration;
};

/**
 * Determines if a specific animation type should run based on device capabilities
 * @param animationType Type of animation to check
 * @returns Boolean indicating if animation should run
 */
export const shouldRunAnimation = (
  animationType: 'micro' | 'transition' | 'parallax' | 'complex' | 'background'
): boolean => {
  switch (animationType) {
    case 'micro':
      // Subtle micro-animations (e.g., button hover effects)
      return deviceCapabilities.shouldEnableFeature('animations', 'low');
    
    case 'transition':
      // Page/view transitions
      return deviceCapabilities.shouldEnableFeature('animations', 'low');
      
    case 'parallax':
      // Parallax and scroll effects
      return deviceCapabilities.shouldEnableFeature('animations', 'medium');
      
    case 'complex':
      // Complex animations with multiple elements
      return deviceCapabilities.shouldEnableFeature('animations', 'high');
      
    case 'background':
      // Background animations and effects
      return deviceCapabilities.shouldEnableFeature('backgroundEffects', 'medium');
      
    default:
      return true;
  }
};

/**
 * Get the appropriate complexity of an animation based on device capabilities
 * @param options Animation complexity options
 * @returns The selected animation complexity
 */
export const getAnimationComplexity = <T>(options: {
  high: T;
  medium: T;
  low: T;
  none: T;
}): T => {
  if (!deviceCapabilities.shouldEnableFeature('animations', 'low')) {
    return options.none;
  }
  
  if (!deviceCapabilities.shouldEnableFeature('animations', 'medium')) {
    return options.low;
  }
  
  if (!deviceCapabilities.shouldEnableFeature('animations', 'high')) {
    return options.medium;
  }
  
  return options.high;
};

/**
 * Returns a CSS class name appropriate for the current device capability level
 */
export const getAnimationClass = (
  baseClass: string
): string => {
  const complexity = getAnimationComplexity({
    high: 'high',
    medium: 'medium',
    low: 'low',
    none: 'none'
  });
  
  return `${baseClass}--${complexity}`;
};

/**
 * Debounces animations during rapid interactions to prevent jank
 */
export const debounceAnimation = (() => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (callback: () => void, delay: number = 150) => {
    // For very low-end devices, increase debounce delay
    const adaptiveDelay = deviceCapabilities.getPerformanceTier() !== 'high' ? delay * 1.5 : delay;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, adaptiveDelay);
  };
})();

/**
 * Animation presets for consistent animations across components
 */
export const AnimationPresets = {
  fadeIn: (duration: number = 300, distance: number = 10) => ({
    animation: `fadeIn ${getAdaptiveDuration(duration)}ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards`,
    shouldRun: shouldRunAnimation('transition'),
    style: {
      '--fade-distance': `${distance}px`
    }
  }),
  
  fadeInNoTransform: (duration: number = 300) => ({
    animation: `fadeInNoTransform ${getAdaptiveDuration(duration)}ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards`,
    shouldRun: shouldRunAnimation('transition')
  }),
  
  fadeOut: (duration: number = 300) => ({
    animation: `fadeOut ${getAdaptiveDuration(duration)}ms ease-in forwards`,
    shouldRun: shouldRunAnimation('transition')
  }),
  
  slideIn: (direction: 'left' | 'right' | 'up' | 'down' = 'right', duration: number = 300) => ({
    animation: `slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)} ${getAdaptiveDuration(duration)}ms ease-out forwards`,
    shouldRun: shouldRunAnimation('transition')
  }),
  
  slideOut: (direction: 'left' | 'right' | 'up' | 'down' = 'right', duration: number = 300) => ({
    animation: `slideOut${direction.charAt(0).toUpperCase() + direction.slice(1)} ${getAdaptiveDuration(duration)}ms ease-in forwards`,
    shouldRun: shouldRunAnimation('transition')
  }),
  
  scale: (from: number = 0.9, to: number = 1, duration: number = 300) => ({
    animation: `scale ${getAdaptiveDuration(duration)}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
    shouldRun: shouldRunAnimation('transition'),
    style: {
      '--scale-from': from,
      '--scale-to': to
    }
  }),
  
  pulse: (duration: number = 1500, intensity: number = 1.05) => ({
    animation: `pulse ${getAdaptiveDuration(duration)}ms ease-in-out infinite`,
    shouldRun: shouldRunAnimation('micro'),
    style: {
      '--pulse-intensity': intensity
    }
  }),
  
  shake: (duration: number = 500, intensity: number = 5) => ({
    animation: `shake ${getAdaptiveDuration(duration)}ms ease-in-out`,
    shouldRun: shouldRunAnimation('micro'),
    style: {
      '--shake-intensity': `${intensity}px`
    }
  }),
  
  ripple: (duration: number = 600) => ({
    animation: `ripple ${getAdaptiveDuration(duration)}ms ease-out forwards`,
    shouldRun: shouldRunAnimation('micro')
  }),
  
  bounce: (duration: number = 800, height: number = 20) => ({
    animation: `bounce ${getAdaptiveDuration(duration)}ms cubic-bezier(0.28, 0.84, 0.42, 1) infinite`,
    shouldRun: shouldRunAnimation('micro'),
    style: {
      '--bounce-height': `${height}px`
    }
  })
};

/**
 * Hook for measuring animation performance
 */
export const measureAnimationPerformance = (animationName: string, callback: () => void) => {
  // Only measure on high-end devices to avoid additional overhead on low-end devices
  if (deviceCapabilities.getPerformanceTier() === 'high') {
    const startTime = performance.now();
    
    // Run the animation
    callback();
    
    // Set up a timeout to measure after animation is likely complete
    setTimeout(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Report to performance monitoring
      if (window.__PERFORMANCE_MONITOR) {
        window.__PERFORMANCE_MONITOR.recordAnimationDuration(animationName, duration);
      } else {
        console.debug(`Animation '${animationName}' took ${duration.toFixed(2)}ms`);
      }
    }, 100);
  } else {
    // Just run the animation on low-end devices
    callback();
  }
};

// Add type definition for performance monitor
declare global {
  interface Window {
    __PERFORMANCE_MONITOR?: {
      recordAnimationDuration: (name: string, duration: number) => void;
    };
  }
}