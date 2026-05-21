from fastapi import APIRouter, Depends

from app.core.tenant_context import TenantContext, require_tenant_context
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.orchestrator_service import orchestrator_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    ctx: TenantContext = Depends(require_tenant_context),
) -> ChatResponse:
    return orchestrator_service.handle_message(ctx, request)

