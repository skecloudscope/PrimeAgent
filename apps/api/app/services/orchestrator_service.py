from uuid import uuid4

from app.core.tenant_context import TenantContext
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import AuditEvent
from app.services.mock_store import store
from runtime.agno.orchestrator import AgnoOrchestratorRuntime, ConversationState


class OrchestratorService:
    def __init__(self) -> None:
        self.runtime = AgnoOrchestratorRuntime()

    def handle_message(self, ctx: TenantContext, request: ChatRequest) -> ChatResponse:
        state = self._get_or_create_state(ctx, request)
        decision = self.runtime.decide(state, request.message, request.shop_id or ctx.shop_id)

        if decision.plan_draft:
            store.plan_drafts[decision.plan_draft.id] = decision.plan_draft
        store.conversations[state.id] = state
        self._audit(ctx, decision.audit_action, decision.audit_metadata)

        return ChatResponse(
            message=decision.message,
            conversation_id=decision.conversation_id,
            conversation_goal_id=decision.conversation_goal_id,
            plan_draft=decision.plan_draft,
            suggested_next_action=decision.suggested_next_action,
            needs_user_confirmation=decision.needs_user_confirmation,
        )

    def _get_or_create_state(self, ctx: TenantContext, request: ChatRequest) -> ConversationState:
        if request.conversation_id and request.conversation_id in store.conversations:
            return store.conversations[request.conversation_id]
        conversation_id = request.conversation_id or f"conv_{uuid4().hex[:10]}"
        return ConversationState(
            id=conversation_id,
            goal_id=f"goal_{uuid4().hex[:10]}",
            tenant_id=ctx.tenant_id,
            workspace_id=ctx.workspace_id,
            user_id=ctx.user_id,
            shop_id=request.shop_id or ctx.shop_id,
        )

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
