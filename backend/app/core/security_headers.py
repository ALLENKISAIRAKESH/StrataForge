from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects OWASP-recommended security headers into all HTTP responses
    to prevent clickjacking, MIME-sniffing, cross-site scripting (XSS),
    and enforce transport security.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Enforce MIME type sniffing defense
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking defense (deny framing)
        response.headers["X-Frame-Options"] = "DENY"

        # Legacy XSS filter activation
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HTTP Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permitted Cross-Domain Policies
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        return response
