# The Stylist – AI-Powered Fashion Assistant

_This project has two audiences: (1) internal developers building The Stylist platform, and (2) external retailers embedding the chat widget. Both sets of instructions are included here._

---

## 🧠 Internal Developer Overview

The Stylist is a full-stack AI-powered personal styling platform that provides highly personalized fashion recommendations to users based on:

- Closet items they already own (uploaded manually)
- Their responses to a 20-question Style Quiz
- Likes and dislikes of outfits
- Celebrities or influencers they follow
- Live inventory data from partnered retailers

### 🎯 Core Features

- AI-powered outfit suggestions from closet, quiz, and preferences
- Chat interface powered by Claude Sonnet 3.5
- Real-time retailer API inventory syncing
- Background-removed virtual try-ons (Remove.bg + TensorFlow.js)
- Custom quiz and social-proof celebrity matching logic
- Dockerized backend + frontend with deployable infra

### 🗂 Project Structure

- `/api`: API routes for recommendations, retailer configuration, and inventory
- `/integrations`: Retailer API clients and cache implementation
- `/models`: Core data models for clothing, users, and recommendations
- `/services`: Business logic for recommendations and style analysis
- `/src`: React frontend with components, hooks, and stores
- `/public`: Static assets and TensorFlow.js models

### 🛠 Developer Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt

# Set up environment variables
cp stillremaining.txt .env
# Edit .env with your API keys
```

To run locally:

```bash
# Frontend
npm start

# Backend
uvicorn main:app --reload
```

Docker-based deployment:

```bash
# Build and run with Docker
docker build -t thestylist/widget .
docker run -p 80:80 thestylist/widget
```

### 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
pytest tests/

# E2E tests
npm run cypress:open
```

---

## 💬 Chat Widget – External Retailer Guide

### Overview

This is the frontend implementation for The Stylist project, providing an embeddable chat widget that retailers can add to their websites. The widget provides AI-powered fashion recommendations based on user preferences.

### Features

- Responsive chat interface
- Real-time product recommendations
- Complete outfit suggestions
- Style quiz for preference gathering
- User feedback collection
- Virtual try-on with background removal
- Easy integration for retailers

### Installation

#### Using NPM

```bash
npm install stylist-widget
```

#### Using CDN

```html
<script src="https://cdn.thestylist.ai/stylist-widget.js"></script>
<link rel="stylesheet" href="https://cdn.thestylist.ai/stylist-widget.css">
```

### Basic Usage

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

// Check if the widget is open
const isOpen = StylistWidget.isOpen();

// Add an event listener
StylistWidget.on('recommendation', function(items) {
  console.log('Recommended items:', items);
});

// Trigger the style quiz
StylistWidget.openStyleQuiz();

// Open the virtual try-on feature
StylistWidget.openTryOn();
```

### Local Dev (for Devs Only)

```bash
npm install
npm start
npm run build
```

---

## 📋 Environment Setup

All required environment variables are documented in `stillremaining.txt`. Copy this file to `.env` and fill in the values:

```bash
cp stillremaining.txt .env
# Edit .env with your API keys and configuration
```

Key environment variables:

```
REMOVE_BG_API_KEY=               # Required for background removal
ANTHROPIC_API_KEY=               # Required for Claude integration
STYLIST_API_KEY=                 # API authentication
```

The TensorFlow.js model for background removal needs to be downloaded separately. See instructions in `/public/models/segmentation-model/README.md`.

### ✅ At Completion

When all setup is finished, you can run the following to verify the setup:

```bash
# Frontend verification
npm run verify

# Backend verification
python -m stylist.verify

# If everything is set up correctly, you'll see:
PROJECT IS READY FOR TESTING
```

---

## 🚀 Deployment

The project includes Docker and GitHub Actions configurations for CI/CD:

1. The GitHub workflow in `.github/workflows/ci-cd.yml` runs tests and builds the Docker image
2. The Docker image is pushed to Docker Hub and deployed to AWS Lambda
3. You need to configure the following secrets in your GitHub repository:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `ECR_REGISTRY`

## 🪪 License

MIT