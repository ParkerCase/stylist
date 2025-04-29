#\!/bin/bash

# This script runs both the frontend and backend of The Stylist application

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kill background processes when the script exits
trap "exit" INT TERM
trap "kill 0" EXIT

# Change to the project root directory
cd "$(dirname "$0")/.."

echo -e "${BLUE}=== Starting The Stylist Application ===${NC}"

# Start the backend server
echo -e "${GREEN}Starting backend server...${NC}"
# Use anaconda's uvicorn directly since it's installed there
if command -v /opt/anaconda3/bin/uvicorn &> /dev/null; then
    /opt/anaconda3/bin/uvicorn main:app --reload --port 8000 &
elif command -v uvicorn &> /dev/null; then
    uvicorn main:app --reload --port 8000 &
elif command -v python3 &> /dev/null; then
    python3 -m uvicorn main:app --reload --port 8000 &
else
    echo "Python with uvicorn not found. Please install with 'pip install uvicorn'"
    exit 1
fi

# Wait for backend to initialize
sleep 2

# Start the frontend server
echo -e "${GREEN}Starting frontend server...${NC}"
# Use dist directory (where webpack builds to) instead of public
cd dist
echo -e "${GREEN}Serving files from $(pwd)${NC}"
if command -v python3 &> /dev/null; then
    python3 -m http.server 3001 &
elif command -v python &> /dev/null; then
    python -m http.server 3001 &
else
    echo "Python not found. Please install Python 3.x"
    exit 1
fi

echo -e "${BLUE}=== The Stylist is now running ===${NC}"
echo -e "Backend API: ${GREEN}http://localhost:8000/api${NC}"
echo -e "Frontend Demo: ${GREEN}http://localhost:3001${NC}"
echo -e "Press Ctrl+C to stop both servers"

# Keep the script running
wait
