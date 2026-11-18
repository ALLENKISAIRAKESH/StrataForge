import time
import uuid
import logging
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("fde-observability")


def generate_trace_id() -> str:
    """Generates a 32-character hex trace ID formatted per W3C TraceContext."""
    return uuid.uuid4().hex


def generate_span_id() -> str:
    """Generates a 16-character hex span ID."""
    return uuid.uuid4().hex[:16]


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    OpenTelemetry-compatible distributed tracing & structured logging middleware.
    Injects W3C TraceContext headers (X-Trace-ID, X-Span-ID, X-Execution-Time-Ms)
    and emits structured JSON logs compatible with Google Cloud Logging / Cloud Trace.
    """

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Extract or generate Trace ID
        trace_id = (
            request.headers.get("X-Trace-ID")
            or request.headers.get("x-cloud-trace-context", "").split("/")[0]
            or generate_trace_id()
        )
        span_id = generate_span_id()

        # Attach to request state for downstream handlers
        request.state.trace_id = trace_id
        request.state.span_id = span_id

        # Process request
        response: Response = await call_next(request)

        # Calculate latency
        duration_ms = (time.time() - start_time) * 1000.0

        # Record metrics in Prometheus counter
        try:
            from backend.app.api.v1.endpoints.metrics import record_request_metric
            record_request_metric(request.method, request.url.path, response.status_code)
        except Exception:
            pass

        # Inject tracing headers into response
        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Span-ID"] = span_id
        response.headers["X-Execution-Time-Ms"] = f"{duration_ms:.2f}"

        # Structured Cloud Logging Record
        log_payload = {
            "severity": "INFO" if response.status_code < 400 else "WARNING" if response.status_code < 500 else "ERROR",
            "message": f"{request.method} {request.url.path} - {response.status_code} ({duration_ms:.1f}ms)",
            "httpRequest": {
                "requestMethod": request.method,
                "requestUrl": str(request.url),
                "status": response.status_code,
                "latency": f"{duration_ms / 1000.0:.4f}s",
                "userAgent": request.headers.get("User-Agent", "unknown"),
            },
            "logging.googleapis.com/trace": f"projects/fde-platform/traces/{trace_id}",
            "logging.googleapis.com/spanId": span_id,
        }
        logger.info(json.dumps(log_payload))

        return response
