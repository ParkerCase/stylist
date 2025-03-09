// TensorFlow.js-based background removal

import { BackgroundRemovalMethod, BackgroundRemovalResult, Dimensions } from '@/types/tryOn';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// Model paths
const MODEL_URL = '/models/segmentation-model/model.json';

// Cache the loaded model
let segmentationModel: tf.GraphModel | null = null;

/**
 * Load the segmentation model
 */
export const loadSegmentationModel = async (): Promise<tf.GraphModel> => {
  if (segmentationModel) {
    return segmentationModel;
  }
  
  try {
    // Check if WebGL is available
    const webGLAvailable = tf.getBackend() === 'webgl' || await tf.setBackend('webgl');
    
    if (!webGLAvailable) {
      throw new Error('WebGL is not available. TensorFlow.js background removal requires WebGL support.');
    }
    
    // Load the model
    segmentationModel = await tf.loadGraphModel(MODEL_URL);
    return segmentationModel;
  } catch (error) {
    console.error('Failed to load segmentation model:', error);
    throw error;
  }
};

/**
 * Perform segmentation on an image
 */
export const segmentImage = async (
  imageData: HTMLImageElement | HTMLCanvasElement | ImageData | string
): Promise<ImageData> => {
  try {
    // Load the model if not already loaded
    const model = await loadSegmentationModel();
    
    // Convert input to tensor
    let imageTensor: tf.Tensor3D;
    
    if (typeof imageData === 'string') {
      // It's a URL or data URL, load the image first
      const img = await loadImageFromUrl(imageData);
      imageTensor = tf.browser.fromPixels(img);
    } else {
      imageTensor = tf.browser.fromPixels(imageData);
    }
    
    // Resize if needed (model might expect specific input dimensions)
    const targetHeight = 480;  // Example size, adjust based on your model
    const targetWidth = 640;   // Example size, adjust based on your model
    
    // Save original dimensions for later
    const originalHeight = imageTensor.shape[0];
    const originalWidth = imageTensor.shape[1];
    
    // Resize to target dimensions
    const resizedTensor = tf.image.resizeBilinear(
      imageTensor,
      [targetHeight, targetWidth]
    );
    
    // Normalize pixel values to [0, 1]
    const normalizedTensor = resizedTensor.div(255.0);
    
    // Add batch dimension
    const batchedTensor = normalizedTensor.expandDims(0);
    
    // Run inference
    const segmentationTensor = model.predict(batchedTensor) as tf.Tensor;
    
    // Process the output (depends on model architecture)
    // Assuming the output is a segmentation mask
    const maskTensor = segmentationTensor.squeeze();
    
    // Threshold the mask
    const thresholdedMask = maskTensor.greater(0.5);
    
    // Resize mask back to original dimensions
    const originalSizeMask = tf.image.resizeBilinear(
      thresholdedMask.expandDims(2),
      [originalHeight, originalWidth]
    ).squeeze();
    
    // Apply mask to original image
    const maskedImage = tf.tidy(() => {
      // Convert mask to 3 channels with values 0 or 1
      const rgbMask = originalSizeMask.expandDims(2).tile([1, 1, 3]);
      
      // Apply mask to original image
      return imageTensor.mul(rgbMask);
    });
    
    // Create alpha channel (1 for foreground, 0 for background)
    const alphaMask = originalSizeMask.expandDims(2);
    
    // Concatenate RGB with alpha
    const rgbaImage = tf.concat([maskedImage, alphaMask.mul(255)], 2);
    
    // Convert to canvas
    const canvas = document.createElement('canvas');
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // Get image data
    const imageData = await tf.browser.toPixels(rgbaImage as tf.Tensor3D);
    
    // Clean up tensors
    imageTensor.dispose();
    resizedTensor.dispose();
    normalizedTensor.dispose();
    batchedTensor.dispose();
    segmentationTensor.dispose();
    maskTensor.dispose();
    thresholdedMask.dispose();
    originalSizeMask.dispose();
    maskedImage.dispose();
    alphaMask.dispose();
    rgbaImage.dispose();
    
    // Create and return ImageData
    return new ImageData(imageData, originalWidth, originalHeight);
  } catch (error) {
    console.error('Segmentation error:', error);
    throw error;
  }
};

/**
 * Remove background using TensorFlow.js
 */
export const removeBackgroundTensorflow = async (
  imageData: string | HTMLImageElement
): Promise<BackgroundRemovalResult> => {
  try {
    // Ensure TensorFlow.js is ready
    await tf.ready();
    
    // Get image as HTMLImageElement
    const img = typeof imageData === 'string'
      ? await loadImageFromUrl(imageData)
      : imageData;
    
    // Perform segmentation
    const segmentedImageData = await segmentImage(img);
    
    // Convert to base64
    const canvas = document.createElement('canvas');
    canvas.width = segmentedImageData.width;
    canvas.height = segmentedImageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    ctx.putImageData(segmentedImageData, 0, 0);
    
    // Return as data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    return {
      success: true,
      imageUrl: dataUrl,
      method: BackgroundRemovalMethod.TENSORFLOW
    };
  } catch (error) {
    console.error('TensorFlow background removal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      method: BackgroundRemovalMethod.TENSORFLOW
    };
  }
};

/**
 * Helper function to load an image from a URL
 */
const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    img.src = url;
  });
};
