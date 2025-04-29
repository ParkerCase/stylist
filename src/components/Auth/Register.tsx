import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { getAuthService, RegisterParams } from '../../services/auth/authService';
import { ApiClient } from '../../api/apiClient';
import './Auth.scss';

interface RegisterProps {
  apiClient: ApiClient;
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

const Register: React.FC<RegisterProps> = ({ apiClient, onSuccess, onLoginClick }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const setUser = useUserStore(state => state.setUser);
  const authService = getAuthService(apiClient);
  
  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 digit
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      if (!validatePassword(password)) {
        throw new Error(
          'Password must be at least 8 characters and contain at least ' +
          'one uppercase letter, one lowercase letter, and one digit'
        );
      }
      
      const registerParams: RegisterParams = { email, password, name };
      const authToken = await authService.register(registerParams);
      
      // Fetch user profile
      const userResponse = await apiClient.get(`/api/v1/users/me`);
      setUser(userResponse);
      
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="auth-form-container">
      <h2>Create Account</h2>
      
      {error && <div className="auth-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="name">Name (Optional)</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your name"
          />
        </div>
        
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
            placeholder="Create a password"
            required
          />
          <small className="password-requirements">
            Password must be at least 8 characters with at least one uppercase letter,
            one lowercase letter, and one digit.
          </small>
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Confirm your password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="auth-links">
        <button 
          onClick={onLoginClick} 
          className="text-button"
          disabled={isLoading}
        >
          Already have an account? Log in
        </button>
      </div>
      
      <div className="social-login">
        <p>Or continue with</p>
        <div className="social-buttons">
          <button 
            className="social-button google-button"
            onClick={() => alert('Google signup not yet implemented')}
            disabled={isLoading}
          >
            Google
          </button>
          <button 
            className="social-button facebook-button"
            onClick={() => alert('Facebook signup not yet implemented')}
            disabled={isLoading}
          >
            Facebook
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;