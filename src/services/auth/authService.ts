// src/services/auth/authService.ts
import { v4 as uuidv4 } from 'uuid';
import { getUserId } from '@utils/localStorage';

export interface AuthToken {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: number;
}

/**
 * Check if the user has a valid authentication token
 */
export const hasValidToken = (): boolean => {
  const tokenData = localStorage.getItem('stylist_auth_token');
  if (!tokenData) return false;
  
  try {
    const token: AuthToken = JSON.parse(tokenData);
    return token.expiresAt > Date.now();
  } catch (error) {
    return false;
  }
};

/**
 * Get the current authentication token
 */
export const getAuthToken = (): AuthToken | null => {
  const tokenData = localStorage.getItem('stylist_auth_token');
  if (!tokenData) return null;
  
  try {
    const token: AuthToken = JSON.parse(tokenData);
    if (token.expiresAt <= Date.now()) {
      // Token expired, clear it
      localStorage.removeItem('stylist_auth_token');
      return null;
    }
    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Create an anonymous session
 */
export const createAnonymousSession = async (): Promise<AuthToken> => {
  const userId = getUserId();
  const sessionId = uuidv4();
  
  // In a real implementation, this would call an API
  // For now, we'll create a mock token
  const token: AuthToken = {
    userId,
    sessionId,
    token: `anonymous_${uuidv4()}`,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  // Save token to localStorage
  localStorage.setItem('stylist_auth_token', JSON.stringify(token));
  
  return token;
};

/**
 * Sign in a user
 */
export const signIn = async (email: string, password: string): Promise<AuthToken> => {
  // In a real implementation, this would call an API
  // For now, we'll throw an error
  throw new Error('Not implemented: Use createAnonymousSession for now');
};

/**
 * Sign out the current user
 */
export const signOut = (): void => {
  localStorage.removeItem('stylist_auth_token');
};

/**
 * Get the authorization header for API requests
 */
export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token.token}`
  };
};