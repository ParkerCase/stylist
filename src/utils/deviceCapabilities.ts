// deviceCapabilities.ts
// Utility for detecting device capabilities and adjusting performance

export interface DeviceCapabilities {
  performance: 'low' | 'medium' | 'high';
  memory: 'low' | 'medium' | 'high';
  gpu: 'low' | 'medium' | 'high';
  network: 'slow' | 'medium' | 'fast';
  screenSize: 'small' | 'medium' | 'large';
  battery: 'low' | 'medium' | 'high' | 'unknown';
  touch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
}

// Singleton to store results for reuse across components
let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Calculate network speed based on navigator.connection
 */
function calculateNetworkSpeed(): 'slow' | 'medium' | 'fast' {
  // Check if Network Information API is available
  const conn = (navigator as any).connection;
  
  if (!conn) return 'medium';

  // Check effectiveType
  if (conn.effectiveType) {
    switch (conn.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'slow';
      case '3g':
        return 'medium';
      case '4g':
      case '5g':
        return 'fast';
      default:
        return 'medium';
    }
  }

  // Fallback: check downlink speed if available
  if (conn.downlink) {
    if (conn.downlink < 1) return 'slow';
    if (conn.downlink < 5) return 'medium';
    return 'fast';
  }

  return 'medium';
}

/**
 * Calculate battery status if available
 */
async function calculateBatteryStatus(): Promise<'low' | 'medium' | 'high' | 'unknown'> {
  try {
    // Check if Battery API is available
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      
      if (battery.charging) return 'high'; // Charging so power is not a concern
      
      // Battery percentage checks
      if (battery.level < 0.2) return 'low';
      if (battery.level < 0.5) return 'medium';
      return 'high';
    }
  } catch (error) {
    console.warn('Battery status detection failed:', error);
  }
  
  return 'unknown';
}

/**
 * Calculate GPU capabilities
 */
function calculateGPUCapabilities(): 'low' | 'medium' | 'high' {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'low';
    
    // Check for basic WebGL capabilities
    const webGLContext = gl as WebGLRenderingContext;
    const debugInfo = webGLContext.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'medium';
    
    const renderer = webGLContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    const gpuVendor = webGLContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    
    // Convert to lowercase for easier comparisons
    const rendererString = renderer.toString().toLowerCase();
    const vendorString = gpuVendor.toString().toLowerCase();
    
    // Check for high-end GPUs
    if (
      rendererString.includes('nvidia') ||
      rendererString.includes('geforce') ||
      rendererString.includes('radeon') ||
      rendererString.includes('intel iris') ||
      rendererString.includes('apple gpu')
    ) {
      return 'high';
    }
    
    // Check for medium GPUs
    if (
      rendererString.includes('intel') ||
      vendorString.includes('intel') ||
      rendererString.includes('mali-t') ||
      rendererString.includes('adreno')
    ) {
      return 'medium';
    }
    
    return 'low';
  } catch (error) {
    console.warn('GPU detection failed:', error);
    return 'low';
  }
}

/**
 * Calculate device performance based on various metrics
 */
function calculatePerformance(): 'low' | 'medium' | 'high' {
  // Check for navigator.deviceMemory
  const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
  
  // Check for navigator.hardwareConcurrency
  const cpuCores = navigator.hardwareConcurrency || 2; // Default to 2 cores if not available
  
  // Detect mobile vs desktop
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Mobile devices are generally less powerful than desktops
  if (isMobile) {
    if (memory <= 2 || cpuCores <= 4) return 'low';
    if (memory <= 4 || cpuCores <= 6) return 'medium';
    return 'high';
  } else {
    if (memory <= 4 || cpuCores <= 2) return 'low';
    if (memory <= 8 || cpuCores <= 4) return 'medium';
    return 'high';
  }
}

/**
 * Detect screen size category
 */
function detectScreenSize(): 'small' | 'medium' | 'large' {
  const width = window.innerWidth;
  
  if (width < 768) return 'small';
  if (width < 1280) return 'medium';
  return 'large';
}

/**
 * Detect device type
 */
function detectDeviceType(): { isIOS: boolean, isAndroid: boolean, isDesktop: boolean } {
  const ua = navigator.userAgent.toLowerCase();
  
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;
  
  return { isIOS, isAndroid, isDesktop };
}

/**
 * Get device capabilities with optional force refresh
 */
