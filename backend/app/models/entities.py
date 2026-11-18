import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    Float,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="member", nullable=False)  # owner, admin, member, reviewer
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    repository_url = Column(String(500), nullable=True)
    status = Column(String(50), default="created", nullable=False)  # created, uploaded, analyzed, failed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="projects")
    artifacts = relationship("Artifact", back_populates="project", cascade="all, delete-orphan")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="project", cascade="all, delete-orphan")
    readiness_reports = relationship("DataReadinessReport", back_populates="project", cascade="all, delete-orphan")
    agent_executions = relationship("AgentExecution", back_populates="project", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_projects_workspace_name", "workspace_id", "name"),
    )


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    extracted_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    status = Column(String(50), default="uploaded", nullable=False)  # uploaded, extracted, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="artifacts")
    files = relationship("ProjectFile", back_populates="artifact", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="artifact", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="artifact", cascade="all, delete-orphan")
    readiness_reports = relationship("DataReadinessReport", back_populates="artifact", cascade="all, delete-orphan")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_id = Column(String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True)
    relative_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    file_type = Column(String(50), nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    line_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="files")
    artifact = relationship("Artifact", back_populates="files")

    __table_args__ = (
        Index("ix_project_files_proj_cat", "project_id", "category"),
        Index("ix_project_files_proj_type", "project_id", "file_type"),
    )


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_id = Column(String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(50), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False, index=True)
    confidence = Column(Float, default=1.0, nullable=False)
    file_path = Column(String(500), nullable=False)
    line_start = Column(Integer, nullable=False)
    line_end = Column(Integer, nullable=False)
    evidence = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    validation = Column(Text, nullable=False)
    status = Column(String(30), default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="findings")
    artifact = relationship("Artifact", back_populates="findings")

    __table_args__ = (
        Index("ix_findings_proj_sev", "project_id", "severity"),
        Index("ix_findings_proj_status", "project_id", "status"),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_id = Column(String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON string: headings, line numbers, character offsets
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="chunks")
    artifact = relationship("Artifact", back_populates="chunks")

    __table_args__ = (
        Index("ix_chunks_proj_file", "project_id", "file_path"),
    )


class DataReadinessReport(Base):
    __tablename__ = "data_readiness_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_id = Column(String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)       # 0 - 100
    structured_score = Column(Float, nullable=False)    # 0 - 100
    unstructured_score = Column(Float, nullable=False)  # 0 - 100
    metrics_json = Column(Text, nullable=False)         # Detailed stats JSON
    recommendations_json = Column(Text, nullable=False) # List of recommended improvements JSON
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="readiness_reports")
    artifact = relationship("Artifact", back_populates="readiness_reports")


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_type = Column(String(50), nullable=False)  # discovery, security, data_readiness, deployment_planner
    model_name = Column(String(100), nullable=False)
    status = Column(String(50), default="completed", nullable=False)  # queued, running, completed, failed
    prompt_context = Column(Text, nullable=False)      # Input context provided to the agent
    thought_chain_json = Column(Text, nullable=False)  # Step-by-step reasoning chain JSON
    output_markdown = Column(Text, nullable=False)     # Formatted markdown reasoning & advice
    structured_data_json = Column(Text, nullable=True) # Structured output (e.g. patches, risk matrices)
    citations_json = Column(Text, nullable=False)      # Grounded citations list [{file_path, line_start, line_end, quote}]
    execution_time_ms = Column(Integer, default=0, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="agent_executions")
    user = relationship("User")


class AgentMemory(Base):
    __tablename__ = "agent_memories"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False)  # e.g., 'topology', 'security_risks', 'rag_strategy', 'deployment_spec'
    source_agent = Column(String(50), nullable=False)  # discovery, security, data_readiness, deployment_planner, user
    value_json = Column(Text, nullable=False)  # JSON-encoded memory state
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="memories")

    __table_args__ = (
        Index("ix_agent_memory_project_key", "project_id", "key", unique=True),
    )


