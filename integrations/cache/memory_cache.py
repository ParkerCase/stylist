"""
In-memory cache implementation for retailer API responses.
"""

import time
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta


class MemoryCache:
    """Simple in-memory cache with expiration."""
    
    def __init__(self, default_ttl: int = 3600):
        """
        Initialize memory cache.
        
        Args:
            default_ttl: Default time-to-live in seconds (1 hour by default)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve an item from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            The cached value or None if not found or expired
        """
        if key not in self._cache:
            return None
        
        cache_entry = self._cache[key]
        
        # Check if expired
        if cache_entry["expires_at"] < time.time():
            del self._cache[key]
            return None
        
        return cache_entry["value"]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Store an item in the cache.
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Time-to-live in seconds, uses default_ttl if not specified
        """
        ttl = ttl if ttl is not None else self._default_ttl
        expires_at = time.time() + ttl
        
        self._cache[key] = {
            "value": value,
            "expires_at": expires_at
        }
    
    def delete(self, key: str) -> bool:
        """
        Delete an item from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if the key was found and deleted, False otherwise
        """
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def cleanup(self) -> int:
        """
        Remove all expired entries from the cache.
        
        Returns:
            Number of entries removed
        """
        now = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if entry["expires_at"] < now
        ]
        
        for key in expired_keys:
            del self._cache[key]
        
        return len(expired_keys)
    
    def get_or_set(self, key: str, value_func: Callable[[], Any], ttl: Optional[int] = None) -> Any:
        """
        Get a value from cache or compute and store it if not present.
        
        Args:
            key: Cache key
            value_func: Function to compute the value if not in cache
            ttl: Time-to-live in seconds, uses default_ttl if not specified
            
        Returns:
            The cached or computed value
        """
        value = self.get(key)
        if value is None:
            value = value_func()
            self.set(key, value, ttl)
        return value