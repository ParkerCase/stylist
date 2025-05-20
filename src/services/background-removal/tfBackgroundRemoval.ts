/**
 * TensorFlow-based background removal service for virtual try-on
 * Fallback for when Remove.bg API is not available
 */

import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

// Cache for the BodyPix model
let bodyPixModel: bodyPix.BodyPix | null = null;
// Track if model is currently loading to prevent multiple simultaneous loads
let isModelLoading = false;
// Queue of callbacks for concurrent model requests
const modelLoadQueue: Array<{
  resolve: (model: bodyPix.BodyPix) => void;
  reject: (error: Error) => void;
}> = [];

// WebGL capabilities interface
interface WebGLCapabilities {
  supported: boolean;
  level: 1 | 2 | null;
  extensions: string[];
  fullSupport: boolean;
  fallbackOptions: {
    useCPUBackend: boolean;
    useSimpleSegmentation: boolean;
    useReducedPrecision: boolean;
    useProgressiveLoading: boolean;
  };
}

// Cache for WebGL capabilities
let webGLCapabilitiesCache: WebGLCapabilities | null = null;

/**
 * Check for WebGL capabilities and determine what fallbacks to use
 */
export function checkWebGLCapabilities(): WebGLCapabilities {
  // Return cached result if available
  if (webGLCapabilitiesCache) {
    return webGLCapabilitiesCache;
  }

  const result: WebGLCapabilities = {
    supported: false,
    level: null,
    extensions: [],
    fullSupport: false,
    fallbackOptions: {
      useCPUBackend: false,
      useSimpleSegmentation: false,
      useReducedPrecision: false,
      useProgressiveLoading: false
    }
  };

  try {
    // Try to create a canvas and get WebGL context
    const canvas = document.createElement('canvas');

    // Try to get WebGL2 context first
    let gl = canvas.getContext('webgl2') as WebGLRenderingContext;
    if (gl) {
      result.supported = true;
      result.level = 2;
    } else {
      // Fall back to WebGL1
      gl = (
        canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
        canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false })
      ) as WebGLRenderingContext;

      if (gl) {
        result.supported = true;
        result.level = 1;
      }
    }

    // If WebGL is supported, check extensions and capabilities
    if (result.supported && gl) {
      // Get all available extensions
      const extensions = gl.getSupportedExtensions() || [];
      result.extensions = extensions;

      // Check for specific extensions needed for TensorFlow.js
      const requiredExtensions = [
        'OES_texture_float',
        'WEBGL_color_buffer_float',
        'OES_element_index_uint',
        'OES_vertex_array_object',
        'WEBGL_draw_buffers'
      ];

      const supportedRequired = requiredExtensions.filter(ext =>
        extensions.includes(ext));

      // Check if we have full support - at least 3 of 5 required extensions
      result.fullSupport = supportedRequired.length >= 3;

      // Get WebGL info if available
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log(`WebGL vendor: ${vendor}, renderer: ${renderer}`);

          // Check for software renderers which may be slower
          const rendererLower = renderer.toString().toLowerCase();
          if (
            rendererLower.includes('swiftshader') ||
            rendererLower.includes('software') ||
            rendererLower.includes('intel')
          ) {
            // Software renderer detected - will need CPU fallback
            result.fallbackOptions.useCPUBackend = true;
          }
        }
      } catch (debugError) {
        console.warn('Unable to get WebGL debug info:', debugError);
      }

      // Test shader compilation if we have basic support
      try {
        // A simple test shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (vertexShader) {
          gl.shaderSource(vertexShader, `
            attribute vec2 a_position;
            void main() {
              gl_Position = vec4(a_position, 0, 1);
            }
          `);
          gl.compileShader(vertexShader);

          if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            // Shader compilation failed - might need more fallbacks
            result.fallbackOptions.useSimpleSegmentation = true;
            result.fallbackOptions.useReducedPrecision = true;
          }

          gl.deleteShader(vertexShader);
        }
      } catch (shaderError) {
        console.warn('WebGL shader test failed:', shaderError);
        result.fallbackOptions.useSimpleSegmentation = true;
      }

      // Determine fallback options based on capabilities
      if (!result.fullSupport) {
        // If we're missing float textures, use reduced precision
        result.fallbackOptions.useReducedPrecision =
          !extensions.includes('OES_texture_float');

        // If we're missing color buffer, use simpler segmentation
        result.fallbackOptions.useSimpleSegmentation =
          !extensions.includes('WEBGL_color_buffer_float');

        // If WebGL1 with limited extensions, consider CPU backend
        if (result.level === 1 && supportedRequired.length < 2) {
          result.fallbackOptions.useCPUBackend = true;
        }

        // Always use progressive loading for limited WebGL capabilities
        result.fallbackOptions.useProgressiveLoading = true;
      }
    } else {
      // No WebGL support at all
      result.fallbackOptions.useCPUBackend = true;
      result.fallbackOptions.useSimpleSegmentation = true;
      result.fallbackOptions.useReducedPrecision = true;
      result.fallbackOptions.useProgressiveLoading = true;
    }
  } catch (error) {
    console.warn('Error checking WebGL capabilities:', error);
    // In case of error, assume no support and use all fallbacks
    result.supported = false;
    result.fallbackOptions.useCPUBackend = true;
    result.fallbackOptions.useSimpleSegmentation = true;
    result.fallbackOptions.useReducedPrecision = true;
    result.fallbackOptions.useProgressiveLoading = true;
  }

  // Cache the result
  webGLCapabilitiesCache = result;
  console.log('WebGL capabilities:', result);
  return result;
};

