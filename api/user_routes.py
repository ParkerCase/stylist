"""
API routes for user management and authentication.
"""

import logging
import uuid
import hashlib
import os
import secrets
import string
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import re
import jwt
from jwt.exceptions import InvalidTokenError

from fastapi import HTTPException, Depends, Body, Request, Response
from pydantic import BaseModel, EmailStr, Field, validator

# Import User-related models
from models.user import UserProfile, StyleQuizResults, UserClosetItem

logger = logging.getLogger(__name__)

# In-memory database for demo purposes
# In a real implementation, these would be in a proper database
user_db = {}  # Maps user_id to UserProfile
user_auth_db = {}  # Maps email to {password_hash, user_id}
password_reset_tokens = {}  # Maps token to {email, expiry}

# Load or generate JWT_SECRET
JWT_SECRET = os.environ.get("JWT_SECRET", None)
if not JWT_SECRET:
    # Generate a secure random string for the secret key
    # In production, this should be a stable secret
    JWT_SECRET = "".join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(64)
    )
    logger.warning("Generated a temporary JWT_SECRET. In production, set this in environment variables.")

# Auth-related configuration
TOKEN_EXPIRY = 24 * 60 * 60  # 24 hours in seconds
RESET_TOKEN_EXPIRY = 60 * 60  # 1 hour in seconds
TOKEN_ALGORITHM = "HS256"

class UserRegistration(BaseModel):
    """User registration data model"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None
    
    @validator('password')
    def password_complexity(cls, v):
        """Validate password complexity"""
        # At least 8 characters, 1 uppercase, 1 lowercase, 1 digit
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', v):
            raise ValueError(
                'Password must be at least 8 characters and contain at least '
                'one uppercase letter, one lowercase letter, and one digit'
            )
        return v

class UserLogin(BaseModel):
    """User login data model"""
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    """Password reset request model"""
    email: EmailStr

class PasswordReset(BaseModel):
    """Password reset model"""
    token: str
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def password_complexity(cls, v):
        """Validate password complexity"""
        # At least 8 characters, 1 uppercase, 1 lowercase, 1 digit
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', v):
            raise ValueError(
                'Password must be at least 8 characters and contain at least '
                'one uppercase letter, one lowercase letter, and one digit'
            )
        return v

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 (for demo purposes)
    
    In a real implementation, use a proper password hashing library like bcrypt
    """
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: str, email: str) -> str:
    """Generate a JWT token for the user"""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(seconds=TOKEN_EXPIRY),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=TOKEN_ALGORITHM)

