// Enhanced chat header component with tab navigation support
import React from 'react';
import './ChatHeader.scss';
import { useChatStore } from '@store/index';
import WishlistNotification from '@/components/WishlistNotification';
import { DemoModeToggle } from '@/utils/demoModeToggle';
import { TabId } from '@/components/TabNavigation';

interface ChatHeaderProps {
  title?: string;
  logo?: string;
  primaryColor?: string;
  currentView?: 'chat' | 'lookbook';
  onSwitchView?: (view: 'chat' | 'lookbook') => void;
  showDemoToggle?: boolean;
  activeTab?: TabId; // New prop for tab-based navigation
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = 'Personalized Stylist',
  logo,
  primaryColor,
  currentView = 'chat',
  onSwitchView,
  showDemoToggle = false,
  activeTab = 'chat'
}) => {
  const { toggleMinimize, toggleOpen, isMinimized } = useChatStore();
  
  // Function to get appropriate icon for the current tab
  const getIconForTab = (tab: TabId) => {
    switch(tab) {
      case 'chat':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 1a9 9 0 019 9c0 4.56-3.37 8.33-7.76 8.95l-.19-.47a7.99 7.99 0 002.93-10.57A8.02 8.02 0 004.06 13.1A9 9 0 0112 1zm7.12 13.93l.37.37-.36.36.01-.73zm1.36-1.55a2.83 2.83 0 00-.5-.31l.36-.74c.28.12.54.29.78.48l-.64.57zm-14.81.19l.36.73c-.29.16-.57.35-.8.57l-.57-.64c.31-.3.65-.54 1.01-.66zM6.66 22l1.93-3.1c-.47-.55-.85-1.16-1.14-1.8L2.8 19.13V22h3.86zm10.46-2.91L19 21.99v-2.86l-1.14-.93c.12-.39.19-.8.19-1.22l.08-.04A8.96 8.96 0 0022 10 10 10 0 002 10a9 9 0 003.34 7.03L1.94 20.5A1 1 0 002.86 22h16.28a1 1 0 00.92-1.5l-2.94-3.41z"/>
          </svg>
        );
      case 'lookbook':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 2v5l-1-.75L15 9V4h2zm3 12H8V4h5v9l3-2.25L19 13V4h1v12z"/>
          </svg>
        );
      case 'myCloset':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H3V6h9v12h9zM8 1.5v3h8v-3h-8zM9 17h2V7H9zm4 0h2V7h-2z"/>
          </svg>
        );
      case 'tryOn':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 6c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm8 12v-9.5C20 4.58 16.42 1 12 1S4 4.58 4 8.5V18c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-6-10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S11.17 6 12 6s1.5.67 1.5 1.5zM6 18v-6h.5c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5H6zm3.5 0v-6.5c0-.28.22-.5.5-.5s.5.22.5.5V18h-1zm3.5 0v-6h.5c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5H13zm4 0v-5.5c0-.28.22-.5.5-.5s.5.22.5.5V18h-1z"/>
          </svg>
        );
      case 'socialProof':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/>
          </svg>
        );
      case 'trending':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M16.85 6.85l1.44 1.44-4.88 4.88-3.29-3.29c-.39-.39-1.02-.39-1.41 0l-6 6.01c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L9.41 12l3.29 3.29c.39.39 1.02.39 1.41 0l5.59-5.58 1.44 1.44c.31.31.85.09.85-.35V6.5c.01-.28-.21-.5-.49-.5h-4.29c-.45 0-.67.54-.36.85z"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 1a9 9 0 019 9c0 4.56-3.37 8.33-7.76 8.95l-.19-.47a7.99 7.99 0 002.93-10.57A8.02 8.02 0 004.06 13.1A9 9 0 0112 1z"/>
          </svg>
        );
    }
  };
  
  const handleMinimize = () => {
    toggleMinimize();
  };
  
  const handleClose = () => {
    toggleOpen();
  };

  return (
    <header className="stylist-chat-header modal-animate" style={{ backgroundColor: primaryColor }}>
      <div className="stylist-chat-header__logo">
        {logo ? (
          <img src={logo} alt={title} className="stylist-chat-header__logo-img" />
        ) : (
          <div className="stylist-chat-header__logo-placeholder">
            {getIconForTab(activeTab)}
          </div>
        )}
      </div>
      <div className="stylist-chat-header__title">Personalized Stylist</div>
      <div className="stylist-chat-header__controls">
        {showDemoToggle && (
          <div className="stylist-chat-header__demo-toggle">
            <DemoModeToggle />
          </div>
        )}
        {!isMinimized && (
          <WishlistNotification
            onClickNotification={() => {
              if (onSwitchView) {
                if (currentView !== 'lookbook') {
                  onSwitchView('lookbook');
                }
                console.log('Switch to wishlist tab');
              }
            }}
          />
        )}
        {onSwitchView && !isMinimized && activeTab !== 'chat' && (
          <button
            className="stylist-chat-header__button stylist-chat-header__button--switch"
            onClick={() => onSwitchView('chat')}
            aria-label="Return to Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
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
    </header>
  );
};

export default ChatHeader;