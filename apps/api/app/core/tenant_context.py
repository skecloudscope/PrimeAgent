from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    workspace_id: str
    user_id: str
    shop_id: Optional[str] = None


async def require_tenant_context(
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-Id"),
    x_workspace_id: Optional[str] = Header(default=None, alias="X-Workspace-Id"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_shop_id: Optional[str] = Header(default=None, alias="X-Shop-Id"),
) -> TenantContext:
    missing = [
        name
        for name, value in {
            "X-Tenant-Id": x_tenant_id,
            "X-Workspace-Id": x_workspace_id,
            "X-User-Id": x_user_id,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={"code": "missing_tenant_context", "missing": missing},
        )

    return TenantContext(
        tenant_id=x_tenant_id,
        workspace_id=x_workspace_id,
        user_id=x_user_id,
        shop_id=x_shop_id,
    )
