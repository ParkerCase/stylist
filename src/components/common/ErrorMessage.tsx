// src/components/common/ErrorMessage.tsx

import React from 'react';
import './ErrorMessage.scss';

interface ErrorMessageProps {
  message: string;
  code?: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  code, 
  onRetry 
}) => {
  return (
    <div className="stylist-error-message">
      <div className="stylist-error-message__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>
      <div className="stylist-error-message__content">
        <div className="stylist-error-message__text">{message}</div>
        {code && <div className="stylist-error-message__code">Error code: {code}</div>}
      </div>
      {onRetry && (
        <button className="stylist-error-message__retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;