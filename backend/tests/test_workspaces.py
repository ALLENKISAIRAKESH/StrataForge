def test_create_workspace(client, user_a_headers):
    res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Acme Cloud", "description": "Acme enterprise workspace"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Acme Cloud"
    assert data["slug"] == "acme-cloud"
    assert "id" in data


def test_list_workspaces(client, user_a_headers):
    client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Workspace 1"},
    )
    client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Workspace 2"},
    )
    res = client.get("/api/v1/workspaces/", headers=user_a_headers)
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) == 2


def test_workspace_isolation_user_b_forbidden(client, user_a_headers, user_b_headers):
    # User A creates workspace
    create_res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Alice Private Workspace"},
    )
    assert create_res.status_code == 201
    ws_id = create_res.json()["id"]

    # User B attempts to access Alice's workspace -> 403 Forbidden
    access_res = client.get(f"/api/v1/workspaces/{ws_id}", headers=user_b_headers)
    assert access_res.status_code == 403

    # User B attempts to delete Alice's workspace -> 403 Forbidden
    del_res = client.delete(f"/api/v1/workspaces/{ws_id}", headers=user_b_headers)
    assert del_res.status_code == 403


def test_delete_workspace_owner(client, user_a_headers):
    res = client.post(
        "/api/v1/workspaces/",
        headers=user_a_headers,
        json={"name": "Disposable Workspace"},
    )
    ws_id = res.json()["id"]

    del_res = client.delete(f"/api/v1/workspaces/{ws_id}", headers=user_a_headers)
    assert del_res.status_code == 204

    # Verify deleted
    get_res = client.get(f"/api/v1/workspaces/{ws_id}", headers=user_a_headers)
    assert get_res.status_code == 404
