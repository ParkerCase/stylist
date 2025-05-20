// Diagnostics logging system for Stylist Widget

import { useEffect, useState } from 'react';

// Configuration
const LOG_DIAGNOSTICS = process.env.LOG_DIAGNOSTICS !== 'false';
const LOG_PATH = process.env.LOG_PATH || './logs';
const LOG_FILE = process.env.LOG_FILE || 'diagnostics.log.json';
const MAX_LOG_ENTRIES = 1000;

// Log entry types
export enum LogEntryType {
  COMPONENT_MOUNT = 'COMPONENT_MOUNT',
  COMPONENT_UNMOUNT = 'COMPONENT_UNMOUNT',
  COMPONENT_RENDER = 'COMPONENT_RENDER',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  SUSPENSE_FALLBACK = 'SUSPENSE_FALLBACK',
  SUSPENSE_RESOLVED = 'SUSPENSE_RESOLVED',
  LAZY_LOAD_START = 'LAZY_LOAD_START',
  LAZY_LOAD_COMPLETE = 'LAZY_LOAD_COMPLETE',
  LAZY_LOAD_ERROR = 'LAZY_LOAD_ERROR',
  HOOK_INIT = 'HOOK_INIT',
  EFFECT_START = 'EFFECT_START',
  EFFECT_COMPLETE = 'EFFECT_COMPLETE',
  EFFECT_CLEANUP = 'EFFECT_CLEANUP',
  STORE_INIT = 'STORE_INIT',
  STORE_UPDATE = 'STORE_UPDATE',
  STORE_SUBSCRIPTION = 'STORE_SUBSCRIPTION',
  ERROR_BOUNDARY = 'ERROR_BOUNDARY',
  GLOBAL_FLAG = 'GLOBAL_FLAG',
  PERFORMANCE_MARK = 'PERFORMANCE_MARK',
  APPLICATION_ERROR = 'APPLICATION_ERROR',
  CUSTOM = 'CUSTOM'
}

// Log level enum
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  type: LogEntryType;
  level: LogLevel;
  component?: string;
  message: string;
  data?: any;
  stack?: string;
}

// In-memory log storage
let inMemoryLog: LogEntry[] = [];

// Ensure we're in a browser environment before using window
const isBrowser = typeof window !== 'undefined';

// Initialize the in-memory log on load
if (isBrowser) {
  // Store the original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  // Add the diagnostics log to the window for debug access
  (window as any).__STYLIST_DIAGNOSTICS = {
    logs: inMemoryLog,
    enabled: LOG_DIAGNOSTICS,
    originalConsole,
  };
}

/**
 * Adds a diagnostic log entry
 */
export const logDiagnostic = (
  type: LogEntryType,
  message: string,
  options: {
    level?: LogLevel;
    component?: string;
    data?: any;
    stack?: string;
  } = {}
): void => {
  if (!LOG_DIAGNOSTICS) return;

  const {
    level = LogLevel.INFO,
    component,
    data,
    stack,
  } = options;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    level,
    message,
    component,
    data,
    stack,
  };

  // Add to in-memory log with size limitation
  inMemoryLog.push(entry);
  if (inMemoryLog.length > MAX_LOG_ENTRIES) {
    inMemoryLog = inMemoryLog.slice(-MAX_LOG_ENTRIES);
  }

  // Log to console in development with special formatting
  if (process.env.NODE_ENV === 'development') {
    const logObject = {
      type,
      component: component || 'global',
      message,
      ...(data ? { data } : {}),
    };

    console.log(
      `%c DIAGNOSTICS %c ${type} %c ${component || 'global'} `,
      'background: #6610f2; color: white; border-radius: 3px 0 0 3px;',
      'background: #fd7e14; color: white;',
      'background: #17a2b8; color: white; border-radius: 0 3px 3px 0;',
      logObject
    );
  }

  // In browser environment, we can't write to disk directly
  // Instead, we'll signal to any Node.js process reading our logs
  // that we have new logs via special console output
  if (process.env.NODE_ENV === 'development') {
    // Output a special marker that can be picked up by diagnose.js
    console.log(`__STYLIST_DIAGNOSTIC_LOG_ENTRY__:${JSON.stringify(entry)}`);
  }

  // In browser environment, if window.__STYLIST_DIAGNOSTICS_LOG_TO_TEMP is set,
  // also log to localStorage as a fallback
  if (isBrowser && (window as any).__STYLIST_DIAGNOSTICS_LOG_TO_TEMP) {
    try {
      const storedLogs = localStorage.getItem('__STYLIST_DIAGNOSTICS_LOGS') || '[]';
      const parsedLogs = JSON.parse(storedLogs);
      parsedLogs.push(entry);
      
      // Limit size
      const limitedLogs = parsedLogs.slice(-MAX_LOG_ENTRIES);
      localStorage.setItem('__STYLIST_DIAGNOSTICS_LOGS', JSON.stringify(limitedLogs));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }
};

/**
 * Log component rendering lifecycle
 */
export const logComponentRender = (
  component: string,
  stage: 'mount' | 'render' | 'update' | 'unmount' | 'error' | 'init' | 'action' | 'debug' | 'warning',
  message: string,
  data?: any
): void => {
  const typeMap = {
    mount: LogEntryType.COMPONENT_MOUNT,
    render: LogEntryType.COMPONENT_RENDER,
    update: LogEntryType.COMPONENT_RENDER,
    unmount: LogEntryType.COMPONENT_UNMOUNT,
    error: LogEntryType.COMPONENT_ERROR,
    init: LogEntryType.COMPONENT_MOUNT,  // Map init to mount
    action: LogEntryType.CUSTOM,        // Actions are custom events
    debug: LogEntryType.CUSTOM,         // Debug events are custom
    warning: LogEntryType.CUSTOM,       // Warnings are custom
  };

  const levelMap = {
    mount: LogLevel.INFO,
    render: LogLevel.DEBUG,
    update: LogLevel.DEBUG,
    unmount: LogLevel.INFO,
    error: LogLevel.ERROR,
    init: LogLevel.INFO,     // Init is info level
    action: LogLevel.INFO,   // Actions are info level
    debug: LogLevel.DEBUG,   // Debug is debug level
    warning: LogLevel.WARNING, // Warnings are warning level
  };

  logDiagnostic(typeMap[stage], message, {
    level: levelMap[stage],
    component,
    data,
  });
};

