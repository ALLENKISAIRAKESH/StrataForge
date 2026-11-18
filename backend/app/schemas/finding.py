from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime


class FindingBase(BaseModel):
    rule_id: str
    category: str
    title: str
    severity: str
    confidence: float = 1.0
    file_path: str
    line_start: int
    line_end: int
    evidence: str
    recommended_action: str
    validation: str


class FindingCreate(FindingBase):
    project_id: str
    artifact_id: str


class FindingStatusUpdate(BaseModel):
    status: str  # open, acknowledged, resolved, false_positive


class FindingResponse(FindingBase):
    id: str
    project_id: str
    artifact_id: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DiagnosticsSummary(BaseModel):
    project_id: str
    artifact_id: str
    total_findings: int
    by_severity: Dict[str, int]
    by_category: Dict[str, int]
    by_rule: Dict[str, int]
    findings: List[FindingResponse]
