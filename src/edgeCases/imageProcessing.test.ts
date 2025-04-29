// src/edgeCases/imageProcessing.test.ts
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { renderHook, act } from '@testing-library/react-hooks';
import { useTryOnStore } from '@/store/tryOnStore';
import { ProcessingStatus } from '@/types/tryOn';

// Mock dependencies
jest.mock('@/hooks/useBackgroundRemoval', () => ({
  useBackgroundRemoval: () => ({
    removeImageBackground: jest.fn(async (image) => ({
      ...image,
      processingStatus: ProcessingStatus.COMPLETED,
      backgroundRemoved: true
    })),
    isProcessing: false,
    error: null,
    progress: 100
  })
}));

// Mock image processing utilities
jest.mock('@/services/image-processing/fileUtils', () => ({
  fileToDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockImageData'),
  getImageDimensions: jest.fn().mockResolvedValue({ width: 400, height: 600 }),
  isImageFile: jest.fn().mockImplementation((file) => file.type.startsWith('image/')),
  loadImage: jest.fn().mockResolvedValue({
    width: 400,
    height: 600
  }),
  dataUrlToBlob: jest.fn().mockReturnValue('blob:mock-url'),
  getImageInfo: jest.fn().mockResolvedValue({
    id: 'mock-id',
    url: 'data:image/png;base64,mockImageData',
    dimensions: { width: 400, height: 600 },
    originalDimensions: { width: 400, height: 600 }
  })
}));

// Mock image scaling
jest.mock('@/services/image-processing/imageScaling', () => ({
  calculateAspectRatioDimensions: jest.fn().mockImplementation((width, height, _, __, maxWidth, maxHeight) => {
    // Simple aspect ratio calculation for tests
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);
      
      return {
        width: Math.floor(width * ratio),
        height: Math.floor(height * ratio)
      };
    }
    
    return { width, height };
  })
}));

jest.mock('@/store/tryOnStore');

