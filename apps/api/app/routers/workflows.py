from fastapi import APIRouter, Depends

from app.core.tenant_context import TenantContext, require_tenant_context
from app.schemas.workflow import WorkflowRun
from app.services.workflow_service import workflow_service

router = APIRouter(prefix="/api", tags=["workflows"])


@router.post("/plan-drafts/{plan_draft_id}/confirm", response_model=WorkflowRun)
async def confirm_plan_draft(
    plan_draft_id: str,
    ctx: TenantContext = Depends(require_tenant_context),
) -> WorkflowRun:
    return workflow_service.start_listing_workflow(ctx, plan_draft_id)


@router.post("/approvals/{approval_id}/approve", response_model=WorkflowRun)
async def approve(
    approval_id: str,
    ctx: TenantContext = Depends(require_tenant_context),
) -> WorkflowRun:
    return workflow_service.approve(ctx, approval_id)


@router.post("/approvals/{approval_id}/reject", response_model=WorkflowRun)
async def reject(
    approval_id: str,
    ctx: TenantContext = Depends(require_tenant_context),
) -> WorkflowRun:
    return workflow_service.reject(ctx, approval_id)

