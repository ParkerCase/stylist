/**
 * Post-build asset optimization script
 * This runs after webpack build to perform additional optimizations on assets
 * and set up client-side caching headers for production deployment
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

// Constants
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const CACHE_CONTROL_SETTINGS = {
  // Long-term (1 year) for versioned assets (with content hash)
  longTerm: 'public,max-age=31536000,immutable',
  // Medium-term (1 week) for less critical assets
  mediumTerm: 'public,max-age=604800',
  // Short-term (1 day) for HTML and other dynamic content
  shortTerm: 'public,max-age=86400'
};

/**
 * Generate a _headers file for Netlify/Vercel to set cache headers
 */
function generateHeadersFile() {
  console.log(chalk.blue('Generating _headers file for CDN caching...'));
  
  const headerContent = [
    '# Cache headers for assets',
    '# Generated automatically by optimize-assets.js',
    '',
    '# Long-term caching for hashed assets',
    '/assets/*',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.longTerm}`,
    '',
    '/fonts/*',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.longTerm}`,
    '',
    '/stylist-*.js',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.longTerm}`,
    '',
    '/stylist-*.css',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.longTerm}`,
    '',
    '# Medium-term caching for static assets that might change',
    '/images/*',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.mediumTerm}`,
    '',
    '# Short-term caching for HTML files and other dynamic content',
    '/*.html',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.shortTerm}`,
    '',
    '/embed.js',
    `  Cache-Control: ${CACHE_CONTROL_SETTINGS.shortTerm}`,
    '',
    '# Security headers',
    '/*',
    '  X-Frame-Options: DENY',
    '  X-XSS-Protection: 1; mode=block',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    ''
  ].join('\n');
  
  fs.writeFileSync(path.join(PUBLIC_DIR, '_headers'), headerContent);
  console.log(chalk.green('Generated _headers file for CDN caching'));
}

/**
 * Clean up unnecessary files from the build
 */
