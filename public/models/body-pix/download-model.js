const fs = require('fs');
const path = require('path');
const https = require('https');

// New URLs based on TensorFlow.js models repository
const MODEL_URLS = [
  'https://storage.googleapis.com/tfjs-models/tfjs/body-pix_mobilenet_quant_2_2_0_1_default_1/model.json',
  'https://storage.googleapis.com/tfjs-models/tfjs/body-pix_mobilenet_quant_2_2_0_1_default_1/group1-shard1of1.bin'
];

// Create directory structure
const baseDir = path.resolve(__dirname);
fs.mkdirSync(baseDir, { recursive: true });

console.log('Downloading BodyPix model files...');

// Download all model files
Promise.all(
  MODEL_URLS.map(url => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(baseDir, path.basename(url));
      
      console.log(`Downloading ${url} to ${filePath}...`);
      
      const file = fs.createWriteStream(filePath);
      https.get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${filePath}`);
          resolve();
        });
      }).on('error', err => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  })
).then(() => {
  console.log('All model files downloaded successfully!');
}).catch(error => {
  console.error('Error downloading model files:', error);
});