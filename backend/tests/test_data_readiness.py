import io
from pathlib import Path
from backend.app.services.chunker import chunk_document, estimate_tokens


def test_chunk_document_unit():
    sample_md = """# Project Documentation
This is an overview of the enterprise platform.

## Architecture
The system consists of a FastAPI backend and a React frontend.
It uses SQLite for local development and PostgreSQL in production.

### Storage
Persistent data is stored in the database.
Decompressed project artifacts are held in the storage directory.
"""
    chunks = chunk_document("docs/ARCHITECTURE.md", sample_md, target_chunk_size=150, chunk_overlap=30)
    assert len(chunks) > 0
    assert chunks[0]["file_path"] == "docs/ARCHITECTURE.md"
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["token_count"] > 0
    assert "Architecture" in chunks[0]["metadata"]["headings"] or "Project Documentation" in chunks[0]["metadata"]["headings"]
    assert chunks[0]["metadata"]["line_start"] >= 1
    assert chunks[0]["metadata"]["line_end"] >= chunks[0]["metadata"]["line_start"]

    # Test empty string
    assert chunk_document("empty.md", "   \n\n  ") == []


def test_data_readiness_on_healthy_environment(client, user_a_headers):
    # Setup workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Data Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Healthy Data App"},
    ).json()

    # Upload healthy.zip
    healthy_zip_path = Path("sample-projects/healthy.zip")
    assert healthy_zip_path.exists()
    with open(healthy_zip_path, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("healthy.zip", io.BytesIO(f.read()), "application/zip")},
        )
    assert upload_res.status_code == 201

    # Trigger Assessment
    eval_res = client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)
    assert eval_res.status_code == 200
    report = eval_res.json()

    assert report["project_id"] == proj["id"]
    assert report["overall_score"] > 50.0
    assert report["structured_score"] >= 80.0
    assert report["total_chunks"] > 0
    assert "structured" in report["metrics"]
    assert "unstructured" in report["metrics"]
    assert len(report["recommendations"]) > 0

    # Retrieve existing assessment
    get_res = client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)
    assert get_res.status_code == 200

    # Retrieve chunks with pagination
    chunks_res = client.get(f"/api/v1/projects/{proj['id']}/chunks?limit=10&offset=0", headers=user_a_headers)
    assert chunks_res.status_code == 200
    chunks = chunks_res.json()
    assert len(chunks) > 0
    assert "token_count" in chunks[0]
    assert "metadata" in chunks[0]


def test_data_readiness_on_broken_environment(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Broken Data WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Broken Data App"},
    ).json()

    broken_zip_path = Path("sample-projects/broken.zip")
    assert broken_zip_path.exists()
    with open(broken_zip_path, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("broken.zip", io.BytesIO(f.read()), "application/zip")},
        )
    assert upload_res.status_code == 201

    eval_res = client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_a_headers)
    assert eval_res.status_code == 200
    report = eval_res.json()

    # Broken environment has tables without primary keys (e.g., audit_logs)
    assert any("PRIMARY KEY" in rec for rec in report["recommendations"])
    assert report["structured_score"] < 100.0


def test_cross_workspace_data_readiness_isolation(client, user_a_headers, user_b_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "User A Secure WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "User A Private App"},
    ).json()

    # User B attempts to assess or inspect chunks of User A's project
    eval_res = client.post(f"/api/v1/projects/{proj['id']}/data-readiness", headers=user_b_headers)
    assert eval_res.status_code == 403

    chunks_res = client.get(f"/api/v1/projects/{proj['id']}/chunks", headers=user_b_headers)
    assert chunks_res.status_code == 403
