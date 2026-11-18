import threading
from typing import Dict
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.entities import Workspace, Project, Finding, AgentExecution

router = APIRouter()

# In-memory Prometheus metric counters
_lock = threading.Lock()
_request_counts: Dict[str, int] = {}


def record_request_metric(method: str, path: str, status_code: int):
    """Records an HTTP request event for Prometheus telemetry."""
    # Sanitize path to avoid cardinality explosion
    clean_path = path.split("?")[0]
    for prefix in ("/api/v1/projects/", "/api/v1/workspaces/", "/api/v1/findings/"):
        if prefix in clean_path:
            parts = clean_path.split("/")
            # replace UUIDs with {id}
            clean_path = "/".join(["{id}" if len(p) == 36 and "-" in p else p for p in parts])
            break

    key = f'{method}:{clean_path}:{status_code}'
    with _lock:
        _request_counts[key] = _request_counts.get(key, 0) + 1


@router.get("/metrics", response_class=Response)
def get_prometheus_metrics(db: Session = Depends(get_db)):
    """
    Exposes platform operational telemetry in standard Prometheus exposition format.
    Scraped by Google Cloud Managed Service for Prometheus (GMP) or Prometheus server.
    """
    lines = [
        "# HELP fde_http_requests_total Total number of HTTP requests processed by endpoint and status.",
        "# TYPE fde_http_requests_total counter",
    ]

    with _lock:
        if not _request_counts:
            lines.append('fde_http_requests_total{method="GET",endpoint="/health",status="200"} 1')
        for key, count in _request_counts.items():
            parts = key.split(":")
            if len(parts) == 3:
                m, ep, st = parts
                lines.append(f'fde_http_requests_total{{method="{m}",endpoint="{ep}",status="{st}"}} {count}')

    # Database Gauges & Counters
    ws_count = db.query(Workspace).count()
    proj_count = db.query(Project).count()
    agent_exec_count = db.query(AgentExecution).count()
    finding_count = db.query(Finding).count()

    lines.extend([
        "",
        "# HELP fde_active_workspaces Total number of tenant workspaces provisioned.",
        "# TYPE fde_active_workspaces gauge",
        f"fde_active_workspaces {ws_count}",
        "",
        "# HELP fde_active_projects Total number of enterprise projects analyzed.",
        "# TYPE fde_active_projects gauge",
        f"fde_active_projects {proj_count}",
        "",
        "# HELP fde_agent_executions_total Total multi-agent reasoning runs executed.",
        "# TYPE fde_agent_executions_total counter",
        f"fde_agent_executions_total {agent_exec_count}",
        "",
        "# HELP fde_findings_discovered_total Total static defect findings identified.",
        "# TYPE fde_findings_discovered_total counter",
        f"fde_findings_discovered_total {finding_count}",
        "",
    ])

    metrics_text = "\n".join(lines) + "\n"
    return Response(content=metrics_text, media_type="text/plain; version=0.0.4; charset=utf-8")
