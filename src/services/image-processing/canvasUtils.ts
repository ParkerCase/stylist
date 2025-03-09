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


