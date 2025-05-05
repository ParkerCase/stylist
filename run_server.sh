#!/bin/bash
# Script to run both backend and frontend servers

# Check if a port is provided as an argument for the frontend server
FE_PORT=${1:-8080}
BE_PORT=8000

# Kill any existing processes on these ports
kill $(lsof -t -i:$BE_PORT) >/dev/null 2>&1 || true
kill $(lsof -t -i:$FE_PORT) >/dev/null 2>&1 || true

# Set up cleanup function
cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID >/dev/null 2>&1 || true
  exit 0
}

# Register cleanup function on script exit
trap cleanup INT TERM EXIT

# Start the backend server in the background
echo "Starting backend server on port $BE_PORT..."
python main.py &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Verify backend is running - give it more time to fully start up
sleep 3
if ! curl -s http://localhost:$BE_PORT/health > /dev/null; then
  echo "Warning: Backend server may not be running properly!"
  echo "Check the logs above for potential errors."
else
  echo "Backend server running successfully"
fi

# Start the frontend server
echo "Starting frontend server on port $FE_PORT..."
echo "Access the demo at: http://localhost:$FE_PORT/public/full-widget.html"
echo "Press Ctrl+C to stop both servers"

# Start the frontend server
cd "$(dirname "$0")"
python -m http.server $FE_PORT