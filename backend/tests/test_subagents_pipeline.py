import io
from pathlib import Path
from backend.app.services.subagents import (
    generate_security_patch,
    generate_cloud_run_terraform,
    generate_cloud_build_yaml,
)


def test_subagent_generators_unit():
    # 1. Healthcheck patch
    patch_hc = generate_security_patch({"rule_id": "DOCKER_001", "file_path": "Dockerfile"})
    assert "HEALTHCHECK" in patch_hc
    assert "--- a/Dockerfile" in patch_hc

    # 2. Non-root user patch
    patch_user = generate_security_patch({"rule_id": "DOCKER_002", "file_path": "Dockerfile"})
    assert "USER appuser" in patch_user

    # 3. Hardcoded secret patch
    patch_secret = generate_security_patch({"rule_id": "COMPOSE_001", "file_path": "docker-compose.yml"})
    assert "${DB_PASSWORD}" in patch_secret

    # 4. SQL Primary Key patch
    patch_sql = generate_security_patch({"rule_id": "SQL_001", "file_path": "init.sql"})
    assert "PRIMARY KEY" in patch_sql

    # 5. Cloud Run Terraform
    tf = generate_cloud_run_terraform("Enterprise Microservice")
    assert "google_cloud_run_v2_service" in tf
    assert "enterprise-microservice" in tf
    assert "startup_probe" in tf
    assert "liveness_probe" in tf

    # 6. Cloud Build YAML
    cb = generate_cloud_build_yaml("Enterprise Microservice")
    assert "steps:" in cb
    assert "gcr.io/cloud-builders/docker" in cb
    assert "run" in cb


def test_collaborative_agent_pipeline_execution(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Pipeline WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Pipeline Project"},
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

    # Run diagnostics & data readiness
    client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)

    # Trigger Full 4-Agent Pipeline
    pipe_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/pipeline",
        headers=user_a_headers,
        json={"custom_instruction": "Optimize for lowest operational cost on Cloud Run"},
    )
    assert pipe_res.status_code == 201
    pipe_data = pipe_res.json()

    assert pipe_data["pipeline_status"] == "completed"
    assert len(pipe_data["stages_executed"]) == 4
    assert "discovery" in pipe_data["stage_results"]
    assert "security" in pipe_data["stage_results"]
    assert "data_readiness" in pipe_data["stage_results"]
    assert "deployment_planner" in pipe_data["stage_results"]

    # Verify specialized artifacts produced
    sec_stage = pipe_data["stage_results"]["security"]
    assert "unified_diff_patches" in sec_stage["structured_data"]
    assert len(sec_stage["structured_data"]["unified_diff_patches"]) > 0

    deploy_stage = pipe_data["stage_results"]["deployment_planner"]
    assert "terraform_config" in deploy_stage["structured_data"]
    assert "cloud_build_yaml" in deploy_stage["structured_data"]

    # Verify history recorded pipeline execution
    hist_res = client.get(f"/api/v1/projects/{proj['id']}/agents/history", headers=user_a_headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert any(h["agent_type"] == "collaborative_pipeline" for h in hist)


def test_cross_workspace_pipeline_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Secure WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Secure Project"},
    ).json()

    # User B attempts to run pipeline on User A's project
    res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/pipeline",
        headers=user_b_headers,
        json={},
    )
    assert res.status_code == 403