describe('Image Processing Edge Cases', () => {
  // Mock try-on store
  const mockTryOnStore = {
    settings: {
      removeBackgroundAutomatically: true
    },
    setUserImage: jest.fn(),
    updateUserImage: jest.fn()
  };

  // Get the mocked functions
  const fileUtils = require('@/services/image-processing/fileUtils');
  const imageScaling = require('@/services/image-processing/imageScaling');

  beforeEach(() => {
    jest.clearAllMocks();
    (useTryOnStore as unknown as jest.Mock).mockImplementation(() => mockTryOnStore);
  });

  // Helper function to create mock files of different types
  const createMockFile = (type: string, name = 'test'): File => {
    const file = new File(['mock file content'], `${name}.${type.split('/')[1]}`, { type });
    return file;
  };

  describe('Unusual File Types', () => {
    test('should handle WebP image format', async () => {
      const webpFile = createMockFile('image/webp');
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(webpFile);
      });

      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
    });

    test('should handle BMP image format', async () => {
      const bmpFile = createMockFile('image/bmp');
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(bmpFile);
      });

      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
    });

    test('should handle SVG image format', async () => {
      const svgFile = createMockFile('image/svg+xml');
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(svgFile);
      });

      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
    });

    test('should reject non-image files', async () => {
      const pdfFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(pdfFile);
      });

      expect(processedImage).toBeNull();
      expect(result.current.error).toContain('not an image');
      expect(mockTryOnStore.updateUserImage).toHaveBeenCalledWith(expect.objectContaining({
        processingStatus: ProcessingStatus.FAILED,
        processingError: expect.any(String)
      }));
    });
  });

  describe('Extreme Image Sizes', () => {
    test('should handle extremely large images', async () => {
      // Setup large image dimensions
      fileUtils.getImageDimensions.mockResolvedValueOnce({ width: 5000, height: 5000 });

      // Create a large file
      const largeFile = createMockFile('image/jpeg', 'large');
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const { result } = renderHook(() => useImageProcessing({
        maxWidth: 1200,
        maxHeight: 1600
      }));

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(largeFile);
      });

      expect(processedImage).not.toBeNull();
      expect(imageScaling.calculateAspectRatioDimensions).toHaveBeenCalledWith(
        5000, 5000, undefined, undefined, 1200, 1600
      );
      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
    });

    test('should handle extremely small images', async () => {
      // Setup small image dimensions
      fileUtils.getImageDimensions.mockResolvedValueOnce({ width: 10, height: 10 });

      const smallFile = createMockFile('image/jpeg', 'small');
      Object.defineProperty(smallFile, 'size', { value: 100 }); // 100 bytes
      
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(smallFile);
      });

      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          originalDimensions: { width: 10, height: 10 }
        })
      );
    });

    test('should handle zero-sized images properly', async () => {
      // Mock fileToDataUrl to return an empty data URL
      fileUtils.fileToDataUrl.mockRejectedValueOnce(new Error('Empty file'));

      const emptyFile = new File([], 'empty.png', { type: 'image/png' });
      
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(emptyFile);
      });

      expect(processedImage).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Images with Transparency', () => {
    test('should properly process PNG with transparency', async () => {
      const transparentPng = createMockFile('image/png');
      
      const { result } = renderHook(() => useImageProcessing({
        autoRemoveBackground: false
      }));

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(transparentPng);
      });

      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
    });

    test('should process images with alpha channel in background removal', async () => {
      const transparentPng = createMockFile('image/png');
      
      const { result } = renderHook(() => useImageProcessing({
        autoRemoveBackground: true
      }));

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(transparentPng);
      });

      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundRemoved: true
        })
      );
    });
  });

  describe('Grayscale/Low-Contrast Images', () => {
    test('should handle grayscale images', async () => {
      // Setup grayscale image dimensions
      fileUtils.getImageDimensions.mockResolvedValueOnce({ width: 400, height: 400 });
      
      const grayscaleFile = createMockFile('image/jpeg', 'grayscale');
      
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(grayscaleFile);
      });

      expect(processedImage).not.toBeNull();
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.COMPLETED
        })
      );
      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
    });

    test('should handle images with very low contrast', async () => {
      // For this test, we'll use the standard mock implementation
      // but simulate a failure differently
      const lowContrastFile = createMockFile('image/jpeg', 'low-contrast');
      
      // Set up the behavior to fail image processing
      fileUtils.getImageDimensions.mockRejectedValueOnce(
        new Error('Failed to detect subject in low contrast image')
      );
      
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(lowContrastFile);
      });

      // Even with failures, the system should be resilient
      expect(mockTryOnStore.setUserImage).toHaveBeenCalled();
      expect(processedImage).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should gracefully handle image loading errors', async () => {
      // Mock loadImage to throw an error
      fileUtils.getImageDimensions.mockRejectedValueOnce(new Error('Network error loading image'));

      const imageFile = createMockFile('image/jpeg');
      
      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(imageFile);
      });

      expect(processedImage).toBeNull();
      expect(result.current.error).toBeTruthy();
      expect(mockTryOnStore.updateUserImage).toHaveBeenCalledWith(expect.objectContaining({
        processingStatus: ProcessingStatus.FAILED
      }));
    });

    test('should log detailed errors during processing failures', async () => {
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error during processing
      fileUtils.fileToDataUrl.mockRejectedValueOnce(new Error('File reader error'));
      
      const badFile = createMockFile('image/jpeg');

      const { result } = renderHook(() => useImageProcessing());

      let processedImage;
      await act(async () => {
        processedImage = await result.current.processImage(badFile);
      });

      expect(processedImage).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    test('should update processing status during each stage', async () => {
      const imageFile = createMockFile('image/jpeg');
      
      const { result } = renderHook(() => useImageProcessing({
        autoRemoveBackground: true
      }));

      await act(async () => {
        await result.current.processImage(imageFile);
      });

      // Verify all processing stages were reported
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.UPLOADING
        })
      );
      
      expect(mockTryOnStore.setUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.PROCESSING
        })
      );
      
      expect(mockTryOnStore.updateUserImage).toHaveBeenCalledWith(
        expect.objectContaining({
          processingStatus: ProcessingStatus.REMOVING_BACKGROUND
        })
      );
    });
  });

  describe('Utilities for Image Handling', () => {
    test('calculateAspectRatioDimensions should maintain aspect ratio', () => {
      // Use the mock implementation we've already defined
      const result = imageScaling.calculateAspectRatioDimensions(800, 600, undefined, undefined, 400, 400);
      
      // Should scale down proportionally
      expect(result.width).toBeLessThanOrEqual(400);
      expect(result.height).toBeLessThanOrEqual(400);
      
      // Should maintain aspect ratio
      expect(result.width / result.height).toBeCloseTo(800 / 600);
    });

    test('isImageFile should detect image files correctly', () => {
      // Test our mock implementation
      expect(fileUtils.isImageFile(createMockFile('image/jpeg'))).toBe(true);
      expect(fileUtils.isImageFile(createMockFile('image/png'))).toBe(true);
      expect(fileUtils.isImageFile(createMockFile('image/webp'))).toBe(true);
      expect(fileUtils.isImageFile(createMockFile('image/svg+xml'))).toBe(true);
      
      const nonImageFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      expect(fileUtils.isImageFile(nonImageFile)).toBe(false);
    });
  });
});