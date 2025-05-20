# Stylist Widget Setup Instructions

This document provides detailed instructions for setting up, configuring, and deploying the Stylist Widget for production use.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
   - [Basic Configuration](#basic-configuration)
   - [Advanced Configuration](#advanced-configuration)
   - [Environment Variables](#environment-variables)
4. [Development Setup](#development-setup)
5. [Production Deployment](#production-deployment)
   - [Build Process](#build-process)
   - [CDN Deployment](#cdn-deployment)
   - [Self-Hosting](#self-hosting)
6. [Retailer Integration](#retailer-integration)
   - [Shopify Integration](#shopify-integration)
   - [WooCommerce Integration](#woocommerce-integration)
   - [Custom E-commerce Platform](#custom-e-commerce-platform)
7. [Widget Embedding](#widget-embedding)
8. [Running Demo Mode](#running-demo-mode)

## Prerequisites

Before installing the Stylist Widget, ensure you have the following:

- Node.js (v16 or later)
- npm (v7 or later) or yarn (v1.22 or later)
- API key from the Stylist dashboard
- Retailer ID from your account
- Access to your website's code or CMS

## Installation

### Using npm:

```bash
# Install the Stylist Widget package
npm install @stylist/widget --save
```

### Using yarn:

```bash
# Install the Stylist Widget package
yarn add @stylist/widget
```

### Direct Script Include:

If you prefer to include the widget directly in your HTML:

```html
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
```

## Configuration

### Basic Configuration

Create a configuration file in your project root:

```javascript
// stylist-config.js
module.exports = {
  apiKey: 'YOUR_API_KEY',
  retailerId: 'YOUR_RETAILER_ID',
  position: 'bottom-right', // Options: bottom-right, bottom-left, top-right, top-left
  primaryColor: '#4361ee' // Your brand's primary color
};
```

### Advanced Configuration

Extended configuration options:

```javascript
// stylist-config.js
module.exports = {
  // Required settings
  apiKey: 'YOUR_API_KEY',
  retailerId: 'YOUR_RETAILER_ID',
  
  // UI customization
  position: 'bottom-right',
  primaryColor: '#4361ee',
  greeting: 'Welcome to our store! How can I help you today?',
  
  // Feature toggles
  enableOfflineMode: true,
  showOfflineIndicator: true,
  showDebugToggle: false, // Set to true only for testing
  
  // API configuration
  apiUrl: 'https://api.stylist.ai', // Custom API endpoint if needed
  
  // Performance settings
  lazyLoad: true,
  prefetchAssets: true,
  cacheTimeout: 3600, // Cache timeout in seconds
  
  // Demo mode (for presentations only)
  demoMode: false,
  demoFlow: 'newUser' // Options: newUser, returning, influencer, powerUser
};
```

### Environment Variables

You can also configure the widget using environment variables:

```
STYLIST_API_KEY=your_api_key
STYLIST_RETAILER_ID=your_retailer_id
STYLIST_API_URL=https://api.stylist.ai
STYLIST_PRIMARY_COLOR=#4361ee
```

Create a `.env` file in your project root for local development:

```
# .env
STYLIST_API_KEY=your_api_key
STYLIST_RETAILER_ID=your_retailer_id
```

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/stylist-widget.git
cd stylist-widget
```

2. Install dependencies:

```bash
npm install
# or
yarn
```

3. Create a `.env` file with your configuration (see Environment Variables section).

4. Start the development server:

```bash
npm run dev
# or
yarn dev
```

5. The development server will start at `http://localhost:3000`

## Production Deployment

### Build Process

1. Build the widget for production:

```bash
npm run build
# or
yarn build
```

2. The build output will be in the `dist/` directory.

### CDN Deployment

1. Upload the contents of the `dist/` directory to your CDN provider.

2. Make sure the main script (`stylist-widget.js`) and other assets are publicly accessible.

3. Include the widget in your website using the CDN URL:

```html
<script src="https://your-cdn.com/path/to/stylist-widget.js"></script>
<script>
  Stylist.init({
    apiKey: 'YOUR_API_KEY',
    retailerId: 'YOUR_RETAILER_ID'
  });
</script>
```

### Self-Hosting

1. Copy the contents of the `dist/` directory to your web server.

2. Include the widget in your website:

```html
<script src="/path/to/stylist-widget.js"></script>
<script>
  Stylist.init({
    apiKey: 'YOUR_API_KEY',
    retailerId: 'YOUR_RETAILER_ID'
  });
</script>
```

## Retailer Integration

### Shopify Integration

1. Go to your Shopify admin dashboard.

2. Navigate to Online Store → Themes → Edit HTML/CSS.

3. Add the following code to your theme.liquid file, just before the closing `</body>` tag:

```html
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
<script>
  Stylist.init({
    apiKey: 'YOUR_API_KEY',
    retailerId: 'YOUR_RETAILER_ID',
    // Optional: Integrate with Shopify user data
    shopifyIntegration: true
  });
</script>
```

4. Save the changes.

### WooCommerce Integration

1. Go to your WordPress admin dashboard.

2. Navigate to Appearance → Theme Editor.

3. Edit your theme's footer.php file and add the following code before the closing `</body>` tag:

```php
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
<script>
  Stylist.init({
    apiKey: '<?php echo esc_attr(get_option('stylist_api_key')); ?>',
    retailerId: '<?php echo esc_attr(get_option('stylist_retailer_id')); ?>',
    // Optional: Integrate with WooCommerce user data
    wooCommerceIntegration: true
  });
</script>
```

4. Save the changes.

### Custom E-commerce Platform

For custom e-commerce platforms, follow these steps:

1. Include the Stylist widget script in your website's HTML:

```html
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
```

2. Initialize the widget with your configuration:

```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    Stylist.init({
      apiKey: 'YOUR_API_KEY',
      retailerId: 'YOUR_RETAILER_ID',
      // Add any custom integration data
      customData: {
        userId: 'USER_ID', // If available
        cartId: 'CART_ID', // If available
        pageType: 'product' // Current page type
      }
    });
  });
</script>
```

## Widget Embedding

### Basic Embedding

Add the following code to your website's HTML, just before the closing `</body>` tag:

```html
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
<script>
  Stylist.init({
    apiKey: 'YOUR_API_KEY',
    retailerId: 'YOUR_RETAILER_ID'
  });
</script>
```

### Advanced Embedding

For more control over when and how the widget loads:

```html
<script>
  // Load the Stylist widget asynchronously
  (function(w, d, s, id) {
    if (w.Stylist) return;
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://cdn.stylist.ai/widget/latest/stylist-widget.js";
    js.onload = function() {
      w.Stylist.init({
        apiKey: 'YOUR_API_KEY',
        retailerId: 'YOUR_RETAILER_ID',
        // Only show on specific pages
        showOn: ['product', 'category', 'cart'],
        // Additional configuration
        position: 'bottom-right',
        primaryColor: '#4361ee'
      });
    };
    fjs.parentNode.insertBefore(js, fjs);
  }(window, document, 'script', 'stylist-js'));
</script>
```

### Embedding in React Applications

```jsx
import React, { useEffect } from 'react';

const StylistWidgetLoader = () => {
  useEffect(() => {
    // Load the Stylist widget
    const script = document.createElement('script');
    script.src = 'https://cdn.stylist.ai/widget/latest/stylist-widget.js';
    script.async = true;
    script.onload = () => {
      window.Stylist.init({
        apiKey: process.env.REACT_APP_STYLIST_API_KEY,
        retailerId: process.env.REACT_APP_STYLIST_RETAILER_ID
      });
    };
    document.body.appendChild(script);

    // Cleanup on component unmount
    return () => {
      document.body.removeChild(script);
      if (window.Stylist && window.Stylist.destroy) {
        window.Stylist.destroy();
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default StylistWidgetLoader;
```

## Running Demo Mode

The Stylist Widget includes a special demo mode for presentations and training:

1. Enable demo mode in your configuration:

```javascript
Stylist.init({
  apiKey: 'YOUR_API_KEY',
  retailerId: 'YOUR_RETAILER_ID',
  demoMode: true,
  demoFlow: 'newUser' // Choose from: newUser, returning, influencer, powerUser
});
```

2. The demo guide will appear next to the widget, providing step-by-step instructions for the selected demo flow.

3. Follow the guide to demonstrate the widget's features and functionality.

4. You can switch between different demo flows using the dropdown in the demo guide.

5. To exit demo mode, close the demo guide or reload the page and initialize without demo mode.