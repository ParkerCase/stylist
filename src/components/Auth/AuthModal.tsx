import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/apiClient';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import './Auth.scss';

interface AuthModalProps {
  apiClient: ApiClient;
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register' | 'forgot-password' | 'reset-password';
  resetToken?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  apiClient, 
  isOpen, 
  onClose, 
  initialView = 'login',
  resetToken = ''
}) => {
  const [currentView, setCurrentView] = useState(initialView);
  
  // Update the view when props change
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);
  
  const handleSuccess = () => {
    onClose();
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        
        {currentView === 'login' && (
          <Login 
            apiClient={apiClient}
            onSuccess={handleSuccess}
            onRegisterClick={() => setCurrentView('register')}
            onForgotPasswordClick={() => setCurrentView('forgot-password')}
          />
        )}
        
        {currentView === 'register' && (
          <Register 
            apiClient={apiClient}
            onSuccess={handleSuccess}
            onLoginClick={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'forgot-password' && (
          <ForgotPassword
            apiClient={apiClient}
            onBackToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'reset-password' && (
          <ResetPassword
            apiClient={apiClient}
            token={resetToken}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;