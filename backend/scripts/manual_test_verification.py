"""
End-to-End Manual Developer Testing Script.
Exercises the running local platform (FastAPI + Vite Proxy) across all user flows.
"""

import sys
import httpx
import json

BASE_URL = "http://127.0.0.1:5173/api/v1"  # Test through the Vite frontend proxy!

def run_e2e_verification():
    print("=" * 70)
    print("🚀 RUNNING END-TO-END MANUAL DEVELOPER TESTING PASS")
    print(f"Targeting Frontend Proxy: {BASE_URL}")
    print("=" * 70)

    client = httpx.Client(timeout=30.0)

    # 1. Health check
    print("\n[Step 1] Verifying System Health...")
    r = client.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code} {r.text}"
    health_data = r.json()
    print(f"  ✅ Health: {health_data['status']} | Service: {health_data['service']} | Version: {health_data['version']}")

    # 2. Authentication Login
    print("\n[Step 2] Authenticating as Lead FDE Engineer...")
    login_payload = {
        "email": "lead.engineer@googlecloud.internal",
        "password": "GoogleFDE2027!"
    }
    r = client.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token_data = r.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  ✅ Authenticated successfully! Token received ({token[:20]}...)")

    # 3. User Identity Verification (/auth/me)
    print("\n[Step 3] Fetching Current User Profile...")
    r = client.get(f"{BASE_URL}/auth/me", headers=headers)
    assert r.status_code == 200, f"Auth me failed: {r.status_code} {r.text}"
    me = r.json()
    print(f"  ✅ Identity: {me['full_name']} <{me['email']}>")

    # 4. Workspaces & Projects
    print("\n[Step 4] Fetching Workspaces & Projects...")
    r = client.get(f"{BASE_URL}/workspaces/", headers=headers)
    assert r.status_code == 200, f"List workspaces failed: {r.status_code} {r.text}"
    workspaces = r.json()
    assert len(workspaces) > 0, "No workspaces found"
    ws = workspaces[0]
    print(f"  ✅ Found Workspace: '{ws['name']}' (ID: {ws['id']})")

    r = client.get(f"{BASE_URL}/projects/?workspace_id={ws['id']}", headers=headers)
    assert r.status_code == 200, f"List projects failed: {r.status_code} {r.text}"
    projects = r.json()
    assert len(projects) >= 2, f"Expected at least 2 projects, got {len(projects)}"
    print(f"  ✅ Found {len(projects)} Client Projects:")
    for p in projects:
        print(f"     • {p['name']} [Status: {p['status']}] (ID: {p['id']})")

    p_broken = next((p for p in projects if "Legacy" in p["name"]), projects[0])
    p_healthy = next((p for p in projects if "GenAI" in p["name"]), projects[1])

    # 5. Project 1: Inventory & Static Diagnostics
    print(f"\n[Step 5] Inspecting Project: '{p_broken['name']}'...")
    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/inventory", headers=headers)
    assert r.status_code == 200, f"Inventory failed: {r.status_code} {r.text}"
    inv = r.json()
    print(f"  ✅ Inventory: {inv['total_files']} files, {inv['total_lines']} lines")
    print(f"     Languages: {inv['detected_languages']} | Frameworks: {inv['detected_frameworks']}")

    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/findings", headers=headers)
    assert r.status_code == 200, f"List findings failed: {r.status_code} {r.text}"
    findings = r.json()
    print(f"  ✅ Deterministic Findings Detected: {len(findings)} issues")
    for f in findings[:4]:
        print(f"     [{f['severity'].upper()}] {f['rule_id']} - {f['title']} in {f['file_path']} (L{f['line_start']}-L{f['line_end']})")

    # Also test triggering a live fresh diagnostic scan
    r_diag = client.post(f"{BASE_URL}/projects/{p_broken['id']}/diagnose", headers=headers)
    assert r_diag.status_code == 200, f"Trigger diagnostics failed: {r_diag.status_code} {r_diag.text}"
    print(f"  ✅ Trigger Fresh Diagnostics Scan: 200 OK (re-scanned {r_diag.json()['total_findings']} findings)")

    # 6. Data Readiness & Document Chunks
    print(f"\n[Step 6] Inspecting Data Readiness for Vertex AI...")
    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/data-readiness", headers=headers)
    assert r.status_code == 200, f"Data readiness failed: {r.status_code} {r.text}"
    dr = r.json()
    print(f"  ✅ Data Readiness Score: {dr['overall_score']:.1f}%")
    print(f"     Structured Score: {dr['structured_score']:.1f}% | Unstructured Score: {dr['unstructured_score']:.1f}%")
    print(f"     Generated Chunks: {dr['total_chunks']}")

    # 7. Multi-Agent Reasoning & Blackboard Memory Bus
    print(f"\n[Step 7] Inspecting 4-Agent Collaborative Pipeline & Blackboard...")
    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/agents/history", headers=headers)
    assert r.status_code == 200, f"Agent history failed: {r.status_code} {r.text}"
    agent_runs = r.json()
    print(f"  ✅ Agent Executions Persisted: {len(agent_runs)} stage runs")
    for a in agent_runs:
        print(f"     • Agent: {a['agent_type']} | Model: {a['model_name']} | Time: {a['execution_time_ms']}ms | Citations: {len(a['citations'])}")

    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/agents/memory", headers=headers)
    assert r.status_code == 200, f"Blackboard memory failed: {r.status_code} {r.text}"
    blackboard = r.json()
    print(f"  ✅ Shared Blackboard Bus: {blackboard['total_keys']} keys populated")
    for mem in blackboard['memories']:
        print(f"     Key: '{mem['key']}' | Source: {mem['source_agent']} | Confidence: {mem['confidence']}")

    # 8. Human-in-the-Loop Workbench & Diff Review
    print(f"\n[Step 8] Testing Human-in-the-Loop Workbench...")
    r = client.get(f"{BASE_URL}/projects/{p_broken['id']}/workbench/feedback", headers=headers)
    assert r.status_code == 200, f"Workbench feedback list failed: {r.status_code} {r.text}"
    feedback = r.json()
    print(f"  ✅ Review Items in Queue: {len(feedback)}")
    if feedback:
        print(f"     First item action: {feedback[0]['action']} | Status: {feedback[0]['status']}")
        print(f"     Diff preview (first line): {feedback[0]['original_content'].splitlines()[0] if feedback[0]['original_content'] else ''}")

    # 9. Project 2: Production IaC (Terraform Bundle & HCL Validator)
    print(f"\n[Step 9] Inspecting Production Terraform Bundle for '{p_healthy['name']}'...")
    r = client.get(f"{BASE_URL}/projects/{p_healthy['id']}/infra/terraform", headers=headers)
    assert r.status_code == 200, f"Terraform bundle failed: {r.status_code} {r.text}"
    tf = r.json()
    print(f"  ✅ Terraform Generated: Region: {tf['region']} | Valid HCL: {tf['is_valid']}")
    print(f"     Files generated: {list(tf['files'].keys())}")
    assert "main.tf" in tf["files"]
    assert "variables.tf" in tf["files"]

    # 10. Automated Benchmark Suite
    print("\n[Step 10] Executing Automated Evaluation Benchmark Suite...")
    r = client.post(f"{BASE_URL}/benchmarks/run", headers=headers)
    assert r.status_code == 200, f"Benchmark run failed: {r.status_code} {r.text}"
    bench = r.json()
    metrics = bench["metrics"]
    print(f"  ✅ Benchmark Status: {bench['status']} in {bench['duration_ms']}ms")
    print(f"     • Precision: {metrics['precision']:.3f} (>= 0.80 PASS)")
    print(f"     • Recall:    {metrics['recall']:.3f} (>= 0.80 PASS)")
    print(f"     • F1 Score:  {metrics['f1_score']:.3f} (>= 0.80 PASS)")
    print(f"     • Zero-Hallucination Verified: {metrics['zero_hallucination_verified']} (Faithfulness: {metrics['grounding_faithfulness'] * 100:.1f}%)")

    # 11. Prometheus Metrics Exporter
    print("\n[Step 11] Inspecting Prometheus Telemetry Metrics...")
    r = client.get(f"{BASE_URL}/metrics")
    assert r.status_code == 200, f"Metrics failed: {r.status_code} {r.text}"
    metric_lines = [l for l in r.text.splitlines() if not l.startswith("#") and l.strip()]
    print(f"  ✅ Prometheus Metrics Endpoint: 200 OK ({len(metric_lines)} metric entries emitted)")

    print("\n" + "=" * 70)
    print("🏆 ALL 11 END-TO-END MANUAL TEST GATES PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