/**
 * Log suspense lifecycle
 */
export const logSuspense = (
  component: string,
  state: 'fallback' | 'resolved',
  message: string,
  data?: any
): void => {
  const type = state === 'fallback'
    ? LogEntryType.SUSPENSE_FALLBACK
    : LogEntryType.SUSPENSE_RESOLVED;

  logDiagnostic(type, message, {
    component,
    data,
  });
};

/**
 * Log lazy loading lifecycle
 */
export const logLazyLoad = (
  component: string,
  stage: 'start' | 'complete' | 'error',
  message: string,
  data?: any
): void => {
  const typeMap = {
    start: LogEntryType.LAZY_LOAD_START,
    complete: LogEntryType.LAZY_LOAD_COMPLETE,
    error: LogEntryType.LAZY_LOAD_ERROR,
  };

  const levelMap = {
    start: LogLevel.INFO,
    complete: LogLevel.INFO,
    error: LogLevel.ERROR,
  };

  logDiagnostic(typeMap[stage], message, {
    level: levelMap[stage],
    component,
    data,
  });
};

/**
 * Log React hook lifecycle
 */
export const logHook = (
  component: string,
  hook: string,
  stage: 'init' | 'update' | 'cleanup',
  message: string,
  data?: any
): void => {
  let type = LogEntryType.HOOK_INIT;
  if (stage === 'update') {
    type = LogEntryType.EFFECT_START;
  } else if (stage === 'cleanup') {
    type = LogEntryType.EFFECT_CLEANUP;
  }

  logDiagnostic(type, message, {
    component,
    data: {
      hook,
      ...data,
    },
  });
};

/**
 * Log store operations
 */
export const logStore = (
  store: string,
  operation: 'init' | 'update' | 'subscribe' | 'unsubscribe',
  message: string,
  data?: any
): void => {
  const typeMap = {
    init: LogEntryType.STORE_INIT,
    update: LogEntryType.STORE_UPDATE,
    subscribe: LogEntryType.STORE_SUBSCRIPTION,
    unsubscribe: LogEntryType.STORE_SUBSCRIPTION,
  };

  logDiagnostic(typeMap[operation], message, {
    component: store,
    data: {
      operation,
      ...data,
    },
  });
};

/**
 * Log error boundary activations
 */
export const logErrorBoundary = (
  component: string,
  error: Error,
  info?: React.ErrorInfo
): void => {
  logDiagnostic(LogEntryType.ERROR_BOUNDARY, `Error boundary triggered in ${component}`, {
    level: LogLevel.ERROR,
    component,
    data: {
      errorMessage: error.message,
      componentStack: info?.componentStack,
    },
    stack: error.stack,
  });
};

/**
 * Log global flag changes
 */
export const logGlobalFlag = (
  flag: string,
  value: any,
  message: string,
  data?: any
): void => {
  logDiagnostic(LogEntryType.GLOBAL_FLAG, message, {
    data: {
      flag,
      value,
      ...(data || {})
    },
  });
};

/**
 * Log performance mark
 */
export const logPerformance = (
  name: string,
  duration?: number,
  data?: any
): void => {
  logDiagnostic(LogEntryType.PERFORMANCE_MARK, `Performance: ${name}`, {
    data: {
      name,
      duration,
      ...data,
    },
  });
};

/**
 * React hook for component lifecycle logging
 */
export const useDiagnosticLifecycle = (componentName: string): void => {
  useEffect(() => {
    // Component mounted
    logComponentRender(componentName, 'mount', `${componentName} mounted`);

    // Component will unmount
    return () => {
      logComponentRender(componentName, 'unmount', `${componentName} unmounted`);
    };
  }, [componentName]);
};

/**
 * Get all diagnostic logs
 */
export const getDiagnosticLogs = (): LogEntry[] => {
  // First check in-memory logs
  if (inMemoryLog.length > 0) {
    return [...inMemoryLog];
  }

  // If we're in the browser, check localStorage
  if (isBrowser) {
    try {
      const storedLogs = localStorage.getItem('__STYLIST_DIAGNOSTICS_LOGS');
      if (storedLogs) {
        return JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Error retrieving logs from localStorage:', error);
    }
  }

  // In browser context, we can't directly read from disk.
  // This will be handled by the diagnose.js script in Node.js environment.

  return [];
};

/**
 * Clear diagnostic logs
 */
export const clearDiagnosticLogs = (): void => {
  inMemoryLog = [];

  // Clear localStorage logs if we're in the browser
  if (isBrowser) {
    try {
      localStorage.removeItem('__STYLIST_DIAGNOSTICS_LOGS');
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  // In browser context, we can't directly write to disk.
  // File operations will be handled by the diagnose.js script.
};

export default {
  logDiagnostic,
  logComponentRender,
  logSuspense,
  logLazyLoad,
  logHook,
  logStore,
  logErrorBoundary,
  logGlobalFlag,
  logPerformance,
  useDiagnosticLifecycle,
  getDiagnosticLogs,
  clearDiagnosticLogs,
  LogEntryType,
  LogLevel,
};