import io
from pathlib import Path


def test_project_report_generation_broken(client, user_a_headers):
    # Setup workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Audit Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Broken App Report Audit"},
    ).json()

    # Upload broken.zip fixture
    broken_zip_path = Path("sample-projects/broken.zip")
    assert broken_zip_path.exists()
    with open(broken_zip_path, "rb") as f:
        client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("broken.zip", io.BytesIO(f.read()), "application/zip")},
        )

    # Run diagnostics & data-readiness
    client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)

    # Fetch report JSON
    rep_res = client.get(f"/api/v1/projects/{proj['id']}/report", headers=user_a_headers)
    assert rep_res.status_code == 200
    report = rep_res.json()

    assert "report_id" in report
    assert report["report_id"].startswith("REP-")
    assert report["project"]["id"] == proj["id"]
    assert "production_readiness" in report
    assert report["production_readiness"]["verdict"] in ["Remediation Required", "Deployment Blocked"]
    assert report["production_readiness"]["severity_summary"]["total_unresolved"] > 0
    assert len(report["cloud_run_checklist"]) >= 4
    assert len(report["remediation_checklist"]) > 0

    # Download report as Markdown
    md_res = client.get(f"/api/v1/projects/{proj['id']}/report/download?format=markdown", headers=user_a_headers)
    assert md_res.status_code == 200
    assert "attachment;" in md_res.headers.get("content-disposition", "")
    assert ".md" in md_res.headers.get("content-disposition", "")
    assert "# Google Cloud Consulting" in md_res.text
    assert "## 3. Google Cloud Run Deployment Checklist" in md_res.text

    # Download report as JSON
    json_res = client.get(f"/api/v1/projects/{proj['id']}/report/download?format=json", headers=user_a_headers)
    assert json_res.status_code == 200
    assert ".json" in json_res.headers.get("content-disposition", "")


def test_project_report_generation_healthy(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Healthy WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Healthy App Audit"},
    ).json()

    healthy_zip_path = Path("sample-projects/healthy.zip")
    assert healthy_zip_path.exists()
    with open(healthy_zip_path, "rb") as f:
        client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("healthy.zip", io.BytesIO(f.read()), "application/zip")},
        )

    client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)

    rep_res = client.get(f"/api/v1/projects/{proj['id']}/report", headers=user_a_headers)
    assert rep_res.status_code == 200
    report = rep_res.json()

    assert report["production_readiness"]["readiness_index"] >= 80.0
    assert report["production_readiness"]["verdict"] == "Production Ready"


def test_cross_workspace_report_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "User A WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "User A Project"},
    ).json()

    # User B tries to view or download User A's report
    rep_res = client.get(f"/api/v1/projects/{proj['id']}/report", headers=user_b_headers)
    assert rep_res.status_code == 403

    dl_res = client.get(f"/api/v1/projects/{proj['id']}/report/download", headers=user_b_headers)
    assert dl_res.status_code == 403
