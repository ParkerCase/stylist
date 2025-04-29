// src/services/auth/authService.ts
import { v4 as uuidv4 } from 'uuid';
import { getUserId, setUserId } from '@utils/localStorage';
import { ApiClient } from '../../api/apiClient';

export interface AuthToken {
  userId: string;
  email?: string;
  token: string;
  expiresAt: number;
  isAnonymous: boolean;
}

export interface RegisterParams {
  email: string;
  password: string;
  name?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  token: string;
  password: string;
}

export interface SocialAuthParams {
  provider: 'google' | 'facebook' | 'apple';
  token: string;
}

class AuthService {
  private apiClient: ApiClient;
  private readonly TOKEN_KEY = 'stylist_auth_token';
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * Check if the user has a valid authentication token
   */
  public hasValidToken(): boolean {
    const tokenData = localStorage.getItem(this.TOKEN_KEY);
    if (!tokenData) return false;
    
    try {
      const token: AuthToken = JSON.parse(tokenData);
      return token.expiresAt > Date.now();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the current authentication token
   */
  public getAuthToken(): AuthToken | null {
    const tokenData = localStorage.getItem(this.TOKEN_KEY);
    if (!tokenData) return null;
    
    try {
      const token: AuthToken = JSON.parse(tokenData);
      if (token.expiresAt <= Date.now()) {
        // Token expired, clear it
        this.clearToken();
        return null;
      }
      return token;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Store authentication token
   */
  private storeToken(token: AuthToken): void {
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(token));
  }
  
  /**
   * Clear authentication token
   */
  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
  
  /**
   * Create an anonymous session
   */
  public async createAnonymousSession(): Promise<AuthToken> {
    const userId = getUserId() || uuidv4();
    setUserId(userId);
    
    // In a real implementation, this would call an API to validate the anonymous session
    // For now, we'll create a mock token
    const token: AuthToken = {
      userId,
      token: `anonymous_${uuidv4()}`,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      isAnonymous: true
    };
    
    // Save token to localStorage
    this.storeToken(token);
    
    return token;
  }
  
  /**
   * Register a new user
   */
  public async register(params: RegisterParams): Promise<AuthToken> {
    try {
      const response = await this.apiClient.post<any>('/api/v1/auth/register', params);
      
      // Create token from response
      const token: AuthToken = {
        userId: response.user_id,
        email: response.email,
        token: response.token,
        expiresAt: this.calculateExpiryFromToken(response.token),
        isAnonymous: false
      };
      
      // Store token
      this.storeToken(token);
      
      // Update local user ID
      setUserId(token.userId);
      
      return token;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }
  
  /**
   * Sign in a user
   */
  public async signIn(params: LoginParams): Promise<AuthToken> {
    try {
      const response = await this.apiClient.post<any>('/api/v1/auth/login', params);
      
      // Create token from response
      const token: AuthToken = {
        userId: response.user_id,
        email: response.email,
        token: response.token,
        expiresAt: this.calculateExpiryFromToken(response.token),
        isAnonymous: false
      };
      
      // Store token
      this.storeToken(token);
      
      // Update local user ID
      setUserId(token.userId);
      
      return token;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   */
  public signOut(): void {
    this.clearToken();
    
    // Create a new anonymous session
    this.createAnonymousSession();
  }
  
  /**
   * Request a password reset
   */
  public async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.apiClient.post<any>('/api/v1/auth/password-reset-request', { email });
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }
  
  /**
   * Reset password
   */
  public async resetPassword(params: ResetPasswordParams): Promise<void> {
    try {
      await this.apiClient.post<any>('/api/v1/auth/password-reset', params);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate with a social provider
   */
  public async socialAuth(params: SocialAuthParams): Promise<AuthToken> {
    try {
      const response = await this.apiClient.post<any>(
        `/api/v1/auth/social/${params.provider}`,
        { token: params.token }
      );
      
      // Create token from response
      const token: AuthToken = {
        userId: response.user_id,
        email: response.email,
        token: response.token,
        expiresAt: this.calculateExpiryFromToken(response.token),
        isAnonymous: false
      };
      
      // Store token
      this.storeToken(token);
      
      // Update local user ID
      setUserId(token.userId);
      
      return token;
    } catch (error) {
      console.error('Social authentication failed:', error);
      throw error;
    }
  }
  
  /**
   * Get the authorization header for API requests
   */
  public getAuthHeader(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token.token}`
    };
  }
  
  /**
   * Calculate token expiry from JWT
   * This is a simple implementation that extracts the exp claim from the JWT payload
   */
  private calculateExpiryFromToken(token: string): number {
    try {
      // Split the token and decode the payload (middle part)
      const parts = token.split('.');
      if (parts.length !== 3) return Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
      
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        // JWT expiry is in seconds, convert to milliseconds
        return payload.exp * 1000;
      }
      
      return Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
    } catch (error) {
      console.error('Error calculating token expiry:', error);
      return Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
    }
  }
}

// Create a singleton instance
let authServiceInstance: AuthService | null = null;

export const getAuthService = (apiClient: ApiClient): AuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(apiClient);
  }
  return authServiceInstance;
};