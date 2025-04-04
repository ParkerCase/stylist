"""
Main entry point for The Stylist backend application.
"""

import os
import logging
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

# Import API routes
from api.recommendation_routes import (
    get_recommendations,
    add_item_feedback,
    save_outfit,
    create_user,
    update_user,
)
from api.retailer_routes import (
    add_retailer,
    update_retailer,
    delete_retailer,
    get_retailer,
    list_retailers,
    test_retailer_connection,
    clear_retailer_cache,
)
from api.inventory_routes import get_inventory, search_inventory, get_item

# Import config
from config import API_KEY, DEBUG, API_VERSION

# Import mock retailer initialization
from initialize_mock_retailer import initialize_mock_retailer

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="The Stylist API",
    description="AI-powered fashion assistant API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API key validation
async def verify_api_key(x_api_key: str = Header(None)):
    """Verify the API key."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key missing")
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Error handling
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions."""
    return JSONResponse(
        status_code=400,
        content={"error": "Invalid request", "detail": str(exc)},
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "The Stylist API",
        "version": "1.0.0",
        "docs": "/api/docs",
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}

# API routes
# User routes
@app.post(f"/api/{API_VERSION}/users", dependencies=[Depends(verify_api_key)])
async def api_create_user(user_data: Dict[str, Any]):
    """Create a new user profile."""
    return create_user(user_data)

@app.put(f"/api/{API_VERSION}/users/{{user_id}}", dependencies=[Depends(verify_api_key)])
async def api_update_user(user_id: str, user_data: Dict[str, Any]):
    """Update an existing user profile."""
    return update_user(user_id, user_data)

# Recommendation routes
@app.get(f"/api/{API_VERSION}/users/{{user_id}}/recommendations", dependencies=[Depends(verify_api_key)])
async def api_get_recommendations(user_id: str, context: str = None):
    """Get personalized recommendations for a user."""
    return get_recommendations(user_id, context)

@app.post(f"/api/{API_VERSION}/users/{{user_id}}/feedback/items/{{item_id}}", dependencies=[Depends(verify_api_key)])
async def api_add_item_feedback(user_id: str, item_id: str, feedback_data: Dict[str, Any]):
    """Add user feedback for an item."""
    return add_item_feedback(user_id, item_id, feedback_data)

@app.post(f"/api/{API_VERSION}/users/{{user_id}}/outfits", dependencies=[Depends(verify_api_key)])
async def api_save_outfit(user_id: str, outfit_data: Dict[str, Any]):
    """Save an outfit to the user's saved outfits."""
    outfit_items = outfit_data.get("items", [])
    return save_outfit(user_id, outfit_items)

# Retailer routes
@app.get(f"/api/{API_VERSION}/retailers", dependencies=[Depends(verify_api_key)])
async def api_list_retailers():
    """List all retailer configurations."""
    return list_retailers()

@app.post(f"/api/{API_VERSION}/retailers", dependencies=[Depends(verify_api_key)])
async def api_add_retailer(config_data: Dict[str, Any]):
    """Add a new retailer configuration."""
    return add_retailer(config_data)

@app.get(f"/api/{API_VERSION}/retailers/{{retailer_id}}", dependencies=[Depends(verify_api_key)])
async def api_get_retailer(retailer_id: str):
    """Get retailer configuration."""
    return get_retailer(retailer_id)

@app.put(f"/api/{API_VERSION}/retailers/{{retailer_id}}", dependencies=[Depends(verify_api_key)])
async def api_update_retailer(retailer_id: str, config_data: Dict[str, Any]):
    """Update an existing retailer configuration."""
    return update_retailer(retailer_id, config_data)

@app.delete(f"/api/{API_VERSION}/retailers/{{retailer_id}}", dependencies=[Depends(verify_api_key)])
async def api_delete_retailer(retailer_id: str):
    """Delete a retailer configuration."""
    return delete_retailer(retailer_id)

@app.get(f"/api/{API_VERSION}/retailers/{{retailer_id}}/test", dependencies=[Depends(verify_api_key)])
async def api_test_retailer(retailer_id: str):
    """Test connection to a retailer API."""
    return test_retailer_connection(retailer_id)

@app.delete(f"/api/{API_VERSION}/retailers/{{retailer_id}}/cache", dependencies=[Depends(verify_api_key)])
async def api_clear_retailer_cache(retailer_id: str):
    """Clear cache for a retailer."""
    return clear_retailer_cache(retailer_id)

# Inventory routes
@app.get(f"/api/{API_VERSION}/inventory/{{retailer_id}}", dependencies=[Depends(verify_api_key)])
async def api_get_inventory(retailer_id: str, limit: int = 100, page: int = 1, category: str = None):
    """Get inventory for a retailer."""
    return get_inventory(retailer_id, limit, page, category)

@app.get(f"/api/{API_VERSION}/inventory/{{retailer_id}}/search", dependencies=[Depends(verify_api_key)])
async def api_search_inventory(retailer_id: str, query: str, limit: int = 20):
    """Search inventory for a retailer."""
    return search_inventory(retailer_id, query, limit)

@app.get(f"/api/{API_VERSION}/inventory/{{retailer_id}}/items/{{item_id}}", dependencies=[Depends(verify_api_key)])
async def api_get_item(retailer_id: str, item_id: str):
    """Get a specific item from a retailer."""
    return get_item(retailer_id, item_id)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize mock retailer if needed
@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup."""
    # Initialize mock retailer if USE_MOCK_RETAILER is true
    initialize_mock_retailer()

# Run the app
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)