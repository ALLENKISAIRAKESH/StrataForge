import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.entities import (
    User,
    Project,
    Artifact,
    Finding,
    ProjectFile,
    DataReadinessReport,
    AgentExecution,
)
from backend.app.schemas.agent import (
    AgentReasoningRequest,
    AgentExecutionResponse,
    ThoughtStep,
    Citation,
)
from pathlib import Path
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.classifier import scan_and_classify_project
from backend.app.services.llm_client import execute_agent_reasoning

router = APIRouter()


@router.post(
    "/projects/{project_id}/agents/reason",
    response_model=AgentExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
def trigger_agent_reasoning(
    project_id: str,
    payload: AgentReasoningRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    # Gather Context
    artifact = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id, Artifact.status == "extracted")
        .order_by(Artifact.created_at.desc())
        .first()
    )

    files = db.query(ProjectFile).filter(ProjectFile.artifact_id == artifact.id).all() if artifact else []
    findings = db.query(Finding).filter(Finding.project_id == project_id).all()
    readiness = (
        db.query(DataReadinessReport)
        .filter(DataReadinessReport.project_id == project_id)
        .order_by(DataReadinessReport.created_at.desc())
        .first()
    )

    if artifact and artifact.extracted_path and Path(artifact.extracted_path).exists():
        _, summary = scan_and_classify_project(artifact.extracted_path)
        inventory_summary = {
            "total_files": summary.get("total_files", 0),
            "total_lines": summary.get("total_lines", 0),
            "detected_languages": summary.get("detected_languages", []),
            "detected_frameworks": summary.get("detected_frameworks", []),
            "detected_infrastructure": summary.get("detected_infrastructure", []) + summary.get("detected_containers", []),
        }
    else:
        inventory_summary = {
            "total_files": len(files),
            "total_lines": sum(f.line_count for f in files),
            "detected_languages": sorted(list(set(f.file_type.capitalize() for f in files if f.category == "code"))),
            "detected_frameworks": [],
            "detected_infrastructure": [],
        }

    findings_list = [
        {
            "rule_id": f.rule_id,
            "category": f.category,
            "title": f.title,
            "severity": f.severity,
            "file_path": f.file_path,
            "line_start": f.line_start,
            "line_end": f.line_end,
            "evidence": f.evidence,
            "recommended_action": f.recommended_action,
            "validation": f.validation,
        }
        for f in findings
    ]

    data_readiness_dict = None
    if readiness:
        data_readiness_dict = {
            "overall_score": readiness.overall_score,
            "structured_score": readiness.structured_score,
            "unstructured_score": readiness.unstructured_score,
            "recommendations": json.loads(readiness.recommendations_json),
            "total_chunks": len(readiness.project.chunks) if readiness.project else 0,
        }

    # Execute Reasoning
    result, elapsed_ms, model_name = execute_agent_reasoning(
        agent_type=payload.agent_type,
        project_name=project.name,
        inventory_summary=inventory_summary,
        findings=findings_list,
        data_readiness=data_readiness_dict,
        custom_instruction=payload.custom_instruction,
    )

    # Estimate Tokens (~4 chars per token)
    full_output_str = json.dumps(result)
    tokens_used = max(1, len(full_output_str) // 4)

    # Save AgentExecution
    execution = AgentExecution(
        project_id=project.id,
        user_id=current_user.id,
        agent_type=payload.agent_type,
        model_name=model_name,
        status="completed",
        prompt_context=json.dumps({"custom_instruction": payload.custom_instruction}),
        thought_chain_json=json.dumps(result.get("thought_chain", [])),
        output_markdown=result.get("output_markdown", ""),
        structured_data_json=json.dumps(result.get("structured_data", {})),
        citations_json=json.dumps(result.get("citations", [])),
        execution_time_ms=elapsed_ms,
        tokens_used=tokens_used,
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    return AgentExecutionResponse(
        id=execution.id,
        project_id=execution.project_id,
        agent_type=execution.agent_type,
        model_name=execution.model_name,
        status=execution.status,
        thought_chain=[ThoughtStep(**t) for t in result.get("thought_chain", [])],
        output_markdown=execution.output_markdown,
        structured_data=result.get("structured_data"),
        citations=[Citation(**c) for c in result.get("citations", [])],
        execution_time_ms=execution.execution_time_ms,
        tokens_used=execution.tokens_used,
        error_message=execution.error_message,
        created_at=execution.created_at,
    )


@router.get(
    "/projects/{project_id}/agents/history",
    response_model=List[AgentExecutionResponse],
)
def get_agent_history(
    project_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    executions = (
        db.query(AgentExecution)
        .filter(AgentExecution.project_id == project_id)
        .order_by(AgentExecution.created_at.desc())
        .limit(limit)
        .all()
    )

    responses = []
    for ex in executions:
        thought_chain_raw = json.loads(ex.thought_chain_json) if ex.thought_chain_json else []
        citations_raw = json.loads(ex.citations_json) if ex.citations_json else []
        structured_raw = json.loads(ex.structured_data_json) if ex.structured_data_json else None

        responses.append(
            AgentExecutionResponse(
                id=ex.id,
                project_id=ex.project_id,
                agent_type=ex.agent_type,
                model_name=ex.model_name,
                status=ex.status,
                thought_chain=[ThoughtStep(**t) for t in thought_chain_raw],
                output_markdown=ex.output_markdown,
                structured_data=structured_raw,
                citations=[Citation(**c) for c in citations_raw],
                execution_time_ms=ex.execution_time_ms,
                tokens_used=ex.tokens_used,
                error_message=ex.error_message,
                created_at=ex.created_at,
            )
        )
    return responses
