// Utilities for scaling images proportionally

import { Dimensions, Point } from '@/types/tryOn';

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export const calculateAspectRatioDimensions = (
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Dimensions => {
  let width = originalWidth;
  let height = originalHeight;
  
  // Apply target width if specified
  if (targetWidth) {
    width = targetWidth;
    height = (originalHeight * targetWidth) / originalWidth;
  }
  
  // Apply target height if specified
  if (targetHeight) {
    height = targetHeight;
    // Only recalculate width if target width wasn't specified
    if (!targetWidth) {
      width = (originalWidth * targetHeight) / originalHeight;
    }
  }
  
  // Apply maximum width constraint if needed
  if (maxWidth && width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  // Apply maximum height constraint if needed
  if (maxHeight && height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * Scale dimensions by a factor
 */
export const scaleDimensions = (
  dimensions: Dimensions,
  scaleFactor: number
): Dimensions => {
  return {
    width: Math.round(dimensions.width * scaleFactor),
    height: Math.round(dimensions.height * scaleFactor)
  };
};

/**
 * Scale a point by a factor
 */
export const scalePoint = (
  point: Point,
  scaleFactor: number
): Point => {
  return {
    x: point.x * scaleFactor,
    y: point.y * scaleFactor
  };
};

/**
 * Calculate the scale factor needed to fit source dimensions into target dimensions
 */
export const calculateScaleFactor = (
  sourceDimensions: Dimensions,
  targetDimensions: Dimensions,
  contain: boolean = true
): number => {
  const sourceRatio = sourceDimensions.width / sourceDimensions.height;
  const targetRatio = targetDimensions.width / targetDimensions.height;
  
  // If contain is true, the entire source must fit within target
  // If contain is false, the source must cover the entire target
  if ((contain && sourceRatio > targetRatio) || (!contain && sourceRatio < targetRatio)) {
    // Width limited
    return targetDimensions.width / sourceDimensions.width;
  } else {
    // Height limited
    return targetDimensions.height / sourceDimensions.height;
  }
};
