# Body Segmentation Model

This directory should contain the TensorFlow.js model files for body segmentation:

- `model.json` - Model architecture (included as a placeholder)
- `group1-shard1of1.bin` - Model weights

## Getting the Model

The real model files should be downloaded from one of these sources:

1. TensorFlow.js Body-Pix model:
   https://github.com/tensorflow/tfjs-models/tree/master/body-pix

2. TensorFlow.js Body Segmentation model:
   https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation

You can use the following commands to download the model:

```bash
# Install the TensorFlow.js converter if you don't have it
npm install -g @tensorflow/tfjs-converter

# Clone the models repo
git clone https://github.com/tensorflow/tfjs-models.git

# Navigate to the body-pix directory
cd tfjs-models/body-pix

# Install dependencies
npm install

# Build the package
npm run build

# The model will be in the dist folder
# Copy the model files to this directory
```

## Alternative

If you prefer not to use TensorFlow.js for background removal, you can use the Remove.bg API instead.
Set the `REMOVE_BG_API_KEY` environment variable to your Remove.bg API key to enable API-based background removal.