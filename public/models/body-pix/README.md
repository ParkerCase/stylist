# BodyPix Model for Background Removal

This directory contains the TensorFlow.js BodyPix model files for background removal. These files are required for the application to perform client-side background removal without relying on external API services.

## Files

- `model.json` - Model architecture configuration
- `group1-shard1of1.bin` - Model weights

## Current Status

The placeholder model files were created to address the 404 error when trying to load the model from the default URL:
```
ERROR: Request to https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/quant1/050/model-stride32.json failed with status code 404.
```

## Fixing the Model

To properly fix this issue, you need to:

1. **Download the actual model files** - The repository currently has placeholder files that need to be replaced with real model files.

2. **Options for obtaining the model files:**

   a. **Using TensorFlow.js CDN** (current implementation)
   The code has been modified to use local model files with a fallback to CDN:
   ```javascript
   modelUrl: '/models/body-pix/model.json'
   ```

   b. **Download from BodyPix GitHub Repository**
   ```bash
   # Clone the models repo
   git clone https://github.com/tensorflow/tfjs-models.git
   
   # Navigate to the body-pix directory
   cd tfjs-models/body-pix
   
   # Install dependencies
   npm install
   
   # Build the package
   npm run build
   
   # Copy the model files to your project
   ```

3. **Confirm Compatible Versions**
   The following versions are compatible with BodyPix:
   ```json
   "@tensorflow/tfjs": "^3.6.0",
   "@tensorflow/tfjs-backend-webgl": "^3.6.0",
   "@tensorflow-models/body-pix": "^2.2.0"
   ```

## Fallback Mechanism

The application has been updated with a robust fallback mechanism:

1. First tries to load the model from the local path
2. If that fails, attempts to load from TensorFlow.js CDN
3. If TensorFlow.js fails, falls back to the Remove.bg API (if API key is available)
4. If all methods fail, uses the original image without background removal

## Testing

To test the background removal functionality:
1. Start the development server: `npm start`
2. Navigate to: http://localhost:3000/test-background-removal.html
3. Upload an image and click "Process Image"
4. The test page will attempt to use the model to remove the background

## Troubleshooting

If you continue to experience issues:

1. Check browser console for specific errors
2. Ensure WebGL is supported in your browser
3. Try with a different image (smaller images may work better)
4. Consider using the Remove.bg API as a reliable alternative