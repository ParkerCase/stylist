// Enhanced chat header component with view switching
import React from 'react';
import './ChatHeader.scss';
import { useChatStore } from '@store/index';

interface ChatHeaderProps {
  title?: string;
  logo?: string;
  primaryColor?: string;
  currentView?: 'chat' | 'lookbook';
  onSwitchView?: (view: 'chat' | 'lookbook') => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = 'The Stylist',
  logo,
  primaryColor,
  currentView = 'chat',
  onSwitchView
}) => {
  const { toggleMinimize, toggleOpen, isMinimized } = useChatStore();
  
  const handleMinimize = () => {
    toggleMinimize();
  };
  
  const handleClose = () => {
    toggleOpen();
  };
  
  const handleSwitchView = () => {
    if (onSwitchView) {
      onSwitchView(currentView === 'chat' ? 'lookbook' : 'chat');
    }
  };

  return (
    <div className="stylist-chat-header" style={{ backgroundColor: primaryColor }}>
      <div className="stylist-chat-header__logo">
        {logo ? (
          <img src={logo} alt={title} className="stylist-chat-header__logo-img" />
        ) : (
          <div className="stylist-chat-header__logo-placeholder">
            {currentView === 'chat' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 1a9 9 0 019 9c0 4.56-3.37 8.33-7.76 8.95l-.19-.47a7.99 7.99 0 002.93-10.57A8.02 8.02 0 004.06 13.1A9 9 0 0112 1zm7.12 13.93l.37.37-.36.36.01-.73zm1.36-1.55a2.83 2.83 0 00-.5-.31l.36-.74c.28.12.54.29.78.48l-.64.57zm-14.81.19l.36.73c-.29.16-.57.35-.8.57l-.57-.64c.31-.3.65-.54 1.01-.66zM6.66 22l1.93-3.1c-.47-.55-.85-1.16-1.14-1.8L2.8 19.13V22h3.86zm10.46-2.91L19 21.99v-2.86l-1.14-.93c.12-.39.19-.8.19-1.22l.08-.04A8.96 8.96 0 0022 10 10 10 0 002 10a9 9 0 003.34 7.03L1.94 20.5A1 1 0 002.86 22h16.28a1 1 0 00.92-1.5l-2.94-3.41z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 2v5l-1-.75L15 9V4h2zm3 12H8V4h5v9l3-2.25L19 13V4h1v12z"/>
              </svg>
            )}
          </div>
        )}
      </div>
      <div className="stylist-chat-header__title">{title}</div>
      <div className="stylist-chat-header__controls">
        {onSwitchView && !isMinimized && (
          <button
            className="stylist-chat-header__button stylist-chat-header__button--switch"
            onClick={handleSwitchView}
            aria-label={currentView === 'chat' ? 'View Lookbook' : 'Return to Chat'}
          >
            {currentView === 'chat' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 2v5l-1-.75L15 9V4h2zm3 12H8V4h5v9l3-2.25L19 13V4h1v12z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            )}
          </button>
        )}
        <button
          className="stylist-chat-header__button stylist-chat-header__button--minimize"
          onClick={handleMinimize}
          aria-label={isMinimized ? "Maximize" : "Minimize"}
        >
          {isMinimized ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          )}
        </button>
        <button
          className="stylist-chat-header__button stylist-chat-header__button--close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;