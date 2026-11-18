from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.db.session import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.entities import User, Workspace, WorkspaceMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    return user


def get_workspace_for_user(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workspace:
    """
    Verifies that the workspace exists AND the current user is a member/owner.
    Enforces strict multi-tenant workspace isolation.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    # Check ownership or membership
    if workspace.owner_id != current_user.id:
        membership = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this workspace",
            )

    return workspace
