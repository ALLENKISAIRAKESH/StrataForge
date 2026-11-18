import json
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.entities import AgentMemory, Project


def publish_memory(
    project_id: str,
    key: str,
    value: Any,
    source_agent: str = "user",
    confidence: float = 1.0,
    db: Session = None,
) -> AgentMemory:
    """Publishes or updates a memory entry on the project's shared blackboard."""
    value_str = json.dumps(value)

    memory = (
        db.query(AgentMemory)
        .filter(AgentMemory.project_id == project_id, AgentMemory.key == key)
        .first()
    )

    if memory:
        memory.value_json = value_str
        memory.source_agent = source_agent
        memory.confidence = confidence
    else:
        memory = AgentMemory(
            project_id=project_id,
            key=key,
            source_agent=source_agent,
            value_json=value_str,
            confidence=confidence,
        )
        db.add(memory)

    db.commit()
    db.refresh(memory)
    return memory


def read_memory(project_id: str, key: str, db: Session) -> Optional[Any]:
    """Reads a specific memory value from the blackboard."""
    memory = (
        db.query(AgentMemory)
        .filter(AgentMemory.project_id == project_id, AgentMemory.key == key)
        .first()
    )
    if memory and memory.value_json:
        return json.loads(memory.value_json)
    return None


def get_project_blackboard(project_id: str, db: Session) -> Tuple[Dict[str, Any], List[AgentMemory]]:
    """
    Compiles all project memories into a blackboard dictionary:
    { key: parsed_value, ... }
    """
    memories = (
        db.query(AgentMemory)
        .filter(AgentMemory.project_id == project_id)
        .order_by(AgentMemory.key.asc())
        .all()
    )

    blackboard = {}
    for m in memories:
        try:
            blackboard[m.key] = json.loads(m.value_json)
        except Exception:
            blackboard[m.key] = m.value_json

    return blackboard, memories


def clear_project_memory(project_id: str, db: Session) -> int:
    """Clears all blackboard memories for the project."""
    count = db.query(AgentMemory).filter(AgentMemory.project_id == project_id).delete()
    db.commit()
    return count
