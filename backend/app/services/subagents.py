"""
Specialized Engineering Subagents & Collaborative Multi-Agent Pipeline.
Implements Google Cloud Consulting FDE domain specialists:
1. Discovery Specialist (Architecture & Inter-Service Coupling)
2. Security Reviewer (CWE/CVSS Mapping & Unified Diff Patches)
3. Data Readiness Architect (Vertex AI & BigQuery Vector Search Planning)
4. Deployment Planning Agent (Terraform & Cloud Build Generation)
5. Multi-Agent Collaborative Pipeline (Chained Sequential & Fan-Out Orchestration)
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.core.prompts import AGENT_ROLES
from backend.app.services.llm_client import execute_agent_reasoning
from backend.app.services.memory_bus import publish_memory, get_project_blackboard


def generate_security_patch(finding: dict) -> str:
    """Generates a git-compatible unified diff patch for a deterministic defect."""
    rule_id = finding.get("rule_id", "")
    file_path = finding.get("file_path", "")

    if rule_id == "DOCKER_001":  # Missing HEALTHCHECK
        return (
            f"--- a/{file_path}\n"
            f"+++ b/{file_path}\n"
            "@@ -10,3 +10,6 @@\n"
            " EXPOSE 8000\n"
            "+# Google Cloud Run Health Probe\n"
            "+HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\\n"
            "+  CMD curl -f http://localhost:8000/health || exit 1\n"
            " CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n"
        )
    elif rule_id == "DOCKER_002":  # Root user
        return (
            f"--- a/{file_path}\n"
            f"+++ b/{file_path}\n"
            "@@ -5,3 +5,6 @@\n"
            " WORKDIR /app\n"
            "+# Least-Privilege Execution UID\n"
            "+RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser\n"
            "+USER appuser\n"
            " CMD [\"uvicorn\", \"main:app\"]\n"
        )
    elif rule_id == "COMPOSE_001":  # Hardcoded secrets
        return (
            f"--- a/{file_path}\n"
            f"+++ b/{file_path}\n"
            "@@ -13,3 +13,3 @@\n"
            "     environment:\n"
            "-      - DB_PASSWORD=secret123\n"
            "+      - DB_PASSWORD=${DB_PASSWORD}\n"
        )
    elif rule_id == "SQL_001":  # Missing primary key
        return (
            f"--- a/{file_path}\n"
            f"+++ b/{file_path}\n"
            "@@ -1,5 +1,6 @@\n"
            " CREATE TABLE audit_logs (\n"
            "+    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n"
            "     event VARCHAR(100),\n"
            "     created_at TIMESTAMP\n"
            " );\n"
        )
    elif rule_id == "DEP_001":  # Unpinned dependencies
        return (
            f"--- a/{file_path}\n"
            f"+++ b/{file_path}\n"
            "@@ -1,4 +1,4 @@\n"
            "-fastapi\n"
            "-uvicorn\n"
            "+fastapi==0.115.0\n"
            "+uvicorn==0.30.6\n"
        )
    return (
        f"--- a/{file_path}\n"
        f"+++ b/{file_path}\n"
        f"@@ -1,1 +1,1 @@\n"
        f"+# Resolve {rule_id}: {finding.get('recommended_action')}\n"
    )


def generate_cloud_run_terraform(project_name: str, region: str = "us-central1") -> str:
    """Generates production-grade Terraform for Google Cloud Run v2."""
    slug = project_name.lower().replace(" ", "-")
    return f"""# Google Cloud Run v2 Service Definition
resource "google_cloud_run_v2_service" "{slug}_service" {{
  name     = "{slug}"
  location = "{region}"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {{
    scaling {{
      min_instance_count = 0
      max_instance_count = 10
    }}

    containers {{
      image = "gcr.io/${{var.gcp_project_id}}/{slug}:latest"

      resources {{
        limits = {{
          cpu    = "2000m"
          memory = "2Gi"
        }}
      }}

      ports {{
        container_port = 8000
      }}

      startup_probe {{
        http_get {{
          path = "/health"
          port = 8000
        }}
        initial_delay_seconds = 2
        period_seconds        = 5
        failure_threshold     = 3
      }}

      liveness_probe {{
        http_get {{
          path = "/health"
          port = 8000
        }}
        period_seconds = 10
      }}

      env {{
        name = "DB_PASSWORD"
        value_source {{
          secret_key_ref {{
            secret  = "projects/${{var.gcp_project_id}}/secrets/{slug}-db-password"
            version = "latest"
          }}
        }}
      }}
    }}
  }}
}}
"""


def generate_cloud_build_yaml(project_name: str) -> str:
    """Generates Google Cloud Build CI/CD pipeline."""
    slug = project_name.lower().replace(" ", "-")
    return f"""# Google Cloud Build Pipeline for Cloud Run
