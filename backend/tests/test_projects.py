def test_create_and_get_project(client, user_a_headers):
    # 1. Create workspace
    ws_res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Dev Workspace"},
    )
    ws_id = ws_res.json()["id"]

    # 2. Create project
    proj_res = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={
            "workspace_id": ws_id,
            "name": "Acme Knowledge Assistant",
            "description": "Multi-agent RAG knowledge system",
            "repository_url": "https://github.com/acme/knowledge-assistant",
        },
    )
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    assert proj_data["name"] == "Acme Knowledge Assistant"
    assert proj_data["status"] == "created"
    proj_id = proj_data["id"]

    # 3. Get project
    get_res = client.get(f"/api/v1/projects/{proj_id}", headers=user_a_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == proj_id


def test_project_cross_tenant_isolation(client, user_a_headers, user_b_headers):
    # User A creates workspace and project
    ws_res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Alice Secret Projects"},
    )
    ws_id = ws_res.json()["id"]

    proj_res = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws_id, "name": "Confidential AI"},
    )
    proj_id = proj_res.json()["id"]

    # User B attempts to access project -> 403 Forbidden
    b_res = client.get(f"/api/v1/projects/{proj_id}", headers=user_b_headers)
    assert b_res.status_code == 403

    # User B attempts to create project in Alice's workspace -> 403 Forbidden
    b_create = client.post(
        "/api/v1/projects/",
        headers=user_b_headers,
        json={"workspace_id": ws_id, "name": "Injected Project"},
    )
    assert b_create.status_code == 403


def test_update_and_delete_project(client, user_a_headers):
    ws_res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Ops Workspace"},
    )
    ws_id = ws_res.json()["id"]

    proj_res = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws_id, "name": "Initial Name"},
    )
    proj_id = proj_res.json()["id"]

    # Update
    patch_res = client.patch(
        f"/api/v1/projects/{proj_id}",
        headers=user_a_headers,
        json={"name": "Updated Name", "status": "uploaded"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Name"
    assert patch_res.json()["status"] == "uploaded"

    # Delete
    del_res = client.delete(f"/api/v1/projects/{proj_id}", headers=user_a_headers)
    assert del_res.status_code == 204

    # Verify deleted
    get_res = client.get(f"/api/v1/projects/{proj_id}", headers=user_a_headers)
    assert get_res.status_code == 404
