/**
 * Service to remove background using remove.bg API
 */
import { REMOVE_BG_API_KEY } from '@/utils/environment';

interface RemoveBackgroundOptions {
  apiKey?: string;
  size?: 'auto' | 'preview' | 'small' | 'medium' | 'hd' | '4k';
  crop?: boolean;
  scale?: 'original' | 'fit' | 'stretch';
  format?: 'auto' | 'png' | 'jpg' | 'zip';
}

/**
 * Remove background from an image using remove.bg API
 * @param imageFile Image file to remove background from
 * @param options Configuration options
 * @returns DataURL of the processed image
 */
export async function removeBackgroundApi(
  imageFile: File,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  // Get API key from options or environment
  const apiKey = options.apiKey || REMOVE_BG_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided for remove.bg');
  }

  // Create FormData for API request
  const formData = new FormData();
  formData.append('image_file', imageFile);
  
  // Add options to request
  if (options.size) formData.append('size', options.size);
  formData.append('crop', options.crop ? 'true' : 'false');
  if (options.scale) formData.append('scale', options.scale);
  if (options.format) formData.append('format', options.format);

  // Send request to remove.bg API
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey
    },
    body: formData
  });

  // Handle API errors
  if (!response.ok) {
    let errorMessage = `Remove.bg API error (${response.status})`;
    
    try {
      const errorData = await response.json();
      errorMessage = `${errorMessage}: ${errorData.errors?.[0]?.title || 'Unknown error'}`;
    } catch (e) {
      // If JSON parsing fails, use status text
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }

  // Get binary image data from response
  const imageBlob = await response.blob();
  
  // Convert to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageBlob);
  });
}

/**
 * Check if remove.bg API is available with current API key
 * @returns Boolean indicating if API is available
 */
export async function isRemoveBgAvailable(): Promise<boolean> {
  const apiKey = REMOVE_BG_API_KEY;
  
  if (!apiKey) {
    return false;
  }
  
  try {
    // Make a lightweight account API call to check key validity
    const response = await fetch('https://api.remove.bg/v1.0/account', {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking remove.bg API availability:', error);
    return false;
  }
}