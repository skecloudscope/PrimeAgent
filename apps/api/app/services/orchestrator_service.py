from uuid import uuid4
from typing import Optional

from app.core.tenant_context import TenantContext
from app.schemas.chat import ChatRequest, ChatResponse, PlanDraft, PlanStep
from app.schemas.common import AuditEvent, RiskLevel
from app.services.mock_store import store


class OrchestratorService:
    def handle_message(self, ctx: TenantContext, request: ChatRequest) -> ChatResponse:
        conversation_id = request.conversation_id or f"conv_{uuid4().hex[:10]}"
        goal_id = f"goal_{uuid4().hex[:10]}"
        message = request.message.strip()

        if self._looks_like_listing_optimization(message):
            plan = self._build_listing_plan(goal_id, request, ctx)
            store.plan_drafts[plan.id] = plan
            self._audit(ctx, "orchestrator.plan_draft.created", {"plan_draft_id": plan.id})
            return ChatResponse(
                message="我理解你要做 Listing 优化。先生成一个需要确认的计划，写回 Shopify 前会进入审批。",
                conversation_id=conversation_id,
                conversation_goal_id=goal_id,
                plan_draft=plan,
                suggested_next_action="confirm_plan_draft",
                needs_user_confirmation=True,
            )

        self._audit(ctx, "orchestrator.clarification.required", {"message": message})
        return ChatResponse(
            message="我还需要确认你的目标。你是要优化 Listing、分析竞品、做选品研究，还是准备写回 Shopify？",
            conversation_id=conversation_id,
            conversation_goal_id=goal_id,
            plan_draft=None,
            suggested_next_action="answer_clarification",
            needs_user_confirmation=False,
        )

    def _build_listing_plan(
        self, goal_id: str, request: ChatRequest, ctx: TenantContext
    ) -> PlanDraft:
        product_id = self._extract_product_id(request.message) or "mock_product_001"
        return PlanDraft(
            id=f"pd_{uuid4().hex[:10]}",
            conversation_goal_id=goal_id,
            goal="优化 Shopify 商品 Listing，并在审批后写回",
            known_inputs={
                "product_id": product_id,
                "shop_id": request.shop_id or ctx.shop_id or "mock_shop_001",
            },
            missing_inputs=[],
            assumptions=[
                "第一版使用 mock Shopify 商品数据。",
                "写回动作只会在审批通过后由 Tool Gateway 执行。",
            ],
            proposed_steps=[
                PlanStep(
                    id="read_product",
                    title="读取商品数据",
                    description="通过 Connector Gateway 读取 Shopify 商品快照。",
                ),
                PlanStep(
                    id="listing_agent",
                    title="生成 ListingDiff",
                    description="调用 Listing Agent 生成标题、描述和 SEO 建议。",
                ),
                PlanStep(
                    id="review",
                    title="审批 ListingDiff",
                    description="人工确认最终 diff。",
                    risk_level=RiskLevel.high,
                    requires_approval=True,
                ),
                PlanStep(
                    id="write_back",
                    title="写回 Shopify",
                    description="审批通过后通过 Tool Gateway 使用冻结 diff 写回。",
                    risk_level=RiskLevel.high,
                    requires_approval=True,
                ),
            ],
            required_capabilities=[
                "shopify_product_read_tool",
                "listing_optimization_agent",
                "listing_review_approval",
                "shopify_product_write_tool",
            ],
            risk_level=RiskLevel.high,
        )

    def _looks_like_listing_optimization(self, message: str) -> bool:
        keywords = ["listing", "标题", "描述", "seo", "优化", "shopify", "写回"]
        return any(keyword.lower() in message.lower() for keyword in keywords)

    def _extract_product_id(self, message: str) -> Optional[str]:
        for token in message.split():
            if token.startswith("gid://") or token.startswith("prod_"):
                return token
        return None

    def _audit(self, ctx: TenantContext, action: str, metadata: dict) -> None:
        store.audit_logs.append(
            AuditEvent(
                id=f"audit_{uuid4().hex[:10]}",
                tenant_id=ctx.tenant_id,
                workspace_id=ctx.workspace_id,
                user_id=ctx.user_id,
                action=action,
                source="orchestrator",
                metadata=metadata,
            )
        )


orchestrator_service = OrchestratorService()