/**
 * Configure TensorFlow.js based on available WebGL capabilities
 */
export function configureTensorFlow(): void {
  const webGLCaps = checkWebGLCapabilities();

  try {
    // Set the appropriate backend
    if (webGLCaps.fallbackOptions.useCPUBackend) {
      console.log('Using CPU backend for TensorFlow.js due to limited WebGL support');
      tf.setBackend('cpu').catch(err => {
        console.warn('Failed to set CPU backend:', err);
      });
    } else {
      console.log('Using WebGL backend for TensorFlow.js');
      tf.setBackend('webgl').catch(err => {
        console.warn('Failed to set WebGL backend, falling back to CPU:', err);
        tf.setBackend('cpu').catch(innerErr => {
          console.warn('Failed to set CPU backend as fallback:', innerErr);
        });
      });
    }

    // Configure TensorFlow environment flags based on WebGL capabilities
    if (webGLCaps.fullSupport) {
      // Full WebGL support - use optimal settings
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_PACK', true);
      tf.env().set('WEBGL_RENDER_FLOAT32_ENABLED', true);
    } else {
      // Limited WebGL support - use more compatible settings
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', webGLCaps.fallbackOptions.useReducedPrecision);
      tf.env().set('WEBGL_PACK', false); // Disable packing for better compatibility
      tf.env().set('WEBGL_RENDER_FLOAT32_ENABLED', !webGLCaps.fallbackOptions.useReducedPrecision);

      // Additional fallback settings
      tf.env().set('WEBGL_USE_SHAPES_UNIFORMS', true);
      tf.env().set('WEBGL_PACK_DEPTHWISECONV', false);
    }

    // Wait for backend initialization to be ready
    tf.ready().then(() => {
      console.log(`TensorFlow.js using ${tf.getBackend()} backend`);
    }).catch(err => {
      console.warn('Error initializing TensorFlow backend:', err);
    });
  } catch (error) {
    console.error('Error configuring TensorFlow:', error);
  }
}

/**
 * Check if TensorFlow.js is supported in the current browser
 */
export async function isTensorflowSupported(): Promise<boolean> {
  try {
    // Get WebGL capabilities
    const webGLCaps = checkWebGLCapabilities();

    // If WebGL is not supported at all and CPU fallback isn't possible,
    // TensorFlow.js won't work
    if (!webGLCaps.supported && !tf.findBackend('cpu')) {
      return false;
    }

    // Configure TensorFlow based on capabilities
    configureTensorFlow();

    // Try to create a simple tensor to test if tf.js works
    try {
      const tensor = tf.tensor1d([1, 2, 3]);
      tensor.dispose();

      // Attempt to access backend
      await tf.ready();
      const backend = tf.getBackend();

      return !!backend; // If we have a backend, it's supported
    } catch (tensorError) {
      console.warn('TensorFlow tensor creation failed:', tensorError);
      return false;
    }
  } catch (error) {
    console.error('TensorFlow.js support check failed:', error);
    return false;
  }
}

