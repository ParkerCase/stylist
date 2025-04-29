#!/bin/bash
# Simple script to start a Python HTTP server on port 5000

# Check if a port is provided as an argument
PORT=${1:-5000}

echo "Starting server on port $PORT..."
echo "Access the demo at: http://localhost:$PORT/public/full-widget.html"
echo "Press Ctrl+C to stop the server"

# Start the server
cd "$(dirname "$0")"
python -m http.server $PORT