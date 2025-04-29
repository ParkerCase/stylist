#!/bin/bash

# Kill any existing processes
pkill -f "uvicorn main:app" || true
pkill -f "python3 -m http.server 3001" || true

# Wait for processes to terminate
sleep 2

# Start the backend server
echo "Starting backend server..."
cd "$(dirname "$0")"
/opt/anaconda3/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 3

# Start the frontend server
echo "Starting frontend server..."
cd "$(dirname "$0")/dist"
python3 -m http.server 3001 &
FRONTEND_PID=$!

echo "The Stylist is now running"
echo "Backend API: http://localhost:8000/api"
echo "Frontend Demo: http://localhost:3001"
echo "Press Ctrl+C to stop both servers"

# Set up cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Keep the script running
wait