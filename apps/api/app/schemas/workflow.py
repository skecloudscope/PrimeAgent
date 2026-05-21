from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.common import RiskLevel, RunStatus


class ListingDiff(BaseModel):
    product_id: str
    title_before: str
    title_after: str
    description_before: str
    description_after: str
    seo_keywords: list[str] = Field(default_factory=list)


class ApprovalRequest(BaseModel):
    id: str
    tenant_id: str
    workspace_id: str
    user_id: str
    workflow_run_id: str
    title: str
    risk_level: RiskLevel
    original_diff: ListingDiff
    final_diff: ListingDiff
    status: str = "waiting_approval"


class WorkflowRun(BaseModel):
    id: str
    tenant_id: str
    workspace_id: str
    user_id: str
    plan_draft_id: str
    workflow_key: str
    status: RunStatus
    timeline: list[dict] = Field(default_factory=list)
    approval_request_id: Optional[str] = None
    final_output: Optional[dict] = None
