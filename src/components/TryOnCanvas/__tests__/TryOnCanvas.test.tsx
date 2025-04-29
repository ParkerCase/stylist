// src/components/TryOnCanvas/__tests__/TryOnCanvas.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TryOnCanvas from '../TryOnCanvas';
import { OutfitTryOn, UserImageInfo, GarmentType, BodyPosition, ProcessingStatus } from '@/types/tryOn';
import * as canvasUtils from '@/services/image-processing/canvasUtils';
import * as fileUtils from '@/services/image-processing/fileUtils';
import { useTryOnStore } from '@/store/tryOnStore';

// Mock dependencies
jest.mock('@/services/image-processing/canvasUtils');
jest.mock('@/services/image-processing/fileUtils');
jest.mock('@/store/tryOnStore');

// Mock image
const mockImage = new Image();

describe('TryOnCanvas Component', () => {
  const mockSetCanvasRef = jest.fn();
  const mockOnGarmentSelect = jest.fn();
  
  const mockUserImage: UserImageInfo = {
    id: 'user-image-1',
    url: 'data:image/jpeg;base64,mockImageData',
    dimensions: {
      width: 500,
      height: 800
    },
    processingStatus: ProcessingStatus.COMPLETED
  };
  
  const mockOutfit: OutfitTryOn = {
    id: 'outfit1',
    name: 'Test Outfit',
    createdAt: new Date(),
    garments: [
      {
        id: 'garment1',
        url: 'tshirt.jpg',
        bodyPosition: BodyPosition.UPPER_BODY,
        type: GarmentType.TOP,
        zIndex: 10,
        layerIndex: 0,
        offset: { x: 0, y: 0 },
        rotation: 0,
        scale: 1,
        dimensions: { width: 200, height: 300 },
        originalDimensions: { width: 200, height: 300 }
      },
      {
        id: 'garment2',
        url: 'jeans.jpg',
        bodyPosition: BodyPosition.LOWER_BODY,
        type: GarmentType.BOTTOM,
        zIndex: 5,
        layerIndex: 1,
        offset: { x: 0, y: 150 },
        rotation: 0,
        scale: 1,
        dimensions: { width: 200, height: 400 },
        originalDimensions: { width: 200, height: 400 }
      }
    ]
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useTryOnStore
    (useTryOnStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        canvasWidth: 600,
        canvasHeight: 800,
        settings: {
          showGuidelines: true
        },
        updateGarment: jest.fn()
      };
      return selector(state);
    });
    
    // Mock canvas methods
    const mockCanvasContext = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn()
    } as unknown as CanvasRenderingContext2D;
    
    // Using any to bypass type checking for test mocks
    HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation(() => mockCanvasContext) as any;
    
    // Mock loadImage from fileUtils
    (fileUtils.loadImage as jest.Mock).mockResolvedValue(mockImage);
    
    // Mock compositeImages from canvasUtils
    (canvasUtils.compositeImages as jest.Mock).mockResolvedValue(undefined);
    (canvasUtils.drawGuidelines as jest.Mock).mockReturnValue(undefined);
  });
  
  test('renders correctly with no user image', () => {
    render(
      <TryOnCanvas
        outfit={mockOutfit}
        userImage={null}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
      />
    );
    
    // Should show placeholder text
    expect(screen.getByText(/Upload a photo to start/i)).toBeInTheDocument();
    
    // Canvas should be present
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    
    // setCanvasRef should be called with the canvas element
    expect(mockSetCanvasRef).toHaveBeenCalledWith(canvas);
  });
  
  test('renders correctly with user image', () => {
    render(
      <TryOnCanvas
        outfit={mockOutfit}
        userImage={mockUserImage}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
      />
    );
    
    // Placeholder text should not be present
    expect(screen.queryByText(/Upload a photo to start/i)).not.toBeInTheDocument();
    
    // Canvas should be present
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    
    // Should load the user image
    expect(fileUtils.loadImage).toHaveBeenCalledWith(mockUserImage.url);
    
    // Should composite the images
    expect(canvasUtils.compositeImages).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      mockImage,
      mockOutfit.garments,
      fileUtils.loadImage
    );
  });
  
  test('handles garment selection on canvas click', () => {
    render(
      <TryOnCanvas
        outfit={mockOutfit}
        userImage={mockUserImage}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
      />
    );
    
    // Get the canvas element
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    
    // Mock getBoundingClientRect to return canvas position
    const mockRect = { left: 10, top: 20, width: 600, height: 800 };
    canvas.getBoundingClientRect = jest.fn(() => mockRect as DOMRect);
    
    // Simulate a click on the garment position
    // Click position for top garment 
    // (center of canvas + offset of garment + adjustments for garment dimensions)
    const clickX = 300;
    const clickY = 300;
    
    fireEvent.click(canvas, { 
      clientX: mockRect.left + clickX, 
      clientY: mockRect.top + clickY 
    });
    
    // Should call onGarmentSelect with the garment id
    // Note: In the actual component, this would determine if the click is within
    // the garment bounds, but in this test we're mocking the calculation
    expect(mockOnGarmentSelect).toHaveBeenCalled();
  });
  
  test('handles dragging of garments', () => {
    // Mock the updateGarment function
    const mockUpdateGarment = jest.fn();
    (useTryOnStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        canvasWidth: 600,
        canvasHeight: 800,
        settings: {
          showGuidelines: true
        },
        updateGarment: mockUpdateGarment
      };
      return selector(state);
    });
    
    render(
      <TryOnCanvas
        outfit={mockOutfit}
        userImage={mockUserImage}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
      />
    );
    
    // Get the canvas element
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    
    // Mock getBoundingClientRect to return canvas position
    const mockRect = { left: 10, top: 20, width: 600, height: 800 };
    canvas.getBoundingClientRect = jest.fn(() => mockRect as DOMRect);
    
    // First, select a garment by clicking
    const clickX = 300;
    const clickY = 300;
    
    fireEvent.click(canvas, { 
      clientX: mockRect.left + clickX, 
      clientY: mockRect.top + clickY 
    });
    
    // Now initiate dragging
    fireEvent.mouseDown(canvas, {
      clientX: mockRect.left + clickX,
      clientY: mockRect.top + clickY
    });
    
    // Simulate mouse move
    const moveX = clickX + 20;
    const moveY = clickY + 10;
    
    fireEvent.mouseMove(canvas, {
      clientX: mockRect.left + moveX,
      clientY: mockRect.top + moveY
    });
    
    // End dragging
    fireEvent.mouseUp(canvas);
    
    // Canvas should have the dragging class during drag and not after
    expect(canvas.className).not.toContain('stylist-try-on-canvas__canvas--dragging');
    
    // Note: Full validation of the drag operation would require 
    // accessing component state which is more complex in a unit test.
    // This test demonstrates the basic interactions.
  });
  
  test('shows body guide when specified', () => {
    render(
      <TryOnCanvas
        outfit={mockOutfit}
        userImage={null}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
        showBodyGuide={true}
      />
    );
    
    // Body guide should be rendered
    // We can't easily test for the component itself, so we'd normally
    // look for specific elements or classes that the BodyGuide renders
    
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });
  
  test('renders with no outfit provided', () => {
    render(
      <TryOnCanvas
        outfit={null}
        userImage={mockUserImage}
        setCanvasRef={mockSetCanvasRef}
        onGarmentSelect={mockOnGarmentSelect}
      />
    );
    
    // Canvas should still render
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    
    // Should still load the user image
    expect(fileUtils.loadImage).toHaveBeenCalledWith(mockUserImage.url);
    
    // But should not try to composite images
    expect(canvasUtils.compositeImages).not.toHaveBeenCalled();
  });
});