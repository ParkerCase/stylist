/**
 * Debug Mode Utility
 * 
 * This utility provides a way to toggle debug mode for the application.
 * In debug mode, additional information is displayed to help diagnose issues.
 */

/**
 * Store the debug mode state
 */
let debugMode = false;

/**
 * Event name for debug mode changes
 */
const DEBUG_MODE_CHANGE_EVENT = 'stylist:debug-mode-change';

/**
 * Toggle the debug mode state
 * @returns The new debug mode state
 */
export const toggleDebugMode = (): boolean => {
  debugMode = !debugMode;
  
  // Store the debug mode state in localStorage
  try {
    localStorage.setItem('stylist_debug_mode', String(debugMode));
  } catch (error) {
    console.warn('Failed to persist debug mode state to localStorage:', error);
  }

  // Dispatch a custom event to notify components of the change
  const event = new CustomEvent(DEBUG_MODE_CHANGE_EVENT, { detail: { debugMode } });
  window.dispatchEvent(event);
  
  return debugMode;
};

/**
 * Get the current debug mode state
 * @returns The current debug mode state
 */
export const getDebugMode = (): boolean => {
  return debugMode;
};

/**
 * Initialize the debug mode from localStorage if available
 */
export const initDebugMode = (): void => {
  try {
    const storedDebugMode = localStorage.getItem('stylist_debug_mode');
    if (storedDebugMode !== null) {
      debugMode = storedDebugMode === 'true';
    }
  } catch (error) {
    console.warn('Failed to read debug mode state from localStorage:', error);
  }
};

/**
 * A hook to listen for debug mode changes
 * @param callback Function to call when debug mode changes
 */
export const addDebugModeListener = (callback: (isDebugMode: boolean) => void): (() => void) => {
  const handleDebugModeChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail.debugMode);
  };
  
  window.addEventListener(DEBUG_MODE_CHANGE_EVENT, handleDebugModeChange);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener(DEBUG_MODE_CHANGE_EVENT, handleDebugModeChange);
  };
};

/**
 * Log a message only when in debug mode
 * @param message The message to log
 * @param args Additional arguments to log
 */
export const debugLog = (message: string, ...args: any[]): void => {
  if (debugMode) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Log an error only when in debug mode
 * @param message The error message to log
 * @param error The error object
 */
export const debugError = (message: string, error?: any): void => {
  if (debugMode) {
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
};

// Initialize debug mode when this module is loaded
initDebugMode();