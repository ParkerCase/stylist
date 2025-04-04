#!/usr/bin/env node

/**
 * Verification script for The Stylist frontend application.
 * Checks that all required components are properly set up.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Add colors for terminal output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Define required files and directories
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'webpack.config.js',
  'src/StylistWidget.tsx',
  'src/components/ChatWidget/ChatWidget.tsx',
  'src/components/VirtualTryOn/VirtualTryOn.tsx',
  'src/hooks/useTryOn.ts',
  'src/hooks/useImageProcessing.ts',
  'src/services/background-removal/removeBackgroundApi.ts',
  'src/services/background-removal/tfBackgroundRemoval.ts',
  'public/models/segmentation-model/model.json',
];

// Define required dependencies
const requiredDependencies = [
  'react',
  'react-dom',
  'zustand',
  'axios',
];

// Define required dev dependencies
const requiredDevDependencies = [
  'typescript',
  'webpack',
  'babel',
  'jest',
];

// Check if a file exists
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Check required files
function checkRequiredFiles() {
  console.log(`${BLUE}Checking required files...${RESET}`);
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!checkFileExists(file)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.warn(`${YELLOW}Missing files: ${missingFiles.join(', ')}${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✓ All required files are present${RESET}`);
  return true;
}

// Check package.json
function checkPackageJson() {
  console.log(`${BLUE}Checking package.json...${RESET}`);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    
    // Check for required scripts
    const requiredScripts = ['start', 'build', 'test'];
    const missingScripts = [];
    
    for (const script of requiredScripts) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        missingScripts.push(script);
      }
    }
    
    if (missingScripts.length > 0) {
      console.warn(`${YELLOW}Missing scripts in package.json: ${missingScripts.join(', ')}${RESET}`);
      return false;
    }
    
    // Check for required dependencies
    const missingDependencies = [];
    
    for (const dep of requiredDependencies) {
      if (!packageJson.dependencies || !Object.keys(packageJson.dependencies).some(d => d === dep || d.startsWith(`${dep}@`))) {
        missingDependencies.push(dep);
      }
    }
    
    if (missingDependencies.length > 0) {
      console.warn(`${YELLOW}Missing dependencies in package.json: ${missingDependencies.join(', ')}${RESET}`);
      return false;
    }
    
    // Check for required dev dependencies
    const missingDevDependencies = [];
    
    for (const dep of requiredDevDependencies) {
      if (!packageJson.devDependencies || !Object.keys(packageJson.devDependencies).some(d => d === dep || d.startsWith(`${dep}`) || d.includes(dep))) {
        missingDevDependencies.push(dep);
      }
    }
    
    if (missingDevDependencies.length > 0) {
      console.warn(`${YELLOW}Missing dev dependencies in package.json: ${missingDevDependencies.join(', ')}${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}✓ package.json is properly configured${RESET}`);
    return true;
  } catch (err) {
    console.error(`${RED}Error reading package.json: ${err.message}${RESET}`);
    return false;
  }
}

// Check webpack config
function checkWebpackConfig() {
  console.log(`${BLUE}Checking webpack configuration...${RESET}`);
  
  try {
    const webpackConfig = fs.readFileSync('webpack.config.js', 'utf-8');
    
    // Check for common webpack configurations
    const requiredConfigs = [
      'entry', 
      'output', 
      'module', 
      'resolve',
      '.tsx?',  // TypeScript loader
      'scss',   // SCSS loader
    ];
    
    const missingConfigs = [];
    
    for (const config of requiredConfigs) {
      if (!webpackConfig.includes(config)) {
        missingConfigs.push(config);
      }
    }
    
    if (missingConfigs.length > 0) {
      console.warn(`${YELLOW}Missing webpack configurations: ${missingConfigs.join(', ')}${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}✓ webpack configuration is properly set up${RESET}`);
    return true;
  } catch (err) {
    console.error(`${RED}Error reading webpack.config.js: ${err.message}${RESET}`);
    return false;
  }
}

// Check TypeScript config
function checkTypeScriptConfig() {
  console.log(`${BLUE}Checking TypeScript configuration...${RESET}`);
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
    
    // Check for required compiler options
    const requiredOptions = ['jsx', 'target', 'module', 'strict'];
    const missingOptions = [];
    
    for (const option of requiredOptions) {
      if (!tsConfig.compilerOptions || !tsConfig.compilerOptions[option]) {
        missingOptions.push(option);
      }
    }
    
    if (missingOptions.length > 0) {
      console.warn(`${YELLOW}Missing TypeScript compiler options: ${missingOptions.join(', ')}${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}✓ TypeScript configuration is properly set up${RESET}`);
    return true;
  } catch (err) {
    console.error(`${RED}Error reading tsconfig.json: ${err.message}${RESET}`);
    return false;
  }
}

// Check TensorFlow.js model files
function checkTensorFlowModel() {
  console.log(`${BLUE}Checking TensorFlow.js model files...${RESET}`);
  
  try {
    const modelDir = 'public/models/segmentation-model';
    const modelJson = path.join(modelDir, 'model.json');
    
    if (!checkFileExists(modelJson)) {
      console.warn(`${YELLOW}Missing TensorFlow.js model file: ${modelJson}${RESET}`);
      console.info(`${BLUE}See instructions in ${modelDir}/README.md${RESET}`);
      return false;
    }
    
    try {
      const modelConfig = JSON.parse(fs.readFileSync(modelJson, 'utf-8'));
      
      // Check if the model.json has the required fields
      if (!modelConfig.weightsManifest) {
        console.warn(`${YELLOW}Invalid model.json: missing weightsManifest${RESET}`);
        console.info(`${BLUE}See instructions in ${modelDir}/README.md${RESET}`);
        return false;
      }
      
      // Check if weights file exists
      const weightsFiles = modelConfig.weightsManifest[0]?.paths || [];
      if (weightsFiles.length === 0) {
        console.warn(`${YELLOW}No weights files specified in model.json${RESET}`);
        console.info(`${BLUE}See instructions in ${modelDir}/README.md${RESET}`);
        return false;
      }
      
    } catch (err) {
      console.warn(`${YELLOW}Invalid model.json: ${err.message}${RESET}`);
      console.info(`${BLUE}See instructions in ${modelDir}/README.md${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}✓ TensorFlow.js model files are present${RESET}`);
    return true;
  } catch (err) {
    console.error(`${RED}Error checking TensorFlow.js model files: ${err.message}${RESET}`);
    return false;
  }
}

// Main verification function
function verify() {
  console.log(`${BLUE}Verifying The Stylist frontend setup...${RESET}`);
  
  const checks = [
    checkRequiredFiles,
    checkPackageJson,
    checkWebpackConfig,
    checkTypeScriptConfig,
    checkTensorFlowModel,
  ];
  
  let success = true;
  
  for (const check of checks) {
    if (!check()) {
      success = false;
    }
    console.log(''); // Add a line break between checks
  }
  
  if (success) {
    console.log(`${GREEN}========================================${RESET}`);
    console.log(`${GREEN}       PROJECT IS READY FOR TESTING     ${RESET}`);
    console.log(`${GREEN}========================================${RESET}`);
    return 0;
  } else {
    console.warn(`${YELLOW}========================================${RESET}`);
    console.warn(`${YELLOW}    PROJECT SETUP NEEDS ATTENTION    ${RESET}`);
    console.warn(`${YELLOW}========================================${RESET}`);
    console.info(`${BLUE}Please address the warnings above and run this script again.${RESET}`);
    return 1;
  }
}

// Run the verification
process.exit(verify());