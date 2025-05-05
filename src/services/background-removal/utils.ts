// Background removal utility functions

import { BackgroundRemovalMethod, BackgroundRemovalResult } from '@/types/tryOn';
import { removeBackgroundApi, isRemoveBgAvailable } from './removeBackgroundApi';
import { 
  removeBackground as removeBackgroundTensorflow, 
  isTensorflowSupported as isTfSupported,
  preloadBodyPixModel as preloadModel,
  extractBodyMeasurements
} from './tfBackgroundRemoval';
import { REMOVE_BG_API_KEY } from '@/utils/environment';

interface RemoveBackgroundOptions {
  method: BackgroundRemovalMethod;
  apiKey?: string;
  quality?: 'preview' | 'full' | 'high';
  fallbackToTensorflow?: boolean;
  extractBodyMeasurements?: boolean;
}

/**
 * Remove background from an image using the specified method
 */
export const removeBackground = async (
  imageData: string | File,
  options: RemoveBackgroundOptions
): Promise<BackgroundRemovalResult> => {
  let result: BackgroundRemovalResult;
  
  try {
    // Use the API key from options or environment
    const apiKey = options.apiKey || REMOVE_BG_API_KEY;
    
    switch (options.method) {
      case BackgroundRemovalMethod.REMOVE_BG_API:
        if (!apiKey) {
          throw new Error('API key is required for Remove.bg API');
        }
        
        // Check if the API key is valid
        const isApiAvailable = await isRemoveBgAvailable();
        if (!isApiAvailable) {
          throw new Error('Remove.bg API is not available or key is invalid');
        }
        
        // File object required for API call
        const imageFile = typeof imageData === 'string' 
          ? await dataUrlToFile(imageData, 'image.png')
          : imageData;
          
        // Call the Remove.bg API
        try {
          const resultUrl = await removeBackgroundApi(imageFile, {
            apiKey: apiKey,
            size: mapQualityToSize(options.quality)
          });
          
          result = {
            success: true,
            imageUrl: resultUrl,
            method: BackgroundRemovalMethod.REMOVE_BG_API
          };
        } catch (apiError) {
          console.error('Remove.bg API error:', apiError);
          throw apiError;
        }
        break;
        
      case BackgroundRemovalMethod.TENSORFLOW:
        if (typeof imageData === 'string') {
          // Use TensorFlow to remove background
          const resultUrl = await removeBackgroundTensorflow(imageData, {
            threshold: 0.7 // Adjust threshold for better results
          });
          
          result = {
            success: true,
            imageUrl: resultUrl,
            method: BackgroundRemovalMethod.TENSORFLOW
          };
        } else {
          // Convert File to data URL first
          const dataUrl = await fileToDataUrl(imageData);
          const resultUrl = await removeBackgroundTensorflow(dataUrl, {
            threshold: 0.7
          });
          
          result = {
            success: true,
            imageUrl: resultUrl,
            method: BackgroundRemovalMethod.TENSORFLOW
          };
        }
        break;
        
      case BackgroundRemovalMethod.MANUAL:
        result = {
          success: false,
          error: 'Manual background removal not implemented',
          method: BackgroundRemovalMethod.MANUAL
        };
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown removal method: ${options.method}`,
          method: options.method
        };
    }
    
    // If primary method failed and fallback is enabled, try TensorFlow.js
    if (!result?.success && options.fallbackToTensorflow && options.method !== BackgroundRemovalMethod.TENSORFLOW) {
      console.log(`Falling back to TensorFlow.js background removal after ${options.method} failed`);
      
      try {
        // Check TensorFlow support first
        const tfSupported = await isTensorflowSupported();
        if (!tfSupported) {
          throw new Error('TensorFlow.js not supported in this browser');
        }
        
        if (typeof imageData === 'string') {
          const resultUrl = await removeBackgroundTensorflow(imageData, {
            threshold: 0.7
          });
          
          result = {
            success: true,
            imageUrl: resultUrl,
            method: BackgroundRemovalMethod.TENSORFLOW
          };
        } else {
          // Convert File to data URL first
          const dataUrl = await fileToDataUrl(imageData);
          const resultUrl = await removeBackgroundTensorflow(dataUrl, {
            threshold: 0.7
          });
          
          result = {
            success: true,
            imageUrl: resultUrl,
            method: BackgroundRemovalMethod.TENSORFLOW
          };
        }
      } catch (tfError) {
        console.error('TensorFlow fallback error:', tfError);
        // If fallback also fails, keep the original error
      }
    }
    
    // Add body measurements if requested and operation succeeded
    if (options.extractBodyMeasurements && result?.success && result.imageUrl) {
      try {
        // This will be implemented using the extractBodyMeasurements function
        // For now, set a placeholder
        result.bodyMeasurements = {
          approximateSize: 'M',
          bodyShape: 'rectangle'
        };
      } catch (measureError) {
        console.error('Error extracting body measurements:', measureError);
      }
    }
    
    return result || {
      success: false,
      error: 'Background removal failed with all methods',
      method: options.method
    };
  } catch (error) {
    console.error('Background removal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      method: options.method
    };
  }
};

/**
 * Convert quality option to Remove.bg size parameter
 */
const mapQualityToSize = (quality?: 'preview' | 'full' | 'high'): 'preview' | 'small' | 'medium' | 'hd' | '4k' | 'auto' => {
  switch (quality) {
    case 'preview':
      return 'preview';
    case 'high':
      return 'hd';
    case 'full':
      return 'medium';
    default:
      return 'auto';
  }
};

/**
 * Helper function to convert File to data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    
    reader.onerror = (error) => reject(error);
    
    reader.readAsDataURL(file);
  });
};

/**
 * Convert data URL to File object
 */
const dataUrlToFile = (dataUrl: string, filename: string): Promise<File> => {
  return fetch(dataUrl)
    .then(res => res.blob())
    .then(blob => {
      // Extract mime type from data URL
      const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      return new File([blob], filename, { type: mimeType });
    });
};

/**
 * Check if the browser supports the WebGL backend for TensorFlow.js
 */
export const isTensorflowSupported = isTfSupported;

/**
 * Preload the BodyPix model to reduce initial latency
 */
export const preloadBodyPixModel = preloadModel;