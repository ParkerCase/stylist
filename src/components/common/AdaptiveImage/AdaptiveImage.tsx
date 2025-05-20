import React, { useState, useEffect, useRef, memo } from 'react';
import { getDeviceCapabilities } from '../../../utils/deviceCapabilities';
import { performanceMonitor } from '../../../utils/performanceMonitoring';
import './AdaptiveImage.scss';

export interface AdaptiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholderSrc?: string;
  loadingPriority?: 'high' | 'medium' | 'low';
  quality?: 'high' | 'medium' | 'low';
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

const DEFAULT_BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4=';

const getQualityModifiedUrl = (originalUrl: string, quality: 'high' | 'medium' | 'low'): string => {
  // If the URL already includes quality parameters, avoid adding duplicates
  if (originalUrl.includes('quality=') || originalUrl.includes('q=')) {
    return originalUrl;
  }

  const url = new URL(originalUrl, window.location.origin);
  
  // If URL is to a third-party service that supports image optimization
  if (url.hostname.includes('cloudinary.com')) {
    // Example: Add Cloudinary quality parameters
    if (quality === 'low') {
      url.pathname = url.pathname.replace('/upload/', '/upload/q_auto:low/');
    } else if (quality === 'medium') {
      url.pathname = url.pathname.replace('/upload/', '/upload/q_auto:good/');
    }
    // For high quality, no modification needed
    return url.toString();
  } else if (url.hostname.includes('imgix.net')) {
    // Example: Add Imgix quality parameters
    const qualityMap = { high: 90, medium: 75, low: 60 };
    url.searchParams.set('q', qualityMap[quality].toString());
    return url.toString();
  }

  // For local images or unsupported services, return original URL
  return originalUrl;
};

const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderSrc = DEFAULT_BLUR_PLACEHOLDER,
  loadingPriority = 'medium',
  quality: requestedQuality = 'high',
  onLoad,
  onError,
  style,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(0);
  
  // Determine actual quality based on device capabilities and requested quality
  const actualQuality = requestedQuality; // Use requested quality directly for now
  
  // Get appropriate image source based on quality
  const optimizedSrc = getQualityModifiedUrl(src, actualQuality);
  
  // Determine loading strategy based on priority
  const shouldLazyLoad = loadingPriority === 'low' || loadingPriority === 'medium';
  
  useEffect(() => {
    // Reset states when src changes
    setLoaded(false);
    setError(false);
    
    // Track start time for performance monitoring
    startTimeRef.current = performance.now();
    
    // For high priority images, preload the image
    if (loadingPriority === 'high') {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = optimizedSrc;
      document.head.appendChild(preloadLink);
      
      return () => {
        document.head.removeChild(preloadLink);
      };
    }
  }, [optimizedSrc, loadingPriority]);
  
  const handleLoad = () => {
    const loadTime = performance.now() - startTimeRef.current;
    
    try {
      // Use a safer way to track image loading
      if (performanceMonitor && typeof performanceMonitor.recordComponentRender === 'function') {
        // Use the component render method as a fallback
        performanceMonitor.recordComponentRender('AdaptiveImage_Load', loadTime);
      }
    } catch (err) {
      console.log('Performance monitoring error:', err);
    }
    
    setLoaded(true);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    try {
      // Use a safer way to track image errors
      if (performanceMonitor && typeof performanceMonitor.recordComponentRender === 'function') {
        // Use the component render method as a fallback
        performanceMonitor.recordComponentRender('AdaptiveImage_Error', 0);
      }
    } catch (err) {
      console.log('Performance monitoring error:', err);
    }
    
    setError(true);
    if (onError) onError();
  };
  
  // Apply loading strategy
  const loadingAttr = shouldLazyLoad ? 'lazy' : 'eager';
  
  // Calculate aspect ratio to prevent layout shifts
  const hasExplicitDimensions = width && height;
  const aspectRatio = hasExplicitDimensions ? `${width}/${height}` : undefined;
  
  return (
    <div 
      className={`adaptive-image ${loaded ? 'loaded' : ''} ${error ? 'error' : ''} ${className}`}
      style={{
        width: width || '100%',
        height: height || '100%',
        aspectRatio,
        ...style
      }}
    >
      {/* Placeholder while loading */}
      {!loaded && !error && (
        <div 
          className="adaptive-image__placeholder"
          style={{ 
            backgroundImage: `url(${placeholderSrc})`,
            width: '100%',
            height: '100%'
          }} 
        />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={error ? placeholderSrc : optimizedSrc}
        alt={alt}
        loading={loadingAttr}
        onLoad={handleLoad}
        onError={handleError}
        className={`adaptive-image__img ${loaded ? 'visible' : ''}`}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
};

export default memo(AdaptiveImage);