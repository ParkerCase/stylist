# The Stylist - Chat Widget

A JavaScript chat widget for The Stylist AI-powered shopping assistant.

## Overview

This is the frontend implementation for The Stylist project, providing an embeddable chat widget that retailers can add to their websites. The widget provides AI-powered fashion recommendations based on user preferences.

## Features

- Responsive chat interface
- Real-time product recommendations
- Complete outfit suggestions
- Style quiz for preference gathering
- User feedback collection
- Easy integration for retailers

## Installation

### Using NPM

```bash
npm install stylist-widget
```

### Using CDN

```html
<script src="https://cdn.thestylist.ai/stylist-widget.js"></script>
<link rel="stylesheet" href="https://cdn.thestylist.ai/stylist-widget.css">
```

## Usage

### Basic Integration

Add the following code to your website:

```html
<script>
  // Initialize The Stylist widget
  window.StylistWidget.init({
    apiKey: 'YOUR_API_KEY',
    retailerId: 'YOUR_RETAILER_ID'
  });
</script>
```

### Configuration Options

```javascript
StylistWidget.init({
  apiKey: 'YOUR_API_KEY',        // Required
  retailerId: 'YOUR_RETAILER_ID', // Required
  apiUrl: 'https://api.yourdomain.com', // Optional - Custom API URL
  position: 'bottom-right',       // Optional - Widget position
  primaryColor: '#4361ee',        // Optional - Primary color
  greeting: 'Hi there! I'm your AI style assistant.' // Optional - Custom greeting
});
```

### JavaScript API

```javascript
// Open the widget
StylistWidget.open();

// Close the widget
StylistWidget.close();
```

## Development

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

### Building

```bash
npm run build
```

This will create a production-ready build in the `dist` folder.

## License

MIT
```
