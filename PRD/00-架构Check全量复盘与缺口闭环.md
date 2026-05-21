# 架构 Check 全量复盘与缺口闭环

## 文档目的

本文记录基于 `/Users/ske/PrimeAgent/tasks` 与 `/Users/ske/PrimeAgent/cases` 的完整架构 check 流程。

本次 check 按三轮进行：

```text
第一轮：用所有 case 反查现有 tasks 是否覆盖。
第二轮：补充遗漏的架构模块、数据模型、服务边界和技术验证项。
第三轮：重新过一遍 case，收束成最终 PRD 的架构和实现细节。
```

最终 PRD 输出到：

`/Users/ske/PrimeAgent/PRD/01-跨境电商Agent平台详细PRD.md`

## 输入文档

### 架构基线

- `/Users/ske/PrimeAgent/cross-border-agent-architecture-decision.md`
- `/Users/ske/PrimeAgent/cross-border-agent-validation-roadmap.md`
- `/Users/ske/PrimeAgent/cross-border-agent-platform-design.md`

### 技术验证任务

- `/Users/ske/PrimeAgent/tasks/00-Agno-Agent协同主验证计划.md`
- `/Users/ske/PrimeAgent/tasks/00A-跨境电商Agent协同场景矩阵.md`
- `/Users/ske/PrimeAgent/tasks/00B-Agent-Team-Workflow迭代优化机制.md`
- `/Users/ske/PrimeAgent/tasks/01-前端工作台与VercelAI-SDK验证.md`
- `/Users/ske/PrimeAgent/tasks/02-Agno运行时可行性验证.md`
- `/Users/ske/PrimeAgent/tasks/03-Nango-Shopify连接可行性验证.md`
- `/Users/ske/PrimeAgent/tasks/04-FastAPI业务API边界设计.md`
- `/Users/ske/PrimeAgent/tasks/05-领域模型与多租户隔离.md`
- `/Users/ske/PrimeAgent/tasks/06-权限工具网关与审批验证.md`
- `/Users/ske/PrimeAgent/tasks/07-记忆与知识库策略验证.md`
- `/Users/ske/PrimeAgent/tasks/08-Shopify-Listing优化MVP验证.md`
- `/Users/ske/PrimeAgent/tasks/09-工程结构与部署验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/00-Agent协同验证总览.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/01-Agent创建与配置验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/02-Agent版本迭代与优化验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/03-Agent管理审核与发布验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/04-Team调用Agent与协同模式验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/05-Team版本迭代与成员治理验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/06-Workflow整体编排逻辑验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/07-Workflow版本迭代与回放验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/08-LLM-Provider与模型路由验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/09-Agent-Registry与组件发现验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/10-Orchestrator总控Agent验证.md`
- `/Users/ske/PrimeAgent/tasks/agent协同验证/11-Agent协同端到端原型验证.md`

### Case 文档

- `/Users/ske/PrimeAgent/cases/12-用户使用场景头脑风暴与验证缺口分析.md`
- `/Users/ske/PrimeAgent/cases/13-高优先级复杂业务场景与动态Workflow验证.md`
- `/Users/ske/PrimeAgent/cases/14-开放式对话意图理解与能力沉淀边界.md`
- `/Users/ske/PrimeAgent/cases/15-能力沉淀过多后的发现治理与边界说明.md`
- `/Users/ske/PrimeAgent/cases/16-对话触发的外部能力发现申请与安装边界.md`

## 第一轮：case 反查 tasks 覆盖情况

### Case 12：用户使用场景头脑风暴

覆盖良好的点：

- 单商品 Listing 优化并写回 Shopify：被 `08-Shopify-Listing优化MVP验证` 和 `agent协同验证/11` 覆盖。
- Agent/Team/Workflow 的基础协同：被 `agent协同验证/01-07` 覆盖。
- Orchestrator 入口：被 `agent协同验证/10` 覆盖。
- Tool Gateway 和 Approval：被 `tasks/06`、`agent协同验证/06-07` 覆盖。

不足：

- 批量任务和部分成功没有完整任务。
- Approval 编辑、拒绝、重做闭环不够细。
- 多店铺会话上下文隔离没有单独技术验证。
- Connector 异常和授权恢复没有单独技术验证。
- 只读诊断类 Workflow 没有单独技术验证。
- 前端任务执行体验仍然偏轻量。
- Memory Candidate 治理没有单独技术验证。

结论：

`00-11` 的稳定 Workflow 主线成立，但需要扩展到真实运营场景。

### Case 13：高优先级复杂业务场景与动态 Workflow

覆盖良好的点：

