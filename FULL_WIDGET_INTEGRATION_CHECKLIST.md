# Full Widget Integration Checklist

This document provides a comprehensive integration guide for implementing all FashionAI features in the `public/full-widget.html` file. Follow these steps to ensure all components are properly integrated.

## Table of Contents

- [Configuration Setup](#configuration-setup)
- [Root Container & Mount Points](#root-container--mount-points)
- [React Component Integration](#react-component-integration)
- [Feature-Specific Implementations](#feature-specific-implementations)
  - [AI Recommendation Engine](#ai-recommendation-engine)
  - [Closet & Wishlist](#closet--wishlist)
  - [Style Quiz](#style-quiz)
  - [Social Proof (Celebrity Fashion)](#social-proof-celebrity-fashion)
  - [Try-On Mode](#try-on-mode)
  - [Chat Assistant](#chat-assistant)
- [Configuration Toggles](#configuration-toggles)

## Configuration Setup

Add the configuration script before loading the widget. This enables all features and sets API connection details:

```html
<script>
  // FashionAI Configuration
  window.STYLIST_CONFIG = {
    // API Configuration
    apiKey: "YOUR_API_KEY", // Required - API key for authentication
    retailerId: "DEFAULT_RETAILER_ID", // Required - Retailer identifier
    apiUrl: "https://api.example.com/stylist/api", // Optional - Override default API URL

    // Feature Flags
    useMockData: true, // Set to false to use real recommendation engine
    useClaudeDemo: true, // Set to false to use production Claude API
    requireAuth: false, // Set to true to require user authentication
    
    // UI Customization
    primaryColor: "#000000", // Primary theme color (default is black)
    position: "bottom-right", // Widget position: bottom-right, bottom-left, top-right, top-left
    greeting: "Hi there! I'm your AI style assistant. How can I help you today?"
  };
</script>
```

## Root Container & Mount Points

Replace the existing implementation with proper React mount points. Update the HTML structure as follows:

```html
<!-- Main widget container - replace the current widget implementation -->
<div id="stylist-root" class="stylist-widget-root"></div>

<!-- Modal containers (for Style Quiz, Try-On, etc.) -->
<div id="stylist-modals"></div>

<!-- Toast/notification container -->
<div id="stylist-notifications"></div>
```

## React Component Integration

Add the necessary scripts to load the React components:

```html
<!-- Add this just before the closing </body> tag -->
<script src="/stylist-widget.js"></script>
<script>
  // Initialize the widget once the script has loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Get config from window.STYLIST_CONFIG or use defaults
    const config = window.STYLIST_CONFIG || {
      apiKey: "demo_key",
      retailerId: "demo_retailer",
      useMockData: true
    };
    
    // Initialize widget
    if (window.StylistWidget) {
      window.StylistWidget.init(config);
      
      // Optional: Auto-open the widget
      // window.StylistWidget.open();
    }
  });
  
  // Connect the "Open Stylist Widget" button to the widget
  document.getElementById('openWidgetBtn').addEventListener('click', function() {
    if (window.StylistWidget) {
      window.StylistWidget.open();
    }
  });
</script>
```

## Feature-Specific Implementations

### AI Recommendation Engine

Add a dedicated "Generate Suggestions" button that triggers the recommendation engine:

```html
<!-- Replace the current widget-content implementation with this -->
<div class="widget-content">
  <div id="recommendation-trigger" style="text-align: center; padding: 20px;">
    <button class="generate-button" id="generateSuggestionsBtn">
      Generate Style Suggestions
    </button>
  </div>
  
  <!-- This div will be populated by the React Lookbook component -->
  <div id="stylist-lookbook-container"></div>
</div>

<!-- Add this script at the bottom -->
<script>
  // Connect Generate Suggestions button
  document.getElementById('generateSuggestionsBtn').addEventListener('click', function() {
    // Show loading state
    this.innerHTML = 'Generating...';
    this.disabled = true;
    
    // Function to get recommendations based on user profile
    const getRecommendations = () => {
      // This will call the actual API in the React component
      if (window.StylistWidget) {
        // Open widget if not already open
        window.StylistWidget.open();
        
        // Switch to lookbook view
        window.StylistWidget.switchView('lookbook');
        
        // Send message to chatbot to request recommendations
        if (window.__STYLIST_STORE__?.chat) {
          const message = {
            type: 'user',
            text: 'Show me some outfit recommendations'
          };
          window.__STYLIST_STORE__.chat.sendMessage(message);
        }
      }
      
      // Reset button
      this.innerHTML = 'Generate Style Suggestions';
      this.disabled = false;
    };
    
    // Delay for a moment to show the loading state
    setTimeout(getRecommendations, 1000);
  });
</script>
```

### Closet & Wishlist

Add the integration hooks for the Closet and Wishlist components:

```html
<!-- Add to the widget-content div, before the recommendation trigger -->
<div id="closet-container" class="tab-content">
  <!-- React My Closet component will be mounted here -->
</div>

<div id="wishlist-container" class="tab-content">
  <!-- React Wishlist component will be mounted here -->
</div>

<!-- Update the hub menu to properly connect to the React components -->
<script>
  // Make sure hub menu items trigger the correct views
  document.querySelectorAll('.hub-item').forEach(item => {
    item.addEventListener('click', function() {
      const tab = this.getAttribute('data-tab');
      
      // Update active classes
      document.querySelectorAll('.hub-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      // Update content visibility
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      // Map tabs to React component views
      switch(tab) {
        case 'closet':
          if (window.StylistWidget) {
            window.StylistWidget.open();
            // Tell the widget to show My Closet tab
            if (window.__STYLIST_STORE__?.chat) {
              window.__STYLIST_STORE__.chat.setCurrentView('lookbook');
              // Wait for view to switch
              setTimeout(() => {
                // Find and click the My Closet tab in the Lookbook component
                const closetTab = document.querySelector('.stylist-lookbook__tab:nth-child(3)');
                if (closetTab) closetTab.click();
              }, 300);
            }
          }
          break;
        case 'wishlist':
          if (window.StylistWidget) {
            window.StylistWidget.open();
            // Tell the widget to show Wishlist tab
            if (window.__STYLIST_STORE__?.chat) {
              window.__STYLIST_STORE__.chat.setCurrentView('lookbook');
              // Wait for view to switch
              setTimeout(() => {
                // Find and click the Wishlist tab in the Lookbook component
                const wishlistTab = document.querySelector('.stylist-lookbook__tab:nth-child(4)');
                if (wishlistTab) wishlistTab.click();
              }, 300);
            }
          }
          break;
        // Handle other tabs similarly
      }
    });
  });
</script>
```

### Style Quiz

Add integration for the Style Quiz:

```html
<!-- Add to the widget-content div -->
<div id="quiz-container" class="tab-content">
  <!-- React Style Quiz component will be mounted here -->
</div>

<!-- Add script to trigger the Style Quiz -->
<script>
  // Connect the quiz hub menu item
  document.querySelector('.hub-item[data-tab="quiz"]').addEventListener('click', function() {
    if (window.StylistWidget) {
      window.StylistWidget.open();
      window.StylistWidget.openStyleQuiz();
    }
  });
</script>
```

### Social Proof (Celebrity Fashion)

Add the integration for Social Proof (Celebrity Fashion):

```html
<!-- Add to the widget-content div -->
<div id="social-proof-container" class="tab-content">
  <!-- React Social Proof component will be mounted here -->
</div>

<!-- Add to the trending tab section -->
<script>
  document.querySelector('.hub-item[data-tab="trending"]').addEventListener('click', function() {
    if (window.StylistWidget) {
      window.StylistWidget.open();
      // Tell the widget to show Trending tab
      if (window.__STYLIST_STORE__?.chat) {
        window.__STYLIST_STORE__.chat.setCurrentView('lookbook');
        // Wait for view to switch
        setTimeout(() => {
          // Find and click the Trending tab in the Lookbook component
          const trendingTab = document.querySelector('.stylist-lookbook__tab:nth-child(3)');
          if (trendingTab) trendingTab.click();
        }, 300);
      }
    }
  });
</script>
```

### Try-On Mode

Add Try-On Mode integration:

```html
<!-- Add to the widget-content div -->
<div id="try-on-container" class="tab-content">
  <!-- React Try-On component will be mounted here -->
</div>

<!-- Add the Try-On modal container -->
<div id="try-on-modal-container"></div>

<!-- Add script to trigger Try-On -->
<script>
  // Connect the Try-On hub menu item
  document.querySelector('.hub-item[data-tab="tryOn"]').addEventListener('click', function() {
    if (window.StylistWidget) {
      window.StylistWidget.open();
      window.StylistWidget.openVirtualTryOn();
    }
  });
  
  // Also connect try-on buttons in product cards
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('try-on-button')) {
      const itemId = e.target.getAttribute('data-item-id');
      if (itemId && window.StylistWidget) {
        window.StylistWidget.open();
        
        // Find the item in the store and trigger try-on
        if (window.__STYLIST_STORE__?.recommendations?.recommendedItems) {
          const items = window.__STYLIST_STORE__.recommendations.recommendedItems;
          const item = items.find(i => i.id === itemId);
          if (item) {
            // Send message to trigger try-on for this item
            if (window.__STYLIST_STORE__?.chat) {
              const message = {
                type: 'user',
                text: `I want to try on ${item.name}`
              };
              window.__STYLIST_STORE__.chat.sendMessage(message);
            }
          }
        }
      }
    }
  });
</script>
```

### Chat Assistant

Add Chat Assistant integration:

```html
<!-- Add to the widget-content div -->
<div id="chat-container" class="tab-content active">
  <!-- React Chat component will be mounted here -->
</div>

<!-- Add script for chat interactions -->
<script>
  // Connect the Chat hub menu item
  document.querySelector('.hub-item[data-tab="chat"]').addEventListener('click', function() {
    if (window.StylistWidget) {
      window.StylistWidget.open();
      window.StylistWidget.switchView('chat');
    }
  });
  
  // Optional: Add demo questions for the chat assistant
  const demoQuestions = [
    "What outfits would work for a summer wedding?",
    "Can you recommend a business casual look?",
    "What are the current fashion trends?",
    "How do I style a white shirt?",
    "What colors go well with navy blue?"
  ];
  
  // Populate chat suggestions if desired
  function addChatSuggestions() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'chat-suggestions';
      suggestionsDiv.innerHTML = `
        <div class="suggestions-title">Try asking:</div>
        <div class="suggestions-list">
          ${demoQuestions.map(q => `<div class="suggestion-pill">${q}</div>`).join('')}
        </div>
      `;
      chatContainer.appendChild(suggestionsDiv);
      
      // Add event listeners to suggestions
      suggestionsDiv.querySelectorAll('.suggestion-pill').forEach((pill, i) => {
        pill.addEventListener('click', function() {
          if (window.StylistWidget && window.__STYLIST_STORE__?.chat) {
            const message = {
              type: 'user',
              text: demoQuestions[i]
            };
            window.__STYLIST_STORE__.chat.sendMessage(message);
          }
        });
      });
    }
  }
</script>
```

## Configuration Toggles

Add support for all configuration toggles by updating the initialization script:

```html
<script>
  // Enhanced initialization function with full configuration support
  function initStylistWidget() {
    const defaultConfig = {
      apiKey: "demo_key",
      retailerId: "demo_retailer",
      apiUrl: "https://api.stylist.ai/v1",
      useMockData: true,
      useClaudeDemo: true,
      requireAuth: false,
      primaryColor: "#000000",
      position: "bottom-right",
      greeting: "Hi there! I'm your AI style assistant. How can I help you today?"
    };
    
    // Get user config from window.STYLIST_CONFIG
    const userConfig = window.STYLIST_CONFIG || {};
    
    // Merge configs, with user config taking precedence
    const config = {
      ...defaultConfig,
      ...userConfig
    };
    
    // Apply mock data settings
    if (config.useMockData) {
      console.log("Using mock data for recommendations");
      
      // Update environment variables
      if (process && process.env) {
        process.env.REACT_APP_FORCE_DEMO_MODE = "true";
      }
    }
    
    // Apply Claude demo settings
    if (config.useClaudeDemo) {
      console.log("Using Claude demo mode");
      
      if (process && process.env) {
        process.env.REACT_APP_USE_CLAUDE_DEMO = "true";
      }
    }
    
    // Apply API settings
    if (config.anthropicApiKey) {
      if (process && process.env) {
        process.env.REACT_APP_ANTHROPIC_API_KEY = config.anthropicApiKey;
      }
    }
    
    // Initialize widget
    if (window.StylistWidget) {
      window.StylistWidget.init(config);
    }
  }
  
  // Run initialization when document is ready
  document.addEventListener('DOMContentLoaded', initStylistWidget);
</script>
```

## Complete Integration Example

Here's a minimal complete example showing just the key changes needed:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stylist Full Widget Demo</title>
    <!-- Keep existing styles -->
    
    <!-- Add FashionAI Configuration -->
    <script>
      window.STYLIST_CONFIG = {
        apiKey: "demo_key",
        retailerId: "demo_retailer",
        apiUrl: "https://api.stylist.ai/v1",
        useMockData: true,
        useClaudeDemo: true, 
        primaryColor: "#000000",
        position: "bottom-right"
      };
    </script>
  </head>
  <body>
    <div class="demo-container">
      <h1>Stylist Full Widget Demo</h1>
      <p>
        Click the button below to open the complete stylist widget with all
        features:
      </p>
      <button class="open-button" id="openWidgetBtn">
        Open Stylist Widget
      </button>
    </div>

    <!-- Replace the current widget div with this React mount point -->
    <div id="stylist-root"></div>
    
    <!-- Add modal and notification containers -->
    <div id="stylist-modals"></div>
    <div id="stylist-notifications"></div>
    
    <!-- Load the widget script -->
    <script src="/stylist-widget.js"></script>
    
    <!-- Initialize widget -->
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Initialize widget when script is loaded
        if (window.StylistWidget) {
          window.StylistWidget.init(window.STYLIST_CONFIG || {
            apiKey: "demo_key",
            retailerId: "demo_retailer"
          });
        }
        
        // Connect button
        document.getElementById('openWidgetBtn').addEventListener('click', function() {
          if (window.StylistWidget) {
            window.StylistWidget.open();
          }
        });
      });
    </script>
  </body>
</html>
```

## Important Notes

1. The implementation above replaces the current manual HTML implementation with proper React component integration
2. Make sure to include the `/stylist-widget.js` script which contains all the React components
3. Set the correct API key and retailer ID in the configuration
4. Use the configuration toggles to switch between mock data and real API usage
5. Test all features after integration to ensure they work correctly

This implementation will provide a full-featured widget with all the requested capabilities:
- AI Recommendation Engine
- Closet & Wishlist functionality
- Style Quiz
- Social Proof (Celebrity Fashion)
- Try-On Mode
- Chat Assistant
- Mode Toggles for demo/production switching