# Widget Integration Plan

This document outlines how to integrate the newly implemented backend functionality with the existing `public/full-widget.html` UI.

## Current Widget Structure
The widget in `public/full-widget.html` is a complete HTML file with:
1. Inline CSS for styling
2. HTML structure for the widget UI
3. Inline JavaScript at the bottom that handles the widget's functionality

Currently, the widget uses:
- Hardcoded responses for the chat functionality
- Mock data for product recommendations
- A simulated feedback system using localStorage
- Basic UI for virtual try-on with no actual background removal

## Integration Steps

### 1. Add Script References

Replace the current inline script with references to our bundled JavaScript and CSS files at the bottom of the HTML document, just before the closing `</body>` tag:

```html
<!-- Replace inline script with bundled files -->
<link rel="stylesheet" href="stylist-widget.css">
<script src="stylist-widget.js"></script>
```

### 2. Move Configuration to Environment Variables

Add a script block to initialize the widget with environment variables:

```html
<script>
  // Initialize widget with environment settings
  window.STYLIST_CONFIG = {
    apiKey: '${process.env.REACT_APP_STYLIST_API_KEY}',
    apiUrl: '${process.env.REACT_APP_API_URL || "/api"}',
    anthropicApiKey: '${process.env.REACT_APP_ANTHROPIC_API_KEY}',
    removeBgApiKey: '${process.env.REACT_APP_REMOVE_BG_API_KEY}',
    useMockRetailer: ${process.env.REACT_APP_USE_MOCK_RETAILER || 'true'},
    debug: ${process.env.REACT_APP_STYLIST_DEBUG || 'false'}
  };
  
  // Initialize the Stylist widget when the DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    StylistWidget.init({
      selector: '#stylistWidget',
      config: window.STYLIST_CONFIG
    });
  });
</script>
```

### 3. Add Data Attributes for Integration

Add data attributes to key elements to help the JavaScript identify and hook into interface elements:

```html
<!-- Example: Add data attributes to chat interface -->
<div id="chatMessages" data-stylist-component="chat-messages"></div>
<input id="chatInput" data-stylist-component="chat-input">
<button id="sendMessageBtn" data-stylist-component="chat-send">Send</button>

<!-- Example: Add data attributes to try-on interface -->
<div class="tryon-canvas-area" data-stylist-component="try-on-canvas"></div>
<input type="file" id="uploadImageInput" data-stylist-component="try-on-upload">
```

### 4. Add Real API Endpoints and Config

Update any hardcoded API endpoint paths in the HTML to use the real API endpoints:

```html
<!-- Before -->
<form class="recommendation-form" onsubmit="return false;">

<!-- After -->
<form class="recommendation-form" data-stylist-action="get-recommendations" action="/api/v1/recommendations">
```

### 5. Modify The Widget Div for React Mounting

Simplify the main widget container to allow React to render most components:

```html
<div id="stylistWidget" class="stylist-widget">
  <!-- React will mount here, only keep basic structure -->
  <div class="widget-header">
    <div class="widget-title">The Stylist</div>
    <div class="widget-controls">
      <button id="minimizeWidgetBtn" class="control-button">Minimize</button>
      <button id="closeWidgetBtn" class="control-button">Close</button>
    </div>
  </div>
  
  <div id="stylistWidgetContent" class="widget-content-container">
    <!-- React will render all tabs and content here -->
  </div>
</div>
```

## Development Integration Approach

1. First, write a simpler version of the widget that loads React components
2. Create a compatibility layer in `src/integrate.js` that bridges the jQuery-style UI with the new React components
3. Import the same styling to maintain visual consistency but use React for the component behavior
4. Add event handlers to bridge the existing HTML elements with our React components

## Testing Plan

1. Set up a test environment with the modified HTML file
2. Test the widget with different .env settings:
   - With `USE_MOCK_RETAILER=true` to test mock data fallback
   - With real API keys for Claude and Remove.bg to test real services
   - With real retailer API keys to test live data
3. Verify that the widget visually matches the original demo exactly
4. Validate that all functionality works correctly:
   - Chat with Claude AI responding appropriately
   - Recommendation system showing real product data
   - Virtual try-on using background removal
   - Retailer integration loading real products when credentials are available

## Production Preparation

1. Create a special Webpack build script that injects environment variables into the HTML:
   ```javascript
   module.exports = {
     plugins: [
       new HtmlWebpackPlugin({
         template: './src/templates/full-widget.html',
         filename: 'full-widget.html',
         inject: false, // Don't automatically inject scripts
         templateParameters: {
           ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
           REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY || '',
           // Other variables...
         }
       })
     ]
   }
   ```

2. Create pre-configured versions of the widget for different environments:
   - Demo version with mock data
   - Development version with real credentials
   - Production version with sensitive information protected