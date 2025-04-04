// Hook for background removal functionality

import { useState, useCallback } from 'react';
import {
  UserImageInfo,
  BackgroundRemovalMethod,
  ProcessingStatus,
  BackgroundRemovalResult
} from '@/types/tryOn';
import { removeBackground, isTensorflowSupported } from '@/services/background-removal/utils';
import { useTryOnStore } from '@/store/tryOnStore';

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
  useState(() => {
    const checkSupport = async () => {
      const supported = await isTensorflowSupported();
      setTensorflowSupported(supported);
    };
    
    checkSupport();
  });
  
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
          // Only log in non-production environments
          if (process.env.NODE_ENV !== 'production') {
            console.log('TensorFlow.js not supported, falling back to Remove.bg API');
          }
          method = BackgroundRemovalMethod.REMOVE_BG_API;
        }
        
        setProgress(25);
        
        // Proceed with background removal
        const result: BackgroundRemovalResult = await removeBackground(
          image.url,
          {
            method,
            apiKey: settings.apiKey,
            fallbackToTensorflow:
              method === BackgroundRemovalMethod.REMOVE_BG_API && tensorflowSupported === true
          }
        );
        
        setProgress(90);
        
        if (!result.success || !result.imageUrl) {
          throw new Error(result.error || 'Failed to remove background');
        }
        
        // Update image with background removed
        const updatedImage: UserImageInfo = {
          ...image,
          url: result.imageUrl,
          backgroundRemoved: true,
          processingStatus: ProcessingStatus.COMPLETED
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
        
        // Update image status to failed
        updateUserImage({
          processingStatus: ProcessingStatus.FAILED,
          processingError: errorMessage
        });
        
        // Call error callback if provided
        if (options?.onError) {
          options.onError(errorMessage);
        }
        
        // Return original image
        return {
          ...image,
          processingStatus: ProcessingStatus.FAILED,
          processingError: errorMessage
        };
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
