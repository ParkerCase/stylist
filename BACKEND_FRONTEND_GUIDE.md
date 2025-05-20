# Stylist Widget - Backend & Frontend Guide

This document provides instructions for setting up and running both the frontend and backend components of the Stylist Widget with the latest performance optimizations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Running the Full Stack](#running-the-full-stack)
5. [Production Deployment](#production-deployment)
6. [Performance Optimizations](#performance-optimizations)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- pip (Python package manager)
- Git

## Backend Setup

### Installation

1. Set up a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Configuration

1. Create a `.env` file in the project root (or copy from `.env.example` if available):
   ```
   # API Keys and Authentication
   API_KEY=your_api_key
   API_SECRET=your_api_secret
   
   # Database Configuration
   DB_TYPE=sqlite  # or postgres, mysql
   DB_PATH=stylist.db
   
   # Services Configuration
   ENABLE_CACHE=true
   CACHE_TYPE=memory  # or redis
   
   # Development Settings
   DEBUG=true
   LOG_LEVEL=info
   ```

### Running the Backend

There are several ways to run the backend depending on your needs:

1. **Main Production Server**:
   ```bash
   python main.py
   ```
   This runs the full backend with all features at http://localhost:5000

2. **Simple Development Server**:
   ```bash
   python simple_server.py
   ```
   This runs a lightweight version ideal for frontend development

3. **Demo Mode** (with mock data):
   ```bash
   python demo.py
   ```
   This runs with pre-populated mock data for demonstrations

4. **Using the shell script**:
   ```bash
   ./run_server.sh
   ```
   
### Backend API Endpoints

The main backend API endpoints:

- `/api/recommendations` - Get product recommendations
- `/api/user` - User profile management
- `/api/retailer` - Retailer integration endpoints
- `/api/closet` - Manage user closet items
- `/api/inventory` - Access product inventory

## Frontend Setup

### Installation

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

### Development

1. Start the development server:
   ```bash
   npm start
   ```
   This will launch the development server at http://localhost:3000

2. **Alternative development options**:
   ```bash
   npm run start:no-backend  # Run frontend only with mock data
   npm run dev               # Run with hot reloading
   ```

### Testing

1. Run tests:
   ```bash
   npm test               # Run unit tests
   npm run cypress:open   # Open Cypress for E2E testing
   npm run cypress:run    # Run Cypress tests headlessly
   ```

### Building for Production

1. Build with all optimizations:
   ```bash
   npm run build
   ```
   
   The build output will be in the `public/` directory with:
   - Code splitting for optimal loading
   - Minified and compressed assets
   - Service worker for offline capabilities
   - Critical CSS inlined
   
2. Analyze the bundle (optional):
   ```bash
   npm run build:analyze
   ```
   This will show a visualization of the bundle size and composition.

## Running the Full Stack

For the best experience, run both frontend and backend simultaneously:

1. Start the backend (in one terminal):
   ```bash
   python main.py
   ```

2. Start the frontend (in another terminal):
   ```bash
   npm start
   ```

3. Access the application at http://localhost:3000

4. For simplified setup, you can use:
   ```bash
   ./start.sh
   ```
   This script will start both the frontend and backend.

## Production Deployment

### Option 1: Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t stylist-widget -f Dockerfile.production .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:80 stylist-widget
   ```

3. For multi-container deployment:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

### Option 2: Manual Deployment

#### Backend Deployment:

1. Set up a production server (e.g., AWS EC2, DigitalOcean)
2. Install Python and dependencies
3. Configure a production web server (e.g., Nginx, Apache)
4. Set up WSGI with Gunicorn or uWSGI:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:5000
   ```

#### Frontend Deployment:

1. Build the frontend assets:
   ```bash
   npm run build
   ```
2. Serve the static files from the `public/` directory
3. Configure CDN for optimal delivery (see cdn-config.js)

## Performance Optimizations

Our recent performance optimizations include:

### 1. Bundle Optimization
- **Code Splitting**: Major features are split into separate chunks
- **Tree Shaking**: Eliminates unused code
- **Vendor Chunking**: Separates frequently used libraries

### 2. Progressive App Shell
- **Critical CSS**: Inlined for faster initial render
- **Minimal HTML**: Optimized shell for quick startup
- **Deferred Loading**: Non-critical resources load later

### 3. Time to Interactive Improvements
- **Lazy Loading**: Below-the-fold content loads on demand
- **Third-party Deferring**: External scripts load after main content
- **Main Thread Optimization**: Reduced JavaScript execution blocking

### 4. Resource Preloading
- **Critical Resource Hints**: Preloads essential fonts and scripts
- **Prefetching**: Loads likely next resources during idle time
- **Preconnect**: Establishes early connections to required origins

## Troubleshooting

### Common Issues

1. **Backend API Connection Issues**:
   - Verify backend is running at http://localhost:5000
   - Check browser console for CORS errors
   - Ensure proxy settings in webpack.config.js are correct

2. **Frontend Build Failures**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check for TypeScript errors: `npm run lint`
   - Try with increased memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

3. **Performance Issues**:
   - Disable debug mode in production
   - Ensure service worker is properly registered
   - Check for render-blocking resources with browser DevTools

### Debugging Tools

1. Run diagnostics:
   ```bash
   npm run diagnose
   python verify.py
   ```

2. Check logs:
   - Frontend: Browser console
   - Backend: `backend.log` or terminal output

3. Verify API connectivity:
   ```bash
   curl http://localhost:5000/api/health
   ```

For more detailed troubleshooting, see TROUBLESHOOTING.md.