# Stylist Widget API Documentation

This document provides comprehensive documentation for the Stylist Widget API, including initialization options, methods, events, and data structures.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Initialization](#initialization)
3. [Global API Methods](#global-api-methods)
4. [Events](#events)
5. [Data Structures](#data-structures)
6. [Component-Specific APIs](#component-specific-apis)
7. [Retailer Integration API](#retailer-integration-api)
8. [Error Handling](#error-handling)
9. [Advanced Usage](#advanced-usage)

## Getting Started

The Stylist Widget provides a JavaScript API for initialization, configuration, and interaction. Begin by including the Stylist script in your HTML:

```html
<script src="https://cdn.stylist.ai/widget/latest/stylist-widget.js"></script>
```

## Initialization

### Basic Initialization

Initialize the widget with your API key and retailer ID:

```javascript
Stylist.init({
  apiKey: 'YOUR_API_KEY',
  retailerId: 'YOUR_RETAILER_ID'
});
```

### Full Configuration Object

The complete initialization configuration object with all possible options:

```javascript
Stylist.init({
  // Required parameters
  apiKey: 'YOUR_API_KEY',
  retailerId: 'YOUR_RETAILER_ID',
  
  // Widget position and appearance
  position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  primaryColor: '#4361ee',
  widgetSize: 'medium', // small, medium, large
  floatingButtonIcon: 'path/to/icon.png', // Custom floating button icon
  floatingButtonText: 'Style Assistant', // Text for floating button
  classPrefix: 'stylist', // CSS class prefix
  
  // Initial state
  defaultView: 'chat', // Initial view to show
  initiallyOpen: false, // Whether widget starts open or closed
  greeting: 'Hi there! How can I help with your style today?',
  
  // Feature toggles
  enabledFeatures: [
    'chat',
    'quiz',
    'tryOn',
    'closet',
    'social',
    'trending',
    'outfits'
  ],
  
  // API configuration
  apiUrl: 'https://api.stylist.ai',
  apiVersion: 'v1',
  requestTimeout: 30000, // ms
  
  // Chat settings
  chat: {
    // See chat configuration below
  },
  
  // Style quiz settings
  styleQuiz: {
    // See style quiz configuration below
  },
  
  // Virtual try-on settings
  virtualTryOn: {
    // See virtual try-on configuration below
  },
  
  // My closet settings
  myCloset: {
    // See closet configuration below
  },
  
  // Social proof settings
  socialProof: {
    // See social proof configuration below
  },
  
  // Trending items settings
  trendingItems: {
    // See trending items configuration below
  },
  
  // Outfit builder settings
  outfitBuilder: {
    // See outfit builder configuration below
  },
  
  // Retailer integration settings
  retailerIntegration: {
    // See retailer integration configuration below
  },
  
  // User account settings
  userAccount: {
    // See user account configuration below
  },
  
  // Offline mode settings
  offlineMode: {
    // See offline mode configuration below
  },
  
  // Performance settings
  performance: {
    // See performance configuration below
  },
  
  // Accessibility settings
  accessibility: {
    // See accessibility configuration below
  },
  
  // Developer tools settings
  developerTools: {
    // See developer tools configuration below
  },
  
  // Demo mode settings
  demoMode: false,
  demoFlow: 'newUser', // newUser, returning, influencer, powerUser
  
  // Event callbacks
  onInit: function() {},
  onOpen: function() {},
  onClose: function() {},
  onError: function(error) {},
  onAddToCart: function(product) {},
  onViewChange: function(view) {},
  onUserAction: function(action, data) {}
});
```

## Global API Methods

The Stylist global object provides several methods for interacting with the widget:

### Widget Control Methods

```javascript
// Open the widget
Stylist.open();

// Close the widget
Stylist.close();

// Toggle the widget's open state
Stylist.toggle();

// Check if the widget is open
const isOpen = Stylist.isOpen();

// Change the current view
Stylist.changeView('quiz'); // Options: chat, quiz, tryOn, closet, social, trending, outfits

// Get the current view
const currentView = Stylist.getCurrentView();

// Destroy the widget instance (remove from DOM)
Stylist.destroy();

// Reinitialize the widget with new options
Stylist.reinit(options);
```

### Data Methods

```javascript
// Get the user's style profile
Stylist.getStyleProfile().then(profile => {
  console.log(profile);
});

// Get the user's saved items (closet)
Stylist.getClosetItems().then(items => {
  console.log(items);
});

// Get trending items
Stylist.getTrendingItems(category).then(items => {
  console.log(items);
});

// Get recommended items for the user
Stylist.getRecommendations(options).then(recommendations => {
  console.log(recommendations);
});

// Get the user's recently viewed items
Stylist.getRecentlyViewed().then(items => {
  console.log(items);
});
```

### User Account Methods

```javascript
// Check if a user is logged in
const loggedIn = Stylist.isLoggedIn();

// Get the current user (if logged in)
Stylist.getCurrentUser().then(user => {
  console.log(user);
});

// Log a user in
Stylist.login(username, password).then(user => {
  console.log('Logged in as', user.name);
});

// Log a user out
Stylist.logout().then(() => {
  console.log('Logged out');
});

// Register a new user
Stylist.register(userDetails).then(user => {
  console.log('Registered as', user.name);
});
```

### Shopping Methods

```javascript
// Add an item to the cart
Stylist.addToCart(productId, options).then(result => {
  console.log('Added to cart:', result);
});

// Add an item to the wishlist
Stylist.addToWishlist(productId).then(result => {
  console.log('Added to wishlist:', result);
});

// Get the user's cart
Stylist.getCart().then(cart => {
  console.log('Cart:', cart);
});

// Get the user's wishlist
Stylist.getWishlist().then(wishlist => {
  console.log('Wishlist:', wishlist);
});
```

### Utility Methods

```javascript
// Generate a diagnostic report
Stylist.generateDiagnosticReport().then(report => {
  console.log('Diagnostic report:', report);
});

// Clear local storage data
Stylist.clearLocalData().then(() => {
  console.log('Local data cleared');
});

// Check WebGL support for try-on features
Stylist.checkWebGLSupport().then(supported => {
  console.log('WebGL supported:', supported);
});

// Set current language
Stylist.setLanguage('fr');

// Get widget version
const version = Stylist.getVersion();
```

## Events

The Stylist widget emits events that you can listen for:

```javascript
// Listen for an event
Stylist.on('open', function() {
  console.log('Widget opened');
});

// Listen for an event once
Stylist.once('addToCart', function(product) {
  console.log('Product added to cart:', product);
});

// Remove an event listener
Stylist.off('open', myOpenHandler);

// Available events
const EVENTS = {
  // Widget lifecycle events
  INIT: 'init',           // Widget initialized
  OPEN: 'open',           // Widget opened
  CLOSE: 'close',         // Widget closed
  VIEW_CHANGE: 'viewChange', // View changed
  
  // User account events
  LOGIN: 'login',         // User logged in
  LOGOUT: 'logout',       // User logged out
  REGISTER: 'register',   // User registered
  
  // Shopping events
  ADD_TO_CART: 'addToCart',     // Item added to cart
  REMOVE_FROM_CART: 'removeFromCart', // Item removed from cart
  ADD_TO_WISHLIST: 'addToWishlist', // Item added to wishlist
  REMOVE_FROM_WISHLIST: 'removeFromWishlist', // Item removed from wishlist
  CHECKOUT: 'checkout',    // Checkout initiated
  
  // Feature specific events
  QUIZ_COMPLETE: 'quizComplete', // Style quiz completed
  TRY_ON: 'tryOn',        // Virtual try-on used
  OUTFIT_CREATED: 'outfitCreated', // Outfit created
  
  // System events
  ERROR: 'error',         // Error occurred
  NETWORK_STATUS: 'networkStatus', // Network status changed
  STORAGE_CHANGE: 'storageChange' // Local storage changed
};
```

## Data Structures

### Product Object

```typescript
interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  salePrice?: number;
  currency: string;
  url: string;
  imageUrl: string;
  additionalImages?: string[];
  description?: string;
  category: string;
  subcategory?: string;
  attributes: {
    color?: string;
    size?: string;
    material?: string;
    pattern?: string;
    [key: string]: any;
  };
  variants?: ProductVariant[];
  inStock: boolean;
  stockLevel?: number;
  sku?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### User Object

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  preferences?: {
    style?: string[];
    colors?: string[];
    brands?: string[];
    sizes?: Record<string, string>;
    priceRange?: {
      min: number;
      max: number;
    };
  };
  closet?: {
    itemCount: number;
    categories: Record<string, number>;
  };
  wishlist?: {
    itemCount: number;
  };
  activity?: {
    lastLogin: string;
    lastPurchase?: string;
    visitCount: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Style Profile Object

```typescript
interface StyleProfile {
  userId: string;
  primaryStyle: string;
  secondaryStyles: string[];
  colorPreferences: {
    favorite: string[];
    avoid: string[];
  };
  fit: {
    tops: string;
    bottoms: string;
    dresses: string;
  };
  sizeInfo: Record<string, string>;
  occasions: string[];
  brands: {
    favorite: string[];
    disliked: string[];
  };
  priceRange: {
    min: number;
    max: number;
  };
  currentWardrobe: {
    dominant: string;
    missing: string[];
  };
  styleConfidence: number; // 1-10
  createdAt: string;
  updatedAt: string;
}
```

### Outfit Object

```typescript
interface Outfit {
  id: string;
  name: string;
  userId: string;
  items: Product[];
  thumbnail?: string;
  occasion?: string;
  season?: string;
  compatibilityScore?: number;
  isPublic: boolean;
  likes?: number;
  createdAt: string;
  updatedAt: string;
}
```

## Component-Specific APIs

### Chat API

```javascript
// Send a chat message programmatically
Stylist.chat.sendMessage('Show me summer dresses');

// Upload an image to the chat
Stylist.chat.uploadImage(fileObject);

// Share a URL in the chat
Stylist.chat.shareUrl('https://example.com/product');

// Clear chat history
Stylist.chat.clearHistory();

// Get chat history
Stylist.chat.getHistory().then(history => {
  console.log(history);
});
```

### Style Quiz API

```javascript
// Start the style quiz
Stylist.styleQuiz.start();

// Get the quiz results
Stylist.styleQuiz.getResults().then(results => {
  console.log(results);
});

// Reset quiz data
Stylist.styleQuiz.reset();

// Check if the quiz has been completed
Stylist.styleQuiz.isCompleted().then(completed => {
  console.log('Quiz completed:', completed);
});
```

### Virtual Try-On API

```javascript
// Initialize try-on with a product
Stylist.virtualTryOn.init(productId);

// Upload an image for try-on
Stylist.virtualTryOn.uploadImage(fileObject);

// Start the camera for try-on
Stylist.virtualTryOn.startCamera();

// Capture a photo from the camera
Stylist.virtualTryOn.capturePhoto();

// Try on a product on the current image
Stylist.virtualTryOn.tryOnProduct(productId);

// Save the current try-on result
Stylist.virtualTryOn.saveResult();

// Share the current try-on result
Stylist.virtualTryOn.shareResult(options);
```

### My Closet API

```javascript
// Add an item to the closet
Stylist.myCloset.addItem(product);

// Remove an item from the closet
Stylist.myCloset.removeItem(itemId);

// Get all closet items
Stylist.myCloset.getItems().then(items => {
  console.log(items);
});

// Filter closet items by category
Stylist.myCloset.filterByCategory(category).then(items => {
  console.log(items);
});

// Create a collection in the closet
Stylist.myCloset.createCollection(name, items);

// Get all collections
Stylist.myCloset.getCollections().then(collections => {
  console.log(collections);
});
```

## Retailer Integration API

```javascript
// Get the product catalog
Stylist.retailer.getCatalog().then(catalog => {
  console.log(catalog);
});

// Check if a product is in stock
Stylist.retailer.checkStock(productId).then(inStock => {
  console.log('In stock:', inStock);
});

// Get product details
Stylist.retailer.getProductDetails(productId).then(product => {
  console.log(product);
});

// Get related products
Stylist.retailer.getRelatedProducts(productId).then(products => {
  console.log(products);
});

// Register custom data
Stylist.retailer.registerData('cart', cartData);
```

## Error Handling

```javascript
// Global error handler
Stylist.on('error', function(error) {
  console.error('Stylist Widget Error:', error);
});

// Set error handling behavior
Stylist.setErrorHandling({
  retryOnNetworkError: true,
  showErrorMessages: true,
  logErrors: true,
  maxRetries: 3
});

// Get the last error
Stylist.getLastError().then(error => {
  console.log('Last error:', error);
});
```

## Advanced Usage

### Custom Components

You can extend the widget with custom components:

```javascript
// Register a custom component
Stylist.registerComponent('customFeature', {
  render: function(container) {
    const el = document.createElement('div');
    el.textContent = 'Custom Feature';
    container.appendChild(el);
  },
  init: function() {
    console.log('Custom feature initialized');
  },
  destroy: function() {
    console.log('Custom feature destroyed');
  }
});

// Use a custom component
Stylist.init({
  // Other options
  customComponents: ['customFeature']
});
```

### Embedding in Single-Page Applications

For single-page applications, you need to handle the widget lifecycle manually:

```javascript
// React example
import React, { useEffect } from 'react';

function StylistComponent() {
  useEffect(() => {
    // Load the script
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

    // Cleanup
    return () => {
      if (window.Stylist) {
        window.Stylist.destroy();
      }
      document.body.removeChild(script);
    };
  }, []);

  return null;
}

export default StylistComponent;
```

### Advanced Retailer Integration

For custom retailer platforms, you can implement a custom data provider:

```javascript
// Define a custom data provider
const customDataProvider = {
  getProduct: async function(productId) {
    // Custom implementation to fetch product data
    const response = await fetch(`/api/products/${productId}`);
    return response.json();
  },
  getInventory: async function(productId) {
    // Custom implementation to fetch inventory data
    const response = await fetch(`/api/inventory/${productId}`);
    return response.json();
  },
  addToCart: async function(productId, quantity, options) {
    // Custom implementation to add to cart
    const response = await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, options })
    });
    return response.json();
  },
  // Other required methods
};

// Register the custom data provider
Stylist.registerDataProvider('customRetailer', customDataProvider);

// Use the custom data provider
Stylist.init({
  // Other options
  retailerIntegration: {
    platform: 'custom',
    dataProvider: 'customRetailer'
  }
});
```

---

This API documentation provides a comprehensive reference for developers integrating and customizing the Stylist Widget. For specific implementation examples or assistance, please contact Stylist support.