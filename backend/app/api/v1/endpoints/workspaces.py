import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.db.session import get_db
from backend.app.models.entities import User, Workspace, WorkspaceMember
from backend.app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
)
from backend.app.api.deps import get_current_user, get_workspace_for_user

router = APIRouter()


def slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    ws_in: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base_slug = ws_in.slug or slugify(ws_in.name)
    slug = base_slug
    counter = 1
    while db.query(Workspace).filter(Workspace.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace = Workspace(
        name=ws_in.name,
        slug=slug,
        description=ws_in.description,
        owner_id=current_user.id,
    )
    db.add(workspace)
    db.flush()  # get workspace.id

    # Add creator as owner member
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/", response_model=List[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member_workspaces = (
        db.query(WorkspaceMember.workspace_id)
        .filter(WorkspaceMember.user_id == current_user.id)
        .all()
    )
    member_ws_ids = [m[0] for m in member_workspaces]

    workspaces = (
        db.query(Workspace)
        .filter(
            (Workspace.owner_id == current_user.id)
            | (Workspace.id.in_(member_ws_ids))
        )
        .order_by(Workspace.created_at.desc())
        .all()
    )
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace: Workspace = Depends(get_workspace_for_user),
):
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    ws_update: WorkspaceUpdate,
    workspace: Workspace = Depends(get_workspace_for_user),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can modify workspace settings",
        )

    if ws_update.name is not None:
        workspace.name = ws_update.name
    if ws_update.description is not None:
        workspace.description = ws_update.description

    db.commit()
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace: Workspace = Depends(get_workspace_for_user),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can delete this workspace",
        )

    db.delete(workspace)
    db.commit()
    return None
