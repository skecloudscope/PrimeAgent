export type CapabilityType =
  | "skill"
  | "tool"
  | "connector"
  | "agent"
  | "team"
  | "workflow_skeleton"
  | "workflow";

export type CapabilityCard = {
  id: string;
  type: CapabilityType;
  name: string;
  suitableWhen: string[];
  notSuitableWhen: string[];
  requiredPermissions: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "draft" | "testing" | "active" | "deprecated" | "disabled";
};

