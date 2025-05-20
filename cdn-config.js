/**
 * CDN Integration Configuration
 * 
 * This configuration file provides CDN settings for different deployment environments.
 * It's used by the build process to generate proper asset URLs and cache headers.
 */

const path = require('path');
const fs = require('fs');

// Deployment environments
const DEPLOYMENT_ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Get the current deployment environment
const getCurrentEnvironment = () => {
  const env = process.env.DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
  return env === 'production' ? DEPLOYMENT_ENVIRONMENTS.PRODUCTION :
         env === 'staging' ? DEPLOYMENT_ENVIRONMENTS.STAGING :
         DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT;
};

// CDN provider configurations
const CDN_PROVIDERS = {
  CLOUDFRONT: {
    name: 'AWS CloudFront',
    // Base URL for CloudFront distribution
    getBaseUrl: (env) => {
      switch (env) {
        case DEPLOYMENT_ENVIRONMENTS.PRODUCTION:
          return process.env.CLOUDFRONT_URL || 'https://d123456abcdef.cloudfront.net';
        case DEPLOYMENT_ENVIRONMENTS.STAGING:
          return process.env.CLOUDFRONT_STAGING_URL || 'https://d654321fedcba.cloudfront.net';
        default:
          return '';
      }
    },
    // Max age settings for different asset types
    cacheSettings: {
      js: 31536000, // 1 year
      css: 31536000, // 1 year
      images: 2592000, // 30 days
      fonts: 31536000, // 1 year
      html: 600, // 10 minutes
      other: 86400 // 1 day
    }
  },
  
  CLOUDFLARE: {
    name: 'Cloudflare',
    // Base URL for Cloudflare distribution
    getBaseUrl: (env) => {
      switch (env) {
        case DEPLOYMENT_ENVIRONMENTS.PRODUCTION:
          return process.env.CLOUDFLARE_URL || 'https://stylist-cdn.example.com';
        case DEPLOYMENT_ENVIRONMENTS.STAGING:
          return process.env.CLOUDFLARE_STAGING_URL || 'https://stylist-staging-cdn.example.com';
        default:
          return '';
      }
    },
    // Cache settings
    cacheSettings: {
      js: 31536000, // 1 year
      css: 31536000, // 1 year
      images: 2592000, // 30 days
      fonts: 31536000, // 1 year
      html: 600, // 10 minutes
      other: 86400 // 1 day
    }
  },
  
  NONE: {
    name: 'No CDN',
    getBaseUrl: () => '',
    cacheSettings: {
      js: 0,
      css: 0,
      images: 0,
      fonts: 0,
      html: 0,
      other: 0
    }
  }
};

// Get the current CDN provider based on environment variable
const getCurrentCdnProvider = () => {
  const provider = process.env.CDN_PROVIDER ? process.env.CDN_PROVIDER.toUpperCase() : null;
  
  return provider && CDN_PROVIDERS[provider] ? 
    CDN_PROVIDERS[provider] : 
    (getCurrentEnvironment() === DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT ? 
      CDN_PROVIDERS.NONE : 
      CDN_PROVIDERS.CLOUDFRONT);
};

/**
 * Get the CDN configuration for the current environment
 */
const getCdnConfig = () => {
  const environment = getCurrentEnvironment();
  const provider = getCurrentCdnProvider();
  const baseUrl = provider.getBaseUrl(environment);
  
  return {
    enabled: environment !== DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT && Boolean(baseUrl),
    provider: provider.name,
    environment,
    baseUrl,
    cacheSettings: provider.cacheSettings
  };
};

/**
 * Generate CDN URLs for assets
 * @param {string} assetPath - Path to the asset relative to the output directory
 * @returns {string} Full CDN URL for the asset
 */
const getCdnUrl = (assetPath) => {
  const { enabled, baseUrl } = getCdnConfig();
  if (!enabled || !baseUrl) return assetPath;
  
  // Ensure path starts with a slash
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  
  // Combine base URL and asset path
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Generate CDN configuration for webpack
 * @returns {Object} Configuration object for webpack
 */
const getWebpackCdnConfig = () => {
  const cdnConfig = getCdnConfig();
  
  return {
    enabled: cdnConfig.enabled,
    publicPath: cdnConfig.enabled ? cdnConfig.baseUrl + '/' : '/',
    crossOrigin: cdnConfig.enabled ? 'anonymous' : undefined
  };
};

/**
 * Generate cache control headers for assets
 * @param {string} assetPath - Path to the asset
 * @returns {string} Cache-Control header value
 */
const getCacheControlHeader = (assetPath) => {
  const { cacheSettings } = getCdnConfig();
  const ext = path.extname(assetPath).toLowerCase();
  
  if (['.js', '.mjs'].includes(ext)) {
    return `public, max-age=${cacheSettings.js}, immutable`;
  } else if (['.css'].includes(ext)) {
    return `public, max-age=${cacheSettings.css}, immutable`;
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return `public, max-age=${cacheSettings.images}`;
  } else if (['.woff', '.woff2', '.eot', '.ttf', '.otf'].includes(ext)) {
    return `public, max-age=${cacheSettings.fonts}, immutable`;
  } else if (['.html', '.htm'].includes(ext)) {
    return `public, max-age=${cacheSettings.html}, must-revalidate`;
  } else {
    return `public, max-age=${cacheSettings.other}`;
  }
};

/**
 * Generate a _headers file for CDN/hosting services like Netlify/Vercel
 * @param {string} outputDir - Directory to write the headers file
 */
const generateHeadersFile = (outputDir) => {
  const { enabled, environment } = getCdnConfig();
  
  // Only generate headers file in non-development environments
  if (environment === DEPLOYMENT_ENVIRONMENTS.DEVELOPMENT) {
    return;
  }
  
  const headers = [
    '# Cache headers for assets',
    '# Generated automatically by cdn-config.js',
    '',
    '# Content with hashes - long-term caching',
    '/assets/*.*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/stylist-*.js',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/stylist-*.css',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '# Fonts - long-term caching',
    '/fonts/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '# Images - medium-term caching',
    '/images/*',
    '  Cache-Control: public, max-age=2592000',
    '',
    '# HTML and other dynamic content - short-term caching',
    '/*.html',
    '  Cache-Control: public, max-age=600, must-revalidate',
    '',
    '# Embed script (entry point) - short term caching',
    '/embed.js',
    '  Cache-Control: public, max-age=600, must-revalidate',
    '',
    '# Security headers',
    '/*',
    '  X-Frame-Options: SAMEORIGIN',
    '  X-XSS-Protection: 1; mode=block',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    enabled ? '  Access-Control-Allow-Origin: *' : '',
    ''
  ].filter(Boolean).join('\n');
  
  fs.writeFileSync(path.join(outputDir, '_headers'), headers);
  console.log(`Generated _headers file in ${outputDir}`);
};

module.exports = {
  DEPLOYMENT_ENVIRONMENTS,
  CDN_PROVIDERS,
  getCdnConfig,
  getCdnUrl,
  getWebpackCdnConfig,
  getCacheControlHeader,
  generateHeadersFile
};