from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.db.session import get_db
from backend.app.models.entities import User, Workspace, WorkspaceMember, Project
from backend.app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from backend.app.api.deps import get_current_user

router = APIRouter()


def check_user_workspace_access(
    workspace_id: str, user_id: str, db: Session
) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    if workspace.owner_id != user_id:
        membership = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workspace",
            )
    return workspace


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify access to target workspace
    check_user_workspace_access(project_in.workspace_id, current_user.id, db)

    project = Project(
        workspace_id=project_in.workspace_id,
        name=project_in.name,
        description=project_in.description,
        repository_url=project_in.repository_url,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    workspace_id: Optional[str] = Query(None, description="Filter by workspace ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if workspace_id:
        check_user_workspace_access(workspace_id, current_user.id, db)
        return (
            db.query(Project)
            .filter(Project.workspace_id == workspace_id)
            .order_by(Project.created_at.desc())
            .all()
        )

    # Return projects across all workspaces accessible to current user
    user_ws_ids = [
        m.workspace_id
        for m in db.query(WorkspaceMember.workspace_id)
        .filter(WorkspaceMember.user_id == current_user.id)
        .all()
    ]
    owned_ws_ids = [
        w.id
        for w in db.query(Workspace.id)
        .filter(Workspace.owner_id == current_user.id)
        .all()
    ]
    all_accessible_ids = list(set(user_ws_ids + owned_ws_ids))

    return (
        db.query(Project)
        .filter(Project.workspace_id.in_(all_accessible_ids))
        .order_by(Project.created_at.desc())
        .all()
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    check_user_workspace_access(project.workspace_id, current_user.id, db)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    if project_update.name is not None:
        project.name = project_update.name
    if project_update.description is not None:
        project.description = project_update.description
    if project_update.repository_url is not None:
        project.repository_url = project_update.repository_url
    if project_update.status is not None:
        project.status = project_update.status

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    db.delete(project)
    db.commit()
    return None
