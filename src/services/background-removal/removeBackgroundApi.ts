// Remove.bg API client for background removal

import { BackgroundRemovalMethod, BackgroundRemovalResult } from '@/types/tryOn';

interface RemoveBgApiOptions {
  apiKey: string;
  outputFormat?: 'auto' | 'png' | 'jpg' | 'zip';
  size?: 'auto' | 'preview' | 'full' | '4k';
  scale?: 'original' | '10%' | '20%' | '50%' | '80%' | '100%';
  type?: 'auto' | 'person' | 'product' | 'car';
  crop?: boolean;
  cropMargin?: string; // e.g., "30px" or "0px 10px 10px 20px"
  roi?: string; // Region of interest, e.g., "0% 0% 100% 100%"
  semitransparency?: boolean;
  channels?: 'rgba' | 'alpha';
}

const DEFAULT_OPTIONS: Partial<RemoveBgApiOptions> = {
  outputFormat: 'png',
  size: 'auto',
  type: 'person',
  semitransparency: true,
  channels: 'rgba'
};

/**
 * Remove background from an image using the Remove.bg API
 */
export const removeBackgroundApi = async (
  imageData: string | File,
  options?: Partial<RemoveBgApiOptions>
): Promise<BackgroundRemovalResult> => {
  try {
    if (!options?.apiKey) {
      throw new Error('API key is required for Remove.bg API');
    }
    
    // Combine default options with provided options
    const apiOptions: RemoveBgApiOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    
    // Create form data
    const formData = new FormData();
    
    // Add image data
    if (typeof imageData === 'string') {
      // If the image is a data URL
      if (imageData.startsWith('data:')) {
        // Extract base64 data and convert to blob
        const base64Data = imageData.split(',')[1];
        const blob = base64ToBlob(base64Data, 'image/png');
        formData.append('image_file', blob);
      } else {
        // If it's a URL
        formData.append('image_url', imageData);
      }
    } else {
      // If it's a file
      formData.append('image_file', imageData);
    }
    
    // Add all options
    formData.append('size', apiOptions.size || 'auto');
    
    if (apiOptions.outputFormat) {
      formData.append('format', apiOptions.outputFormat);
    }
    
    if (apiOptions.type) {
      formData.append('type', apiOptions.type);
    }
    
    if (apiOptions.crop !== undefined) {
      formData.append('crop', apiOptions.crop ? 'true' : 'false');
    }
    
    if (apiOptions.cropMargin) {
      formData.append('crop_margin', apiOptions.cropMargin);
    }
    
    if (apiOptions.roi) {
      formData.append('roi', apiOptions.roi);
    }
    
    if (apiOptions.scale) {
      formData.append('scale', apiOptions.scale);
    }
    
    if (apiOptions.semitransparency !== undefined) {
      formData.append('semitransparency', apiOptions.semitransparency ? 'true' : 'false');
    }
    
    if (apiOptions.channels) {
      formData.append('channels', apiOptions.channels);
    }
    
    // Make API request
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Api-Key': apiOptions.apiKey
      }
    });
    
    // Check response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Remove.bg API error (${response.status}): ${
          errorData.errors?.[0]?.title || response.statusText
        }`
      );
    }
    
    // Convert the response to a blob and then to a URL
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    
    return {
      success: true,
      imageUrl,
      method: BackgroundRemovalMethod.REMOVE_BG_API
    };
  } catch (error) {
    console.error('Background removal API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      method: BackgroundRemovalMethod.REMOVE_BG_API
    };
  }
};

/**
 * Helper function to convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}
