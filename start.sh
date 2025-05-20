#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill background processes when the script exits
trap "exit" INT TERM
trap "kill 0" EXIT

# Change to the project root directory
cd "$(dirname "$0")"

echo -e "${BLUE}=== Starting The Stylist Application ===${NC}"

# First build the project
echo -e "${GREEN}Building the project...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed. Exiting.${NC}"
  exit 1
fi

# Start the backend server
echo -e "${GREEN}Starting backend server...${NC}"
if command -v python3 &> /dev/null; then
  python3 main.py &
elif command -v python &> /dev/null; then
  python main.py &
else
  echo -e "${RED}Python not found. Please install Python 3.x${NC}"
  exit 1
fi

# Wait for backend to initialize (give it more time)
echo -e "${GREEN}Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
  echo -e "${RED}Backend failed to start. Check logs for errors.${NC}"
  exit 1
fi

echo -e "${GREEN}Backend successfully started!${NC}"

# Start the frontend server
echo -e "${GREEN}Starting frontend server...${NC}"
if command -v python3 &> /dev/null; then
  python3 -m http.server 8080 &
elif command -v python &> /dev/null; then
  python -m http.server 8080 &
else
  echo -e "${RED}Python not found. Please install Python 3.x${NC}"
  exit 1
fi

echo -e "${BLUE}=== The Stylist is now running ===${NC}"
echo -e "Backend API: ${GREEN}http://localhost:8000/api${NC}"
echo -e "Frontend Demo: ${GREEN}http://localhost:8080/public/full-widget.html${NC}"
echo -e "Press Ctrl+C to stop both servers"

# Keep the script running
wait