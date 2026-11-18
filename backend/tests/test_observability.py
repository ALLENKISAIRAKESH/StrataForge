def test_distributed_trace_headers_injected(client):
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert "X-Trace-ID" in headers
    assert len(headers["X-Trace-ID"]) >= 16
    assert "X-Span-ID" in headers
    assert "X-Execution-Time-Ms" in headers


def test_trace_id_propagation(client):
    custom_trace = "0123456789abcdef0123456789abcdef"
    res = client.get("/health", headers={"X-Trace-ID": custom_trace})
    assert res.status_code == 200
    assert res.headers.get("X-Trace-ID") == custom_trace


def test_prometheus_metrics_endpoint(client, user_a_headers):
    # Make a request to increment counter
    client.get("/api/v1/health")

    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers["content-type"]

    body = res.text
    assert "fde_http_requests_total" in body
    assert "fde_active_workspaces" in body
    assert "fde_active_projects" in body
    assert "fde_agent_executions_total" in body
    assert "fde_findings_discovered_total" in body
