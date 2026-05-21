# 复杂业务 Case 目录

本目录专门记录跨境电商 Agent 平台的复杂业务场景。

`tasks/agent协同验证` 目录负责技术能力验证，例如 Agent、Team、Workflow、Registry、Orchestrator、Tool Gateway、Approval、模型路由等是否可行。

`cases` 目录负责真实业务场景头脑风暴和架构反推，例如用户会怎么使用平台、一个复杂目标会拆成哪些 Agent/Team/Workflow/Tool、现有技术验证是否有遗漏。

## 当前 Case

| 编号 | 文档 | 说明 |
| --- | --- | --- |
| 12 | [12-用户使用场景头脑风暴与验证缺口分析.md](/Users/ske/PrimeAgent/cases/12-用户使用场景头脑风暴与验证缺口分析.md) | 从真实用户角色和使用场景反推当前验证总结是否完整。 |
| 13 | [13-高优先级复杂业务场景与动态Workflow验证.md](/Users/ske/PrimeAgent/cases/13-高优先级复杂业务场景与动态Workflow验证.md) | 优先分析竞品链接到 Shopify 上架、对话探索沉淀 Workflow、外部选品研究、多模型节点和 Workflow 自动治理。 |
| 14 | [14-开放式对话意图理解与能力沉淀边界.md](/Users/ske/PrimeAgent/cases/14-开放式对话意图理解与能力沉淀边界.md) | 明确跨境电商对话通常开放且渐进，最终更常沉淀 Skill、Tool、MCP、Team 或 Workflow Skeleton，而不是完整 Workflow。 |
| 15 | [15-能力沉淀过多后的发现治理与边界说明.md](/Users/ske/PrimeAgent/cases/15-能力沉淀过多后的发现治理与边界说明.md) | 明确 Skill、Tool、MCP 等能力沉淀过多后，需要 Capability Registry、能力卡片、边界说明、质量评分和能力检索治理。 |
| 16 | [16-对话触发的外部能力发现申请与安装边界.md](/Users/ske/PrimeAgent/cases/16-对话触发的外部能力发现申请与安装边界.md) | 明确外部 Skill/MCP/Tool 的发现和安装只能由对话中的能力缺口触发，不能后台静默自动安装。 |

## 使用方式

后续每新增一个复杂业务 case，都应该回答：

- 用户原始需求是什么。
- 这是哪一类业务任务。
- 需要哪些 Agent、Team、Workflow、Tool、Model、Approval。
- 哪些步骤可以对话探索，哪些步骤必须固定成 Workflow。
- 哪些结果可以沉淀成 WorkflowDraft、SkillDraft、ToolRequirementDraft。
- 哪些结果不适合沉淀成完整 Workflow，只适合沉淀成 Skill、Tool、MCP、Team 或 Workflow Skeleton。
- 需要哪些权限、审计、成本、模型、记忆和回放控制。
- 现有 `tasks/agent协同验证` 是否已经覆盖，哪些技术验证还要新增。

## 当前核心原则

跨境电商业务对话通常不是固定流程触发器，而是开放式目标探索。

因此：

```text
对话是入口。
AI 不理解就追问。
PlanDraft 是开放任务的临时计划。
ExplorationRun 是非固定流程的执行记录。
Skill / Tool / MCP / Team / WorkflowSkeleton 是主要复用资产。
Full Workflow 只用于足够稳定、高频、可测试、可审批的流程。
```

能力沉淀越多，越需要资产化治理：

```text
每个能力都有卡片。
每个能力都有边界。
每个能力都有版本。
每个能力都有质量指标。
AI 通过 Capability Registry 和 Capability Retrieval 找能力。
Orchestrator 只从合法候选中选择能力。
```

外部能力发现必须由对话触发：

```text
用户提出需求。
AI 发现能力缺口。
AI 查找候选外部能力。
AI 解释为什么需要和风险是什么。
用户确认申请。
管理员/策略审核。
沙盒测试。
安装成内部 Capability。
```

## 和技术验证目录的关系

```text
cases
  -> 提供真实业务压力测试
  -> 反推技术验证缺口
  -> 生成新的 tasks/agent协同验证 专题

tasks/agent协同验证
  -> 验证底层 Agent 平台能力
  -> 为 cases 提供可实现路径
  -> 最终进入 PRD 和代码实现任务
```
