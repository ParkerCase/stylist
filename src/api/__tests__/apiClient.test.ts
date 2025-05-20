// src/api/__tests__/apiClient.test.ts
import axios, { AxiosError } from 'axios';
import { ApiClient, createApiClient } from '../apiClient';

// Set longer timeout for API tests with retries
jest.setTimeout(20000);

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn().mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    })
  };
});

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mock axios instance
    mockAxiosInstance = axios.create();
    
    // Create API client with test config
    apiClient = createApiClient({
      baseURL: 'https://api.example.com',
      apiKey: 'test-api-key',
      maxRetries: 3
    });
  });
  
  test('should make a successful GET request', async () => {
    const responseData = { id: 1, name: 'Test Item' };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.get('/test');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should make a successful POST request', async () => {
    const postData = { name: 'New Item' };
    const responseData = { id: 1, name: 'New Item' };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.post('/test', postData);
    
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should make a successful PUT request', async () => {
    const putData = { id: 1, name: 'Updated Item' };
    const responseData = { id: 1, name: 'Updated Item' };
    mockAxiosInstance.put.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.put('/test/1', putData);
    
    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should make a successful DELETE request', async () => {
    const responseData = { success: true };
    mockAxiosInstance.delete.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.delete('/test/1');
    
    expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should retry on network errors', async () => {
    // Mock a network error for first call, then success
    const networkError = new Error('Network Error') as AxiosError;
    networkError.request = {} as any; // Make it look like a network error
    
    const mockData = { id: 1, name: 'Test' };
    
    mockAxiosInstance.get.mockRejectedValueOnce(networkError);
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });
    
    // Mock setTimeout to avoid actual delay in tests
    jest.useFakeTimers();
    
    // Start the request
    const promise = apiClient.get('/test');
    
    // Fast-forward past all the waiting time
    jest.runAllTimers();
    
    const result = await promise;
    
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockData);
    
    // Clean up
    jest.useRealTimers();
  });
  
  test('should retry on 500 server errors', async () => {
    // Mock a 500 error for first call, then success
    const serverError = new Error('Internal Server Error') as AxiosError;
    serverError.response = { 
      status: 500, 
      data: { message: 'Server error' },
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as any
    } as any;
    
    const mockData = { id: 1, name: 'Test' };
    
    mockAxiosInstance.get.mockRejectedValueOnce(serverError);
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });
    
    // Mock setTimeout to avoid actual delay in tests
    jest.useFakeTimers();
    
    // Start the request
    const promise = apiClient.get('/test');
    
    // Fast-forward past all the waiting time
    jest.runAllTimers();
    
    const result = await promise;
    
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockData);
    
    // Clean up
    jest.useRealTimers();
  });
  
  test('should not retry on 4xx client errors', async () => {
    // Mock a 404 error (not found)
    const notFoundError = new Error('Not Found') as AxiosError;
    notFoundError.response = { 
      status: 404, 
      data: { message: 'Resource not found' },
      statusText: 'Not Found',
      headers: {},
      config: {} as any
    } as any;
    
    mockAxiosInstance.get.mockRejectedValueOnce(notFoundError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Resource not found');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });
  
  test('should throw appropriate error for 401 unauthorized', async () => {
    const unauthorizedError = new Error('Unauthorized') as AxiosError;
    unauthorizedError.response = { 
      status: 401, 
      data: { message: 'Unauthorized' },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any
    } as any;
    
    mockAxiosInstance.get.mockRejectedValueOnce(unauthorizedError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Unauthorized: Please check your API key');
  });
  
  test('should throw appropriate error for 403 forbidden', async () => {
    const forbiddenError = new Error('Forbidden') as AxiosError;
    forbiddenError.response = { 
      status: 403, 
      data: { message: 'Forbidden' },
      statusText: 'Forbidden',
      headers: {},
      config: {} as any
    } as any;
    
    mockAxiosInstance.get.mockRejectedValueOnce(forbiddenError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Forbidden: You do not have permission');
  });
  
  test('should handle authentication headers', async () => {
    const responseData = { id: 1, name: 'Test Item' };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: responseData });
    
    // Create new client with auth header getter
    const clientWithAuth = createApiClient({
      baseURL: 'https://api.example.com',
      getAuthHeader: () => ({ 'Authorization': 'Bearer test-token' })
    });
    
    await clientWithAuth.get('/test');
    
    // Verify auth header was included
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
  });
  
  test('should handle errors when making API requests', async () => {
    const networkError = new Error('Network Error') as AxiosError;
    networkError.request = {} as any;
    networkError.code = 'ECONNABORTED';
    
    // Mock maximum retries
    mockAxiosInstance.get.mockRejectedValue(networkError);
    
    // Mock setTimeout to avoid actual delay in tests
    jest.useFakeTimers();
    
    // Expect error to be thrown after max retries
    const promise = apiClient.get('/test');
    
    // Fast-forward past all retries
    for (let i = 0; i <= 3; i++) {
      jest.runAllTimers();
    }
    
    await expect(promise).rejects.toThrow('No response received from server');
    
    // Clean up
    jest.useRealTimers();
  });
});