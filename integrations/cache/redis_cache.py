"""
Redis cache implementation for retailer API responses.
"""

import json
import logging
from typing import Dict, Any, Optional, Callable, Union
import redis

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis-based cache implementation with expiration."""
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        default_ttl: int = 3600,
        prefix: str = "stylist:"
    ):
        """
        Initialize Redis cache.
        
        Args:
            host: Redis host
            port: Redis port
            db: Redis database number
            password: Redis password if required
            default_ttl: Default time-to-live in seconds (1 hour by default)
            prefix: Key prefix to avoid collisions with other applications
        """
        self._redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=False
        )
        self._default_ttl = default_ttl
        self._prefix = prefix
    
    def _get_prefixed_key(self, key: str) -> str:
        """Add prefix to key to avoid collisions."""
        return f"{self._prefix}{key}"
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve an item from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            The cached value or None if not found
        """
        prefixed_key = self._get_prefixed_key(key)
        
        try:
            value = self._redis.get(prefixed_key)
            if value is None:
                return None
            
            return json.loads(value)
        except Exception as e:
            logger.error(f"Error retrieving key {key} from Redis: {str(e)}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Store an item in the cache.
        
        Args:
            key: Cache key
            value: Value to store (must be JSON serializable)
            ttl: Time-to-live in seconds, uses default_ttl if not specified
            
        Returns:
            True if the value was stored successfully, False otherwise
        """
        prefixed_key = self._get_prefixed_key(key)
        ttl = ttl if ttl is not None else self._default_ttl
        
        try:
            serialized = json.dumps(value)
            result = self._redis.setex(prefixed_key, ttl, serialized)
            return result
        except Exception as e:
            logger.error(f"Error storing key {key} in Redis: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete an item from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if the key was found and deleted, False otherwise
        """
        prefixed_key = self._get_prefixed_key(key)
        
        try:
            result = self._redis.delete(prefixed_key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting key {key} from Redis: {str(e)}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Key pattern to match (will be prefixed)
            
        Returns:
            Number of keys deleted
        """
        prefixed_pattern = self._get_prefixed_key(pattern + "*")
        
        try:
            keys = self._redis.keys(prefixed_pattern)
            if not keys:
                return 0
            
            return self._redis.delete(*keys)
        except Exception as e:
            logger.error(f"Error clearing pattern {pattern} from Redis: {str(e)}")
            return 0
    
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