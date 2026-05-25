export type ComponentType = "agent" | "team" | "workflow";

export type AgnoComponent = {
  id: string;
  name?: string;
  description?: string;
  role?: string;
  db_id?: string;
  model?: {
    name?: string;
    model?: string;
    provider?: string;
  };
  tools?: unknown;
  [key: string]: unknown;
};

export type RuntimeConfig = {
  agents: AgnoComponent[];
  teams: AgnoComponent[];
  workflows: AgnoComponent[];
  databases: string[];
  raw: Record<string, unknown>;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
  events?: AgnoStreamEvent[];
};

export type ChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

export type AgnoStreamEvent = {
  event: string;
  data: Record<string, unknown>;
};

export type RunTarget = {
  type: ComponentType;
  id: string;
};

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
};

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_AGNO_AGENTOS_BASE_URL || "/api/agno";

export function getAgentOSBaseUrl() {
  return PUBLIC_BASE_URL.replace(/\/$/, "");
}

function asComponents(value: unknown): AgnoComponent[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is AgnoComponent => Boolean(item && typeof item === "object" && "id" in item))
        .map((item) => ({ ...item, id: String(item.id) }))
    : [];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export async function agnoFetch<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`${getAgentOSBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    cache: "no-store",
    ...init
  });
  const text = await response.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, data, text };
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const result = await agnoFetch<Record<string, unknown>>("/config");
  if (!result.ok || !result.data) {
    throw new Error(`AgentOS /config failed: ${result.status} ${result.text}`);
  }

  return {
    agents: asComponents(result.data.agents),
    teams: asComponents(result.data.teams),
    workflows: asComponents(result.data.workflows),
    databases: asStrings(result.data.databases),
    raw: result.data
  };
}

export function endpointForTarget(target: RunTarget) {
  const plural = target.type === "agent" ? "agents" : target.type === "team" ? "teams" : "workflows";
  return `${getAgentOSBaseUrl()}/${plural}/${encodeURIComponent(target.id)}/runs`;
}

function parseSseChunk(buffer: string): { events: AgnoStreamEvent[]; rest: string } {
  const events: AgnoStreamEvent[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() || "";

  for (const part of parts) {
    const lines = part.split("\n");
    const eventLine = lines.find((line) => line.startsWith("event:"));
    const dataLines = lines.filter((line) => line.startsWith("data:"));
    if (!dataLines.length) continue;

    const event = eventLine?.slice("event:".length).trim() || "message";
    const dataText = dataLines.map((line) => line.slice("data:".length).trim()).join("\n");
    try {
      events.push({ event, data: JSON.parse(dataText) as Record<string, unknown> });
    } catch {
      events.push({ event, data: { content: dataText } });
    }
  }

  return { events, rest };
}

export function extractContent(event: AgnoStreamEvent): string {
  const streamingContentEvents = new Set([
    "RunContent",
    "TeamRunContent",
    "WorkflowAgentRunContent",
    "WorkflowAgentContent",
    "RunError"
  ]);
  if (!streamingContentEvents.has(event.event)) return "";

  const content = event.data.content;
  if (typeof content === "string") return content;

  const response = event.data.response;
  if (response && typeof response === "object") {
    const responseContent = (response as Record<string, unknown>).content;
    if (typeof responseContent === "string") return responseContent;
  }

  const memberResponses = event.data.member_responses;
  if (Array.isArray(memberResponses)) {
    return memberResponses
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const maybeContent = (item as Record<string, unknown>).content;
        return typeof maybeContent === "string" ? maybeContent : "";
      })
      .join("");
  }

  return "";
}

export async function runAgnoTarget(args: {
  target: RunTarget;
  message: string;
  files?: File[];
  sessionId: string;
  userId: string;
  onEvent: (event: AgnoStreamEvent) => void;
}) {
  const isWorkflow = args.target.type === "workflow";
  const body = isWorkflow ? new URLSearchParams() : new FormData();
  body.set("message", args.message);
  body.set("stream", "true");
  body.set("session_id", args.sessionId);
  body.set("user_id", args.userId);

  if (!isWorkflow && body instanceof FormData) {
    args.files?.forEach((file) => {
      body.append("files", file, file.name);
    });
  }

  const response = await fetch(endpointForTarget(args.target), {
    method: "POST",
    body
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(`Agno run failed: ${response.status} ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    parsed.events.forEach(args.onEvent);
  }

  if (buffer.trim()) {
    parseSseChunk(`${buffer}\n\n`).events.forEach(args.onEvent);
  }
}