- Workflow 版本、审核、回放、回滚：被 `agent协同验证/07` 覆盖。
- 不同节点调用不同模型：被 `agent协同验证/08` 覆盖。
- Tool Gateway 写入边界：被 `tasks/06` 和 `agent协同验证/06` 覆盖。

不足：

- 竞品链接抓取、网页抽取、外部来源证据没有任务覆盖。
- 图片生成、SKU 图、场景图、A+ 页面资产流水线没有任务覆盖。
- Shopify 导入包不仅是 Listing 字段，还包括 product、variant、media、metafields，这比原 MVP 复杂。
- 从对话探索生成 WorkflowDraft / SkillDraft / ToolRequirementDraft 没有任务覆盖。
- ExplorationRun 和 RunGraph 没有在 tasks 中出现。

结论：

当前架构必须新增“开放探索运行”和“能力沉淀”层。

### Case 14：开放式对话意图理解与能力沉淀边界

覆盖良好的点：

- Orchestrator 作为入口已经确认。
- 不理解时追问在 `agent协同验证/10` 有提到。

不足：

- Orchestrator 仍然偏“白名单 Workflow 选择器”，没有完整变成“需求澄清 + 动态计划 + 能力路由 + 执行监督 + 沉淀判断”。
- 缺 ConversationGoal。
- 缺 ClarificationQuestion。
- 缺 PlanDraft。
- 缺 ExplorationRun。
- 缺 CapabilityCandidate。
- 缺 Workflow Skeleton 和 Full Workflow 的边界判断。

结论：

不能把 Workflow 固化作为默认沉淀目标。主要复用资产应变成 Skill、Tool、MCP、Team、Workflow Skeleton，Full Workflow 只用于稳定高频流程。

### Case 15：能力沉淀过多后的发现治理

覆盖良好的点：

- 业务 Registry 已在 `agent协同验证/09` 中确认必须自建。

不足：

- 现有 Registry 只管理 Agent/Team/Workflow/Tool/Model/Memory，没有升级成 Capability Registry。
- 缺 CapabilityCard。
- 缺 SkillSpec。
- 缺 ToolSpec / ConnectorSpec。
- 缺 Capability Retrieval。
- 缺能力质量评分、去重、合并、过期、下线。
- 缺 Orchestrator 如何从大量能力中选择能力的检索和解释流程。

结论：

业务 Registry 必须升级为 Capability Registry。

### Case 16：对话触发的外部能力发现申请与安装边界

覆盖良好的点：

- Tool Gateway、Nango、权限审批的底层边界已经建立。

不足：

- 缺 CapabilityGap。
- 缺 ExternalCapabilityCandidate。
- 缺 CapabilityInstallRequest。
- 缺对话中能力缺口识别。
- 缺外部能力风险评估。
- 缺外部能力安装后的内部 CapabilityCard 转换。
- 缺 `waiting_capability_install` 这类 PlanDraft 状态。

结论：

外部能力发现必须是对话触发，不是后台自发。安装必须申请、审核、沙盒、启用、可撤销。

## 第二轮：新增架构模块

### 新增模块 1：Conversation Understanding Layer

目标：

- 理解用户意图。
- 判断是否缺信息。
- 支持一次说全和逐步表达。
- 支持中途改目标。
- 支持把自然语言转成 PlanDraft。

核心对象：

- ConversationGoal。
- ClarificationQuestion。
- TaskIntent。
- PlanDraft。

### 新增模块 2：Exploration Runtime

目标：

- 处理不适合直接进入固定 Workflow 的开放任务。
- 允许动态执行能力组合。
- 全量记录运行过程。
- 成功后生成能力候选。

核心对象：

- ExplorationRun。
- RunGraph。
- RunGraphNode。
- RunGraphEdge。
- Artifact。
- UserDecision。

### 新增模块 3：Capability Registry

目标：

- 统一管理 Skill、Tool、MCP、Agent、Team、Workflow Skeleton、Workflow。
- 为 Orchestrator 提供能力发现。
- 为前端能力搜索和管理后台提供能力目录。

核心对象：

- Capability。
- CapabilityCard。
- CapabilityVersion。
- SkillSpec。
- ToolSpec。
- ConnectorSpec。
- WorkflowSkeletonSpec。
- CapabilityQualityMetric。
- CapabilityUsageLog。

### 新增模块 4：Capability Retrieval

目标：

- 从大量能力中找到合适能力。
- 先硬过滤，再语义检索，再规则排序，再 LLM rerank。
- 只从合法候选里选择能力。

流程：

```text
Intent Understanding
  -> CapabilityQuery
  -> Hard Filter
  -> Semantic Retrieval
  -> Rule Ranking
  -> LLM Rerank
  -> Compatibility Check
  -> CapabilitySelection
```