/**
 * Preload the BodyPix model to speed up initial segmentation,
 * with optimization based on WebGL capabilities
 */
export async function preloadBodyPixModel(): Promise<bodyPix.BodyPix> {
  try {
    // If model is already loaded, return it
    if (bodyPixModel) {
      return bodyPixModel;
    }

    // If model is already loading, add to queue
    if (isModelLoading) {
      return new Promise<bodyPix.BodyPix>((resolve, reject) => {
        modelLoadQueue.push({ resolve, reject });
      });
    }

    isModelLoading = true;
    console.log('Loading BodyPix model...');

    // Configure TensorFlow based on WebGL capabilities
    configureTensorFlow();

    // Get WebGL capabilities
    const webGLCaps = checkWebGLCapabilities();

    // Define our own ModelConfig interface rather than relying on BodyPix types
    interface ModelConfig {
      architecture: 'MobileNetV1' | 'ResNet50';
      outputStride: 8 | 16 | 32;
      multiplier?: 0.5 | 0.75 | 1.0;
      quantBytes?: 1 | 2 | 4;
      modelUrl?: string;
    }
    
    // Create model config based on capabilities
    const modelConfig: ModelConfig = {
      architecture: 'MobileNetV1',
      outputStride: webGLCaps.fullSupport ? 16 : 32, // Larger stride for limited devices
      multiplier: webGLCaps.fullSupport ? 0.75 : 0.5, // Smaller network for limited devices
      quantBytes: webGLCaps.fallbackOptions.useReducedPrecision ? 1 : 2, // Use fewer bits per weight for limited devices
      modelUrl: '/models/body-pix/model.json' // Use local model file path
    };

    // If progressive loading is needed, load in stages
    if (webGLCaps.fallbackOptions.useProgressiveLoading) {
      console.log('Using progressive model loading due to limited WebGL capabilities');

      // Wait for TensorFlow backend to be ready
      await tf.ready();

      // Try loading with CPU backend if needed
      if (webGLCaps.fallbackOptions.useCPUBackend) {
        try {
          await tf.setBackend('cpu');
        } catch (backendError) {
          console.warn('Failed to set CPU backend:', backendError);
        }
      }
    }

    // Load the model with the configured settings
    try {
      bodyPixModel = await bodyPix.load(modelConfig);
      console.log('BodyPix model loaded successfully');

      // Process queue
      while (modelLoadQueue.length > 0) {
        const { resolve } = modelLoadQueue.shift()!;
        resolve(bodyPixModel);
      }

      return bodyPixModel;
    } catch (modelError) {
      console.error('Error loading BodyPix model:', modelError);

      // Try with even more conservative settings if initial load failed
      if (!webGLCaps.fallbackOptions.useReducedPrecision) {
        try {
          console.log('Retrying with more conservative model settings...');
          bodyPixModel = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 32,
            multiplier: 0.5,
            quantBytes: 1,
            modelUrl: '/models/body-pix/model.json' // Use local model file path
          });

          console.log('BodyPix model loaded with fallback settings');

          // Process queue
          while (modelLoadQueue.length > 0) {
            const { resolve } = modelLoadQueue.shift()!;
            resolve(bodyPixModel);
          }

          return bodyPixModel;
        } catch (fallbackError) {
          console.error('Error loading BodyPix model with fallback settings:', fallbackError);

          // Try again with different model URL
          try {
            console.log('Trying alternative model URL');
            bodyPixModel = await bodyPix.load({
              architecture: 'MobileNetV1',
              outputStride: 16,
              multiplier: 0.5,
              quantBytes: 1,
              modelUrl: '/models/body-pix/model.json' // Use local model file path
            });

            console.log('BodyPix model loaded with alternative URL');

            // Process queue
            while (modelLoadQueue.length > 0) {
              const { resolve } = modelLoadQueue.shift()!;
              resolve(bodyPixModel);
            }

            return bodyPixModel;
          } catch (alternativeError) {
            console.error('Error loading BodyPix with alternative URL:', alternativeError);

            // Reject all queued promises
            while (modelLoadQueue.length > 0) {
              const { reject } = modelLoadQueue.shift()!;
              reject(alternativeError as Error);
            }

            throw alternativeError;
          }
        }
      }

      // Reject all queued promises
      while (modelLoadQueue.length > 0) {
        const { reject } = modelLoadQueue.shift()!;
        reject(modelError as Error);
      }

      throw modelError;
    } finally {
      isModelLoading = false;
    }
  } catch (error) {
    isModelLoading = false;
    console.error('Error in preloadBodyPixModel:', error);
    // Reset model state on error
    bodyPixModel = null;
    throw error;
  }
}