export async function getDeviceCapabilities(forceRefresh = false): Promise<DeviceCapabilities> {
  // Return cached results if available and not forcing refresh
  if (cachedCapabilities && !forceRefresh) {
    return cachedCapabilities;
  }
  
  const deviceType = detectDeviceType();
  const batteryStatus = await calculateBatteryStatus();
  
  cachedCapabilities = {
    performance: calculatePerformance(),
    memory: (navigator as any).deviceMemory ? 
      ((navigator as any).deviceMemory <= 2 ? 'low' : 
       (navigator as any).deviceMemory <= 4 ? 'medium' : 'high') : 
      'medium',
    gpu: calculateGPUCapabilities(),
    network: calculateNetworkSpeed(),
    screenSize: detectScreenSize(),
    battery: batteryStatus,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    ...deviceType
  };
  
  // Log to console for development purposes
  console.log('[DeviceCapabilities] Detected:', cachedCapabilities);
  
  return cachedCapabilities;
}

/**
 * Returns a performance tier for overall device capability
 * Used for quick decision making in components
 */
export function getPerformanceTier(): 'low' | 'medium' | 'high' {
  // Use cached capabilities if available
  if (cachedCapabilities) {
    // Weight factors for different aspects
    const performanceWeight = 0.35;
    const memoryWeight = 0.25;
    const gpuWeight = 0.25;
    const networkWeight = 0.15;
    
    // Convert string values to numeric scores
    const performanceScore = cachedCapabilities.performance === 'low' ? 1 : 
                           cachedCapabilities.performance === 'medium' ? 2 : 3;
    
    const memoryScore = cachedCapabilities.memory === 'low' ? 1 : 
                       cachedCapabilities.memory === 'medium' ? 2 : 3;
    
    const gpuScore = cachedCapabilities.gpu === 'low' ? 1 : 
                   cachedCapabilities.gpu === 'medium' ? 2 : 3;
    
    const networkScore = cachedCapabilities.network === 'slow' ? 1 : 
                        cachedCapabilities.network === 'medium' ? 2 : 3;
    
    // Calculate weighted average
    const weightedScore = 
      (performanceScore * performanceWeight) +
      (memoryScore * memoryWeight) +
      (gpuScore * gpuWeight) +
      (networkScore * networkWeight);
    
    // Convert back to tier
    if (weightedScore < 1.67) return 'low';
    if (weightedScore < 2.33) return 'medium';
    return 'high';
  }
  
  // Fallback if not calculated yet
  return 'medium';
}

/**
 * Hook for using device capabilities in React components
 */
export function useDeviceCapabilities(forceRefresh = false): {
  capabilities: DeviceCapabilities | null;
  isLoading: boolean;
  refresh: () => Promise<DeviceCapabilities>;
} {
  // Would be implemented with React hooks in a real component
  // This is just a placeholder for the utility file
  return {
    capabilities: cachedCapabilities,
    isLoading: !cachedCapabilities,
    refresh: () => getDeviceCapabilities(true)
  };
}

/**
 * Determine if a feature should be enabled based on device capabilities
 */
export function shouldEnableFeature(
  featureName: 'virtualTryOn' | 'animations' | 'highQualityImages' | 'backgroundEffects' | 'autoplay' | 'realTimeUpdates',
  requiredTier: 'low' | 'medium' | 'high' = 'medium'
): boolean {
  const tier = getPerformanceTier();
  
  // Mapping of tiers to numeric values
  const tierValues = {
    'low': 1,
    'medium': 2,
    'high': 3
  };
  
  // Special cases for specific features
  if (featureName === 'virtualTryOn') {
    // Virtual try-on might require more GPU and memory
    return tierValues[cachedCapabilities?.gpu || 'medium'] >= tierValues[requiredTier] &&
           tierValues[cachedCapabilities?.memory || 'medium'] >= tierValues[requiredTier];
  }
  
  if (featureName === 'highQualityImages') {
    // Consider network speed for image quality
    return tierValues[cachedCapabilities?.network || 'medium'] >= tierValues[requiredTier];
  }
  
  if (featureName === 'realTimeUpdates') {
    // Real-time updates might depend on network more than other factors
    if (cachedCapabilities?.network === 'slow') return false;
    if (requiredTier === 'low') return true;
    return tierValues[cachedCapabilities?.network || 'medium'] >= tierValues[requiredTier];
  }
  
  // For most features, just use the overall performance tier
  return tierValues[tier] >= tierValues[requiredTier];
}

// Initialize capabilities when the module is imported
getDeviceCapabilities().catch(error => {
  console.error('Failed to initialize device capabilities:', error);
});

export default {
  getDeviceCapabilities,
  getPerformanceTier,
  shouldEnableFeature
};