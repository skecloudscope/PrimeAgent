from fastapi.testclient import TestClient

from app.main import app


HEADERS = {
    "X-Tenant-Id": "tenant_demo",
    "X-Workspace-Id": "workspace_demo",
    "X-User-Id": "user_demo",
    "X-Shop-Id": "shop_demo",
}


def test_listing_plan_approval_writeback_flow() -> None:
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    chat = client.post(
        "/api/chat",
        headers=HEADERS,
        json={
            "message": "帮我优化 Shopify 商品 prod_demo_001 的 Listing，写回前需要审批",
            "shop_id": "shop_demo",
        },
    )
    assert chat.status_code == 200
    chat_payload = chat.json()
    assert chat_payload["needs_user_confirmation"] is True
    assert chat_payload["plan_draft"]["risk_level"] == "high"

    plan_id = chat_payload["plan_draft"]["id"]
    workflow_run = client.post(f"/api/plan-drafts/{plan_id}/confirm", headers=HEADERS)
    assert workflow_run.status_code == 200
    run_payload = workflow_run.json()
    assert run_payload["status"] == "waiting_approval"
    assert run_payload["approval_request_id"]

    approval_id = run_payload["approval_request_id"]
    approved = client.post(f"/api/approvals/{approval_id}/approve", headers=HEADERS)
    assert approved.status_code == 200
    approved_payload = approved.json()
    assert approved_payload["status"] == "completed"
    assert approved_payload["final_output"]["listing_diff"]["product_id"] == "prod_demo_001"

    audit = client.get("/api/audit-logs", headers=HEADERS)
    assert audit.status_code == 200
    audit_actions = {event["action"] for event in audit.json()}
    assert "orchestrator.plan_draft.created" in audit_actions
    assert "tool_gateway.mock_write_completed" in audit_actions
