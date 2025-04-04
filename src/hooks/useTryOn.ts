// Main hook for virtual try-on functionality

import { useState, useCallback, useEffect } from 'react';
import {
  GarmentInfo,
  OutfitTryOn,
  SavedTryOnResult,
  GarmentType
} from '@/types/tryOn';
import { useTryOnStore } from '@/store/tryOnStore';
import { useImageProcessing } from './useImageProcessing';
import { canvasToImage } from '@/services/image-processing/canvasUtils';
import { getImageDimensions } from '@/services/image-processing/fileUtils';
import { getDefaultBodyPosition, getDefaultZIndex } from '@/services/image-processing/imagePositioning';

export const useTryOn = () => {
  const {
    currentOutfit,
    userImage,
    settings,
    isLoading,
    error,
    canvasWidth,
    canvasHeight,
    setCurrentOutfit,
    addGarmentToOutfit,
    removeGarmentFromOutfit,
    updateGarment,
    /* setUserImage and updateUserImage are defined but not used directly */
    clearUserImage,
    setLoading,
    setError,
    saveResult,
    openTryOnModal,
    closeTryOnModal
  } = useTryOnStore();
  
  const { processImage } = useImageProcessing();
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  
  // Initialize a new outfit if none exists
  useEffect(() => {
    if (!currentOutfit) {
      setCurrentOutfit({
        id: `outfit_${Date.now()}`,
        garments: [],
        createdAt: new Date()
      });
    }
  }, [currentOutfit, setCurrentOutfit]);
  
  // Upload user image for try-on
  const uploadUserImage = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      
      try {
        await processImage(file);
      } catch (error) {
        console.error('Error uploading user image:', error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [processImage, setLoading, setError]
  );
  
  // Add a garment to the current outfit
  const addGarment = useCallback(
    async (garmentImage: File | string, type: GarmentType) => {
      setLoading(true);
      
      try {
        let url: string;
        let dimensions: { width: number; height: number };
        
        // If a file was provided, convert to data URL
        if (typeof garmentImage === 'string') {
          url = garmentImage;
          dimensions = await getImageDimensions(url);
        } else {
          // Convert file to data URL
          const reader = new FileReader();
          url = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(garmentImage);
          });
          
          dimensions = await getImageDimensions(url);
        }
        
        // Create garment info
        const garment: GarmentInfo = {
          id: `garment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          url,
          type,
          bodyPosition: getDefaultBodyPosition(type),
          zIndex: getDefaultZIndex(type),
          layerIndex: currentOutfit?.garments.length || 0,
          dimensions,
          originalDimensions: dimensions,
          scale: settings.defaultGarmentScale[type],
          offset: settings.defaultGarmentOffset[type]
        };
        
        // Add to outfit
        addGarmentToOutfit(garment);
      } catch (error) {
        console.error('Error adding garment:', error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [
      currentOutfit?.garments.length,
      settings.defaultGarmentScale,
      settings.defaultGarmentOffset,
      addGarmentToOutfit,
      setLoading,
      setError
    ]
  );
  
  // Remove a garment from the current outfit
  const removeGarment = useCallback(
    (garmentId: string) => {
      removeGarmentFromOutfit(garmentId);
    },
    [removeGarmentFromOutfit]
  );
  
  // Update a garment's properties
  const updateGarmentProperties = useCallback(
    (garmentId: string, properties: Partial<GarmentInfo>) => {
      updateGarment(garmentId, properties);
    },
    [updateGarment]
  );
  
  // Save the current try-on result
  const saveTryOnResult = useCallback(async () => {
    if (!canvasRef || !currentOutfit || !userImage) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert canvas to image
      const resultImageUrl = await canvasToImage(canvasRef);
      
      // Create result object
      const result: SavedTryOnResult = {
        id: `result_${Date.now()}`,
        outfitId: currentOutfit.id,
        userId: 'current_user', // Should come from user authentication
        userImageUrl: userImage.url,
        resultImageUrl,
        garmentIds: currentOutfit.garments.map((g) => g.id),
        createdAt: new Date()
      };
      
      // Save result
      saveResult(result);
      
      return result;
    } catch (error) {
      console.error('Error saving try-on result:', error);
      setError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, [canvasRef, currentOutfit, userImage, setLoading, setError, saveResult]);
  
  // Start new try-on session
  const startNewTryOn = useCallback(
    (garmentImage?: File | string, garmentType?: GarmentType) => {
      // Create a new outfit
      const newOutfit: OutfitTryOn = {
        id: `outfit_${Date.now()}`,
        garments: [],
        createdAt: new Date()
      };
      
      setCurrentOutfit(newOutfit);
      
      // Add garment if provided
      if (garmentImage && garmentType) {
        addGarment(garmentImage, garmentType);
      }
      
      // Open try-on modal
      openTryOnModal();
    },
    [setCurrentOutfit, addGarment, openTryOnModal]
  );
  
  // Try on a specific outfit
  const tryOnOutfit = useCallback(
    (outfit: OutfitTryOn) => {
      setCurrentOutfit(outfit);
      openTryOnModal();
    },
    [setCurrentOutfit, openTryOnModal]
  );
  
  return {
    // State
    currentOutfit,
    userImage,
    isLoading,
    error,
    canvasWidth,
    canvasHeight,
    showGuidelines: settings.showGuidelines,
    
    // Canvas ref
    canvasRef,
    setCanvasRef,
    
    // Actions
    uploadUserImage,
    addGarment,
    removeGarment,
    updateGarmentProperties,
    clearUserImage,
    saveTryOnResult,
    startNewTryOn,
    tryOnOutfit,
    closeTryOnModal
  };
};
