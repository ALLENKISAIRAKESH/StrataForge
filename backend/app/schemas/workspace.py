from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from backend.app.schemas.user import UserResponse


class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceCreate(WorkspaceBase):
    slug: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: str
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceResponse(WorkspaceBase):
    id: str
    slug: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    members: Optional[List[WorkspaceMemberResponse]] = None

    model_config = ConfigDict(from_attributes=True)
