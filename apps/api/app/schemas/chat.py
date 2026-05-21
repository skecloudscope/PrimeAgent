from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.common import RiskLevel


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[str] = None
    shop_id: Optional[str] = None


class PlanStep(BaseModel):
    id: str
    title: str
    description: str
    risk_level: RiskLevel = RiskLevel.low
    requires_approval: bool = False


class PlanDraft(BaseModel):
    id: str
    conversation_goal_id: str
    goal: str
    known_inputs: dict = Field(default_factory=dict)
    missing_inputs: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    proposed_steps: list[PlanStep]
    required_capabilities: list[str]
    risk_level: RiskLevel
    needs_user_confirmation: bool = True
    status: str = "waiting_user_confirmation"


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    conversation_goal_id: str
    plan_draft: Optional[PlanDraft] = None
    suggested_next_action: str
    needs_user_confirmation: bool