/**
 * Helper function to segment a person in an image
 * Used by background removal process and tests
 */
export async function segmentImage(
  imageElement: HTMLImageElement,
  options: {
    threshold?: number;
    flipHorizontal?: boolean;
    internalResolution?: 'low' | 'medium' | 'high' | 'full';
  } = {}
): Promise<bodyPix.SemanticPersonSegmentation> {
  // Get WebGL capabilities to determine optimal settings
  const webGLCaps = checkWebGLCapabilities();

  // Load the BodyPix model if not already loaded
  if (!bodyPixModel) {
    try {
      // This will configure TensorFlow.js based on WebGL capabilities
      await preloadBodyPixModel();
    } catch (modelError) {
      console.warn('Error loading BodyPix model during segmentation:', modelError);

      // If this is a WebGL-related error and Canvas 2D is available,
      // we'll return a simplified segmentation for fallback
      if (webGLCaps.fallbackOptions.useCPUBackend &&
          typeof document !== 'undefined' &&
          document.createElement('canvas').getContext('2d')) {
        console.log('Using Canvas API fallback for segmentation');

        return createSimplifiedSegmentation(imageElement);
      }

      throw new Error('Unable to load segmentation model');
    }
  }

  if (!bodyPixModel) {
    // If model still not available but Canvas 2D is, use canvas fallback
    if (webGLCaps.fallbackOptions.useCPUBackend &&
        typeof document !== 'undefined' &&
        document.createElement('canvas').getContext('2d')) {
      console.log('Using Canvas API fallback for segmentation');

      return createSimplifiedSegmentation(imageElement);
    }

    throw new Error('Failed to load BodyPix model');
  }

  // Determine optimal resolution based on WebGL capabilities
  let optimalResolution: 'low' | 'medium' | 'high' | 'full' = 'high';
  if (webGLCaps.fallbackOptions.useSimpleSegmentation) {
    optimalResolution = 'low'; // Use low resolution for limited devices
  } else if (!webGLCaps.fullSupport) {
    optimalResolution = 'medium'; // Use medium for partially supported devices
  }

  // If explicitly specified, use the requested resolution
  const requestedResolution = options.internalResolution;

  // Default options
  const segmentationOptions = {
    flipHorizontal: options.flipHorizontal || false,
    internalResolution: requestedResolution || optimalResolution,
    segmentationThreshold: options.threshold || 0.7
  };

  // Try progressively lower resolutions if needed
  try {
    // Segment the person with specified options
    return await bodyPixModel.segmentPerson(imageElement, segmentationOptions);
  } catch (highResError) {
    console.warn('Primary segmentation failed:', highResError);

    // Fallback progression if the first attempt fails
    try {
      // Try medium resolution if not already tried
      if (segmentationOptions.internalResolution !== 'medium' &&
          segmentationOptions.internalResolution !== 'low') {
        console.log('Falling back to medium resolution segmentation');
        return await bodyPixModel.segmentPerson(imageElement, {
          ...segmentationOptions,
          internalResolution: 'medium'
        });
      }

      // If already at medium or below, try low
      if (segmentationOptions.internalResolution !== 'low') {
        console.log('Falling back to low resolution segmentation');
        return await bodyPixModel.segmentPerson(imageElement, {
          ...segmentationOptions,
          internalResolution: 'low'
        });
      }

      // If all tensorflow.js approaches fail, fall back to Canvas API
      throw new Error('All TensorFlow.js segmentation approaches failed');
    } catch (fallbackError) {
      console.error('All segmentation fallbacks failed:', fallbackError);

      // Check if this is a WebGL error and provide a clearer message
      if (String(fallbackError).toLowerCase().includes('webgl') ||
          String(fallbackError).toLowerCase().includes('shader') ||
          String(fallbackError).toLowerCase().includes('compilation')) {
        console.log('WebGL error detected. Falling back to Canvas API');

        // Try the Canvas API fallback if WebGL is not supported
        return createSimplifiedSegmentation(imageElement);
      }

      throw fallbackError;
    }
  }
}

