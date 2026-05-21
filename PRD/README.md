# PRD 目录

本目录用于存放跨境电商 Agent 平台的最终产品和架构文档。

## 文档

| 文档 | 说明 |
| --- | --- |
| [00-架构Check全量复盘与缺口闭环.md](/Users/ske/PrimeAgent/PRD/00-架构Check全量复盘与缺口闭环.md) | 记录基于 tasks 和 cases 的三轮架构 check、覆盖矩阵、缺口和最终收束。 |
| [01-跨境电商Agent平台详细PRD.md](/Users/ske/PrimeAgent/PRD/01-跨境电商Agent平台详细PRD.md) | 最终详细 PRD，包含产品定位、文件目录、Agno Runtime、Nango Connector、核心架构、执行路径、数据模型、API、前端、后端模块、MVP 阶段和验收标准。 |

## 当前核心结论

平台不应被设计成单纯的固定 Workflow 工具。

最终形态是：

```text
跨境电商开放式对话 Agent 操作系统
```

核心转变：

```text
从 Workflow-first
转向 Conversation + Capability-first
```

Workflow 仍然重要，但只用于足够稳定、高频、可测试、可审批的流程。

更常沉淀的能力是：

- Skill。
- Tool。
- MCP / Connector。
- AgentVersion。
- TeamVersion。
- Workflow Skeleton。
- Memory / Knowledge。

所有能力都必须进入 Capability Registry，具备能力卡片、边界说明、版本、质量指标、权限和审计。

最新补充：

- Agno 被定义为独立 Agent Runtime Module，不承载租户、审批、OAuth 和能力治理事实源。
- Nango 被定义为独立 Connector Module，只负责 OAuth、connection、token refresh 和 provider 凭据生命周期。
- 产品目录明确区分 `agno/`、`nango/` 上游源码参考目录与 `runtime/agno/`、`integrations/nango/` 产品适配层。
- Orchestrator 明确升级为能力路由器，支持直接回答、直接读工具、专家委派、Team、Workflow Skeleton、Full Workflow、外部能力申请和后台探索。
