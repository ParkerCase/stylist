#!/usr/bin/env python3
"""
Verification script for The Stylist backend application.
Checks that all required components are properly set up.
"""

import os
import sys
import importlib.util
import logging
import json
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Add colors for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
ENDC = "\033[0m"

def check_env_variables():
    """Check environment variables."""
    load_dotenv()
    
    required_vars = [
        "REMOVE_BG_API_KEY",
        "ANTHROPIC_API_KEY",
        "STYLIST_API_KEY",
    ]
    
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.warning(f"{YELLOW}Missing environment variables: {', '.join(missing_vars)}{ENDC}")
        logger.info(f"{BLUE}Please check stillremaining.txt for details on required variables{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ Environment variables verified{ENDC}")
    return True

def check_python_dependencies():
    """Check that required Python dependencies are installed."""
    required_modules = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "requests",
        "aiohttp",
        "redis",
        "PIL",
        "tensorflow",
        "jsonschema",
    ]
    
    missing_modules = []
    
    for module in required_modules:
        if not importlib.util.find_spec(module):
            if module == "PIL":
                # Pillow is imported as PIL
                try:
                    __import__("PIL")
                except ImportError:
                    missing_modules.append("Pillow")
            else:
                missing_modules.append(module)
    
    if missing_modules:
        logger.warning(f"{YELLOW}Missing Python dependencies: {', '.join(missing_modules)}{ENDC}")
        logger.info(f"{BLUE}Run `pip install -r requirements.txt` to install missing dependencies{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ Python dependencies verified{ENDC}")
    return True

def check_tensorflow_model():
    """Check if TensorFlow.js model files exist."""
    base_dir = Path("public/models/segmentation-model")
    
    required_files = [
        "model.json",
    ]
    
    missing_files = []
    
    for file in required_files:
        if not (base_dir / file).exists():
            missing_files.append(str(base_dir / file))
    
    if missing_files:
        logger.warning(f"{YELLOW}Missing TensorFlow.js model files: {', '.join(missing_files)}{ENDC}")
        logger.info(f"{BLUE}See instructions in public/models/segmentation-model/README.md{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ TensorFlow.js model files verified{ENDC}")
    return True

def check_api_routes():
    """Check that API routes are properly defined."""
    api_files = [
        "api/recommendation_routes.py",
        "api/retailer_routes.py",
        "api/inventory_routes.py",
    ]
    
    missing_files = []
    
    for file in api_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        logger.warning(f"{YELLOW}Missing API route files: {', '.join(missing_files)}{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ API routes verified{ENDC}")
    return True

def check_frontend_files():
    """Check that frontend files are properly defined."""
    required_files = [
        "src/StylistWidget.tsx",
        "src/components/ChatWidget/ChatWidget.tsx",
        "src/components/VirtualTryOn/VirtualTryOn.tsx",
        "src/hooks/useTryOn.ts",
        "package.json",
    ]
    
    missing_files = []
    
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        logger.warning(f"{YELLOW}Missing frontend files: {', '.join(missing_files)}{ENDC}")
        return False
    
    # Check package.json
    try:
        with open("package.json", "r") as f:
            package_data = json.load(f)
        
        required_scripts = ["start", "build", "test"]
        missing_scripts = []
        
        for script in required_scripts:
            if script not in package_data.get("scripts", {}):
                missing_scripts.append(script)
        
        if missing_scripts:
            logger.warning(f"{YELLOW}Missing scripts in package.json: {', '.join(missing_scripts)}{ENDC}")
            return False
        
    except Exception as e:
        logger.warning(f"{YELLOW}Error reading package.json: {str(e)}{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ Frontend files verified{ENDC}")
    return True

def check_docker_setup():
    """Check Docker setup."""
    if not Path("Dockerfile").exists():
        logger.warning(f"{YELLOW}Dockerfile not found{ENDC}")
        return False
    
    if not Path("nginx.conf").exists():
        logger.warning(f"{YELLOW}nginx.conf not found{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ Docker setup verified{ENDC}")
    return True

def check_github_actions():
    """Check GitHub Actions setup."""
    if not Path(".github/workflows/ci-cd.yml").exists():
        logger.warning(f"{YELLOW}.github/workflows/ci-cd.yml not found{ENDC}")
        return False
    
    logger.info(f"{GREEN}✓ GitHub Actions setup verified{ENDC}")
    return True

def main():
    """Run all verification checks."""
    logger.info(f"{BLUE}Verifying The Stylist installation...{ENDC}")
    
    checks = [
        check_env_variables,
        check_python_dependencies,
        check_tensorflow_model,
        check_api_routes,
        check_frontend_files,
        check_docker_setup,
        check_github_actions,
    ]
    
    success = True
    
    for check in checks:
        if not check():
            success = False
    
    if success:
        logger.info(f"\n{GREEN}========================================{ENDC}")
        logger.info(f"{GREEN}       PROJECT IS READY FOR TESTING     {ENDC}")
        logger.info(f"{GREEN}========================================{ENDC}")
        return 0
    else:
        logger.warning(f"\n{YELLOW}========================================{ENDC}")
        logger.warning(f"{YELLOW}    PROJECT SETUP NEEDS ATTENTION    {ENDC}")
        logger.warning(f"{YELLOW}========================================{ENDC}")
        logger.info(f"{BLUE}Please address the warnings above and run this script again.{ENDC}")
        return 1

if __name__ == "__main__":
    sys.exit(main())