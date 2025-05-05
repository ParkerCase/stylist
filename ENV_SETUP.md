# Environment Variables in The Stylist Application

This document explains how environment variables are used in the application and how to configure them.

## Overview

The Stylist application uses environment variables for configuration in both the backend (Python/FastAPI) and frontend (React/TypeScript) components. This allows for different configurations in development, testing, and production environments without changing code.

## Backend Environment Variables

Backend environment variables are loaded using `python-dotenv` from a `.env` file at the application root. All variables are centrally defined in `config.py` which should be imported by other modules that need configuration values.

### Required Backend Environment Variables

- `PORT` - Port for the backend server (default: 8000)
- `STYLIST_DEBUG` - Enable debug mode (default: false)
- `STYLIST_API_KEY` - API key for accessing the backend (default: development_key)
- `USE_MOCK_RETAILER` - Use mock data instead of real retailer connections (default: true)
- `JWT_SECRET` - Secret key for JWT token generation and validation

### Optional Backend Environment Variables

- **Retailer Settings**:
  - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_STORE_URL` - For Shopify integration
  - `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, `WOOCOMMERCE_STORE_URL` - For WooCommerce

- **Cache Configuration**:
  - `REDIS_URL` - URL for Redis cache (default: redis://localhost:6379)
  - `CACHE_TTL` - Cache time-to-live in seconds (default: 3600)
  - `RECOMMENDATION_CACHE_TTL` - Recommendation cache TTL (default: 1800)

- **Authentication**:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - For Google OAuth
  - `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - For Facebook OAuth

- **Services**:
  - `REMOVE_BG_API_KEY` - API key for Remove.bg background removal service
  - `ANTHROPIC_API_KEY` - API key for Anthropic Claude AI service

## Frontend Environment Variables

Frontend environment variables must be prefixed with `REACT_APP_` to be accessible. They are injected at build time by webpack and cannot be changed at runtime.

Frontend environment variables are centralized in `src/utils/environment.ts` which should be imported by components that need configuration values.

### Required Frontend Environment Variables

- `REACT_APP_API_URL` - URL for backend API (default: http://localhost:8000/api)
- `REACT_APP_DEFAULT_API_KEY` - Default API key (default: development_key)
- `REACT_APP_DEFAULT_RETAILER_ID` - Default retailer ID (default: demo_retailer)

### Optional Frontend Environment Variables

- **Feature Flags**:
  - `REACT_APP_ENABLE_DEBUG_MODE` - Enable debug mode (default: false)
  - `REACT_APP_ENABLE_ANALYTICS` - Enable analytics tracking (default: true)

- **API Settings**:
  - `REACT_APP_API_TIMEOUT` - API request timeout in ms (default: 15000)
  - `REACT_APP_MAX_RETRY_ATTEMPTS` - Maximum retry attempts for failed requests (default: 3)

- **Services**:
  - `REACT_APP_BACKGROUND_REMOVAL_API_URL` - URL for background removal API
  - `REACT_APP_BACKGROUND_REMOVAL_API_KEY` - API key for background removal
  - `REACT_APP_ANTHROPIC_API_URL` - URL for Anthropic Claude API
  - `REACT_APP_ANTHROPIC_API_KEY` - API key for Anthropic Claude
  - `REACT_APP_ANTHROPIC_MODEL` - Model name for Anthropic Claude

## Setup Instructions

1. Copy `.env.example` to `.env` in the project root:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific configuration values.

3. For local development, the default values should work without changes.

4. For production deployment, ensure all security-sensitive variables are properly set with secure values.

## Environment-Specific Configuration

Different environments (development, staging, production) should have their own `.env` files. During deployment:

1. Create environment-specific settings:
   - `.env.development` - Development settings
   - `.env.staging` - Staging settings  
   - `.env.production` - Production settings

2. Copy the appropriate file to `.env` during deployment:
   ```
   cp .env.production .env  # For production deployment
   ```

## Testing Environment Variables

For testing, you can create a `.env.test` file with test-specific configuration. This ensures tests run with consistent configuration regardless of your local development settings.

## Troubleshooting

If the application isn't picking up environment variables:

1. Check that the `.env` file exists in the project root
2. For frontend variables, ensure they are prefixed with `REACT_APP_`
3. After changing environment variables, restart the backend server
4. After changing frontend environment variables, rebuild the frontend application