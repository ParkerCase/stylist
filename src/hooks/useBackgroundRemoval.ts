// Hook for background removal functionality

import { useState, useCallback, useEffect } from 'react';
import {
  UserImageInfo,
  BackgroundRemovalMethod,
  ProcessingStatus,
  BackgroundRemovalResult
} from '@/types/tryOn';
import { removeBackground, isTensorflowSupported, preloadBodyPixModel } from '@/services/background-removal/utils';
import { useTryOnStore } from '@/store/tryOnStore';
import deviceCapabilities from '@/utils/deviceCapabilities';
import { loadOptimizedImage } from '@/utils/imageUtils';

interface UseBackgroundRemovalOptions {
  onSuccess?: (result: UserImageInfo) => void;
  onError?: (error: string) => void;
}

export const useBackgroundRemoval = (options?: UseBackgroundRemovalOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const settings = useTryOnStore((state) => state.settings);
  const updateUserImage = useTryOnStore((state) => state.updateUserImage);
  
  // Check if TensorFlow.js is supported
  const [tensorflowSupported, setTensorflowSupported] = useState<boolean | null>(null);
  
  // Check TensorFlow.js support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isTensorflowSupported();
        setTensorflowSupported(supported);
        
        // If supported, preload the model
        if (supported) {
          preloadBodyPixModel();
        }
      } catch (error) {
        console.warn('Error checking TensorFlow support:', error);
        setTensorflowSupported(false);
      }
    };
    
    checkSupport();
  }, []);
  
  // Process image to remove background
  const removeImageBackground = useCallback(
    async (image: UserImageInfo): Promise<UserImageInfo> => {
      try {
        setIsProcessing(true);
        setProgress(10);
        setError(null);

        // Update image status
        updateUserImage({
          processingStatus: ProcessingStatus.REMOVING_BACKGROUND
        });

        // Determine removal method
        let method = settings.preferredBackgroundRemovalMethod;

        // If TensorFlow.js is not supported but selected, fall back to API
        if (
          method === BackgroundRemovalMethod.TENSORFLOW &&
          tensorflowSupported === false
        ) {
          console.log('TensorFlow.js not supported, falling back to Remove.bg API');
          method = BackgroundRemovalMethod.REMOVE_BG_API;
        }

        setProgress(25);

        // Track start time for timeout detection
        const startTime = Date.now();
        const TIMEOUT_MS = 10000; // 10 seconds timeout

        // Use optimized resolution for all devices to ensure compatibility
        const shouldUseOptimized = true;
        const optimizeOptions = shouldUseOptimized ? 
          { 
            width: 800, // Reduce size for processing 
            height: 800,
            quality: 'medium' as 'high' | 'medium' | 'low' // Explicitly type as one of the allowed values
          } : 
          undefined;
          
        console.log(`Using ${shouldUseOptimized ? 'optimized' : 'standard'} image processing for background removal`);
        
        // Use Promise.race to add timeout handling
        const removalPromise = removeBackground(
          image.url,
          {
            method,
            apiKey: settings.apiKey,
            fallbackToTensorflow:
              method === BackgroundRemovalMethod.REMOVE_BG_API && tensorflowSupported === true,
            optimizeOptions // Pass optimization options to the background removal function
          }
        );

        // Proceed with background removal with timeout handling
        const timeoutPromise = new Promise<BackgroundRemovalResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Background removal timed out'));
          }, TIMEOUT_MS);
        });

        const result: BackgroundRemovalResult = await Promise.race([
          removalPromise,
          timeoutPromise
        ]);

        setProgress(90);

        // Check if result is successful
        if (!result || !result.success || !result.imageUrl) {
          // If background removal failed but there's a partial result with imageUrl, use it
          if (result && result.imageUrl) {
            // Update with partial result
            const partialImage: UserImageInfo = {
              ...image,
              url: result.imageUrl,
              backgroundRemoved: true,
              processingStatus: ProcessingStatus.COMPLETED,
              processingWarning: result.error || 'Background removal partially succeeded'
            };

            updateUserImage(partialImage);
            setProgress(100);

            return partialImage;
          }

          throw new Error(result?.error || 'Failed to remove background');
        }

        // Update image with background removed
        const updatedImage: UserImageInfo = {
          ...image,
          url: result.imageUrl,
          backgroundRemoved: true,
          processingStatus: ProcessingStatus.COMPLETED,
          bodyMeasurements: result.bodyMeasurements
        };

        // Update user image in store
        updateUserImage(updatedImage);

        setProgress(100);

        // Call success callback if provided
        if (options?.onSuccess) {
          options.onSuccess(updatedImage);
        }

        return updatedImage;
      } catch (error) {
        console.error('Background removal error:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);

        // Check for WebGL shader error patterns
        const isWebGLError = errorMessage.toLowerCase().includes('webgl') ||
                            errorMessage.toLowerCase().includes('shader') ||
                            errorMessage.toLowerCase().includes('compilation');

        // Create a user-friendly error message
        const userFriendlyError = isWebGLError
          ? 'Your browser may not fully support 3D graphics required for background removal. Using original image instead.'
          : errorMessage;

        // For WebGL errors, use a completed status with the original image
        if (isWebGLError) {
          const fallbackImage: UserImageInfo = {
            ...image,
            processingStatus: ProcessingStatus.COMPLETED,
            backgroundRemoved: false,
            processingWarning: 'WebGL not fully supported. Using original image.'
          };

          // Update user image in store
          updateUserImage(fallbackImage);

          return fallbackImage;
        } else {
          // Standard error handling for non-WebGL errors
          updateUserImage({
            processingStatus: ProcessingStatus.FAILED,
            processingError: userFriendlyError
          });

          // Call error callback if provided
          if (options?.onError) {
            options.onError(userFriendlyError);
          }

          // Return original image with error status
          return {
            ...image,
            processingStatus: ProcessingStatus.FAILED,
            processingError: userFriendlyError
          };
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [settings, tensorflowSupported, updateUserImage, options]
  );
  
  return {
    removeImageBackground,
    isProcessing,
    progress,
    error,
    tensorflowSupported,
    reset: () => {
      setError(null);
      setProgress(0);
    }
  };
};