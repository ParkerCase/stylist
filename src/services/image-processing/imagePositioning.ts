// Utilities for positioning images on canvas

import { Dimensions, Point, Rectangle, GarmentType, BodyPosition } from '@/types/tryOn';

/**
 * Calculate the center point of a rectangle
 */
export const calculateCenter = (rect: Rectangle): Point => {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
};

/**
 * Calculate the positioning rectangle for a garment based on body position
 */
export const calculateGarmentPosition = (
  containerDimensions: Dimensions,
  garmentDimensions: Dimensions,
  bodyPosition: BodyPosition,
  offset: Point = { x: 0, y: 0 }
): Rectangle => {
  // Default positioning is centered
  let x = (containerDimensions.width - garmentDimensions.width) / 2;
  let y = (containerDimensions.height - garmentDimensions.height) / 2;
  
  // Adjust based on body position
  switch (bodyPosition) {
    case BodyPosition.UPPER_BODY:
      y = containerDimensions.height * 0.25 - garmentDimensions.height / 2;
      break;
    case BodyPosition.LOWER_BODY:
      y = containerDimensions.height * 0.65 - garmentDimensions.height / 2;
      break;
    case BodyPosition.FEET:
      y = containerDimensions.height - garmentDimensions.height;
      break;
    case BodyPosition.HEAD:
      y = 0;
      break;
    case BodyPosition.NECK:
      y = containerDimensions.height * 0.15 - garmentDimensions.height / 2;
      break;
    case BodyPosition.WAIST:
      y = containerDimensions.height * 0.5 - garmentDimensions.height / 2;
      break;
    case BodyPosition.HANDS:
      // This depends on whether it's left or right hand
      // We'll use offset for this
      break;
    case BodyPosition.FULL_BODY:
      // Already centered
      break;
  }
  
  // Apply offset
  x += offset.x;
  y += offset.y;
  
  return {
    x,
    y,
    width: garmentDimensions.width,
    height: garmentDimensions.height
  };
};

/**
 * Get default body position for a garment type
 */
export const getDefaultBodyPosition = (garmentType: GarmentType): BodyPosition => {
  switch (garmentType) {
    case GarmentType.TOP:
      return BodyPosition.UPPER_BODY;
    case GarmentType.BOTTOM:
      return BodyPosition.LOWER_BODY;
    case GarmentType.DRESS:
      return BodyPosition.FULL_BODY;
    case GarmentType.OUTERWEAR:
      return BodyPosition.UPPER_BODY;
    case GarmentType.SHOES:
      return BodyPosition.FEET;
    case GarmentType.ACCESSORY:
      return BodyPosition.HEAD; // Default, should be specified
    default:
      return BodyPosition.FULL_BODY;
  }
};

/**
 * Get default z-index for garment type (for layering)
 */
export const getDefaultZIndex = (garmentType: GarmentType): number => {
  switch (garmentType) {
    case GarmentType.TOP:
      return 10;
    case GarmentType.BOTTOM:
      return 5;
    case GarmentType.DRESS:
      return 10;
    case GarmentType.OUTERWEAR:
      return 15;
    case GarmentType.SHOES:
      return 5;
    case GarmentType.ACCESSORY:
      return 20;
    default:
      return 10;
  }
};

/**
 * Get recommended scale for garment type
 */
export const getRecommendedScale = (
  garmentType: GarmentType,
  containerDimensions: Dimensions
): number => {
  // These are approximate values and should be adjusted based on actual garment images
  switch (garmentType) {
    case GarmentType.TOP:
      return containerDimensions.width * 0.7 / 600; // Assuming 600px is the "standard" width
    case GarmentType.BOTTOM:
      return containerDimensions.width * 0.6 / 500;
    case GarmentType.DRESS:
      return containerDimensions.width * 0.8 / 500;
    case GarmentType.OUTERWEAR:
      return containerDimensions.width * 0.75 / 600;
    case GarmentType.SHOES:
      return containerDimensions.width * 0.4 / 400;
    case GarmentType.ACCESSORY:
      return containerDimensions.width * 0.3 / 300;
    default:
      return 1.0;
  }
};
