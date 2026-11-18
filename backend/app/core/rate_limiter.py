import time
import threading
from typing import Dict, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class TokenBucket:
    """Thread-safe Token Bucket rate limiter for an individual client key."""

    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = threading.Lock()

    def consume(self, amount: float = 1.0) -> Tuple[bool, float]:
        """
        Attempts to consume tokens. Returns (allowed, retry_after_seconds).
        """
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now

            # Replenish tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)

            if self.tokens >= amount:
                self.tokens -= amount
                return True, 0.0
            else:
                deficit = amount - self.tokens
                retry_after = deficit / self.refill_rate if self.refill_rate > 0 else 1.0
                return False, max(1.0, retry_after)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Middleware applying token bucket rate limiting per client IP or Auth token.
    Exempts health endpoints (/health, /api/v1/health) to ensure probes always pass.
    """

    def __init__(
        self,
        app,
        capacity: float = 120.0,
        refill_rate: float = 30.0,
        enabled: bool = True,
    ):
        super().__init__(app)
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.enabled = enabled
        self.buckets: Dict[str, TokenBucket] = {}
        self.lock = threading.Lock()

    def _get_bucket(self, key: str) -> TokenBucket:
        with self.lock:
            if key not in self.buckets:
                self.buckets[key] = TokenBucket(self.capacity, self.refill_rate)
            return self.buckets[key]

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        # Exempt health probes from rate limits
        path = request.url.path
        if path in ("/health", "/api/v1/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Determine client key: token or client IP
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            client_key = f"token:{auth_header[7:30]}"
        else:
            client_ip = request.client.host if request.client else "unknown"
            client_key = f"ip:{client_ip}"

        bucket = self._get_bucket(client_key)
        allowed, retry_after = bucket.consume(1.0)

        if not allowed:
            headers = {"Retry-After": str(int(retry_after))}
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please back off and retry."},
                headers=headers,
            )

        response: Response = await call_next(request)
        return response
