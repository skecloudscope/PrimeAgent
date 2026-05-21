from uuid import uuid4

from fastapi import HTTPException

from app.core.tenant_context import TenantContext
from app.schemas.common import AuditEvent, RiskLevel, RunStatus
from app.schemas.workflow import ApprovalRequest, ListingDiff, WorkflowRun
from app.services.mock_store import store


class WorkflowService:
    def start_listing_workflow(self, ctx: TenantContext, plan_draft_id: str) -> WorkflowRun:
        plan = store.plan_drafts.get(plan_draft_id)
        if not plan:
            raise HTTPException(status_code=404, detail="plan_draft_not_found")
        if plan.status not in {"waiting_user_confirmation", "confirmed"}:
            raise HTTPException(status_code=409, detail="plan_draft_not_confirmable")

        plan.status = "confirmed"
        if "shopify_product_write_tool" not in plan.required_capabilities:
            workflow_run = WorkflowRun(
                id=f"wr_{uuid4().hex[:10]}",
                tenant_id=ctx.tenant_id,
                workspace_id=ctx.workspace_id,
                user_id=ctx.user_id,
                plan_draft_id=plan.id,
                workflow_key="exploration_run_mock_v1",
                status=RunStatus.completed,
                timeline=[
                    {"type": "exploration_started", "label": "Exploration plan accepted"},
                    {"type": "capability_search", "label": "Mock Capability Retrieval selected candidates"},
                    {"type": "run_graph", "label": "RunGraph draft recorded for future sedimentation"},
                ],
                final_output={
                    "message": "Exploration plan accepted. No external write action was executed.",
                    "capabilities": plan.required_capabilities,
                },
            )
            store.workflow_runs[workflow_run.id] = workflow_run
            self._audit(ctx, "exploration_run.mock_completed", {"workflow_run_id": workflow_run.id})
            return workflow_run

        product_id = plan.known_inputs["product_id"]
        listing_diff = self._mock_listing_diff(product_id)
        workflow_run = WorkflowRun(
            id=f"wr_{uuid4().hex[:10]}",
            tenant_id=ctx.tenant_id,
            workspace_id=ctx.workspace_id,
            user_id=ctx.user_id,
            plan_draft_id=plan.id,
            workflow_key="listing_optimization_writeback_v1",
            status=RunStatus.waiting_approval,
            timeline=[
                {"type": "workflow_started", "label": "Listing workflow started"},
                {"type": "tool_call", "label": "Mock Shopify product snapshot read"},
                {"type": "agent_run", "label": "Mock Listing Agent generated ListingDiff"},
                {"type": "approval_created", "label": "Waiting for human approval"},
            ],
        )
        approval = ApprovalRequest(
            id=f"apr_{uuid4().hex[:10]}",
            tenant_id=ctx.tenant_id,
            workspace_id=ctx.workspace_id,
            user_id=ctx.user_id,
            workflow_run_id=workflow_run.id,
            title="审批 ListingDiff 写回 Shopify",
            risk_level=RiskLevel.high,
            original_diff=listing_diff,
            final_diff=listing_diff,
        )
        workflow_run.approval_request_id = approval.id
        store.workflow_runs[workflow_run.id] = workflow_run
        store.approvals[approval.id] = approval
        self._audit(ctx, "workflow_run.waiting_approval", {"workflow_run_id": workflow_run.id})
        return workflow_run

    def approve(self, ctx: TenantContext, approval_id: str) -> WorkflowRun:
        approval = store.approvals.get(approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="approval_not_found")
        if approval.tenant_id != ctx.tenant_id:
            raise HTTPException(status_code=403, detail="approval_tenant_mismatch")
        if approval.status != "waiting_approval":
            raise HTTPException(status_code=409, detail="approval_not_waiting")

        approval.status = "approved"
        run = store.workflow_runs[approval.workflow_run_id]
        run.status = RunStatus.completed
        run.timeline.append({"type": "approval_approved", "label": "Approval accepted"})
        run.timeline.append({"type": "tool_call", "label": "Mock Tool Gateway wrote frozen diff"})
        run.final_output = {
            "message": "Mock Shopify write completed through Tool Gateway.",
            "listing_diff": approval.final_diff.model_dump(),
        }
        self._audit(ctx, "approval.approved", {"approval_id": approval.id})
        self._audit(ctx, "tool_gateway.mock_write_completed", {"workflow_run_id": run.id})
        return run

    def reject(self, ctx: TenantContext, approval_id: str) -> WorkflowRun:
        approval = store.approvals.get(approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="approval_not_found")
        if approval.tenant_id != ctx.tenant_id:
            raise HTTPException(status_code=403, detail="approval_tenant_mismatch")

        approval.status = "rejected"
        run = store.workflow_runs[approval.workflow_run_id]
        run.status = RunStatus.cancelled
        run.timeline.append({"type": "approval_rejected", "label": "Approval rejected"})
        self._audit(ctx, "approval.rejected", {"approval_id": approval.id})
        return run

    def _mock_listing_diff(self, product_id: str) -> ListingDiff:
        return ListingDiff(
            product_id=product_id,
            title_before="Classic Travel Organizer",
            title_after="Travel Organizer Bag with Waterproof Compartments",
            description_before="A useful organizer for travel.",
            description_after=(
                "Keep cables, cosmetics, and travel essentials sorted with a lightweight "
                "waterproof organizer designed for carry-on luggage and daily commuting."
            ),
            seo_keywords=["travel organizer", "waterproof pouch", "carry-on essentials"],
        )

    def _audit(self, ctx: TenantContext, action: str, metadata: dict) -> None:
        store.audit_logs.append(
            AuditEvent(
                id=f"audit_{uuid4().hex[:10]}",
                tenant_id=ctx.tenant_id,
                workspace_id=ctx.workspace_id,
                user_id=ctx.user_id,
                action=action,
                source="workflow_service",
                metadata=metadata,
            )
        )


workflow_service = WorkflowService()
