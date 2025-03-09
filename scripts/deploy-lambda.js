// scripts/deploy-lambda.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'stylist-widget';
const BUILD_DIR = path.resolve(__dirname, '../dist');
const PACKAGE_FILE = path.resolve(__dirname, '../lambda-package.zip');

// Check if AWS CLI is installed
try {
  execSync('aws --version');
  console.log('AWS CLI found, proceeding with deployment...');
} catch (error) {
  console.error('AWS CLI is not installed. Please install it first.');
  process.exit(1);
}

// Create deployment package
console.log('Creating deployment package...');
try {
  // Create zip file
  if (fs.existsSync(PACKAGE_FILE)) {
    fs.unlinkSync(PACKAGE_FILE);
  }
  
  execSync(`cd "${BUILD_DIR}" && zip -r "${PACKAGE_FILE}" .`);
  console.log(`Package created at ${PACKAGE_FILE}`);
} catch (error) {
  console.error('Failed to create deployment package:', error);
  process.exit(1);
}

// Deploy to Lambda
console.log(`Deploying to Lambda function: ${FUNCTION_NAME}`);
try {
  execSync(`aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://${PACKAGE_FILE} --region ${AWS_REGION}`);
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}

// Clean up
fs.unlinkSync(PACKAGE_FILE);
console.log('Deployment package cleaned up');