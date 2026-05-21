from fastapi import APIRouter, Depends

from app.core.tenant_context import TenantContext, require_tenant_context
from app.schemas.common import AuditEvent
from app.services.mock_store import store

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditEvent])
async def list_audit_logs(
    ctx: TenantContext = Depends(require_tenant_context),
) -> list[AuditEvent]:
    return [
        event
        for event in store.audit_logs
        if event.tenant_id == ctx.tenant_id and event.workspace_id == ctx.workspace_id
    ]

