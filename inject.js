// inject.js - This script is injected into the page content to load the Stylist Widget
(function() {
  // Get extension settings from chrome.storage
  function getExtensionSettings() {
    return new Promise((resolve) => {
      // For non-extension environments, use default settings
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({
          apiKey: 'demo_key',
          retailerId: 'demo_retailer',
          position: 'bottom-right',
          primaryColor: '#4361ee',
          greeting: "Hi there! I'm your AI style assistant. How can I help you today?",
        });
        return;
      }
      
      // Get settings from extension storage
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        if (settings) {
          resolve(settings);
        } else {
          // Fallback to default settings
          resolve({
            apiKey: 'demo_key',
            retailerId: 'demo_retailer',
            position: 'bottom-right',
            primaryColor: '#4361ee',
            greeting: "Hi there! I'm your AI style assistant. How can I help you today?",
          });
        }
      });
    });
  }

  // Load the widget CSS
  function loadWidgetStyles() {
    if (document.querySelector('#stylist-widget-styles')) {
      return;
    }
    
    const styleLink = document.createElement('link');
    styleLink.id = 'stylist-widget-styles';
    styleLink.rel = 'stylesheet';
    styleLink.type = 'text/css';
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Inside a browser extension
      styleLink.href = chrome.runtime.getURL('stylist-widget.css');
    } else {
      // Direct embed on a website
      styleLink.href = 'https://cdn.thestylist.ai/stylist-widget.css';
    }
    
    document.head.appendChild(styleLink);
  }

  // Load the widget script
  function loadWidgetScript() {
    if (document.querySelector('#stylist-widget-script')) {
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'stylist-widget-script';
    script.async = true;
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Inside a browser extension
      script.src = chrome.runtime.getURL('stylist-widget.js');
    } else {
      // Direct embed on a website
      script.src = 'https://cdn.thestylist.ai/stylist-widget.js';
    }
    
    // Initialize widget after script loads
    script.onload = async function() {
      if (window.StylistWidget && window.StylistWidget.init) {
        const settings = await getExtensionSettings();
        window.StylistWidget.init(settings);
        
        // Listen for extension messages
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'openWidget' && window.StylistWidget.open) {
              window.StylistWidget.open();
            } else if (message.action === 'closeWidget' && window.StylistWidget.close) {
              window.StylistWidget.close();
            } else if (message.action === 'switchView' && window.StylistWidget.switchView) {
              window.StylistWidget.switchView(message.view);
            }
            return true;
          });
        }
      }
    };
    
    document.body.appendChild(script);
  }

  // Initialize everything
  function initStylistWidget() {
    // First load CSS
    loadWidgetStyles();
    
    // Then load the script
    loadWidgetScript();
  }

  // Start the widget injection
  initStylistWidget();
  
  // Expose widget control to the page
  window.__stylistWidgetControl = {
    open: () => {
      if (window.StylistWidget && window.StylistWidget.open) {
        window.StylistWidget.open();
      }
    },
    close: () => {
      if (window.StylistWidget && window.StylistWidget.close) {
        window.StylistWidget.close();
      }
    },
    switchView: (view) => {
      if (window.StylistWidget && window.StylistWidget.switchView) {
        window.StylistWidget.switchView(view);
      }
    }
  };
})();