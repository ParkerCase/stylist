// Utilities for canvas manipulation

import { Dimensions, Point, Rectangle, GarmentInfo } from '@/types/tryOn';

/**
 * Draw an image onto a canvas with a specified position, scale, and rotation
 */
export const drawImageToCanvas = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Rectangle,
  rotation: number = 0,
  flipHorizontal: boolean = false,
  flipVertical: boolean = false
): void => {
  // Save the current state
  ctx.save();
  
  // Move to the center of where we want to draw the image
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  ctx.translate(centerX, centerY);
  
  // Rotate if needed
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180); // Convert degrees to radians
  }
  
  // Scale (and flip) if needed
  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);
  
  // Draw the image centered
  ctx.drawImage(
    image,
    -rect.width / 2,
    -rect.height / 2,
    rect.width,
    rect.height
  );
  
  // Restore the context
  ctx.restore();
};

/**
 * Optimized version of drawImageToCanvas for low-performance devices
 * Skips some rendering features for better performance
 */
export const drawImageToCanvasLowQuality = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Rectangle,
  rotation: number = 0,
  flipHorizontal: boolean = false,
  flipVertical: boolean = false
): void => {
  // For low quality rendering, skip rotation if it's minimal
  if (Math.abs(rotation) < 5) {
    rotation = 0;
  }
  
  // Use the standard drawing function but with integer positions
  // to avoid subpixel rendering which can be expensive
  const optimizedRect = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
  
  // Use standard drawing function with optimized rectangle
  drawImageToCanvas(
    ctx,
    image,
    optimizedRect,
    rotation,
    flipHorizontal,
    flipVertical
  );
};

/**
 * Compose multiple images onto a canvas in specified order
 */
export const compositeImages = async (
  canvas: HTMLCanvasElement,
  userImage: HTMLImageElement,
  garments: GarmentInfo[],
  loadImage: (url: string) => Promise<HTMLImageElement>
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw user image
  ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);
  
  // Sort garments by zIndex
  const sortedGarments = [...garments].sort((a, b) => a.zIndex - b.zIndex);
  
  // Draw each garment
  for (const garment of sortedGarments) {
    try {
      const garmentImage = await loadImage(garment.url);
      
      // Calculate position and dimensions
      const dimensions: Dimensions = garment.dimensions || {
        width: garmentImage.width,
        height: garmentImage.height
      };
      
      const scale = garment.scale || 1;
      const scaledDimensions: Dimensions = {
        width: dimensions.width * scale,
        height: dimensions.height * scale
      };
      
      const offset = garment.offset || { x: 0, y: 0 };
      
      const position: Rectangle = {
        x: (canvas.width - scaledDimensions.width) / 2 + offset.x,
        y: (canvas.height - scaledDimensions.height) / 2 + offset.y,
        width: scaledDimensions.width,
        height: scaledDimensions.height
      };
      
      // Draw the garment
      drawImageToCanvas(
        ctx,
        garmentImage,
        position,
        garment.rotation || 0,
        garment.flipHorizontal || false,
        garment.flipVertical || false
      );
    } catch (error) {
      console.error(`Failed to load or draw garment ${garment.id}:`, error);
    }
  }
};

/**
 * Low-quality implementation of compositeImages for performance-constrained devices
 */
