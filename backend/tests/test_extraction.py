import io
import zipfile


def create_sample_zip(files: dict) -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files.items():
            zf.writestr(filename, content)
    buf.seek(0)
    return buf


def test_safe_zip_upload_and_classification(client, user_a_headers):
    # 1. Setup workspace & project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Enterprise AI"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "AI Assistant Backend"},
    ).json()

    # 2. Build mock enterprise project zip
    mock_files = {
        "Dockerfile": "FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nCMD [\"python\", \"main.py\"]\n",
        "docker-compose.yml": "version: '3.8'\nservices:\n  api:\n    build: .\n    ports:\n      - '8000:8000'\n",
        "main.py": "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/')\ndef root(): return {'hello': 'world'}\n",
        "requirements.txt": "fastapi==0.110.0\nuvicorn==0.28.0\nsqlalchemy==2.0.28\n",
        "schema.sql": "CREATE TABLE documents (id VARCHAR(36) PRIMARY KEY, title TEXT NOT NULL);\n",
        "openapi.json": "{\"openapi\": \"3.0.0\", \"info\": {\"title\": \"Service API\", \"version\": \"1.0.0\"}}\n",
        "README.md": "# AI Assistant Service\nProduction enterprise knowledge microservice.\n",
    }
    zip_buf = create_sample_zip(mock_files)

    # 3. Upload archive
    res = client.post(
        f"/api/v1/projects/{proj['id']}/upload",
        headers=user_a_headers,
        files={"file": ("project.zip", zip_buf, "application/zip")},
    )
    assert res.status_code == 201
    inventory = res.json()

    assert inventory["total_files"] == 7
    assert "Python" in inventory["detected_languages"]
    assert "SQL" in inventory["detected_languages"]
    assert "Docker" in inventory["detected_containers"]
    assert "Docker Compose" in inventory["detected_containers"]
    assert "FastAPI" in inventory["detected_frameworks"]
    assert "SQLAlchemy" in inventory["detected_frameworks"]

    # Verify classified categories
    cat_counts = inventory["category_counts"]
    assert cat_counts["container"] == 1
    assert cat_counts["orchestration"] == 1
    assert cat_counts["source_code"] == 1
    assert cat_counts["dependency"] == 1
    assert cat_counts["database"] == 1
    assert cat_counts["api_spec"] == 1
    assert cat_counts["documentation"] == 1

    # 4. Verify GET /projects/{id}/inventory returns the same
    get_res = client.get(f"/api/v1/projects/{proj['id']}/inventory", headers=user_a_headers)
    assert get_res.status_code == 200
    assert get_res.json()["total_files"] == 7


def test_zip_slip_traversal_blocked(client, user_a_headers):
    # Setup workspace & project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Security Test"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Vulnerable Target"},
    ).json()

    # Create malicious zip with path traversal
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:root:/root:/bin/bash")
    buf.seek(0)

    res = client.post(
        f"/api/v1/projects/{proj['id']}/upload",
        headers=user_a_headers,
        files={"file": ("malicious.zip", buf, "application/zip")},
    )
    # Must be blocked by SafeExtractionError with 400 Bad Request
    assert res.status_code == 400
    assert "Path traversal detected" in res.json()["detail"]


def test_invalid_archive_rejected(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Corrupt Test"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Corrupt Target"},
    ).json()

    fake_file = io.BytesIO(b"This is not a zip file at all")

    res = client.post(
        f"/api/v1/projects/{proj['id']}/upload",
        headers=user_a_headers,
        files={"file": ("not_a_zip.zip", fake_file, "application/zip")},
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "not a valid ZIP" in detail or "Invalid file signature" in detail or "not a zip file" in detail


def test_cross_workspace_upload_forbidden(client, user_a_headers, user_b_headers):
    # User A creates workspace and project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Alice Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Alice Project"},
    ).json()

    zip_buf = create_sample_zip({"main.py": "print('hello')"})

    # User B attempts to upload into Alice's project -> 403 Forbidden
    res = client.post(
        f"/api/v1/projects/{proj['id']}/upload",
        headers=user_b_headers,
        files={"file": ("project.zip", zip_buf, "application/zip")},
    )
    assert res.status_code == 403
