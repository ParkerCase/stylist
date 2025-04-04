#!/bin/bash

# Color definitions
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}Verifying The Stylist project...${NC}"
echo

# Make verification scripts executable
chmod +x verify.py verify.js

# Create a dummy .env file for testing
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating dummy .env file for testing...${NC}"
    cat <<EOF > .env
REMOVE_BG_API_KEY=test_key
ANTHROPIC_API_KEY=test_key
STYLIST_API_KEY=test_key
EOF
fi

# Run backend verification
echo -e "${BLUE}Running backend verification...${NC}"
echo "----------------------------------------"
python verify.py
BACKEND_STATUS=$?
echo

# Run frontend verification
echo -e "${BLUE}Running frontend verification...${NC}"
echo "----------------------------------------"
node verify.js
FRONTEND_STATUS=$?
echo

# Final verification
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}========================================"
    echo -e "       PROJECT IS READY FOR TESTING       "
    echo -e "========================================${NC}"
    exit 0
else
    echo -e "${YELLOW}========================================"
    echo -e "    PROJECT SETUP NEEDS ATTENTION    "
    echo -e "========================================${NC}"
    echo -e "${BLUE}Please address the warnings above and run this script again.${NC}"
    exit 1
fi