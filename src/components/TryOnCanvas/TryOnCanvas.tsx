// src/components/TryOnCanvas/TryOnCanvas.tsx

import React, { useEffect, useRef, useState } from 'react';
import './TryOnCanvas.scss';
import { OutfitTryOn, UserImageInfo, GarmentType } from '@/types/tryOn';
import { useTryOnStore } from '@/store/tryOnStore';
import { loadImage } from '@/services/image-processing/fileUtils';
import { 
  compositeImages, 
  drawGuidelines
} from '@/services/image-processing/canvasUtils';
import { getDefaultBodyPosition } from '@/services/image-processing/imagePositioning';
import BodyGuide from './BodyGuide';

interface TryOnCanvasProps {
  outfit: OutfitTryOn | null;
  userImage: UserImageInfo | null;
  setCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onGarmentSelect?: (garmentId: string | null) => void;
  showBodyGuide?: boolean;
}

const TryOnCanvas: React.FC<TryOnCanvasProps> = ({
  outfit,
  userImage,
  setCanvasRef,
  onGarmentSelect,
  showBodyGuide = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  
  const canvasWidth = useTryOnStore((state) => state.canvasWidth);
  const canvasHeight = useTryOnStore((state) => state.canvasHeight);
  const showGuidelines = useTryOnStore((state) => state.settings.showGuidelines);
  const updateGarment = useTryOnStore((state) => state.updateGarment);
  
  // Register canvas ref with parent component and store
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasRef(canvasRef.current);
    }
  }, [setCanvasRef]);
  
  // Render canvas when outfit or user image changes
  useEffect(() => {
    const renderCanvas = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw guidelines if enabled and no user image
      if (showGuidelines && !userImage) {
        // Draw regular guidelines - body guide is shown as a separate component
        drawGuidelines(canvas);
        return;
      }
      
      // If no user image, show empty canvas
      if (!userImage) {
        return;
      }
      
      try {
        // Load user image
        const userImg = await loadImage(userImage.url);
        
        // Draw user image full canvas
        ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
        
        // Draw garments if available
        if (outfit?.garments.length) {
          await compositeImages(
            canvas,
            userImg,
            outfit.garments,
            loadImage
          );
        }
      } catch (error) {
        console.error('Error rendering canvas:', error);
      }
    };
    
    renderCanvas();
  }, [outfit, userImage, canvasWidth, canvasHeight, showGuidelines, activeGarmentId, showBodyGuide]);
  
  // Handle canvas click for garment selection
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onGarmentSelect || !outfit || !outfit.garments.length) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get click coordinates
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is on a garment (from top to bottom in z-index order)
    const sortedGarments = [...outfit.garments].sort((a, b) => b.zIndex - a.zIndex);
    
    // Find the first garment that contains the click point
    for (const garment of sortedGarments) {
      try {
        const { dimensions, offset, scale } = garment;
        if (!dimensions || !offset) continue;
        
        // Calculate garment position
        const centerX = canvas.width / 2 + offset.x;
        const centerY = canvas.height / 2 + offset.y;
        
        // Calculate scaled dimensions
        const scaledWidth = dimensions.width * (scale || 1);
        const scaledHeight = dimensions.height * (scale || 1);
        
        // Calculate garment bounding box
        const left = centerX - scaledWidth / 2;
        const top = centerY - scaledHeight / 2;
        const right = left + scaledWidth;
        const bottom = top + scaledHeight;
        
        // Check if click is within bounding box
        if (x >= left && x <= right && y >= top && y <= bottom) {
          onGarmentSelect(garment.id);
          setActiveGarmentId(garment.id);
          return;
        }
      } catch (error) {
        console.error('Error checking garment click:', error);
      }
    }
    
    // If click is not on any garment, deselect
    onGarmentSelect(null);
    setActiveGarmentId(null);
  };
  
  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeGarmentId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };
  
  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !activeGarmentId || !outfit) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    // Update drag start for next move
    setDragStart({ x, y });
    
    // Find the active garment
    const garment = outfit.garments.find(g => g.id === activeGarmentId);
    if (!garment || !garment.offset) return;
    
    // Update garment offset
    const newOffset = {
      x: garment.offset.x + deltaX,
      y: garment.offset.y + deltaY
    };
    
    // Update garment in store
    updateGarment(activeGarmentId, { offset: newOffset });
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };
  
  // Ensure mouse up is captured even if outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);
  
  return (
    <div className="stylist-try-on-canvas">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className={`stylist-try-on-canvas__canvas ${isDragging ? 'stylist-try-on-canvas__canvas--dragging' : ''}`}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      
      {showBodyGuide && !userImage && (
        <BodyGuide 
          width={canvasWidth} 
          height={canvasHeight} 
          activePosition={activeGarmentId ? getDefaultBodyPosition(
            outfit?.garments.find(g => g.id === activeGarmentId)?.type || GarmentType.TOP
          ) : undefined}
        />
      )}
      
      {!userImage && (
        <div className="stylist-try-on-canvas__placeholder">
          <div className="stylist-try-on-canvas__placeholder-text">
            Upload a photo to start the virtual try-on
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnCanvas;