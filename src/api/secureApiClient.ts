/**
 * Enhanced API client with security enhancements for production use
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestHeaders } from 'axios';
import { IS_PRODUCTION } from '../utils/environment';
import {
  getAuthToken,
  getRefreshToken,
  isAuthTokenExpiringSoon,
  storeAuthToken,
  getSecurityHeaders,
  rateLimiter,
  sanitizeInput
} from '../utils/security';

// Define endpoint rate limits
const RATE_LIMITS: Record<string, { maxRequests: number, windowMs: number }> = {
  'default': { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
  'auth': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute for auth endpoints
  'recommendations': { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  'style-analysis': { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  'search': { maxRequests: 30, windowMs: 60000 }, // 30 per minute
};

interface SecureApiClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
  enableRateLimiting?: boolean;
  enableTokenRefresh?: boolean;
  refreshTokenEndpoint?: string;
  validateResponseIntegrity?: boolean;
  cspReportingEndpoint?: string;
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

export class SecureApiClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private enableRateLimiting: boolean;
  private enableTokenRefresh: boolean;
  private refreshTokenEndpoint: string;
  private validateResponseIntegrity: boolean;
  private cspReportingEndpoint?: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: SecureApiClientConfig) {
    this.maxRetries = config.maxRetries || 3;
    this.enableRateLimiting = config.enableRateLimiting !== false;
    this.enableTokenRefresh = config.enableTokenRefresh !== false;
    this.refreshTokenEndpoint = config.refreshTokenEndpoint || '/auth/refresh';
    this.validateResponseIntegrity = config.validateResponseIntegrity !== false;
    this.cspReportingEndpoint = config.cspReportingEndpoint;
    
    // Create basic axios config
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.baseURL,
      timeout: config.timeout || 15000,
    };
    
    // Add headers safely
    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (config.apiKey) {
      headersConfig['X-API-Key'] = config.apiKey;
    }
    
    // Add security headers in production
    if (IS_PRODUCTION) {
      Object.assign(headersConfig, getSecurityHeaders());
    }
    
    // Add custom headers
    if (config.headers) {
      Object.assign(headersConfig, config.headers);
    }
    
    // Create instance with proper types
    this.client = axios.create({
      ...axiosConfig,
      headers: headersConfig
    });

    // Add request interceptor for authentication, logging and security
    this.client.interceptors.request.use(
      async (config) => {
        // Apply rate limiting in production
        if (IS_PRODUCTION && this.enableRateLimiting) {
          const endpoint = this.getEndpointKey(config.url || '');
          const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
          
          const isAllowed = rateLimiter.isAllowed(
            endpoint, 
            limits.maxRequests, 
            limits.windowMs
          );
          
          if (!isAllowed) {
            throw new Error(`Rate limit exceeded for ${endpoint}. Please try again later.`);
          }
        }
        
        // Add auth token if available
        const token = getAuthToken();
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          } as any;
          
          // Check if token is about to expire
          const endpointKey = this.getEndpointKey(config.url || '');
          if (this.enableTokenRefresh && isAuthTokenExpiringSoon() && endpointKey !== 'auth') {
            try {
              // Refresh token before proceeding with request
              const newToken = await this.refreshToken();
              config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${newToken}`
              } as any;
            } catch (error) {
              console.warn('Failed to refresh token:', error);
              // Proceed with request using existing token
            }
          }
        }
        
        // Sanitize request data to prevent injection
        if (config.data && typeof config.data === 'object') {
          this.sanitizeRequestData(config.data);
        }
        
        // Remove API key from logs for security
        const logConfig = { ...config };
        if (logConfig.headers) {
          const headers = { ...logConfig.headers };
          if ('X-API-Key' in headers) {
            headers['X-API-Key'] = '[REDACTED]';
          }
          if ('Authorization' in headers) {
            headers['Authorization'] = '[REDACTED]';
          }
          logConfig.headers = headers as any;
        }
        
        // Log requests in development mode only
        if (!IS_PRODUCTION) {
          console.debug('API Request:', logConfig);
        }
        
        return config;
      },
      (error) => {
        // Log errors in development mode
        if (!IS_PRODUCTION) {
          console.error('API Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        // Validate response integrity if enabled
        if (this.validateResponseIntegrity) {
          // Check for unexpected content types
          const contentType = response.headers['content-type'] || '';
          const expectedContentType = 'application/json';
          
          if (response.data && !contentType.includes(expectedContentType)) {
            console.warn(`Unexpected content type: ${contentType}, expected: ${expectedContentType}`);
            // Continue processing but log the issue
          }
          
          // Add more validation as needed
        }
        
        // Log in development mode only
        if (!IS_PRODUCTION) {
          console.debug('API Response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
          });
        }
        return response;
      },
      async (error) => {
        // Check if error is due to token expiration
        if (
          error.response && 
          error.response.status === 401 &&
          this.enableTokenRefresh && 
          !error.config.url?.includes(this.refreshTokenEndpoint)
        ) {
          try {
            // Try to refresh token
            const newToken = await this.refreshToken();
            
            // Retry the original request with new token
            const originalRequest = error.config;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            return this.client(originalRequest);
          } catch (refreshError) {
            // If refresh fails, proceed with original error
            console.error('Token refresh failed:', refreshError);
          }
        }
        
        // Log errors (production logs less info)
        if (IS_PRODUCTION) {
          console.error('API Error:', {
            status: error.response?.status,
            url: error.config?.url
          });
        } else {
          console.error('API Response Error:', {
            message: error.message,
            response: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
            } : null,
          });
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>('get', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>('post', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>('put', url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>('delete', url, undefined, config);
  }

  /**
   * Refresh the authentication token
   */
  private async refreshToken(): Promise<string> {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Create new refresh promise
    this.refreshPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const refreshToken = getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Make request to refresh token
        const response = await this.client.post<RefreshTokenResponse>(
          this.refreshTokenEndpoint,
          { refresh_token: refreshToken }
        );
        
        // Store new token
        const { access_token, expires_in } = response.data;
        storeAuthToken(access_token, expires_in);
        
        resolve(access_token);
      } catch (error) {
        reject(error);
      } finally {
        // Clear promise
        this.refreshPromise = null;
      }
    });
    
    return this.refreshPromise;
  }

  /**
   * Get a standardized endpoint key for rate limiting
   */
  private getEndpointKey(url: string): string {
    // Extract endpoint from URL
    const path = url.split('?')[0]; // Remove query parameters
    
    // Check for known endpoints
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/recommendations')) return 'recommendations';
    if (path.includes('/style-analysis')) return 'style-analysis';
    if (path.includes('/search')) return 'search';
    
    return 'default';
  }

  /**
   * Sanitize request data recursively
   */
  private sanitizeRequestData(data: any): void {
    if (!data || typeof data !== 'object') return;
    
    // Recursively sanitize all string values
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        // Don't sanitize auth tokens or passwords
        if (
          !key.toLowerCase().includes('token') &&
          !key.toLowerCase().includes('password') &&
          !key.toLowerCase().includes('secret')
        ) {
          data[key] = sanitizeInput(data[key]);
        }
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        this.sanitizeRequestData(data[key]);
      }
    });
  }

  private async requestWithRetry<T>(
    method: 'get' | 'post' | 'put' | 'delete', 
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    let retries = 0;
    let lastError: Error | null = null;
    let requestConfig = { ...config };

    while (retries <= this.maxRetries) {
      try {
        let response: AxiosResponse<T>;
        switch (method) {
          case 'get':
            response = await this.client.get<T>(url, requestConfig);
            break;
          case 'post':
            response = await this.client.post<T>(url, data, requestConfig);
            break;
          case 'put':
            response = await this.client.put<T>(url, data, requestConfig);
            break;
          case 'delete':
            response = await this.client.delete<T>(url, requestConfig);
            break;
        }
        return response.data;
      } catch (err) {
        lastError = err as Error;
        // Check if error is retryable
        if (this.isRetryableError(err as AxiosError) && retries < this.maxRetries) {
          retries++;
          // Wait with exponential backoff
          const delay = Math.pow(2, retries) * 1000;
          // Only log retry attempts in development
          if (!IS_PRODUCTION) {
            console.log(`Retrying request (${retries}/${this.maxRetries}) after ${delay}ms`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    // Handle specific error cases
    this.handleError(lastError as AxiosError);
    
    // This should never be reached due to error handling, but required for TypeScript
    throw lastError;
  }

  private isRetryableError(error: AxiosError): boolean {
    // Network errors or 5xx errors are retryable
    return !error.response || (error.response && error.response.status >= 500);
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the range of 2xx
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Unauthorized: Please check your API key or log in again');
      } else if (status === 403) {
        throw new Error('Forbidden: You do not have permission to access this resource');
      } else if (status === 404) {
        throw new Error('Resource not found');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (status >= 500) {
        throw new Error('Server error, please try again later');
      } else {
        const responseData = error.response.data as Record<string, string> || {};
        throw new Error(`API Error: ${responseData.message || error.message}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your connection');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

// Create and export a function to create an API client with default configuration
export const createSecureApiClient = (config: SecureApiClientConfig): SecureApiClient => {
  return new SecureApiClient(config);
};