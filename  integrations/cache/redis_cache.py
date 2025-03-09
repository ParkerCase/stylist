"""
Redis cache implementation for the retailer API.
"""

import json
from typing import Any, Optional, Dict, List
import logging
import redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis-based cache with TTL support."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        prefix: str = "stylist:cache:",
        ssl: bool = False,
        socket_timeout: int = 5,
    ):
        """
        Initialize the Redis cache.

        Args:
            host: Redis host
            port: Redis port
            db: Redis database number
            password: Redis password (if required)
            prefix: Key prefix for cache entries
            ssl: Whether to use SSL for Redis connection
            socket_timeout: Socket timeout in seconds
        """
        self.prefix = prefix

        try:
            self.redis = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                ssl=ssl,
                socket_timeout=socket_timeout,
                decode_responses=False,  # Keep as bytes for binary data
            )

            # Test connection
            self.redis.ping()
            logger.info(f"Connected to Redis at {host}:{port}/{db}")

        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            # Fallback to dummy implementation that doesn't cache
            self.redis = None

    def _make_key(self, key: str) -> str:
        """
        Create a full Redis key with prefix.

        Args:
            key: Original key

        Returns:
            Prefixed key
        """
        return f"{self.prefix}{key}"

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        if not self.redis:
            return None

        try:
            full_key = self._make_key(key)
            data = self.redis.get(full_key)

            if data is None:
                return None

            try:
                return json.loads(data)
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode JSON for key {key}")
                return None

        except RedisError as e:
            logger.error(f"Redis error in get(): {str(e)}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        Set a value in the cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds

        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False

        try:
            full_key = self._make_key(key)

            # Serialize the value to JSON
            serialized = json.dumps(value)

            # Set with expiry
            return bool(self.redis.setex(full_key, ttl, serialized))

        except (RedisError, TypeError, ValueError) as e:
            logger.error(f"Redis error in set(): {str(e)}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a key from the cache.

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False

        try:
            full_key = self._make_key(key)
            return bool(self.redis.delete(full_key))

        except RedisError as e:
            logger.error(f"Redis error in delete(): {str(e)}")
            return False

    def clear(self) -> bool:
        """
        Clear all items from the cache with the configured prefix.

        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False

        try:
            # Find all keys with our prefix
            pattern = f"{self.prefix}*"
            cursor = 0
            deleted_count = 0

            while True:
                cursor, keys = self.redis.scan(cursor=cursor, match=pattern, count=100)

                if keys:
                    deleted = self.redis.delete(*keys)
                    deleted_count += deleted

                # If cursor is 0, we've processed all keys
                if cursor == 0:
                    break

            logger.info(f"Cleared {deleted_count} keys with prefix {self.prefix}")
            return True

        except RedisError as e:
            logger.error(f"Redis error in clear(): {str(e)}")
            return False
