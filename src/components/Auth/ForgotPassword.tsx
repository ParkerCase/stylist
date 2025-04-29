import React, { useState } from 'react';
import { getAuthService } from '../../services/auth/authService';
import { ApiClient } from '../../api/apiClient';
import './Auth.scss';

interface ForgotPasswordProps {
  apiClient: ApiClient;
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ apiClient, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const authService = getAuthService(apiClient);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      
      await authService.requestPasswordReset(email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while requesting password reset');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="auth-form-container">
      <h2>Forgot Password</h2>
      
      {error && <div className="auth-error">{error}</div>}
      {success && (
        <div className="auth-success">
          Password reset instructions have been sent to your email address.
          Please check your inbox and follow the instructions to reset your password.
        </div>
      )}
      
      {!success ? (
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
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Request Password Reset'}
          </button>
        </form>
      ) : (
        <button 
          onClick={onBackToLogin} 
          className="auth-button"
        >
          Back to Login
        </button>
      )}
      
      {!success && (
        <div className="auth-links">
          <button 
            onClick={onBackToLogin} 
            className="text-button"
            disabled={isLoading}
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;