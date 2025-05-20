import deviceCapabilities, { getDeviceCapabilities } from './deviceCapabilities';

/**
 * Cache of already loaded images to prevent duplicate fetches
 */
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Loads an image with appropriate optimizations based on device capabilities
 */
export const loadOptimizedImage = async (
  url: string, 
  options: {
    quality?: 'high' | 'medium' | 'low';
    cache?: boolean;
    lowMemoryFallback?: string;
  } = {}
): Promise<HTMLImageElement> => {
  const {
    quality = 'high',
    cache = true,
    lowMemoryFallback
  } = options;
  
  // For low memory devices, return the fallback image if provided
  if (lowMemoryFallback) {
    // Use the device capabilities to check memory
    const capabilities = await getDeviceCapabilities();
    if (capabilities.memory === 'low') {
      return loadImage(lowMemoryFallback, { cache });
    }
  }
  
  // Determine optimal quality based on device capabilities - default to the requested quality
  let adaptiveQuality = quality;
  
  // Modify URL based on quality if needed
  let optimizedUrl = url;
  if (adaptiveQuality !== 'high') {
    optimizedUrl = getOptimizedImageUrl(url, adaptiveQuality);
  }
  
  return loadImage(optimizedUrl, { cache });
};

/**
 * Basic image loader with caching
 */
export const loadImage = (
  url: string, 
  options: { cache?: boolean } = {}
): Promise<HTMLImageElement> => {
  const { cache = true } = options;
  
  // Use cached image if available
  if (cache && imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      if (cache) {
        imageCache.set(url, img);
      }
      resolve(img);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });
};

/**
 * Converts a URL to a lower quality version if supported
 */
export const getOptimizedImageUrl = (url: string, quality: 'high' | 'medium' | 'low'): string => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // For URLs with query parameters, modify them if appropriate
    if (parsedUrl.pathname.match(/\.(jpe?g|png)$/i)) {
      // Local images
      if (parsedUrl.hostname === window.location.hostname) {
        // Add quality parameter for local images
        parsedUrl.searchParams.set('q', quality === 'low' ? '60' : '80');
        return parsedUrl.toString();
      }
    }
    
    // For CDN or third-party image services that support quality settings
    if (parsedUrl.hostname.includes('cloudinary.com')) {
      // Modify cloudinary URLs to use their quality parameters
      if (quality === 'low') {
        const newPath = parsedUrl.pathname.replace('/upload/', '/upload/q_auto:low/');
        parsedUrl.pathname = newPath;
      } else if (quality === 'medium') {
        const newPath = parsedUrl.pathname.replace('/upload/', '/upload/q_auto:good/');
        parsedUrl.pathname = newPath;
      }
      return parsedUrl.toString();
    }
    
    // For imgix and similar services
    if (parsedUrl.hostname.includes('imgix.net')) {
      const qualityMap = { high: 90, medium: 75, low: 60 };
      parsedUrl.searchParams.set('q', qualityMap[quality].toString());
      return parsedUrl.toString();
    }
    
    // For unsupported URLs, return the original
    return url;
  } catch (e) {
    // If URL parsing fails, return the original
    console.warn('Failed to optimize image URL:', url, e);
    return url;
  }
};

/**
 * Prefetches important images to speed up later use
 */
export const prefetchCriticalImages = (urls: string[]): void => {
  // Determine if we should prefetch based on device capabilities
  getDeviceCapabilities().then(capabilities => {
    // Skip prefetching on low-end devices with poor network
    if (capabilities.network === 'slow' || capabilities.memory === 'low') {
      return;
    }
    
    // Determine if this is a high-end device
    const isHighEnd = capabilities.performance === 'high' && capabilities.gpu === 'high';
    
    // Limit the number of prefetched images based on device capabilities
    const limit = isHighEnd ? urls.length : 3;
    const limitedUrls = urls.slice(0, limit);
    
    limitedUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = isHighEnd ? url : getOptimizedImageUrl(url, 'low');
      document.head.appendChild(link);
    });
  }).catch(err => {
    console.warn('Failed to determine device capabilities for image prefetching:', err);
  });
};

/**
 * Clears the image cache to free memory
 */
export const clearImageCache = (): void => {
  imageCache.clear();
};