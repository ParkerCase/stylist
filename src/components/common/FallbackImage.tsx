// src/components/common/FallbackImage.tsx

import React, { useState, useEffect } from 'react';
import './FallbackImage.scss';
import { debugLog } from '../../utils/debugMode';

interface FallbackImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholderSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * FallbackImage Component
 * 
 * An image component that handles loading, errors, and provides fallbacks
 * for graceful degradation when images can't be loaded.
 */
const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholderSrc,
  className = '',
  style = {},
  width,
  height,
  onLoad,
  onError,
  lazy = true,
  objectFit = 'cover'
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(placeholderSrc || src);
  
  // Handle image loading when src changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setImgSrc(placeholderSrc || src);
    
    // If no src provided, show error
    if (!src) {
      setError(true);
      setLoading(false);
      debugLog('FallbackImage: No src provided');
      return;
    }
    
    // Preload the image
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setLoading(false);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      debugLog(`FallbackImage: Failed to load image: ${src}`);
      setError(true);
      setLoading(false);
      
      // Try fallback if available
      if (fallbackSrc) {
        debugLog(`FallbackImage: Trying fallback: ${fallbackSrc}`);
        const fallbackImg = new Image();
        fallbackImg.src = fallbackSrc;
        
        fallbackImg.onload = () => {
          setImgSrc(fallbackSrc);
          setError(false);
        };
        
        fallbackImg.onerror = () => {
          debugLog(`FallbackImage: Fallback also failed: ${fallbackSrc}`);
          if (onError) onError();
        };
      } else {
        if (onError) onError();
      }
    };
    
    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc, placeholderSrc, onLoad, onError]);
  
  // Generate CSS classes for the component
  const imageClasses = [
    'stylist-fallback-image',
    loading ? 'stylist-fallback-image--loading' : '',
    error ? 'stylist-fallback-image--error' : '',
    className
  ].filter(Boolean).join(' ');
  
  // Combine inline styles
  const combinedStyle = {
    ...style,
    width: width,
    height: height,
    objectFit: objectFit
  };
  
  // Render a placeholder or error if needed
  if (error && !fallbackSrc) {
    return (
      <div 
        className={`stylist-fallback-image stylist-fallback-image--error-placeholder ${className}`}
        style={{ 
          width: width, 
          height: height,
          ...style
        }}
        aria-label={alt}
      >
        <div className="stylist-fallback-image__error-icon">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="currentColor"
              d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6a4 4 0 0 1-.44-7.97l1.45-.3.38-1.41A5.44 5.44 0 0 1 12 6c1.94 0 3.63 1.02 4.56 2.55l.37.61 1.33.27A3.01 3.01 0 0 1 19 18zM8 13h2v4h2v-4h2v-2h-6z" 
            />
          </svg>
        </div>
        <span className="stylist-fallback-image__error-text">Image not available</span>
      </div>
    );
  }
  
  return (
    <div className="stylist-fallback-image-container">
      {loading && (
        <div className="stylist-fallback-image__loading-indicator" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={imageClasses}
        style={combinedStyle}
        loading={lazy ? 'lazy' : undefined}
      />
    </div>
  );
};

export default FallbackImage;