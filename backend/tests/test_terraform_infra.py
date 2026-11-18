import io
import zipfile


def test_generate_project_terraform_bundle(client, user_a_headers):
    # Setup workspace & project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "IaC Workspace"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Payment Gateway API"},
    ).json()

    # Fetch dynamic Terraform bundle
    res = client.get(f"/api/v1/projects/{proj['id']}/infra/terraform", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["project_id"] == proj["id"]
    assert data["region"] == "asia-south1"
    assert data["is_valid"] is True
    assert len(data["validation_errors"]) == 0

    files = data["files"]
    assert "main.tf" in files
    assert "variables.tf" in files
    assert "outputs.tf" in files
    assert "terraform.tfvars" in files

    main_tf = files["main.tf"]
    assert "google_cloud_run_v2_service" in main_tf
    assert "google_vpc_access_connector" in main_tf
    assert "google_secret_manager_secret" in main_tf
    assert "google_sql_database_instance" in main_tf
    assert "startup_probe" in main_tf
    assert "liveness_probe" in main_tf


def test_terraform_region_from_blackboard_memory(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Memory IaC WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Europe Service"},
    ).json()

    # Publish custom region constraint to memory bus
    client.post(
        f"/api/v1/projects/{proj['id']}/agents/memory",
        headers=user_a_headers,
        json={
            "key": "cloud_run_region",
            "value": "europe-west1",
            "source_agent": "human_supervisor",
            "confidence": 1.0,
        },
    )

    # Fetch terraform and verify memory bus was respected
    res = client.get(f"/api/v1/projects/{proj['id']}/infra/terraform", headers=user_a_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["region"] == "europe-west1"
    assert 'default     = "europe-west1"' in data["files"]["variables.tf"]


def test_validate_terraform_code_endpoint(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Val WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Val App"},
    ).json()

    # 1. Valid Terraform
    valid_hcl = (
        'resource "google_cloud_run_v2_service" "svc" {\n'
        '  name = "app"\n'
        '  template {\n'
        '    containers {\n'
        '      image = "gcr.io/proj/app:v1"\n'
        '      startup_probe { http_get { path = "/health" } }\n'
        '      liveness_probe { http_get { path = "/health" } }\n'
        '    }\n'
        '  }\n'
        '}\n'
        'resource "google_vpc_access_connector" "conn" {}\n'
        'resource "google_secret_manager_secret" "sec" {}\n'
    )
    v_res = client.post(
        f"/api/v1/projects/{proj['id']}/infra/terraform/validate",
        headers=user_a_headers,
        json={"terraform_code": valid_hcl},
    )
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is True

    # 2. Invalid Terraform (missing probes and unmatched brace)
    invalid_hcl = 'resource "google_cloud_run_v2_service" "svc" { name = "bad"'
    inv_res = client.post(
        f"/api/v1/projects/{proj['id']}/infra/terraform/validate",
        headers=user_a_headers,
        json={"terraform_code": invalid_hcl},
    )
    assert inv_res.status_code == 200
    assert inv_res.json()["is_valid"] is False
    assert len(inv_res.json()["errors"]) > 0


def test_download_terraform_zip(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Zip WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Downloadable App"},
    ).json()

    res = client.get(f"/api/v1/projects/{proj['id']}/infra/terraform/download", headers=user_a_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"

    # Verify zip content
    zip_bytes = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "main.tf" in namelist
        assert "variables.tf" in namelist
        assert "outputs.tf" in namelist
        assert "terraform.tfvars" in namelist


def test_cross_workspace_infra_isolation(client, user_a_headers, user_b_headers):
    ws_a = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "WS A"}).json()
    proj_a = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws_a["id"], "name": "Project A"},
    ).json()

    # User B should be forbidden
    res = client.get(f"/api/v1/projects/{proj_a['id']}/infra/terraform", headers=user_b_headers)
    assert res.status_code == 403

    dl_res = client.get(f"/api/v1/projects/{proj_a['id']}/infra/terraform/download", headers=user_b_headers)
    assert dl_res.status_code == 403
