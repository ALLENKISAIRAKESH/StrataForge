import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.db.session import get_db
from backend.app.models.entities import User, Project, Artifact, DocumentChunk, DataReadinessReport
from backend.app.schemas.data_readiness import (
    DocumentChunkResponse,
    DataReadinessReportResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.data_readiness import evaluate_data_readiness

router = APIRouter()


@router.post("/projects/{project_id}/data-readiness", response_model=DataReadinessReportResponse, status_code=status.HTTP_200_OK)
def trigger_data_readiness_assessment(
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
            detail="Cannot assess data readiness: Upload a project archive first.",
        )

    # 1. Run Data Readiness and Chunking Evaluation
    report_dict, chunks = evaluate_data_readiness(latest_artifact.extracted_path)

    # 2. Clear old chunks and reports for this artifact
    db.query(DocumentChunk).filter(DocumentChunk.artifact_id == latest_artifact.id).delete()
    db.query(DataReadinessReport).filter(DataReadinessReport.artifact_id == latest_artifact.id).delete()

    # 3. Bulk insert DocumentChunk records
    db_chunks = []
    for c in chunks:
        chunk_obj = DocumentChunk(
            project_id=project.id,
            artifact_id=latest_artifact.id,
            file_path=c["file_path"],
            chunk_index=c["chunk_index"],
            content=c["content"],
            token_count=c["token_count"],
            metadata_json=json.dumps(c["metadata"]),
        )
        db_chunks.append(chunk_obj)

    if db_chunks:
        db.bulk_save_objects(db_chunks)

    # 4. Save Report record
    report_record = DataReadinessReport(
        project_id=project.id,
        artifact_id=latest_artifact.id,
        overall_score=report_dict["overall_score"],
        structured_score=report_dict["structured_score"],
        unstructured_score=report_dict["unstructured_score"],
        metrics_json=json.dumps(report_dict["metrics"]),
        recommendations_json=json.dumps(report_dict["recommendations"]),
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return DataReadinessReportResponse(
        id=report_record.id,
        project_id=project.id,
        artifact_id=latest_artifact.id,
        overall_score=report_record.overall_score,
        structured_score=report_record.structured_score,
        unstructured_score=report_record.unstructured_score,
        metrics=json.loads(report_record.metrics_json),
        recommendations=json.loads(report_record.recommendations_json),
        total_chunks=len(db_chunks),
        created_at=report_record.created_at,
    )


@router.get("/projects/{project_id}/data-readiness", response_model=DataReadinessReportResponse)
def get_project_data_readiness(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    report_record = (
        db.query(DataReadinessReport)
        .filter(DataReadinessReport.project_id == project_id)
        .order_by(DataReadinessReport.created_at.desc())
        .first()
    )
    if not report_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data readiness report found. Trigger an assessment first.",
        )

    chunk_count = db.query(DocumentChunk).filter(DocumentChunk.artifact_id == report_record.artifact_id).count()

    return DataReadinessReportResponse(
        id=report_record.id,
        project_id=project.id,
        artifact_id=report_record.artifact_id,
        overall_score=report_record.overall_score,
        structured_score=report_record.structured_score,
        unstructured_score=report_record.unstructured_score,
        metrics=json.loads(report_record.metrics_json),
        recommendations=json.loads(report_record.recommendations_json),
        total_chunks=chunk_count,
        created_at=report_record.created_at,
    )


@router.get("/projects/{project_id}/chunks", response_model=List[DocumentChunkResponse])
def list_project_chunks(
    project_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    file_path: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    query = db.query(DocumentChunk).filter(DocumentChunk.project_id == project_id)
    if file_path:
        query = query.filter(DocumentChunk.file_path == file_path)

    chunks = query.order_by(DocumentChunk.file_path, DocumentChunk.chunk_index).offset(offset).limit(limit).all()

    return [
        DocumentChunkResponse(
            id=c.id,
            file_path=c.file_path,
            chunk_index=c.chunk_index,
            content=c.content,
            token_count=c.token_count,
            metadata=json.loads(c.metadata_json) if c.metadata_json else {},
            created_at=c.created_at,
        )
        for c in chunks
    ]
