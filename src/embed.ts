// Embed script for retailers to include the widget on their site

import { useChatStore } from '@store/index';

interface StylistWidgetConfig {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
}

// Initialize the widget
function init(config: StylistWidgetConfig): void {
  // Store configuration
  window.__StylistWidgetConfig = config;
  
  // Create a button to open the widget if it doesn't exist
  if (!document.getElementById('stylist-widget-button')) {
    createWidgetButton(config);
  }
  
  console.log('The Stylist widget initialized successfully.');
}

// Create the floating action button
function createWidgetButton(config: StylistWidgetConfig): void {
  const button = document.createElement('button');
  button.id = 'stylist-widget-button';
  button.className = 'stylist-widget-button';
  button.setAttribute('aria-label', 'Open Stylist Widget');
  
  // Position classes
  const position = config.position || 'bottom-right';
  button.classList.add(`stylist-widget-button--${position}`);
  
  // Apply primary color if provided
  if (config.primaryColor) {
    button.style.backgroundColor = config.primaryColor;
  }
  
  // Icon
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 1a9 9 0 019 9c0 4.56-3.37 8.33-7.76 8.95l-.19-.47a7.99 7.99 0 002.93-10.57A8.02 8.02 0 004.06 13.1 9 9 0 0112 1zm7.12 13.93l.37.37-.36.36.01-.73zm1.36-1.55a2.83 2.83 0 00-.5-.31l.36-.74c.28.12.54.29.78.48l-.64.57zm-14.81.19l.36.73c-.29.16-.57.35-.8.57l-.57-.64c.31-.3.65-.54 1.01-.66zM6.66 22l1.93-3.1c-.47-.55-.85-1.16-1.14-1.8L2.8 19.13V22h3.86zm10.46-2.91L19 21.99v-2.86l-1.14-.93c.12-.39.19-.8.19-1.22l.08-.04A8.96 8.96 0 0022 10 10 10 0 002 10a9 9 0 003.34 7.03L1.94 20.5A1 1 0 002.86 22h16.28a1 1 0 00.92-1.5l-2.94-3.41z"/>
    </svg>
  `;
  
  // Add button styles
  const style = document.createElement('style');
  style.textContent = `
    .stylist-widget-button {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #4361ee;
      color: white;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      z-index: 9999;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .stylist-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }
    
    .stylist-widget-button--bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .stylist-widget-button--bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .stylist-widget-button--top-right {
      top: 20px;
      right: 20px;
    }
    
    .stylist-widget-button--top-left {
      top: 20px;
      left: 20px;
    }
    
    @media (max-width: 576px) {
      .stylist-widget-button {
        width: 48px;
        height: 48px;
      }
    }
  `;
  
  // Append elements to the document
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Add click event listener
  button.addEventListener('click', open);
}

// Open the widget
function open(): void {
  useChatStore.getState().toggleOpen();
}

// Close the widget
function close(): void {
  const { isOpen } = useChatStore.getState();
  if (isOpen) {
    useChatStore.getState().toggleOpen();
  }
}

// Declare global types
declare global {
  interface Window {
    __StylistWidgetConfig: StylistWidgetConfig;
    StylistWidget: {
      init: typeof init;
      open: typeof open;
      close: typeof close;
    };
  }
}

// Export the API
window.StylistWidget = {
  init,
  open,
  close
};

export { init, open, close };
