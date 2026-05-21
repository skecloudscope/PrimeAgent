import type { ChatResponse, WorkflowRun } from "@prime-agent/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const demoHeaders = {
  "Content-Type": "application/json",
  "X-Tenant-Id": "tenant_demo",
  "X-Workspace-Id": "workspace_demo",
  "X-User-Id": "user_demo",
  "X-Shop-Id": "shop_demo"
};

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: demoHeaders,
    body: JSON.stringify({ message, shop_id: "shop_demo" })
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

export async function confirmPlanDraft(planDraftId: string): Promise<WorkflowRun> {
  const response = await fetch(`${API_BASE_URL}/api/plan-drafts/${planDraftId}/confirm`, {
    method: "POST",
    headers: demoHeaders
  });

  if (!response.ok) {
    throw new Error(`Plan confirmation failed: ${response.status}`);
  }

  return response.json();
}

export async function approveRequest(approvalId: string): Promise<WorkflowRun> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${approvalId}/approve`, {
    method: "POST",
    headers: demoHeaders
  });

  if (!response.ok) {
    throw new Error(`Approval failed: ${response.status}`);
  }

  return response.json();
}

export async function rejectRequest(approvalId: string): Promise<WorkflowRun> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${approvalId}/reject`, {
    method: "POST",
    headers: demoHeaders
  });

  if (!response.ok) {
    throw new Error(`Rejection failed: ${response.status}`);
  }

  return response.json();
}

