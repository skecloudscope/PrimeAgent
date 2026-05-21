"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ChatResponse, PlanDraft, WorkflowRun } from "@prime-agent/shared";
import { approveRequest, confirmPlanDraft, rejectRequest, sendChatMessage } from "../src/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function WorkspacePage() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "你可以自由描述跨境电商任务。我会先判断意图，必要时追问，不会默认把任务固化成 Workflow。"
    }
  ]);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeApprovalId = workflowRun?.approval_request_id ?? null;
  const finalDiff = workflowRun?.final_output?.listing_diff;

  const capabilityList = useMemo(
    () => [
      "shopify_product_read_tool",
      "listing_optimization_agent",
      "listing_review_approval",
      "shopify_product_write_tool"
    ],
    []
  );

  async function handleSend() {
    if (!input.trim()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", content: input }]);

    try {
      const response: ChatResponse = await sendChatMessage(input, conversationId);
      setConversationId(response.conversation_id);
      setMessages((current) => [...current, { role: "assistant", content: response.message }]);
      setPlanDraft(response.plan_draft);
      setWorkflowRun(null);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleConfirmPlan() {
    if (!planDraft) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const run = await confirmPlanDraft(planDraft.id);
      setWorkflowRun(run);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "计划已确认，Listing workflow 已执行到审批节点。" }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!activeApprovalId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const run = await approveRequest(activeApprovalId);
      setWorkflowRun(run);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "审批已通过，mock Tool Gateway 已使用冻结 diff 完成写回。" }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!activeApprovalId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const run = await rejectRequest(activeApprovalId);
      setWorkflowRun(run);
      setMessages((current) => [...current, { role: "assistant", content: "审批已拒绝，写回已取消。" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <h1 className="brand">PrimeAgent</h1>
            <div className="brand-subtitle">Ecommerce Agent OS</div>
          </div>
        </div>
        <div className="section-title">Workspace</div>
        <div className="nav-item">
          <span>Tenant</span>
          <span className="muted">tenant_demo</span>
        </div>
        <div className="nav-item">
          <span>Shop</span>
          <span className="muted">shop_demo</span>
        </div>
        <div className="section-title">Capabilities</div>
        {capabilityList.map((capability) => (
          <div className="capability" key={capability}>
            <span>{capability}</span>
            <span className="badge">mock</span>
          </div>
        ))}
      </aside>

      <section className="main">
        <header className="chat-header">
          <div>
            <strong>跨境电商任务中枢</strong>
            <div className="muted">自由意图 → Orchestrator → PlanDraft / ExplorationRun</div>
          </div>
          <div className="header-actions">
            <span className="badge">Conversation {conversationId ? "active" : "new"}</span>
            <span className="badge high">Tool Gateway guarded</span>
          </div>
        </header>

        <div className="chat-thread">
          <div className="thread-inner">
            <div className="intent-strip">
              <span>试试输入：</span>
              <button onClick={() => setInput("我现在不做 workflow，先围绕一款新品做开放式选品探索")}>先探索</button>
              <button onClick={() => setInput("分析这个竞品链接，看看它的卖点和 Shopify 上架机会")}>竞品分析</button>
              <button onClick={() => setInput("我想要做产品上架，但现在资料还不完整")}>产品上架</button>
              <button onClick={() => setInput("帮我创建一个跨境电商竞品卖点提炼 Skill")}>创建 Skill</button>
              <button onClick={() => setInput("帮我创建一个 Listing 优化 Agent")}>创建 Agent</button>
              <button onClick={() => setInput("帮我创建一个 Amazon 评论分析 MCP")}>创建 MCP</button>
            </div>
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="message-role">{message.role === "assistant" ? "Orchestrator" : "You"}</div>
                <div>{message.content}</div>
              </div>
            ))}
          </div>
          {error ? <div className="message assistant">请求失败：{error}</div> : null}
        </div>

        <div className="composer">
          <textarea
            value={input}
            placeholder="输入你的目标。Enter 发送，Shift + Enter 换行。"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <button className="primary" disabled={isLoading} onClick={handleSend}>
            发送
          </button>
        </div>
      </section>

      <aside className="inspector">
        <PlanDraftPanel planDraft={planDraft} isLoading={isLoading} onConfirm={handleConfirmPlan} />
        <RunTimeline workflowRun={workflowRun} />
        <ApprovalPanel workflowRun={workflowRun} isLoading={isLoading} onApprove={handleApprove} onReject={handleReject} />
        {finalDiff ? (
          <section className="panel">
            <h2>最终输出</h2>
            <pre>{JSON.stringify(finalDiff, null, 2)}</pre>
          </section>
        ) : null}
      </aside>
    </main>
  );
}

function PlanDraftPanel({
  planDraft,
  isLoading,
  onConfirm
}: {
  planDraft: PlanDraft | null;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  return (
    <section className="panel">
      <h2>PlanDraft</h2>
      {planDraft ? (
        <>
          <p>{planDraft.goal}</p>
          <p className="muted">风险等级：{planDraft.risk_level}</p>
          <ul className="steps">
            {planDraft.proposed_steps.map((step) => (
              <li className="step" key={step.id}>
                <div className="step-title">
                  <span>{step.title}</span>
                  <span className={`badge ${step.risk_level}`}>{step.risk_level}</span>
                </div>
                <div className="muted">{step.description}</div>
              </li>
            ))}
          </ul>
          <button className="primary" disabled={isLoading} onClick={onConfirm}>
            确认计划
          </button>
        </>
      ) : (
        <p className="muted">等待 Orchestrator 生成计划。</p>
      )}
    </section>
  );
}

function RunTimeline({ workflowRun }: { workflowRun: WorkflowRun | null }) {
  return (
    <section className="panel">
      <h2>Run Timeline</h2>
      {workflowRun ? (
        <>
          <p className="muted">状态：{workflowRun.status}</p>
          <ul className="timeline">
            {workflowRun.timeline.map((item, index) => (
              <li key={`${item.type}-${index}`}>{item.label}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">确认计划后会显示运行时间线。</p>
      )}
    </section>
  );
}

function ApprovalPanel({
  workflowRun,
  isLoading,
  onApprove,
  onReject
}: {
  workflowRun: WorkflowRun | null;
  isLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const waiting = workflowRun?.status === "waiting_approval" && workflowRun.approval_request_id;
  return (
    <section className="panel">
      <h2>Approval</h2>
      {waiting ? (
        <>
          <p>写回 Shopify 前需要审批。</p>
          <div className="diff">
            <div className="diff-block">
              <strong>审批单</strong>
              <div className="muted">{workflowRun.approval_request_id}</div>
            </div>
          </div>
          <button className="primary" disabled={isLoading} onClick={onApprove}>
            通过并 mock 写回
          </button>{" "}
          <button className="danger" disabled={isLoading} onClick={onReject}>
            拒绝
          </button>
        </>
      ) : (
        <p className="muted">暂无待审批动作。</p>
      )}
    </section>
  );
}
