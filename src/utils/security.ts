/**
 * Security utilities for the Stylist application
 * 
 * This module provides security-related utilities including:
 * - Secure storage of sensitive information
 * - Data encryption/decryption
 * - Security headers
 * - CSRF protection
 * - Input sanitization
 */

import { IS_PRODUCTION } from './environment';

// Constants for security features
const STORAGE_PREFIX = 'stylist_';
const TOKEN_KEY = `${STORAGE_PREFIX}auth_token`;
const TOKEN_EXPIRY_KEY = `${STORAGE_PREFIX}auth_expiry`;
const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}refresh_token`;
const SECURE_STORAGE_VERSION = '1';

// Security helpers
interface StorageOptions {
  expires?: number; // Expiration time in seconds
  secure?: boolean; // Only allow in HTTPS
}

/**
 * Securely store a value in localStorage with encryption in production
 */
export function secureStore(key: string, value: string, options: StorageOptions = {}): void {
  if (!key || value === undefined) return;
  
  try {
    // Add prefix to avoid conflicts
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    
    // Calculate expiration if provided
    const expires = options.expires ? Date.now() + (options.expires * 1000) : undefined;
    
    // Don't store if secure is required but we're not in HTTPS
    if (options.secure && typeof window !== 'undefined' && window.location.protocol !== 'https:') {
      console.warn(`Secure storage requested for ${key} but connection is not HTTPS`);
      return;
    }
    
    // Prepare storage object
    const storageObj = {
      v: SECURE_STORAGE_VERSION,
      d: IS_PRODUCTION ? encryptData(value) : value,
      e: expires,
      c: Date.now(), // Created timestamp
    };
    
    // Store in localStorage
    localStorage.setItem(prefixedKey, JSON.stringify(storageObj));
  } catch (error) {
    console.error('Error storing secure data', error);
    // Fallback to direct storage on error
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}_fallback`, value);
    } catch (fbError) {
      console.error('Failed to store data even with fallback', fbError);
    }
  }
}

/**
 * Retrieve a securely stored value from localStorage
 */
