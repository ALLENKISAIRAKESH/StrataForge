import io
import os
from pathlib import Path


def test_feedback_approval_and_rejection_lifecycle(client, user_a_headers):
    # Setup workspace & project
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Workbench WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Review App"},
    ).json()

    # 1. Submit approval feedback
    appr_res = client.post(
        f"/api/v1/projects/{proj['id']}/workbench/feedback",
        headers=user_a_headers,
        json={
            "target_type": "terraform",
            "action": "approve",
            "original_content": "resource google_cloud_run_v2_service { ... }",
            "reviewer_comments": "LGTM, meets production ingress and VPC parameters.",
        },
    )
    assert appr_res.status_code == 201
    appr_data = appr_res.json()
    assert appr_data["action"] == "approve"
    assert appr_data["status"] == "reviewed"
    assert appr_data["reviewer_name"] is not None

    # 2. Submit rejection feedback
    rej_res = client.post(
        f"/api/v1/projects/{proj['id']}/workbench/feedback",
        headers=user_a_headers,
        json={
            "target_type": "patch",
            "action": "reject",
            "original_content": "--- a/Dockerfile\n+++ b/Dockerfile\n@@ -1,1 +1,1 @@\n",
            "reviewer_comments": "Rejecting base image switch: must stay on debian-slim.",
        },
    )
    assert rej_res.status_code == 201
    rej_data = rej_res.json()
    assert rej_data["action"] == "reject"
    assert rej_data["status"] == "rejected"

    # Verify rejection published to memory bus
    bb_res = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers).json()
    assert any("rejected_recommendation" in k for k in bb_res["blackboard"].keys())

    # 3. List feedback history
    hist_res = client.get(f"/api/v1/projects/{proj['id']}/workbench/feedback", headers=user_a_headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) == 2


def test_apply_remediation_patch_and_resolve_finding(client, user_a_headers):
    # Setup workspace & project with broken.zip
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Patching WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Broken App to Patch"},
    ).json()

    broken_zip_path = Path("sample-projects/broken.zip")
    assert broken_zip_path.exists()
    with open(broken_zip_path, "rb") as f:
        up_res = client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("broken.zip", io.BytesIO(f.read()), "application/zip")},
        )
    assert up_res.status_code == 201

    # Run diagnostics to discover findings
    diag_res = client.post(f"/api/v1/projects/{proj['id']}/diagnose", headers=user_a_headers)
    assert diag_res.status_code == 200
    findings = diag_res.json()["findings"]
    assert len(findings) > 0

    # Locate unpinned dependency finding or docker finding
    dep_finding = next((f for f in findings if f["rule_id"] == "DEP_001"), findings[0])
    finding_id = dep_finding["id"]
    target_file = dep_finding["file_path"]

    # Construct unified diff patch
    patch = (
        f"--- a/{target_file}\n"
        f"+++ b/{target_file}\n"
        "@@ -1,4 +1,4 @@\n"
        "-fastapi\n"
        "-uvicorn\n"
        "+fastapi==0.115.0\n"
        "+uvicorn==0.30.6\n"
    )

    # Apply patch via Human-in-the-loop Workbench
    apply_res = client.post(
        f"/api/v1/projects/{proj['id']}/workbench/apply-patch",
        headers=user_a_headers,
        json={
            "finding_id": finding_id,
            "patch_content": patch,
            "reviewer_comments": "Approved and applied production dependency pins.",
        },
    )
    assert apply_res.status_code == 200
    res_data = apply_res.json()
    assert res_data["success"] is True
    assert res_data["finding_status"] == "resolved"
    assert res_data["file_path"] == target_file

    # Verify finding status is now 'resolved'
    f_res = client.get(f"/api/v1/projects/{proj['id']}/findings", headers=user_a_headers).json()
    resolved_finding = next((f for f in f_res if f["id"] == finding_id), None)
    assert resolved_finding is not None
    assert resolved_finding["status"] == "resolved"

    # Verify memory bus has recorded the applied patch
    bb = client.get(f"/api/v1/projects/{proj['id']}/agents/memory", headers=user_a_headers).json()
    assert any("patch_applied" in k for k in bb["blackboard"].keys())


def test_apply_patch_path_traversal_blocked(client, user_a_headers):
    ws = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "Sec WS"}).json()
    proj = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws["id"], "name": "Sec App"},
    ).json()

    healthy_zip_path = Path("sample-projects/healthy.zip")
    with open(healthy_zip_path, "rb") as f:
        client.post(
            f"/api/v1/projects/{proj['id']}/upload",
            headers=user_a_headers,
            files={"file": ("healthy.zip", io.BytesIO(f.read()), "application/zip")},
        )

    # Malicious patch trying to escape extracted folder
    malicious_patch = (
        "--- a/../../../../etc/passwd\n"
        "+++ b/../../../../etc/passwd\n"
        "@@ -1,1 +1,1 @@\n"
        "+malicious_root:x:0:0::/root:/bin/bash\n"
    )

    res = client.post(
        f"/api/v1/projects/{proj['id']}/workbench/apply-patch",
        headers=user_a_headers,
        json={"patch_content": malicious_patch},
    )
    assert res.status_code in (400, 404, 422)


def test_cross_workspace_workbench_isolation(client, user_a_headers, user_b_headers):
    # User A project
    ws_a = client.post("/api/v1/workspaces/", headers=user_a_headers, json={"name": "WS A"}).json()
    proj_a = client.post(
        "/api/v1/projects/",
        headers=user_a_headers,
        json={"workspace_id": ws_a["id"], "name": "Project A"},
    ).json()

    # User B attempts to access User A's feedback
    res = client.get(f"/api/v1/projects/{proj_a['id']}/workbench/feedback", headers=user_b_headers)
    assert res.status_code == 403

    # User B attempts to apply patch to User A's project
    patch_res = client.post(
        f"/api/v1/projects/{proj_a['id']}/workbench/apply-patch",
        headers=user_b_headers,
        json={"patch_content": "--- a/Dockerfile\n+++ b/Dockerfile\n"},
    )
    assert patch_res.status_code == 403
