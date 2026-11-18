from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime


class ProjectFileResponse(BaseModel):
    id: str
    relative_path: str
    filename: str
    category: str
    file_type: str
    size_bytes: int
    line_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArtifactResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_size: int
    file_hash: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnvironmentInventory(BaseModel):
    project_id: str
    artifact_id: str
    total_files: int
    total_lines: int
    category_counts: Dict[str, int]
    file_type_counts: Dict[str, int]
    detected_languages: List[str]
    detected_frameworks: List[str]
    detected_containers: List[str]
    detected_infrastructure: List[str]
    files: List[ProjectFileResponse]
