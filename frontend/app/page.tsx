"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  Check,
  Bot,
  CheckSquare,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Circle,
  Clock3,
  Code2,
  Copy,
  Database,
  FileJson,
  FileText,
  Github,
  History,
  Home as HomeIcon,
  ImageIcon,
  Info,
  Keyboard,
  Layers3,
  Mail,
  Maximize2,
  Minimize2,
  MemoryStick,
  MoreVertical,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  Route,
  Search,
  Send,
  Settings,
  ScanLine,
  SlidersHorizontal,
  SquareTerminal,
  Trash2,
  Upload,
  User,
  X
} from "lucide-react";
import { type ClipboardEvent, type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  agnoFetch,
  type AgnoComponent,
  type ApiResult,
  type ChatAttachment,
  type ChatMessage,
  type ComponentType,
  extractContent,
  getAgentOSBaseUrl,
  loadRuntimeConfig,
  runAgnoTarget,
  type RunTarget,
  type RuntimeConfig
} from "@/lib/agno";

type NavKey =
  | "home"
  | "chat"
  | "sessions"
  | "traces"
  | "studio"
  | "memory"
  | "knowledge"
  | "metrics"
  | "evaluation"
  | "approvals"
  | "scheduler"
  | "settings";

type EndpointCard = {
  key: NavKey;
  title: string;
  endpoint: string;
  method?: "GET" | "POST";
  payload?: Record<string, unknown>;
};

type ModalState =
  | null
  | { kind: "create-component"; componentType: ComponentType }
  | { kind: "edit-component"; componentType: ComponentType; item: AgnoComponent; registered: boolean }
  | { kind: "create-memory" }
  | { kind: "edit-memory"; row: Record<string, unknown> }
  | { kind: "rename"; title: string; endpoint: string; field: string; currentName: string; method?: "POST" | "PATCH" }
  | { kind: "edit-schedule"; row: Record<string, unknown> }
  | { kind: "create-schedule" }
  | { kind: "upload-knowledge" }
  | { kind: "run-eval" }
  | { kind: "details"; title: string; endpoint?: string; data?: unknown };

type SettingsTab = "profile" | "organization" | "os" | "roles" | "billing";
type ChatInspectorMode = "config" | "sessions" | "memory";
type SessionDetailTab = "runs" | "summary" | "metrics" | "details";
type TraceDetailTab = "info" | "metadata";
type TraceTextMode = "formatted" | "text";
type TraceViewMode = "tree" | "timeline";
type StudioAgentView = "list" | "create" | "edit";
type StudioTeamView = "list" | "create" | "edit";
type StudioWorkflowView = "list" | "create" | "edit";

type StudioAgentForm = {
  name: string;
  agentId: string;
  model: string;
  instructions: string;
  tools: string;
  database: string;
  historyRuns: string;
  addHistoryToContext: boolean;
  addSessionStateToContext: boolean;
  enableAgenticState: boolean;
  enableAgenticMemory: boolean;
  updateMemoryOnRun: boolean;
  sessionStateJson: string;
  metadataJson: string;
  configJson: string;
};

type StudioTeamForm = {
  name: string;
  teamId: string;
  model: string;
  instructions: string;
  tools: string;
  database: string;
  members: string;
  mode: string;
  respondDirectly: boolean;
  delegateToAllMembers: boolean;
  historyRuns: string;
  addHistoryToContext: boolean;
  addSessionStateToContext: boolean;
  enableAgenticState: boolean;
  enableAgenticMemory: boolean;
  updateMemoryOnRun: boolean;
  sessionStateJson: string;
  metadataJson: string;
  configJson: string;
};

type StudioWorkflowStep = {
  stepId: string;
  name: string;
  executorType: "agent" | "team";
  executorId: string;
  maxRetries: string;
  skipOnFailure: boolean;
  numHistoryRuns: string;
  strictInputValidation: boolean;
};

type StudioWorkflowForm = {
  name: string;
  workflowId: string;
  description: string;
  database: string;
  numHistoryRuns: string;
  addWorkflowHistoryToSteps: boolean;
  inputSchemaJson: string;
  metadataJson: string;
  configJson: string;
  steps: StudioWorkflowStep[];
};

const navItems = [
  { key: "home" as const, label: "Home", icon: HomeIcon },
  { key: "chat" as const, label: "Chat", icon: Bot },
  { key: "sessions" as const, label: "Sessions", icon: Play },
  { key: "traces" as const, label: "Traces", icon: Route },
  { key: "studio" as const, label: "Studio", icon: Layers3 },
  { key: "memory" as const, label: "Memory", icon: MemoryStick },
  { key: "knowledge" as const, label: "Knowledge", icon: Database },
  { key: "metrics" as const, label: "Metrics", icon: BarChart3 },
  { key: "evaluation" as const, label: "Evaluation", icon: CheckSquare },
  { key: "approvals" as const, label: "Approvals", icon: CheckSquare },
  { key: "scheduler" as const, label: "Scheduler", icon: Clock3 }
];

const endpointCards: EndpointCard[] = [
  { key: "sessions", title: "Sessions", endpoint: "/sessions" },
  { key: "traces", title: "Traces", endpoint: "/traces" },
  { key: "memory", title: "Memories", endpoint: "/memories" },
  { key: "knowledge", title: "Knowledge", endpoint: "/knowledge/content" },
  { key: "metrics", title: "Metrics", endpoint: "/metrics" },
  { key: "evaluation", title: "Evals", endpoint: "/eval-runs" },
  { key: "approvals", title: "Approvals", endpoint: "/approvals" },
  { key: "scheduler", title: "Schedules", endpoint: "/schedules" },
  { key: "studio", title: "Components", endpoint: "/components" },
  { key: "studio", title: "Registry", endpoint: "/registry" }
];

const docsByNav: Partial<Record<NavKey, string>> = {
  chat: "https://docs.agno.com/agent-os",
  sessions: "https://docs.agno.com/agent-os/sessions",
  traces: "https://docs.agno.com/agent-os/traces",
  studio: "https://docs.agno.com/agent-os/studio",
  memory: "https://docs.agno.com/agent-os/memory",
  knowledge: "https://docs.agno.com/agent-os/knowledge",
  metrics: "https://docs.agno.com/agent-os/metrics",
  evaluation: "https://docs.agno.com/agent-os/evals",
  approvals: "https://docs.agno.com/agent-os/approvals",
  scheduler: "https://docs.agno.com/agent-os/scheduler",
  settings: "https://docs.agno.com/agent-os"
};

function componentLabel(type: ComponentType) {
  if (type === "agent") return "Agents";
  if (type === "team") return "Teams";
  return "Workflows";
}

function componentIcon(type: ComponentType) {
  if (type === "agent") return Bot;
  if (type === "team") return Layers3;
  return Route;
}

function targetMeta(component: AgnoComponent) {
  const model = component.model?.model || component.model?.name;
  return [component.db_id, component.role, component.description, model].filter(Boolean).join(" / ");
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function createId() {
  const random = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? crypto.getRandomValues(new Uint32Array(4))
    : [Math.random() * 0xffffffff, Math.random() * 0xffffffff, Math.random() * 0xffffffff, Math.random() * 0xffffffff];
  return Array.from(random, (value) => Math.floor(value).toString(16).padStart(8, "0")).join("-");
}

function attachmentFromFile(file: File): ChatAttachment {
  return {
    id: createId(),
    name: file.name || (file.type.startsWith("image/") ? "pasted-image.png" : "attachment"),
    type: file.type || "application/octet-stream",
    size: file.size,
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
  };
}

function dataCount(data: unknown) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    if (Array.isArray(body.data)) return body.data.length;
    if (Array.isArray(body.items)) return body.items.length;
    if (Array.isArray(body.results)) return body.results.length;
  }
  return null;
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function getQuickPrompts(config: RuntimeConfig | null, target: RunTarget | null) {
  if (!config || !target) return [];
  const chat = config.raw.chat;
  if (!chat || typeof chat !== "object") return [];
  const quickPrompts = (chat as Record<string, unknown>).quick_prompts;
  if (!quickPrompts || typeof quickPrompts !== "object") return [];
  const prompts = (quickPrompts as Record<string, unknown>)[target.id];
  return Array.isArray(prompts) ? prompts.filter((item): item is string => typeof item === "string") : [];
}

function rowsFromResult(result?: ApiResult): Record<string, unknown>[] {
  const data = result?.data;
  if (!data) return [];
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (typeof data === "object") {
    const body = data as Record<string, unknown>;
    for (const key of ["data", "items", "results", "content"]) {
      const value = body[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
      }
    }
  }
  return [];
}

function compactValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(compactValue).filter((item) => item !== "-").join(", ") || "-";
  return JSON.stringify(value);
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
    if (key.includes(".")) {
      const nested = key.split(".").reduce<unknown>((current, part) => (
        current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined
      ), row);
      if (nested !== undefined && nested !== null && nested !== "") return nested;
    }
  }
  return undefined;
}

function formatCell(value: unknown) {
  const raw = compactValue(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC"
      }).format(date);
    }
  }
  return raw;
}

function sessionTitle(row: Record<string, unknown>) {
  return compactValue(pick(row, ["session_name", "name", "title", "session_id"]));
}

function sessionUpdatedAt(row: Record<string, unknown>) {
  const raw = compactValue(pick(row, ["updated_at", "created_at"]));
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC"
      }).format(date);
    }
  }
  return formatCell(raw);
}

function formatTraceDate(value: unknown, uppercase = false) {
  const raw = compactValue(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC"
      }).format(date);
      return uppercase ? formatted.toUpperCase() : formatted;
    }
  }
  return uppercase ? raw.toUpperCase() : raw;
}

function traceComponent(row: Record<string, unknown>) {
  return compactValue(pick(row, ["agent_id", "team_id", "workflow_id", "component_id", "name"]));
}

function traceStatus(row: Record<string, unknown>) {
  return compactValue(pick(row, ["status", "state"]));
}

function flattenTraceTree(tree: unknown): Array<Record<string, unknown> & { depth: number }> {
  const roots = Array.isArray(tree) ? tree : tree && typeof tree === "object" ? [tree] : [];
  const out: Array<Record<string, unknown> & { depth: number }> = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object") return;
    const row = node as Record<string, unknown>;
    out.push({ ...row, depth });
    const children = Array.isArray(row.spans) ? row.spans : Array.isArray(row.children) ? row.children : [];
    children.forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  return out;
}

function messagesFromHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const role = compactValue(item.role);
      const normalizedRole: ChatMessage["role"] = role === "assistant" || role === "system" ? role : "user";
      return {
        id: compactValue(item.id) !== "-" ? compactValue(item.id) : createId(),
        role: normalizedRole,
        content: compactValue(item.content)
      };
    })
    .filter((message) => message.content !== "-");
}

function modelLabel(value: unknown) {
  if (!value || typeof value !== "object") return compactValue(value);
  const body = value as Record<string, unknown>;
  return compactValue(body.model || body.id || body.name);
}

function toolsCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const body = value as Record<string, unknown>;
    if (Array.isArray(body.tools)) return body.tools.length;
    return Object.keys(body).length;
  }
  return 0;
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // The caller turns this into a visible notice.
  }
  throw new Error(`${label} must be a JSON object.`);
}

function slugFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `agent-${Date.now()}`;
}

function emptyStudioAgentForm(): StudioAgentForm {
  return {
    name: "",
    agentId: "",
    model: "",
    instructions: "",
    tools: "",
    database: "",
    historyRuns: "3",
    addHistoryToContext: false,
    addSessionStateToContext: false,
    enableAgenticState: false,
    enableAgenticMemory: false,
    updateMemoryOnRun: false,
    sessionStateJson: "{}",
    metadataJson: "{}",
    configJson: "{\"cache_session\": true, \"enable_user_memories\": true, \"compress_tool_results\": false}"
  };
}

function studioAgentFormFromAgent(agent: AgnoComponent): StudioAgentForm {
  const systemMessage = agent.system_message && typeof agent.system_message === "object" ? agent.system_message as Record<string, unknown> : {};
  const sessions = agent.sessions && typeof agent.sessions === "object" ? agent.sessions as Record<string, unknown> : {};
  const memory = agent.memory && typeof agent.memory === "object" ? agent.memory as Record<string, unknown> : {};
  return {
    ...emptyStudioAgentForm(),
    name: agent.name || agent.id,
    agentId: agent.id,
    model: modelLabel(agent.model) === "-" ? "" : modelLabel(agent.model),
    instructions: compactValue(systemMessage.instructions) === "-" ? "" : compactValue(systemMessage.instructions),
    database: compactValue(agent.db_id) === "-" ? "" : compactValue(agent.db_id),
    historyRuns: compactValue(sessions.num_history_runs) === "-" ? "3" : compactValue(sessions.num_history_runs),
    addHistoryToContext: Boolean(sessions.add_history_to_context),
    enableAgenticMemory: Boolean(memory.enable_agentic_memory),
    metadataJson: prettyJson(agent.metadata || {}),
    configJson: prettyJson({
      role: agent.role || undefined,
      reasoning: agent.reasoning || undefined,
      default_tools: agent.default_tools || undefined,
      response_settings: agent.response_settings || undefined,
      introduction: agent.introduction || undefined,
      streaming: agent.streaming || undefined
    })
  };
}

function emptyStudioTeamForm(): StudioTeamForm {
  return {
    name: "",
    teamId: "",
    model: "",
    instructions: "",
    tools: "",
    database: "",
    members: "",
    mode: "",
    respondDirectly: false,
    delegateToAllMembers: false,
    historyRuns: "3",
    addHistoryToContext: false,
    addSessionStateToContext: false,
    enableAgenticState: false,
    enableAgenticMemory: false,
    updateMemoryOnRun: false,
    sessionStateJson: "{}",
    metadataJson: "{}",
    configJson: "{\"cache_session\": true, \"enable_user_memories\": true, \"compress_tool_results\": false}"
  };
}

function studioTeamFormFromTeam(team: AgnoComponent): StudioTeamForm {
  const systemMessage = team.system_message && typeof team.system_message === "object" ? team.system_message as Record<string, unknown> : {};
  const sessions = team.sessions && typeof team.sessions === "object" ? team.sessions as Record<string, unknown> : {};
  const memory = team.memory && typeof team.memory === "object" ? team.memory as Record<string, unknown> : {};
  const members = Array.isArray(team.members)
    ? team.members.map((member) => {
        if (!member || typeof member !== "object") return "";
        return compactValue(pick(member as Record<string, unknown>, ["id", "agent_id", "team_id", "name"]));
      }).filter((item) => item && item !== "-").join(", ")
    : "";
  return {
    ...emptyStudioTeamForm(),
    name: team.name || team.id,
    teamId: team.id,
    model: modelLabel(team.model) === "-" ? "" : modelLabel(team.model),
    instructions: compactValue(systemMessage.instructions) === "-" ? "" : compactValue(systemMessage.instructions),
    database: compactValue(team.db_id) === "-" ? "" : compactValue(team.db_id),
    members,
    mode: compactValue(team.mode) === "-" ? "" : compactValue(team.mode),
    respondDirectly: Boolean(team.respond_directly),
    delegateToAllMembers: Boolean(team.delegate_to_all_members),
    historyRuns: compactValue(sessions.num_history_runs) === "-" ? "3" : compactValue(sessions.num_history_runs),
    addHistoryToContext: Boolean(sessions.add_history_to_context),
    enableAgenticMemory: Boolean(memory.enable_agentic_memory),
    metadataJson: prettyJson(team.metadata || {}),
    configJson: prettyJson({
      role: team.role || undefined,
      reasoning: team.reasoning || undefined,
      default_tools: team.default_tools || undefined,
      response_settings: team.response_settings || undefined,
      introduction: team.introduction || undefined,
      streaming: team.streaming || undefined
    })
  };
}

function emptyStudioWorkflowStep(index = 0): StudioWorkflowStep {
  return {
    stepId: `${Date.now()}-${index}`,
    name: index === 0 ? "Step 1" : `Step ${index + 1}`,
    executorType: "agent",
    executorId: "",
    maxRetries: "3",
    skipOnFailure: false,
    numHistoryRuns: "3",
    strictInputValidation: false
  };
}

function workflowStepFromValue(value: unknown, index: number): StudioWorkflowStep {
  const step = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const agent = step.agent && typeof step.agent === "object" ? step.agent as Record<string, unknown> : {};
  const team = step.team && typeof step.team === "object" ? step.team as Record<string, unknown> : {};
  const agentId = compactValue(pick(step, ["agent_id", "agent.id", "agent.name"]));
  const teamId = compactValue(pick(step, ["team_id", "team.id", "team.name"]));
  const executorType = teamId !== "-" && agentId === "-" ? "team" : "agent";
  const fallbackExecutor = executorType === "team"
    ? compactValue(pick(team, ["id", "name"]))
    : compactValue(pick(agent, ["id", "name"]));

  return {
    ...emptyStudioWorkflowStep(index),
    stepId: compactValue(pick(step, ["step_id", "id"])) === "-" ? `${Date.now()}-${index}` : compactValue(pick(step, ["step_id", "id"])),
    name: compactValue(pick(step, ["name"])) === "-" ? `Step ${index + 1}` : compactValue(pick(step, ["name"])),
    executorType,
    executorId: (executorType === "team" ? teamId : agentId) !== "-" ? (executorType === "team" ? teamId : agentId) : (fallbackExecutor === "-" ? "" : fallbackExecutor),
    maxRetries: compactValue(pick(step, ["max_retries"])) === "-" ? "3" : compactValue(pick(step, ["max_retries"])),
    skipOnFailure: Boolean(step.skip_on_failure),
    numHistoryRuns: compactValue(pick(step, ["num_history_runs"])) === "-" ? "3" : compactValue(pick(step, ["num_history_runs"])),
    strictInputValidation: Boolean(step.strict_input_validation)
  };
}

function emptyStudioWorkflowForm(): StudioWorkflowForm {
  return {
    name: "",
    workflowId: "",
    description: "",
    database: "",
    numHistoryRuns: "3",
    addWorkflowHistoryToSteps: false,
    inputSchemaJson: "{}",
    metadataJson: "{}",
    configJson: "{}",
    steps: []
  };
}

function studioWorkflowFormFromWorkflow(workflow: AgnoComponent): StudioWorkflowForm {
  const steps = Array.isArray(workflow.steps)
    ? workflow.steps.map((step, index) => workflowStepFromValue(step, index))
    : [];
  return {
    ...emptyStudioWorkflowForm(),
    name: workflow.name || workflow.id,
    workflowId: workflow.id,
    description: compactValue(workflow.description) === "-" ? "" : compactValue(workflow.description),
    database: compactValue(workflow.db_id) === "-" ? "" : compactValue(workflow.db_id),
    numHistoryRuns: compactValue(workflow.num_history_runs) === "-" ? "3" : compactValue(workflow.num_history_runs),
    addWorkflowHistoryToSteps: Boolean(workflow.add_workflow_history_to_steps),
    inputSchemaJson: prettyJson(workflow.input_schema || {}),
    metadataJson: prettyJson(workflow.metadata || {}),
    configJson: prettyJson({
      workflow_agent: workflow.workflow_agent || undefined,
      factory_input_schema: workflow.factory_input_schema || undefined
    }),
    steps
  };
}

function rowsToCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${compactValue(value).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function flattenMetricRows(result?: ApiResult) {
  if (!result?.data || typeof result.data !== "object") return [];
  const data = result.data as Record<string, unknown>;
  return Array.isArray(data.metrics) ? data.metrics.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object")) : [];
}

function metricDate(row: Record<string, unknown>) {
  const raw = compactValue(pick(row, ["date", "created_at"]));
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function metricDay(row: Record<string, unknown>) {
  return metricDate(row)?.getUTCDate() || 0;
}

function metricNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function metricToken(row: Record<string, unknown>, key: string) {
  const tokenMetrics = row.token_metrics && typeof row.token_metrics === "object" ? row.token_metrics as Record<string, unknown> : {};
  return metricNumber(tokenMetrics[key]);
}

function metricField(row: Record<string, unknown>, key: string) {
  if (key === "total_tokens" || key === "input_tokens" || key === "output_tokens") return metricToken(row, key);
  return metricNumber(row[key]);
}

function metricRowsForMonth(rows: Record<string, unknown>[], offset: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  return rows.filter((row) => {
    const date = metricDate(row);
    return date && date.getUTCFullYear() === start.getFullYear() && date.getUTCMonth() === start.getMonth();
  });
}

function metricMonthBounds(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start, end, days: end.getDate() };
}

function metricSeries(rows: Record<string, unknown>[], key: string, days: number) {
  const values = Array.from({ length: days }, (_, index) => ({ day: index + 1, value: 0 }));
  rows.forEach((row) => {
    const day = metricDay(row);
    if (day >= 1 && day <= days) values[day - 1].value += metricField(row, key);
  });
  return values;
}

function metricSum(rows: Record<string, unknown>[], key: string) {
  return rows.reduce((total, row) => total + metricField(row, key), 0);
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 1)}K`;
  return String(value);
}

function metricModelRows(rows: Record<string, unknown>[]) {
  const counts = new Map<string, { model_id: string; model_provider: string; count: number }>();
  rows.forEach((row) => {
    const modelMetrics = Array.isArray(row.model_metrics) ? row.model_metrics : [];
    modelMetrics.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const body = entry as Record<string, unknown>;
      const model_id = compactValue(body.model_id);
      if (model_id === "-") return;
      const model_provider = compactValue(body.model_provider || body.provider);
      const current = counts.get(model_id) || { model_id, model_provider, count: 0 };
      current.count += metricNumber(body.count);
      counts.set(model_id, current);
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function tableForNav(nav: NavKey, result?: ApiResult) {
  const rows = rowsFromResult(result);
  const columnMap: Partial<Record<NavKey, { label: string; keys: string[] }[]>> = {
    sessions: [
      { label: "Session Name", keys: ["session_name", "name", "session_id"] },
      { label: "Agent/Team/Workflow", keys: ["agent_id", "team_id", "workflow_id", "component_id"] },
      { label: "User", keys: ["user_id"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ],
    traces: [
      { label: "Session ID", keys: ["session_id"] },
      { label: "User", keys: ["user_id"] },
      { label: "Agent/Team/Workflow", keys: ["agent_id", "team_id", "workflow_id", "component_id"] },
      { label: "Traces", keys: ["trace_count", "count", "total"] },
      { label: "Last Trace", keys: ["last_trace_at", "updated_at", "created_at"] }
    ],
    memory: [
      { label: "Content", keys: ["memory", "content", "text"] },
      { label: "Topics", keys: ["topics", "topic"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ],
    knowledge: [
      { label: "Name", keys: ["name", "content_id", "id", "url"] },
      { label: "Content Type", keys: ["content_type", "type"] },
      { label: "Metadata", keys: ["metadata"] },
      { label: "Status", keys: ["status"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ],
    evaluation: [
      { label: "Evaluation Name", keys: ["name", "eval_name", "evaluation_name", "id"] },
      { label: "Agent/Team", keys: ["agent_id", "team_id", "component_id"] },
      { label: "Model", keys: ["model", "model_id"] },
      { label: "Type", keys: ["type", "eval_type"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ],
    scheduler: [
      { label: "Name", keys: ["name", "schedule_id", "id"] },
      { label: "Cron", keys: ["cron", "cron_expression", "schedule"] },
      { label: "Endpoint", keys: ["endpoint", "url", "path"] },
      { label: "Next Run", keys: ["next_run", "next_run_at"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ],
    studio: [
      { label: "Name", keys: ["name", "id"] },
      { label: "Type", keys: ["type", "component_type"] },
      { label: "Status", keys: ["status"] },
      { label: "Updated At", keys: ["updated_at", "created_at"] }
    ]
  };
  const columns = columnMap[nav] || [
    { label: "Name", keys: ["name", "id", "approval_id"] },
    { label: "Status", keys: ["status"] },
    { label: "Created At", keys: ["created_at"] }
  ];
  return { rows, columns };
}

function moduleMeta(nav: NavKey, config: RuntimeConfig | null) {
  const firstDb = config?.databases[0] || "agentos-db";
  const tableByNav: Partial<Record<NavKey, string>> = {
    sessions: "agno_sessions",
    traces: "agno_traces",
    memory: "agno_memories",
    metrics: "agno_metrics",
    evaluation: "agno_eval_runs",
    approvals: "approvals",
    scheduler: "schedules",
    knowledge: "knowledge_content",
    studio: "components"
  };
  return { db: firstDb, table: tableByNav[nav] || "-" };
}

function metricCards(result?: ApiResult) {
  const metrics = result?.data && typeof result.data === "object" ? (result.data as Record<string, unknown>).metrics : null;
  const latest = Array.isArray(metrics) ? metrics[0] : metrics;
  const source = latest && typeof latest === "object" ? (latest as Record<string, unknown>) : {};
  const tokenMetrics = source.token_metrics && typeof source.token_metrics === "object" ? (source.token_metrics as Record<string, unknown>) : {};
  return [
    { label: "Total tokens", value: pick(tokenMetrics, ["total_tokens", "tokens"]) },
    { label: "Users", value: pick(source, ["users_count", "users", "user_count"]) },
    { label: "Agent Runs", value: pick(source, ["agent_runs_count", "agent_runs", "runs_count"]) },
    { label: "Agent Sessions", value: pick(source, ["agent_sessions_count", "agent_sessions", "sessions_count"]) },
    { label: "Team Runs", value: pick(source, ["team_runs_count", "team_runs"]) },
    { label: "Workflow Runs", value: pick(source, ["workflow_runs_count", "workflow_runs"]) }
  ];
}

export default function Home() {
  const [nav, setNav] = useState<NavKey>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studioTab, setStudioTab] = useState<ComponentType | "registry">("agent");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("os");
  const [viewFilter, setViewFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [traceGroup, setTraceGroup] = useState<"sessions" | "runs">("sessions");
  const [traceRange, setTraceRange] = useState("all time");
  const [traceFilter, setTraceFilter] = useState("");
  const [traceCustomStart, setTraceCustomStart] = useState("");
  const [traceCustomEnd, setTraceCustomEnd] = useState("");
  const [traceRangeMenuOpen, setTraceRangeMenuOpen] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<Record<string, unknown> | null>(null);
  const [traceDetailLoading, setTraceDetailLoading] = useState(false);
  const [traceDetailTab, setTraceDetailTab] = useState<TraceDetailTab>("info");
  const [traceViewMode, setTraceViewMode] = useState<TraceViewMode>("tree");
  const [traceInputMode, setTraceInputMode] = useState<TraceTextMode>("formatted");
  const [traceOutputMode, setTraceOutputMode] = useState<TraceTextMode>("formatted");
  const [activeTraceSpanId, setActiveTraceSpanId] = useState<string | null>(null);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [metricMonthOffset, setMetricMonthOffset] = useState(0);
  const [metricExportMenuOpen, setMetricExportMenuOpen] = useState(false);
  const [studioAgentView, setStudioAgentView] = useState<StudioAgentView>("list");
  const [studioAgentForm, setStudioAgentForm] = useState<StudioAgentForm>(() => emptyStudioAgentForm());
  const [studioAgentSaving, setStudioAgentSaving] = useState(false);
  const [studioTeamView, setStudioTeamView] = useState<StudioTeamView>("list");
  const [studioTeamForm, setStudioTeamForm] = useState<StudioTeamForm>(() => emptyStudioTeamForm());
  const [studioTeamSaving, setStudioTeamSaving] = useState(false);
  const [studioWorkflowView, setStudioWorkflowView] = useState<StudioWorkflowView>("list");
  const [studioWorkflowForm, setStudioWorkflowForm] = useState<StudioWorkflowForm>(() => emptyStudioWorkflowForm());
  const [studioWorkflowSaving, setStudioWorkflowSaving] = useState(false);
  const [studioWorkflowDragIndex, setStudioWorkflowDragIndex] = useState<number | null>(null);
  const [studioModels, setStudioModels] = useState<Record<string, unknown>[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [agents, setAgents] = useState<AgnoComponent[]>([]);
  const [teams, setTeams] = useState<AgnoComponent[]>([]);
  const [workflows, setWorkflows] = useState<AgnoComponent[]>([]);
  const [target, setTarget] = useState<RunTarget | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endpointResults, setEndpointResults] = useState<Record<string, ApiResult>>({});
  const [chatInspector, setChatInspector] = useState<ChatInspectorMode | null>(null);
  const [chatInspectorData, setChatInspectorData] = useState<unknown>(null);
  const [chatInspectorLoading, setChatInspectorLoading] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<Record<string, unknown> | null>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailTab, setSessionDetailTab] = useState<SessionDetailTab>("runs");
  const [expandedSessionDetail, setExpandedSessionDetail] = useState(false);
  const [sessionExportMenu, setSessionExportMenu] = useState<"table" | "detail" | null>(null);
  const [sessionViewMenuOpen, setSessionViewMenuOpen] = useState(false);
  const [sessionTextMode, setSessionTextMode] = useState<"formatted" | "text">("formatted");
  const [showRunDetails, setShowRunDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useRef(`primeagent-ui-${createId()}`);
  const userId = process.env.NEXT_PUBLIC_USER_ID || "local_user";
  const memoryOptimizeModel = process.env.NEXT_PUBLIC_AGNO_MEMORY_OPTIMIZE_MODEL;

  const grouped = useMemo(
    () => [
      { type: "agent" as const, items: agents },
      { type: "team" as const, items: teams },
      { type: "workflow" as const, items: workflows }
    ],
    [agents, teams, workflows]
  );

  async function refreshConfig() {
    setLoading(true);
    setError(null);
    try {
      const nextConfig = await loadRuntimeConfig();
      const [agentResult, teamResult, workflowResult, modelResult] = await Promise.all([
        agnoFetch<AgnoComponent[]>("/agents"),
        agnoFetch<AgnoComponent[]>("/teams"),
        agnoFetch<AgnoComponent[]>("/workflows"),
        agnoFetch<Record<string, unknown>[]>("/models")
      ]);
      const runtimeAgents = Array.isArray(agentResult.data)
        ? agentResult.data.filter((item): item is AgnoComponent => Boolean(item && typeof item === "object" && item.id))
        : nextConfig.agents;
      const runtimeTeams = Array.isArray(teamResult.data)
        ? teamResult.data.filter((item): item is AgnoComponent => Boolean(item && typeof item === "object" && item.id))
        : nextConfig.teams;
      const runtimeWorkflows = Array.isArray(workflowResult.data)
        ? workflowResult.data.filter((item): item is AgnoComponent => Boolean(item && typeof item === "object" && item.id))
        : nextConfig.workflows;
      setConfig(nextConfig);
      setAgents(runtimeAgents);
      setTeams(runtimeTeams);
      setWorkflows(runtimeWorkflows);
      setStudioModels(Array.isArray(modelResult.data) ? modelResult.data : []);

      const fallback = runtimeAgents[0]
        ? { type: "agent" as const, id: runtimeAgents[0].id }
        : runtimeTeams[0]
          ? { type: "team" as const, id: runtimeTeams[0].id }
          : runtimeWorkflows[0]
            ? { type: "workflow" as const, id: runtimeWorkflows[0].id }
            : null;
      setTarget((current) => current || fallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function traceTimeParams() {
    if (traceRange === "all time") return {};
    if (traceRange === "custom date range") {
      const custom: Record<string, string> = {};
      if (traceCustomStart) custom.start_time = new Date(traceCustomStart).toISOString();
      if (traceCustomEnd) custom.end_time = new Date(traceCustomEnd).toISOString();
      return custom;
    }
    const start = new Date();
    const rangeMs: Record<string, number> = {
      "last 30 minutes": 30 * 60 * 1000,
      "last hour": 60 * 60 * 1000,
      "last 6 hours": 6 * 60 * 60 * 1000,
      "last day": 24 * 60 * 60 * 1000,
      "last 7 days": 7 * 24 * 60 * 60 * 1000
    };
    start.setTime(start.getTime() - (rangeMs[traceRange] || 7 * 24 * 60 * 60 * 1000));
    return { start_time: start.toISOString() };
  }

  function traceSearchFilter() {
    const conditions: Array<Record<string, unknown>> = [];
    const query = traceFilter.trim();
    if (query) {
      conditions.push({
        op: "OR",
        conditions: ["trace_id", "name", "session_id", "run_id", "user_id", "agent_id", "team_id", "workflow_id", "status"].map((key) => ({
          op: "CONTAINS",
          key,
          value: query
        }))
      });
    }
    const timeParams = traceTimeParams();
    if (timeParams.start_time) conditions.push({ op: "GTE", key: "start_time", value: timeParams.start_time });
    if (timeParams.end_time) conditions.push({ op: "LTE", key: "end_time", value: timeParams.end_time });
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { op: "AND", conditions };
  }

  function endpointForCard(card: EndpointCard) {
    const params = new URLSearchParams();
    params.set("page", String(pageNumber));
    params.set("limit", String(pageLimit));
    if (["sessions", "memory", "knowledge", "evaluation"].includes(card.key)) {
      params.set("sort_by", "updated_at");
      params.set("sort_order", sortNewestFirst ? "desc" : "asc");
    }
    if (card.key === "sessions" && viewFilter !== "all") params.set("type", viewFilter);
    if (card.key === "approvals" && approvalFilter !== "all") {
      params.set("status", approvalFilter === "resolved" ? "approved" : approvalFilter);
    }
    if (card.key === "traces") {
      params.set("group_by", traceGroup);
      Object.entries(traceTimeParams()).forEach(([key, value]) => params.set(key, value));
      return `${card.endpoint}?${params.toString()}`;
    }
    if (card.key === "metrics") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() + metricMonthOffset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + metricMonthOffset + 1, 0);
      const date = (value: Date) => value.toISOString().slice(0, 10);
      return `${card.endpoint}?starting_date=${date(start)}&ending_date=${date(end)}`;
    }
    const query = params.toString();
    return query ? `${card.endpoint}?${query}` : card.endpoint;
  }

  async function loadEndpoint(card: EndpointCard) {
    if (card.key === "knowledge" && config?.raw.knowledge && typeof config.raw.knowledge === "object") {
      const knowledge = config.raw.knowledge as Record<string, unknown>;
      const instances = knowledge.knowledge_instances;
      if (Array.isArray(instances) && instances.length === 0) {
        setEndpointResults((current) => ({
          ...current,
          [card.title]: { ok: true, status: 204, data: { data: [], knowledge_instances: [] }, text: "No AgentOS knowledge instance is configured." }
        }));
        return;
      }
    }
    setEndpointResults((current) => ({
      ...current,
      [card.title]: { ok: false, status: 0, data: null, text: "Loading..." }
    }));
    const searchFilter = card.key === "traces" ? traceSearchFilter() : undefined;
    const isTraceSearch = card.key === "traces" && Boolean(searchFilter);
    const result = await agnoFetch(isTraceSearch ? "/traces/search" : endpointForCard(card), {
      method: isTraceSearch ? "POST" : card.method || "GET",
      headers: isTraceSearch || card.payload ? { "Content-Type": "application/json" } : undefined,
      body: isTraceSearch
        ? JSON.stringify({
            group_by: traceGroup === "sessions" ? "session" : "run",
            page: pageNumber,
            limit: pageLimit,
            filter: searchFilter
          })
        : card.payload ? JSON.stringify(card.payload) : undefined,
    });
    setEndpointResults((current) => ({ ...current, [card.title]: result }));
  }

  async function refreshCurrentView() {
    await refreshConfig();
    const cards = endpointCards.filter((card) => card.key === nav);
    await Promise.all(cards.map(loadEndpoint));
  }

  function exportResult(title: string, result?: ApiResult) {
    if (!result) return;
    const blob = new Blob([prettyJson(result.data ?? result.text)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/\s+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportTraceRows(rows: Record<string, unknown>[]) {
    downloadText(`traces-${traceGroup}.json`, prettyJson(rows), "application/json");
  }

  async function openTraceDetail(row: Record<string, unknown>) {
    let id = compactValue(pick(row, ["trace_id", "first_trace_id", "last_trace_id", "id"]));
    if (!id || id === "-") {
      const sessionId = compactValue(row.session_id);
      if (!sessionId || sessionId === "-") {
        showDetails("Trace row", undefined, row);
        return;
      }
      setTraceDetail({ ...row, name: compactValue(row.session_id), input: "Loading traces for this session..." });
      setTraceDetailLoading(true);
      const sessionSearch = await agnoFetch("/traces/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_by: "run",
          page: 1,
          limit: 1,
          filter: { op: "EQ", key: "session_id", value: sessionId }
        })
      });
      const firstRun = rowsFromResult(sessionSearch).at(0);
      id = compactValue(pick(firstRun || {}, ["trace_id", "id"]));
      if (!firstRun || id === "-") {
        setTraceDetail(row);
        setTraceDetailLoading(false);
        showDetails("Trace session", undefined, row);
        return;
      }
    }
    setActiveTraceId(id);
    setTraceDetail(row);
    setTraceDetailLoading(true);
    setTraceDetailTab("info");
    setTraceInputMode("formatted");
    setTraceOutputMode("formatted");
    setActiveTraceSpanId(null);
    const result = await agnoFetch(`/traces/${encodeURIComponent(id)}`);
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    if (data && typeof data === "object") {
      const detail = data as Record<string, unknown>;
      setTraceDetail(detail);
      const spans = flattenTraceTree(detail.tree);
      setActiveTraceSpanId(compactValue(spans[0]?.id) !== "-" ? compactValue(spans[0]?.id) : null);
    } else {
      setTraceDetail(row);
    }
    setTraceDetailLoading(false);
  }

  function exportSessionRows(format: "json" | "csv", mode: "download" | "copy", rows: Record<string, unknown>[]) {
    const content = format === "json" ? prettyJson(rows) : rowsToCsv(rows);
    const filename = `sessions.${format}`;
    if (mode === "copy") {
      navigator.clipboard.writeText(content);
      setNotice(`Copied ${format.toUpperCase()} sessions.`);
      return;
    }
    downloadText(filename, content, format === "json" ? "application/json" : "text/csv");
    setNotice(`Downloaded ${filename}.`);
  }

  function exportSessionDetail(format: "json", mode: "download" | "copy") {
    if (!sessionDetail) return;
    const content = prettyJson(sessionDetail);
    if (mode === "copy") {
      navigator.clipboard.writeText(content);
      setNotice("Copied JSON session detail.");
      return;
    }
    downloadText(`${rowIdentifier("sessions", sessionDetail)}.json`, content, "application/json");
    setNotice("Downloaded session detail JSON.");
  }

  async function showDetails(title: string, endpoint?: string, data?: unknown) {
    if (!endpoint) {
      setModal({ kind: "details", title, data });
      return;
    }
    setModalBusy(true);
    setModal({ kind: "details", title, endpoint, data: "Loading..." });
    const result = await agnoFetch(endpoint);
    setModal({ kind: "details", title, endpoint, data: result.data ?? result.text });
    setModalBusy(false);
  }

  async function openChatInspector(mode: ChatInspectorMode) {
    setChatInspector(mode);
    setChatInspectorLoading(true);
    setChatInspectorData(null);
    try {
      if (mode === "config") {
        if (!target) {
          setChatInspectorData(null);
          return;
        }
        const plural = target.type === "agent" ? "agents" : target.type === "team" ? "teams" : "workflows";
        const result = await agnoFetch(`/${plural}/${encodeURIComponent(target.id)}`);
        setChatInspectorData(result.ok ? result.data : (selectedComponent || target));
        return;
      }
      if (mode === "sessions") {
        const result = await agnoFetch(`/sessions?sort_by=updated_at&sort_order=desc&page=1&limit=20`);
        setChatInspectorData(result.data ?? { error: result.text });
        return;
      }
      const result = await agnoFetch(`/memories?user_id=${encodeURIComponent(userId)}&page=1&limit=20`);
      setChatInspectorData(result.data ?? { error: result.text });
    } finally {
      setChatInspectorLoading(false);
    }
  }

  async function selectSession(row: Record<string, unknown>) {
    const id = rowIdentifier("sessions", row);
    if (!id || id === "-") return;
    const result = await agnoFetch<Record<string, unknown>>(`/sessions/${encodeURIComponent(id)}`);
    const detail = result.data && typeof result.data === "object" ? result.data : row;
    sessionId.current = id;
    const nextAgent = compactValue(pick(detail, ["agent_id"]));
    const nextTeam = compactValue(pick(detail, ["team_id"]));
    const nextWorkflow = compactValue(pick(detail, ["workflow_id"]));
    if (nextAgent !== "-") setTarget({ type: "agent", id: nextAgent });
    else if (nextTeam !== "-") setTarget({ type: "team", id: nextTeam });
    else if (nextWorkflow !== "-") setTarget({ type: "workflow", id: nextWorkflow });
    setMessages(messagesFromHistory((detail as Record<string, unknown>).chat_history));
    setFiles([]);
    setAttachments([]);
    setInput("");
    setNav("chat");
    setNotice(`Loaded session ${sessionTitle(detail as Record<string, unknown>)}.`);
  }

  async function openSessionDetail(row: Record<string, unknown>) {
    const id = rowIdentifier("sessions", row);
    if (!id || id === "-") return;
    setActiveSessionId(id);
    setSelectedSessionIds((current) => new Set(current).add(id));
    setSessionDetail(row);
    setSessionDetailLoading(true);
    setSessionDetailTab("runs");
    const result = await agnoFetch<Record<string, unknown>>(`/sessions/${encodeURIComponent(id)}`);
    setSessionDetail(result.data && typeof result.data === "object" ? result.data : row);
    setSessionDetailLoading(false);
  }

  async function deleteSelectedSessions() {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected session${ids.length > 1 ? "s" : ""} from AgentOS?`)) return;
    await Promise.all(ids.map((id) => agnoFetch(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" })));
    setSelectedSessionIds(new Set());
    const card = endpointCards.find((item) => item.key === "sessions");
    if (card) await loadEndpoint(card);
    setNotice("Selected sessions deleted.");
  }

  async function deleteSession(id: string) {
    if (!id || id === "-") return;
    if (!window.confirm(`Delete session ${id} from AgentOS?`)) return;
    const result = await agnoFetch(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotice(result.ok ? "Session deleted." : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) {
      setSelectedSessionIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setSessionDetail(null);
      setActiveSessionId(null);
      setExpandedSessionDetail(false);
      const card = endpointCards.find((item) => item.key === "sessions");
      if (card) await loadEndpoint(card);
    }
  }

  async function submitJsonAction(endpoint: string, payload: Record<string, unknown>, success: string) {
    setModalBusy(true);
    const result = await agnoFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setModalBusy(false);
    setNotice(result.ok ? success : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) {
      setModal(null);
      refreshCurrentView();
    }
  }

  async function showJsonAction(title: string, endpoint: string, payload: Record<string, unknown>) {
    setModal({ kind: "details", title, endpoint, data: "Loading..." });
    const result = await agnoFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setModal({ kind: "details", title, endpoint, data: result.data ?? result.text });
  }

  async function nativeAction(endpoint: string, method: "POST" | "PATCH" | "DELETE", success: string, payload?: Record<string, unknown>) {
    const result = await agnoFetch(endpoint, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    });
    setNotice(result.ok ? success : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) refreshCurrentView();
  }

  function rowIdentifier(navKey: NavKey, row: Record<string, unknown>) {
    const keysByNav: Partial<Record<NavKey, string[]>> = {
      sessions: ["session_id", "id"],
      traces: ["trace_id", "id"],
      memory: ["memory_id", "id"],
      knowledge: ["content_id", "id"],
      evaluation: ["eval_run_id", "id"],
      scheduler: ["schedule_id", "id"]
    };
    return compactValue(pick(row, keysByNav[navKey] || ["id"]));
  }

  function rowDetailEndpoint(navKey: NavKey, row: Record<string, unknown>) {
    const id = rowIdentifier(navKey, row);
    if (!id || id === "-") return null;
    const endpointByNav: Partial<Record<NavKey, string>> = {
      sessions: `/sessions/${encodeURIComponent(id)}`,
      traces: `/traces/${encodeURIComponent(id)}`,
      memory: `/memories/${encodeURIComponent(id)}`,
      knowledge: `/knowledge/content/${encodeURIComponent(id)}`,
      evaluation: `/eval-runs/${encodeURIComponent(id)}`,
      scheduler: `/schedules/${encodeURIComponent(id)}`
    };
    return endpointByNav[navKey] || null;
  }

  function deleteEndpoint(navKey: NavKey, row: Record<string, unknown>) {
    const detail = rowDetailEndpoint(navKey, row);
    return ["sessions", "memory", "knowledge", "scheduler"].includes(navKey) ? detail : null;
  }

  function filteredRows(navKey: NavKey, rows: Record<string, unknown>[]) {
    const viewRows = rows.filter((row) => {
      if (viewFilter !== "all" && ["sessions", "evaluation"].includes(navKey)) {
        return compactValue(pick(row, ["session_type", "type", "component_type"])).toLowerCase().includes(viewFilter);
      }
      return true;
    });
    const query = traceFilter.trim().toLowerCase();
    const searched = navKey === "traces" && query
      ? viewRows.filter((row) => JSON.stringify(row).toLowerCase().includes(query))
      : viewRows;
    return [...searched].sort((a, b) => {
      const aTime = Date.parse(compactValue(pick(a, ["updated_at", "created_at", "last_trace_at"])));
      const bTime = Date.parse(compactValue(pick(b, ["updated_at", "created_at", "last_trace_at"])));
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
      return sortNewestFirst ? bTime - aTime : aTime - bTime;
    });
  }

  function openDocs(navKey: NavKey) {
    window.open(docsByNav[navKey] || "https://docs.agno.com/agent-os", "_blank", "noopener,noreferrer");
  }

function metricMonthLabel() {
  const value = new Date();
  value.setMonth(value.getMonth() + metricMonthOffset);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(value);
}

function titleCaseFilter(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function componentIsRegistered(id: string) {
  return rowsFromResult(endpointResults.Components).some((row) => compactValue(pick(row, ["component_id", "id"])) === id);
}

function componentRow(id: string) {
  return rowsFromResult(endpointResults.Components).find((row) => compactValue(pick(row, ["component_id", "id"])) === id);
}

function studioAgentModelOptions() {
  const seen = new Set<string>();
  const values = [
    ...studioModels.map((model) => compactValue(pick(model, ["id", "model", "name"]))),
    ...agents.map((agent) => modelLabel(agent.model)),
    ...teams.map((team) => modelLabel(team.model))
  ].filter((value) => value && value !== "-");
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function registryTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "db") return "Databases";
  if (normalized === "vector_db") return "Vector Databases";
  return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}s`;
}

function registryTypeIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "model") return Bot;
  if (normalized === "tool" || normalized === "function") return Settings;
  if (normalized === "db" || normalized === "database" || normalized === "vector_db") return Database;
  if (normalized === "schema") return FileJson;
  if (normalized === "team") return Layers3;
  if (normalized === "agent") return Bot;
  return Layers3;
}

function registryDisplayId(row: Record<string, unknown>) {
  return compactValue(pick(row, ["id", "model", "db_id", "metadata.id", "name"]));
}

function registryDisplayName(row: Record<string, unknown>) {
  return compactValue(pick(row, ["name", "model", "db_id", "id"]));
}

function registryRowsForType(rows: Record<string, unknown>[], type: string) {
  return rows.filter((row) => compactValue(pick(row, ["type"])).toLowerCase() === type);
}

function renderRegistryCard(row: Record<string, unknown>, title: string, detail: unknown, detailsTitle: string) {
  const type = compactValue(pick(row, ["type"])).toLowerCase();
  const Icon = registryTypeIcon(type);
  const id = registryDisplayId(row);
  const description = compactValue(pick(row, ["description", "metadata.class_path", "provider", "type"]));
  return (
    <article key={`${type}-${id}-${title}`} className="registry-card">
      <div className="registry-card-main">
        <span className="registry-card-icon"><Icon size={18} /></span>
        <div>
          <h3>{title}</h3>
          <p>{registryTypeLabel(type)}</p>
        </div>
      </div>
      <div className="registry-card-body">
        <span>{description === "-" ? "Native AgentOS registry resource" : description}</span>
        <code>{id}</code>
      </div>
      <footer>
        <button type="button" onClick={() => showDetails(detailsTitle, undefined, detail)}>
          <Upload size={15} />
          SEE DETAILS
        </button>
      </footer>
    </article>
  );
}

function renderStudioRegistryPage() {
  const registryRows = rowsFromResult(endpointResults.Registry);
  const registryModelRows = registryRowsForType(registryRows, "model");
  const modelRows: Record<string, unknown>[] = studioModels
    .filter((model) => {
      const id = compactValue(pick(model, ["id", "model", "name"]));
      return id !== "-" && !registryModelRows.some((row) => registryDisplayId(row) === id);
    })
    .map((model) => ({ ...model, type: "model" }));
  const databaseRows: Record<string, unknown>[] = (config?.databases || []).map((database) => ({
    id: database,
    name: database,
    db_id: database,
    type: "db",
    description: "Database returned by AgentOS /config."
  }));
  const registryDbRows = [
    ...registryRowsForType(registryRows, "db"),
    ...registryRowsForType(registryRows, "vector_db")
  ];
  const registryDatabaseRows = databaseRows.filter((database) => (
    !registryDbRows.some((row) => registryDisplayId(row) === database.id)
  ));
  const sections: { key: string; title: string; rows: Record<string, unknown>[] }[] = [
    { key: "model", title: "MODELS", rows: [...registryModelRows, ...modelRows] },
    { key: "tool", title: "TOOLS", rows: [...registryRowsForType(registryRows, "tool"), ...registryRowsForType(registryRows, "function")] },
    { key: "schema", title: "SCHEMAS", rows: registryRowsForType(registryRows, "schema") },
    { key: "db", title: "DATABASES", rows: [...registryDbRows, ...registryDatabaseRows] },
    { key: "agent", title: "AGENTS", rows: registryRowsForType(registryRows, "agent") },
    { key: "team", title: "TEAMS", rows: registryRowsForType(registryRows, "team") }
  ];
  const visibleSections = sections.filter((section) => section.rows.length > 0);
  const hasPrimaryRegistryComponents = sections.slice(0, 4).some((section) => section.rows.length > 0);
  const registryMeta = endpointResults.Registry?.data && typeof endpointResults.Registry.data === "object" && (endpointResults.Registry.data as Record<string, unknown>).meta && typeof (endpointResults.Registry.data as Record<string, unknown>).meta === "object"
    ? (endpointResults.Registry.data as Record<string, unknown>).meta as Record<string, unknown>
    : null;

  return (
    <div className="studio-agent-page registry-page">
      <div className="registry-head">
        <div>
          <h1>Registry</h1>
          {registryMeta ? <p>{compactValue(pick(registryMeta, ["total_count"]))} native registry entries returned by AgentOS.</p> : null}
        </div>
        <button type="button" onClick={() => endpointCards.filter((card) => card.title === "Registry").forEach(loadEndpoint)}>
          <RefreshCw size={16} />
          REFRESH
        </button>
      </div>

      {!hasPrimaryRegistryComponents && (
        <div className="registry-empty">
          <div className="empty-agent-mark">
            <span><ScanLine size={24} /></span>
            <span><Circle size={24} /></span>
          </div>
          <h2>No components found</h2>
          <p>No models, tools, or databases are available in your registry.</p>
          <a href="https://docs.agno.com/" target="_blank" rel="noreferrer">
            LEARN MORE
            <Upload size={16} />
          </a>
          <div className="registry-sample-deck" aria-hidden="true">
            <article />
            <article />
          </div>
        </div>
      )}

      {visibleSections.map((section) => (
        <section key={section.key} className="registry-section">
          <h2>{section.title}</h2>
          <div className="registry-cards">
            {section.rows.map((row) => {
              const name = registryDisplayName(row);
              const detail = {
                source: section.key === "db" && compactValue(pick(row, ["description"])).includes("/config") ? "/config.databases" : "/registry",
                resource: row
              };
              return renderRegistryCard(row, name, detail, `${name} registry details`);
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function updateStudioAgentForm(patch: Partial<StudioAgentForm>) {
  setStudioAgentForm((current) => ({ ...current, ...patch }));
}

function updateStudioTeamForm(patch: Partial<StudioTeamForm>) {
  setStudioTeamForm((current) => ({ ...current, ...patch }));
}

function studioMemberOptions() {
  return [
    ...agents.map((agent) => ({ type: "agent", id: agent.id, label: agent.name || agent.id })),
    ...teams.map((team) => ({ type: "team", id: team.id, label: team.name || team.id }))
  ];
}

async function startStudioAgentCreate() {
  setStudioAgentForm(emptyStudioAgentForm());
  setStudioAgentView("create");
}

async function startStudioAgentEdit(agent: AgnoComponent) {
  setStudioAgentView("edit");
  setStudioAgentForm(studioAgentFormFromAgent(agent));
  const result = await agnoFetch<AgnoComponent>(`/agents/${encodeURIComponent(agent.id)}`);
  if (result.ok && result.data && typeof result.data === "object") {
    setStudioAgentForm(studioAgentFormFromAgent({ ...agent, ...result.data }));
  }
}

function studioAgentConfig(stage: "draft" | "published") {
  const metadata = parseJsonObject(studioAgentForm.metadataJson, "Metadata");
  const sessionState = parseJsonObject(studioAgentForm.sessionStateJson, "Session state");
  const advanced = parseJsonObject(studioAgentForm.configJson, "Config JSON");
  const historyRuns = Number(studioAgentForm.historyRuns);
  return {
    metadata,
    config: {
      ...advanced,
      name: studioAgentForm.name.trim(),
      agent_id: studioAgentForm.agentId.trim() || slugFromName(studioAgentForm.name),
      model: studioAgentForm.model || null,
      instructions: studioAgentForm.instructions || null,
      tools: studioAgentForm.tools ? [studioAgentForm.tools] : [],
      db_id: studioAgentForm.database || null,
      session_state: sessionState,
      sessions: {
        add_history_to_context: studioAgentForm.addHistoryToContext,
        add_session_state_to_context: studioAgentForm.addSessionStateToContext,
        enable_agentic_state: studioAgentForm.enableAgenticState,
        num_history_runs: Number.isFinite(historyRuns) ? historyRuns : null
      },
      memory: {
        enable_agentic_memory: studioAgentForm.enableAgenticMemory,
        update_memory_on_run: studioAgentForm.updateMemoryOnRun
      },
      stage
    }
  };
}

async function saveStudioAgent(stage: "draft" | "published") {
  const name = studioAgentForm.name.trim();
  if (!name) {
    setNotice("Agent name is required before saving.");
    return;
  }
  setStudioAgentSaving(true);
  try {
    const componentId = studioAgentForm.agentId.trim() || slugFromName(name);
    const { metadata, config: agentConfig } = studioAgentConfig(stage);
    const registered = Boolean(componentRow(componentId));
    const result = registered
      ? await agnoFetch(`/components/${encodeURIComponent(componentId)}/configs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: agentConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        })
      : await agnoFetch("/components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            component_id: componentId,
            component_type: "agent",
            description: studioAgentForm.instructions ? studioAgentForm.instructions.slice(0, 180) : null,
            metadata,
            config: agentConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        });
    setNotice(result.ok ? `Agent component ${stage === "published" ? "published" : "saved as draft"}.` : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) {
      setStudioAgentView("list");
      await refreshCurrentView();
    }
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err));
  } finally {
    setStudioAgentSaving(false);
  }
}

