import io
from pathlib import Path


def test_memory_bus_publish_and_read(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Memory WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Memory Project"},
    ).json()

    # Publish human constraint to blackboard
    pub_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/memory",
        headers=user_a_headers,
        json={
            "key": "cloud_run_region",
            "value": "asia-south1",
            "source_agent": "user",
            "confidence": 1.0,
        },
    )
    assert pub_res.status_code == 201
    mem = pub_res.json()
    assert mem["key"] == "cloud_run_region"
    assert mem["value"] == "asia-south1"

    # Get blackboard
    bb_res = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers)
    assert bb_res.status_code == 200
    bb = bb_res.json()
    assert bb["total_keys"] == 1
    assert bb["blackboard"]["cloud_run_region"] == "asia-south1"


def test_memory_bus_pipeline_propagation(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Pipeline Memory WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Pipeline Memory App"},
    ).json()

    # Upload healthy.zip fixture
    healthy_zip_path = Path("sample-projects/healthy.zip")
    assert healthy_zip_path.exists()
    with open(healthy_zip_path, "rb") as f:
        client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("healthy.zip", io.BytesIO(f.read()), "application/zip")},
        )

    # Trigger 4-agent pipeline
    pipe_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/pipeline",
        headers=user_a_headers,
        json={"custom_instruction": "Shared memory bus test"},
    )
    assert pipe_res.status_code == 201

    # Check Blackboard state
    bb_res = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers)
    assert bb_res.status_code == 200
    bb = bb_res.json()

    # Subagents must have published to the blackboard
    assert "topology" in bb["blackboard"]
    assert "security_risks" in bb["blackboard"]
    assert "rag_strategy" in bb["blackboard"]
    assert "deployment_spec" in bb["blackboard"]
    assert bb["total_keys"] >= 4

    # Clear memory
    del_res = client.delete(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_keys"] >= 4

    # Verify cleared
    bb_empty = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers).json()
    assert bb_empty["total_keys"] == 0


def test_cross_workspace_memory_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "User A Memory WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "User A Memory App"},
    ).json()

    # User B attempts to read memory
    bb_res = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_b_headers)
    assert bb_res.status_code == 403

    # User B attempts to publish memory
    pub_res = client.post(
        f"/api/v1/projects/{proj['id']}/agents/memory",
        headers=user_b_headers,
        json={"key": "malicious", "value": "hack"},
    )
    assert pub_res.status_code == 403

    # User B attempts to clear memory
    del_res = client.delete(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_b_headers)
    assert del_res.status_code == 403