def verify_token(token: str) -> Dict[str, Any]:
    """Verify a JWT token and return the payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[TOKEN_ALGORITHM])
        return payload
    except InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def validate_request_data(data: Dict[str, Any], schema: BaseModel) -> Tuple[bool, Optional[str]]:
    """Validate request data against a Pydantic model"""
    try:
        schema(**data)
        return True, None
    except Exception as e:
        return False, str(e)

async def register_user(registration_data: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new user
    
    Args:
        registration_data: User registration data
        
    Returns:
        Dictionary with user data and token
        
    Raises:
        HTTPException: If registration fails
    """
    try:
        # Validate input data
        model = UserRegistration(**registration_data)
        email = model.email.lower()
        
        # Check if email already exists
        if any(auth["email"] == email for auth in user_auth_db.values()):
            raise HTTPException(status_code=409, detail="Email already registered")
        
        # Generate user ID
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        
        # Hash password (in production, use bcrypt instead)
        password_hash = hash_password(model.password)
        
        # Create user profile
        user = UserProfile(
            user_id=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        # Store user data
        user_db[user_id] = user
        user_auth_db[user_id] = {
            "email": email,
            "password_hash": password_hash
        }
        
        # Generate token
        token = generate_token(user_id, email)
        
        logger.info(f"Registered new user with ID: {user_id}, email: {email}")
        
        # Return user data and token
        return {
            "user_id": user_id,
            "email": email,
            "name": model.name,
            "token": token,
            "created_at": user.created_at.isoformat(),
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

async def login_user(login_data: Dict[str, Any]) -> Dict[str, Any]:
    """Log in a user
    
    Args:
        login_data: User login data
        
    Returns:
        Dictionary with user data and token
        
    Raises:
        HTTPException: If login fails
    """
    try:
        # Validate input data
        model = UserLogin(**login_data)
        email = model.email.lower()
        
        # Find user by email
        user_id = None
        for uid, auth in user_auth_db.items():
            if auth["email"] == email:
                user_id = uid
                break
        
        if not user_id:
            # Use generic message to prevent email enumeration
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check password
        password_hash = hash_password(model.password)
        if user_auth_db[user_id]["password_hash"] != password_hash:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Generate token
        token = generate_token(user_id, email)
        
        # Get user profile
        user = user_db.get(user_id)
        if not user:
            # This should never happen, but just in case
            raise HTTPException(status_code=500, detail="User profile not found")
        
        logger.info(f"User logged in: {user_id}, email: {email}")
        
        # Return user data and token
        return {
            "user_id": user_id,
            "email": email,
            "token": token,
            "user_profile": user.to_dict(),
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

async def request_password_reset(reset_data: Dict[str, Any]) -> Dict[str, str]:
    """Request a password reset
    
    Args:
        reset_data: Password reset request data
        
    Returns:
        Dictionary with success message
        
    Raises:
        HTTPException: If request fails
    """
    try:
        # Validate input data
        model = PasswordResetRequest(**reset_data)
        email = model.email.lower()
        
        # Find user by email
        user_id = None
        for uid, auth in user_auth_db.items():
            if auth["email"] == email:
                user_id = uid
                break
        
        if not user_id:
            # Return success even if email doesn't exist to prevent email enumeration
            return {"message": "If the email exists, a password reset link has been sent"}
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(seconds=RESET_TOKEN_EXPIRY)
        
        # Store token
        password_reset_tokens[token] = {
            "email": email,
            "expiry": expiry
        }
        
        # In a real implementation, send an email with the reset link
        # For demo purposes, just log it
        reset_link = f"/reset-password?token={token}"
        logger.info(f"Password reset requested for {email}. Reset link: {reset_link}")
        
        return {"message": "If the email exists, a password reset link has been sent"}
    
    except Exception as e:
        logger.error(f"Error requesting password reset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password reset request failed: {str(e)}")

async def reset_password(reset_data: Dict[str, Any]) -> Dict[str, str]:
    """Reset a password
    
    Args:
        reset_data: Password reset data
        
    Returns:
        Dictionary with success message
        
    Raises:
        HTTPException: If reset fails
    """
    try:
        # Validate input data
        model = PasswordReset(**reset_data)
        token = model.token
        
        # Check if token exists
        if token not in password_reset_tokens:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        
        # Check if token is expired
        token_data = password_reset_tokens[token]
        if token_data["expiry"] < datetime.now():
            # Clean up expired token
            del password_reset_tokens[token]
            raise HTTPException(status_code=400, detail="Token has expired")
        
        # Get email from token
        email = token_data["email"]
        
        # Find user by email
        user_id = None
        for uid, auth in user_auth_db.items():
            if auth["email"] == email:
                user_id = uid
                break
        
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        password_hash = hash_password(model.password)
        user_auth_db[user_id]["password_hash"] = password_hash
        
        # Clean up used token
        del password_reset_tokens[token]
        
        logger.info(f"Password reset completed for user: {user_id}, email: {email}")
        
        return {"message": "Password has been reset successfully"}
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")

async def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get a user's profile
    
    Args:
        user_id: User ID
        
    Returns:
        User profile data
        
    Raises:
        HTTPException: If user not found
    """
    if user_id not in user_db:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    try:
        user = user_db[user_id]
        return user.to_dict()
    
    except Exception as e:
        logger.error(f"Error getting user profile for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

async def update_user_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a user's profile
    
    Args:
        user_id: User ID
        profile_data: Profile data to update
        
    Returns:
        Updated user profile
        
    Raises:
        HTTPException: If update fails
    """
    if user_id not in user_db:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    
    try:
        user = user_db[user_id]
        
        # Update fields
        if "name" in profile_data:
            user.name = profile_data["name"]
        
        # Update style preferences if provided
        if "style_preferences" in profile_data:
            # In a real implementation, validate the style preferences
            user.style_preferences = profile_data["style_preferences"]
        
        # Update sizes if provided
        if "sizes" in profile_data:
            # In a real implementation, validate the sizes
            user.sizes = profile_data["sizes"]
        
        # Update timestamp
        user.updated_at = datetime.now()
        
        logger.info(f"Updated profile for user: {user_id}")
        
        return user.to_dict()
    
    except Exception as e:
        logger.error(f"Error updating user profile for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user profile: {str(e)}")

async def social_auth_stub(auth_provider: str, auth_data: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for social authentication
    
    Args:
        auth_provider: The social auth provider (google, facebook, etc.)
        auth_data: Authentication data
        
    Returns:
        Dictionary with user data and token
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Validate provider
        valid_providers = ["google", "facebook", "apple"]
        if auth_provider.lower() not in valid_providers:
            raise HTTPException(status_code=400, detail=f"Unsupported auth provider: {auth_provider}")
        
        # For demo purposes, create a stub user
        user_id = f"social_{auth_provider}_{uuid.uuid4().hex[:8]}"
        email = f"{user_id}@example.com"
        
        # Create user profile
        user = UserProfile(
            user_id=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        # Store user data
        user_db[user_id] = user
        user_auth_db[user_id] = {
            "email": email,
            "provider": auth_provider
        }
        
        # Generate token
        token = generate_token(user_id, email)
        
        logger.info(f"Social auth stub: Created user with ID: {user_id}, provider: {auth_provider}")
        
        return {
            "user_id": user_id,
            "email": email,
            "provider": auth_provider,
            "token": token,
            "message": f"This is a stub for {auth_provider} authentication. In production, this would authenticate with the actual provider.",
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in social auth stub: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Social authentication failed: {str(e)}")

# Example of how to use these functions in FastAPI routes:
"""
@app.post("/api/v1/auth/register")
async def api_register_user(registration_data: Dict[str, Any] = Body(...)):
    return await register_user(registration_data)

@app.post("/api/v1/auth/login")
async def api_login_user(login_data: Dict[str, Any] = Body(...)):
    return await login_user(login_data)

@app.post("/api/v1/auth/password-reset-request")
async def api_request_password_reset(reset_data: Dict[str, Any] = Body(...)):
    return await request_password_reset(reset_data)

@app.post("/api/v1/auth/password-reset")
async def api_reset_password(reset_data: Dict[str, Any] = Body(...)):
    return await reset_password(reset_data)

@app.get("/api/v1/users/{user_id}")
async def api_get_user_profile(user_id: str):
    return await get_user_profile(user_id)

@app.put("/api/v1/users/{user_id}")
async def api_update_user_profile(user_id: str, profile_data: Dict[str, Any] = Body(...)):
    return await update_user_profile(user_id, profile_data)

@app.post("/api/v1/auth/social/{provider}")
async def api_social_auth(provider: str, auth_data: Dict[str, Any] = Body(...)):
    return await social_auth_stub(provider, auth_data)
"""