### 新增模块 5：Capability Installation

目标：

- 处理对话中触发的外部能力发现和安装申请。
- 不允许后台静默安装。
- 不允许高风险能力自动启用。

核心对象：

- CapabilityGap。
- ExternalCapabilityCandidate。
- CapabilityInstallRequest。
- TenantCapabilityInstallation。
- SandboxEvaluation。

### 新增模块 6：Capability Governance

目标：

- 管理能力生命周期。
- 管理重复能力。
- 管理质量和过期。
- 管理权限和风险。

能力生命周期：

```text
draft -> testing -> active -> deprecated -> disabled -> archived
```

## 第三轮：整体架构收束

最终平台不应被定义为“Workflow 平台”，而应定义为：

```text
跨境电商开放式对话 Agent 平台。

对话是入口。
能力是资产。
PlanDraft 是临时计划。
ExplorationRun 是动态执行。
Workflow 是稳定流程。
Tool Gateway 是动作边界。
Capability Registry 是能力事实源。
Approval 是高风险安全阀。
Audit 是可追溯底座。
```

### 两条主执行路径

#### 路径 A：稳定任务

```text
Conversation
  -> Orchestrator
  -> Capability Retrieval
  -> Published Workflow
  -> WorkflowRun
  -> Tool Gateway / Approval
  -> Audit
```

适合：

- 单商品 Listing 优化并写回。
- 批量 Listing 质量体检。
- Shopify 导入包校验。

#### 路径 B：开放任务

```text
Conversation
  -> Orchestrator
  -> ConversationGoal
  -> ClarificationQuestion
  -> PlanDraft
  -> Capability Retrieval
  -> ExplorationRun
  -> RunGraph
  -> CapabilityCandidate
  -> Review / Testing
  -> Skill / Tool / Team / WorkflowSkeleton / Workflow
```

适合：

- 竞品链接到新品上架。
- 外部选品研究。
- 从独立站数据发现爆品。
- 临时广告投放分析。
- 用户一步步补充的复杂任务。

### 当前 tasks 的新增任务建议

建议后续在 `/Users/ske/PrimeAgent/tasks` 新增：

| 编号建议 | 文档 | 目的 |
| --- | --- | --- |
| 10 | `10-开放式对话与PlanDraft验证.md` | 验证意图理解、追问、计划确认、目标变更 |
| 11 | `11-ExplorationRun与RunGraph验证.md` | 验证非固定流程执行、节点记录、证据链、回放 |
| 12 | `12-CapabilityRegistry与能力检索验证.md` | 验证统一能力目录、能力卡、检索、排序和选择解释 |
| 13 | `13-Skill与WorkflowSkeleton沉淀验证.md` | 验证从运行中沉淀 Skill、Tool、Team、WorkflowSkeleton 的边界 |
| 14 | `14-外部能力发现申请与安装验证.md` | 验证对话触发外部能力发现、安装申请、沙盒和启用 |
| 15 | `15-竞品链接到Shopify上架全链路验证.md` | 验证竞品采集、图片资产、A+、Shopify 导入包、审批写入 |
| 16 | `16-外部研究与选品分析验证.md` | 验证 Google/Amazon 等外部研究工具、来源证据和选品报告 |
| 17 | `17-批量任务与部分成功验证.md` | 验证批量子任务、部分失败、批量审批、成本上限 |
| 18 | `18-前端PlanDraft与任务执行体验验证.md` | 验证对话、计划确认、能力选择、审批、运行时间线 |

## 最终缺口闭环

### 已覆盖

- Agno Agent / Team / Workflow 可行性。
- Tool Gateway 和 Approval 原则。
- Nango / Shopify 边界。
- Agent/Team/Workflow 版本治理。
- LLM Provider 和模型路由。
- Listing 优化并写回 MVP。

### 需要新增

- 对话意图澄清。
- PlanDraft。
- ExplorationRun。
- RunGraph。
- Capability Registry。
- Capability Retrieval。
- SkillSpec / ToolSpec / ConnectorSpec。
- WorkflowSkeleton。
- 外部能力安装申请。
- 外部研究来源证据。
- 资产生成与审核。
- 批量任务与部分成功。
- 前端计划确认和能力选择体验。

## 结论

原有架构主线没有推翻，但必须升级：

```text
从：
固定 Workflow + Agent/Team 执行

升级为：
开放对话 + 能力发现 + 动态探索 + 能力沉淀 + 稳定 Workflow
```

这次升级后，平台才能支撑用户在跨境电商领域开放、复杂、逐步表达的真实工作方式。