function cleanupBuild() {
  console.log(chalk.blue('Cleaning up build artifacts...'));
  
  // Count original size of build directory
  const initialSize = getFolderSize(PUBLIC_DIR);
  
  // List of patterns to delete
  const filesToDelete = [
    // Delete source maps in production if needed
    // '**/*.map',
    
    // Delete any temporary files
    '**/.DS_Store',
    '**/Thumbs.db'
  ];
  
  // Remove files from PUBLIC_DIR with pattern matching
  filesToDelete.forEach(pattern => {
    try {
      // Using a safer approach than `rm -rf`
      const files = getFilesRecursively(PUBLIC_DIR).filter(file => 
        new RegExp(pattern.replace(/\*/g, '.*')).test(file)
      );
      
      files.forEach(file => {
        fs.unlinkSync(file);
        console.log(chalk.gray(`Deleted: ${path.relative(PUBLIC_DIR, file)}`));
      });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not delete files matching ${pattern}: ${error.message}`));
    }
  });
  
  // Add more cleanup logic here
  
  const finalSize = getFolderSize(PUBLIC_DIR);
  const savedSize = initialSize - finalSize;
  
  console.log(chalk.green(`Build cleanup completed. Saved ${(savedSize / 1024 / 1024).toFixed(2)} MB`));
}

/**
 * Generate a report of the build assets and sizes
 */
function generateBuildReport() {
  console.log(chalk.blue('Generating build report...'));
  
  // Get all files in the build directory recursively
  const files = getFilesRecursively(PUBLIC_DIR);
  
  // Group by file type
  const fileTypes = {};
  let totalSize = 0;
  
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase() || 'no-extension';
    const size = fs.statSync(file).size;
    totalSize += size;
    
    if (!fileTypes[ext]) {
      fileTypes[ext] = {
        count: 0,
        size: 0,
        files: []
      };
    }
    
    fileTypes[ext].count++;
    fileTypes[ext].size += size;
    fileTypes[ext].files.push({
      path: path.relative(PUBLIC_DIR, file),
      size
    });
  });
  
  // Sort file types by size (descending)
  const sortedTypes = Object.keys(fileTypes).sort((a, b) => {
    return fileTypes[b].size - fileTypes[a].size;
  });
  
  // Create report
  let report = `
Build Report - ${new Date().toISOString()}
=======================================

Total build size: ${(totalSize / 1024 / 1024).toFixed(2)} MB
Total files: ${files.length}

File types by size:
`;

  sortedTypes.forEach(ext => {
    const type = fileTypes[ext];
    report += `\n${ext}: ${type.count} files, ${(type.size / 1024 / 1024).toFixed(2)} MB (${(type.size / totalSize * 100).toFixed(1)}%)`;
    
    // List the 5 largest files of this type
    const sortedFiles = type.files.sort((a, b) => b.size - a.size).slice(0, 5);
    sortedFiles.forEach(file => {
      report += `\n  - ${file.path}: ${(file.size / 1024).toFixed(1)} KB`;
    });
  });
  
  // Write report to file
  fs.writeFileSync(path.join(PUBLIC_DIR, 'build-report.txt'), report);
  console.log(chalk.green('Build report generated'));
}

/**
 * Print a summary of the optimized build
 */
function printBuildSummary() {
  console.log(chalk.blue('\nBuild Optimization Summary'));
  console.log(chalk.blue('========================='));
  
  // Get total size
  const totalSize = getFolderSize(PUBLIC_DIR);
  console.log(`Total build size: ${chalk.green((totalSize / 1024 / 1024).toFixed(2) + ' MB')}`);
  
  // JavaScript size
  const jsSize = getFolderSizeByExt(PUBLIC_DIR, '.js');
  console.log(`JavaScript size: ${chalk.yellow((jsSize / 1024 / 1024).toFixed(2) + ' MB')} (${(jsSize / totalSize * 100).toFixed(1)}%)`);
  
  // CSS size
  const cssSize = getFolderSizeByExt(PUBLIC_DIR, '.css');
  console.log(`CSS size: ${chalk.yellow((cssSize / 1024 / 1024).toFixed(2) + ' MB')} (${(cssSize / totalSize * 100).toFixed(1)}%)`);
  
  // Images size
  const imageSize = getFolderSizeByExt(PUBLIC_DIR, ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']);
  console.log(`Image size: ${chalk.yellow((imageSize / 1024 / 1024).toFixed(2) + ' MB')} (${(imageSize / totalSize * 100).toFixed(1)}%)`);
  
  // Fonts size
  const fontSize = getFolderSizeByExt(PUBLIC_DIR, ['.woff', '.woff2', '.eot', '.ttf', '.otf']);
  console.log(`Font size: ${chalk.yellow((fontSize / 1024 / 1024).toFixed(2) + ' MB')} (${(fontSize / totalSize * 100).toFixed(1)}%)`);
  
  // Gzipped size (if available)
  const gzipSize = getFolderSizeByExt(PUBLIC_DIR, '.gz');
  if (gzipSize > 0) {
    console.log(`Gzipped assets: ${chalk.yellow((gzipSize / 1024 / 1024).toFixed(2) + ' MB')}`);
  }
  
  // Brotli size (if available)
  const brSize = getFolderSizeByExt(PUBLIC_DIR, '.br');
  if (brSize > 0) {
    console.log(`Brotli assets: ${chalk.yellow((brSize / 1024 / 1024).toFixed(2) + ' MB')}`);
  }
  
  console.log(chalk.blue('\nOptimization completed successfully!'));
}

/**
 * Helper: Get total size of a folder recursively
 */
function getFolderSize(folderPath) {
  let totalSize = 0;
  
  if (fs.existsSync(folderPath)) {
    const files = getFilesRecursively(folderPath);
    files.forEach(file => {
      totalSize += fs.statSync(file).size;
    });
  }
  
  return totalSize;
}

/**
 * Helper: Get size of all files with specific extensions
 */
function getFolderSizeByExt(folderPath, extensions) {
  let totalSize = 0;
  
  if (fs.existsSync(folderPath)) {
    const files = getFilesRecursively(folderPath);
    
    if (!Array.isArray(extensions)) {
      extensions = [extensions];
    }
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        totalSize += fs.statSync(file).size;
      }
    });
  }
  
  return totalSize;
}

/**
 * Helper: Get all files in a directory recursively
 */
function getFilesRecursively(dir) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Recurse into subdirectory
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  });
  
  return results;
}

/**
 * Main function
 */
function main() {
  console.log(chalk.blue('Starting post-build optimization...'));
  
  try {
    // Step 1: Cleanup build artifacts
    cleanupBuild();
    
    // Step 2: Generate CDN headers file
    generateHeadersFile();
    
    // Step 3: Generate build report
    generateBuildReport();
    
    // Step 4: Print summary
    printBuildSummary();
    
  } catch (error) {
    console.error(chalk.red('Error during post-build optimization:'), error);
    process.exit(1);
  }
}

// Run the main function
main();