async function startStudioTeamCreate() {
  setStudioTeamForm(emptyStudioTeamForm());
  setStudioTeamView("create");
}

async function startStudioTeamEdit(team: AgnoComponent) {
  setStudioTeamView("edit");
  setStudioTeamForm(studioTeamFormFromTeam(team));
  const result = await agnoFetch<AgnoComponent>(`/teams/${encodeURIComponent(team.id)}`);
  if (result.ok && result.data && typeof result.data === "object") {
    setStudioTeamForm(studioTeamFormFromTeam({ ...team, ...result.data }));
  }
}

function studioTeamConfig(stage: "draft" | "published") {
  const metadata = parseJsonObject(studioTeamForm.metadataJson, "Metadata");
  const sessionState = parseJsonObject(studioTeamForm.sessionStateJson, "Session state");
  const advanced = parseJsonObject(studioTeamForm.configJson, "Config JSON");
  const historyRuns = Number(studioTeamForm.historyRuns);
  const members = studioTeamForm.members
    ? studioTeamForm.members.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  return {
    metadata,
    config: {
      ...advanced,
      name: studioTeamForm.name.trim(),
      team_id: studioTeamForm.teamId.trim() || slugFromName(studioTeamForm.name),
      model: studioTeamForm.model || null,
      instructions: studioTeamForm.instructions || null,
      tools: studioTeamForm.tools ? [studioTeamForm.tools] : [],
      db_id: studioTeamForm.database || null,
      members,
      mode: studioTeamForm.mode || null,
      respond_directly: studioTeamForm.respondDirectly,
      delegate_to_all_members: studioTeamForm.delegateToAllMembers,
      session_state: sessionState,
      sessions: {
        add_history_to_context: studioTeamForm.addHistoryToContext,
        add_session_state_to_context: studioTeamForm.addSessionStateToContext,
        enable_agentic_state: studioTeamForm.enableAgenticState,
        num_history_runs: Number.isFinite(historyRuns) ? historyRuns : null
      },
      memory: {
        enable_agentic_memory: studioTeamForm.enableAgenticMemory,
        update_memory_on_run: studioTeamForm.updateMemoryOnRun
      },
      stage
    }
  };
}

async function saveStudioTeam(stage: "draft" | "published") {
  const name = studioTeamForm.name.trim();
  if (!name) {
    setNotice("Team name is required before saving.");
    return;
  }
  setStudioTeamSaving(true);
  try {
    const componentId = studioTeamForm.teamId.trim() || slugFromName(name);
    const { metadata, config: teamConfig } = studioTeamConfig(stage);
    const registered = Boolean(componentRow(componentId));
    const result = registered
      ? await agnoFetch(`/components/${encodeURIComponent(componentId)}/configs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: teamConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        })
      : await agnoFetch("/components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            component_id: componentId,
            component_type: "team",
            description: studioTeamForm.instructions ? studioTeamForm.instructions.slice(0, 180) : null,
            metadata,
            config: teamConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        });
    setNotice(result.ok ? `Team component ${stage === "published" ? "published" : "saved as draft"}.` : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) {
      setStudioTeamView("list");
      await refreshCurrentView();
    }
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err));
  } finally {
    setStudioTeamSaving(false);
  }
}

function updateStudioWorkflowForm(patch: Partial<StudioWorkflowForm>) {
  setStudioWorkflowForm((current) => ({ ...current, ...patch }));
}

function updateStudioWorkflowStep(index: number, patch: Partial<StudioWorkflowStep>) {
  setStudioWorkflowForm((current) => ({
    ...current,
    steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step)
  }));
}

function addStudioWorkflowStep() {
  setStudioWorkflowForm((current) => {
    const nextStep = emptyStudioWorkflowStep(current.steps.length);
    const firstAgent = agents[0]?.id || "";
    const firstTeam = teams[0]?.id || "";
    return {
      ...current,
      steps: [
        ...current.steps,
        {
          ...nextStep,
          executorType: firstAgent ? "agent" : "team",
          executorId: firstAgent || firstTeam
        }
      ]
    };
  });
}

function removeStudioWorkflowStep(index: number) {
  setStudioWorkflowForm((current) => ({
    ...current,
    steps: current.steps.filter((_, stepIndex) => stepIndex !== index)
  }));
}

function moveStudioWorkflowStep(index: number, direction: -1 | 1) {
  setStudioWorkflowForm((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.steps.length) return current;
    const steps = [...current.steps];
    const [step] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, step);
    return { ...current, steps };
  });
}

function reorderStudioWorkflowStep(fromIndex: number, toIndex: number) {
  setStudioWorkflowForm((current) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= current.steps.length || toIndex >= current.steps.length) return current;
    const steps = [...current.steps];
    const [step] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, step);
    return { ...current, steps };
  });
}

function shouldStartWorkflowDrag(target: EventTarget | null) {
  return !(target instanceof HTMLElement) || !target.closest("input, select, textarea, button");
}

async function startStudioWorkflowCreate() {
  setStudioWorkflowForm(emptyStudioWorkflowForm());
  setStudioWorkflowView("create");
}

async function startStudioWorkflowEdit(workflow: AgnoComponent) {
  setStudioWorkflowView("edit");
  setStudioWorkflowForm(studioWorkflowFormFromWorkflow(workflow));
  const [runtimeResult, configResult] = await Promise.all([
    agnoFetch<AgnoComponent>(`/workflows/${encodeURIComponent(workflow.id)}`),
    agnoFetch<Record<string, unknown>>(`/components/${encodeURIComponent(workflow.id)}/configs/current`)
  ]);
  const currentConfig = configResult.ok && configResult.data && typeof configResult.data === "object"
    ? configResult.data.config
    : null;
  const merged = runtimeResult.ok && runtimeResult.data && typeof runtimeResult.data === "object"
    ? { ...workflow, ...runtimeResult.data }
    : workflow;
  if (currentConfig && typeof currentConfig === "object") {
    setStudioWorkflowForm(studioWorkflowFormFromWorkflow({ ...merged, ...(currentConfig as Record<string, unknown>), id: workflow.id }));
  } else {
    setStudioWorkflowForm(studioWorkflowFormFromWorkflow(merged));
  }
}

function workflowStepPayload(step: StudioWorkflowStep) {
  const retries = Number(step.maxRetries);
  const historyRuns = Number(step.numHistoryRuns);
  return {
    name: step.name.trim() || "Step",
    type: "Step",
    step_id: step.stepId || `${Date.now()}`,
    ...(step.executorType === "team" ? { team_id: step.executorId || null } : { agent_id: step.executorId || null }),
    max_retries: Number.isFinite(retries) ? retries : 3,
    skip_on_failure: step.skipOnFailure,
    num_history_runs: Number.isFinite(historyRuns) ? historyRuns : 3,
    strict_input_validation: step.strictInputValidation
  };
}

function studioWorkflowConfig(stage: "draft" | "published") {
  const metadata = parseJsonObject(studioWorkflowForm.metadataJson, "Metadata");
  const inputSchema = parseJsonObject(studioWorkflowForm.inputSchemaJson, "Input schema");
  const advanced = parseJsonObject(studioWorkflowForm.configJson, "Config JSON");
  const historyRuns = Number(studioWorkflowForm.numHistoryRuns);
  return {
    metadata,
    config: {
      ...advanced,
      name: studioWorkflowForm.name.trim(),
      workflow_id: studioWorkflowForm.workflowId.trim() || slugFromName(studioWorkflowForm.name),
      description: studioWorkflowForm.description || null,
      db_id: studioWorkflowForm.database || null,
      input_schema: inputSchema,
      steps: studioWorkflowForm.steps.map(workflowStepPayload),
      num_history_runs: Number.isFinite(historyRuns) ? historyRuns : 3,
      add_workflow_history_to_steps: studioWorkflowForm.addWorkflowHistoryToSteps,
      stage
    }
  };
}

async function saveStudioWorkflow(stage: "draft" | "published") {
  const name = studioWorkflowForm.name.trim();
  if (!name) {
    setNotice("Workflow name is required before publishing.");
    return;
  }
  setStudioWorkflowSaving(true);
  try {
    const componentId = studioWorkflowForm.workflowId.trim() || slugFromName(name);
    const { metadata, config: workflowConfig } = studioWorkflowConfig(stage);
    const registered = Boolean(componentRow(componentId));
    const result = registered
      ? await agnoFetch(`/components/${encodeURIComponent(componentId)}/configs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: workflowConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        })
      : await agnoFetch("/components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            component_id: componentId,
            component_type: "workflow",
            description: studioWorkflowForm.description || null,
            metadata,
            config: workflowConfig,
            stage,
            label: stage,
            notes: stage === "published" ? "Published from PrimeAgent Studio." : "Draft saved from PrimeAgent Studio.",
            set_current: true
          })
        });
    setNotice(result.ok ? `Workflow component ${stage === "published" ? "published" : "saved as draft"}.` : `HTTP ${result.status}: ${result.text}`);
    if (result.ok) {
      setStudioWorkflowView("list");
      await refreshCurrentView();
    }
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err));
  } finally {
    setStudioWorkflowSaving(false);
  }
}