/**
 * Create a simplified segmentation using just the Canvas API
 * This is a fallback when TensorFlow.js/WebGL is not supported
 */
function createSimplifiedSegmentation(
  imageElement: HTMLImageElement
): bodyPix.SemanticPersonSegmentation {
  try {
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get 2D context for Canvas API fallback');
    }

    // Draw the image to the canvas
    ctx.drawImage(imageElement, 0, 0);

    // Get the image data to create a simple segmentation mask
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Create a mask with the same dimensions
    const maskData = new Uint8ClampedArray(canvas.width * canvas.height);

    // Simple background segmentation based on color and position
    // This is a very basic approach - in a real app you'd use a more sophisticated algorithm
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // Calculate relative distance from center (as a percentage)
        const distanceFromCenter = Math.sqrt(
          Math.pow((x - centerX) / centerX, 2) +
          Math.pow((y - centerY) / centerY, 2)
        );

        // Pixel index in the data array
        const i = (y * canvas.width + x) * 4;

        // Get RGB values
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple brightness calculation
        const brightness = (r + g + b) / 3;

        // Calculate distance from center to edge ratio (0 at center, 1 at corners)
        const edgeRatio = Math.min(1, distanceFromCenter);

        // Create a simple mask - likely foreground pixels are:
        // 1. Near the center of the image (person usually centered)
        // 2. Higher contrast/mid-brightness (not extreme white or black)
        // This is obviously a gross simplification but works OK as fallback
        const isForeground =
          edgeRatio < 0.7 && // Closer to center than edge
          brightness > 40 &&  // Not too dark (background often darker)
          brightness < 245;   // Not too bright (background often white or bright)

        // Set the mask value (1 for foreground, 0 for background)
        maskData[y * canvas.width + x] = isForeground ? 1 : 0;
      }
    }

    // Return a simplified segmentation result matching the BodyPix interface
    // Use the same technique as before to avoid type errors
    return {
      width: canvas.width,
      height: canvas.height,
      data: maskData,
      allPoses: [] // Add the required property
    } as unknown as bodyPix.SemanticPersonSegmentation;
  } catch (error) {
    console.error('Error in Canvas API fallback:', error);

    // If even the fallback fails, return a blank segmentation
    const blankMask = new Uint8ClampedArray(imageElement.width * imageElement.height);

    // Central region is assumed to be person for a very basic fallback
    const centerX = imageElement.width / 2;
    const centerY = imageElement.height / 2;
    const radius = Math.min(imageElement.width, imageElement.height) * 0.3;

    for (let y = 0; y < imageElement.height; y++) {
      for (let x = 0; x < imageElement.width; x++) {
        // Simple circular mask in the center
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (dist < radius) {
          blankMask[y * imageElement.width + x] = 1;
        }
      }
    }

    // Create a blank segmentation result with the required properties
    // First cast to unknown to avoid type checking, then to the expected type
    return {
      width: imageElement.width,
      height: imageElement.height,
      data: blankMask,
      allPoses: []
    } as unknown as bodyPix.SemanticPersonSegmentation;
  }
}

