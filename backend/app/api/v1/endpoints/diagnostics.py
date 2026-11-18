from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.db.session import get_db
from backend.app.models.entities import User, Project, Artifact, Finding
from backend.app.schemas.finding import (
    FindingResponse,
    FindingStatusUpdate,
    DiagnosticsSummary,
)
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.diagnostic_engine import run_diagnostics

router = APIRouter()


@router.post("/projects/{project_id}/diagnose", response_model=DiagnosticsSummary, status_code=status.HTTP_200_OK)
def trigger_project_diagnostics(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    latest_artifact = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id, Artifact.status == "extracted")
        .order_by(Artifact.created_at.desc())
        .first()
    )
    if not latest_artifact or not latest_artifact.extracted_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot run diagnostics: No extracted project archive found. Upload a ZIP archive first.",
        )

    # Execute deterministic diagnostic rules
    raw_findings = run_diagnostics(latest_artifact.extracted_path)

    # Delete previous findings for this artifact to ensure fresh run
    db.query(Finding).filter(Finding.artifact_id == latest_artifact.id).delete()

    findings_to_save = []
    for rf in raw_findings:
        f = Finding(
            project_id=project.id,
            artifact_id=latest_artifact.id,
            rule_id=rf["rule_id"],
            category=rf["category"],
            title=rf["title"],
            severity=rf["severity"],
            confidence=rf["confidence"],
            file_path=rf["file_path"],
            line_start=rf["line_start"],
            line_end=rf["line_end"],
            evidence=rf["evidence"],
            recommended_action=rf["recommended_action"],
            validation=rf["validation"],
            status="open",
        )
        findings_to_save.append(f)

    if findings_to_save:
        db.bulk_save_objects(findings_to_save)

    project.status = "analyzed"
    db.commit()

    saved_findings = (
        db.query(Finding)
        .filter(Finding.artifact_id == latest_artifact.id)
        .order_by(Finding.severity, Finding.rule_id)
        .all()
    )

    by_severity = {}
    by_category = {}
    by_rule = {}

    for sf in saved_findings:
        by_severity[sf.severity] = by_severity.get(sf.severity, 0) + 1
        by_category[sf.category] = by_category.get(sf.category, 0) + 1
        by_rule[sf.rule_id] = by_rule.get(sf.rule_id, 0) + 1

    return DiagnosticsSummary(
        project_id=project.id,
        artifact_id=latest_artifact.id,
        total_findings=len(saved_findings),
        by_severity=by_severity,
        by_category=by_category,
        by_rule=by_rule,
        findings=[FindingResponse.model_validate(sf) for sf in saved_findings],
    )


@router.get("/projects/{project_id}/findings", response_model=List[FindingResponse])
def list_project_findings(
    project_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity (critical, high, medium, low)"),
    category: Optional[str] = Query(None, description="Filter by category (container, security, dependency, etc)"),
    status: Optional[str] = Query(None, description="Filter by status (open, acknowledged, resolved)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    query = db.query(Finding).filter(Finding.project_id == project_id)
    if severity:
        query = query.filter(Finding.severity == severity.lower())
    if category:
        query = query.filter(Finding.category == category.lower())
    if status:
        query = query.filter(Finding.status == status.lower())

    return query.order_by(Finding.created_at.desc()).all()


@router.get("/findings/{finding_id}", response_model=FindingResponse)
def get_finding(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    project = db.query(Project).filter(Project.id == finding.project_id).first()
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    return finding


@router.patch("/findings/{finding_id}/status", response_model=FindingResponse)
def update_finding_status(
    finding_id: str,
    status_update: FindingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    project = db.query(Project).filter(Project.id == finding.project_id).first()
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    allowed_statuses = ["open", "acknowledged", "resolved", "false_positive"]
    if status_update.status.lower() not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_update.status}'. Allowed: {allowed_statuses}",
        )

    finding.status = status_update.status.lower()
    db.commit()
    db.refresh(finding)
    return finding
