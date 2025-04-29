import React, { useState, useEffect } from 'react';
import { getAuthService, ResetPasswordParams } from '../../services/auth/authService';
import { ApiClient } from '../../api/apiClient';
import './Auth.scss';

interface ResetPasswordProps {
  apiClient: ApiClient;
  token: string;
  onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ apiClient, token, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const authService = getAuthService(apiClient);
  
  useEffect(() => {
    // Validate token on component mount
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);
  
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
      if (!password || !confirmPassword) {
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
      
      const resetParams: ResetPasswordParams = { token, password };
      await authService.resetPassword(resetParams);
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      // Call onSuccess callback
      onSuccess();
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during password reset');
    } finally {
      setIsLoading(false);
    }
  };
  
  // If token is missing, show error message
  if (!token) {
    return (
      <div className="auth-form-container">
        <h2>Reset Password</h2>
        <div className="auth-error">
          Invalid or missing reset token. Please request a new password reset.
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-form-container">
      <h2>Reset Password</h2>
      
      {error && <div className="auth-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Enter new password"
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
            placeholder="Confirm new password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;