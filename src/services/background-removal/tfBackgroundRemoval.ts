// TensorFlow.js-based background removal using Body-Pix model

import { BackgroundRemovalMethod, BackgroundRemovalResult } from '@/types/tryOn';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';

// Cache the loaded model
let bodyPixModel: bodyPix.BodyPix | null = null;
let modelLoadPromise: Promise<bodyPix.BodyPix> | null = null;

// Constants for model options
const SEGMENTATION_THRESHOLD = 0.7;
const MODEL_CONFIG = {
  architecture: 'MobileNetV1',
  outputStride: 16,
  multiplier: 0.75,
  quantBytes: 2
} as const;

/**
 * Load the BodyPix model
 */
export const loadBodyPixModel = async (): Promise<bodyPix.BodyPix> => {
  // Return cached model if available
  if (bodyPixModel) {
    return bodyPixModel;
  }
  
  // Return existing promise if model is already loading
  if (modelLoadPromise) {
    return modelLoadPromise;
  }
  
  // Create and cache the model loading promise
  modelLoadPromise = (async () => {
    try {
      // Check WebGL backend first
      const hasWebGL = tf.getBackend() === 'webgl' || await tf.setBackend('webgl');
      if (!hasWebGL) {
        throw new Error('WebGL is not available. TensorFlow.js requires WebGL support.');
      }
      
      console.log('Loading BodyPix model...');
      
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Load model
      bodyPixModel = await bodyPix.load(MODEL_CONFIG);
      console.log('BodyPix model loaded successfully');
      
      return bodyPixModel;
    } catch (error) {
      console.error('Failed to load BodyPix model:', error);
      modelLoadPromise = null;
      throw error;
    }
  })();
  
  return modelLoadPromise;
};

/**
 * Perform segmentation on an image using BodyPix
 */
export const segmentImage = async (
  imageInput: HTMLImageElement | HTMLCanvasElement | ImageData | string
): Promise<ImageData> => {
  try {
    // Load the model if not already loaded
    const model = await loadBodyPixModel();
    
    // Get image as HTMLImageElement or HTMLCanvasElement
    let imgElement: HTMLImageElement | HTMLCanvasElement;
    
    if (typeof imageInput === 'string') {
      // It's a URL or data URL, load the image first
      imgElement = await loadImageFromUrl(imageInput);
    } else if (imageInput instanceof HTMLImageElement || 
               imageInput instanceof HTMLCanvasElement) {
      // It's an HTML element
      imgElement = imageInput;
    } else {
      // For ImageData, we need to convert it to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageInput.width;
      canvas.height = imageInput.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      ctx.putImageData(imageInput as ImageData, 0, 0);
      imgElement = canvas;
    }
    
    // Get original dimensions
    const width = imgElement.width;
    const height = imgElement.height;
    
    // Perform person segmentation
    const segmentation = await model.segmentPerson(imgElement, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: SEGMENTATION_THRESHOLD
    });
    
    // Create a transparent background mask
    const foregroundColor = {r: 0, g: 0, b: 0, a: 0};
    const backgroundColor = {r: 0, g: 0, b: 0, a: 0};
    const mask = await bodyPix.toMask(
      segmentation,
      foregroundColor,
      backgroundColor
    );
    
    // Draw the mask on a canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw the original image
    ctx.drawImage(imgElement, 0, 0);
    
    // Apply the segmentation mask
    const imageData = ctx.getImageData(0, 0, width, height);
    const maskData = mask.data;
    const pixelData = imageData.data;
    
    // Add transparency based on the mask
    for (let i = 0; i < maskData.length; i += 4) {
      // If pixel is background (mask value = 0)
      if (maskData[i] === 0 && maskData[i+1] === 0 && maskData[i+2] === 0) {
        // Make pixel fully transparent
        pixelData[i+3] = 0;
      }
    }
    
    return imageData;
  } catch (error) {
    console.error('Segmentation error:', error);
    throw error;
  }
};

/**
 * Remove background using TensorFlow.js BodyPix
 */
export const removeBackgroundTensorflow = async (
  imageData: string | HTMLImageElement
): Promise<BackgroundRemovalResult> => {
  try {
    // Ensure TensorFlow.js is ready
    await tf.ready();
    
    // Get image as HTMLImageElement
    const img = typeof imageData === 'string'
      ? await loadImageFromUrl(imageData)
      : imageData;
    
    // Perform segmentation using BodyPix
    const segmentedImageData = await segmentImage(img);
    
    // Convert to base64
    const canvas = document.createElement('canvas');
    canvas.width = segmentedImageData.width;
    canvas.height = segmentedImageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    ctx.putImageData(segmentedImageData, 0, 0);
    
    // Return as data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    return {
      success: true,
      imageUrl: dataUrl,
      method: BackgroundRemovalMethod.TENSORFLOW
    };
  } catch (error) {
    console.error('TensorFlow BodyPix background removal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      method: BackgroundRemovalMethod.TENSORFLOW
    };
  }
};

/**
 * Preload the BodyPix model in the background
 * Call this early in the application to reduce delay when needed
 */
export const preloadBodyPixModel = (): void => {
  // Load model in the background
  setTimeout(() => {
    loadBodyPixModel().catch(error => {
      console.warn('Background preloading of BodyPix model failed:', error);
    });
  }, 1000);
};

/**
 * Helper function to load an image from a URL
 */
const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    img.src = url;
  });
};

/**
 * Check if the browser supports TensorFlow.js with WebGL backend
 */
export const isTensorflowSupported = async (): Promise<boolean> => {
  try {
    // Try to initialize TensorFlow.js
    await tf.ready();
    
    // Check if WebGL is available
    const isWebGLAvailable = tf.getBackend() === 'webgl' || await tf.setBackend('webgl');
    
    if (!isWebGLAvailable) {
      return false;
    }
    
    // Try to load a minimal model to further verify
    try {
      // Simple test with a small tensor
      const testTensor = tf.tensor2d([[1, 2], [3, 4]]);
      // Run simple operation to validate WebGL works
      const result = testTensor.add(testTensor);
      
      // Clean up
      testTensor.dispose();
      result.dispose();
      
      return true;
    } catch (e) {
      console.warn('TensorFlow.js basic operations test failed:', e);
      return false;
    }
  } catch (error) {
    console.error('TensorFlow.js support check failed:', error);
    return false;
  }
};