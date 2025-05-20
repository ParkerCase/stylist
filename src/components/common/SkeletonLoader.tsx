// src/components/common/SkeletonLoader.tsx

import React from 'react';
import './SkeletonLoader.scss';

interface SkeletonLoaderProps {
  type?: 'text' | 'circle' | 'rectangle' | 'product' | 'avatar' | 'button' | 'image' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  style?: React.CSSProperties;
  className?: string;
  animated?: boolean;
}

/**
 * SkeletonLoader Component
 * 
 * A versatile skeleton loading component for displaying placeholder UI elements
 * while content is being loaded.
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  width,
  height,
  count = 1,
  style = {},
  className = '',
  animated = true,
}) => {
  // Convert width/height to style properties
  const dimensionStyle: React.CSSProperties = {};
  
  if (width) {
    dimensionStyle.width = typeof width === 'number' ? `${width}px` : width;
  }
  
  if (height) {
    dimensionStyle.height = typeof height === 'number' ? `${height}px` : height;
  }
  
  // Combine all styles
  const combinedStyle = { ...dimensionStyle, ...style };
  
  // Apply the right class based on type
  const typeClass = `stylist-skeleton--${type}`;
  const animationClass = animated ? 'stylist-skeleton--animated' : '';
  const combinedClassName = `stylist-skeleton ${typeClass} ${animationClass} ${className}`.trim();
  
  // Handle special types with predefined structures
  const renderSpecialType = () => {
    switch (type) {
      case 'product':
        return (
          <div className="stylist-skeleton-product">
            <div className="stylist-skeleton-product__image"></div>
            <div className="stylist-skeleton-product__content">
              <div className="stylist-skeleton-product__title"></div>
              <div className="stylist-skeleton-product__price"></div>
            </div>
          </div>
        );
        
      case 'card':
        return (
          <div className="stylist-skeleton-card">
            <div className="stylist-skeleton-card__image"></div>
            <div className="stylist-skeleton-card__content">
              <div className="stylist-skeleton-card__title"></div>
              <div className="stylist-skeleton-card__text"></div>
              <div className="stylist-skeleton-card__text"></div>
            </div>
          </div>
        );
        
      case 'avatar':
        return <div className="stylist-skeleton-avatar" style={combinedStyle}></div>;
        
      default:
        return null;
    }
  };
  
  // For types that are just single elements
  const renderSingleLoader = (index: number) => {
    if (['product', 'card', 'avatar'].includes(type)) {
      return renderSpecialType();
    }
    
    return (
      <div 
        key={index}
        className={combinedClassName}
        style={combinedStyle}
      ></div>
    );
  };
  
  // Render multiple items if count > 1
  return (
    <>
      {Array.from({ length: count }).map((_, index) => renderSingleLoader(index))}
    </>
  );
};

export default SkeletonLoader;