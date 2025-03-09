(function() {
    // Configuration
    const WIDGET_URL = 'https://cdn.thestylist.ai/stylist-widget.js';
    const CSS_URL = 'https://cdn.thestylist.ai/stylist-widget.css';
    
    // Load CSS
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = CSS_URL;
    document.head.appendChild(styleLink);
    
    // Load Widget Script
    const script = document.createElement('script');
    script.src = WIDGET_URL;
    script.async = true;
    script.onload = function() {
      // Initialize The Stylist widget with configuration
      if (window.StylistWidget && window.StylistWidget.init) {
        window.StylistWidget.init({
          apiKey: "RETAILER_API_KEY", // Replace with your actual API key
          retailerId: "RETAILER_ID",   // Replace with your retailer ID
          position: "bottom-right",    // Widget position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
          primaryColor: "#4361ee",     // Primary brand color
          greeting: "Hi there! I'm your AI style assistant. How can I help you today?",
        });
      }
    };
    
    document.body.appendChild(script);
  })();
  