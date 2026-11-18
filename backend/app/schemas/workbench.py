from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AgentFeedbackCreate(BaseModel):
    finding_id: Optional[str] = Field(None, description="Optional finding linked to this review")
    execution_id: Optional[str] = Field(None, description="Optional agent execution linked to this review")
    target_type: str = Field("patch", description="'patch', 'terraform', 'finding_remediation', 'general'")
    action: str = Field(..., description="'approve', 'reject', or 'modify'")
    original_content: str = Field(..., description="Original agent recommendation or diff patch")
    modified_content: Optional[str] = Field(None, description="Human modified content if action is 'modify'")
    reviewer_comments: Optional[str] = Field(None, description="Reviewer feedback or rationale")


class AgentFeedbackResponse(BaseModel):
    id: str
    project_id: str
    user_id: Optional[str] = None
    finding_id: Optional[str] = None
    execution_id: Optional[str] = None
    target_type: str
    action: str
    status: str
    original_content: str
    modified_content: Optional[str] = None
    reviewer_comments: Optional[str] = None
    applied_patch_summary: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    reviewer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ApplyPatchRequest(BaseModel):
    finding_id: Optional[str] = Field(None, description="Optional finding ID to resolve upon applying patch")
    patch_content: str = Field(..., description="Git-compatible unified diff patch to apply")
    reviewer_comments: Optional[str] = Field(None, description="Reviewer comments approving application")


class ApplyPatchResponse(BaseModel):
    success: bool
    message: str
    file_path: str
    finding_id: Optional[str] = None
    finding_status: Optional[str] = None
    feedback_id: str
    applied_at: datetime
