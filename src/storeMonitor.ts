// Store monitoring utilities for diagnostics

import { 
  logStore, 
  LogLevel, 
  LogEntryType 
} from './diagnostics';

/**
 * Monitors an existing Zustand store
 * Simplified version that avoids complex type issues
 */
export function monitorExistingStore(
  storeName: string,
  store: any
): any {
  // Log that we're monitoring an existing store
  logStore(
    storeName,
    'init',
    `Monitoring existing ${storeName} store`
  );

  // The original store is already created, so we just need to
  // monitor state changes by subscribing to it
  if (store && typeof store.subscribe === 'function') {
    store.subscribe((state: any) => {
      logStore(
        storeName,
        'update',
        `${storeName} updated`,
        { newState: state }
      );
    });
  }

  return store;
}

/**
 * Creates a middleware function for Zustand stores
 * This allows logging of state changes
 */
export function createDiagnosticsMiddleware(storeName: string) {
  return function middleware(config: any) {
    return function(set: any, get: any, api: any) {
      // Wrap the set function to log all state changes
      const wrappedSet = (...args: any[]) => {
        // Log before the update
        logStore(
          storeName,
          'update',
          `${storeName} state update starting`
        );

        // Call the original set function
        const result = set(...args);

        // Log after the update
        logStore(
          storeName,
          'update',
          `${storeName} state updated`,
          { 
            newState: get(),
            updateType: typeof args[0] === 'function' ? 'function' : 'object',
          }
        );

        return result;
      };

      // Return the config with the wrapped set function
      return config(wrappedSet, get, api);
    };
  };
}

export default {
  monitorExistingStore,
  createDiagnosticsMiddleware
};