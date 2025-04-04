// src/utils/productMappings.ts
import { GarmentType } from '../types/tryOn';

/**
 * Maps product type from various systems to internal GarmentType
 */
export const mapProductTypeToGarmentType = (productType: string): GarmentType => {
  const lcType = productType.toLowerCase();
  
  if (lcType.includes('shirt') || lcType.includes('top') || lcType.includes('tee') || lcType.includes('blouse')) {
    return GarmentType.TOP;
  }
  
  if (lcType.includes('pant') || lcType.includes('jean') || lcType.includes('bottom') || lcType.includes('skirt') || lcType.includes('short')) {
    return GarmentType.BOTTOM;
  }
  
  if (lcType.includes('dress')) {
    return GarmentType.DRESS;
  }
  
  if (lcType.includes('jacket') || lcType.includes('coat') || lcType.includes('sweater') || lcType.includes('cardigan') || lcType.includes('hoodie')) {
    return GarmentType.OUTERWEAR;
  }
  
  if (lcType.includes('shoe') || lcType.includes('sneaker') || lcType.includes('boot') || lcType.includes('sandal')) {
    return GarmentType.SHOES;
  }
  
  if (lcType.includes('accessory') || lcType.includes('hat') || lcType.includes('bag') || lcType.includes('jewelry') || lcType.includes('watch') || lcType.includes('scarf')) {
    return GarmentType.ACCESSORY;
  }
  
  // Default to top if can't determine
  return GarmentType.TOP;
};