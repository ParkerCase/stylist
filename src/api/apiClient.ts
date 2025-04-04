// Enhanced API client with better error handling and retry logic
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestHeaders } from 'axios';

interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: ApiClientConfig) {
    this.maxRetries = config.maxRetries || 3;
    
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
    
    // Add custom headers
    if (config.headers) {
      Object.assign(headersConfig, config.headers);
    }
    
    // Create instance with proper types
    this.client = axios.create({
      ...axiosConfig,
      headers: headersConfig
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        // Remove API key from logs for security
        const logConfig = { ...config };
        if (logConfig.headers && 'X-API-Key' in logConfig.headers) {
          // First cast to unknown, then to AxiosRequestHeaders to ensure type safety
          logConfig.headers = { ...logConfig.headers, 'X-API-Key': '[REDACTED]' } as unknown as AxiosRequestHeaders;
        }
        // Only log in non-production environments
        if (process.env.NODE_ENV !== 'production') {
          console.debug('API Request:', logConfig);
        }
        return config;
      },
      (error) => {
        // Only log in non-production environments
        if (process.env.NODE_ENV !== 'production') {
          console.error('API Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        // Only log in non-production environments
        if (process.env.NODE_ENV !== 'production') {
          console.debug('API Response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
        // Only log in non-production environments
        if (process.env.NODE_ENV !== 'production') {
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

  private async requestWithRetry<T>(
    method: 'get' | 'post' | 'put' | 'delete', 
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= this.maxRetries) {
      try {
        let response: AxiosResponse<T>;
        switch (method) {
          case 'get':
            response = await this.client.get<T>(url, config);
            break;
          case 'post':
            response = await this.client.post<T>(url, data, config);
            break;
          case 'put':
            response = await this.client.put<T>(url, data, config);
            break;
          case 'delete':
            response = await this.client.delete<T>(url, config);
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
          // Only log in non-production environments
          if (process.env.NODE_ENV !== 'production') {
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
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};