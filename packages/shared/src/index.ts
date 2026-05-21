export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RunStatus =
  | "draft"
  | "waiting_user_confirmation"
  | "waiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type PlanStep = {
  id: string;
  title: string;
  description: string;
  risk_level: RiskLevel;
  requires_approval: boolean;
};

export type PlanDraft = {
  id: string;
  conversation_goal_id: string;
  goal: string;
  known_inputs: Record<string, unknown>;
  missing_inputs: string[];
  assumptions: string[];
  proposed_steps: PlanStep[];
  required_capabilities: string[];
  risk_level: RiskLevel;
  needs_user_confirmation: boolean;
  status: string;
};

export type ChatResponse = {
  message: string;
  conversation_id: string;
  conversation_goal_id: string;
  plan_draft: PlanDraft | null;
  suggested_next_action: string;
  needs_user_confirmation: boolean;
};

export type WorkflowRun = {
  id: string;
  tenant_id: string;
  workspace_id: string;
  user_id: string;
  plan_draft_id: string;
  workflow_key: string;
  status: RunStatus;
  timeline: Array<{ type: string; label: string }>;
  approval_request_id: string | null;
  final_output: {
    message?: string;
    listing_diff?: Record<string, unknown>;
  } | null;
};

