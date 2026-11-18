import io
from pathlib import Path


def test_diagnostics_on_broken_environment(client, user_a_headers):
    # Setup workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Audit Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Broken App Audit"},
    ).json()

    # Upload broken.zip fixture
    broken_zip_path = Path("sample-projects/broken.zip")
    assert broken_zip_path.exists()
    with open(broken_zip_path, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("broken.zip", io.BytesIO(f.read()), "application/zip")},
        )
    assert upload_res.status_code == 201

    # Run deterministic diagnostics
    diag_res = client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    assert diag_res.status_code == 200
    summary = diag_res.json()

    assert summary["total_findings"] >= 4
    by_rule = summary["by_rule"]

    # Verify seeded rules triggered with exact evidence
    assert "DOCKER_001" in by_rule, "Missing container healthcheck must be detected"
    assert "DEP_001" in by_rule, "Unpinned dependencies must be detected"
    assert "COMPOSE_001" in by_rule, "Hardcoded secrets in compose must be detected"
    assert "SQL_001" in by_rule, "Table missing primary key must be detected"

    # Find the COMPOSE_001 finding and check evidence
    findings = summary["findings"]
    compose_finding = next(f for f in findings if f["rule_id"] == "COMPOSE_001")
    assert "DB_PASSWORD" in compose_finding["evidence"]
    assert compose_finding["severity"] == "high"

    # Find the SQL_001 finding and check evidence
    sql_finding = next(f for f in findings if f["rule_id"] == "SQL_001")
    assert "audit_logs" in sql_finding["evidence"]
    assert sql_finding["severity"] == "high"


def test_diagnostics_on_healthy_environment(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Healthy Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Healthy Microservice"},
    ).json()

    healthy_zip_path = Path("sample-projects/healthy.zip")
    assert healthy_zip_path.exists()
    with open(healthy_zip_path, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("healthy.zip", io.BytesIO(f.read()), "application/zip")},
        )
    assert upload_res.status_code == 201

    diag_res = client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    assert diag_res.status_code == 200
    summary = diag_res.json()

    # Healthy environment must have ZERO high or critical defects
    by_sev = summary["by_severity"]
    assert by_sev.get("high", 0) == 0, "Healthy project should have 0 high severity defects"
    assert by_sev.get("critical", 0) == 0, "Healthy project should have 0 critical defects"

    by_rule = summary["by_rule"]
    assert "DOCKER_001" not in by_rule, "Healthy Dockerfile contains HEALTHCHECK"
    assert "COMPOSE_001" not in by_rule, "Healthy compose contains no hardcoded secrets"
    assert "DEP_001" not in by_rule, "Healthy requirements are fully pinned with =="
    assert "SQL_001" not in by_rule, "Healthy SQL table has explicit PRIMARY KEY"


def test_filter_findings_and_status_lifecycle(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Filter Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Status Lifecycle Project"},
    ).json()

    with open("sample-projects/broken.zip", "rb") as f:
        client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("broken.zip", io.BytesIO(f.read()), "application/zip")},
        )

    diag = client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers).json()
    target_finding = diag["findings"][0]
    finding_id = target_finding["id"]

    # Filter by severity
    high_findings = client.get(f"/api/v1/projects/{proj['id']}/findings?severity=high", headers=user_a_headers).json()
    assert all(f["severity"] == "high" for f in high_findings)

    # Update status to acknowledged
    patch_res = client.patch(
        f"/api/v1/findings/{finding_id}/status",
        headers=user_a_headers,
        json={"status": "acknowledged"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "acknowledged"

    # Update status to resolved
    resolve_res = client.patch(
        f"/api/v1/findings/{finding_id}/status",
        headers=user_a_headers,
        json={"status": "resolved"},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

    # Reject invalid status
    bad_res = client.patch(
        f"/api/v1/findings/{finding_id}/status",
        headers=user_a_headers,
        json={"status": "invalid_status_name"},
    )
    assert bad_res.status_code == 400


def test_cross_workspace_diagnostics_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Alice Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Alice Secret Project"},
    ).json()

    # User B attempts to run diagnostics on Alice's project -> 403 Forbidden
    res = client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_b_headers)
    assert res.status_code == 403

    # User B attempts to list Alice's project findings -> 403 Forbidden
    list_res = client.get(f"/api/v1/projects/{proj['id']}/findings", headers=user_b_headers)
    assert list_res.status_code == 403
