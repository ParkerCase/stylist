"""
Main entry point for The Stylist backend application.
"""

import os
import logging
import json
from datetime import datetime
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request, Depends, Header, UploadFile, File, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

# Import config - this will load environment variables
from config import (
    API_KEY, DEBUG, API_VERSION, PORT, USE_MOCK_RETAILER, JWT_SECRET, ANTHROPIC_API_KEY
)

# Import API routes
from api.recommendation_routes import (
    get_recommendations,
    add_item_feedback,
    save_outfit,
    create_user,
    update_user,
    router as recommendation_router,
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
from api.inventory_routes import get_inventory, search_items as search_inventory, get_item
from api.user_routes import (
    register_user,
    login_user,
    request_password_reset,
    reset_password,
    get_user_profile,
    update_user_profile,
    social_auth_stub,
    verify_token,
)
from api.closet_routes import (
    add_closet_item,
    detect_clothing,
    get_closet_items,
    remove_closet_item,
    update_closet_item,
    toggle_favorite_item,
    save_outfit as save_closet_outfit,
    get_saved_outfits,
    delete_saved_outfit,
)

# Import mock retailer initialization
from initialize_mock_retailer import initialize_mock_retailer

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

# JWT Token validation
async def verify_auth_token(authorization: str = Header(None)):
    """Verify JWT authentication token from Authorization header.
    
    Format: 'Bearer {token}'
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = parts[1]
    return verify_token(token)

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
    return {"status": "healthy", "version": "1.0.0", "configuration": {
        "api_version": API_VERSION,
        "port": PORT,
        "debug": DEBUG
    }}

# WebSocket chat endpoint
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat with the stylist assistant."""
    # Accept connection
    await websocket.accept()
    try:
        # Keep connection open and handle messages
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            # Process message (would normally involve AI processing)
            response = {
                "type": "message",
                "sender": "assistant",
                "text": f"Echo: {data.get('text', 'No message provided')}"
            }
            # Send response
            await websocket.send_json(response)
    except WebSocketDisconnect:
        # Handle client disconnect
        logger.info(f"WebSocket connection closed for user {user_id}")
    except Exception as e:
        # Handle other errors
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": "An error occurred"})
        except:
            pass

# API routes

# Authentication routes - no API key required for these
@app.post(f"/api/{API_VERSION}/auth/register")
async def api_register_user(registration_data: Dict[str, Any] = Body(...)):
    """Register a new user."""
    return await register_user(registration_data)

@app.post(f"/api/{API_VERSION}/auth/login")
async def api_login_user(login_data: Dict[str, Any] = Body(...)):
    """Log in a user."""
    return await login_user(login_data)

@app.post(f"/api/{API_VERSION}/auth/password-reset-request")
async def api_request_password_reset(reset_data: Dict[str, Any] = Body(...)):
    """Request a password reset."""
    return await request_password_reset(reset_data)

@app.post(f"/api/{API_VERSION}/auth/password-reset")
async def api_reset_password(reset_data: Dict[str, Any] = Body(...)):
    """Reset a password."""
    return await reset_password(reset_data)

@app.post(f"/api/{API_VERSION}/auth/social/{{provider}}")
async def api_social_auth(provider: str, auth_data: Dict[str, Any] = Body(...)):
    """Authenticate with a social provider (stub)."""
    return await social_auth_stub(provider, auth_data)

# User routes - requires JWT token
@app.get(f"/api/{API_VERSION}/users/me")
async def api_get_current_user(payload: Dict[str, Any] = Depends(verify_auth_token)):
    """Get the current user's profile."""
    user_id = payload["sub"]
    return await get_user_profile(user_id)

@app.put(f"/api/{API_VERSION}/users/me")
async def api_update_current_user(
    payload: Dict[str, Any] = Depends(verify_auth_token),
    profile_data: Dict[str, Any] = Body(...)
):
    """Update the current user's profile."""
    user_id = payload["sub"]
    return await update_user_profile(user_id, profile_data)

# Legacy user routes - uses API key for compatibility
@app.post(f"/api/{API_VERSION}/users", dependencies=[Depends(verify_api_key)])
async def api_create_user(user_data: Dict[str, Any]):
    """Create a new user profile (legacy)."""
    return create_user(user_data)

@app.put(f"/api/{API_VERSION}/users/{{user_id}}", dependencies=[Depends(verify_api_key)])
async def api_update_user(user_id: str, user_data: Dict[str, Any]):
    """Update an existing user profile (legacy)."""
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

# Closet routes
@app.post(f"/api/{API_VERSION}/users/{{user_id}}/closet", dependencies=[Depends(verify_api_key)])
async def api_add_closet_item(user_id: str, item_data: Dict[str, Any]):
    """Add an item to the user's closet."""
    return await add_closet_item(user_id, item_data)

@app.post(f"/api/{API_VERSION}/users/{{user_id}}/closet/detect", dependencies=[Depends(verify_api_key)])
async def api_detect_clothing(user_id: str, file: UploadFile = File(...)):
    """Detect clothing attributes from an uploaded image."""
    return await detect_clothing(user_id, file)

@app.get(f"/api/{API_VERSION}/users/{{user_id}}/closet", dependencies=[Depends(verify_api_key)])
async def api_get_closet_items(user_id: str):
    """Get all items in the user's closet."""
    return await get_closet_items(user_id)

@app.delete(f"/api/{API_VERSION}/users/{{user_id}}/closet/{{item_id}}", dependencies=[Depends(verify_api_key)])
async def api_remove_closet_item(user_id: str, item_id: str):
    """Remove an item from the user's closet."""
    return await remove_closet_item(user_id, item_id)

@app.put(f"/api/{API_VERSION}/users/{{user_id}}/closet/{{item_id}}", dependencies=[Depends(verify_api_key)])
async def api_update_closet_item(user_id: str, item_id: str, item_data: Dict[str, Any]):
    """Update a closet item."""
    return await update_closet_item(user_id, item_id, item_data)

@app.put(f"/api/{API_VERSION}/users/{{user_id}}/closet/{{item_id}}/favorite", dependencies=[Depends(verify_api_key)])
async def api_toggle_favorite_item(user_id: str, item_id: str, favorite_data: Dict[str, bool]):
    """Toggle the favorite status of a closet item."""
    return await toggle_favorite_item(user_id, item_id, favorite_data)

@app.post(f"/api/{API_VERSION}/users/{{user_id}}/closet/outfits", dependencies=[Depends(verify_api_key)])
async def api_save_closet_outfit(user_id: str, outfit_data: Dict[str, Any]):
    """Save an outfit composed of closet items."""
    return await save_closet_outfit(user_id, outfit_data)

@app.get(f"/api/{API_VERSION}/users/{{user_id}}/closet/outfits", dependencies=[Depends(verify_api_key)])
async def api_get_saved_outfits(user_id: str):
    """Get all saved outfits for a user."""
    return await get_saved_outfits(user_id)

@app.delete(f"/api/{API_VERSION}/users/{{user_id}}/closet/outfits/{{outfit_id}}", dependencies=[Depends(verify_api_key)])
async def api_delete_saved_outfit(user_id: str, outfit_id: int):
    """Delete a saved outfit."""
    return await delete_saved_outfit(user_id, outfit_id)

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

# WebSocket connection for real-time chat
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection for real-time chat functionality."""
    await websocket.accept()
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Parse the JSON data
            try:
                message_data = json.loads(data)
                user_id = message_data.get("userId", "anonymous")
                message = message_data.get("message", "")
                
                # If user doesn't exist in our system, create a new profile
                if user_id not in mock_users:
                    mock_users[user_id] = UserProfile(
                        user_id=user_id,
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                
                user = mock_users[user_id]
                
                # Generate response from style analysis service
                response = style_analysis_service.answer_style_question(message, user)
                
                # Send response back to client
                await websocket.send_text(json.dumps({
                    "type": "message",
                    "response": response,
                    "timestamp": datetime.now().isoformat()
                }))
                
            except json.JSONDecodeError:
                # If not valid JSON, send error
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid message format, expected JSON"
                }))
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Server error occurred"
            }))
        except:
            # Client might already be disconnected
            pass

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize services on startup
@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup."""
    # Include recommendation router for direct API endpoint access
    app.include_router(recommendation_router)
    logger.info("Registered recommendation API router")
    
    # Initialize mock retailer if USE_MOCK_RETAILER is true
    initialize_mock_retailer()
    
    # Initialize recommendation services
    try:
        # Try to initialize integrated recommendation service
        from services.integrated_recommendation_service import IntegratedRecommendationService
        logger.info("Successfully imported integrated recommendation service")
        
        # Initialize retailer clients if needed (from retailer_routes)
        try:
            from api.retailer_routes import initialize_retailer_clients
            if 'initialize_retailer_clients' in locals():
                await initialize_retailer_clients()
                logger.info("Successfully initialized retailer clients")
        except Exception as e:
            logger.warning(f"Failed to initialize retailer clients: {str(e)}")
            
        # Test the integrated recommendation service
        try:
            from models.user import UserProfile
            test_user = UserProfile(user_id="test_user")
            
            # Run a test recommendation
            result = await IntegratedRecommendationService.get_recommendations_with_availability(
                user=test_user,
                limit_per_retailer=5,
                check_availability=False
            )
            
            logger.info(f"Integrated recommendation service test successful: {len(result.recommended_items)} items")
        except Exception as e:
            logger.warning(f"Failed to test integrated recommendation service: {str(e)}")
            
    except ImportError:
        logger.warning("Integrated recommendation service not available, using fallback")
    except Exception as e:
        logger.error(f"Error initializing integrated recommendation service: {str(e)}")
        
    logger.info("Application startup complete")

# Run the app
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)