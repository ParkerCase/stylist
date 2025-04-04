# Launch Instructions

## Set Up Environment

1. Copy the environment variables to `.env`:
   ```bash
   cp stillremaining.txt .env
   ```

2. Make sure `USE_MOCK_RETAILER=true` is set in your `.env` file for demo mode.

## Launch Backend

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

3. Backend runs on http://localhost:8000 by default

## Launch Frontend

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Start the frontend development server:
   ```bash
   npm start
   ```

3. The development server will open at http://localhost:3001

## Production Build

To create a production build:

```bash
npm run build
```

The build files will be in the `/dist` directory.

## Docker Deployment

To deploy using Docker:

```bash
# Build the Docker image
docker build -t thestylist/widget .

# Run the container
docker run -p 80:80 thestylist/widget
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

3. Run E2E tests:
   ```bash
   npm run cypress:open
   ```

## Verify the Setup

To verify that everything is set up correctly:

```bash
# Frontend verification
npm run verify

# Backend verification
python -m stylist.verify
```