/**
 * Remove the background from an image using TensorFlow BodyPix
 * @param imageSource - Image file or URL to process
 * @param options - Configuration options
 * @returns URL to the processed image with background removed
 */
export async function removeBackground(
  imageSource: File | string,
  options: {
    backgroundColor?: string;
    foregroundColor?: string;
    threshold?: number;
    bodyPixOptions?: any; // Using any for compatibility with different BodyPix versions
  } = {}
): Promise<string> {
  try {
    // Load the BodyPix model if not already loaded
    if (!bodyPixModel) {
      try {
        await preloadBodyPixModel();
      } catch (modelError) {
        console.warn('BodyPix model failed to load, falling back to original image:', modelError);
        if (typeof imageSource === 'string') {
          return imageSource;
        } else {
          return URL.createObjectURL(imageSource);
        }
      }
    }

    if (!bodyPixModel) {
      throw new Error('Failed to load BodyPix model');
    }

    // Create an image element from the source
    const imageElement = await createImageElement(imageSource);

    // Try with different internal resolution options if needed
    let segmentation;
    try {
      // Use bodyPix to segment the person with primary settings
      segmentation = await bodyPixModel.segmentPerson(imageElement, {
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: options.threshold || 0.7,
        ...(options.bodyPixOptions || {})
      });
    } catch (segmentationError) {
      console.warn('High resolution segmentation failed, trying medium resolution:', segmentationError);

      // Try with lower resolution
      try {
        segmentation = await bodyPixModel.segmentPerson(imageElement, {
          flipHorizontal: false,
          internalResolution: 'medium', // Lower resolution fallback
          segmentationThreshold: options.threshold || 0.7,
          ...(options.bodyPixOptions || {})
        });
      } catch (mediumError) {
        console.warn('Medium resolution segmentation failed, trying low resolution:', mediumError);

        // Last attempt with lowest resolution
        try {
          segmentation = await bodyPixModel.segmentPerson(imageElement, {
            flipHorizontal: false,
            internalResolution: 'low', // Lowest resolution fallback
            segmentationThreshold: options.threshold || 0.7,
            ...(options.bodyPixOptions || {})
          });
        } catch (lowError) {
          console.error('All segmentation attempts failed:', lowError);
          throw lowError;
        }
      }
    }

    // Process the segmentation to extract key body parts
    return processSegmentation(
      imageElement,
      segmentation,
      options.backgroundColor || 'transparent',
      options.foregroundColor
    );
  } catch (error) {
    console.error('Error in TF background removal:', error);

    // Check for specific WebGL errors
    const errorMsg = String(error).toLowerCase();
    if (errorMsg.includes('webgl') || errorMsg.includes('shader') || errorMsg.includes('compilation')) {
      console.warn('WebGL/shader error detected. WebGL may not be fully supported on this device.');
    }

    // Return original image URL as fallback
    if (typeof imageSource === 'string') {
      return imageSource;
    } else {
      return URL.createObjectURL(imageSource);
    }
  }
}

/**
 * Process segmentation data to create a masked image
 */
