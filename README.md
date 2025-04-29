# The Stylist - Fashion Recommendation Widget

The Stylist is an intelligent fashion recommendation widget that can be embedded into e-commerce websites or used as a browser extension. It provides personalized clothing recommendations, virtual try-on features, and style assistance powered by AI.

## Features

- 👕 **Smart Closet**: Scan and digitize your physical wardrobe
- 🎯 **Personalized Recommendations**: Get clothing suggestions based on your style
- 👗 **Virtual Try-On**: See how items look on your body before purchasing
- 🧠 **AI Style Assistant**: Chat with an AI stylist for fashion advice
- 🔄 **Omnichannel Experience**: Consistent experience across web, mobile, and extension
- 🛍️ **Multi-Retailer Support**: Connect with various e-commerce platforms

## Quick Start

The fastest way to run The Stylist application is using our run script:

```bash
# Make the script executable if it's not already
chmod +x dist/run_app.sh

# Run the application
./dist/run_app.sh
```

This will start both the backend and frontend servers. Then open:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000/api/v1

Alternatively, you can manually start each component:

1. Start the backend server:
   ```bash
   python -m uvicorn main:app --reload
   ```
2. Run the pre-built frontend:
   ```bash
   cd dist
   python -m http.server 3001
   ```
3. Visit http://localhost:3001 in your browser

For full setup instructions, see [LAUNCH_INSTRUCTIONS.md](LAUNCH_INSTRUCTIONS.md).

## Technology Stack

### Frontend
- React with TypeScript
- SCSS for styling
- TensorFlow.js for on-device machine learning
- Zustand for state management

### Backend
- Python with FastAPI
- SQLAlchemy for database models
- Redis for caching (with memory cache fallback)
- JWT for authentication

### Integrations
- Shopify API integration
- WooCommerce API integration
- Generic REST API for other retailers
- Remove.bg API for image background removal (optional)
- Anthropic Claude API for style assistant (optional)

## Architecture

The Stylist consists of several modules:

- **Chat Widget**: Core UI component for interacting with the style assistant
- **Virtual Try-On**: Canvas-based garment visualization on user photos
- **My Closet**: Digital wardrobe management system
- **Lookbook**: Collection of saved outfits and recommendations
- **Retailer API**: Flexible integration layer for e-commerce platforms
- **Recommendation Engine**: AI-based clothing suggestion system

## Documentation

- [LAUNCH_INSTRUCTIONS.md](LAUNCH_INSTRUCTIONS.md) - Setup and deployment guide
- [STILL_MISSING.md](STILL_MISSING.md) - Missing components and configurations
- [WIDGET_ARCHITECTURE_REPORT.md](WIDGET_ARCHITECTURE_REPORT.md) - Detailed architecture overview
- [RETAILER_INTEGRATION_REPORT.md](RETAILER_INTEGRATION_REPORT.md) - Retailer API integration details
- [RECOMMENDATION_ENGINE_REPORT.md](RECOMMENDATION_ENGINE_REPORT.md) - Recommendation system documentation

## Development

To start development:

1. Set up your environment as described in [LAUNCH_INSTRUCTIONS.md](LAUNCH_INSTRUCTIONS.md)
2. Run `npm install` to install frontend dependencies
3. Run `npm start` to start the development server
4. Run backend server with `python -m uvicorn stylist.main:app --reload`

## Testing

- Frontend tests: `npm test`
- Backend tests: `pytest tests/`
- E2E tests: `npm run cypress:open`

## Deployment

### Web Widget

Build the widget for embedding on websites:

```bash
npm run build
```

The output will be in the `dist` directory, with `stylist-widget.js` and `stylist-widget.css` for embedding.

### Browser Extension

Build as a browser extension:

```bash
npm run build:extension
```

Load the unpacked extension from the `dist` directory.

### Docker

Deploy using Docker:

```bash
docker build -t thestylist/widget .
docker run -p 80:80 -p 8000:8000 --env-file .env thestylist/widget
```

## JavaScript API for Embedding

```javascript
// Initialize The Stylist widget
StylistWidget.init({
  apiKey: 'YOUR_API_KEY',        // Required
  retailerId: 'YOUR_RETAILER_ID', // Required
  apiUrl: 'https://api.yourdomain.com', // Optional - Custom API URL
  position: 'bottom-right',       // Optional - Widget position
  primaryColor: '#4361ee',        // Optional - Primary color
  greeting: 'Hi there! I'm your AI style assistant.' // Optional - Custom greeting
});

// Control methods
StylistWidget.open();  // Open the widget
StylistWidget.close(); // Close the widget
StylistWidget.openStyleQuiz(); // Open the style quiz
StylistWidget.openTryOn(); // Open virtual try-on

// Event listeners
StylistWidget.on('recommendation', function(items) {
  console.log('Recommended items:', items);
});
```

## License

MIT