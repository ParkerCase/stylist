/**
 * Centralized initialization and environment detection for The Stylist
 */

// Check WebGL capabilities
export function checkWebGLSupport(): { supported: boolean; error?: string } {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    
    // Try to get WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { 
        supported: false,
        error: 'WebGL not supported by this browser' 
      };
    }
    
    // Cast to WebGLRenderingContext to access WebGL specific properties
    const webGLContext = gl as WebGLRenderingContext;
    
    // Check for specific WebGL capabilities needed by TensorFlow
    const maxTextureSize = webGLContext.getParameter(webGLContext.MAX_TEXTURE_SIZE);
    const maxTextureUnits = webGLContext.getParameter(webGLContext.MAX_TEXTURE_IMAGE_UNITS);
    
    if (maxTextureSize < 4096) {
      return {
        supported: false,
        error: `WebGL texture size limit (${maxTextureSize}) is too low for optimal operation`
      };
    }
    
    if (maxTextureUnits < 8) {
      return {
        supported: false,
        error: `WebGL texture units (${maxTextureUnits}) are too few for optimal operation`
      };
    }
    
    return { supported: true };
  } catch (error) {
    console.error('Error detecting WebGL support:', error);
    return { 
      supported: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Configure module loading based on environment
export function configureModuleLoading() {
  // Global flag to indicate that we're configuring module loading
  window.__STYLIST_MODULE_LOADING_CONFIGURED = true;
  
  // Detect browser features and set appropriate loading strategies
  const webGLSupport = checkWebGLSupport();
  
  // Detect low-end devices
  const isLowEndDevice = () => {
    // Check for memory constraints (deviceMemory is not standard, so we need to type cast)
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
    const lowMemory = navigatorWithMemory.deviceMemory !== undefined && navigatorWithMemory.deviceMemory < 4;
    
    // Check for CPU constraints (using a simple heuristic based on hardware concurrency)
    const lowCPU = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4;
    
    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return lowMemory || lowCPU || isMobile;
  };
  
  // Apply appropriate loading strategy based on environment
  window.__STYLIST_LOADING_STRATEGY = {
    useLazyLoading: true, // Always use lazy loading
    useParallelInit: !isLowEndDevice(), // Use parallel init for high-end devices
    webGLSupported: webGLSupport.supported,
    fallbackToLowPerformance: !webGLSupport.supported || isLowEndDevice(),
    asyncComponentTimeout: isLowEndDevice() ? 15000 : 10000, // Longer timeout for low-end devices
  };
  
  // Set appropriate flags for component initialization
  window.__STYLIST_WIDGET_FLAGS = {
    // Skip TryOn if WebGL is not supported
    enableTryOn: webGLSupport.supported,
    // Initialize stores before DOM mounting
    storesBeforeDom: true,
    // Use error-tolerant initialization
    tolerateErrors: true,
  };
  
  console.log('Module loading configured:', window.__STYLIST_LOADING_STRATEGY);
}

// Simplified initialization function
export function initializeWidget(config: any) {
  // Make sure module loading is configured first
  if (!window.__STYLIST_MODULE_LOADING_CONFIGURED) {
    configureModuleLoading();
  }
  
  // Set global initialization flag to prevent multiple initializations
  if (window.__STYLIST_WIDGET_INITIALIZING === true) {
    console.warn('Widget initialization already in progress');
    return;
  }
  
  window.__STYLIST_WIDGET_INITIALIZING = true;
  
  try {
    // Initialize stores first (synchronously)
    console.log('[LIFECYCLE:init] Initializing stores');
    
    // Set appropriate initialization flags
    window.__STYLIST_STORES_INITIALIZING = true;
    
    // Apply timeout for initialization to prevent hanging
    const initTimeout = setTimeout(() => {
      console.warn('[LIFECYCLE:init] Initialization timed out after 10s, forcing completion');
      window.__STYLIST_WIDGET_INITIALIZED = true;
      window.__STYLIST_STORES_INITIALIZED = true;
      window.__STYLIST_STORES_INITIALIZING = false;
    }, 10000);
    
    // Clean up the timeout when initialization is complete
    const cleanupTimeout = () => {
      clearTimeout(initTimeout);
    };
    
    // Simplified background initialization approach
    setTimeout(() => {
      window.__STYLIST_STORES_INITIALIZED = true;
      window.__STYLIST_STORES_INITIALIZING = false;
      console.log('[LIFECYCLE:init] Stores initialized');
      
      // After stores are initialized, initialize the DOM
      window.__STYLIST_WIDGET_DOM_MOUNTING = true;
      
      // Mark initialization as complete after a delay to allow for DOM mounting
      setTimeout(() => {
        window.__STYLIST_WIDGET_INITIALIZED = true;
        window.__STYLIST_WIDGET_DOM_MOUNTED = true;
        window.__STYLIST_WIDGET_DOM_MOUNTING = false;
        window.__STYLIST_BACKGROUND_INIT_COMPLETE = true;
        console.log('[LIFECYCLE:init] Widget initialization complete');
        
        cleanupTimeout();
      }, 1000);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('[LIFECYCLE:init] Error during initialization:', error);
    
    // Force flags to complete in case of error to avoid hanging
    window.__STYLIST_WIDGET_INITIALIZED = true;
    window.__STYLIST_STORES_INITIALIZED = true;
    window.__STYLIST_STORES_INITIALIZING = false;
    window.__STYLIST_WIDGET_INITIALIZING = false;
    
    return false;
  }
}

// Global type definitions
declare global {
  interface Window {
    __STYLIST_WIDGET_INITIALIZING?: boolean;
    __STYLIST_WIDGET_INITIALIZED?: boolean;
    __STYLIST_WIDGET_DOM_MOUNTING?: boolean;
    __STYLIST_WIDGET_DOM_MOUNTED?: boolean;
    __STYLIST_STORES_INITIALIZING?: boolean;
    __STYLIST_STORES_INITIALIZED?: boolean;
    __STYLIST_BACKGROUND_INIT_COMPLETE?: boolean;
    __STYLIST_WIDGET_RENDER_COMPLETE?: boolean;
    __STYLIST_MODULE_LOADING_CONFIGURED?: boolean;
    __STYLIST_LOADING_STRATEGY?: {
      useLazyLoading: boolean;
      useParallelInit: boolean;
      webGLSupported: boolean;
      fallbackToLowPerformance: boolean;
      asyncComponentTimeout: number;
    };
    __STYLIST_WIDGET_FLAGS?: {
      enableTryOn: boolean;
      storesBeforeDom: boolean;
      tolerateErrors: boolean;
    };
  }
}

export default {
  checkWebGLSupport,
  configureModuleLoading,
  initializeWidget
};