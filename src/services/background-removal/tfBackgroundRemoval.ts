/**
 * TensorFlow-based background removal service for virtual try-on
 * Fallback for when Remove.bg API is not available
 */

import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

// Cache for the BodyPix model
let bodyPixModel: bodyPix.BodyPix | null = null;

/**
 * Preload the BodyPix model to speed up initial segmentation
 */
export async function preloadBodyPixModel(): Promise<void> {
  try {
    if (!bodyPixModel) {
      console.log('Loading BodyPix model...');
      bodyPixModel = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
      });
      console.log('BodyPix model loaded successfully');
    }
  } catch (error) {
    console.error('Error preloading BodyPix model:', error);
  }
}

/**
 * Check if TensorFlow.js is supported in the current browser
 */
export async function isTensorflowSupported(): Promise<boolean> {
  try {
    // Try to access the WebGL context as a basic check
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return false;
    }
    
    // Try to load a minimal model as a more thorough check
    await preloadBodyPixModel();
    return !!bodyPixModel;
  } catch (error) {
    console.error('TensorFlow support check failed:', error);
    return false;
  }
}

/**
 * Helper function to segment a person in an image
 * Used by background removal process and tests
 */
export async function segmentImage(
  imageElement: HTMLImageElement,
  options: {
    threshold?: number;
    flipHorizontal?: boolean;
    internalResolution?: 'low' | 'medium' | 'high' | 'full';
  } = {}
): Promise<bodyPix.SemanticPersonSegmentation> {
  // Load the BodyPix model if not already loaded
  if (!bodyPixModel) {
    await preloadBodyPixModel();
  }

  if (!bodyPixModel) {
    throw new Error('Failed to load BodyPix model');
  }
  
  // Default options
  const segmentationOptions = {
    flipHorizontal: options.flipHorizontal || false,
    internalResolution: options.internalResolution || 'high',
    segmentationThreshold: options.threshold || 0.7
  };
  
  // Segment the person
  return bodyPixModel.segmentPerson(imageElement, segmentationOptions);
}

/**
 * Remove the background from an image using TensorFlow BodyPix
 * @param imageSource - Image file or URL to process
 * @param options - Configuration options
 * @returns URL to the processed image with background removed
 */
export async function removeBackground(
  imageSource: File | string,
  options: {
    backgroundColor?: string;
    foregroundColor?: string;
    threshold?: number;
    bodyPixOptions?: any; // Using any for compatibility with different BodyPix versions
  } = {}
): Promise<string> {
  try {
    // Load the BodyPix model if not already loaded
    if (!bodyPixModel) {
      await preloadBodyPixModel();
    }

    if (!bodyPixModel) {
      throw new Error('Failed to load BodyPix model');
    }

    // Create an image element from the source
    const imageElement = await createImageElement(imageSource);
    
    // Use bodyPix to segment the person
    const segmentation = await bodyPixModel.segmentPerson(imageElement, {
      flipHorizontal: false,
      internalResolution: 'high',
      segmentationThreshold: options.threshold || 0.7,
      ...(options.bodyPixOptions || {})
    });

    // Process the segmentation to extract key body parts
    return processSegmentation(
      imageElement, 
      segmentation, 
      options.backgroundColor || 'transparent',
      options.foregroundColor
    );
  } catch (error) {
    console.error('Error in TF background removal:', error);
    
    // Return original image URL as fallback
    if (typeof imageSource === 'string') {
      return imageSource;
    } else {
      return URL.createObjectURL(imageSource);
    }
  }
}

/**
 * Process segmentation data to create a masked image
 */
