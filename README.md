# PrimeAgent

PrimeAgent 是面向跨境电商场景的垂类 Agent 平台。

当前阶段采用文档先行，先把产品边界、Agent 协同、能力沉淀、第三方连接和权限治理梳理清楚，再进入工程实现。

## 当前定位

PrimeAgent 不是简单聊天机器人，也不是固定 Workflow 工具。

它的目标是：

```text
跨境电商开放式对话 Agent 操作系统
```

核心路径：

```text
Conversation
  -> Intent / Goal Understanding
  -> Clarification if needed
  -> Capability Retrieval
  -> Direct Tool / Agent / Team / Workflow Skeleton / Full Workflow
  -> Tool Gateway / Approval / Audit
  -> Skill / Tool / Team / Workflow Skeleton / Workflow 沉淀
```

## 技术方向

- Frontend：Next.js + Vercel AI SDK + shadcn/ui + Tailwind CSS。
- Backend：FastAPI。
- Agent Runtime：Agno。
- Connector / OAuth：Nango。
- Identity：Clerk。
- Database：Postgres + pgvector。
- Storage：Cloudflare R2。
- First Integration：Shopify。

## 当前目录

```text
PRD/
  最终产品和架构 PRD。

cases/
  跨境电商业务 case、用户场景、压力测试样例。

tasks/
  技术验证任务、agent 协同验证、架构 check 任务。

*.md
  早期架构判断、源码阅读总结、验证路线图。
```

## 重要边界

- Agno 是 Agent/Team/Workflow runtime，不是租户、审批、OAuth、能力治理事实源。
- Nango 是 OAuth、connection、token refresh 和 provider token 管理层，不是 Skill、Memory、Workflow 优化系统。
- 本仓库不会直接 vendor `agno/` 和 `nango/` 上游源码；正式实现时应使用 `runtime/agno/` 和 `integrations/nango/` 做产品级适配层。
- 所有外部读写动作必须经过 Tool Gateway、权限校验、审批策略和审计日志。
- Workflow 只用于稳定、高频、可测试、可审批的流程；开放探索优先沉淀为 Skill、Tool、Team、Workflow Skeleton 或 Capability Candidate。

