/**
 * Environment variables centralized access
 * This file provides type-safe access to all environment variables used in the frontend
 */

// Backend API sync service constants
export const MAX_RETRY_ATTEMPTS = 3;
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// API Setup
export const API_URL = 'http://localhost:8000/api/v1';
export const API_TIMEOUT = 15000;

/**
 * Claude AI Configuration
 */
export const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY || '';
export const CLAUDE_API_URL = process.env.REACT_APP_ANTHROPIC_API_URL || 'https://api.anthropic.com';
export const CLAUDE_MODEL = process.env.REACT_APP_ANTHROPIC_MODEL || 'claude-3-haiku-20240307';

// Demo mode can be forced even with API keys
export const FORCE_DEMO_MODE = process.env.REACT_APP_FORCE_DEMO_MODE === 'true';
// Allow Claude demo responses without a real API key
export const USE_CLAUDE_DEMO = process.env.REACT_APP_USE_CLAUDE_DEMO === 'true';

/**
 * Background Removal API Configuration
 */
export const REMOVE_BG_API_KEY = process.env.REACT_APP_REMOVE_BG_API_KEY || '';

/**
 * Shopify Integration Configuration
 */
export const SHOPIFY_API_KEY = process.env.REACT_APP_SHOPIFY_API_KEY || '';
export const SHOPIFY_API_SECRET = process.env.REACT_APP_SHOPIFY_API_SECRET || '';
export const SHOPIFY_STORE_URL = process.env.REACT_APP_SHOPIFY_STORE_URL || '';

/**
 * WooCommerce Integration Configuration
 */
export const WOOCOMMERCE_CONSUMER_KEY = process.env.REACT_APP_WOOCOMMERCE_CONSUMER_KEY || '';
export const WOOCOMMERCE_CONSUMER_SECRET = process.env.REACT_APP_WOOCOMMERCE_CONSUMER_SECRET || '';
export const WOOCOMMERCE_STORE_URL = process.env.REACT_APP_WOOCOMMERCE_STORE_URL || '';

/**
 * App Configuration
 */
export const STYLIST_DEBUG = process.env.REACT_APP_STYLIST_DEBUG === 'true';
export const STYLIST_API_KEY = process.env.REACT_APP_STYLIST_API_KEY || 'development_key';
export const USE_MOCK_RETAILER = process.env.REACT_APP_USE_MOCK_RETAILER !== 'false' || true;

/**
 * Type-safe environment variable accessor
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
export function getEnv<T>(key: string, defaultValue: T): T {
  const value = process.env[`REACT_APP_${key}`];
  if (value === undefined) {
    return defaultValue;
  }
  
  // Handle type conversion based on default value type
  if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as unknown as T;
  }
  
  if (typeof defaultValue === 'number') {
    return Number(value) as unknown as T;
  }
  
  return value as unknown as T;
}

/**
 * Check if a feature flag is enabled
 * @param featureName - Name of the feature flag
 * @returns true if the feature is enabled
 */
export function isFeatureEnabled(featureName: string): boolean {
  return getEnv(`FEATURE_${featureName.toUpperCase()}`, false);
}