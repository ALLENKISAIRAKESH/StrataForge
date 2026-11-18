from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.entities import User, Project
from backend.app.schemas.workbench import (
    AgentFeedbackCreate,
    AgentFeedbackResponse,
    ApplyPatchRequest,
    ApplyPatchResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.human_workbench import (
    submit_agent_feedback,
    apply_remediation_patch,
    list_project_feedback,
)

router = APIRouter()


@router.post(
    "/projects/{project_id}/workbench/feedback",
    response_model=AgentFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_feedback(
    project_id: str,
    payload: AgentFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submits human review feedback (approve, reject, or modify) on agent recommendations."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    return submit_agent_feedback(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        feedback_in=payload,
    )


@router.get(
    "/projects/{project_id}/workbench/feedback",
    response_model=List[AgentFeedbackResponse],
)
def get_feedback_history(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists audit trail of human feedback and patch approvals for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    return list_project_feedback(db=db, project_id=project_id)


@router.post(
    "/projects/{project_id}/workbench/apply-patch",
    response_model=ApplyPatchResponse,
    status_code=status.HTTP_200_OK,
)
def apply_patch(
    project_id: str,
    payload: ApplyPatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Applies an approved unified diff patch to project files and resolves the linked finding."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    return apply_remediation_patch(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        request=payload,
    )
