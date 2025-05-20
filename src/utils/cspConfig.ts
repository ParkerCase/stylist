/**
 * Content Security Policy configuration
 * 
 * This module provides configuration for Content Security Policy (CSP)
 * across different environments to protect against XSS, injection, and
 * other security threats.
 */

import { IS_PRODUCTION } from './environment';

// Define CSP directives for different environments
const CSP_DIRECTIVES = {
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // More permissive for development
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://*', 'wss://*'], // Allow all connections in dev
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'report-uri': ['/api/csp-report'],
    'report-to': ['default'],
  },
  
  staging: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts for analytics
    'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles
    'img-src': ["'self'", 'data:', 'https://stylist-widget.com', 'https://*.stylist-widget.com', 'https://picsum.photos', 'blob:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'", 
      'https://api.stylist-widget.com', 
      'https://*.stylist-widget.com',
      'https://api.anthropic.com', // Claude API
    ],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'report-uri': ['https://api.stylist-widget.com/api/csp-report'],
    'report-to': ['default'],
  },
  
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'"], // No unsafe inline or eval
    'style-src': ["'self'", "'unsafe-inline'"], // Inline styles needed for widget
    'img-src': ["'self'", 'data:', 'https://stylist-widget.com', 'https://*.stylist-widget.com', 'https://picsum.photos', 'blob:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'", 
      'https://api.stylist-widget.com', 
      'https://*.stylist-widget.com',
      'https://api.anthropic.com', // Claude API
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'report-uri': ['https://api.stylist-widget.com/api/csp-report'],
    'report-to': ['default'],
    'upgrade-insecure-requests': [], // Force HTTPS
  }
};

// Get current environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  if (!IS_PRODUCTION) return 'development';
  
  const stagingHosts = ['staging.stylist-widget.com', 'staging-api.stylist-widget.com'];
  
  // Check if in staging environment
  if (typeof window !== 'undefined' && 
      stagingHosts.some(host => window.location.hostname.includes(host))) {
    return 'staging';
  }
  
  return 'production';
};

/**
 * Generate CSP header value for the current environment
 */
export function generateCSP(): string {
  const environment = getEnvironment();
  const directives = CSP_DIRECTIVES[environment];
  
  return Object.entries(directives)
    .map(([key, values]) => {
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Generate CSP meta tag content
 */
export function generateCSPMeta(): string {
  const environment = getEnvironment();
  const directives = { ...CSP_DIRECTIVES[environment] };
  
  // Remove report directives for meta tag
  delete directives['report-uri'];
  delete directives['report-to'];
  
  return Object.entries(directives)
    .map(([key, values]) => {
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Add CSP meta tag to document
 */
export function applyCSP(): void {
  if (typeof document === 'undefined') return;
  
  // Check if CSP meta tag already exists
  let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  
  if (!cspMeta) {
    // Create new meta tag if it doesn't exist
    cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(cspMeta);
  }
  
  // Set CSP content
  cspMeta.setAttribute('content', generateCSPMeta());
}

/**
 * Get permitted origins for CORS
 */
export function getAllowedOrigins(): string[] {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'development':
      return ['*']; // Allow all in development
      
    case 'staging':
      return [
        'https://staging.stylist-widget.com',
        'https://staging-api.stylist-widget.com',
        'https://*.staging.stylist-widget.com'
      ];
      
    case 'production':
      return [
        'https://stylist-widget.com',
        'https://api.stylist-widget.com',
        'https://*.stylist-widget.com'
      ];
  }
}

/**
 * Set up CSP reporting
 */
export function setupCSPReporting(): void {
  if (typeof window === 'undefined') return;
  
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (e) => {
    // Log CSP violations in development
    if (!IS_PRODUCTION) {
      console.warn('CSP Violation:', {
        'violatedDirective': e.violatedDirective,
        'effectiveDirective': e.effectiveDirective,
        'blockedURI': e.blockedURI,
        'sourceFile': e.sourceFile,
        'lineNumber': e.lineNumber,
        'columnNumber': e.columnNumber,
      });
    }
    
    // Report to analytics in production
    if (IS_PRODUCTION) {
      // Send to analytics service
      try {
        fetch('/api/csp-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'violatedDirective': e.violatedDirective,
            'effectiveDirective': e.effectiveDirective,
            'blockedURI': e.blockedURI,
            'sourceFile': e.sourceFile,
            'lineNumber': e.lineNumber,
            'columnNumber': e.columnNumber,
            'userAgent': navigator.userAgent,
            'timestamp': new Date().toISOString(),
          }),
        }).catch(() => {
          // Silently fail if reporting fails
        });
      } catch (error) {
        // Ignore reporting errors
      }
    }
  });
}

/**
 * Initialize CSP for the application
 */
export function initializeCSP(): void {
  // Apply CSP meta tag
  applyCSP();
  
  // Set up CSP reporting
  setupCSPReporting();
}