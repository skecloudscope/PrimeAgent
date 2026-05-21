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


def test_free_intent_conversation_keeps_context_without_repeating_question() -> None:
    client = TestClient(app)

    first = client.post(
        "/api/chat",
        headers=HEADERS,
        json={"message": "我现在不做 workflow，先自由探索一个新品机会"},
    )
    assert first.status_code == 200
    first_payload = first.json()
    assert first_payload["plan_draft"] is None
    assert first_payload["suggested_next_action"] == "continue_exploration"
    assert "先不固化 Workflow" in first_payload["message"]

    second = client.post(
        "/api/chat",
        headers=HEADERS,
        json={
            "message": "再补充一下，我想看竞品链接和卖点差异",
            "conversation_id": first_payload["conversation_id"],
        },
    )
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["conversation_id"] == first_payload["conversation_id"]
    assert second_payload["plan_draft"]["goal"] == "围绕竞品/竞对链接做开放探索"
    assert "我还需要确认你的目标" not in second_payload["message"]

    plan_id = second_payload["plan_draft"]["id"]
    confirmed = client.post(f"/api/plan-drafts/{plan_id}/confirm", headers=HEADERS)
    assert confirmed.status_code == 200
    confirmed_payload = confirmed.json()
    assert confirmed_payload["workflow_key"] == "exploration_run_mock_v1"
    assert confirmed_payload["approval_request_id"] is None


def test_orchestrator_routes_capability_creation_without_running_workflow() -> None:
    client = TestClient(app)

    skill = client.post(
        "/api/chat",
        headers=HEADERS,
        json={"message": "帮我创建一个跨境电商竞品卖点提炼 Skill"},
    )
    assert skill.status_code == 200
    skill_payload = skill.json()
    assert skill_payload["suggested_next_action"] == "confirm_capability_draft_plan"
    assert skill_payload["plan_draft"]["goal"] == "创建 Skill 草稿"
    assert any("不会自动发布到 active" in item for item in skill_payload["plan_draft"]["assumptions"])

    mcp = client.post(
        "/api/chat",
        headers=HEADERS,
        json={"message": "帮我创建一个 Amazon 评论分析 MCP"},
    )
    assert mcp.status_code == 200
    mcp_payload = mcp.json()
    assert mcp_payload["plan_draft"]["goal"] == "创建 MCP / Connector 草稿"
    assert mcp_payload["plan_draft"]["risk_level"] == "high"


def test_product_launch_uses_light_exploration_not_listing_workflow() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/chat",
        headers=HEADERS,
        json={"message": "我想要做产品上架，但现在资料还不完整"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_draft"]["goal"] == "新品/商品上架开放探索"
    assert "轻量 ExplorationRun" in payload["message"]
    assert "shopify_product_write_tool" not in payload["plan_draft"]["required_capabilities"]
