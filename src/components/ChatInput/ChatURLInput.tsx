// ChatURLInput.tsx - Component for entering product URLs for specific product lookup

import React, { useState } from 'react';
import './ChatURLInput.scss';

interface ChatURLInputProps {
  onURLSubmit: (url: string) => void;
  primaryColor?: string;
  disabled?: boolean;
}

const ChatURLInput: React.FC<ChatURLInputProps> = ({
  onURLSubmit,
  primaryColor,
  disabled = false
}) => {
  const [url, setUrl] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    // Basic validation - clear error when typing
    if (!isValid) {
      setIsValid(true);
      setErrorMessage('');
    }
  };

  // Validate URL
  const validateURL = (url: string): boolean => {
    try {
      // Check if it's a valid URL
      new URL(url);
      return true;
    } catch (e) {
      setErrorMessage('Please enter a valid URL');
      return false;
    }
  };

  // Handle URL submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) return;
    
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setIsValid(false);
      setErrorMessage('Please enter a URL');
      return;
    }
    
    if (!validateURL(trimmedUrl)) {
      setIsValid(false);
      return;
    }
    
    // Call the callback with the validated URL
    onURLSubmit(trimmedUrl);
    
    // Clear the input
    setUrl('');
  };

  // Style objects for theming
  const submitButtonStyle = {
    backgroundColor: primaryColor || undefined
  };

  return (
    <div className={`stylist-chat-url-input ${disabled ? 'disabled' : ''}`}>
      <div className="stylist-chat-url-input__header">
        <div className="stylist-chat-url-input__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
          </svg>
        </div>
        <h3 className="stylist-chat-url-input__title">Find a specific product</h3>
      </div>
      
      <form className="stylist-chat-url-input__form" onSubmit={handleSubmit}>
        <div className="stylist-chat-url-input__input-container">
          <input 
            type="text"
            className={`stylist-chat-url-input__input ${!isValid ? 'error' : ''}`}
            value={url}
            onChange={handleChange}
            placeholder="Enter product URL (e.g. https://store.com/product)"
            disabled={disabled}
          />
          {!isValid && (
            <div className="stylist-chat-url-input__error">{errorMessage}</div>
          )}
        </div>
        
        <button 
          type="submit"
          className="stylist-chat-url-input__submit"
          disabled={disabled || url.trim() === ''}
          style={submitButtonStyle}
          aria-label="Submit URL"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Find Product
        </button>
      </form>
      
      <div className="stylist-chat-url-input__info">
        <p>Paste a link to a specific clothing item to get detailed information and styling suggestions for that product.</p>
      </div>
    </div>
  );
};

export default ChatURLInput;