from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class DocumentChunkResponse(BaseModel):
    id: str
    file_path: str
    chunk_index: int
    content: str
    token_count: int
    metadata: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DataReadinessReportResponse(BaseModel):
    id: str
    project_id: str
    artifact_id: str
    overall_score: float
    structured_score: float
    unstructured_score: float
    metrics: Dict[str, Any]
    recommendations: List[str]
    total_chunks: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
