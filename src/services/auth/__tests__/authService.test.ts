// src/services/auth/__tests__/authService.test.ts
import { getAuthService, AuthToken, LoginParams, RegisterParams, ResetPasswordParams, SocialAuthParams } from '../authService';
import { ApiClient } from '../../../api/apiClient';
import * as localStorage from '../../../utils/localStorage';

// Set longer timeout for auth service tests (login/register/token operations may take time)
jest.setTimeout(15000);

// Mock localStorage
jest.mock('../../../utils/localStorage', () => ({
  getUserId: jest.fn(),
  setUserId: jest.fn()
}));

// Mock API Client
const mockPost = jest.fn();
const mockApiClient = {
  post: mockPost
} as unknown as ApiClient;

// Mock JWT token utilities
const originalAtob = global.atob;
const mockJwtToken = 'header.eyJleHAiOjk5OTk5OTk5OTl9.signature';

describe('Auth Service', () => {
  let authService: ReturnType<typeof getAuthService>;
  let localStorageSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock localStorage
    localStorageSpy = jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    
    // Mock atob for JWT parsing
    global.atob = jest.fn().mockImplementation((str) => {
      if (str === 'eyJleHAiOjk5OTk5OTk5OTl9') {
        return '{"exp":9999999999}';
      }
      return originalAtob(str);
    });
    
    // Initialize auth service
    authService = getAuthService(mockApiClient);
  });
  
  afterEach(() => {
    global.atob = originalAtob;
  });
  
  test('should create anonymous session when user ID exists', async () => {
    // Mock existing user ID
    (localStorage.getUserId as jest.Mock).mockReturnValue('existing-user-id');
    
    const token = await authService.createAnonymousSession();
    
    expect(token).toEqual(expect.objectContaining({
      userId: 'existing-user-id',
      isAnonymous: true
    }));
    
    expect(localStorage.setUserId).toHaveBeenCalledWith('existing-user-id');
  });
  
  test('should create anonymous session with new user ID when none exists', async () => {
    // Mock no existing user ID
    (localStorage.getUserId as jest.Mock).mockReturnValue(null);
    
    const token = await authService.createAnonymousSession();
    
    expect(token.userId).toBeTruthy(); // Should generate a UUID
    expect(token.isAnonymous).toBe(true);
    
    expect(localStorage.setUserId).toHaveBeenCalledWith(token.userId);
  });
  
  test('should register a new user', async () => {
    // Mock API response
    mockPost.mockResolvedValue({
      user_id: 'new-user-id',
      email: 'test@example.com',
      token: mockJwtToken
    });
    
    const params: RegisterParams = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    const token = await authService.register(params);
    
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', params);
    expect(token).toEqual(expect.objectContaining({
      userId: 'new-user-id',
      email: 'test@example.com',
      isAnonymous: false
    }));
    
    expect(localStorage.setUserId).toHaveBeenCalledWith('new-user-id');
  });
  
  test('should throw error when registration fails', async () => {
    // Mock API error
    const error = new Error('Registration failed');
    mockPost.mockRejectedValue(error);
    
    const params: RegisterParams = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    await expect(authService.register(params)).rejects.toThrow(error);
  });
  
  test('should sign in a user', async () => {
    // Mock API response
    mockPost.mockResolvedValue({
      user_id: 'user-id',
      email: 'test@example.com',
      token: mockJwtToken
    });
    
    const params: LoginParams = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const token = await authService.signIn(params);
    
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', params);
    expect(token).toEqual(expect.objectContaining({
      userId: 'user-id',
      email: 'test@example.com',
      isAnonymous: false
    }));
    
    expect(localStorage.setUserId).toHaveBeenCalledWith('user-id');
  });
  
  test('should sign out and create a new anonymous session', async () => {
    // Setup spy on createAnonymousSession
    const createAnonymousSpy = jest.spyOn(authService, 'createAnonymousSession');
    
    authService.signOut();
    
    expect(createAnonymousSpy).toHaveBeenCalled();
  });
  
  test('should request password reset', async () => {
    mockPost.mockResolvedValue({});
    
    await authService.requestPasswordReset('test@example.com');
    
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/password-reset-request', {
      email: 'test@example.com'
    });
  });
  
  test('should reset password', async () => {
    mockPost.mockResolvedValue({});
    
    const params: ResetPasswordParams = {
      token: 'reset-token',
      password: 'new-password'
    };
    
    await authService.resetPassword(params);
    
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/password-reset', params);
  });
  
  test('should authenticate with social provider', async () => {
    // Mock API response
    mockPost.mockResolvedValue({
      user_id: 'social-user-id',
      email: 'social@example.com',
      token: mockJwtToken
    });
    
    const params: SocialAuthParams = {
      provider: 'google',
      token: 'google-token'
    };
    
    const token = await authService.socialAuth(params);
    
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/social/google', {
      token: 'google-token'
    });
    
    expect(token).toEqual(expect.objectContaining({
      userId: 'social-user-id',
      email: 'social@example.com',
      isAnonymous: false
    }));
  });
  
  test('should verify token validity', () => {
    // Setup valid token in localStorage
    const validToken: AuthToken = {
      userId: 'user-id',
      token: 'token',
      expiresAt: Date.now() + 1000000, // Future expiry
      isAnonymous: false
    };
    
    localStorageSpy.mockReturnValue(JSON.stringify(validToken));
    
    expect(authService.hasValidToken()).toBe(true);
    
    // Setup expired token
    const expiredToken: AuthToken = {
      userId: 'user-id',
      token: 'token',
      expiresAt: Date.now() - 1000, // Past expiry
      isAnonymous: false
    };
    
    localStorageSpy.mockReturnValue(JSON.stringify(expiredToken));
    
    expect(authService.hasValidToken()).toBe(false);
  });
  
  test('should return auth header with token', () => {
    // Setup valid token in localStorage
    const validToken: AuthToken = {
      userId: 'user-id',
      token: 'test-token',
      expiresAt: Date.now() + 1000000, // Future expiry
      isAnonymous: false
    };
    
    localStorageSpy.mockReturnValue(JSON.stringify(validToken));
    
    const headers = authService.getAuthHeader();
    
    expect(headers).toEqual({
      'Authorization': 'Bearer test-token'
    });
  });
  
  test('should return empty auth header when no token exists', () => {
    // No token in localStorage
    localStorageSpy.mockReturnValue(null);
    
    const headers = authService.getAuthHeader();
    
    expect(headers).toEqual({});
  });
  
  test('should handle corrupt token data', () => {
    // Invalid JSON in localStorage
    localStorageSpy.mockReturnValue('not-valid-json');
    
    expect(authService.hasValidToken()).toBe(false);
    expect(authService.getAuthToken()).toBe(null);
  });
  
  test('should handle invalid JWT token format', () => {
    // Mock API response with invalid token
    mockPost.mockResolvedValue({
      user_id: 'user-id',
      email: 'test@example.com',
      token: 'invalid-token-format'
    });
    
    const params: LoginParams = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    return authService.signIn(params).then(token => {
      // Should still create a token with default expiry
      expect(token).toEqual(expect.objectContaining({
        userId: 'user-id',
        email: 'test@example.com',
        token: 'invalid-token-format',
        isAnonymous: false
      }));
      
      // Expiry should default to approximately 24 hours
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      expect(token.expiresAt).toBeGreaterThan(now);
      expect(token.expiresAt).toBeLessThanOrEqual(now + oneDay + 1000);
    });
  });
});