export const compositeImagesLowQuality = async (
  canvas: HTMLCanvasElement,
  userImage: HTMLImageElement,
  garments: GarmentInfo[],
  loadImage: (url: string) => Promise<HTMLImageElement>
): Promise<void> => {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  // Use a lower quality flag if available on the context
  const ctx2d = ctx as any;
  if (ctx2d.imageSmoothingQuality) {
    ctx2d.imageSmoothingQuality = 'low';
  }
  
  // Use lower resolution for the canvas during processing
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  const scaleFactor = 0.75; // Reduce canvas size for processing
  
  // Temporarily resize canvas to improve performance
  canvas.width = Math.round(originalWidth * scaleFactor);
  canvas.height = Math.round(originalHeight * scaleFactor);
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw user image at reduced resolution
  ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);
  
  // Sort garments by zIndex
  const sortedGarments = [...garments].sort((a, b) => a.zIndex - b.zIndex);
  
  // Keep track of loaded images to avoid reloading
  const imageCache: Map<string, HTMLImageElement> = new Map();
  
  // Draw each garment
  for (const garment of sortedGarments) {
    try {
      // Use cached image if available
      let garmentImage: HTMLImageElement;
      if (imageCache.has(garment.url)) {
        garmentImage = imageCache.get(garment.url)!;
      } else {
        garmentImage = await loadImage(garment.url);
        imageCache.set(garment.url, garmentImage);
      }
      
      // Calculate position and dimensions
      const dimensions: Dimensions = garment.dimensions || {
        width: garmentImage.width,
        height: garmentImage.height
      };
      
      const scale = (garment.scale || 1) * scaleFactor;
      const scaledDimensions: Dimensions = {
        width: dimensions.width * scale,
        height: dimensions.height * scale
      };
      
      const offset = garment.offset 
        ? { x: garment.offset.x * scaleFactor, y: garment.offset.y * scaleFactor } 
        : { x: 0, y: 0 };
      
      const position: Rectangle = {
        x: (canvas.width - scaledDimensions.width) / 2 + offset.x,
        y: (canvas.height - scaledDimensions.height) / 2 + offset.y,
        width: scaledDimensions.width,
        height: scaledDimensions.height
      };
      
      // Round all values to integers for better performance
      Object.keys(position).forEach(key => {
        position[key as keyof Rectangle] = Math.round(position[key as keyof Rectangle]);
      });
      
      // Draw the garment with optimized rendering
      drawImageToCanvasLowQuality(
        ctx,
        garmentImage,
        position,
        garment.rotation || 0,
        garment.flipHorizontal || false,
        garment.flipVertical || false
      );
    } catch (error) {
      console.error(`Failed to load or draw garment ${garment.id}:`, error);
    }
  }
  
  // Create a temporary canvas to hold the low-res result
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.drawImage(canvas, 0, 0);
  
    // Restore original canvas size
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Scale back to original size
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  } else {
    // Fallback if temporary canvas failed
    // Restore original canvas size
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Redraw at original resolution
    ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);
    
    // Basic draw operation for garments if we couldn't use the optimization
    for (const garment of sortedGarments) {
      try {
        const garmentImage = imageCache.get(garment.url) || await loadImage(garment.url);
        
        const dimensions: Dimensions = garment.dimensions || {
          width: garmentImage.width,
          height: garmentImage.height
        };
        
        const scale = garment.scale || 1;
        const scaledDimensions: Dimensions = {
          width: dimensions.width * scale,
          height: dimensions.height * scale
        };
        
        const offset = garment.offset || { x: 0, y: 0 };
        
        const position: Rectangle = {
          x: (canvas.width - scaledDimensions.width) / 2 + offset.x,
          y: (canvas.height - scaledDimensions.height) / 2 + offset.y,
          width: scaledDimensions.width,
          height: scaledDimensions.height
        };
        
        drawImageToCanvas(ctx, garmentImage, position, garment.rotation || 0, garment.flipHorizontal || false, garment.flipVertical || false);
      } catch (error) {
        console.error(`Failed in fallback rendering for garment ${garment.id}:`, error);
      }
    }
  }
};

/**
 * Create an image from a canvas
 */
export const canvasToImage = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Low-quality version of canvasToImage that produces a smaller file
 */
export const canvasToImageLowQuality = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Convert canvas to data URL with JPEG for smaller size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Fill canvas with color or pattern
 */
export const fillCanvas = (
  canvas: HTMLCanvasElement,
  fillStyle: string | CanvasGradient | CanvasPattern
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

/**
 * Draw grid lines for positioning guidance
 */
export const drawGuidelines = (
  canvas: HTMLCanvasElement,
  lineColor: string = 'rgba(0, 0, 255, 0.2)',
  lineWidth: number = 1
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.save();
  
  // Set line style
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  
  // Draw horizontal lines
  for (let i = 1; i < 3; i++) {
    const y = (canvas.height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Draw vertical lines
  for (let i = 1; i < 3; i++) {
    const x = (canvas.width / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Draw center cross
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  
  ctx.restore();
};

/**
 * Simpler version of guidelines for low-performance devices
 */
export const drawGuidelinesLowQuality = (
  canvas: HTMLCanvasElement,
  lineColor: string = 'rgba(0, 0, 255, 0.2)',
  lineWidth: number = 1
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.save();
  
  // Set line style
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  
  // Draw only center cross for minimal rendering
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  
  ctx.restore();
};

/**
 * Resize an image to target dimensions
 */
export const resizeImage = (
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  let width = image.width;
  let height = image.height;
  
  // Calculate new dimensions
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(image, 0, 0, width, height);
  }
  
  return canvas;
};