function processSegmentation(
  imageElement: HTMLImageElement, 
  segmentation: bodyPix.SemanticPersonSegmentation,
  backgroundColor: string,
  foregroundColor?: string
): string {
  // Create a canvas for the output
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw the original image
  ctx.drawImage(imageElement, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  
  // For each pixel
  for (let i = 0; i < data.length; i += 4) {
    // Get pixel position
    const pixelIndex = i / 4;
    const x = pixelIndex % canvas.width;
    const y = Math.floor(pixelIndex / canvas.width);
    
    // Check if this pixel is part of a person
    if (!segmentation.data[pixelIndex]) {
      if (backgroundColor === 'transparent') {
        // Make pixel transparent
        data[i + 3] = 0;
      } else {
        // Set to background color
        const bgColor = hexToRgb(backgroundColor);
        data[i] = bgColor.r;     // R
        data[i + 1] = bgColor.g; // G
        data[i + 2] = bgColor.b; // B
        data[i + 3] = 255;       // A
      }
    } else if (foregroundColor) {
      // If foreground color is provided, tint the person
      const fgColor = hexToRgb(foregroundColor);
      // Blend original with foreground color
      data[i] = Math.round((data[i] + fgColor.r) / 2);       // R
      data[i + 1] = Math.round((data[i + 1] + fgColor.g) / 2); // G
      data[i + 2] = Math.round((data[i + 2] + fgColor.b) / 2); // B
    }
  }
  
  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to data URL and return
  return canvas.toDataURL('image/png');
}

/**
 * Extract body measurements from a segmented image
 * @param segmentation - BodyPix segmentation result
 * @param imageWidth - Width of the original image
 * @param imageHeight - Height of the original image
 */
export function extractBodyMeasurements(
  segmentation: bodyPix.SemanticPersonSegmentation,
  imageWidth: number,
  imageHeight: number
) {
  // Initialize bounds
  let minX = imageWidth;
  let maxX = 0;
  let minY = imageHeight;
  let maxY = 0;
  
  // Shoulders Y position
  let shouldersY = 0;
  let shouldersCount = 0;
  
  // Waist tracking
  let waistY = Math.floor(imageHeight * 0.5); // Approximate middle
  let waistLeft = imageWidth;
  let waistRight = 0;
  
  // Hips tracking (lower third of body)
  let hipsY = Math.floor(imageHeight * 0.7);
  let hipsLeft = imageWidth;
  let hipsRight = 0;
  
  // Process the segmentation data
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const index = y * imageWidth + x;
      
      if (segmentation.data[index]) {
        // Update bounds
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Check for shoulders (upper part)
        if (y <= imageHeight * 0.3) {
          shouldersY += y;
          shouldersCount++;
        }
        
        // Check for waist points
        if (Math.abs(y - waistY) < imageHeight * 0.05) {
          waistLeft = Math.min(waistLeft, x);
          waistRight = Math.max(waistRight, x);
        }
        
        // Check for hips points
        if (Math.abs(y - hipsY) < imageHeight * 0.05) {
          hipsLeft = Math.min(hipsLeft, x);
          hipsRight = Math.max(hipsRight, x);
        }
      }
    }
  }
  
  // Calculate measurements
  const bodyWidth = maxX - minX;
  const bodyHeight = maxY - minY;
  const shouldersAvgY = shouldersCount > 0 ? shouldersY / shouldersCount : 0;
  const waistWidth = waistRight - waistLeft;
  const hipsWidth = hipsRight - hipsLeft;
  
  // Return normalized measurements (as ratios of image dimensions)
  return {
    width: bodyWidth / imageWidth,
    height: bodyHeight / imageHeight,
    shouldersY: shouldersAvgY / imageHeight,
    waistWidth: waistWidth / imageWidth,
    hipsWidth: hipsWidth / imageWidth,
    // Approximate sizing category based on proportions
    approximateSize: calculateApproximateSize(waistWidth / hipsWidth, bodyWidth, bodyHeight),
    // Body shape classification
    bodyShape: classifyBodyShape(waistWidth / hipsWidth)
  };
}

/**
 * Calculate approximate clothing size based on proportions
 */
function calculateApproximateSize(
  waistToHipRatio: number,
  bodyWidth: number,
  bodyHeight: number
): string {
  // Very simple approximation - would need calibration data for accuracy
  if (bodyWidth < 100) return 'XS';
  if (bodyWidth < 150) return 'S';
  if (bodyWidth < 200) return 'M';
  if (bodyWidth < 250) return 'L';
  return 'XL';
}

/**
 * Classify body shape based on measurements
 * This is a very simplified version - a real implementation would be more nuanced
 */
function classifyBodyShape(waistToHipRatio: number): string {
  if (waistToHipRatio < 0.75) return 'hourglass';
  if (waistToHipRatio < 0.85) return 'pear';
  if (waistToHipRatio > 0.95) return 'apple';
  return 'rectangle';
}

/**
 * Create an image element from a file or URL
 */
async function createImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Default to black if invalid
  if (!hex || hex === 'transparent') {
    return { r: 0, g: 0, b: 0 };
  }
  
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse the hex values
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}