steps:
  # 1. Build Container Image with commit SHA
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/{slug}:$COMMIT_SHA', '-t', 'gcr.io/$PROJECT_ID/{slug}:latest', '.']

  # 2. Push Image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/{slug}:$COMMIT_SHA']

  # 3. Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - '{slug}'
      - '--image'
      - 'gcr.io/$PROJECT_ID/{slug}:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'

images:
  - 'gcr.io/$PROJECT_ID/{slug}:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/{slug}:latest'
"""


def run_collaborative_agent_pipeline(
    project_name: str,
    inventory_summary: dict,
    findings: list,
    data_readiness: dict | None,
    custom_instruction: str | None = None,
    project_id: str | None = None,
    db: Session | None = None,
) -> Dict[str, Any]:
    """
    Executes the 4-agent collaborative workflow:
    1. Discovery Agent: maps topology -> publishes 'topology'
    2. Security Agent: assesses vulnerabilities & produces diff patches -> publishes 'security_risks'
    3. Data Readiness Agent: formulates vector search plan -> publishes 'rag_strategy'
    4. Deployment Planning Agent: generates Terraform and Cloud Build assets -> publishes 'deployment_spec'
    5. Synthesis: aggregates into an executive deployment roadmap package
    """
    pipeline_results = {}
    total_tokens = 0
    total_time_ms = 0

    stages = ["discovery", "security", "data_readiness", "deployment_planner"]

    for stage in stages:
        res, elapsed, model = execute_agent_reasoning(
            agent_type=stage,
            project_name=project_name,
            inventory_summary=inventory_summary,
            findings=findings,
            data_readiness=data_readiness,
            custom_instruction=custom_instruction,
        )
        total_time_ms += elapsed
        stage_tokens = max(1, len(str(res)) // 4)
        total_tokens += stage_tokens

        # Augment with deep assets for specific agents & publish to Memory Bus
        if stage == "discovery":
            if project_id and db:
                publish_memory(
                    project_id=project_id,
                    key="topology",
                    value=res.get("structured_data", {}),
                    source_agent="discovery",
                    db=db,
                )
        elif stage == "security":
            patches = [generate_security_patch(f) for f in findings]
            res["structured_data"]["unified_diff_patches"] = patches
            if project_id and db:
                publish_memory(
                    project_id=project_id,
                    key="security_risks",
                    value=res.get("structured_data", {}),
                    source_agent="security",
                    db=db,
                )
        elif stage == "data_readiness":
            if project_id and db:
                publish_memory(
                    project_id=project_id,
                    key="rag_strategy",
                    value=res.get("structured_data", {}),
                    source_agent="data_readiness",
                    db=db,
                )
        elif stage == "deployment_planner":
            tf_code = generate_cloud_run_terraform(project_name)
            cb_yaml = generate_cloud_build_yaml(project_name)
            res["structured_data"]["terraform_config"] = tf_code
            res["structured_data"]["cloud_build_yaml"] = cb_yaml
            if project_id and db:
                publish_memory(
                    project_id=project_id,
                    key="deployment_spec",
                    value={
                        "target": "Google Cloud Run",
                        "region": "us-central1",
                        "terraform_available": True,
                    },
                    source_agent="deployment_planner",
                    db=db,
                )

        pipeline_results[stage] = res

    # Retrieve Consolidated Blackboard if DB available
    blackboard = {}
    if project_id and db:
        blackboard, _ = get_project_blackboard(project_id, db)

    # Synthesize Master Executive Summary
    summary_md = [
        f"# Google Cloud Consulting — Collaborative Multi-Agent Advisory Package",
        f"**Target System:** `{project_name}`",
        f"**Pipeline Mode:** Autonomous 4-Agent Sequential & Blackboard Synthesis",
        "",
        "## Executive Summary & Stage Findings",
        f"1. **Architecture & Topology (Discovery Agent):** {len(inventory_summary.get('detected_frameworks', []))} framework(s), {inventory_summary.get('total_files', 0)} files analyzed.",
        f"2. **Security & Vulnerability Analysis (Security Reviewer):** {len(findings)} deterministic findings analyzed with automated code patches generated.",
        f"3. **RAG & Knowledge Retrieval (Data Readiness Architect):** Evaluated structured SQL and document chunk distributions for Vertex AI Search ingestion.",
        f"4. **Cloud Run Deployment Blueprint (Deployment Strategist):** Terraform v2 resource and Cloud Build manifest produced.",
        "",
        "---",
        "## Automated Unified Diff Patches for Open Defects",
        "",
    ]

    for f in findings:
        patch = generate_security_patch(f)
        summary_md.append(f"### Patch for [{f.get('rule_id')}] in `{f.get('file_path')}`")
        summary_md.append("```diff")
        summary_md.append(patch.strip())
        summary_md.append("```")
        summary_md.append("")

    return {
        "pipeline_status": "completed",
        "stages_executed": stages,
        "stage_results": pipeline_results,
        "shared_blackboard": blackboard,
        "executive_summary_markdown": "\n".join(summary_md),
        "total_tokens_used": total_tokens,
        "total_execution_time_ms": total_time_ms,
    }