function processSegmentation(
  imageElement: HTMLImageElement, 
  segmentation: bodyPix.SemanticPersonSegmentation,
  backgroundColor: string,
  foregroundColor?: string
): string {
  // Create a canvas for the output
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw the original image
  ctx.drawImage(imageElement, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  
  // For each pixel
  for (let i = 0; i < data.length; i += 4) {
    // Get pixel position
    const pixelIndex = i / 4;
    const x = pixelIndex % canvas.width;
    const y = Math.floor(pixelIndex / canvas.width);
    
    // Check if this pixel is part of a person
    if (!segmentation.data[pixelIndex]) {
      if (backgroundColor === 'transparent') {
        // Make pixel transparent
        data[i + 3] = 0;
      } else {
        // Set to background color
        const bgColor = hexToRgb(backgroundColor);
        data[i] = bgColor.r;     // R
        data[i + 1] = bgColor.g; // G
        data[i + 2] = bgColor.b; // B
        data[i + 3] = 255;       // A
      }
    } else if (foregroundColor) {
      // If foreground color is provided, tint the person
      const fgColor = hexToRgb(foregroundColor);
      // Blend original with foreground color
      data[i] = Math.round((data[i] + fgColor.r) / 2);       // R
      data[i + 1] = Math.round((data[i + 1] + fgColor.g) / 2); // G
      data[i + 2] = Math.round((data[i + 2] + fgColor.b) / 2); // B
    }
  }
  
  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to data URL and return
  return canvas.toDataURL('image/png');
}

/**
 * Extract body measurements from a segmented image
 * @param segmentation - BodyPix segmentation result
 * @param imageWidth - Width of the original image
 * @param imageHeight - Height of the original image
 */
export function extractBodyMeasurements(
  segmentation: bodyPix.SemanticPersonSegmentation,
  imageWidth: number,
  imageHeight: number
) {
  // Initialize bounds
  let minX = imageWidth;
  let maxX = 0;
  let minY = imageHeight;
  let maxY = 0;
  
  // Shoulders Y position
  let shouldersY = 0;
  let shouldersCount = 0;
  
  // Waist tracking
  let waistY = Math.floor(imageHeight * 0.5); // Approximate middle
  let waistLeft = imageWidth;
  let waistRight = 0;
  
  // Hips tracking (lower third of body)
  let hipsY = Math.floor(imageHeight * 0.7);
  let hipsLeft = imageWidth;
  let hipsRight = 0;
  
  // Process the segmentation data
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const index = y * imageWidth + x;
      
      if (segmentation.data[index]) {
        // Update bounds
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Check for shoulders (upper part)
        if (y <= imageHeight * 0.3) {
          shouldersY += y;
          shouldersCount++;
        }
        
        // Check for waist points
        if (Math.abs(y - waistY) < imageHeight * 0.05) {
          waistLeft = Math.min(waistLeft, x);
          waistRight = Math.max(waistRight, x);
        }
        
        // Check for hips points
        if (Math.abs(y - hipsY) < imageHeight * 0.05) {
          hipsLeft = Math.min(hipsLeft, x);
          hipsRight = Math.max(hipsRight, x);
        }
      }
    }
  }
  
  // Calculate measurements
  const bodyWidth = maxX - minX;
  const bodyHeight = maxY - minY;
  const shouldersAvgY = shouldersCount > 0 ? shouldersY / shouldersCount : 0;
  const waistWidth = waistRight - waistLeft;
  const hipsWidth = hipsRight - hipsLeft;
  
  // Return normalized measurements (as ratios of image dimensions)
  return {
    width: bodyWidth / imageWidth,
    height: bodyHeight / imageHeight,
    shouldersY: shouldersAvgY / imageHeight,
    waistWidth: waistWidth / imageWidth,
    hipsWidth: hipsWidth / imageWidth,
    // Approximate sizing category based on proportions
    approximateSize: calculateApproximateSize(waistWidth / hipsWidth, bodyWidth, bodyHeight),
    // Body shape classification
    bodyShape: classifyBodyShape(waistWidth / hipsWidth)
  };
}

/**
 * Calculate approximate clothing size based on proportions
 */
function calculateApproximateSize(
  waistToHipRatio: number,
  bodyWidth: number,
  bodyHeight: number
): string {
  // Very simple approximation - would need calibration data for accuracy
  if (bodyWidth < 100) return 'XS';
  if (bodyWidth < 150) return 'S';
  if (bodyWidth < 200) return 'M';
  if (bodyWidth < 250) return 'L';
  return 'XL';
}

/**
 * Classify body shape based on measurements
 * This is a very simplified version - a real implementation would be more nuanced
 */
function classifyBodyShape(waistToHipRatio: number): string {
  if (waistToHipRatio < 0.75) return 'hourglass';
  if (waistToHipRatio < 0.85) return 'pear';
  if (waistToHipRatio > 0.95) return 'apple';
  return 'rectangle';
}

/**
 * Create an image element from a file or URL
 */
async function createImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Default to black if invalid
  if (!hex || hex === 'transparent') {
    return { r: 0, g: 0, b: 0 };
  }
  
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse the hex values
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}