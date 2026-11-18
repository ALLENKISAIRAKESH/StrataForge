"""
Enterprise Seed Script for Google Cloud Consulting FDE Platform.
Seeds a realistic client engagement environment:
- Lead FDE User
- Enterprise Workspace
- Client Project 1: Legacy E-Commerce Recommendation API (Broken environment with diagnostics, agents, diff patches)
- Client Project 2: Enterprise GenAI Knowledge Core (Healthy environment with high readiness, Terraform IaC)
"""

import sys
import shutil
import uuid
import hashlib
import json
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.db.session import SessionLocal, engine, Base
from backend.app.models.entities import (
    User,
    Workspace,
    WorkspaceMember,
    Project,
    Artifact,
    ProjectFile,
    Finding,
    DocumentChunk,
    DataReadinessReport,
    AgentExecution,
    AgentFeedback,
)
from backend.app.services.extractor import safe_extract_zip
from backend.app.services.classifier import scan_and_classify_project
from backend.app.services.diagnostic_engine import run_diagnostics
from backend.app.services.data_readiness import evaluate_data_readiness
from backend.app.services.subagents import run_collaborative_agent_pipeline, generate_security_patch
from backend.app.services.memory_bus import publish_memory
from backend.app.services.terraform_generator import generate_project_terraform


