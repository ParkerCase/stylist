// src/components/TryOnCanvas/TryOnCanvas.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './TryOnCanvas.scss';
import { OutfitTryOn, UserImageInfo, GarmentType } from '@/types/tryOn';
import { useTryOnStore } from '@/store/tryOnStore';
import { loadImage } from '@/services/image-processing/fileUtils';
import { 
  compositeImages, 
  drawGuidelines,
  compositeImagesLowQuality
} from '@/services/image-processing/canvasUtils';
import { getDefaultBodyPosition } from '@/services/image-processing/imagePositioning';
import BodyGuide from './BodyGuide';
import { 
  getDeviceCapabilities, 
  getPerformanceTier, 
  shouldEnableFeature 
} from '@/utils/deviceCapabilities';
import { performanceMonitor } from '@/utils/performanceMonitoring';

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
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<{ 
    performance: 'low' | 'medium' | 'high',
    useHighQuality: boolean,
    useRealTimePreview: boolean
  }>({
    performance: 'medium',
    useHighQuality: true,
    useRealTimePreview: true
  });
  const [isRendering, setIsRendering] = useState(false);
  
  const canvasWidth = useTryOnStore((state) => state.canvasWidth);
  const canvasHeight = useTryOnStore((state) => state.canvasHeight);
  const showGuidelines = useTryOnStore((state) => state.settings.showGuidelines);
  const updateGarment = useTryOnStore((state) => state.updateGarment);
  
  // Detect device capabilities on mount
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const capabilities = await getDeviceCapabilities();
        const performanceTier = getPerformanceTier();
        
        // Check if high-quality features should be enabled
        const useHighQuality = shouldEnableFeature('virtualTryOn', 'medium');
        const useRealTimePreview = shouldEnableFeature('virtualTryOn', 'high');
        
        setDeviceCapabilities({
          performance: performanceTier,
          useHighQuality,
          useRealTimePreview
        });
        
        console.log('[TryOnCanvas] Device capabilities detected:', { 
          performanceTier, 
          useHighQuality,
          useRealTimePreview
        });
      } catch (error) {
        console.error('[TryOnCanvas] Error detecting device capabilities:', error);
        // Use default medium capabilities if detection fails
      }
    };
    
    detectCapabilities();
  }, []);
  
  // Register canvas ref with parent component and store
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasRef(canvasRef.current);
    }
  }, [setCanvasRef]);
  
  // Optimized compositing function based on device capabilities
  const compositeImagesOptimized = useCallback(async (
    canvas: HTMLCanvasElement,
    userImg: HTMLImageElement,
    garments: Array<any>,
    loadImageFn: typeof loadImage
  ) => {
    const renderStart = performance.now();
    
    try {
      if (deviceCapabilities.useHighQuality) {
        // Use high-quality compositing for medium/high performance devices
        await compositeImages(canvas, userImg, garments, loadImageFn);
      } else {
        // Use optimized low-quality compositing for low performance devices
        await compositeImagesLowQuality(canvas, userImg, garments, loadImageFn);
      }
      
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      // Record render performance
      performanceMonitor.recordComponentRender('TryOnCanvas_compositeImages', renderTime);
      
    } catch (error) {
      console.error('[TryOnCanvas] Error in optimized image compositing:', error);
    }
  }, [deviceCapabilities.useHighQuality]);
  
  // Debounced render function to prevent excessive renders during dragging
  const debouncedRender = useCallback(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // For high performance devices, render immediately
    if (deviceCapabilities.useRealTimePreview) {
      renderCanvas();
      return;
    }
    
    // For lower performance devices, debounce the render
    renderTimeoutRef.current = setTimeout(() => {
      renderCanvas();
    }, deviceCapabilities.performance === 'low' ? 250 : 100);
  }, [deviceCapabilities.performance, deviceCapabilities.useRealTimePreview]);
  
  // Render canvas when outfit or user image changes
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsRendering(true);
    const renderStart = performance.now();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw guidelines if enabled and no user image
    if (showGuidelines && !userImage) {
      // Draw regular guidelines - body guide is shown as a separate component
      drawGuidelines(canvas);
      setIsRendering(false);
      return;
    }
    
    // If no user image, show empty canvas
    if (!userImage) {
      setIsRendering(false);
      return;
    }
    
    try {
      // Load user image
      const userImg = await loadImage(userImage.url);
      
      // Draw user image full canvas
      ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
      
      // Draw garments if available
      if (outfit?.garments.length) {
        await compositeImagesOptimized(
          canvas,
          userImg,
          outfit.garments,
          loadImage
        );
      }
      
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      // Record render time for performance monitoring
      performanceMonitor.recordComponentRender('TryOnCanvas_render', renderTime);
      
    } catch (error) {
      console.error('Error rendering canvas:', error);
    } finally {
      setIsRendering(false);
    }
  }, [outfit, userImage, canvasWidth, canvasHeight, showGuidelines, compositeImagesOptimized]);
  
  // Effect to trigger canvas rendering
  useEffect(() => {
    debouncedRender();
    
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [outfit, userImage, canvasWidth, canvasHeight, showGuidelines, activeGarmentId, showBodyGuide, debouncedRender]);
  
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
    
    // For low-performance devices, show a simple drag indicator instead of re-rendering
    if (!deviceCapabilities.useRealTimePreview) {
      // Update placeholder element to show dragging feedback
      const dragIndicator = document.querySelector('.stylist-try-on-canvas__drag-indicator');
      if (dragIndicator) {
        (dragIndicator as HTMLElement).style.left = `${x}px`;
        (dragIndicator as HTMLElement).style.top = `${y}px`;
      }
    }
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    
    // Force render if we're not using real-time previews
    if (!deviceCapabilities.useRealTimePreview) {
      renderCanvas();
    }
  };
  
  // Ensure mouse up is captured even if outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        
        // Force render if we're not using real-time previews
        if (!deviceCapabilities.useRealTimePreview) {
          renderCanvas();
        }
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, deviceCapabilities.useRealTimePreview, renderCanvas]);
  
  return (
    <div className="stylist-try-on-canvas">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className={`stylist-try-on-canvas__canvas ${isDragging ? 'stylist-try-on-canvas__canvas--dragging' : ''} ${isRendering ? 'stylist-try-on-canvas__canvas--rendering' : ''}`}
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
      
      {/* Loading indicator shown during rendering */}
      {isRendering && (
        <div className="stylist-try-on-canvas__loading">
          <div className="stylist-try-on-canvas__loading-spinner"></div>
          <div className="stylist-try-on-canvas__loading-text">
            Processing image...
          </div>
        </div>
      )}
      
      {/* Drag indicator for low-performance mode */}
      {isDragging && !deviceCapabilities.useRealTimePreview && (
        <div className="stylist-try-on-canvas__drag-indicator"></div>
      )}
      
      {/* Performance mode indicator for debug purposes */}
      {process.env.NODE_ENV === 'development' && (
        <div className="stylist-try-on-canvas__debug">
          <div className={`stylist-try-on-canvas__debug-indicator ${deviceCapabilities.performance}`}>
            {deviceCapabilities.performance} mode
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnCanvas;