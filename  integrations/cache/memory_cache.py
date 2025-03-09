"""
In-memory cache implementation for the retailer API.
"""

import time
import threading
from typing import Dict, Any, Optional, Tuple


class MemoryCache:
    """Simple in-memory cache with TTL support."""

    def __init__(self):
        """Initialize the cache."""
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.RLock()

        # Start a cleanup thread to remove expired entries
        self._cleanup_thread = threading.Thread(target=self._cleanup_task, daemon=True)
        self._cleanup_thread.start()

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        with self._lock:
            if key not in self._cache:
                return None

            value, expiry = self._cache[key]

            # Check if expired
            if expiry < time.time():
                del self._cache[key]
                return None

            return value

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """
        Set a value in the cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds
        """
        with self._lock:
            expiry = time.time() + ttl
            self._cache[key] = (value, expiry)

    def delete(self, key: str) -> None:
        """
        Delete a key from the cache.

        Args:
            key: Cache key
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self) -> None:
        """Clear all items from the cache."""
        with self._lock:
            self._cache.clear()

    def _cleanup_task(self) -> None:
        """Background task to remove expired cache entries."""
        while True:
            time.sleep(60)  # Check every minute
            self._cleanup()

    def _cleanup(self) -> None:
        """Remove expired cache entries."""
        now = time.time()
        with self._lock:
            # Create a list of expired keys
            expired_keys = [
                key for key, (_, expiry) in self._cache.items() if expiry < now
            ]

            # Delete expired keys
            for key in expired_keys:
                del self._cache[key]
