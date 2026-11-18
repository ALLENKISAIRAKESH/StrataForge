from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class Citation(BaseModel):
    file_path: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    quote: str = ""


class ThoughtStep(BaseModel):
    step_number: int
    thought: str
    action: Optional[str] = None
    observation: Optional[str] = None


class AgentReasoningRequest(BaseModel):
    agent_type: str = Field(
        ...,
        description="Type of subagent: 'discovery', 'security', 'data_readiness', or 'deployment_planner'",
    )
    custom_instruction: Optional[str] = Field(
        None,
        description="Optional enterprise constraint or specific question to guide reasoning",
    )


class AgentExecutionResponse(BaseModel):
    id: str
    project_id: str
    agent_type: str
    model_name: str
    status: str
    thought_chain: List[ThoughtStep]
    output_markdown: str
    structured_data: Optional[Dict[str, Any]] = None
    citations: List[Citation] = []
    execution_time_ms: int
    tokens_used: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
