// Hook for image processing functionality

import { useState, useCallback } from 'react';
import { UserImageInfo, ProcessingStatus } from '@/types/tryOn';
import { useTryOnStore } from '@/store/tryOnStore';
import { fileToDataUrl, getImageDimensions } from '@/services/image-processing/fileUtils';
import { calculateAspectRatioDimensions } from '@/services/image-processing/imageScaling';
import { useBackgroundRemoval } from './useBackgroundRemoval';

interface UseImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  autoRemoveBackground?: boolean;
  onProcessingComplete?: (image: UserImageInfo) => void;
}

export const useImageProcessing = (options?: UseImageProcessingOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Get state and actions from store
  const settings = useTryOnStore((state) => state.settings);
  const setUserImage = useTryOnStore((state) => state.setUserImage);
  const updateUserImage = useTryOnStore((state) => state.updateUserImage);
  
  // Background removal hook
  const { removeImageBackground } = useBackgroundRemoval({
    onError: (errorMsg) => setError(errorMsg)
  });
  
  // Process image (load, resize, and optionally remove background)
  const processImage = useCallback(
    async (file: File): Promise<UserImageInfo | null> => {
      try {
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          throw new Error('File is not an image');
        }
        
        // Create initial user image object
        const userImage: UserImageInfo = {
          id: `img_${Date.now()}`,
          url: '',
          file,
          processingStatus: ProcessingStatus.UPLOADING
        };
        
        // Store initial state
        setUserImage(userImage);
        
        // Convert to data URL
        setProgress(10);
        const dataUrl = await fileToDataUrl(file);
        
        // Get image dimensions
        setProgress(20);
        const dimensions = await getImageDimensions(dataUrl);
        
        // Resize if needed
        const processedUrl = dataUrl;
        let processedDimensions = dimensions;
        
        const maxWidth = options?.maxWidth || 1200;
        const maxHeight = options?.maxHeight || 1600;
        
        if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
          setProgress(30);
          
          processedDimensions = calculateAspectRatioDimensions(
            dimensions.width,
            dimensions.height,
            undefined,
            undefined,
            maxWidth,
            maxHeight
          );
          
          // Resize image (will happen when drawing to canvas)
          // processedUrl remains the same for now
        }
        
        // Update user image with URL and dimensions
        const updatedImage: UserImageInfo = {
          ...userImage,
          url: processedUrl,
          dimensions: processedDimensions,
          originalDimensions: dimensions,
          processingStatus: ProcessingStatus.PROCESSING
        };
        
        setUserImage(updatedImage);
        setProgress(40);
        
        // Optionally remove background
        const autoRemoveBackground =
          options?.autoRemoveBackground !== undefined
            ? options.autoRemoveBackground
            : settings.removeBackgroundAutomatically;
        
        let finalImage = updatedImage;
        
        if (autoRemoveBackground) {
          // Update status
          updateUserImage({
            processingStatus: ProcessingStatus.REMOVING_BACKGROUND
          });
          
          // Process with background removal
          finalImage = await removeImageBackground(updatedImage);
        } else {
          // Mark as completed without background removal
          finalImage = {
            ...updatedImage,
            processingStatus: ProcessingStatus.COMPLETED
          };
          updateUserImage(finalImage);
        }
        
        setProgress(100);
        
        // Call completion callback if provided
        if (options?.onProcessingComplete) {
          options.onProcessingComplete(finalImage);
        }
        
        return finalImage;
      } catch (error) {
        console.error('Image processing error:', error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);
        
        // Update image status to failed
        updateUserImage({
          processingStatus: ProcessingStatus.FAILED,
          processingError: errorMessage
        });
        
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [
      options,
      settings.removeBackgroundAutomatically,
      setUserImage,
      updateUserImage,
      removeImageBackground
    ]
  );
  
  return {
    processImage,
    isProcessing,
    progress,
    error,
    reset: () => {
      setError(null);
      setProgress(0);
    }
  };
};
