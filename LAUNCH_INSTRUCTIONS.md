# Launch Instructions

## Prerequisites

- Node.js 18.x or later
- Python 3.10.x or later
- Redis (optional, for production caching)
- Docker (optional, for containerized deployment)

## Environment Setup

1. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment:
   - For demo mode, ensure `USE_MOCK_RETAILER=true`
   - Set `JWT_SECRET` to a secure random string
   - For AI assistance (optional), set `ANTHROPIC_API_KEY` 
   - For background removal (optional), set `REMOVE_BG_API_KEY` or provide TensorFlow model files

3. Prepare TensorFlow model files (if not using Remove.bg API):
   ```bash
   # Create directory if it doesn't exist
   mkdir -p public/models/segmentation-model
   
   # Download model files (URL needs to be updated to the correct source)
   curl -o public/models/segmentation-model/group1-shard1of1.bin \
     https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/float/050/model-stride16.json
   ```

## Launch Frontend (Quick Demo)

1. Access the prebuilt frontend directly:
   ```bash
   cd dist
   python -m http.server 3001
   ```

2. Open http://localhost:3001 in your browser

## Full Stack Setup (Development)

### Backend Setup

1. Set up the Python package structure:
   ```bash
   mkdir -p stylist/models stylist/services stylist/utils stylist/api stylist/integrations/cache stylist/integrations/retailers
   cp -r models/* stylist/models/
   cp -r services/* stylist/services/
   cp -r utils/* stylist/utils/
   cp -r api/* stylist/api/
   cp -r integrations/* stylist/integrations/
   cp config.py stylist/
   cp main.py stylist/
   touch stylist/__init__.py
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   python -m uvicorn stylist.main:app --reload
   ```

4. Backend runs on http://localhost:8000 by default

### Frontend Development

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Start the frontend development server:
   ```bash
   npm start
   ```

3. The development server will open at http://localhost:3001

## Production Deployment

### Building for Production

1. Create a production build:
   ```bash
   npm run build
   ```

2. The build files will be in the `/dist` directory.

### Docker Deployment

```bash
# Build the Docker image
docker build -t thestylist/widget .

# Run the container
docker run -p 80:80 -p 8000:8000 --env-file .env thestylist/widget
```

## Testing

1. Run frontend tests:
   ```bash
   npm test
   ```

2. Run backend tests:
   ```bash
   pytest tests/
   ```

3. Run E2E tests (requires both frontend and backend running):
   ```bash
   npm run cypress:open
   ```

## Browser Extension

To use the Stylist widget as a browser extension:

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Load the unpacked extension:
   - Chrome: Go to chrome://extensions, enable Developer mode, click "Load unpacked", select the `dist` folder
   - Firefox: Go to about:debugging, click "This Firefox", click "Load Temporary Add-on", select the `manifest.json` file in the `dist` folder

## Verify the Setup

To verify that everything is set up correctly:

```bash
# Frontend verification
npm run verify

# Backend verification
python verify.py
```

## Troubleshooting

### Widget Not Appearing or Functioning
If you see a plain demo page without the interactive widget:

1. Make sure you are running BOTH the backend AND frontend servers:
   ```bash
   # Use the all-in-one script (recommended):
   ./dist/run_app.sh
   
   # Or manually:
   # Terminal 1 - Backend
   python -m uvicorn main:app --reload
   
   # Terminal 2 - Frontend
   cd dist
   python -m http.server 3001
   ```

2. Check that the backend is running by accessing the health endpoint:
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy","version":"1.0.0"}
   ```

3. Open your browser's developer console (F12) and look for any JavaScript errors

4. If you're still having issues, try rebuilding the frontend:
   ```bash
   npm run build
   ```

### Other Common Issues
- **API Connection Issues**: Verify environment variables are correctly set
- **Image Processing Errors**: Check that TensorFlow.js model files are correctly downloaded
- **Authentication Failures**: Verify JWT_SECRET is set and consistent
- **Redis Connection Errors**: Ensure Redis is running or set up MemoryCache fallback
- **Missing Components**: Check the STILL_MISSING.md file for known missing elements