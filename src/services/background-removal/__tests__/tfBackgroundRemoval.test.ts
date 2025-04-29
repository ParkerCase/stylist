// src/services/background-removal/__tests__/tfBackgroundRemoval.test.ts
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';
import { 
  loadBodyPixModel,
  segmentImage,
  removeBackgroundTensorflow,
  isTensorflowSupported,
  preloadBodyPixModel
} from '../tfBackgroundRemoval';
import { BackgroundRemovalMethod } from '@/types/tryOn';

// Set longer timeout for TensorFlow tests which can take longer to run
jest.setTimeout(30000);

// Mock dependencies
jest.mock('@tensorflow/tfjs', () => ({
  ready: jest.fn().mockResolvedValue(undefined),
  getBackend: jest.fn().mockReturnValue('webgl'),
  setBackend: jest.fn().mockResolvedValue(true),
  tensor2d: jest.fn().mockReturnValue({
    add: jest.fn().mockReturnValue({ 
      dispose: jest.fn() 
    }),
    dispose: jest.fn()
  })
}));

jest.mock('@tensorflow-models/body-pix', () => {
  const mockBodyPixModel = {
    segmentPerson: jest.fn().mockResolvedValue({
      data: new Int32Array(400 * 600).fill(1),
      width: 400,
      height: 600
    })
  };
  
  return {
    load: jest.fn().mockResolvedValue(mockBodyPixModel),
    toMask: jest.fn().mockResolvedValue({
      data: new Uint8ClampedArray(400 * 600 * 4).fill(255)
    })
  };
});

describe('TensorFlow Background Removal', () => {
  // Mock Image and Canvas
  const mockImage = new Image();
  mockImage.width = 400;
  mockImage.height = 600;
  
  // Mock canvas
  const mockCtx = {
    drawImage: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn()
  };
  
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => mockCtx),
    toDataURL: jest.fn(() => 'data:image/png;base64,mockImageData')
  };
  
  // Mock segmentation result
  const mockSegmentation = {
    data: new Int32Array(400 * 600).fill(1),
    width: 400,
    height: 600
  };
  
  // Mock mask data
  const mockMask = {
    data: new Uint8ClampedArray(400 * 600 * 4).fill(255)
  };
  
  // Mock image data
  const mockImageData = {
    data: new Uint8ClampedArray(400 * 600 * 4).fill(255),
    width: 400,
    height: 600
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document.createElement
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return {} as any;
    });
    
    // Mock canvas context functions
    mockCtx.getImageData.mockReturnValue(mockImageData);
    
    // Mock image loading - only assign once to avoid "Cannot redefine property" error
    if (!Image.prototype.hasOwnProperty('_onloadSetter')) {
      Object.defineProperty(Image.prototype, '_onloadSetter', { value: true });
      Object.defineProperty(Image.prototype, 'onload', {
        configurable: true,
        get() { return this._onloadHandler; },
        set(fn) { 
          this._onloadHandler = fn;
          setTimeout(() => {
            if (typeof this._onloadHandler === 'function') {
              this._onloadHandler();
            }
          }, 10);
        }
      });
    }
  });
  
  test('loadBodyPixModel loads the model successfully', async () => {
    const model = await loadBodyPixModel();
    
    expect(bodyPix.load).toHaveBeenCalledWith({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
    
    expect(model).toBeDefined();
  });
  
  test('loadBodyPixModel caches the model', async () => {
    // First call should load the model
    const model1 = await loadBodyPixModel();
    
    // Second call should return cached model
    const model2 = await loadBodyPixModel();
    
    // Should be the same instance
    expect(model1).toBe(model2);
    
    // BodyPix.load should be called only once
    expect(bodyPix.load).toHaveBeenCalledTimes(1);
  });
  
  test('segmentImage processes image correctly', async () => {
    await segmentImage(mockImage);
    
    // Should load the model
    expect(bodyPix.load).toHaveBeenCalled();
    
    // Should call segmentPerson with the image
    const model = await bodyPix.load();
    expect(model.segmentPerson).toHaveBeenCalledWith(mockImage, expect.objectContaining({
      flipHorizontal: false,
      segmentationThreshold: 0.7
    }));
    
    // Should call toMask to create the segmentation mask
    expect(bodyPix.toMask).toHaveBeenCalledWith(
      mockSegmentation,
      expect.any(Object),
      expect.any(Object)
    );
    
    // Should create canvas of the right size
    expect(mockCanvas.width).toBe(mockImage.width);
    expect(mockCanvas.height).toBe(mockImage.height);
    
    // Should draw the original image
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 0, 0);
    
    // Should get image data
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, mockImage.width, mockImage.height);
  });
  
  test('removeBackgroundTensorflow removes background successfully', async () => {
    const result = await removeBackgroundTensorflow(mockImage);
    
    // Should return success
    expect(result.success).toBe(true);
    expect(result.method).toBe(BackgroundRemovalMethod.TENSORFLOW);
    expect(result.imageUrl).toBe('data:image/png;base64,mockImageData');
    
    // Should have put the segmented image data to the canvas
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });
  
  test('removeBackgroundTensorflow handles errors gracefully', async () => {
    // Mock segmentImage to throw an error
    const error = new Error('Segmentation failed');
    
    // Create a spy that rejects with the error
    jest.spyOn(require('../tfBackgroundRemoval'), 'segmentImage')
      .mockRejectedValueOnce(error);
    
    const result = await removeBackgroundTensorflow(mockImage);
    
    // Should return failure with error message
    expect(result.success).toBe(false);
    expect(result.method).toBe(BackgroundRemovalMethod.TENSORFLOW);
    expect(result.error).toBe('Segmentation failed');
  });

  
  test('isTensorflowSupported returns true when WebGL is available', async () => {
    const isSupported = await isTensorflowSupported();
    
    expect(isSupported).toBe(true);
    expect(tf.ready).toHaveBeenCalled();
    expect(tf.getBackend).toHaveBeenCalled();
    expect(tf.tensor2d).toHaveBeenCalled();
  });
  
  test('isTensorflowSupported returns false when WebGL is not available', async () => {
    // Mock WebGL not available
    (tf.getBackend as jest.Mock).mockReturnValue(null);
    (tf.setBackend as jest.Mock).mockResolvedValue(false);
    
    const isSupported = await isTensorflowSupported();
    
    expect(isSupported).toBe(false);
  });
  
  test('isTensorflowSupported handles errors', async () => {
    // Mock tf.ready to throw an error
    (tf.ready as jest.Mock).mockRejectedValue(new Error('TensorFlow initialization failed'));
    
    const isSupported = await isTensorflowSupported();
    
    expect(isSupported).toBe(false);
  });
  
  test('preloadBodyPixModel calls loadBodyPixModel in the background', () => {
    // Mock setTimeout
    jest.useFakeTimers();
    
    // Create a spy for loadBodyPixModel
    const loadBodyPixSpy = jest.spyOn(require('../tfBackgroundRemoval'), 'loadBodyPixModel')
      .mockResolvedValue({});
    
    preloadBodyPixModel();
    
    // Should not call immediately
    expect(loadBodyPixSpy).not.toHaveBeenCalled();
    
    // Fast forward timers
    jest.runAllTimers();
    
    // Now it should have been called
    expect(loadBodyPixSpy).toHaveBeenCalled();
    
    // Clean up
    jest.useRealTimers();
    loadBodyPixSpy.mockRestore();
  });
});