def seed():
    print("[*] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Clean previous seed data if exists
        admin_email = "alex.chen@strataforge.io"
        legacy_emails = ["lead.engineer@googlecloud.internal", "alex.chen@strataforge.io"]
        for legacy in legacy_emails:
            existing_user = db.query(User).filter(User.email == legacy).first()
            if existing_user:
                print(f"[*] Found existing user {legacy}, refreshing seed data...")
                workspaces = db.query(Workspace).filter(Workspace.owner_id == existing_user.id).all()
                for ws in workspaces:
                    projects = db.query(Project).filter(Project.workspace_id == ws.id).all()
                    for p in projects:
                        db.query(AgentFeedback).filter(AgentFeedback.project_id == p.id).delete()
                        db.query(AgentExecution).filter(AgentExecution.project_id == p.id).delete()
                        db.query(DataReadinessReport).filter(DataReadinessReport.project_id == p.id).delete()
                        db.query(DocumentChunk).filter(DocumentChunk.project_id == p.id).delete()
                        db.query(Finding).filter(Finding.project_id == p.id).delete()
                        db.query(ProjectFile).filter(ProjectFile.project_id == p.id).delete()
                        db.query(Artifact).filter(Artifact.project_id == p.id).delete()
                        db.delete(p)
                    db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id).delete()
                    db.delete(ws)
                db.delete(existing_user)
                db.commit()

        # 2. Create Principal Cloud Architect User
        print("[*] Creating Principal Cloud Architect user...")
        user_id = str(uuid.uuid4())
        lead_user = User(
            id=user_id,
            email=admin_email,
            hashed_password=hash_password("StrataSecure#2026!"),
            full_name="Alex Chen (Principal Cloud Architect)",
            is_active=True,
        )
        db.add(lead_user)
        db.commit()
        db.refresh(lead_user)
        print(f"    -> User: {lead_user.email} (Password: StrataSecure#2026!)")

        # 3. Create Enterprise Workspace
        print("[*] Creating Client Transformation Workspace...")
        ws_id = str(uuid.uuid4())
        workspace = Workspace(
            id=ws_id,
            name="Global Retail Transformation",
            slug="global-retail-transformation",
            description="Enterprise modernization workspace for Tier-1 retail systems migrating to Cloud Run and Vertex AI.",
            owner_id=lead_user.id,
        )
        db.add(workspace)
        member = WorkspaceMember(
            workspace_id=ws_id,
            user_id=lead_user.id,
            role="owner",
        )
        db.add(member)
        db.commit()
        print(f"    -> Workspace: '{workspace.name}' (ID: {ws_id})")

        # Storage directory
        storage_root = Path(settings.STORAGE_DIR)
        uploads_dir = storage_root / "uploads"
        extracted_root = storage_root / "extracted"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        extracted_root.mkdir(parents=True, exist_ok=True)

        sample_projects = [
            {
                "name": "Legacy E-Commerce Recommendation API",
                "desc": "Containerized Python FastAPI service with unpinned dependencies, missing health checks, and hardcoded secrets.",
                "zip_source": PROJECT_ROOT / "sample-projects" / "broken.zip",
                "status": "diagnostics_completed",
                "run_pipeline": True,
            },
            {
                "name": "Enterprise GenAI Knowledge Core",
                "desc": "Clean production-grade microservice with OpenAPI 3.0 spec, pinned requirements, structured schema, and Cloud Run probes.",
                "zip_source": PROJECT_ROOT / "sample-projects" / "healthy.zip",
                "status": "ready_for_deployment",
                "run_pipeline": False,
            },
        ]

        for p_idx, p_info in enumerate(sample_projects, 1):
            print(f"[*] Provisioning Project {p_idx}: '{p_info['name']}'...")
            proj_id = str(uuid.uuid4())
            project = Project(
                id=proj_id,
                workspace_id=ws_id,
                name=p_info["name"],
                description=p_info["desc"],
                status=p_info["status"],
            )
            db.add(project)
            db.commit()

            # Process ZIP archive
            zip_src = p_info["zip_source"]
            upload_id = str(uuid.uuid4())
            dest_zip = uploads_dir / f"{upload_id}.zip"
            shutil.copyfile(zip_src, dest_zip)

            file_size = dest_zip.stat().st_size
            with open(dest_zip, "rb") as f:
                sha256_hash = hashlib.sha256(f.read()).hexdigest()

            dest_extracted = extracted_root / upload_id
            dest_extracted.mkdir(parents=True, exist_ok=True)

            file_count, uncompressed_bytes = safe_extract_zip(str(dest_zip), str(dest_extracted))

            # Create Artifact record
            artifact = Artifact(
                id=upload_id,
                project_id=proj_id,
                filename=zip_src.name,
                storage_path=str(dest_zip),
                extracted_path=str(dest_extracted),
                file_size=file_size,
                file_hash=sha256_hash,
                status="extracted",
            )
            db.add(artifact)
            db.commit()

            # Scan and Classify
            classified_files, summary = scan_and_classify_project(dest_extracted)
            for f_item in classified_files:
                pf = ProjectFile(
                    id=str(uuid.uuid4()),
                    project_id=proj_id,
                    artifact_id=upload_id,
                    relative_path=f_item["relative_path"],
                    filename=f_item["filename"],
                    category=f_item["category"],
                    file_type=f_item["file_type"],
                    size_bytes=f_item["size_bytes"],
                    line_count=f_item["line_count"],
                )
                db.add(pf)
            db.commit()

            # Run deterministic diagnostics
            findings = run_diagnostics(str(dest_extracted))
            for f in findings:
                finding_rec = Finding(
                    id=str(uuid.uuid4()),
                    project_id=proj_id,
                    artifact_id=upload_id,
                    rule_id=f["rule_id"],
                    category=f["category"],
                    title=f["title"],
                    severity=f["severity"],
                    confidence=f.get("confidence", 1.0),
                    file_path=f["file_path"],
                    line_start=f["line_start"],
                    line_end=f["line_end"],
                    evidence=f["evidence"],
                    recommended_action=f["recommended_action"],
                    validation=f.get("validation", ""),
                    status="open",
                )
                db.add(finding_rec)
            db.commit()
            print(f"    -> Extracted {file_count} files, flagged {len(findings)} deterministic findings.")

            # Data readiness evaluation
            report_dict, chunks_to_persist = evaluate_data_readiness(str(dest_extracted))
            for ch in chunks_to_persist:
                chunk_rec = DocumentChunk(
                    id=str(uuid.uuid4()),
                    project_id=proj_id,
                    artifact_id=upload_id,
                    file_path=ch["file_path"],
                    chunk_index=ch["chunk_index"],
                    content=ch["content"],
                    token_count=ch["token_count"],
                    metadata_json=json.dumps(ch.get("metadata", {})),
                )
                db.add(chunk_rec)

            dr_report = DataReadinessReport(
                id=str(uuid.uuid4()),
                project_id=proj_id,
                artifact_id=upload_id,
                overall_score=report_dict["overall_score"],
                structured_score=report_dict["structured_score"],
                unstructured_score=report_dict["unstructured_score"],
                metrics_json=json.dumps(report_dict["metrics"]),
                recommendations_json=json.dumps(report_dict["recommendations"]),
            )
            db.add(dr_report)
            db.commit()
            print(f"    -> Data Readiness Score: {report_dict['overall_score']:.1f}% ({len(chunks_to_persist)} document chunks).")

            # Run 4-agent collaborative pipeline if requested
            if p_info["run_pipeline"]:
                print("    -> Executing 4-Agent Collaborative Pipeline (Discovery -> Security -> Data -> Deployment)...")
                pipeline_res = run_collaborative_agent_pipeline(
                    project_name=p_info["name"],
                    inventory_summary=summary,
                    findings=findings,
                    data_readiness=report_dict,
                    project_id=proj_id,
                    db=db,
                    custom_instruction="Modernize for Google Cloud Run v2 with VPC Access Connector and Secret Manager.",
                )

                # Persist executions
                for stage_name, stage_data in pipeline_res["stage_results"].items():
                    exec_id = str(uuid.uuid4())
                    agent_exec = AgentExecution(
                        id=exec_id,
                        project_id=proj_id,
                        user_id=lead_user.id,
                        agent_type=stage_name,
                        model_name=stage_data.get("model_name", "gemini-1.5-pro"),
                        status="completed",
                        prompt_context=json.dumps({"custom_instruction": "Collaborative pipeline modernization"}),
                        thought_chain_json=json.dumps(stage_data.get("thought_chain", [])),
                        output_markdown=stage_data.get("output_markdown", ""),
                        structured_data_json=json.dumps(stage_data.get("structured_data", {})),
                        citations_json=json.dumps(stage_data.get("citations", [])),
                        execution_time_ms=stage_data.get("execution_time_ms", 120),
                        tokens_used=stage_data.get("tokens_used", 350),
                    )
                    db.add(agent_exec)
                db.commit()

                # Add a sample pending human review diff for DOCKER_001
                docker_finding = next((f for f in findings if f["rule_id"] == "DOCKER_001"), None)
                if docker_finding:
                    patch_content = generate_security_patch(docker_finding)
                    feedback_item = AgentFeedback(
                        id=str(uuid.uuid4()),
                        project_id=proj_id,
                        user_id=lead_user.id,
                        target_type="patch",
                        action="approve",
                        status="pending",
                        original_content=patch_content,
                        reviewer_comments="Automated patch generated by Security Reviewer subagent for Cloud Run readiness.",
                    )
                    db.add(feedback_item)
                    db.commit()
                print("    -> Multi-Agent pipeline completed and published to Blackboard Memory Bus.")
            else:
                # Pre-generate Terraform bundle for healthy environment
                print("    -> Generating production Terraform IaC bundle...")
                publish_memory(
                    project_id=proj_id,
                    key="target_region",
                    value="asia-south1",
                    source_agent="human_supervisor",
                    db=db,
                )
                generate_project_terraform(db=db, project_id=proj_id)
                print("    -> Terraform bundle generated for asia-south1.")

        print("\n" + "=" * 60)
        print("🎉 SEED COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Login Credentials:")
        print(f"  Email:    {admin_email}")
        print(f"  Password: StrataSecure#2026!")
        print(f"  Role:     Principal Cloud Architect")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed()