function renderStudioWorkflowsPage() {
  const registeredWorkflowRows = rowsFromResult(endpointResults.Components)
    .filter((row) => compactValue(pick(row, ["component_type", "type"])) === "workflow");
  const runtimeIds = new Set(workflows.map((workflow) => workflow.id));
  const componentOnlyWorkflows: AgnoComponent[] = registeredWorkflowRows
    .filter((row) => !runtimeIds.has(compactValue(pick(row, ["component_id", "id"]))))
    .map((row) => ({
      id: compactValue(pick(row, ["component_id", "id"])),
      name: compactValue(pick(row, ["name", "component_id", "id"])),
      description: compactValue(row.description) === "-" ? undefined : compactValue(row.description),
      current_version: row.current_version,
      stage: compactValue(pick(row, ["stage", "label"])) === "-" ? undefined : compactValue(pick(row, ["stage", "label"])),
      is_component: true
    }));
  const listWorkflows = [...workflows, ...componentOnlyWorkflows];
  const previewName = studioWorkflowForm.name.trim() || "Name of workflow";
  const previewRows = [
    ["NAME", studioWorkflowForm.name.trim() || "No name given yet"],
    ["WORKFLOW ID", studioWorkflowForm.workflowId.trim() || "Auto-generated"],
    ["DATABASE", studioWorkflowForm.database || "No database given yet"],
    ["STEPS", studioWorkflowForm.steps.length ? `${studioWorkflowForm.steps.length}` : "No steps added yet"],
    ["HISTORY RUNS", studioWorkflowForm.numHistoryRuns || "3"]
  ];
  const executorOptions = (step: StudioWorkflowStep) => step.executorType === "team" ? teams : agents;

  if (studioWorkflowView !== "list") {
    return (
      <div className="studio-agent-page editor-mode">
        <div className="studio-agent-editor workflow-editor">
          <form className="studio-agent-form" onSubmit={(event) => event.preventDefault()}>
            <div className="studio-agent-local-crumb">
              <button type="button" onClick={() => setStudioWorkflowView("list")} aria-label="Back to Workflows">
                <ChevronDown size={18} />
              </button>
              <strong>Workflows</strong>
              <span>/</span>
              <strong>{studioWorkflowView === "create" ? "New Workflow" : "Edit Workflow"}</strong>
            </div>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Basics</h2>
                  <p>Configure the workflow identity and runtime metadata</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>WORKFLOW NAME</span>
                  <input value={studioWorkflowForm.name} onChange={(event) => updateStudioWorkflowForm({ name: event.target.value })} placeholder="Enter workflow name" />
                </label>
                <label>
                  <span>DESCRIPTION <b>OPTIONAL</b></span>
                  <textarea value={studioWorkflowForm.description} onChange={(event) => updateStudioWorkflowForm({ description: event.target.value })} placeholder="Describe what this workflow does" rows={4} />
                </label>
                <label>
                  <span>DATABASE <b>OPTIONAL</b></span>
                  <select value={studioWorkflowForm.database} onChange={(event) => updateStudioWorkflowForm({ database: event.target.value })}>
                    <option value="">Select a database</option>
                    {config?.databases.map((database) => <option key={database} value={database}>{database}</option>)}
                  </select>
                  {(!config?.databases.length) && <small>No databases in Registry</small>}
                </label>
              </div>
            </section>

            <section className="agent-form-section open workflow-builder-section">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Steps</h2>
                  <p>Build a real Agno workflow from AgentOS agents or teams</p>
                </div>
              </header>
              <div className="workflow-builder">
                <div className="workflow-step-list">
                  {studioWorkflowForm.steps.length === 0 ? (
                    <div className="workflow-empty-steps">
                      <Route size={22} />
                      <strong>No steps added</strong>
                      <span>Add a step to create the workflow execution path.</span>
                    </div>
                  ) : studioWorkflowForm.steps.map((step, index) => (
                    <article
                      key={step.stepId}
                      className={`workflow-step-card${studioWorkflowDragIndex === index ? " dragging" : ""}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                        setStudioWorkflowDragIndex(index);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        if (studioWorkflowDragIndex !== null && studioWorkflowDragIndex !== index) {
                          reorderStudioWorkflowStep(studioWorkflowDragIndex, index);
                          setStudioWorkflowDragIndex(index);
                        }
                      }}
                      onPointerDown={(event) => {
                        if (shouldStartWorkflowDrag(event.target)) {
                          setStudioWorkflowDragIndex(index);
                        }
                      }}
                      onPointerEnter={() => {
                        if (studioWorkflowDragIndex !== null && studioWorkflowDragIndex !== index) {
                          reorderStudioWorkflowStep(studioWorkflowDragIndex, index);
                          setStudioWorkflowDragIndex(index);
                        }
                      }}
                      onPointerUp={() => setStudioWorkflowDragIndex(null)}
                      onPointerCancel={() => setStudioWorkflowDragIndex(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                        reorderStudioWorkflowStep(studioWorkflowDragIndex ?? (Number.isFinite(fromIndex) ? fromIndex : index), index);
                        setStudioWorkflowDragIndex(null);
                      }}
                      onDragEnd={() => setStudioWorkflowDragIndex(null)}
                    >
                      <header className="workflow-step-head">
                        <span><ChevronsUpDown size={15} /></span>
                        <strong>Step {index + 1}</strong>
                        <div>
                          <button type="button" title="Move up" onClick={() => moveStudioWorkflowStep(index, -1)} disabled={index === 0}><ChevronUp size={15} /></button>
                          <button type="button" title="Move down" onClick={() => moveStudioWorkflowStep(index, 1)} disabled={index === studioWorkflowForm.steps.length - 1}><ChevronDown size={15} /></button>
                          <button type="button" title="Remove step" onClick={() => removeStudioWorkflowStep(index)}><Trash2 size={15} /></button>
                        </div>
                      </header>
                      <div className="workflow-step-grid">
                        <label>
                          <span>STEP NAME</span>
                          <input value={step.name} onChange={(event) => updateStudioWorkflowStep(index, { name: event.target.value })} placeholder="Step name" />
                        </label>
                        <label>
                          <span>EXECUTOR</span>
                          <select value={step.executorType} onChange={(event) => updateStudioWorkflowStep(index, { executorType: event.target.value as "agent" | "team", executorId: "" })}>
                            <option value="agent">Agent</option>
                            <option value="team">Team</option>
                          </select>
                        </label>
                        <label>
                          <span>{step.executorType === "team" ? "TEAM" : "AGENT"}</span>
                          <select value={step.executorId} onChange={(event) => updateStudioWorkflowStep(index, { executorId: event.target.value })}>
                            <option value="">Select {step.executorType}</option>
                            {executorOptions(step).map((item) => <option key={`${step.executorType}-${item.id}`} value={item.id}>{item.name || item.id}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>MAX RETRIES</span>
                          <input value={step.maxRetries} onChange={(event) => updateStudioWorkflowStep(index, { maxRetries: event.target.value })} inputMode="numeric" />
                        </label>
                        <label>
                          <span>HISTORY RUNS</span>
                          <input value={step.numHistoryRuns} onChange={(event) => updateStudioWorkflowStep(index, { numHistoryRuns: event.target.value })} inputMode="numeric" />
                        </label>
                      </div>
                      <div className="workflow-step-toggles">
                        <label className="agent-toggle">
                          <span>SKIP ON FAILURE</span>
                          <input type="checkbox" checked={step.skipOnFailure} onChange={(event) => updateStudioWorkflowStep(index, { skipOnFailure: event.target.checked })} />
                        </label>
                        <label className="agent-toggle">
                          <span>STRICT INPUT VALIDATION</span>
                          <input type="checkbox" checked={step.strictInputValidation} onChange={(event) => updateStudioWorkflowStep(index, { strictInputValidation: event.target.checked })} />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
                <button type="button" className="workflow-add-step" onClick={addStudioWorkflowStep}>
                  <Plus size={18} />
                  ADD STEP
                </button>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Context Management</h2>
                  <p>Control workflow history passed into steps</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>NUMBER OF HISTORY RUNS <b>OPTIONAL</b></span>
                  <input value={studioWorkflowForm.numHistoryRuns} onChange={(event) => updateStudioWorkflowForm({ numHistoryRuns: event.target.value })} placeholder="e.g., 3" inputMode="numeric" />
                </label>
                <label className="agent-toggle">
                  <span>ADD WORKFLOW HISTORY TO STEPS</span>
                  <input type="checkbox" checked={studioWorkflowForm.addWorkflowHistoryToSteps} onChange={(event) => updateStudioWorkflowForm({ addWorkflowHistoryToSteps: event.target.checked })} />
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Advanced</h2>
                  <p>AgentOS workflow component configuration</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>WORKFLOW ID <b>OPTIONAL</b></span>
                  <input value={studioWorkflowForm.workflowId} onChange={(event) => updateStudioWorkflowForm({ workflowId: event.target.value })} placeholder="Auto-generated if not provided" />
                </label>
                <label>
                  <span>INPUT SCHEMA <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioWorkflowForm.inputSchemaJson} onChange={(event) => updateStudioWorkflowForm({ inputSchemaJson: event.target.value })} rows={5} />
                </label>
                <label>
                  <span>METADATA <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioWorkflowForm.metadataJson} onChange={(event) => updateStudioWorkflowForm({ metadataJson: event.target.value })} rows={4} />
                </label>
                <label>
                  <span>CONFIG JSON <b>OPTIONAL</b></span>
                  <textarea value={studioWorkflowForm.configJson} onChange={(event) => updateStudioWorkflowForm({ configJson: event.target.value })} rows={6} />
                  <small>Pass additional Agno workflow fields as JSON. Steps above are sent as native workflow step config.</small>
                </label>
              </div>
            </section>

            <div className="studio-agent-savebar">
              <button type="button" onClick={() => setStudioWorkflowForm(emptyStudioWorkflowForm())}>RESET</button>
              <button type="button" onClick={() => saveStudioWorkflow("draft")} disabled={studioWorkflowSaving}>SAVE DRAFT</button>
              <button type="button" className="primary" onClick={() => saveStudioWorkflow("published")} disabled={studioWorkflowSaving}>PUBLISH</button>
            </div>
          </form>

          <aside className="agent-preview-card workflow-preview-card">
            <header>
              <span><Route size={16} /></span>
              <strong>{previewName}</strong>
            </header>
            <section>
              <div className="preview-section-title">
                <span>BASICS</span>
                <ChevronUp size={17} />
              </div>
              {previewRows.map(([label, value]) => (
                <div key={label} className="preview-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
            <section className="workflow-preview-steps">
              <div className="preview-section-title">
                <span>STEPS</span>
                <ChevronUp size={17} />
              </div>
              {studioWorkflowForm.steps.length === 0 ? (
                <p>No steps configured yet.</p>
              ) : studioWorkflowForm.steps.map((step, index) => (
                <div key={`preview-${step.stepId}`} className="workflow-preview-step">
                  <span>{index + 1}</span>
                  <strong>{step.name || `Step ${index + 1}`}</strong>
                  <em>{step.executorType}: {step.executorId || "not selected"}</em>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-agent-page">
      <div className="studio-agent-toolbar">
        <div />
        <button type="button" className="agent-primary-button" onClick={startStudioWorkflowCreate}>
          <Plus size={18} />
          NEW WORKFLOW
        </button>
      </div>
      {listWorkflows.length === 0 ? (
        <div className="studio-agent-empty">
          <div className="empty-agent-mark">
            <span><Route size={24} /></span>
            <span><ScanLine size={24} /></span>
          </div>
          <h2>No workflows found</h2>
          <p>Get started by creating a new workflows.</p>
          <div>
            <a href="https://docs.agno.com/workflows/overview" target="_blank" rel="noreferrer">
              LEARN MORE
              <Upload size={16} />
            </a>
            <button type="button" onClick={startStudioWorkflowCreate}>
              <Plus size={18} />
              NEW WORKFLOW
            </button>
          </div>
        </div>
      ) : (
        <div className="studio-agent-cards">
          {listWorkflows.map((workflow) => {
            const registered = componentRow(workflow.id);
            const runnable = runtimeIds.has(workflow.id);
            const version = compactValue(pick(registered || workflow, ["current_version", "version"]));
            const draft = compactValue(pick(registered || workflow, ["stage", "label"])) === "draft";
            return (
              <article key={workflow.id} className="studio-agent-card">
                <header>
                  <span><Route size={15} /></span>
                  <h3>{workflow.name || workflow.id}</h3>
                  <button type="button" title="View config" onClick={() => showDetails(`${workflow.name || workflow.id} config`, runnable ? `/workflows/${encodeURIComponent(workflow.id)}` : `/components/${encodeURIComponent(workflow.id)}`, workflow)}>
                    <Upload size={15} />
                  </button>
                </header>
                <div className="studio-agent-card-body">
                  <p>Description</p>
                  <span>{workflow.description || targetMeta(workflow) || (runnable ? "Native AgentOS workflow from /workflows" : "Workflow component from /components")}</span>
                  <p>{draft ? "Draft" : "Current Version"}</p>
                  <strong>{draft ? "this workflow is not published yet" : version !== "-" ? version : workflow.id}</strong>
                </div>
                <footer>
                  <button type="button" onClick={() => chooseTarget({ type: "workflow", id: workflow.id })} disabled={!runnable} title={runnable ? "Open in Chat" : "This component is not exposed by /workflows yet"}>CHAT</button>
                  <button type="button" onClick={() => startStudioWorkflowEdit(workflow)}>EDIT</button>
                  <button type="button" title="Component configs" onClick={() => showDetails(`${workflow.name || workflow.id} configs`, registered ? `/components/${encodeURIComponent(workflow.id)}/configs` : undefined, { runtime_workflow: workflow, component: registered || null })}>
                    <MoreVertical size={16} />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderStudioAgentsPage() {
  const registeredAgentRows = rowsFromResult(endpointResults.Components)
    .filter((row) => compactValue(pick(row, ["component_type", "type"])) === "agent");
  const runtimeIds = new Set(agents.map((agent) => agent.id));
  const componentOnlyAgents: AgnoComponent[] = registeredAgentRows
    .filter((row) => !runtimeIds.has(compactValue(pick(row, ["component_id", "id"]))))
    .map((row) => ({
      id: compactValue(pick(row, ["component_id", "id"])),
      name: compactValue(pick(row, ["name", "component_id", "id"])),
      description: compactValue(row.description) === "-" ? undefined : compactValue(row.description),
      current_version: row.current_version,
      stage: compactValue(pick(row, ["stage", "label"])) === "-" ? undefined : compactValue(pick(row, ["stage", "label"])),
      is_component: true
    }));
  const listAgents = [...agents, ...componentOnlyAgents];
  const modelOptions = studioAgentModelOptions();
  const canPublish = Boolean(studioAgentForm.name.trim());
  const previewName = studioAgentForm.name.trim() || "Name of agent";
  const previewRows = [
    ["NAME", studioAgentForm.name.trim() || "No name given yet"],
    ["MODEL", studioAgentForm.model || "No model given yet"],
    ["INSTRUCTIONS", studioAgentForm.instructions || "No instructions given yet"],
    ["TOOLS", studioAgentForm.tools || "No tools given yet"],
    ["DATABASE", studioAgentForm.database || "No database given yet"]
  ];

  if (studioAgentView !== "list") {
    return (
      <div className="studio-agent-page editor-mode">
        <div className="studio-agent-editor">
          <form className="studio-agent-form" onSubmit={(event) => event.preventDefault()}>
            <div className="studio-agent-local-crumb">
              <button type="button" onClick={() => setStudioAgentView("list")} aria-label="Back to Agents">
                <ChevronDown size={18} />
              </button>
              <strong>Agents</strong>
              <span>/</span>
              <strong>{studioAgentView === "create" ? "New Agent" : "Edit Agent"}</strong>
            </div>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Basics</h2>
                  <p>Configure the core identity and behaviour of your agent</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>AGENT NAME</span>
                  <input value={studioAgentForm.name} onChange={(event) => updateStudioAgentForm({ name: event.target.value })} placeholder="Enter agent name" />
                </label>
                <label>
                  <span>MODEL</span>
                  <select value={studioAgentForm.model} onChange={(event) => updateStudioAgentForm({ model: event.target.value })}>
                    <option value="">Select a model</option>
                    {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                  {modelOptions.length === 0 && <small>No models in Registry</small>}
                </label>
                <label>
                  <span>INSTRUCTIONS <b>OPTIONAL</b></span>
                  <textarea value={studioAgentForm.instructions} onChange={(event) => updateStudioAgentForm({ instructions: event.target.value })} placeholder="Enter instructions" rows={7} />
                </label>
                <label>
                  <span>TOOLS <b>OPTIONAL</b></span>
                  <select value={studioAgentForm.tools} onChange={(event) => updateStudioAgentForm({ tools: event.target.value })}>
                    <option value="">Select tools No tools selected</option>
                  </select>
                  <small>No tools in Registry</small>
                </label>
                <label>
                  <span>DATABASE <b>OPTIONAL</b></span>
                  <select value={studioAgentForm.database} onChange={(event) => updateStudioAgentForm({ database: event.target.value })}>
                    <option value="">Select a database</option>
                    {config?.databases.map((database) => <option key={database} value={database}>{database}</option>)}
                  </select>
                  {(!config?.databases.length) && <small>No databases in Registry</small>}
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Context Management</h2>
                  <p>Control the information sent to language models</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>NUMBER OF HISTORY RUNS <b>OPTIONAL</b></span>
                  <input value={studioAgentForm.historyRuns} onChange={(event) => updateStudioAgentForm({ historyRuns: event.target.value })} placeholder="e.g., 3" inputMode="numeric" />
                  <small>Number of historical runs to include in the messages</small>
                </label>
                <div className="agent-toggle-grid">
                  <label className="agent-toggle">
                    <span>ADD HISTORY TO CONTEXT</span>
                    <input type="checkbox" checked={studioAgentForm.addHistoryToContext} onChange={(event) => updateStudioAgentForm({ addHistoryToContext: event.target.checked })} />
                  </label>
                  <label className="agent-toggle">
                    <span>ADD SESSION STATE TO CONTEXT</span>
                    <input type="checkbox" checked={studioAgentForm.addSessionStateToContext} onChange={(event) => updateStudioAgentForm({ addSessionStateToContext: event.target.checked })} />
                  </label>
                </div>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Session State</h2>
                  <p>Session state configuration</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>SESSION STATE <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioAgentForm.sessionStateJson} onChange={(event) => updateStudioAgentForm({ sessionStateJson: event.target.value })} rows={4} />
                </label>
                <div className="agent-toggle-grid">
                  <label className="agent-toggle">
                    <span>ADD SESSION STATE TO CONTEXT</span>
                    <input type="checkbox" checked={studioAgentForm.addSessionStateToContext} onChange={(event) => updateStudioAgentForm({ addSessionStateToContext: event.target.checked })} />
                  </label>
                  <label className="agent-toggle">
                    <span>ENABLE AGENTIC STATE</span>
                    <input type="checkbox" checked={studioAgentForm.enableAgenticState} onChange={(event) => updateStudioAgentForm({ enableAgenticState: event.target.checked })} />
                  </label>
                </div>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Agent Memory</h2>
                  <p>Long-term user memory management</p>
                </div>
              </header>
              <div className="agent-toggle-grid">
                <label className="agent-toggle">
                  <span>ENABLE AGENTIC MEMORY</span>
                  <input type="checkbox" checked={studioAgentForm.enableAgenticMemory} onChange={(event) => updateStudioAgentForm({ enableAgenticMemory: event.target.checked })} />
                </label>
                <label className="agent-toggle">
                  <span>UPDATE MEMORY ON RUN</span>
                  <input type="checkbox" checked={studioAgentForm.updateMemoryOnRun} onChange={(event) => updateStudioAgentForm({ updateMemoryOnRun: event.target.checked })} />
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Advanced</h2>
                  <p>Additional configuration as JSON</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>AGENT ID <b>OPTIONAL</b></span>
                  <input value={studioAgentForm.agentId} onChange={(event) => updateStudioAgentForm({ agentId: event.target.value })} placeholder="Auto-generated if not provided" />
                </label>
                <label>
                  <span>METADATA <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioAgentForm.metadataJson} onChange={(event) => updateStudioAgentForm({ metadataJson: event.target.value })} rows={4} />
                </label>
                <label>
                  <span>CONFIG JSON <b>OPTIONAL</b></span>
                  <textarea value={studioAgentForm.configJson} onChange={(event) => updateStudioAgentForm({ configJson: event.target.value })} rows={6} />
                  <small>Pass any additional advanced configuration as JSON. See Agent documentation for all available parameters.</small>
                </label>
              </div>
            </section>

            <div className="studio-agent-savebar">
              <button type="button" onClick={() => setStudioAgentForm(emptyStudioAgentForm())}>RESET</button>
              <button type="button" onClick={() => saveStudioAgent("draft")} disabled={studioAgentSaving || !canPublish}>SAVE DRAFT</button>
              <button type="button" className="primary" onClick={() => saveStudioAgent("published")} disabled={studioAgentSaving || !canPublish}>PUBLISH</button>
            </div>
          </form>

          <aside className="agent-preview-card">
            <header>
              <span><Bot size={16} /></span>
              <strong>{previewName}</strong>
            </header>
            <section>
              <div className="preview-section-title">
                <span>BASICS</span>
                <ChevronUp size={17} />
              </div>
              {previewRows.map(([label, value]) => (
                <div key={label} className="preview-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-agent-page">
      <div className="studio-agent-toolbar">
        <div />
        <button type="button" className="agent-primary-button" onClick={startStudioAgentCreate}>
          <Plus size={18} />
          NEW AGENT
        </button>
      </div>
      {listAgents.length === 0 ? (
        <div className="studio-agent-empty">
          <div className="empty-agent-mark">
            <span><Bot size={24} /></span>
            <span><ScanLine size={24} /></span>
          </div>
          <h2>No agents found</h2>
          <p>Get started by creating a new agents.</p>
          <div>
            <a href="https://docs.agno.com/agent-os/studio/agents" target="_blank" rel="noreferrer">
              LEARN MORE
              <Upload size={16} />
            </a>
            <button type="button" onClick={startStudioAgentCreate}>
              <Plus size={18} />
              NEW AGENT
            </button>
          </div>
        </div>
      ) : (
        <div className="studio-agent-cards">
          {listAgents.map((agent) => {
            const registered = componentRow(agent.id);
            const runnable = runtimeIds.has(agent.id);
            const version = compactValue(pick(registered || agent, ["current_version", "version"]));
            const draft = compactValue(pick(registered || agent, ["stage", "label"])) === "draft";
            return (
              <article key={agent.id} className="studio-agent-card">
                <header>
                  <span><Bot size={15} /></span>
                  <h3>{agent.name || agent.id}</h3>
                  <button type="button" title="View config" onClick={() => showDetails(`${agent.name || agent.id} config`, runnable ? `/agents/${encodeURIComponent(agent.id)}` : `/components/${encodeURIComponent(agent.id)}`, agent)}>
                    <Upload size={15} />
                  </button>
                </header>
                <div className="studio-agent-card-body">
                  <p>Description</p>
                  <span>{agent.description || targetMeta(agent) || (runnable ? "Native AgentOS agent from /agents" : "Agent component from /components")}</span>
                  <p>{draft ? "Draft" : "Current Version"}</p>
                  <strong>{draft ? "this agent is not published yet" : version !== "-" ? version : agent.id}</strong>
                </div>
                <footer>
                  <button type="button" onClick={() => chooseTarget({ type: "agent", id: agent.id })} disabled={!runnable} title={runnable ? "Open in Chat" : "This component is not exposed by /agents yet"}>CHAT</button>
                  <button type="button" onClick={() => startStudioAgentEdit(agent)}>EDIT</button>
                  <button type="button" title="Component configs" onClick={() => showDetails(`${agent.name || agent.id} configs`, registered ? `/components/${encodeURIComponent(agent.id)}/configs` : undefined, { runtime_agent: agent, component: registered || null })}>
                    <MoreVertical size={16} />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderStudioTeamsPage() {
  const registeredTeamRows = rowsFromResult(endpointResults.Components)
    .filter((row) => compactValue(pick(row, ["component_type", "type"])) === "team");
  const runtimeIds = new Set(teams.map((team) => team.id));
  const componentOnlyTeams: AgnoComponent[] = registeredTeamRows
    .filter((row) => !runtimeIds.has(compactValue(pick(row, ["component_id", "id"]))))
    .map((row) => ({
      id: compactValue(pick(row, ["component_id", "id"])),
      name: compactValue(pick(row, ["name", "component_id", "id"])),
      description: compactValue(row.description) === "-" ? undefined : compactValue(row.description),
      current_version: row.current_version,
      stage: compactValue(pick(row, ["stage", "label"])) === "-" ? undefined : compactValue(pick(row, ["stage", "label"])),
      is_component: true
    }));
  const listTeams = [...teams, ...componentOnlyTeams];
  const modelOptions = studioAgentModelOptions();
  const memberOptions = studioMemberOptions().filter((item) => item.type !== "team" || item.id !== studioTeamForm.teamId);
  const canPublish = Boolean(studioTeamForm.name.trim());
  const previewName = studioTeamForm.name.trim() || "Name of team";
  const previewRows = [
    ["NAME", studioTeamForm.name.trim() || "No name given yet"],
    ["MODEL", studioTeamForm.model || "No model given yet"],
    ["INSTRUCTIONS", studioTeamForm.instructions || "No instructions given yet"],
    ["TOOLS", studioTeamForm.tools || "No tools given yet"],
    ["DATABASE", studioTeamForm.database || "No database given yet"]
  ];

  if (studioTeamView !== "list") {
    return (
      <div className="studio-agent-page editor-mode">
        <div className="studio-agent-editor">
          <form className="studio-agent-form" onSubmit={(event) => event.preventDefault()}>
            <div className="studio-agent-local-crumb">
              <button type="button" onClick={() => setStudioTeamView("list")} aria-label="Back to Teams">
                <ChevronDown size={18} />
              </button>
              <strong>Teams</strong>
              <span>/</span>
              <strong>{studioTeamView === "create" ? "New Team" : "Edit Team"}</strong>
            </div>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Basics</h2>
                  <p>Configure the core identity and behaviour of your team</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>TEAM NAME</span>
                  <input value={studioTeamForm.name} onChange={(event) => updateStudioTeamForm({ name: event.target.value })} placeholder="Enter team name" />
                </label>
                <label>
                  <span>MODEL <b>OPTIONAL</b></span>
                  <select value={studioTeamForm.model} onChange={(event) => updateStudioTeamForm({ model: event.target.value })}>
                    <option value="">Select a model</option>
                    {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                  {modelOptions.length === 0 && <small>No models in Registry</small>}
                </label>
                <label>
                  <span>INSTRUCTIONS <b>OPTIONAL</b></span>
                  <textarea value={studioTeamForm.instructions} onChange={(event) => updateStudioTeamForm({ instructions: event.target.value })} placeholder="List of instructions for the team" rows={7} />
                </label>
                <label>
                  <span>TOOLS <b>OPTIONAL</b></span>
                  <select value={studioTeamForm.tools} onChange={(event) => updateStudioTeamForm({ tools: event.target.value })}>
                    <option value="">Select tools No tools selected</option>
                  </select>
                  <small>No tools in Registry</small>
                </label>
                <label>
                  <span>DATABASE <b>OPTIONAL</b></span>
                  <select value={studioTeamForm.database} onChange={(event) => updateStudioTeamForm({ database: event.target.value })}>
                    <option value="">Select a database</option>
                    {config?.databases.map((database) => <option key={database} value={database}>{database}</option>)}
                  </select>
                  {(!config?.databases.length) && <small>No databases in Registry</small>}
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Team Members and Execution</h2>
                  <p>Select agents or teams to include as members</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>MEMBERS</span>
                  <select value={studioTeamForm.members} onChange={(event) => updateStudioTeamForm({ members: event.target.value })}>
                    <option value="">Select agents or teams No members selected</option>
                    {memberOptions.map((member) => <option key={`${member.type}-${member.id}`} value={member.id}>{member.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>TEAM MODE <b>OPTIONAL</b></span>
                  <select value={studioTeamForm.mode} onChange={(event) => updateStudioTeamForm({ mode: event.target.value })}>
                    <option value="">Select execution mode</option>
                    <option value="coordinate">coordinate</option>
                    <option value="route">route</option>
                    <option value="broadcast">broadcast</option>
                    <option value="collaborate">collaborate</option>
                  </select>
                  <small>Controls how the team leader coordinates work with member agents.</small>
                </label>
              </div>
              <div className="agent-toggle-grid">
                <label className="agent-toggle">
                  <span>RESPOND DIRECTLY</span>
                  <input type="checkbox" checked={studioTeamForm.respondDirectly} onChange={(event) => updateStudioTeamForm({ respondDirectly: event.target.checked })} />
                </label>
                <label className="agent-toggle">
                  <span>DELEGATE TO ALL MEMBERS</span>
                  <input type="checkbox" checked={studioTeamForm.delegateToAllMembers} onChange={(event) => updateStudioTeamForm({ delegateToAllMembers: event.target.checked })} />
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Context Management</h2>
                  <p>Control the information sent to language models</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>NUMBER OF HISTORY RUNS <b>OPTIONAL</b></span>
                  <input value={studioTeamForm.historyRuns} onChange={(event) => updateStudioTeamForm({ historyRuns: event.target.value })} placeholder="e.g., 3" inputMode="numeric" />
                  <small>Number of historical runs to include in the messages</small>
                </label>
                <label className="agent-toggle">
                  <span>ADD HISTORY TO CONTEXT</span>
                  <input type="checkbox" checked={studioTeamForm.addHistoryToContext} onChange={(event) => updateStudioTeamForm({ addHistoryToContext: event.target.checked })} />
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Session State</h2>
                  <p>Session state configuration</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>SESSION STATE <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioTeamForm.sessionStateJson} onChange={(event) => updateStudioTeamForm({ sessionStateJson: event.target.value })} rows={4} />
                </label>
                <div className="agent-toggle-grid">
                  <label className="agent-toggle">
                    <span>ADD SESSION STATE TO CONTEXT</span>
                    <input type="checkbox" checked={studioTeamForm.addSessionStateToContext} onChange={(event) => updateStudioTeamForm({ addSessionStateToContext: event.target.checked })} />
                  </label>
                  <label className="agent-toggle">
                    <span>ENABLE AGENTIC STATE</span>
                    <input type="checkbox" checked={studioTeamForm.enableAgenticState} onChange={(event) => updateStudioTeamForm({ enableAgenticState: event.target.checked })} />
                  </label>
                </div>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Agent Memory</h2>
                  <p>Long-term user memory management</p>
                </div>
              </header>
              <div className="agent-toggle-grid">
                <label className="agent-toggle">
                  <span>ENABLE AGENTIC MEMORY</span>
                  <input type="checkbox" checked={studioTeamForm.enableAgenticMemory} onChange={(event) => updateStudioTeamForm({ enableAgenticMemory: event.target.checked })} />
                </label>
                <label className="agent-toggle">
                  <span>UPDATE MEMORY ON RUN</span>
                  <input type="checkbox" checked={studioTeamForm.updateMemoryOnRun} onChange={(event) => updateStudioTeamForm({ updateMemoryOnRun: event.target.checked })} />
                </label>
              </div>
            </section>

            <section className="agent-form-section open">
              <header>
                <ChevronUp size={18} />
                <div>
                  <h2>Advanced</h2>
                  <p>Additional configuration as JSON</p>
                </div>
              </header>
              <div className="agent-form-fields">
                <label>
                  <span>TEAM ID <b>OPTIONAL</b></span>
                  <input value={studioTeamForm.teamId} onChange={(event) => updateStudioTeamForm({ teamId: event.target.value })} placeholder="Auto-generated if not provided" />
                </label>
                <label>
                  <span>METADATA <Info size={14} /> <b>FORMAT</b></span>
                  <textarea value={studioTeamForm.metadataJson} onChange={(event) => updateStudioTeamForm({ metadataJson: event.target.value })} rows={4} />
                </label>
                <label>
                  <span>CONFIG JSON <b>OPTIONAL</b></span>
                  <textarea value={studioTeamForm.configJson} onChange={(event) => updateStudioTeamForm({ configJson: event.target.value })} rows={6} />
                  <small>Pass any additional advanced configuration as JSON. See Team documentation for all available parameters.</small>
                </label>
              </div>
            </section>

            <div className="studio-agent-savebar">
              <button type="button" onClick={() => setStudioTeamForm(emptyStudioTeamForm())}>RESET</button>
              <button type="button" onClick={() => saveStudioTeam("draft")} disabled={studioTeamSaving || !canPublish}>SAVE DRAFT</button>
              <button type="button" className="primary" onClick={() => saveStudioTeam("published")} disabled={studioTeamSaving || !canPublish}>PUBLISH</button>
            </div>
          </form>

          <aside className="agent-preview-card">
            <header>
              <span><Layers3 size={16} /></span>
              <strong>{previewName}</strong>
            </header>
            <section>
              <div className="preview-section-title">
                <span>BASICS</span>
                <ChevronUp size={17} />
              </div>
              {previewRows.map(([label, value]) => (
                <div key={label} className="preview-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-agent-page">
      <div className="studio-agent-toolbar">
        <div />
        <button type="button" className="agent-primary-button" onClick={startStudioTeamCreate}>
          <Plus size={18} />
          NEW TEAM
        </button>
      </div>
      {listTeams.length === 0 ? (
        <div className="studio-agent-empty">
          <div className="empty-agent-mark">
            <span><Layers3 size={24} /></span>
            <span><ScanLine size={24} /></span>
          </div>
          <h2>No teams found</h2>
          <p>Get started by creating a new teams.</p>
          <div>
            <a href="https://docs.agno.com/teams/overview" target="_blank" rel="noreferrer">
              LEARN MORE
              <Upload size={16} />
            </a>
            <button type="button" onClick={startStudioTeamCreate}>
              <Plus size={18} />
              NEW TEAM
            </button>
          </div>
        </div>
      ) : (
        <div className="studio-agent-cards">
          {listTeams.map((team) => {
            const registered = componentRow(team.id);
            const runnable = runtimeIds.has(team.id);
            const version = compactValue(pick(registered || team, ["current_version", "version"]));
            const draft = compactValue(pick(registered || team, ["stage", "label"])) === "draft";
            return (
              <article key={team.id} className="studio-agent-card">
                <header>
                  <span><Layers3 size={15} /></span>
                  <h3>{team.name || team.id}</h3>
                  <button type="button" title="View config" onClick={() => showDetails(`${team.name || team.id} config`, runnable ? `/teams/${encodeURIComponent(team.id)}` : `/components/${encodeURIComponent(team.id)}`, team)}>
                    <Upload size={15} />
                  </button>
                </header>
                <div className="studio-agent-card-body">
                  <p>Description</p>
                  <span>{team.description || targetMeta(team) || (runnable ? "Native AgentOS team from /teams" : "Team component from /components")}</span>
                  <p>{draft ? "Draft" : "Current Version"}</p>
                  <strong>{draft ? "this team is not published yet" : version !== "-" ? version : team.id}</strong>
                </div>
                <footer>
                  <button type="button" onClick={() => chooseTarget({ type: "team", id: team.id })} disabled={!runnable} title={runnable ? "Open in Chat" : "This component is not exposed by /teams yet"}>CHAT</button>
                  <button type="button" onClick={() => startStudioTeamEdit(team)}>EDIT</button>
                  <button type="button" title="Component configs" onClick={() => showDetails(`${team.name || team.id} configs`, registered ? `/components/${encodeURIComponent(team.id)}/configs` : undefined, { runtime_team: team, component: registered || null })}>
                    <MoreVertical size={16} />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

  async function showAgentOSStatus() {
    setModalBusy(true);
    setModal({ kind: "details", title: "AgentOS Status", data: "Loading..." });
    const [health, info, models] = await Promise.all([
      agnoFetch("/health"),
      agnoFetch("/info"),
      agnoFetch("/models")
    ]);
    setModal({
      kind: "details",
      title: "AgentOS Status",
      data: {
        base_url: getAgentOSBaseUrl(),
        health: health.data ?? health.text,
        info: info.data ?? info.text,
        models: models.data ?? models.text,
        config: config?.raw
      }
    });
    setModalBusy(false);
  }

  async function resolveApproval(row: Record<string, unknown>, status: "approved" | "rejected") {
    const id = compactValue(pick(row, ["approval_id", "id"]));
    if (!id || id === "-") return;
    if (!window.confirm(`${status === "approved" ? "Approve" : "Deny"} approval ${id}?`)) return;
    await submitJsonAction(`/approvals/${encodeURIComponent(id)}/resolve`, {
      status,
      resolved_by: userId
    }, `Approval ${status}.`);
  }

  useEffect(() => {
    refreshConfig();
  }, []);

  useEffect(() => {
    if (!["sessions", "traces", "studio", "memory", "knowledge", "metrics", "evaluation", "approvals", "scheduler"].includes(nav)) {
      return;
    }
    endpointCards.filter((card) => card.key === nav).forEach((card) => {
      if (!endpointResults[card.title]) loadEndpoint(card);
    });
  }, [nav]);

  useEffect(() => {
    const traceCard = endpointCards.find((card) => card.key === "traces");
    if (nav === "traces" && traceCard) loadEndpoint(traceCard);
  }, [traceGroup, traceRange, traceCustomStart, traceCustomEnd]);

  useEffect(() => {
    const metricsCard = endpointCards.find((card) => card.key === "metrics");
    if (nav === "metrics" && metricsCard) loadEndpoint(metricsCard);
  }, [metricMonthOffset]);

  useEffect(() => {
    const card = endpointCards.find((item) => item.key === nav);
    if (card && ["sessions", "traces", "memory", "knowledge", "evaluation", "approvals", "scheduler"].includes(nav)) {
      loadEndpoint(card);
    }
  }, [pageNumber, pageLimit, sortNewestFirst, viewFilter, approvalFilter]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selectedComponent = useMemo(() => {
    if (!target) return null;
    const source = target.type === "agent" ? agents : target.type === "team" ? teams : workflows;
    return source.find((item) => item.id === target.id) || null;
  }, [agents, teams, workflows, target]);

  const quickPrompts = useMemo(() => getQuickPrompts(config, target), [config, target]);
  const osName = String(config?.raw.name || config?.raw.os_name || "test");

  function renderChatInspector() {
    if (!chatInspector) return null;
    const rows = rowsFromResult({ ok: true, status: 200, data: chatInspectorData, text: "" });
    const title = chatInspector === "config" ? `${selectedComponent?.name || target?.id || "Agent"}'s Configuration` : chatInspector === "sessions" ? "Sessions" : "Memory";
    return (
      <aside className="chat-inspector">
        <header>
          <h2>{title}</h2>
          <button type="button" title="Collapse panel" onClick={() => setChatInspector(null)}>
            <PanelLeftClose size={16} />
          </button>
        </header>
        {chatInspectorLoading ? (
          <div className="inspector-empty">Loading...</div>
        ) : chatInspector === "config" ? (
          <div className="config-panel">
            <section className="config-section open">
              <h3>
                <ChevronDown size={15} />
                Agent Details
              </h3>
              <div className="config-card">
                <code>Agent Id: {target?.id || "-"}</code>
                <code>Agent Name: {selectedComponent?.name || target?.id || "-"}</code>
              </div>
            </section>
            <section className="config-section">
              <h3>
                <ChevronDown size={15} />
                Model
                <span>{modelLabel((chatInspectorData as Record<string, unknown> | null)?.model || selectedComponent?.model)}</span>
              </h3>
            </section>
            <section className="config-section">
              <h3>
                <ChevronDown size={15} />
                Tools
                <span>{toolsCount((chatInspectorData as Record<string, unknown> | null)?.tools || selectedComponent?.tools)}</span>
              </h3>
            </section>
            <section className="config-section">
              <h3>
                <ChevronDown size={15} />
                Sessions
              </h3>
            </section>
            <section className="config-section">
              <h3>
                <ChevronDown size={15} />
                Memory
                {selectedComponent?.model?.model && <span>{selectedComponent.model.model}</span>}
              </h3>
            </section>
            <section className="config-section">
              <h3>
                <ChevronDown size={15} />
                System Message
              </h3>
            </section>
          </div>
        ) : chatInspector === "sessions" ? (
          <div className="inspector-list">
            {rows.length === 0 ? (
              <div className="inspector-empty">No sessions found.</div>
            ) : (
              rows.slice(0, 8).map((row, index) => (
                <button key={`${rowIdentifier("sessions", row)}-${index}`} type="button" onClick={() => selectSession(row)}>
                  {sessionTitle(row)}
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="memory-panel">
            <label>
              <span>USER ID</span>
              <input readOnly value={userId} />
            </label>
            {rows.length === 0 ? (
              <div className="memory-empty">
                <div className="memory-orbit">
                  <Bot size={22} />
                  <MemoryStick size={18} />
                  <Keyboard size={18} />
                </div>
                <strong>You do not have any memories yet.</strong>
                <span>Start chatting to your agent and your memories will be logged here.</span>
                <a href="https://docs.agno.com/agent-os/memory" target="_blank" rel="noreferrer">Learn more.</a>
              </div>
            ) : (
              <div className="inspector-list">
                {rows.map((row, index) => (
                  <button key={`${rowIdentifier("memory", row)}-${index}`} type="button" onClick={() => showDetails("Memory detail", rowDetailEndpoint("memory", row) || undefined, row)}>
                    {formatCell(pick(row, ["memory", "content", "text", "id"]))}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    );
  }

  function renderTraceValue(value: unknown, mode: TraceTextMode) {
    const text = compactValue(value);
    if (text === "-") return <div className="trace-value-card muted">No data</div>;
    if (mode === "formatted") {
      return (
        <div className="trace-value-card formatted">
          <button type="button" className="trace-value-copy" onClick={() => navigator.clipboard.writeText(text)} title="Copy value"><Copy size={16} /></button>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown>
        </div>
      );
    }
    return (
      <div className="trace-value-card raw">
        <button type="button" className="trace-value-copy" onClick={() => navigator.clipboard.writeText(text)} title="Copy value"><Copy size={16} /></button>
        <pre>{text}</pre>
      </div>
    );
  }

  function renderTraceDetail() {
    if (!traceDetail) return null;
    const spans = flattenTraceTree(traceDetail.tree);
    const selectedSpan = spans.find((span) => compactValue(span.id) === activeTraceSpanId) || spans[0] || ({ ...traceDetail, depth: 0 } as Record<string, unknown> & { depth: number });
    const metadata = selectedSpan.metadata && typeof selectedSpan.metadata === "object" ? selectedSpan.metadata as Record<string, unknown> : {};
    const rootName = compactValue(pick(traceDetail, ["name", "trace_id", "id"]));
    const selectedName = compactValue(pick(selectedSpan, ["name", "type", "id"]));
    const isOk = traceStatus(selectedSpan) === "OK" || traceStatus(traceDetail) === "OK";
    const tokenRows = [
      ["TOTAL INPUT TOKENS", pick(metadata, ["total_input_tokens", "input_tokens"])],
      ["TOTAL OUTPUT TOKENS", pick(metadata, ["total_output_tokens", "output_tokens"])],
      ["MODEL", pick(metadata, ["model", "model_id"])],
      ["SPAN TYPE", pick(selectedSpan, ["type", "step_type"])]
    ].filter(([, value]) => compactValue(value) !== "-");

    return (
      <section className={traceExpanded ? "trace-detail-page expanded" : "trace-detail-page"}>
        <div className="trace-detail-heading">
          <button type="button" className="trace-back-button" onClick={() => {
            setTraceDetail(null);
            setActiveTraceId(null);
            setActiveTraceSpanId(null);
          }}>
            <ChevronDown size={18} />
          </button>
          <button type="button" className="trace-title-button" onClick={() => navigator.clipboard.writeText(rowIdentifier("traces", traceDetail))}>
            {compactValue(pick(traceDetail, ["session_id", "trace_id", "id"])).slice(0, 28)}...
            <ChevronsUpDown size={16} />
          </button>
          <div className="trace-detail-status">
            <Clock3 size={18} />
            <span>{compactValue(traceDetail.duration)}</span>
            <strong><Check size={17} /> {isOk ? "OK" : traceStatus(traceDetail)}</strong>
          </div>
        </div>

        <div className="trace-detail-fields">
          {([
            ["CREATED AT", formatTraceDate(pick(traceDetail, ["created_at", "start_time"]), true)],
            ["TRACE ID", pick(traceDetail, ["trace_id", "id"])],
            ["RUN ID", pick(traceDetail, ["run_id"])],
            ["SESSION ID", traceDetail.session_id],
            ["USER ID", traceDetail.user_id]
          ] as Array<[string, unknown]>).map(([label, value]) => (
            <label key={label}>
              <span>{label}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(compactValue(value))}>
                {compactValue(value).toUpperCase()}
                <Copy size={15} />
              </button>
            </label>
          ))}
        </div>

        <div className="trace-detail-grid">
          <div className="trace-tree-panel">
            <div className="trace-tree-toolbar">
              <span>{spans.length || 1} {spans.length === 1 ? "span" : "spans"}</span>
              <div className="segmented">
                <button type="button" className={traceViewMode === "tree" ? "active" : ""} onClick={() => setTraceViewMode("tree")}>TREE</button>
                <button type="button" className={traceViewMode === "timeline" ? "active" : ""} onClick={() => setTraceViewMode("timeline")}>TIMELINE</button>
              </div>
              <button type="button" title="Export trace" onClick={() => downloadText(`trace-${rowIdentifier("traces", traceDetail)}.json`, prettyJson(traceDetail), "application/json")}><Upload size={18} /></button>
              <button type="button" title={traceExpanded ? "Restore trace layout" : "Expand trace layout"} onClick={() => setTraceExpanded((current) => !current)}>
                {traceExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            <div className={traceViewMode === "tree" ? "trace-tree-list" : "trace-timeline-list"}>
              {(spans.length ? spans : [{ ...traceDetail, depth: 0 }]).map((span, index) => {
                const id = compactValue(span.id) !== "-" ? compactValue(span.id) : `${index}`;
                const type = compactValue(span.type).toLowerCase();
                const active = compactValue(selectedSpan.id) === compactValue(span.id) || (!selectedSpan.id && index === 0);
                return (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    className={active ? "active" : ""}
                    style={{ "--depth": span.depth || 0 } as CSSProperties}
                    onClick={() => setActiveTraceSpanId(id)}
                  >
                    <span className={`trace-span-icon ${type.includes("llm") ? "llm" : ""}`}>{type.includes("llm") ? <FileText size={17} /> : <ScanLine size={17} />}</span>
                    <strong>{compactValue(span.name)}</strong>
                    <em>{compactValue(span.duration)}</em>
                    {compactValue(pick(span, ["metadata.output_tokens", "metadata.total_output_tokens"])) !== "-" && <small>{compactValue(pick(span, ["metadata.output_tokens", "metadata.total_output_tokens"]))}</small>}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="trace-info-panel">
            <header>
              <div>
                <span className={`trace-span-icon ${compactValue(selectedSpan.type).toLowerCase().includes("llm") ? "llm" : ""}`}>
                  {compactValue(selectedSpan.type).toLowerCase().includes("llm") ? <FileText size={20} /> : <ScanLine size={20} />}
                </span>
                <h2>{selectedName === "-" ? rootName : selectedName}</h2>
              </div>
              <p>LATENCY <strong>{compactValue(selectedSpan.duration || traceDetail.duration)}</strong> <b><Check size={16} /> {isOk ? "OK" : traceStatus(selectedSpan)}</b></p>
            </header>
            <nav>
              <button type="button" className={traceDetailTab === "info" ? "active" : ""} onClick={() => setTraceDetailTab("info")}>INFO</button>
              <button type="button" className={traceDetailTab === "metadata" ? "active" : ""} onClick={() => setTraceDetailTab("metadata")}>METADATA</button>
            </nav>
            <div className="trace-info-body">
              {traceDetailLoading ? (
                <div className="inspector-empty">Loading trace...</div>
              ) : traceDetailTab === "metadata" ? (
                <div className="trace-metadata-list">
                  {tokenRows.length ? (tokenRows as Array<[string, unknown]>).map(([label, value]) => (
                    <section key={label}>
                      <h3><ChevronUp size={16} /> {label}</h3>
                      <button type="button" onClick={() => navigator.clipboard.writeText(compactValue(value))}>{compactValue(value)}<Copy size={15} /></button>
                    </section>
                  )) : (
                    <div className="trace-value-card raw">
                      <button type="button" className="trace-value-copy" onClick={() => navigator.clipboard.writeText(prettyJson(metadata || selectedSpan))} title="Copy metadata"><Copy size={16} /></button>
                      <pre>{prettyJson(metadata || selectedSpan)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <section className="trace-io-section">
                    <div>
                      <h3><ChevronUp size={16} /> INPUT</h3>
                      <div className="segmented">
                        <button type="button" className={traceInputMode === "text" ? "active" : ""} onClick={() => setTraceInputMode("text")}>TEXT</button>
                        <button type="button" className={traceInputMode === "formatted" ? "active" : ""} onClick={() => setTraceInputMode("formatted")}>FORMATTED</button>
                      </div>
                    </div>
                    {renderTraceValue(pick(selectedSpan, ["input", "request", "prompt"]) || traceDetail.input, traceInputMode)}
                  </section>
                  <section className="trace-io-section">
                    <div>
                      <h3><ChevronUp size={16} /> OUTPUT</h3>
                      <div className="segmented">
                        <button type="button" className={traceOutputMode === "text" ? "active" : ""} onClick={() => setTraceOutputMode("text")}>TEXT</button>
                        <button type="button" className={traceOutputMode === "formatted" ? "active" : ""} onClick={() => setTraceOutputMode("formatted")}>FORMATTED</button>
                      </div>
                    </div>
                    {renderTraceValue(pick(selectedSpan, ["output", "response", "result"]) || traceDetail.output, traceOutputMode)}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    );
  }

  function renderTracesPage() {
    const card = endpointCards.find((item) => item.key === "traces");
    const result = card ? endpointResults[card.title] : undefined;
    const rows = filteredRows("traces", rowsFromResult(result));
    const meta = moduleMeta("traces", config);
    const rangeOptions = ["last 30 minutes", "last hour", "last 6 hours", "last day", "last 7 days", "all time", "custom date range"];
    if (traceDetail) return renderTraceDetail();

    return (
      <section className="trace-page">
        <div className="trace-meta">
          <label>
            <span>Database</span>
            <button type="button" onClick={() => showDetails("Database configuration", undefined, config?.raw)}>{meta.db}</button>
          </label>
        </div>
        <div className="trace-table-shell">
          <div className="trace-toolbar">
            <div className="trace-segmented">
              <button type="button" className={traceGroup === "sessions" ? "active" : ""} onClick={() => { setPageNumber(1); setTraceGroup("sessions"); setActiveTraceId(null); setTraceRangeMenuOpen(false); }}>SESSIONS</button>
              <button type="button" className={traceGroup === "runs" ? "active" : ""} onClick={() => { setPageNumber(1); setTraceGroup("runs"); setActiveTraceId(null); setTraceRangeMenuOpen(false); }}>RUNS</button>
            </div>
            <label className="trace-search">
              <Search size={17} />
              <input
                aria-label="Enter filter query"
                placeholder="Enter filter query"
                value={traceFilter}
                onChange={(event) => setTraceFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && card) {
                    setPageNumber(1);
                    loadEndpoint(card);
                  }
                }}
              />
            </label>
            <div className="trace-range-menu">
              <button type="button" onClick={() => setTraceRangeMenuOpen((current) => !current)}>
                {traceRange.toUpperCase()}
                <ChevronsUpDown size={15} />
              </button>
              {traceRangeMenuOpen && (
                <div className="trace-range-dropdown">
                  {rangeOptions.map((option, index) => (
                    <button key={option} type="button" className={traceRange === option ? "active" : ""} onClick={() => {
                      setTraceRange(option);
                      setPageNumber(1);
                      if (option !== "custom date range") setTraceRangeMenuOpen(false);
                    }}>
                      {index === 5 && <hr />}
                      <span>{titleCaseFilter(option)}</span>
                      {traceRange === option && <Check size={16} />}
                    </button>
                  ))}
                  {traceRange === "custom date range" && (
                    <div className="trace-custom-range">
                      <label>
                        <span>START</span>
                        <input type="datetime-local" value={traceCustomStart} onChange={(event) => setTraceCustomStart(event.target.value)} />
                      </label>
                      <label>
                        <span>END</span>
                        <input type="datetime-local" value={traceCustomEnd} onChange={(event) => setTraceCustomEnd(event.target.value)} />
                      </label>
                      <button type="button" onClick={() => {
                        setPageNumber(1);
                        setTraceRangeMenuOpen(false);
                        if (card) loadEndpoint(card);
                      }}>Apply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button type="button" className="trace-export-button" onClick={() => exportTraceRows(rows)}><Upload size={18} /></button>
          </div>
          <table className="trace-table">
            <thead>
              {traceGroup === "sessions" ? (
                <tr><th>SESSION ID</th><th>USER</th><th>AGENT/TEAM/WORKFLOW</th><th>TRACES</th><th>FIRST TRACE</th><th>LAST TRACE</th></tr>
              ) : (
                <tr><th>NAME</th><th>USER</th><th>AGENT/TEAM/WORKFLOW</th><th>DURATION</th><th>CREATED AT</th><th>STATUS</th></tr>
              )}
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = compactValue(pick(row, ["trace_id", "session_id", "id"]));
                return (
                  <tr key={`${id}-${index}`} className={activeTraceId === compactValue(row.trace_id) ? "active" : ""} onClick={() => openTraceDetail(row)}>
                    {traceGroup === "sessions" ? (
                      <>
                        <td><button type="button">{compactValue(row.session_id)}</button></td>
                        <td>{compactValue(row.user_id)}</td>
                        <td><span className="trace-agent-cell"><ScanLine size={17} />{traceComponent(row)}</span></td>
                        <td>{compactValue(pick(row, ["trace_count", "count", "total", "total_spans"]) || 1)}</td>
                        <td>{formatTraceDate(pick(row, ["first_trace_at", "start_time", "created_at"]))}</td>
                        <td>{formatTraceDate(pick(row, ["last_trace_at", "end_time", "created_at"]))}</td>
                      </>
                    ) : (
                      <>
                        <td><button type="button">{compactValue(row.name)}</button></td>
                        <td>{compactValue(row.user_id)}</td>
                        <td><span className="trace-agent-cell"><ScanLine size={17} />{traceComponent(row)}</span></td>
                        <td>{compactValue(row.duration)}</td>
                        <td>{formatTraceDate(pick(row, ["created_at", "start_time"]))}</td>
                        <td><span className="trace-status-pill"><Check size={15} />{traceStatus(row)}</span></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="official-empty"><Route size={22} /><strong>No traces found</strong><span>{result?.ok === false ? result.text : "Trace data will appear after AgentOS records runs."}</span></div>}
        </div>
      </section>
    );
  }

  function exportMetrics(format: "json" | "csv", mode: "download" | "copy", rows: Record<string, unknown>[]) {
    const content = format === "json" ? prettyJson(rows) : rowsToCsv(rows);
    if (mode === "copy") {
      navigator.clipboard.writeText(content);
      setNotice(`Copied metrics as ${format.toUpperCase()}.`);
      setMetricExportMenuOpen(false);
      return;
    }
    downloadText(`metrics-${metricMonthLabel().toLowerCase().replace(/\s+/g, "-")}.${format}`, content, format === "json" ? "application/json" : "text/csv");
    setMetricExportMenuOpen(false);
  }

  function renderMetricChartCard(
    title: string,
    value: number,
    series: Array<{ day: number; value: number }>,
    variant: "bars" | "line",
    exportPayload: Record<string, unknown>,
    tokenSeries?: Array<{ label: string; color: string; values: Array<{ day: number; value: number }> }>
  ) {
    const hasData = series.some((point) => point.value > 0);
    const max = Math.max(1, ...series.map((point) => point.value), ...(tokenSeries || []).flatMap((item) => item.values.map((point) => point.value)));
    const yMax = max <= 4 ? 4 : max <= 16 ? 16 : max <= 60000 ? 60000 : Math.ceil(max / 1000) * 1000;
    const tickValues = yMax === 60000 ? [60000, 45000, 30000, 15000, 0] : [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];
    const chart = { x: 42, y: 44, width: 298, height: 166 };
    const xFor = (day: number) => chart.x + ((day - 1) / Math.max(1, series.length - 1)) * chart.width;
    const yFor = (metric: number) => chart.y + chart.height - (Math.min(metric, yMax) / yMax) * chart.height;
    const linePoints = series.map((point) => `${xFor(point.day)},${yFor(point.value)}`).join(" ");
    const activePoint = [...series].reverse().find((point) => point.value > 0) || series[series.length - 1];
    const tooltipDate = activePoint ? new Date(metricMonthBounds(metricMonthOffset).start.getFullYear(), metricMonthBounds(metricMonthOffset).start.getMonth(), activePoint.day) : null;
    const tooltipLabel = tooltipDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(tooltipDate).toUpperCase() : metricMonthLabel().toUpperCase();

    return (
      <article key={title} className={`metric-chart-card ${hasData ? "" : "empty"}`}>
        <header>
          <h2>{title}</h2>
          <div>
            <strong>{hasData ? formatMetricNumber(value) : "-"}</strong>
            <button type="button" title={`Export ${title}`} onClick={() => downloadText(`metric-${title.toLowerCase().replace(/\s+/g, "-")}.json`, prettyJson(exportPayload), "application/json")} disabled={!hasData}>
              <Upload size={22} />
            </button>
          </div>
        </header>
        <div className="metric-plot">
          {hasData ? (
            <>
              <svg viewBox="0 0 372 236" role="img" aria-label={`${title} metrics`}>
                {tickValues.map((tick) => (
                  <text key={tick} x="4" y={yFor(tick) + 6}>{formatMetricNumber(tick)}</text>
                ))}
                {[1, 8, 15, 22, 29].filter((day) => day <= series.length).map((day) => (
                  <text key={day} x={xFor(day)} y="232" textAnchor="middle">{day}</text>
                ))}
                <line x1={chart.x} x2={chart.x + chart.width} y1={yFor(0)} y2={yFor(0)} className="metric-baseline" />
                {variant === "bars" ? (
                  tokenSeries ? tokenSeries.flatMap((item, itemIndex) => item.values.filter((point) => point.value > 0).map((point) => (
                    <rect
                      key={`${item.label}-${point.day}`}
                      x={xFor(point.day) - 12 + itemIndex * 10}
                      y={yFor(point.value)}
                      width="8"
                      height={Math.max(2, yFor(0) - yFor(point.value))}
                      rx="1"
                      style={{ fill: item.color }}
                    />
                  ))) : series.filter((point) => point.value > 0).map((point) => (
                    <rect key={point.day} x={xFor(point.day) - 5} y={yFor(point.value)} width="10" height={Math.max(2, yFor(0) - yFor(point.value))} rx="1" />
                  ))
                ) : (
                  <>
                    <polyline points={linePoints} />
                    {activePoint && <circle cx={xFor(activePoint.day)} cy={yFor(activePoint.value)} r="5" />}
                  </>
                )}
              </svg>
              <div className="metric-tooltip" style={{ left: `${Math.min(74, Math.max(24, ((xFor(activePoint?.day || 1) / 372) * 100) - 22))}%` }}>
                <span>{tooltipLabel}</span>
                {(tokenSeries || [{ label: title.toUpperCase().replace(/\s+/g, "_"), color: "var(--accent)", values: series }]).map((item) => {
                  const pointValue = item.values.find((point) => point.day === activePoint?.day)?.value || 0;
                  return (
                    <p key={item.label}><i style={{ background: item.color }} /> <strong>{formatMetricNumber(pointValue)}</strong> <em>{item.label}</em></p>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="metric-no-data">NO DATA AVAILABLE YET</div>
          )}
        </div>
      </article>
    );
  }

  function renderModelRunsCard(rows: Record<string, unknown>[]) {
    const models = metricModelRows(rows);
    const total = models.reduce((sum, item) => sum + item.count, 0);
    const primary = models[0];
    const percent = total > 0 && primary ? Math.round((primary.count / total) * 100) : 0;
    const dash = `${Math.max(0, Math.min(100, percent)) * 2.51} 251`;
    return (
      <article className={`metric-chart-card model-runs ${total ? "" : "empty"}`}>
        <header>
          <h2>Model runs</h2>
          <div>
            <strong>{total || "-"}</strong>
            <button type="button" title="Export model runs" onClick={() => downloadText("metric-model-runs.json", prettyJson(models), "application/json")} disabled={!total}>
              <Upload size={22} />
            </button>
          </div>
        </header>
        <div className="metric-gauge">
          {total ? (
            <>
              <svg viewBox="0 0 260 150" role="img" aria-label="Model runs">
                <path d="M40 124 A90 90 0 0 1 220 124" />
                <path d="M40 124 A90 90 0 0 1 220 124" className="active" strokeDasharray={dash} />
              </svg>
              <div className="metric-gauge-center">
                <span>MODEL RUNS</span>
                <strong>{total}</strong>
              </div>
              {primary && (
                <div className="metric-model-legend">
                  <i />
                  <span>{primary.model_id}</span>
                  <FileJson size={18} />
                  <strong>{percent}%</strong>
                </div>
              )}
            </>
          ) : (
            <div className="metric-no-data">NO DATA AVAILABLE YET</div>
          )}
        </div>
      </article>
    );
  }

  function renderMetricsPage() {
    const card = endpointCards.find((item) => item.key === "metrics");
    const result = card ? endpointResults[card.title] : undefined;
    const allRows = flattenMetricRows(result);
    const rows = metricRowsForMonth(allRows, metricMonthOffset);
    const meta = moduleMeta("metrics", config);
    const { days } = metricMonthBounds(metricMonthOffset);
    const tokenSeries = [
      { label: "TOTAL", color: "#ffd2ca", values: metricSeries(rows, "total_tokens", days) },
      { label: "INPUT", color: "#ff9e8f", values: metricSeries(rows, "input_tokens", days) },
      { label: "OUTPUT", color: "#ff3d1f", values: metricSeries(rows, "output_tokens", days) }
    ];
    const cards = [
      { title: "Total tokens", key: "total_tokens", variant: "bars" as const, tokenSeries },
      { title: "Users", key: "users_count", variant: "bars" as const },
      { title: "Agent Runs", key: "agent_runs_count", variant: "line" as const },
      { title: "Agent Sessions", key: "agent_sessions_count", variant: "line" as const },
      { title: "Team Runs", key: "team_runs_count", variant: "line" as const },
      { title: "Team Sessions", key: "team_sessions_count", variant: "line" as const },
      { title: "Workflow Runs", key: "workflow_runs_count", variant: "line" as const },
      { title: "Workflow Sessions", key: "workflow_sessions_count", variant: "line" as const }
    ];

    return (
      <section className="metrics-page">
        <div className="metrics-head">
          <div className="metrics-meta">
            <label><span>Database</span><button type="button" onClick={() => showDetails("Database configuration", undefined, config?.raw)}>{meta.db}</button></label>
            <b>/</b>
            <label><span>Table</span><button type="button" onClick={() => showDetails(`${meta.table} source`, undefined, { endpoint: endpointForCard(card || endpointCards[0]), table: meta.table })}>{meta.table}</button></label>
          </div>
          <div className="metrics-actions">
            <div className="metrics-export-menu">
              <button type="button" className="metrics-export-button" disabled={!rows.length} onClick={() => setMetricExportMenuOpen((current) => !current)}>
                <Upload size={22} /> EXPORT
              </button>
              {metricExportMenuOpen && (
                <div className="metrics-export-dropdown">
                  <strong>DOWNLOAD AS</strong>
                  <button type="button" onClick={() => exportMetrics("csv", "download", rows)}><FileText size={22} /> CSV</button>
                  <button type="button" onClick={() => exportMetrics("json", "download", rows)}><FileJson size={22} /> JSON</button>
                  <hr />
                  <strong>COPY AS</strong>
                  <button type="button" onClick={() => exportMetrics("csv", "copy", rows)}><FileText size={22} /> CSV</button>
                  <button type="button" onClick={() => exportMetrics("json", "copy", rows)}><FileJson size={22} /> JSON</button>
                </div>
              )}
            </div>
            <div className="metrics-month-control">
              <button type="button" aria-label="Previous month" onClick={() => { setMetricExportMenuOpen(false); setMetricMonthOffset((current) => current - 1); }}><ChevronDown size={20} /></button>
              <button type="button" onClick={() => setMetricMonthOffset(0)}>{metricMonthLabel().toUpperCase()}</button>
              <button type="button" aria-label="Next month" onClick={() => { setMetricExportMenuOpen(false); setMetricMonthOffset((current) => current + 1); }}><ChevronDown size={20} /></button>
            </div>
          </div>
        </div>
        <div className="metrics-dashboard-grid">
          {cards.map((item) => renderMetricChartCard(
            item.title,
            metricSum(rows, item.key),
            metricSeries(rows, item.key, days),
            item.variant,
            { title: item.title, month: metricMonthLabel(), rows, series: metricSeries(rows, item.key, days) },
            item.tokenSeries
          ))}
          {renderModelRunsCard(rows)}
        </div>
      </section>
    );
  }

  function renderSessionDetailPanel(rows: Record<string, unknown>[]) {
    if (!sessionDetail) return null;
    const history = messagesFromHistory(sessionDetail.chat_history);
    const metrics = sessionDetail.metrics && typeof sessionDetail.metrics === "object" ? sessionDetail.metrics as Record<string, unknown> : {};
    const agentData = sessionDetail.agent_data && typeof sessionDetail.agent_data === "object" ? sessionDetail.agent_data as Record<string, unknown> : {};
    const model = agentData.model && typeof agentData.model === "object" ? agentData.model as Record<string, unknown> : {};
    const modelFromMetrics = metrics.details && typeof metrics.details === "object"
      ? (((metrics.details as Record<string, unknown>).model as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined)
      : undefined;
    const detailModel = modelLabel(modelFromMetrics || model);
    const provider = compactValue(model.provider || modelFromMetrics?.provider);
    const runNumber = history.length > 0 ? 1 : 0;
    const title = sessionTitle(sessionDetail);
    const panel = (
      <aside className={expandedSessionDetail ? "session-detail-panel expanded" : "session-detail-panel"}>
        <header>
          <div className="session-detail-title">
            <ScanLine size={18} />
            <h2>{title}</h2>
          </div>
          <div className="session-detail-window-actions">
            {expandedSessionDetail && (
              <>
                <button type="button" title="Move up"><ChevronUp size={15} /></button>
                <button type="button" title="Move down"><ChevronDown size={15} /></button>
              </>
            )}
            <button type="button" title="Close" onClick={() => {
              setSessionDetail(null);
              setActiveSessionId(null);
              setExpandedSessionDetail(false);
            }}>
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="session-detail-tabs">
          {(["runs", "summary", "metrics", "details"] as SessionDetailTab[]).map((tab) => (
            <button key={tab} type="button" className={sessionDetailTab === tab ? "active" : ""} onClick={() => setSessionDetailTab(tab)}>
              {tab.toUpperCase()}
            </button>
          ))}
          <div className="session-detail-export">
            <button type="button" title="Export detail" onClick={() => setSessionExportMenu((current) => current === "detail" ? null : "detail")}>
              <FileText size={16} />
            </button>
            {sessionExportMenu === "detail" && (
              <div className="session-dropdown detail-export-menu">
                <strong>DOWNLOAD AS</strong>
                <button type="button" onClick={() => exportSessionDetail("json", "download")}><FileText size={15} /> JSON</button>
                <hr />
                <strong>COPY AS</strong>
                <button type="button" onClick={() => exportSessionDetail("json", "copy")}><FileText size={15} /> JSON</button>
              </div>
            )}
          </div>
        </div>
        <div className="session-detail-body">
          {sessionDetailLoading ? (
            <div className="inspector-empty">Loading session details...</div>
          ) : sessionDetailTab === "runs" ? (
            <div className="session-runs">
              <div className="run-header">
                <span>{runNumber}</span>
                <strong>Run</strong>
                <label className="run-details-switch">
                  <span>Show Details</span>
                  <input type="checkbox" checked={showRunDetails} onChange={(event) => setShowRunDetails(event.target.checked)} />
                  <i aria-hidden="true" />
                </label>
                <div className="segmented">
                  <button type="button" className={sessionTextMode === "formatted" ? "active" : ""} onClick={() => setSessionTextMode("formatted")}>FORMATTED</button>
                  <button type="button" className={sessionTextMode === "text" ? "active" : ""} onClick={() => setSessionTextMode("text")}>TEXT</button>
                </div>
              </div>
              {history.map((message) => (
                <article key={message.id} className={`session-run-message ${message.role}`}>
                  <div className="session-run-avatar">{message.role === "assistant" ? <ScanLine size={17} /> : <User size={17} />}</div>
                  <div>
                    <div className="session-run-meta">
                      <strong>{message.role === "assistant" ? "AGENT" : "USER"}</strong>
                      <span>{formatCell(pick(sessionDetail, ["updated_at", "created_at"]))}</span>
                    </div>
                    {sessionTextMode === "formatted" && message.role === "assistant" ? (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {showRunDetails && (
                      <pre>{prettyJson({ id: message.id, role: message.role })}</pre>
                    )}
                    <button type="button" className="show-more-button" onClick={() => navigator.clipboard.writeText(message.content)}>
                      COPY
                      <Copy size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : sessionDetailTab === "summary" ? (
            <div className="summary-empty">
              <div className="memory-orbit"><Bot size={22} /><Activity size={18} /></div>
              <h3>No summary available</h3>
              <p>To enable session summaries, set enable_session_summaries=True on the Agent</p>
              <a href="https://docs.agno.com/agents/session-summaries" target="_blank" rel="noreferrer">LEARN MORE</a>
            </div>
          ) : sessionDetailTab === "metrics" ? (
            <div className="session-metrics-grid">
              {([
                ["Input tokens", metrics.input_tokens],
                ["Output tokens", metrics.output_tokens],
                ["Total tokens", metrics.total_tokens || sessionDetail.total_tokens],
                ["Model", detailModel]
              ] as Array<[string, unknown]>).map(([label, value]) => (
                <div key={label} className="session-metric-tile">
                  <span>{label}</span>
                  <strong>{formatCell(value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="session-details-view">
              <section>
                <h3><ChevronDown size={15} /> AGENT</h3>
                <p><Bot size={20} /> {compactValue(agentData.name || sessionDetail.agent_id)}</p>
              </section>
              <section>
                <h3><ChevronDown size={15} /> MODEL DETAILS</h3>
                <div className="detail-grid three">
                  <label><span>MODEL</span><strong>{compactValue(model.name || "OpenAIResponses")}</strong></label>
                  <label><span>ID</span><strong>{detailModel}</strong></label>
                  <label><span>PROVIDER</span><strong>{provider}</strong></label>
                </div>
              </section>
              <section>
                <h3><ChevronDown size={15} /> IDENTIFIERS</h3>
                <div className="detail-grid two">
                  <label><span>SESSION ID</span><strong>{rowIdentifier("sessions", sessionDetail)}</strong></label>
                  <label><span>USER ID</span><strong>{compactValue(sessionDetail.user_id)}</strong></label>
                </div>
              </section>
              <section>
                <h3><ChevronDown size={15} /> DATE</h3>
                <div className="detail-grid two">
                  <label><span>CREATED AT</span><strong>{formatCell(sessionDetail.created_at)}</strong></label>
                  <label><span>LAST UPDATED</span><strong>{formatCell(sessionDetail.updated_at)}</strong></label>
                </div>
              </section>
            </div>
          )}
        </div>
        <footer>
          <button type="button" onClick={() => deleteSession(rowIdentifier("sessions", sessionDetail))}>DELETE</button>
          <button type="button" onClick={() => setExpandedSessionDetail((current) => !current)}>{expandedSessionDetail ? "MINIMIZE" : "EXPAND"}</button>
          <span />
          <button type="button" onClick={() => setSessionDetail(null)}>{expandedSessionDetail ? "CANCEL" : "CLOSE"}</button>
          <button type="button" disabled>SAVE</button>
        </footer>
      </aside>
    );
    if (!expandedSessionDetail) return panel;
    return (
      <div className="expanded-session-backdrop">
        {panel}
      </div>
    );
  }

  function renderSessionsPage() {
    const card = endpointCards.find((item) => item.key === "sessions");
    const result = card ? endpointResults[card.title] : undefined;
    const rows = filteredRows("sessions", rowsFromResult(result));
    const meta = moduleMeta("sessions", config);
    const allSelected = rows.length > 0 && rows.every((row) => selectedSessionIds.has(rowIdentifier("sessions", row)));
    const detailOpen = Boolean(sessionDetail);
    return (
      <section className={`sessions-page ${detailOpen ? "with-detail" : ""}`}>
        <div className="sessions-meta">
          <label>
            <span>Database</span>
            <button type="button" onClick={() => showDetails("Database configuration", undefined, config?.raw)}>{meta.db}</button>
          </label>
          <span>/</span>
          <label>
            <span>Table</span>
            <button type="button" onClick={() => showDetails("agno_sessions source", undefined, { endpoint: card ? endpointForCard(card) : "/sessions", table: "agno_sessions" })}>agno_sessions</button>
          </label>
          <div className="session-menu-wrap">
            <button className="view-filter-button" type="button" onClick={() => {
              setSessionExportMenu(null);
              setSessionViewMenuOpen((current) => !current);
            }}>
              View: {titleCaseFilter(viewFilter)}
              <ChevronDown size={14} />
            </button>
            {sessionViewMenuOpen && (
              <div className="session-dropdown view-menu">
                {[
                  ["all", "All"],
                  ["agent", "Agents"],
                  ["team", "Teams"],
                  ["workflow", "Workflows"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPageNumber(1);
                      setViewFilter(value);
                      setSessionViewMenuOpen(false);
                    }}
                  >
                    <span className={`radio-dot ${viewFilter === value ? "active" : ""}`} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sessions-table-shell">
          <div className="sessions-table-toolbar">
            <div className="session-menu-wrap">
              <button type="button" onClick={() => {
                setSessionViewMenuOpen(false);
                setSessionExportMenu((current) => current === "table" ? null : "table");
              }}>
                <FileText size={15} />
                EXPORT
              </button>
              {sessionExportMenu === "table" && (
                <div className="session-dropdown export-menu">
                  <strong>DOWNLOAD AS</strong>
                  <button type="button" onClick={() => exportSessionRows("csv", "download", rows)}><FileText size={15} /> CSV</button>
                  <button type="button" onClick={() => exportSessionRows("json", "download", rows)}><FileText size={15} /> JSON</button>
                  <hr />
                  <strong>COPY AS</strong>
                  <button type="button" onClick={() => exportSessionRows("csv", "copy", rows)}><FileText size={15} /> CSV</button>
                  <button type="button" onClick={() => exportSessionRows("json", "copy", rows)}><FileText size={15} /> JSON</button>
                </div>
              )}
            </div>
          </div>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => {
                      setSelectedSessionIds(event.target.checked ? new Set(rows.map((row) => rowIdentifier("sessions", row)).filter((id) => id !== "-")) : new Set());
                    }}
                    aria-label="Select all sessions"
                  />
                </th>
                <th>SESSION NAME</th>
                <th>
                  UPDATED AT
                  <button type="button" onClick={() => setSortNewestFirst((current) => !current)}>
                    ↓
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = rowIdentifier("sessions", row);
                return (
                  <tr key={`${id}-${index}`} className={activeSessionId === id ? "active-session-row" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.has(id)}
                        onChange={(event) => {
                          setSelectedSessionIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${sessionTitle(row)}`}
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => {
                        setSessionExportMenu(null);
                        setSessionViewMenuOpen(false);
                        openSessionDetail(row);
                      }}>{sessionTitle(row)}</button>
                    </td>
                    <td>{sessionUpdatedAt(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="inspector-empty">No sessions found.</div>
          )}
        </div>
        {sessionDetail && renderSessionDetailPanel(rows)}
        {selectedSessionIds.size > 0 && (
          <div className="bulk-action-bar">
            <strong>{selectedSessionIds.size} of {rows.length} items selected</strong>
            <button type="button" onClick={() => setSelectedSessionIds(new Set())}>CLEAR SELECTION</button>
            <button type="button" className="danger" onClick={deleteSelectedSessions}>DELETE SELECTED</button>
          </div>
        )}
      </section>
    );
  }

  function addFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;
    setFiles((current) => [...current, ...nextFiles]);
    setAttachments((current) => [...current, ...nextFiles.map(attachmentFromFile)]);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedFiles = Array.from(event.clipboardData.files || []);
    if (pastedFiles.length > 0) {
      event.preventDefault();
      addFiles(pastedFiles);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const removed = current[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
      return current.filter((item) => item.id !== id);
    });
  }

  function chooseTarget(nextTarget: RunTarget) {
    setTarget(nextTarget);
    setNav("chat");
    startNewSession();
  }

  function startNewSession() {
    sessionId.current = `primeagent-ui-${createId()}`;
    setMessages([]);
    setInput("");
    setFiles([]);
    setAttachments((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setCurrentRunId(null);
    setNotice("New AgentOS session started.");
  }

  function transcriptText() {
    return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  }

  async function cancelRun() {
    if (!target || !currentRunId) return;
    const plural = target.type === "agent" ? "agents" : target.type === "team" ? "teams" : "workflows";
    await nativeAction(`/${plural}/${encodeURIComponent(target.id)}/runs/${encodeURIComponent(currentRunId)}/cancel`, "POST", "Run cancel requested.");
    setRunning(false);
  }

  function nativeModuleActions(module: NavKey) {
    if (module === "sessions") {
      return (
        <>
          <button type="button" onClick={() => showDetails("AgentOS agents", "/agents")}>AGENTS API</button>
          <button type="button" onClick={() => showDetails("AgentOS teams", "/teams")}>TEAMS API</button>
          <button type="button" onClick={() => showDetails("AgentOS workflows", "/workflows")}>WORKFLOWS API</button>
        </>
      );
    }
    if (module === "traces") {
      return (
        <>
          <button type="button" onClick={() => showDetails("Trace filter schema", "/traces/filter-schema")}>FILTER SCHEMA</button>
          <button type="button" onClick={() => showDetails("Trace session stats", "/trace_session_stats")}>SESSION STATS</button>
        </>
      );
    }
    if (module === "memory") {
      const optimizePayload = memoryOptimizeModel
        ? { user_id: userId, apply: false, model: memoryOptimizeModel }
        : { user_id: userId, apply: false };
      return (
        <>
          <button type="button" onClick={() => showDetails("Memory topics", "/memory_topics")}>TOPICS</button>
          <button type="button" onClick={() => showDetails("User memory stats", "/user_memory_stats")}>USER STATS</button>
          <button type="button" onClick={() => showJsonAction("Optimize memories preview", "/optimize-memories", optimizePayload)}>OPTIMIZE PREVIEW</button>
        </>
      );
    }
    if (module === "knowledge") {
      return (
        <>
          <button type="button" onClick={() => showDetails("Knowledge config", "/knowledge/config")}>CONFIG</button>
          <button type="button" onClick={() => showJsonAction("Knowledge search", "/knowledge/search", { query: "AgentOS", max_results: 5 })}>SEARCH SAMPLE</button>
        </>
      );
    }
    if (module === "metrics") {
      return <button type="button" onClick={() => showJsonAction("Refresh metrics", "/metrics/refresh", {})}>REFRESH METRICS</button>;
    }
    return null;
  }

  async function submit(messageOverride?: string) {
    const prompt = (messageOverride ?? input).trim();
    if ((!prompt && attachments.length === 0) || !target || running) return;
    const filesForRun = files;
    const attachmentsForMessage = attachments;
    const userContent = prompt || "Please process the uploaded attachments.";

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: userContent,
      attachments: attachmentsForMessage
    };
    const assistantId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      events: []
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setFiles([]);
    setAttachments([]);
    setRunning(true);
    setCurrentRunId(null);
    setError(null);

    try {
      await runAgnoTarget({
        target,
        message: userContent,
        files: filesForRun,
        sessionId: sessionId.current,
        userId,
        onEvent: (event) => {
          const runId = event.data.run_id || event.data.runId || event.data.id;
          if (typeof runId === "string") setCurrentRunId(runId);
          const content = extractContent(event);
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: message.content + content,
                    events: [...(message.events || []), event]
                  }
                : message
            )
          );
        }
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(detail);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: message.content || `Request failed: ${detail}`
              }
            : message
        )
      );
    } finally {
      setRunning(false);
      setCurrentRunId(null);
    }
  }

  return (
    <main className={`os-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="os-sidebar">
        <div className="sidebar-account-row">
          <button className="account-switcher" type="button" title="Account and plan" onClick={showAgentOSStatus}>
            <span className="avatar">S</span>
            <span className="account-text">
              <strong>ske</strong>
              <small>Free</small>
            </span>
            <ChevronDown className="account-chevron" size={15} />
          </button>
          <button
            className="sidebar-collapse-button"
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <nav className="primary-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="nav-group">
                <button
                  className={`nav-item ${nav === item.key ? "active" : ""}`}
                  type="button"
                  onClick={() => { setNav(item.key); setPageNumber(1); }}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
                {item.key === "studio" && nav === "studio" && (
                  <div className="studio-links">
                    <button type="button" className={studioTab === "agent" ? "active-subnav" : ""} onClick={() => { setStudioTab("agent"); setNav("studio"); setPageNumber(1); }}>Agents</button>
                    <button type="button" className={studioTab === "team" ? "active-subnav" : ""} onClick={() => { setStudioTab("team"); setNav("studio"); setPageNumber(1); }}>Teams</button>
                    <button type="button" className={studioTab === "workflow" ? "active-subnav" : ""} onClick={() => { setStudioTab("workflow"); setNav("studio"); setPageNumber(1); }}>Workflows</button>
                    <button type="button" className={studioTab === "registry" ? "active-subnav" : ""} onClick={() => { setStudioTab("registry"); setNav("studio"); setPageNumber(1); }}>Registry</button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="settings-block">
          <button
            className={`nav-item ${nav === "settings" ? "active" : ""}`}
            type="button"
            onClick={() => setNav("settings")}
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
          {nav === "settings" && <div className="settings-links">
            <button type="button" onClick={() => { setSettingsTab("profile"); setNav("settings"); }}>Profile</button>
            <button type="button" onClick={() => { setSettingsTab("organization"); setNav("settings"); }}>Organization</button>
            <button type="button" onClick={() => { setSettingsTab("os"); setNav("settings"); }}>OS & Security</button>
            <button type="button" onClick={() => { setSettingsTab("roles"); setNav("settings"); }}>Roles</button>
            <button type="button" onClick={() => { setSettingsTab("billing"); setNav("settings"); }}>Billing</button>
          </div>}
        </div>

        <div className="sidebar-footer">
          <a href="https://docs.agno.com" target="_blank" rel="noreferrer" title="Agno docs">
            <BookOpen size={16} />
          </a>
          <a href="https://discord.gg/4MtYHHrgA8" target="_blank" rel="noreferrer" title="Agno Discord">
            <Activity size={16} />
          </a>
          <a href="https://github.com/agno-agi/agno" target="_blank" rel="noreferrer" title="Agno GitHub">
            <Github size={16} />
          </a>
        </div>
        <div className="sidebar-user">
          <span className="avatar">S</span>
          <span className="sidebar-user-text">
            <strong>ske</strong>
            <small>ske</small>
          </span>
          <button type="button" title="User menu" onClick={showAgentOSStatus}>
            <MoreVertical size={15} />
          </button>
        </div>
      </aside>

      <section className="os-frame">
        <header className="os-topbar">
          <div className="os-breadcrumb">
            <SquareTerminal size={18} />
            <button className="os-status-button" type="button" onClick={showAgentOSStatus}>
              <span>{osName}</span>
              <span className={`status-dot ${!error && !loading ? "ok" : ""}`} />
            </button>
            <span>/</span>
            <strong>{nav === "sessions" && sessionDetail ? "Sessions / Session Details" : navItems.find((item) => item.key === nav)?.label || "Settings"}</strong>
          </div>
          <div className="topbar-actions">
            <a className="support-button" href={`mailto:support@agno.com?subject=PrimeAgent%20AgentOS%20Support&body=${encodeURIComponent(`AgentOS: ${getAgentOSBaseUrl()}`)}`}>
              <Mail size={15} />
              GET SUPPORT
            </a>
            <button className="refresh-button" type="button" onClick={refreshCurrentView} disabled={loading}>
              <RefreshCw size={15} />
              REFRESH
            </button>
          </div>
        </header>

        {nav === "chat" ? (
          <section className={`chat-page ${chatInspector ? "with-inspector" : ""}`}>
            <header className="chat-header">
              <div className="target-breadcrumb">
                {target ? (
                  <>
                    <span className="target-type-icon">{target.type === "agent" ? "Agents" : target.type === "team" ? "Teams" : "Workflows"}</span>
                    <ChevronDown size={14} />
                    <span>/</span>
                    <button type="button" onClick={() => showDetails(`${selectedComponent?.name || target.id} config`, undefined, selectedComponent || target)}>
                      {selectedComponent?.name || target.id}
                    </button>
                    <ChevronDown size={14} />
                    {messages.length > 0 && (
                      <>
                        <span>/</span>
                        <span className="session-chip">{messages[0]?.content || "New session"}</span>
                        <button type="button" title="Session menu" onClick={() => showDetails("Current chat session", `/sessions/${encodeURIComponent(sessionId.current)}`, { session_id: sessionId.current })}>
                          <MoreVertical size={16} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <span>No runnable object discovered from /config</span>
                )}
              </div>
              <div className="chat-tools">
                <button type="button" className="chat-icon-tool" title="Memory" onClick={() => openChatInspector("memory")}>
                  <Keyboard size={16} />
                </button>
                <button type="button" className="chat-pill-tool" title="See config" onClick={() => openChatInspector("config")}>
                  SEE CONFIG
                </button>
                <button type="button" className="chat-pill-tool" title="Sessions" onClick={() => openChatInspector("sessions")}>
                  <History size={16} />
                  SESSIONS
                </button>
                <button type="button" title="New session" className="chat-pill-tool primary-icon-button" onClick={startNewSession} disabled={running}>
                  <Plus size={17} />
                  NEW SESSION
                </button>
                <button type="button" title="Copy AgentOS base URL" className="secondary-chat-tool" onClick={() => navigator.clipboard.writeText(getAgentOSBaseUrl())}>
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-chat-tool"
                  title="Copy transcript"
                  onClick={() => navigator.clipboard.writeText(transcriptText())}
                  disabled={messages.length === 0}
                >
                  <FileText size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-chat-tool"
                  title="View AgentOS session"
                  onClick={() => showDetails("Current session", `/sessions/${encodeURIComponent(sessionId.current)}`, { session_id: sessionId.current })}
                  disabled={messages.length === 0}
                >
                  <Database size={16} />
                </button>
                {running && currentRunId && (
                  <button type="button" title="Cancel current run" onClick={cancelRun}>
                    <X size={16} />
                  </button>
                )}
                <button type="button" title="New local chat" className="secondary-chat-tool" onClick={startNewSession} disabled={running}>
                  <Trash2 size={16} />
                </button>
              </div>
            </header>

            <div className="chat-body">
              <div className="conversation" ref={messagesRef}>
                {error && <div className="inline-error">Request failed: {error}</div>}
                {messages.length === 0 && !error && (
                  <div className="start-state">
                    <Bot size={24} />
                    <h2>New Session</h2>
                    <p>Enter your input to get started with your agent.</p>
                    {quickPrompts.length > 0 && (
                      <div className="quick-prompts">
                        {quickPrompts.map((prompt) => (
                          <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={!target || running}>
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {messages.map((message) => (
                  <article key={message.id} className={`chat-message ${message.role}`}>
                    <div className="message-avatar">{message.role === "user" ? "你" : <Bot size={16} />}</div>
                    <div className="message-content">
                      {message.role === "assistant" ? (
                        <>
                          <div className="run-status">
                            <ChevronDown size={14} />
                            {running && !message.content ? "Working..." : "Run"}
                          </div>
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                              {message.content || (running ? "Running..." : "")}
                            </ReactMarkdown>
                          </div>
                        </>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="message-attachment">
                              {attachment.previewUrl ? <img src={attachment.previewUrl} alt={attachment.name} /> : <FileText size={16} />}
                              <span>{attachment.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {message.events && message.events.length > 0 && (
                        <div className="event-strip">
                          {Array.from(new Set(message.events.slice(-8).map((event) => event.event))).map((eventName) => (
                            <span key={eventName}>{eventName}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="composer">
              {attachments.length > 0 && (
                <div className="attachment-tray">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="attachment-chip">
                      {attachment.previewUrl ? <img src={attachment.previewUrl} alt={attachment.name} /> : <FileText size={16} />}
                      <span>{attachment.name}</span>
                      <small>{formatBytes(attachment.size)}</small>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} title="Remove attachment">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="composer-inner">
                <input
                  ref={fileInputRef}
                  className="hidden-file-input"
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,.pdf,.txt,.md,.csv,.json,.docx,.html,.css,.js,.ts,.py,.xml,.rtf"
                  onChange={handleFileInput}
                />
                <textarea
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onPaste={handlePaste}
                  placeholder="Ask anything..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                />
                <div className="composer-actions">
                  <div className="composer-left-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach files" disabled={running}>
                      <Paperclip size={18} />
                    </button>
                    <button type="button" title="Input options" onClick={() => showDetails("Input options", undefined, { files: "Images, documents and data files are sent to AgentOS as multipart files.", enter: "Press Enter to send." })}>
                      <SlidersHorizontal size={17} />
                    </button>
                  </div>
                  <div className="composer-right-actions">
                    <button type="button" className="model-chip" title="Current AgentOS target" onClick={() => showDetails(`${selectedComponent?.name || target?.id || "Target"} config`, undefined, selectedComponent || target)}>
                      {(selectedComponent?.name || target?.id || "AGENT").toUpperCase()}
                      <Settings size={13} />
                    </button>
                    <button
                      className="send-button"
                      type="button"
                      onClick={() => submit()}
                      disabled={!target || (!input.trim() && attachments.length === 0) || running}
                      title="Send"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="composer-note">
                <ImageIcon size={14} />
                Paste images, attach files, press Enter to send.
              </div>
            </footer>
            {renderChatInspector()}
          </section>
        ) : (
          <section className="console-page">
            {notice && (
              <div className="notice-bar">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice(null)}>Dismiss</button>
              </div>
            )}
            {nav === "home" ? (
              <div className="overview-grid">
                <div className="overview-card wide">
                  <h2>AgentOS</h2>
                  <p>PrimeAgent mirrors the official Agno OS shell but reads directly from the local AgentOS running on port 8000.</p>
                  <div className="endpoint-line">
                    <Code2 size={15} />
                    {getAgentOSBaseUrl()}
                  </div>
                </div>
                <div className="official-module wide">
                  <div className="module-controls">
                    <h2>Agents</h2>
                    <button type="button" onClick={() => showDetails("AgentOS /config", undefined, config?.raw)}>CONFIG</button>
                  </div>
                  <div className="studio-cards">
                    {agents.map((agent) => (
                      <article key={agent.id} className="studio-card">
                        <h3>{agent.name || agent.id}</h3>
                        <span>{targetMeta(agent) || "Native AgentOS agent from /config"}</span>
                        <div>
                          <button type="button" onClick={() => chooseTarget({ type: "agent", id: agent.id })}>CHAT</button>
                          <button type="button" onClick={() => showDetails(`${agent.name || agent.id} config`, `/agents/${encodeURIComponent(agent.id)}`, agent)}>CONFIG</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="official-module wide">
                  <div className="module-controls">
                    <h2>All OSes</h2>
                    <button type="button" onClick={() => showDetails("All local AgentOS instances", undefined, { current: "agent-platform", base_url: getAgentOSBaseUrl(), config: config?.raw })}>ALL OSES</button>
                    <button type="button" onClick={() => setNav("settings")}>EDIT</button>
                    <button type="button" onClick={() => showDetails("Delete AgentOS", undefined, { available: false, reason: "Local AgentOS does not expose a DELETE /os endpoint. Containers remain controlled by docker compose." })}>DELETE</button>
                    <button type="button" onClick={() => setNav("chat")}>SWITCH TO OS</button>
                  </div>
                </div>
                <div className="overview-card">
                  <strong>{agents.length}</strong>
                  <span>Agents</span>
                </div>
                <div className="overview-card">
                  <strong>{teams.length}</strong>
                  <span>Teams</span>
                </div>
                <div className="overview-card">
                  <strong>{workflows.length}</strong>
                  <span>Workflows</span>
                </div>
                <div className="json-card">
                  <h3>/config</h3>
                  <pre>{config ? prettyJson(config.raw) : "Loading..."}</pre>
                </div>
              </div>
            ) : nav === "settings" ? (
              <div className="settings-page">
                <section className="official-module">
                  <div className="module-controls">
                    <h2>{settingsTab === "os" ? "OS & Security" : settingsTab[0].toUpperCase() + settingsTab.slice(1)}</h2>
                    <button type="button" onClick={() => showDetails("AgentOS /info", "/info")}>LOAD /info</button>
                    <button type="button" onClick={() => showDetails("AgentOS /models", "/models")}>LOAD /models</button>
                    <button type="button" onClick={() => showDetails("AgentOS /config", undefined, config?.raw)}>VIEW /config</button>
                  </div>
                  {settingsTab === "os" ? (
                    <div className="settings-form">
                      <label>
                        <span>AgentOS Name</span>
                        <input readOnly value={String((config?.raw.name as string | undefined) || "agent-platform")} placeholder="Your AgentOS name" />
                      </label>
                      <label>
                        <span>AgentOS ID</span>
                        <input readOnly value={String((config?.raw.id as string | undefined) || "local-agentos")} placeholder="No value available" />
                      </label>
                      <label>
                        <span>Endpoint URL</span>
                        <div className="inline-fields">
                          <select value={getAgentOSBaseUrl().startsWith("https") ? "https://" : "http://"} onChange={() => undefined} aria-label="Protocol">
                            <option>http://</option>
                            <option>https://</option>
                          </select>
                          <input readOnly value={getAgentOSBaseUrl().replace(/^https?:\/\//, "")} placeholder="localhost:8000" />
                        </div>
                      </label>
                      <button type="button" onClick={() => navigator.clipboard.writeText(getAgentOSBaseUrl())}>COPY ENDPOINT</button>
                      <label>
                        <span>Security Key</span>
                        <input readOnly value="Set OS_SECURITY_KEY in your local environment when needed" placeholder="Set or generate a security key" />
                      </label>
                      <button type="button" onClick={() => showDetails("AgentOS security", undefined, { local: true, auth: "RUNTIME_ENV=dev disables cloud RBAC for this local AgentOS.", docs: "https://docs.agno.com/agent-os/security/overview" })}>LEARN MORE</button>
                      <label>
                        <span>Description</span>
                        <textarea readOnly value="Local PrimeAgent bridge connected to the native Agno AgentOS runtime." placeholder="Add a description for your AgentOS" />
                      </label>
                      <label>
                        <span>Tags</span>
                        <input readOnly value="local, primeagent, agentos" placeholder="Add tags to make your AgentOS easier to spot" />
                      </label>
                      <button type="button" disabled>ADD TAG</button>
                      <label>
                        <span>Custom Headers</span>
                        <input readOnly placeholder="Header name (e.g., X-Custom-Auth)" />
                        <input readOnly placeholder="Header value" />
                      </label>
                      <button type="button" disabled>ADD HEADER</button>
                      <label>
                        <span>Databases</span>
                        <input readOnly value={config?.databases.join(", ") || ""} />
                      </label>
                      <button type="button" onClick={() => showDetails("AgentOS databases", undefined, config?.databases)}>VIEW DATABASES</button>
                      <label>
                        <span>Token-Based Authorization (JWT)</span>
                        <input readOnly value="Local dev mode. Configure JWT_VERIFICATION_KEY in AgentOS for RBAC." />
                      </label>
                      <button type="button" onClick={() => showDetails("Save AgentOS settings", undefined, { saved: false, reason: "Local AgentOS settings are source-controlled in agent-platform/app/main.py and environment variables." })}>SAVE</button>
                      <button type="button" onClick={() => showDetails("Delete AgentOS", undefined, { available: false, reason: "Local AgentOS does not expose a DELETE /os endpoint. Use docker compose controls outside the UI." })}>DELETE AgentOS</button>
                    </div>
                  ) : (
                    <div className="official-empty">
                      <Settings size={22} />
                      <strong>{settingsTab} settings</strong>
                      <span>This local console exposes AgentOS runtime settings returned by native endpoints.</span>
                      <button type="button" onClick={() => showDetails(`${settingsTab} AgentOS view`, undefined, { tab: settingsTab, info: "Cloud account controls are not exposed by local AgentOS. Runtime data comes from /info, /models and /config." })}>VIEW LOCAL DATA</button>
                      <button type="button" onClick={() => openDocs("settings")}>LEARN MORE</button>
                    </div>
                  )}
                </section>
              </div>
            ) : nav === "sessions" ? (
              renderSessionsPage()
            ) : nav === "traces" ? (
              renderTracesPage()
            ) : (
              <div className="module-stack">
                {nav === "studio" ? (
                  <div className="studio-grid">
                    {studioTab === "agent" ? renderStudioAgentsPage() : studioTab === "team" ? renderStudioTeamsPage() : studioTab === "workflow" ? renderStudioWorkflowsPage() : studioTab === "registry" ? renderStudioRegistryPage() : grouped.filter((group) => group.type === studioTab).map((group) => (
                      <section key={group.type} className="studio-section">
                        <header>
                          <div>
                            <h2>{componentLabel(group.type)}</h2>
                            <p>Native {componentLabel(group.type).toLowerCase()} discovered from AgentOS /config.</p>
                          </div>
                          <div className="studio-header-actions">
                            <a className="action-link" href="mailto:support@agno.com">Contact us</a>
                            <button type="button" onClick={refreshCurrentView}>Refresh Page</button>
                          </div>
                        </header>
                        {group.items.length === 0 ? (
                          <div className="official-empty">
                            <Layers3 size={22} />
                            <strong>No {componentLabel(group.type).toLowerCase()} found</strong>
                            <span>Get started by creating a new {group.type} in AgentOS.</span>
                            <a className="action-link" href={`https://docs.agno.com/agent-os/studio/${componentLabel(group.type).toLowerCase()}`} target="_blank" rel="noreferrer">LEARN MORE</a>
                          </div>
                        ) : (
                          <div className="studio-cards">
                            {group.items.map((item) => (
                              <article key={`${group.type}-${item.id}`} className="studio-card">
                                <h3>{item.name || item.id}</h3>
                                <p>Description</p>
                                <span>{item.description || targetMeta(item) || "No description returned by /config"}</span>
                                <p>Current Version</p>
                                <strong>{compactValue(item.version || item.current_version || item.id)}</strong>
                                <div>
                                  <button type="button" onClick={() => chooseTarget({ type: group.type, id: item.id })}>CHAT</button>
                                  <button type="button" onClick={() => setModal({ kind: "edit-component", componentType: group.type, item, registered: componentIsRegistered(item.id) })}>
                                    EDIT
                                  </button>
                                  <button type="button" onClick={() => showDetails(`${item.name || item.id} configs`, componentIsRegistered(item.id) ? `/components/${encodeURIComponent(item.id)}/configs` : undefined, item)}>
                                    CONFIG
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                ) : nav === "metrics" ? (
                  renderMetricsPage()
                ) : nav === "approvals" ? (
                  <section className="official-module">
                    {(() => {
                      const card = endpointCards.find((item) => item.key === nav);
                      const result = card ? endpointResults[card.title] : undefined;
                      const rows = rowsFromResult(result);
                      return (
                        <>
                          <div className="module-controls">
                            <h2>Approvals</h2>
                            <label>
                              <span>View:</span>
                              <button type="button" onClick={() => setApprovalFilter((current) => (current === "all" ? "pending" : current === "pending" ? "resolved" : "all"))}>
                                {`View:${titleCaseFilter(approvalFilter)}`}
                              </button>
                            </label>
                            {card && <button type="button" onClick={() => loadEndpoint(card)}>REFRESH</button>}
                            <button type="button" onClick={() => showDetails("Approvals count", "/approvals/count")}>COUNT</button>
                            <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>Previous Page</button>
                            <button type="button" onClick={() => setPageNumber(1)}>Page {pageNumber}</button>
                            <button type="button" onClick={() => setPageNumber((current) => current + 1)}>Next Page</button>
                          </div>
                          {rows.filter((row) => {
                            if (approvalFilter === "all") return true;
                            const status = compactValue(pick(row, ["status", "state"])).toLowerCase();
                            if (approvalFilter === "pending") return !status || status === "-" || status.includes("pending") || status.includes("requested");
                            return status.includes("approved") || status.includes("rejected") || status.includes("resolved");
                          }).length === 0 ? (
                            <div className="official-empty">
                              <CheckSquare size={22} />
                              <strong>No approvals found</strong>
                              <span>Approvals will appear here when agents request them.</span>
                              <button type="button" onClick={() => openDocs("approvals")}>LEARN MORE</button>
                            </div>
                          ) : (
                            <div className="approval-list">
                              {rows.filter((row) => {
                                if (approvalFilter === "all") return true;
                                const status = compactValue(pick(row, ["status", "state"])).toLowerCase();
                                if (approvalFilter === "pending") return !status || status === "-" || status.includes("pending") || status.includes("requested");
                                return status.includes("approved") || status.includes("rejected") || status.includes("resolved");
                              }).map((row, index) => (
                                <article key={String(pick(row, ["approval_id", "id"]) || index)} className="approval-card">
                                  <h3>{formatCell(pick(row, ["tool_name", "name", "approval_id", "id"]))}</h3>
                                  <p>{formatCell(pick(row, ["agent_id", "team_id", "workflow_id", "component_name"]))}</p>
                                  <span>{formatCell(pick(row, ["created_at", "updated_at", "status"]))}</span>
                                  <code>{formatCell(pick(row, ["input", "arguments", "metadata", "request"]))}</code>
                                  <div>
                                    <button type="button" onClick={() => showDetails("Approval detail", `/approvals/${encodeURIComponent(compactValue(pick(row, ["approval_id", "id"])))}`, row)}>DETAIL</button>
                                    <button type="button" onClick={() => showDetails("Approval status", `/approvals/${encodeURIComponent(compactValue(pick(row, ["approval_id", "id"])))}/status`, row)}>STATUS</button>
                                    <button type="button" onClick={() => resolveApproval(row, "rejected")}>DENY</button>
                                    <button type="button" onClick={() => resolveApproval(row, "approved")}>APPROVE</button>
                                    <button type="button" onClick={() => {
                                      const id = compactValue(pick(row, ["approval_id", "id"]));
                                      if (id !== "-" && window.confirm(`Delete approval ${id}?`)) nativeAction(`/approvals/${encodeURIComponent(id)}`, "DELETE", "Approval deleted.");
                                    }}>DELETE</button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </section>
                ) : (
                  endpointCards
                    .filter((card) => card.key === nav)
                    .map((card) => {
                      const result = endpointResults[card.title];
                      const count = dataCount(result?.data);
                      const meta = moduleMeta(nav, config);
                      const { rows, columns } = tableForNav(nav, result);
                      return (
                        <section key={card.title} className="official-module">
                          <div className="module-controls">
                            <label>
                              <span>Database</span>
                              <button type="button" onClick={() => showDetails("Database configuration", undefined, config?.raw)}>{meta.db}</button>
                            </label>
                            <label>
                              <span>Table</span>
                              <button type="button" onClick={() => showDetails(`${meta.table} source`, undefined, { endpoint: endpointForCard(card), table: meta.table })}>{meta.table}</button>
                            </label>
                            {["sessions", "evaluation", "approvals"].includes(nav) && (
                              <label>
                                <span>View:</span>
                                <button
                                  type="button"
                                  onClick={() => { setPageNumber(1); setViewFilter((current) => (current === "all" ? "agent" : current === "agent" ? "team" : current === "team" ? "workflow" : "all")); }}
                                >
                                  {`View:${titleCaseFilter(viewFilter)}`}
                                </button>
                              </label>
                            )}
                            {["sessions", "memory", "knowledge", "evaluation", "scheduler"].includes(nav) && (
                              <button type="button" onClick={() => setSortNewestFirst((current) => !current)}>Updated at</button>
                            )}
                            <button type="button" onClick={() => exportResult(card.title, result)}>EXPORT</button>
                            {nativeModuleActions(nav)}
                            {["sessions", "memory", "knowledge", "evaluation", "scheduler"].includes(nav) && (
                              <>
                                <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>Previous Page</button>
                                <button type="button" onClick={() => setPageNumber(1)}>Page {pageNumber}</button>
                                <button type="button" onClick={() => setPageNumber((current) => current + 1)}>Next Page</button>
                                <button type="button" onClick={() => { setPageNumber(1); setPageLimit((current) => current === 20 ? 50 : current === 50 ? 100 : 20); }}>Limit {pageLimit}</button>
                              </>
                            )}
                            {nav === "memory" && <button type="button" onClick={() => setModal({ kind: "create-memory" })}>Create memory</button>}
                            {nav === "knowledge" && <button type="button" onClick={() => setModal({ kind: "upload-knowledge" })}>UPLOAD CONTENT</button>}
                            {nav === "scheduler" && <button type="button" onClick={() => setModal({ kind: "create-schedule" })}>CREATE SCHEDULE</button>}
                            {nav === "evaluation" && <button type="button" onClick={() => setModal({ kind: "run-eval" })}>Run Evaluation</button>}
                          </div>
                          <div className="endpoint-status">
                            <Circle size={10} className={result?.ok ? "ok" : ""} />
                            <span>{result ? `HTTP ${result.status}` : "Not loaded"}</span>
                            {count !== null && <span>{count} records</span>}
                            <span>
                              {card.method || "GET"} {card.endpoint}
                            </span>
                          </div>
                          {filteredRows(nav, rows).length === 0 ? (
                            <div className="official-empty">
                              <Database size={22} />
                              <strong>No {card.title.toLowerCase()} found</strong>
                              <span>{nav === "knowledge" && result?.status === 400 ? "No AgentOS knowledge instance is configured yet." : result?.ok === false ? result.text : "Data will appear here when AgentOS returns records."}</span>
                              <button type="button" onClick={() => openDocs(nav)}>LEARN MORE</button>
                            </div>
                          ) : (
                            <div className="official-table-wrap">
                              <table className="official-table">
                                <thead>
                                  <tr>
                                    {columns.map((column) => (
                                      <th key={column.label}>{column.label}</th>
                                    ))}
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredRows(nav, rows).map((row, index) => (
                                    <tr key={`${String(pick(row, ["id", "session_id", "trace_id", "memory_id", "content_id"]) || "row")}-${index}`}>
                                      {columns.map((column) => (
                                        <td key={column.label}>{formatCell(pick(row, column.keys))}</td>
                                      ))}
                                      <td className="row-actions">
                                        {rowDetailEndpoint(nav, row) && (
                                          <button type="button" onClick={() => showDetails(`${card.title} detail`, rowDetailEndpoint(nav, row) || undefined, row)}>DETAIL</button>
                                        )}
                                        {nav === "memory" && rowIdentifier(nav, row) !== "-" && (
                                          <button type="button" onClick={() => setModal({ kind: "edit-memory", row })}>EDIT</button>
                                        )}
                                        {nav === "evaluation" && rowIdentifier(nav, row) !== "-" && (
                                          <button type="button" onClick={() => setModal({
                                            kind: "rename",
                                            title: "Rename Evaluation",
                                            endpoint: `/eval-runs/${encodeURIComponent(rowIdentifier(nav, row))}`,
                                            field: "name",
                                            currentName: compactValue(pick(row, ["name", "eval_name", "evaluation_name", "id"])),
                                            method: "PATCH"
                                          })}>RENAME</button>
                                        )}
                                        {nav === "knowledge" && rowIdentifier(nav, row) !== "-" && (
                                          <button type="button" onClick={() => showDetails("Knowledge content status", `/knowledge/content/${encodeURIComponent(rowIdentifier(nav, row))}/status`, row)}>STATUS</button>
                                        )}
                                        {nav === "scheduler" && (
                                          <>
                                          <button type="button" onClick={() => showDetails("Schedule runs", `/schedules/${encodeURIComponent(rowIdentifier(nav, row))}/runs`, row)}>RUNS</button>
                                          <button type="button" onClick={() => setModal({ kind: "edit-schedule", row })}>EDIT</button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const id = compactValue(pick(row, ["schedule_id", "id"]));
                                              if (id !== "-") submitJsonAction(`/schedules/${encodeURIComponent(id)}/trigger`, {}, "Schedule triggered.");
                                            }}
                                          >
                                            TRIGGER
                                          </button>
                                          <button type="button" onClick={() => {
                                            const id = rowIdentifier(nav, row);
                                            const enabled = compactValue(pick(row, ["enabled", "is_enabled", "status"])).toLowerCase();
                                            if (id !== "-") nativeAction(`/schedules/${encodeURIComponent(id)}/${enabled.includes("false") || enabled.includes("disabled") ? "enable" : "disable"}`, "POST", "Schedule state updated.");
                                          }}>
                                            {(() => {
                                              const enabled = compactValue(pick(row, ["enabled", "is_enabled", "status"])).toLowerCase();
                                              return enabled.includes("false") || enabled.includes("disabled") ? "Enable schedule" : "Disable schedule";
                                            })()}
                                          </button>
                                          </>
                                        )}
                                        {deleteEndpoint(nav, row) && (
                                          <button type="button" onClick={() => {
                                            const endpoint = deleteEndpoint(nav, row);
                                            if (endpoint && window.confirm(`Delete ${rowIdentifier(nav, row)} from AgentOS?`)) nativeAction(endpoint, "DELETE", "Deleted.");
                                          }}>DELETE</button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <details className="raw-details">
                            <summary>Raw response</summary>
                            <pre>{result ? prettyJson(result.data ?? result.text) : "Loading..."}</pre>
                          </details>
                        </section>
                      );
                    })
                )}
              </div>
            )}
          </section>
        )}
      </section>
      {modal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-panel">
            <header>
              <h2>
                {modal.kind === "create-component"
                  ? `New ${modal.componentType}`
                  : modal.kind === "edit-component"
                    ? `Edit ${modal.componentType}`
                  : modal.kind === "create-memory"
                    ? "Create Memory"
                    : modal.kind === "edit-memory"
                      ? "Edit Memory"
                    : modal.kind === "rename"
                      ? modal.title
                    : modal.kind === "edit-schedule"
                      ? "Edit Schedule"
                  : modal.kind === "create-schedule"
                    ? "Create Schedule"
                    : modal.kind === "upload-knowledge"
                      ? "Upload Knowledge"
                      : modal.kind === "run-eval"
                        ? "Run Evaluation"
                        : modal.title}
              </h2>
              <button type="button" onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </header>

            {modal.kind === "details" ? (
              <div className="modal-body">
                {modal.endpoint && <p className="muted-line">{modal.endpoint}</p>}
                <pre>{prettyJson(modal.data)}</pre>
              </div>
            ) : modal.kind === "create-component" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  submitJsonAction(
                    "/components",
                    {
                      name: String(form.get("name") || ""),
                      component_id: String(form.get("component_id") || "") || null,
                      component_type: modal.componentType,
                      description: String(form.get("description") || "") || null,
                      stage: "draft",
                      set_current: true,
                      config: {}
                    },
                    `${modal.componentType} component created.`
                  );
                }}
              >
                <label>
                  <span>Name</span>
                  <input name="name" required placeholder={`${modal.componentType} name`} />
                </label>
                <label>
                  <span>ID</span>
                  <input name="component_id" placeholder="optional-id" />
                </label>
                <label>
                  <span>Description</span>
                  <textarea name="description" placeholder="Optional description" />
                </label>
                <button type="submit" disabled={modalBusy}>CREATE</button>
              </form>
            ) : modal.kind === "edit-component" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  let metadata: Record<string, unknown> | null = null;
                  try {
                    metadata = JSON.parse(String(form.get("metadata") || "{}")) as Record<string, unknown>;
                  } catch {
                    setNotice("Component metadata must be valid JSON.");
                    return;
                  }
                  const payload = {
                    name: String(form.get("name") || ""),
                    description: String(form.get("description") || "") || null,
                    component_type: modal.componentType,
                    metadata
                  };
                  if (modal.registered) {
                    nativeAction(`/components/${encodeURIComponent(modal.item.id)}`, "PATCH", "Component updated.", payload);
                  } else {
                    submitJsonAction(
                      "/components",
                      {
                        ...payload,
                        component_id: modal.item.id,
                        config: modal.item,
                        label: "runtime-import",
                        stage: "draft",
                        notes: "Registered from AgentOS /config runtime object.",
                        set_current: true
                      },
                      "Runtime object registered as AgentOS component."
                    );
                  }
                  setModal(null);
                }}
              >
                {!modal.registered && (
                  <div className="inline-error">
                    This runtime object is not in /components yet. Saving will register it as a draft AgentOS component with the same id.
                  </div>
                )}
                <label><span>Name</span><input name="name" required defaultValue={modal.item.name || modal.item.id} /></label>
                <label><span>ID</span><input readOnly value={modal.item.id} /></label>
                <label><span>Description</span><textarea name="description" defaultValue={modal.item.description || ""} /></label>
                <label><span>Metadata JSON</span><textarea name="metadata" defaultValue={prettyJson(modal.item.metadata || {})} /></label>
                <button type="submit" disabled={modalBusy}>{modal.registered ? "SAVE COMPONENT" : "REGISTER COMPONENT"}</button>
              </form>
            ) : modal.kind === "create-memory" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const topics = String(form.get("topics") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  submitJsonAction(
                    "/memories",
                    {
                      memory: String(form.get("memory") || ""),
                      user_id: String(form.get("user_id") || userId),
                      topics: topics.length ? topics : null
                    },
                    "Memory created."
                  );
                }}
              >
                <label><span>Memory</span><textarea name="memory" required placeholder="A durable user memory for AgentOS" /></label>
                <label><span>User ID</span><input name="user_id" defaultValue={userId} /></label>
                <label><span>Topics</span><input name="topics" placeholder="comma,separated,tags" /></label>
                <button type="submit" disabled={modalBusy}>CREATE MEMORY</button>
              </form>
            ) : modal.kind === "edit-memory" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const id = rowIdentifier("memory", modal.row);
                  const form = new FormData(event.currentTarget);
                  const topics = String(form.get("topics") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (id !== "-") nativeAction(`/memories/${encodeURIComponent(id)}`, "PATCH", "Memory updated.", {
                    memory: String(form.get("memory") || ""),
                    user_id: String(form.get("user_id") || userId),
                    topics: topics.length ? topics : null
                  });
                  setModal(null);
                }}
              >
                <label><span>Memory</span><textarea name="memory" required defaultValue={compactValue(pick(modal.row, ["memory", "content", "text"]))} /></label>
                <label><span>User ID</span><input name="user_id" defaultValue={compactValue(pick(modal.row, ["user_id"])) === "-" ? userId : compactValue(pick(modal.row, ["user_id"]))} /></label>
                <label><span>Topics</span><input name="topics" defaultValue={compactValue(pick(modal.row, ["topics", "topic"]))} /></label>
                <button type="submit" disabled={modalBusy}>SAVE MEMORY</button>
              </form>
            ) : modal.kind === "rename" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  nativeAction(modal.endpoint, modal.method || "POST", `${modal.title} saved.`, {
                    [modal.field]: String(form.get("name") || "")
                  });
                  setModal(null);
                }}
              >
                <label><span>Name</span><input name="name" required defaultValue={modal.currentName === "-" ? "" : modal.currentName} /></label>
                <button type="submit" disabled={modalBusy}>SAVE</button>
              </form>
            ) : modal.kind === "edit-schedule" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const id = rowIdentifier("scheduler", modal.row);
                  const form = new FormData(event.currentTarget);
                  let payload: Record<string, unknown> | null = null;
                  try {
                    payload = JSON.parse(String(form.get("payload") || "{}")) as Record<string, unknown>;
                  } catch {
                    setNotice("Schedule payload must be valid JSON.");
                    return;
                  }
                  if (id !== "-") nativeAction(`/schedules/${encodeURIComponent(id)}`, "PATCH", "Schedule updated.", {
                    name: String(form.get("name") || "") || null,
                    cron_expr: String(form.get("cron_expr") || "") || null,
                    endpoint: String(form.get("endpoint") || "") || null,
                    method: String(form.get("method") || "") || null,
                    description: String(form.get("description") || "") || null,
                    timezone: String(form.get("timezone") || "") || null,
                    payload,
                    timeout_seconds: Number(form.get("timeout_seconds") || 3600),
                    max_retries: Number(form.get("max_retries") || 0)
                  });
                  setModal(null);
                }}
              >
                <label><span>Name</span><input name="name" defaultValue={compactValue(pick(modal.row, ["name", "schedule_id", "id"]))} /></label>
                <label><span>Cron</span><input name="cron_expr" defaultValue={compactValue(pick(modal.row, ["cron_expr", "cron", "schedule"]))} /></label>
                <label><span>Endpoint</span><input name="endpoint" defaultValue={compactValue(pick(modal.row, ["endpoint", "url", "path"]))} /></label>
                <label><span>Method</span><input name="method" defaultValue={compactValue(pick(modal.row, ["method"])) === "-" ? "POST" : compactValue(pick(modal.row, ["method"]))} /></label>
                <label><span>Description</span><input name="description" defaultValue={compactValue(pick(modal.row, ["description"])) === "-" ? "" : compactValue(pick(modal.row, ["description"]))} /></label>
                <label><span>Timezone</span><input name="timezone" defaultValue={compactValue(pick(modal.row, ["timezone"])) === "-" ? "UTC" : compactValue(pick(modal.row, ["timezone"]))} /></label>
                <label><span>Timeout Seconds</span><input name="timeout_seconds" type="number" min="1" max="86400" defaultValue={Number(pick(modal.row, ["timeout_seconds"]) || 3600)} /></label>
                <label><span>Max Retries</span><input name="max_retries" type="number" min="0" max="10" defaultValue={Number(pick(modal.row, ["max_retries"]) || 0)} /></label>
                <label><span>Payload JSON</span><textarea name="payload" defaultValue={prettyJson(pick(modal.row, ["payload"]) || {})} /></label>
                <button type="submit" disabled={modalBusy}>SAVE SCHEDULE</button>
              </form>
            ) : modal.kind === "create-schedule" ? (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  let payload: Record<string, unknown> = {};
                  try {
                    payload = JSON.parse(String(form.get("payload") || "{}")) as Record<string, unknown>;
                  } catch {
                    setNotice("Schedule payload must be valid JSON.");
                    return;
                  }
                  submitJsonAction(
                    "/schedules",
                    {
                      name: String(form.get("name") || ""),
                      cron_expr: String(form.get("cron_expr") || ""),
                      endpoint: String(form.get("endpoint") || ""),
                      method: String(form.get("method") || "POST"),
                      description: String(form.get("description") || "") || null,
                      timezone: String(form.get("timezone") || "UTC"),
                      payload,
                      timeout_seconds: Number(form.get("timeout_seconds") || 3600),
                      max_retries: Number(form.get("max_retries") || 0)
                    },
                    "Schedule created."
                  );
                }}
              >
                <label><span>Name</span><input name="name" required placeholder="Daily Summary" /></label>
                <label><span>Cron</span><input name="cron_expr" required placeholder="0 9 * * *" /></label>
                <label><span>Endpoint</span><input name="endpoint" required placeholder="/agents/web-search/runs" /></label>
                <label><span>Method</span><input name="method" defaultValue="POST" /></label>
                <label><span>Description</span><input name="description" placeholder="Optional description" /></label>
                <label><span>Timezone</span><input name="timezone" defaultValue="UTC" /></label>
                <label><span>Timeout Seconds</span><input name="timeout_seconds" type="number" min="1" max="86400" defaultValue="3600" /></label>
                <label><span>Max Retries</span><input name="max_retries" type="number" min="0" max="10" defaultValue="0" /></label>
                <label><span>Payload JSON</span><textarea name="payload" defaultValue={'{}'} /></label>
                <button type="submit" disabled={modalBusy}>CREATE SCHEDULE</button>
              </form>
            ) : modal.kind === "upload-knowledge" ? (
              <form
                className="modal-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formElement = event.currentTarget;
                  const form = new FormData(formElement);
                  const body = new FormData();
                  body.set("name", String(form.get("name") || ""));
                  body.set("description", String(form.get("description") || ""));
                  body.set("text_content", String(form.get("text_content") || ""));
                  body.set("url", String(form.get("url") || ""));
                  const file = form.get("file");
                  if (file instanceof File && file.size > 0) body.set("file", file);
                  const metadata = String(form.get("metadata") || "").trim();
                  if (metadata) body.set("metadata", metadata);
                  setModalBusy(true);
                  const result = await fetch(`${getAgentOSBaseUrl()}/knowledge/content`, { method: "POST", body });
                  const text = await result.text();
                  setModalBusy(false);
                  setNotice(result.ok ? "Knowledge upload submitted." : `HTTP ${result.status}: ${text}`);
                  if (result.ok) {
                    setModal(null);
                    const card = endpointCards.find((item) => item.key === "knowledge");
                    if (card) loadEndpoint(card);
                  }
                }}
              >
                <label><span>Name</span><input name="name" required placeholder="Knowledge item" /></label>
                <label><span>Description</span><input name="description" placeholder="Optional context" /></label>
                <label><span>URL</span><input name="url" placeholder="https://..." /></label>
                <label><span>Text Content</span><textarea name="text_content" placeholder="Raw text content" /></label>
                <label><span>File</span><input name="file" type="file" /></label>
                <label><span>Metadata JSON</span><textarea name="metadata" placeholder='{"source":"manual"}' /></label>
                <button type="submit" disabled={modalBusy}>UPLOAD CONTENT</button>
              </form>
            ) : (
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const expectedTools = String(form.get("expected_tool_calls") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const payload: Record<string, unknown> = {
                    name: String(form.get("name") || "") || null,
                    agent_id: String(form.get("agent_id") || "") || null,
                    team_id: String(form.get("team_id") || "") || null,
                    model_id: String(form.get("model_id") || "") || null,
                    model_provider: String(form.get("model_provider") || "") || null,
                    eval_type: String(form.get("eval_type") || "accuracy"),
                    input: String(form.get("input") || ""),
                    expected_output: String(form.get("expected_output") || "") || null,
                    criteria: String(form.get("criteria") || "") || null,
                    scoring_strategy: String(form.get("scoring_strategy") || "binary"),
                    threshold: Number(form.get("threshold") || 7),
                    num_iterations: Number(form.get("num_iterations") || 1),
                    warmup_runs: Number(form.get("warmup_runs") || 0),
                    expected_tool_calls: expectedTools.length ? expectedTools : null,
                    allow_additional_tool_calls: form.get("allow_additional_tool_calls") === "on"
                  };
                  submitJsonAction("/eval-runs", payload, "Evaluation run submitted.");
                }}
              >
                <label><span>Name</span><input name="name" placeholder="Manual Evaluation" /></label>
                <label><span>Agent ID</span><input name="agent_id" placeholder={agents[0]?.id || "web-search"} /></label>
                <label><span>Team ID</span><input name="team_id" placeholder="optional team id" /></label>
                <label><span>Eval Type</span><select name="eval_type" defaultValue="accuracy"><option value="accuracy">accuracy</option><option value="performance">performance</option><option value="reliability">reliability</option></select></label>
                <label><span>Input</span><textarea name="input" required placeholder="Question or task to evaluate" /></label>
                <label><span>Expected Output</span><textarea name="expected_output" placeholder="Used by accuracy evaluations" /></label>
                <label><span>Criteria</span><textarea name="criteria" placeholder="Judge criteria" /></label>
                <label><span>Model ID</span><input name="model_id" placeholder="optional judge model" /></label>
                <label><span>Model Provider</span><input name="model_provider" placeholder="optional provider" /></label>
                <label><span>Scoring</span><select name="scoring_strategy" defaultValue="binary"><option value="binary">binary</option><option value="numeric">numeric</option></select></label>
                <label><span>Threshold</span><input name="threshold" type="number" min="1" max="10" defaultValue="7" /></label>
                <label><span>Iterations</span><input name="num_iterations" type="number" min="1" max="100" defaultValue="1" /></label>
                <label><span>Warmup Runs</span><input name="warmup_runs" type="number" min="0" max="10" defaultValue="0" /></label>
                <label><span>Expected Tool Calls</span><input name="expected_tool_calls" placeholder="comma,separated,tool_names" /></label>
                <label className="check-row"><input name="allow_additional_tool_calls" type="checkbox" /> <span>Allow additional tool calls</span></label>
                <button type="submit" disabled={modalBusy}>RUN EVALUATION</button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
