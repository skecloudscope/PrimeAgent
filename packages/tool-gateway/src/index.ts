export type ToolRisk = "low" | "medium" | "high" | "critical";

export type ToolExecutionRequest = {
  tenantId: string;
  workspaceId: string;
  userId: string;
  shopId?: string;
  toolKey: string;
  risk: ToolRisk;
  payload: Record<string, unknown>;
};

export type ToolExecutionResult = {
  id: string;
  status: "completed" | "waiting_approval" | "failed";
  auditLogId: string;
  output?: Record<string, unknown>;
};

