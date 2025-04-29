// src/api/__tests__/apiClient.test.ts
import axios from 'axios';
import { ApiClient, createApiClient } from '../apiClient';

// Set longer timeout for API tests with retries
jest.setTimeout(20000);

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    })),
    defaults: {
      headers: {
        common: {}
      }
    }
  };
});

describe('API Client', () => {
  const mockConfig = {
    baseURL: 'https://api.example.com',
    apiKey: 'test-api-key',
    timeout: 5000,
    maxRetries: 2
  };
  
  let apiClient: ApiClient;
  let mockAxiosInstance: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new API client
    apiClient = createApiClient(mockConfig);
    
    // Get the axios instance created by the client
    mockAxiosInstance = (axios.create as jest.Mock).mock.results[0].value;
  });
  
  test('should create an axios instance with correct config', () => {
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: mockConfig.baseURL,
      timeout: mockConfig.timeout,
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': mockConfig.apiKey
      })
    }));
  });
  
  test('should add request and response interceptors', () => {
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });
  
  test('should make GET request successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });
    
    const result = await apiClient.get('/test');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', expect.any(Object));
    expect(result).toEqual(mockData);
  });
  
  test('should make POST request successfully', async () => {
    const requestData = { name: 'Test' };
    const responseData = { id: 1, name: 'Test' };
    mockAxiosInstance.post.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.post('/test', requestData);
    
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', requestData, expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should make PUT request successfully', async () => {
    const requestData = { id: 1, name: 'Updated' };
    const responseData = { id: 1, name: 'Updated' };
    mockAxiosInstance.put.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.put('/test/1', requestData);
    
    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', requestData, expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should make DELETE request successfully', async () => {
    const responseData = { success: true };
    mockAxiosInstance.delete.mockResolvedValueOnce({ data: responseData });
    
    const result = await apiClient.delete('/test/1');
    
    expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', expect.any(Object));
    expect(result).toEqual(responseData);
  });
  
  test('should retry on network errors', async () => {
    // Mock a network error for first call, then success
    const networkError = new Error('Network Error');
    networkError.request = {}; // Make it look like a network error
    
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
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500, data: { message: 'Server error' } };
    
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
    const notFoundError = new Error('Not Found');
    notFoundError.response = { status: 404, data: { message: 'Resource not found' } };
    
    mockAxiosInstance.get.mockRejectedValueOnce(notFoundError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Resource not found');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });
  
  test('should throw appropriate error for 401 unauthorized', async () => {
    const unauthorizedError = new Error('Unauthorized');
    unauthorizedError.response = { status: 401, data: { message: 'Unauthorized' } };
    
    mockAxiosInstance.get.mockRejectedValueOnce(unauthorizedError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Unauthorized: Please check your API key');
  });
  
  test('should throw appropriate error for 403 forbidden', async () => {
    const forbiddenError = new Error('Forbidden');
    forbiddenError.response = { status: 403, data: { message: 'Forbidden' } };
    
    mockAxiosInstance.get.mockRejectedValueOnce(forbiddenError);
    
    await expect(apiClient.get('/test')).rejects.toThrow('Forbidden: You do not have permission');
  });
  
  test('should include auth headers when getAuthHeader is provided', async () => {
    const authHeaders = { 'Authorization': 'Bearer test-token' };
    const getAuthHeader = jest.fn().mockReturnValue(authHeaders);
    
    const clientWithAuth = createApiClient({
      ...mockConfig,
      getAuthHeader
    });
    
    // Get the axios instance created by the client
    const axiosInstance = (axios.create as jest.Mock).mock.results[1].value;
    
    // Setup a successful response
    axiosInstance.get.mockResolvedValueOnce({ data: { id: 1 } });
    
    await clientWithAuth.get('/test');
    
    // Verify auth header was requested
    expect(getAuthHeader).toHaveBeenCalled();
    
    // Verify the request was made with auth headers
    expect(axiosInstance.get).toHaveBeenCalledWith('/test', 
      expect.objectContaining({
        headers: expect.objectContaining(authHeaders)
      })
    );
  });
  
  test('should give up after max retries', async () => {
    // Mock server errors for all attempts
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500, data: { message: 'Server error' } };
    
    // We expect 1 original try + 2 retries = 3 total calls
    mockAxiosInstance.get.mockRejectedValueOnce(serverError);
    mockAxiosInstance.get.mockRejectedValueOnce(serverError);
    mockAxiosInstance.get.mockRejectedValueOnce(serverError);
    
    // Mock setTimeout to avoid actual delay in tests
    jest.useFakeTimers();
    
    // Start the request
    const promise = apiClient.get('/test');
    
    // Fast-forward past all the waiting time
    jest.runAllTimers();
    
    await expect(promise).rejects.toThrow('Server error');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    
    // Clean up
    jest.useRealTimers();
  });
});