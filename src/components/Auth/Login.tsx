import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { getAuthService, LoginParams } from '../../services/auth/authService';
import { ApiClient } from '../../api/apiClient';
import { UserProfile } from '../../types/user';
import './Auth.scss';

interface LoginProps {
  apiClient: ApiClient;
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
}

const Login: React.FC<LoginProps> = ({ 
  apiClient, 
  onSuccess, 
  onRegisterClick,
  onForgotPasswordClick 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const setUser = useUserStore(state => state.setUser);
  const authService = getAuthService(apiClient);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const loginParams: LoginParams = { email, password };
      const authToken = await authService.signIn(loginParams);
      
      // Fetch user profile
      const userResponse = await apiClient.get<UserProfile>(`/api/v1/users/me`);
      
      // Create a properly shaped UserProfile object to satisfy TypeScript
      const userProfile: UserProfile = {
        userId: userResponse.userId || 'unknown',
        isAnonymous: false,
        preferences: userResponse.preferences || {
          stylePreferences: [],
          colorPreferences: [],
          sizePreferences: []
        },
        closet: userResponse.closet || [],
        feedback: userResponse.feedback || {
          likedItems: [],
          dislikedItems: [],
          savedOutfits: [],
          viewedItems: [],
          lastInteraction: new Date()
        },
        createdAt: userResponse.createdAt || new Date(),
        lastActive: userResponse.lastActive || new Date(),
        email: userResponse.email
      };
      
      setUser(userProfile);
      
      // Clear form
      setEmail('');
      setPassword('');
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="auth-form-container">
      <h2>Log In</h2>
      
      {error && <div className="auth-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <div className="auth-links">
        <button 
          onClick={onForgotPasswordClick} 
          className="text-button"
          disabled={isLoading}
        >
          Forgot Password?
        </button>
        
        <button 
          onClick={onRegisterClick} 
          className="text-button"
          disabled={isLoading}
        >
          Need an account? Register
        </button>
      </div>
      
      <div className="social-login">
        <p>Or continue with</p>
        <div className="social-buttons">
          <button 
            className="social-button google-button"
            onClick={() => alert('Google login not yet implemented')}
            disabled={isLoading}
          >
            Google
          </button>
          <button 
            className="social-button facebook-button"
            onClick={() => alert('Facebook login not yet implemented')}
            disabled={isLoading}
          >
            Facebook
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;