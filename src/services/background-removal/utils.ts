// Background removal utility functions

import { BackgroundRemovalMethod, BackgroundRemovalResult } from '@/types/tryOn';
import { removeBackgroundApi } from './removeBackgroundApi';
import { 
  removeBackgroundTensorflow, 
  isTensorflowSupported as isTfSupported,
  preloadBodyPixModel as preloadModel
} from './tfBackgroundRemoval';

interface RemoveBackgroundOptions {
  method: BackgroundRemovalMethod;
  apiKey?: string;
  quality?: 'preview' | 'full' | 'high';
  fallbackToTensorflow?: boolean;
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
    switch (options.method) {
      case BackgroundRemovalMethod.REMOVE_BG_API:
        if (!options.apiKey) {
          throw new Error('API key is required for Remove.bg API');
        }
        
        result = await removeBackgroundApi(imageData, {
          apiKey: options.apiKey,
          size: mapQualityToSize(options.quality)
        });
        break;
        
      case BackgroundRemovalMethod.TENSORFLOW:
        if (typeof imageData === 'string') {
          result = await removeBackgroundTensorflow(imageData);
        } else {
          // Convert File to data URL first
          const dataUrl = await fileToDataUrl(imageData);
          result = await removeBackgroundTensorflow(dataUrl);
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
    if (!result.success && options.fallbackToTensorflow && options.method !== BackgroundRemovalMethod.TENSORFLOW) {
      console.log(`Falling back to TensorFlow.js background removal after ${options.method} failed`);
      
      if (typeof imageData === 'string') {
        result = await removeBackgroundTensorflow(imageData);
      } else {
        // Convert File to data URL first
        const dataUrl = await fileToDataUrl(imageData);
        result = await removeBackgroundTensorflow(dataUrl);
      }
    }
    
    return result;
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
const mapQualityToSize = (quality?: 'preview' | 'full' | 'high'): 'preview' | 'full' | 'auto' => {
  switch (quality) {
    case 'preview':
      return 'preview';
    case 'high':
    case 'full':
      return 'full';
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
 * Check if the browser supports the WebGL backend for TensorFlow.js
 */
export const isTensorflowSupported = isTfSupported;

/**
 * Preload the BodyPix model to reduce initial latency
 */
export const preloadBodyPixModel = preloadModel;