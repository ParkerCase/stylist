// Integration utilities for virtual try-on functionality
import { GarmentType, OutfitTryOn } from '@/types/tryOn';
import { useTryOnStore } from '@/store/tryOnStore';

/**
 * Initialize the try-on feature with a product
 * @param productImage URL or File of the product image
 * @param productType Type of the product (top, bottom, etc.)
 */
export const startTryOn = (productImage: string | File, productType: GarmentType) => {
  const { startNewTryOn } = useTryOnStore.getState();
  startNewTryOn(productImage, productType);
};

/**
 * Try on a complete outfit
 * @param outfit Outfit to try on
 */
export const tryOnOutfit = (outfit: OutfitTryOn) => {
  const { tryOnOutfit } = useTryOnStore.getState();
  tryOnOutfit(outfit);
};

/**
 * Open the try-on modal
 */
export const openTryOnModal = () => {
  const { openTryOnModal } = useTryOnStore.getState();
  openTryOnModal();
};

/**
 * Close the try-on modal
 */
export const closeTryOnModal = () => {
  const { closeTryOnModal } = useTryOnStore.getState();
  closeTryOnModal();
};

/**
 * Get the current try-on state
 * @returns Current state of the try-on feature
 */
export const getTryOnState = () => {
  const {
    currentOutfit,
    userImage,
    isLoading,
    error,
    savedResults
  } = useTryOnStore.getState();
  
  return {
    currentOutfit,
    userImage,
    isLoading,
    error,
    savedResults,
    hasUserImage: !!userImage,
    hasOutfit: !!currentOutfit && currentOutfit.garments.length > 0
  };
};

// Usage example for React components:
// 
// import { startTryOn, openTryOnModal } from '@/integration/integrateTryOn';
// import { GarmentType } from '@/types/tryOn';
//
// // In a product detail component:
// const handleTryOnClick = () => {
//   startTryOn(product.imageUrl, GarmentType.TOP);
//   openTryOnModal();
// };
//
// // Button in the component:
// <button onClick={handleTryOnClick}>Virtual Try-On</button>