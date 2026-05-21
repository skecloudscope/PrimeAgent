from app.schemas.chat import PlanDraft
from app.schemas.common import AuditEvent
from app.schemas.workflow import ApprovalRequest, WorkflowRun
from runtime.agno.orchestrator import ConversationState


class MockStore:
    def __init__(self) -> None:
        self.plan_drafts: dict[str, PlanDraft] = {}
        self.workflow_runs: dict[str, WorkflowRun] = {}
        self.approvals: dict[str, ApprovalRequest] = {}
        self.audit_logs: list[AuditEvent] = []
        self.conversations: dict[str, ConversationState] = {}


store = MockStore()
