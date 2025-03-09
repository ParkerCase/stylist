// Utilities for file handling and image loading

import { Dimensions, ImageInfo } from '@/types/tryOn';

/**
 * Load an image from a URL and get its dimensions
 */
export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS if possible
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error}`));
    };
    
    img.src = url;
  });
};

/**
 * Get image dimensions
 */
export const getImageDimensions = async (imageUrl: string): Promise<Dimensions> => {
  const img = await loadImage(imageUrl);
  return {
    width: img.width,
    height: img.height
  };
};

/**
 * Convert a File to a data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Check if a file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Get the size of a file in a human-readable format
 */
export const getFormattedFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

/**
 * Create a blob URL from a data URL
 */
export const dataUrlToBlob = (dataUrl: string): string => {
  // Extract the base64 data
  const base64Data = dataUrl.split(',')[1];
  const contentType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  
  // Decode base64 data
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  const blob = new Blob(byteArrays, { type: contentType });
  return URL.createObjectURL(blob);
};

/**
 * Get an image file's information
 */
export const getImageInfo = async (file: File): Promise<ImageInfo> => {
  const url = await fileToDataUrl(file);
  const img = await loadImage(url);
  
  return {
    id: `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    url,
    file,
    dimensions: {
      width: img.width,
      height: img.height
    },
    originalDimensions: {
      width: img.width,
      height: img.height
    },
    withoutBackground: false,
    processed: false
  };
};
