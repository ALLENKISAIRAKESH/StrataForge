import io
from pathlib import Path


def test_agent_reasoning_lifecycle(client, user_a_headers):
    # Setup workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Agent Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Agent Audit App"},
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

    # Run diagnostics & data readiness to populate context
    client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)

    # 1. Test Discovery Agent
    disc_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/reason",
        headers=user_a_headers,
        json={"agent_type": "discovery"},
    )
    assert disc_res.status_code == 201
    disc_data = disc_res.json()
    assert disc_data["agent_type"] == "discovery"
    assert len(disc_data["thought_chain"]) >= 3
    assert "Architecture" in disc_data["output_markdown"]
    assert disc_data["tokens_used"] > 0

    # 2. Test Security Agent with Exact Citations
    sec_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/reason",
        headers=user_a_headers,
        json={"agent_type": "security"},
    )
    assert sec_res.status_code == 201
    sec_data = sec_res.json()
    assert sec_data["agent_type"] == "security"
    assert len(sec_data["citations"]) > 0
    # Ensure citations reference actual files from broken.zip
    cited_files = [c["file_path"] for c in sec_data["citations"]]
    assert any("docker-compose.yml" in f or "init.sql" in f or "Dockerfile" in f for f in cited_files)

    # 3. Test Data Readiness Agent
    data_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/reason",
        headers=user_a_headers,
        json={"agent_type": "data_readiness"},
    )
    assert data_res.status_code == 201
    data_agent = data_res.json()
    assert "RAG" in data_agent["output_markdown"]

    # 4. Test Deployment Planner Agent
    deploy_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/reason",
        headers=user_a_headers,
        json={"agent_type": "deployment_planner"},
    )
    assert deploy_res.status_code == 201
    deploy_data = deploy_res.json()
    assert "Cloud Run" in deploy_data["output_markdown"]

    # 5. Test History Retrieval
    hist_res = client.get(f"/api/v1/projects/{proj['id']}/agents/history", headers=user_a_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 4
    assert history[0]["agent_type"] == "deployment_planner"  # Most recent first


def test_cross_workspace_agent_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "User A Private WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "User A Private App"},
    ).json()

    # User B attempts to trigger reasoning on User A's project
    agent_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/reason",
        headers=user_b_headers,
        json={"agent_type": "discovery"},
    )
    assert agent_res.status_code == 403

    # User B attempts to access reasoning history
    hist_res = client.get(f"/api/v1/projects/{proj['id']}/agents/history", headers=user_b_headers)
    assert hist_res.status_code == 403