export function secureRetrieve(key: string): string | null {
  if (!key) return null;
  
  try {
    // Add prefix to avoid conflicts
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    
    // Get from localStorage
    const storedValue = localStorage.getItem(prefixedKey);
    if (!storedValue) {
      // Check fallback
      const fallbackValue = localStorage.getItem(`${STORAGE_PREFIX}${key}_fallback`);
      return fallbackValue;
    }
    
    // Parse storage object
    const storageObj = JSON.parse(storedValue);
    
    // Check if expired
    if (storageObj.e && Date.now() > storageObj.e) {
      // Remove expired item
      localStorage.removeItem(prefixedKey);
      return null;
    }
    
    // Decrypt if in production
    const value = IS_PRODUCTION && storageObj.v === SECURE_STORAGE_VERSION
      ? decryptData(storageObj.d)
      : storageObj.d;
      
    return value;
  } catch (error) {
    console.error('Error retrieving secure data', error);
    // Try fallback
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${key}_fallback`);
    } catch (fbError) {
      console.error('Failed to retrieve data even with fallback', fbError);
      return null;
    }
  }
}

/**
 * Remove a securely stored value from localStorage
 */
export function secureRemove(key: string): void {
  if (!key) return;
  
  try {
    // Remove both regular and fallback keys
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`${STORAGE_PREFIX}${key}_fallback`);
  } catch (error) {
    console.error('Error removing secure data', error);
  }
}

/**
 * Clear all securely stored values with the Stylist prefix
 */
export function secureClear(): void {
  try {
    // Get all keys from localStorage
    const keys = Object.keys(localStorage);
    
    // Remove keys with Stylist prefix
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing secure data', error);
  }
}

/**
 * Simple encryption for client-side storage
 * Note: This is not strong encryption and is only meant to obscure sensitive data
 * from casual inspection. For truly sensitive data, always use server-side storage.
 */
function encryptData(data: string): string {
  // In a real app, this should use Web Crypto API for stronger encryption
  // This is a simple XOR-based obfuscation for demo purposes
  const key = 'STYLIST_SECURITY_KEY';
  let result = '';
  
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  
  // Base64 encode to make it storable
  return btoa(result);
}

/**
 * Simple decryption for client-side storage
 */
function decryptData(encryptedData: string): string {
  try {
    // Base64 decode
    const decoded = atob(encryptedData);
    const key = 'STYLIST_SECURITY_KEY';
    let result = '';
    
    // XOR with the same key
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (error) {
    console.error('Error decrypting data', error);
    return '';
  }
}

/**
 * Store authentication token securely
 */
export function storeAuthToken(token: string, expiresIn: number): void {
  secureStore(TOKEN_KEY, token, { secure: true, expires: expiresIn });
  secureStore(TOKEN_EXPIRY_KEY, (Date.now() + expiresIn * 1000).toString(), { secure: true });
}

/**
 * Store refresh token securely
 */
export function storeRefreshToken(token: string): void {
  secureStore(REFRESH_TOKEN_KEY, token, { secure: true });
}

/**
 * Get authentication token if valid
 */
export function getAuthToken(): string | null {
  const token = secureRetrieve(TOKEN_KEY);
  const expiryStr = secureRetrieve(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiryStr) return null;
  
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() >= expiry) {
    // Token has expired
    secureRemove(TOKEN_KEY);
    secureRemove(TOKEN_EXPIRY_KEY);
    return null;
  }
  
  return token;
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  return secureRetrieve(REFRESH_TOKEN_KEY);
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens(): void {
  secureRemove(TOKEN_KEY);
  secureRemove(TOKEN_EXPIRY_KEY);
  secureRemove(REFRESH_TOKEN_KEY);
}

/**
 * Check if the auth token is about to expire
 */
export function isAuthTokenExpiringSoon(thresholdSeconds: number = 300): boolean {
  const expiryStr = secureRetrieve(TOKEN_EXPIRY_KEY);
  if (!expiryStr) return true;
  
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry)) return true;
  
  // Check if token will expire within the threshold
  return Date.now() + (thresholdSeconds * 1000) >= expiry;
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Replace HTML special characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate security headers for production
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': IS_PRODUCTION 
      ? "default-src 'self'; script-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.stylist-widget.com;"
      : '',
  };
}

/**
 * Generate a random string for CSRF tokens
 */
export function generateRandomToken(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto API if available for better randomness
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  
  return result;
}

/**
 * Generate a CSRF token and store it
 */
export function generateCSRFToken(): string {
  const token = generateRandomToken();
  secureStore('csrf_token', token, { secure: true });
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = secureRetrieve('csrf_token');
  return !!storedToken && token === storedToken;
}

/**
 * Validate URL to prevent open redirect vulnerabilities
 */
export function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    // Check if relative URL
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    
    // Check absolute URL
    const urlObj = new URL(url);
    const allowedDomains = [
      'stylist-widget.com',
      'www.stylist-widget.com'
    ];
    
    // Check if URL has allowed domain
    return allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
}

/**
 * Rate limiting helper to prevent abuse
 */
class RateLimiter {
  private limits: Map<string, { count: number, resetTime: number }> = new Map();
  
  /**
   * Check if a request is allowed based on rate limits
   * @param key Identifier for the rate limit (e.g. API endpoint, user ID)
   * @param maxRequests Maximum number of requests allowed in the time window
   * @param windowMs Time window in milliseconds
   * @returns Whether the request is allowed
   */
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const limitInfo = this.limits.get(key);
    
    if (!limitInfo || now > limitInfo.resetTime) {
      // First request or expired window
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (limitInfo.count < maxRequests) {
      // Increment count
      limitInfo.count++;
      return true;
    }
    
    return false;
  }
  
  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string, maxRequests: number): number {
    const limitInfo = this.limits.get(key);
    if (!limitInfo || Date.now() > limitInfo.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - limitInfo.count);
  }
  
  /**
   * Get time until rate limit resets in milliseconds
   */
  getTimeUntilReset(key: string): number {
    const limitInfo = this.limits.get(key);
    if (!limitInfo) return 0;
    
    const timeLeft = limitInfo.resetTime - Date.now();
    return Math.max(0, timeLeft);
  }
}

// Export singleton rate limiter instance
export const rateLimiter = new RateLimiter();