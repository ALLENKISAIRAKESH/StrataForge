from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    repository_url: Optional[str] = None


class ProjectCreate(ProjectBase):
    workspace_id: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    repository_url: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: str
    workspace_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
