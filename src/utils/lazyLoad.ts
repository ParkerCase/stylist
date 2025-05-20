/**
 * Enhanced lazy loading utility 
 * 
 * This module provides optimized lazy loading for components with
 * prefetching, retry capabilities, and loading strategies.
 */

import React, { lazy, ReactNode } from 'react';
import { IS_PRODUCTION } from './environment';

export type LazyImportFunction<T = any> = () => Promise<{ default: React.ComponentType<T> }>;

// Configuration options for lazy loading
export interface LazyLoadOptions {
  // Number of retries before failing
  retries?: number;
  
  // Delay between retries in ms
  retryDelay?: number;
  
  // Timeout before giving up in ms
  timeout?: number;
  
  // Don't show loading state for this amount of ms (prevents flicker)
  minimumLoadTime?: number;
  
  // Loading mode: eager (load immediately), lazy (default), visible (IntersectionObserver)
  mode?: 'eager' | 'lazy' | 'visible';
  
  // Priority hint for the browser (high = critical path components)
  priority?: 'high' | 'low' | 'auto';
  
  // Preload when idle
  preloadWhenIdle?: boolean;
  
  // Custom name for error tracking and debugging
  name?: string;
}

/**
 * Lazy loading implementation with preload capabilities and error handling
 */
export function lazyLoad<T = any>(
  importFunction: LazyImportFunction<T>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<React.ComponentType<T>> & {
  preload: () => Promise<void>;
  displayName?: string;
} {
  const {
    retries = 1,
    retryDelay = 1500,
    timeout = 10000,
    minimumLoadTime = 300,
    mode = 'lazy',
    priority = 'auto',
    preloadWhenIdle = false,
    name
  } = options;

  // Create a memoized import function with retry logic
  const loadComponent = async () => {
    let lastError: any;
    
    // Track start time for minimum load time
    const startTime = Date.now();
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort(`Timeout loading component${name ? ` ${name}` : ''} after ${timeout}ms`);
    }, timeout);
    
    try {
      // Try to import the component with retries
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Attempt to load the component
          const component = await Promise.race([
            importFunction(),
            new Promise<never>((_, reject) => {
              // Set up the abort handler
              signal.addEventListener('abort', () => {
                reject(new Error(signal.reason || 'Component load aborted'));
              });
            })
          ]);
          
          // Enforce minimum loading time to prevent flicker
          const elapsed = Date.now() - startTime;
          if (elapsed < minimumLoadTime) {
            await new Promise(resolve => setTimeout(resolve, minimumLoadTime - elapsed));
          }
          
          // Clear the timeout 
          clearTimeout(timeoutId);
          
          // Return the component
          return component;
        } catch (error) {
          // Store the error for later
          lastError = error;
          
          // Don't retry on abort/timeout
          if (signal.aborted || error.name === 'AbortError') {
            throw error;
          }
          
          // If we've reached the max retries, throw the error
          if (attempt === retries) {
            throw error;
          }
          
          // Otherwise, wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    } finally {
      // Always clear the timeout
      clearTimeout(timeoutId);
    }
    
    // This should never be reached due to the loop above,
    // but TypeScript requires a return statement
    throw lastError || new Error('Failed to load component');
  };

  // Create the lazy component
  const LazyComponent = lazy(loadComponent);
  
  // Set display name for dev tools
  // The displayName property may not exist on LazyExoticComponent but we can add it anyway
  // TypeScript allows us to add properties dynamically in JavaScript context
  if (name && !IS_PRODUCTION) {
    (LazyComponent as any).displayName = `Lazy(${name})`;
  }
  
  // Handle loading strategy based on mode
  if (mode === 'eager') {
    // Start loading immediately
    loadComponent().catch(err => {
      console.warn(`Failed to eagerly load component${name ? ` ${name}` : ''}:`, err);
    });
  } else if (preloadWhenIdle && typeof window !== 'undefined') {
    // Use requestIdleCallback to preload when the browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loadComponent().catch(err => {
          console.warn(`Failed to preload component${name ? ` ${name}` : ''} during idle time:`, err);
        });
      }, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        loadComponent().catch(err => {
          console.warn(`Failed to preload component${name ? ` ${name}` : ''} during simulated idle time:`, err);
        });
      }, 1000);
    }
  }
  
  // Add preload method to the component
  (LazyComponent as any).preload = async () => {
    try {
      await loadComponent();
    } catch (err) {
      console.error(`Error preloading component${name ? ` ${name}` : ''}:`, err);
    }
  };
  
  return LazyComponent as React.LazyExoticComponent<React.ComponentType<T>> & {
    preload: () => Promise<void>;
    displayName?: string;
  };
}

/**
 * Prefetcher for multiple lazy components
 */
export function prefetchComponents(components: Array<{ preload: () => Promise<void> }>): void {
  if (typeof window === 'undefined') return;
  
  // Use requestIdleCallback to prefetch when the browser is idle
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      components.forEach(component => {
        component.preload().catch(() => {
          // Silently catch errors during prefetch
        });
      });
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      components.forEach(component => {
        component.preload().catch(() => {
          // Silently catch errors during prefetch
        });
      });
    }, 1000);
  }
}

/**
 * Prefetch a component when a user hovers or touches an element
 */
export function createPrefetchTrigger<T extends HTMLElement = HTMLElement>(
  component: { preload: () => Promise<void> }
): (element: T | null) => void {
  let prefetched = false;
  
  return (element: T | null) => {
    if (!element || prefetched) return;
    
    const prefetch = () => {
      if (!prefetched) {
        prefetched = true;
        component.preload().catch(() => {
          // Reset prefetched flag on error to allow retry
          prefetched = false;
        });
      }
    };
    
    // Prefetch on mouse hover or touch
    element.addEventListener('mouseenter', prefetch, { once: true });
    element.addEventListener('touchstart', prefetch, { once: true });
    
    // Cleanup function to remove event listeners
    return () => {
      element.removeEventListener('mouseenter', prefetch);
      element.removeEventListener('touchstart', prefetch);
    };
  };
}

/**
 * Create a visibility-based lazy loader using IntersectionObserver
 */
export function createVisibilityLoader<T extends HTMLElement = HTMLElement>(
  component: { preload: () => Promise<void> },
  options: { rootMargin?: string; threshold?: number } = {}
): (element: T | null) => () => void {
  let loaded = false;
  let observer: IntersectionObserver | null = null;
  
  return (element: T | null) => {
    if (!element || loaded || typeof IntersectionObserver === 'undefined') {
      return () => {}; // No-op cleanup
    }
    
    const loadIfVisible = (entries: IntersectionObserverEntry[]) => {
      const isVisible = entries.some(entry => entry.isIntersecting);
      
      if (isVisible && !loaded) {
        loaded = true;
        component.preload().catch(() => {
          // Reset loaded flag on error to allow retry
          loaded = false;
        });
        
        // Disconnect observer after loading
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    };
    
    // Create and start observing
    observer = new IntersectionObserver(loadIfVisible, {
      rootMargin: options.rootMargin || '200px',
      threshold: options.threshold || 0
    });
    
    observer.observe(element);
    
    // Return cleanup function
    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  };
}