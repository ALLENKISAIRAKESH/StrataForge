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


class AgentPipelineRequest(BaseModel):
    custom_instruction: Optional[str] = Field(
        None,
        description="Optional enterprise constraint or specific question to guide reasoning across all stages",
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


class AgentMemoryEntry(BaseModel):
    id: str
    project_id: str
    key: str
    source_agent: str
    value: Any
    confidence: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentMemoryPublishRequest(BaseModel):
    key: str = Field(..., description="Blackboard memory key, e.g. 'topology', 'security_risks'")
    value: Any = Field(..., description="Factual value or structured dict to store")
    source_agent: str = Field("user", description="Publishing agent or 'user'")
    confidence: float = Field(1.0, ge=0.0, le=1.0)


class AgentBlackboardResponse(BaseModel):
    project_id: str
    blackboard: Dict[str, Any]
    memories: List[AgentMemoryEntry]
    total_keys: int

