from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RunStatus(str, Enum):
    draft = "draft"
    waiting_user_confirmation = "waiting_user_confirmation"
    waiting_approval = "waiting_approval"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class CapabilityType(str, Enum):
    skill = "skill"
    tool = "tool"
    connector = "connector"
    agent = "agent"
    team = "team"
    workflow_skeleton = "workflow_skeleton"
    workflow = "workflow"


class AuditEvent(BaseModel):
    id: str
    tenant_id: str
    workspace_id: str
    user_id: str
    action: str
    source: str
    metadata: dict = Field(default_factory=dict)
