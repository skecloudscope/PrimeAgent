# 跨境电商 Agent 平台详细 PRD

## 1. 项目定位

本项目是面向跨境电商团队的垂类 Agent 平台，不是通用 Agent 平台。

平台的核心目标不是简单聊天，而是让用户通过开放式对话，把跨境电商中的复杂任务逐步澄清、执行、审计，并把有效经验沉淀为可复用能力。

最终产品形态：

```text
开放式对话入口
  -> AI 理解意图，不理解就追问
  -> 能力发现与选择
  -> 临时计划或稳定 Workflow
  -> Agent / Team / Tool / MCP / Workflow 执行
  -> 高风险动作审批
  -> 运行证据和业务结果沉淀
  -> Skill / Tool / Team / Workflow Skeleton / Workflow 持续进化
```

## 2. 核心原则

### 2.1 对话是入口

跨境电商用户不会总是按照固定表单或固定 Workflow 使用系统。

用户可能：

- 一次性说完整需求。
- 逐步补充需求。
- 中途改变目标。
- 先探索，再决定是否执行。
- 要求复用上次做法，但下一次细节又不同。

因此平台必须支持开放式对话，而不是只支持固定 Workflow 触发。

### 2.2 AI 不理解就追问

Orchestrator 不能假装理解。

当缺少关键参数时，必须追问：

- 目标市场。
- 店铺。
- 商品范围。
- 是否写回。
- 是否需要图片。
- 是否允许访问外部网页。
- 是否允许启用外部能力。
- 预算和时间约束。

### 2.3 Workflow 不是唯一沉淀物

一次复杂任务执行成功后，不一定要固化成完整 Workflow。

更常见的沉淀物是：

- Skill。
- Tool。
- MCP / Connector。
- AgentVersion。
- TeamVersion。
- Workflow Skeleton。
- 领域记忆。
- Full Workflow。

Full Workflow 只适用于足够稳定、高频、可测试、可审批的流程。

### 2.4 所有外部动作必须受控

任何会读取敏感数据或写入外部系统的动作都必须经过：

- 权限校验。
- Tool Gateway。
- Connector 状态校验。
- 审批策略。
- 审计日志。

Agent、Team、Orchestrator 都不能直接拿第三方 token，也不能直接绕过 Tool Gateway。

### 2.5 能力要资产化

Skill、Tool、MCP、Agent、Team、Workflow Skeleton、Workflow 都必须进入 Capability Registry。

每个能力都必须有：

- 能力说明。
- 适用场景。
- 不适用场景。
- 输入输出。
- 权限要求。
- 风险等级。
- 版本。
- 质量指标。
- 示例。

AI 找能力必须通过 Capability Retrieval，而不是靠 prompt 记忆。

## 3. 技术选型

### 3.1 已确定架构

- 前端：Next.js + React + Vercel AI SDK + shadcn/ui + Tailwind CSS。
- 后端：FastAPI。
- Agent Runtime：Agno。
- 第三方连接：Nango。
- 登录身份：Clerk。
- 主数据库：Postgres。
- 向量能力：pgvector。
- 文件存储：Cloudflare R2。
- 第一集成：Shopify。

### 3.2 边界

```text
Next.js
  只负责 UI、对话流、状态展示、审批交互。

FastAPI
  是业务主控层，负责租户、权限、能力目录、运行计划、审批、审计、Tool Gateway。

Agno
  是运行时，负责 Agent、Team、Workflow、工具调用、trace、metrics。

Nango
  只负责 OAuth、connection、token refresh。

Postgres
  是业务事实源。
```

### 3.3 项目文件目录与模块分层

当前项目采用“文档先行 + 运行时独立 + 连接器独立 + 业务主控独立”的目录策略。

建议最终目录：

```text
/Users/ske/PrimeAgent
- PRD/
  - 00-架构Check全量复盘与缺口闭环.md
  - 01-跨境电商Agent平台详细PRD.md
- cases/
  - 业务 case、压力测试场景、用户对话样例。
- tasks/
  - 技术验证任务、agent 协同验证、架构 check 任务。
- agno/
  - Agno 上游源码参考目录。
  - 只用于源码理解、可行性验证和适配层设计，不直接等同于产品运行时目录。
- nango/
  - Nango 上游源码参考目录。
  - 只用于连接器、OAuth、token refresh、provider action 的可行性验证。
- apps/
  - web/
    - Next.js 前端应用。
  - api/
    - FastAPI 业务主控服务。
- packages/
  - shared/
    - 前后端共享类型、常量、枚举。
  - capability-registry/
    - 能力卡、能力检索、能力质量评分、能力生命周期。
  - tool-gateway/
    - 工具调用边界、审批策略、审计封装。
  - ecommerce-domain/
    - 跨境电商领域对象，如 ProductDraft、ListingDiff、ShopifyPayload。
- runtime/
  - agno/
    - 本项目自己的 Agno 适配层。
    - 负责把 AgentVersion、TeamVersion、WorkflowVersion 转换为可执行 runtime。
- integrations/
  - nango/
    - 本项目自己的 Nango 适配层。
    - 负责 connection 映射、scope 检查、provider 调用代理。
  - shopify/
    - Shopify 领域工具、payload 转换、读写策略。
- prototypes/
  - 小型验证 demo，不作为正式产品模块。
```

目录边界：

- `agno/` 和 `nango/` 是源码参考和验证目录，不承载 SaaS 产品业务逻辑。
- `runtime/agno/` 是本项目对 Agno 的产品级封装。
- `integrations/nango/` 是本项目对 Nango 的产品级封装。
- `apps/api/` 永远是租户、权限、审批、审计、能力治理的主控层。
- `packages/capability-registry/` 是能力事实源，不依赖单一 agent runtime。

### 3.4 Agno Runtime Module 独立定义

Agno 在本项目中不是业务系统本身，而是 Agent/Team/Workflow 的执行内核。

它负责：

- 构建和运行 Agent。
- 构建和运行 Team。
- 构建和运行 Workflow。
- 承接工具调用。
- 记录 runtime trace、step result、tool result、model invocation。
- 支持不同节点使用不同 LLM provider 和 model policy。

它不负责：

- 租户隔离。
- 用户身份。
- 第三方 OAuth。
- 长期权限策略。
- 审批策略。
- 能力发布审核。
- Capability Registry 的最终事实源。
- Shopify 等业务系统的真实写入授权。

本项目必须在 Agno 外围建立 `Runtime Builder`：

```text
AgentVersion / TeamVersion / WorkflowVersion
  -> RuntimePlan
  -> ToolPolicySnapshot
  -> ModelPolicySnapshot
  -> MemoryPolicySnapshot
  -> Agno Runtime Object
  -> Tool Gateway callable
```

Agno 优化重点：

- Agent/Team/Workflow 版本快照必须可复现。
- 每次运行必须回写 `RunGraph`。
- 工具不能直接暴露 provider token。
- 写操作工具必须变成 Tool Gateway callable。
- Agent 只能看到自己被授权的能力摘要，不能看到全量能力目录。
- Team 必须锁定成员 AgentVersion，避免成员升级导致历史结果不可复现。
- Workflow 只用于稳定流程；开放探索任务优先进入 ExplorationRun。

### 3.5 Nango Connector Module 独立定义

Nango 在本项目中不是数据层，也不是 agent 记忆层，而是第三方账号连接和 provider token 生命周期管理层。

它负责：

- OAuth 授权。
- connection id。
- token refresh。
- provider config。
- provider action / proxy 调用的底层凭据管理。

它不负责：

- Agent 记忆。
- Skill 沉淀。
- Workflow 优化。
- 能力评分。
- 跨租户权限。
- 业务审批。
- 哪个 Agent 可以用哪个工具。

本项目必须在 Nango 外围建立 `Connector Gateway`：

```text
Tenant / Shop / User
  -> ConnectorBinding
  -> Required Scope Check
  -> Nango Connection
  -> Provider Action
  -> Normalized Domain Object
  -> Tool Gateway / Audit
```

Nango 优化重点：

- 每个 connection 必须映射到 tenant、workspace、shop。
- 每个 provider scope 必须进入权限策略。
- connection 异常必须能让 WorkflowRun / ExplorationRun 进入可恢复状态。
- provider 原始返回不能直接污染业务对象，必须转换成领域对象。
- Agent 不直接接触 Nango token，只能通过 Tool Gateway 请求受控动作。
- 第三方 integration 工具不能全部暴露给 Orchestrator，必须通过受控的 integration delegate 或 connector proxy 折叠调用，避免工具 schema 爆炸。

## 4. 用户角色

### 4.1 店铺老板 / 创始人

需要：

- 看店铺哪里有问题。
- 找增长机会。
- 审批高风险写操作。
- 看成本和效果。

### 4.2 运营负责人

需要：

- 批量优化商品。
- 组织 Listing、广告、客服、库存任务。
- 复用成功方法。
- 审核团队成员创建的能力。

### 4.3 Listing 运营

需要：

- 优化标题、卖点、描述、SEO。
- 分析竞品。
- 生成 Shopify 上架资料。
- 保存草稿或提交审批。

### 4.4 广告投手

需要：

- 分析广告表现。
- 找出浪费预算的广告。
- 生成投放建议。
- 高风险预算调整必须审批。

### 4.5 客服负责人

需要：

- 分析差评。
- 生成回复草稿。
- 保持品牌语气。
- 外发消息必须审批。

### 4.6 管理员 / Builder

需要：

- 连接 Shopify 等平台。
- 管理 Agent / Skill / Tool / MCP / Workflow。
- 审核能力。
- 设置权限、模型、预算、审批、记忆策略。

## 5. 核心产品形态

### 5.1 工作台三栏布局

```text
左侧：店铺 / 能力 / 当前目标 / 历史任务
中间：对话 / PlanDraft / AI 解释
右侧：运行时间线 / 工具调用 / 审批 / Diff / 商品数据 / 能力卡片
```

### 5.2 主要页面

- Chat 工作台。
- PlanDraft 确认页。
- Workflow Run 详情页。
- ExplorationRun 详情页。
- Approval 审批中心。
- Capability Registry 能力目录。
- Capability 安装申请。
- Agent / Team / Workflow 管理。
- Memory Candidate 审核。
- Connector 管理。
- Audit Log。
- Cost / Metrics Dashboard。

## 6. 两条执行路径

### 6.1 稳定 Workflow 路径

适用于高频、稳定、可测试的流程。

```text
用户对话
  -> Orchestrator 识别意图
  -> Capability Retrieval 找到 Published Workflow
  -> Resolve Runtime Plan
  -> WorkflowRun
  -> Agent / Team / Tool
  -> Approval
  -> Tool Gateway 写外部系统
  -> Audit / Memory Candidate / Feedback
```

第一条稳定 Workflow：

```text
Listing 优化并写回 Shopify
```

### 6.2 开放探索路径

适用于用户需求开放、流程不固定、需要边做边澄清的任务。

```text
用户对话
  -> ConversationGoal
  -> ClarificationQuestion
  -> PlanDraft
  -> 用户确认计划
  -> Capability Retrieval
  -> ExplorationRun
  -> RunGraph
  -> CapabilityCandidate
  -> 审核 / 测试 / 发布成能力
```

适用场景：

- 竞品链接到 Shopify 上架全链路。
- 外部选品研究。
- 从所有独立站数据里发现爆品。
- 用户逐步补充的复杂分析任务。
- 需要临时启用外部能力的任务。

## 7. Orchestrator

### 7.1 定位

Orchestrator 是入口层，不是执行层。

职责：

- 理解用户意图。
- 判断是否缺信息。
- 追问。
- 维护 ConversationGoal。
- 生成 PlanDraft。
- 检索能力。
- 选择已发布 Workflow 或进入 ExplorationRun。
- 解释运行状态。
- 判断可沉淀能力。

禁止：

- 直接写 Shopify。
- 直接调用高风险 Tool。
- 直接安装外部能力。
- 直接发布 Agent/Workflow/Skill。
- 直接写长期共享记忆。

### 7.2 分层路由模型

Orchestrator 不是 Workflow selector，而是能力路由器。

每轮对话必须按以下优先级判断：

```text
Conversation Message
  -> Goal / Intent Understanding
  -> Clarification if needed
  -> Capability Retrieval
  -> Route Decision
     - direct_answer
     - direct_read_tool
     - delegate_specialist_agent
     - delegate_team
     - use_workflow_skeleton
     - run_full_workflow
     - request_external_capability
     - start_background_exploration
  -> Execution Supervision
  -> Post-run Capability Sedimentation
```

路由含义：

- `direct_answer`：用户只是问概念、规则、解释，不需要执行工具。
- `direct_read_tool`：低风险读取或确定性转换，可直接走 Tool Gateway。
- `delegate_specialist_agent`：任务需要专家 Agent，如 Listing、选品、合规、广告。
- `delegate_team`：任务需要多个专家交叉审查。
- `use_workflow_skeleton`：大方向稳定，但细节需要动态生成 PlanDraft。
- `run_full_workflow`：流程稳定、高频、测试充分、审批清晰。
- `request_external_capability`：当前能力不足，需要对话触发外部能力发现与安装申请。
- `start_background_exploration`：任务耗时长，可以进入后台 ExplorationRun。

Orchestrator 必须控制递归和成本。

运行 tier：

```text
chat
  - 轻量意图识别、追问、解释。

reasoning
  - 复杂计划、能力选择、风险判断、结果综合。

worker
  - 执行具体 Agent/Team/Tool/Workflow 节点。
```

规则：

- `chat` tier 不能调用高风险写工具。
- `reasoning` tier 可以生成计划和选择能力，但不能绕过审批。
- `worker` tier 只能执行 RuntimePlan 中被授权的步骤。
- Orchestrator 可以委派，但必须记录委派原因、输入、输出、成本和风险。
- 专家 Agent 不能无限递归委派。
- 后台任务必须有可恢复状态和用户可见进度。

### 7.3 输入输出

Orchestrator 每轮应该生成结构化输出：

```text
TaskUnderstanding
- intent_type
- confidence
- known_inputs
- missing_inputs
- assumptions
- suggested_next_action
- risk_level
- capability_query
- needs_user_confirmation
```

### 7.4 不理解时追问

追问必须记录为 `ClarificationQuestion`。

例子：

```text
用户：帮我看看这个品能不能做。

AI：
你想从哪个角度判断？
1. 市场需求
2. Amazon 竞品
3. Shopify 上架资料
4. 广告投放机会
5. 利润和库存风险
```

## 8. PlanDraft

### 8.1 定位

PlanDraft 是开放任务的临时计划，不等于 Workflow。

它用于：

- 展示 AI 对用户目标的理解。
- 展示步骤。
- 展示需要用到的能力。
- 展示风险和审批点。
- 让用户确认后再执行。

### 8.2 数据结构

```text
plan_drafts
- id
- tenant_id
- workspace_id
- user_id
- conversation_id
- conversation_goal_id
- goal
- known_inputs
- missing_inputs
- assumptions
- proposed_steps
- required_capabilities
- required_external_capabilities
- estimated_cost
- estimated_duration
- risk_level
- approval_points
- status = draft / waiting_user_confirmation / confirmed / executing / waiting_capability_install / completed / cancelled
- created_at
- updated_at
```

### 8.3 前端展示

PlanDraft 必须显示：

- AI 理解的目标。
- 已知信息。
- 缺失信息。
- 假设。
- 计划步骤。
- 需要能力。
- 是否需要外部能力。
- 是否会访问外网。
- 是否会写外部系统。
- 预计成本。
- 审批点。

## 9. ExplorationRun 与 RunGraph

### 9.1 ExplorationRun

用于执行非固定流程。

```text
exploration_runs
- id
- tenant_id
- user_id
- conversation_id
- plan_draft_id
- status = running / waiting_user / waiting_approval / waiting_capability_install / completed / failed / cancelled
- run_graph_id
- final_outputs
- user_satisfaction_signal
- created_at
- completed_at
```

### 9.2 RunGraph

记录动态执行过程。

```text
run_graphs
- id
- tenant_id
- source_type = exploration_run / workflow_run
- source_id
- nodes
- edges
- artifacts
- tool_calls
- model_invocations
- user_decisions
- created_at
```

节点类型：

- user_message。
- orchestrator_decision。
- clarification。
- capability_search。
- agent_run。
- team_run。
- tool_call。
- mcp_call。
- approval。
- artifact_generation。
- final_output。

## 10. Capability Registry

### 10.1 定位

Capability Registry 是平台能力事实源。

它管理：

- Skill。
- Tool。
- MCP / Connector。
- Agent。
- Team。
- Workflow Skeleton。
- Workflow。
- Model Policy。
- Memory Policy。

### 10.2 CapabilityCard

每个能力必须有能力卡片。

```text
capability_cards
- id
- capability_type
- capability_id
- name
- short_description
- long_description
- ecommerce_domain
- supported_tasks
- input_requirements
- output_contract
- suitable_when
- not_suitable_when
- required_permissions
- required_data_sources
- risk_level
- cost_level
- latency_level
- model_requirements
- examples
- counter_examples
- quality_score
- success_rate
- last_used_at
- owner
- status = draft / testing / active / deprecated / disabled
```

### 10.3 Capability Definition Spec

CapabilityCard 是检索和治理层的摘要。

每个可执行能力还需要有独立定义，用于 Runtime Builder 和 Orchestrator 路由。

建议字段：

```text
capability_definitions
- id
- tenant_id
- capability_card_id
- definition_type = skill / tool / connector / agent / team / workflow_skeleton / workflow
- name
- version
- when_to_use
- not_when_to_use
- required_inputs
- optional_inputs
- output_contract
- allowed_tools
- allowed_connectors
- required_permissions
- risk_tier = low / medium / high / critical
- runtime_tier = chat / reasoning / worker
- delegation_allowed
- max_delegation_depth
- model_policy_hint
- cost_policy
- memory_read_policy
- memory_write_policy
- approval_policy
- test_cases
- eval_criteria
- owner
- status
```

关键规则：

- `when_to_use` 必须说明适合的跨境电商场景。
- `not_when_to_use` 必须说明能力边界，避免 AI 误选。
- `allowed_tools` 只能引用 Tool Gateway 中已注册工具。
- `allowed_connectors` 只能引用租户已授权 connector。
- `runtime_tier` 用于限制成本、递归和风险。
- `delegation_allowed` 为 false 时，该能力不能继续委派其他 Agent。
- definition 变更必须产生新版本，不能静默覆盖历史版本。

### 10.4 Capability 类型

#### Skill

做事方法，通常没有直接外部副作用。

例子：

- 竞品卖点提炼 Skill。
- 爆品筛选 Skill。
- 品牌语气改写 Skill。

#### Tool

确定性动作或数据转换。

例子：

- ProductDraft 转 Shopify payload。
- ListingDiff 转 Shopify update payload。

#### MCP / Connector

连接外部数据或工具。

例子：

- Playwright MCP。
- Amazon product research connector。
- Google Trends connector。

#### Agent

专业智能角色。

例子：

- Listing 优化 Agent。
- Compliance Agent。
- Product Research Agent。

#### Team

多个 Agent 的稳定组合。

例子：

- Listing Review Team。
- Product Opportunity Review Team。

#### Workflow Skeleton

大流程稳定，小步骤动态。

例子：

- 外部研究 -> 结构化 -> 生成资产 -> 审核 -> 导入。

#### Full Workflow

步骤稳定、可测试、可审批的完整业务流程。

例子：

- Listing 优化并写回 Shopify。

## 11. Capability Retrieval

### 11.1 检索流程

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

### 11.2 Hard Filter

过滤：

- 租户不可见。
- 用户无权限。
- 数据源未授权。
- 状态不是 active/testing。
- 风险等级超限。
- 成本超预算。
- 需要外部能力但未安装。

### 11.3 LLM Rerank 边界

LLM 只能在合法候选内排序和解释。

不能：

- 越过权限。
- 选择 disabled 能力。
- 选择未审核外部能力。
- 绕过审批。

## 12. 外部能力发现与安装

### 12.1 触发条件

外部能力发现只能由对话中的能力缺口触发。

不能后台自发安装。

### 12.2 流程

```text
用户提出需求
  -> AI 发现 CapabilityGap
  -> 搜索外部候选能力
  -> 展示候选能力和风险
  -> 用户确认申请
  -> 管理员/策略审核
  -> 沙盒测试
  -> 安装成内部 Capability
  -> 当前任务继续执行
```

### 12.3 数据结构

```text
capability_gaps
- id
- tenant_id
- user_id
- conversation_id
- task_goal
- missing_capability_type
- missing_capability_description
- required_inputs
- expected_outputs
- risk_level
- status
```

```text
external_capability_candidates
- id
- source_registry
- external_id
- name
- capability_type
- description
- provider
- documentation_url
- install_method
- permissions_requested
- data_access
- network_access
- risk_level
- trust_score
- compatibility_score
- status
```

```text
capability_install_requests
- id
- tenant_id
- requested_by
- conversation_id
- capability_gap_id
- candidate_id
- reason
- requested_permissions
- requested_scopes
- risk_level
- status
- reviewed_by
- created_at
- decided_at
```

## 13. Agent / Team / Workflow 生命周期

### 13.1 Agent

```text
AgentTemplate
  -> AgentInstance
  -> AgentVersion draft
  -> testing
  -> review
  -> published
  -> active
  -> run
  -> feedback
  -> optimization suggestion
  -> new draft
```

AgentVersion 必须包含：

```text
agent_versions
- id
- tenant_id
- agent_template_id
- name
- version
- domain_role
- when_to_use
- not_when_to_use
- system_prompt_snapshot
- allowed_tools_snapshot
- allowed_connectors_snapshot
- model_policy_snapshot
- memory_policy_snapshot
- approval_policy_snapshot
- runtime_tier = chat / reasoning / worker
- delegation_allowed
- max_delegation_depth
- cost_policy_snapshot
- eval_cases
- status = draft / testing / review / published / deprecated / disabled
```

Agent 类型建议：

- Orchestrator Agent：只做意图理解、追问、能力检索、路由、解释和监督。
- Specialist Agent：面向单一领域，如 Listing、选品、广告、合规、客服。
- Integration Agent：面向某一类第三方系统，负责把业务请求转换为受控 connector/tool 调用。
- Builder Agent：辅助生成 Skill、AgentDraft、WorkflowSkeletonDraft，但不能直接发布。
- Reviewer Agent：做输出审查、风险审查、合规审查。

Agent 的委派规则：

- Orchestrator 可以委派 Specialist、Team 或 Integration Agent。
- Specialist 默认不能再委派，除非 definition 中显式允许。
- Integration Agent 不能把 provider token 暴露给其他 Agent。
- Builder Agent 只能生成 draft 和候选，不允许自动发布。
- Reviewer Agent 的结论必须进入审批或审计记录。

### 13.2 Team

TeamVersion 必须锁定成员 AgentVersion。

成员升级不自动影响已发布 Team。

TeamVersion 必须包含：

```text
team_versions
- id
- tenant_id
- name
- version
- team_role
- when_to_use
- not_when_to_use
- member_agent_versions
- coordination_mode = sequential / parallel / debate / review_chain
- leader_agent_version_id
- output_contract
- model_policy_snapshot
- tool_policy_snapshot
- approval_policy_snapshot
- runtime_tier
- status
```

Team 用于稳定协作，不用于随意堆叠 Agent。

适合沉淀为 Team 的情况：

- 多个 Agent 的分工稳定。
- 输出合并方式稳定。
- 审查关系稳定。
- 成本和时延可接受。
- 多次 ExplorationRun 证明成功率高。

### 13.3 Workflow

WorkflowVersion 必须锁定：

- AgentVersion。
- TeamVersion。
- ToolVersion。
- ModelPolicySnapshot。
- ApprovalPolicySnapshot。

历史 WorkflowRun 不跟随 active version 变化。

回放不能真实写外部系统。

### 13.4 Workflow Skeleton

Workflow Skeleton 不是可直接执行的固定流程，而是计划生成参考。

它用于：

- 帮 Orchestrator 生成 PlanDraft。
- 提供默认步骤。
- 提供常见风险点。
- 提供推荐能力组合。

## 14. Tool Gateway

### 14.1 定位

Tool Gateway 是所有外部读写动作的统一边界。

Agent、Team、Orchestrator、Workflow 都不能绕过它。

### 14.2 工具分类

- read：读取外部数据。
- transform：确定性转换。
- generate：生成资产。
- write：写外部系统。
- external_action：外部副作用动作。

### 14.3 写操作规则

写操作必须：

- 校验 tenant。
- 校验 user role。
- 校验 shop。
- 校验 connector。
- 校验 scope。
- 校验 tool policy。
- 支持 dry-run。
- 创建 approval request。
- 审批通过后执行。
- 写 audit log。

## 15. Approval

### 15.1 审批对象

```text
approval_requests
- id
- tenant_id
- requested_by
- approver_id
- source_type = workflow_run / exploration_run / tool_call
- source_id
- tool_key
- original_diff
- edited_diff
- final_diff
- risk_level
- status = pending / approved / rejected / expired / cancelled
- decision_reason
- created_at
- decided_at
```

### 15.2 审批行为

用户可以：

- 直接批准。
- 编辑后批准。
- 拒绝。
- 要求重做。
- 转交审批。

系统必须记录原始 diff 和最终 diff。

## 16. Memory 与 Knowledge

### 16.1 记忆分层

- session scratch memory。
- user private memory。
- shop memory。
- tenant memory。
- agent memory。

### 16.2 写入规则

Agent 不能直接写长期共享记忆。

只能生成 MemoryCandidate。

MemoryCandidate 需要：

- scope。
- source_run。
- reason。
- risk。
- PII 检查。
- 用户或管理员确认。

## 17. Nango 与 Connector

### 17.1 Nango 定位

Nango 只负责：

- OAuth。
- connection id。
- token refresh。
- provider token。

业务层负责：

- 租户和 shop 映射。
- scope 校验。
- 权限策略。
- Tool Gateway 调用。
- 审计。

Connector 异常要支持：

- missing connection。
- expired token。
- missing scope。
- rate limit。
- provider error。

Workflow / ExplorationRun 可进入 `waiting_connector_auth`。

### 17.2 Connector Gateway

业务系统不能直接把 Nango provider action 暴露给 Agent。

必须经过 Connector Gateway：

```text
Agent / Team / Workflow
  -> Tool Gateway
  -> Connector Gateway
  -> TenantConnectorBinding
  -> Nango connection
  -> Provider API
  -> Normalized Domain Object
  -> Audit
```

Connector Gateway 负责：

- 根据 tenant、workspace、shop 找 connection。
- 校验 scope。
- 校验用户是否能使用该 connection。
- 将 provider error 转换成平台错误。
- 将 provider 原始数据转换成领域对象。
- 对 rate limit、token 失效、scope 缺失提供可恢复状态。

### 17.3 Integration Delegate

为了避免工具 schema 爆炸，Orchestrator 不直接看到所有 Shopify、Amazon、Google、广告平台的底层 action。

它只看到少量受控入口：

```text
delegate_to_integration_agent(
  connector_type,
  business_goal,
  required_action,
  input_summary,
  risk_level
)
```

Integration Agent / Connector Proxy 再把业务目标转成具体工具调用。

例子：

- `connector_type = shopify`
- `business_goal = 读取商品并生成 ListingDiff`
- `required_action = read_products`
- `risk_level = low`

或者：

- `connector_type = shopify`
- `business_goal = 将审批后的 ListingDiff 写回商品`
- `required_action = update_product`
- `risk_level = high`

规则：

- 读写动作必须分离。
- 高风险写动作必须经过 Approval。
- Integration Delegate 不能绕过 Tool Gateway。
- Integration Delegate 的输入输出必须进入 RunGraph。
- 每个 provider action 必须映射到领域动作，而不是暴露 provider 原始接口给通用 Agent。

### 17.4 Nango 不是能力沉淀系统

Nango 不负责优化 Agent、Skill、Workflow。

能力沉淀发生在：

- ExplorationRun。
- RunGraph。
- CapabilityCandidate。
- Capability Registry。
- Skill/Agent/Team/Workflow review。

Nango 只提供第三方系统连接能力。

因此：

- 不把 Skill 存在 Nango。
- 不把业务记忆存在 Nango。
- 不把 Agent 配置存在 Nango。
- 不把 Workflow 版本存在 Nango。
- Nango connection id 可以被能力定义引用，但不能成为能力事实源。

## 18. LLM Provider 与模型路由

### 18.1 模型档位

- fast：意图识别、分类、轻量追问。
- standard：一般生成和分析。
- premium：复杂文案、结构化规划。
- risk_check：合规、风险、写回前检查。
- multimodal：图片理解和图片生成 prompt。

### 18.2 节点级模型策略

不同节点可以用不同模型。

```text
workflow_step_snapshots.model_policy_snapshot
agent_versions.model_policy_snapshot
team_versions.model_policy_snapshot
plan_drafts.model_budget_snapshot
```

### 18.3 高风险规则

高风险步骤不能自动降级到弱模型。

fallback 发生时必须记录：

- from model。
- to model。
- reason。
- cost。
- output quality。

## 19. 核心业务流程

### 19.1 Listing 优化并写回 Shopify

```text
选择商品
  -> 读取 Shopify ProductSnapshot
  -> Listing Optimization Agent
  -> Listing Review Team
  -> ListingDiff
  -> Approval
  -> Shopify write via Tool Gateway
  -> Audit
  -> MemoryCandidate
```

### 19.2 竞品链接到 Shopify 上架

```text
用户给竞品链接
  -> Orchestrator 追问目标市场/品牌规则/店铺
  -> PlanDraft
  -> 竞品采集能力
  -> Product Structuring Agent
  -> Image Brief Skill
  -> Asset Generation Workflow/Skeleton
  -> A+ Page Design Agent
  -> Shopify Import Package Tool
  -> Compliance Review Team
  -> Approval
  -> Shopify create product / media / metafields
```

### 19.3 从独立站数据发现爆品

```text
用户提出模糊目标
  -> Orchestrator 追问指标
  -> 查询内部多站点数据
  -> Product Scoring Skill / Agent
  -> 用户调整过滤条件
  -> 输出候选产品
  -> 生成广告投放建议
  -> 如执行投放，进入 Approval
  -> RunGraph 生成 CapabilityCandidate
```

### 19.4 外部选品研究

```text
用户给品类/市场
  -> Orchestrator 追问
  -> Capability Retrieval 找外部研究能力
  -> 如缺 Google/Amazon 能力，创建 InstallRequest
  -> 外部数据查询
  -> 多来源证据保存
  -> ProductOpportunityReport
```

## 20. API 草案

### 20.1 对话入口

```http
POST /api/chat
```

返回：

```json
{
  "message": "...",
  "conversation_goal_id": "cg_001",
  "plan_draft_id": "pd_001",
  "needs_user_confirmation": true
}
```

### 20.2 PlanDraft

```http
GET /api/plan-drafts/{id}
POST /api/plan-drafts/{id}/confirm
POST /api/plan-drafts/{id}/cancel
```

### 20.3 ExplorationRun

```http
POST /api/exploration-runs
GET /api/exploration-runs/{id}
POST /api/exploration-runs/{id}/resume
POST /api/exploration-runs/{id}/cancel
```

### 20.4 Capability

```http
GET /api/capabilities
GET /api/capabilities/{id}
POST /api/capabilities/search
POST /api/capabilities/{id}/enable
POST /api/capabilities/{id}/disable
```

### 20.5 外部能力安装

```http
POST /api/capability-gaps
POST /api/external-capabilities/search
POST /api/capability-install-requests
POST /api/capability-install-requests/{id}/approve
POST /api/capability-install-requests/{id}/reject
```

### 20.6 Workflow

```http
GET /api/workflows
POST /api/workflow-runs
GET /api/workflow-runs/{id}
POST /api/workflow-runs/{id}/resume
```

### 20.7 Approval

```http
GET /api/approval-requests
POST /api/approval-requests/{id}/approve
POST /api/approval-requests/{id}/reject
POST /api/approval-requests/{id}/approve-with-edits
```

## 21. 数据库核心表分组

### 21.1 租户与身份

- tenants。
- workspaces。
- users。
- memberships。
- roles。
- permissions。

### 21.2 店铺和连接

- shops。
- nango_connections。
- connector_status_events。
- provider_scopes。

### 21.3 对话和计划

- conversations。
- conversation_goals。
- clarification_questions。
- plan_drafts。
- plan_draft_steps。

### 21.4 动态运行

- exploration_runs。
- run_graphs。
- run_graph_nodes。
- run_graph_edges。
- artifacts。
- user_decisions。

### 21.5 能力目录

- capabilities。
- capability_cards。
- capability_versions。
- capability_quality_metrics。
- capability_usage_logs。
- capability_candidates。

### 21.6 Skill / Tool / MCP

- skills。
- skill_versions。
- tools。
- tool_versions。
- mcp_connectors。
- mcp_connector_versions。
- tool_requirement_drafts。

### 21.7 Agent / Team / Workflow

- agent_templates。
- agent_instances。
- agent_versions。
- team_templates。
- team_instances。
- team_versions。
- team_member_snapshots。
- workflow_templates。
- workflow_instances。
- workflow_versions。
- workflow_step_snapshots。
- workflow_skeletons。
- workflow_skeleton_versions。

### 21.8 执行、审批、审计

- agent_runs。
- team_runs。
- workflow_runs。
- workflow_step_runs。
- approval_requests。
- tool_executions。
- audit_logs。
- model_invocations。

### 21.9 记忆和知识

- memory_candidates。
- memories。
- knowledge_sources。
- knowledge_documents。
- embeddings。

## 22. MVP 范围

### 22.1 P0

必须实现：

- Chat 工作台。
- Orchestrator 基础意图理解。
- ConversationGoal。
- PlanDraft。
- Capability Registry 最小版。
- Listing 优化并写回 Shopify Workflow。
- Tool Gateway。
- Approval。
- Nango Shopify。
- Agent/Team/Workflow 版本绑定。
- Audit Log。

### 22.2 P1

尽快实现：

- ExplorationRun。
- RunGraph。
- Capability Retrieval。
- SkillSpec。
- ToolSpec。
- Workflow Skeleton。
- 外部能力安装申请。
- 竞品链接到 Shopify 上架原型。
- 批量任务与部分成功。
- Approval 编辑和拒绝重做。

### 22.3 P2

后续实现：

- 外部能力 marketplace 深度集成。
- 多广告平台。
- 客服外发消息。
- 库存和 ERP。
- 业务归因和效果学习。
- 自动 A/B。

## 23. 验收标准

### 23.1 对话理解

- 用户一次性说完整需求时，AI 能抽取目标、输入、约束和风险。
- 用户逐步表达时，AI 能维护 ConversationGoal。
- AI 不理解时能追问，而不是盲目执行。

### 23.2 能力发现

- AI 能从 Capability Registry 找到合适 Skill / Tool / Agent / Team / Workflow。
- AI 能说明为什么选这些能力。
- 权限不匹配能力不会被选择。
- 未安装外部能力只能生成申请。

### 23.3 稳定 Workflow

- Listing 优化并写回 Shopify 可跑通。
- 写回前必须审批。
- 历史 run 绑定版本。
- 回放不写 Shopify。

### 23.4 开放探索

- PlanDraft 可确认。
- ExplorationRun 能执行动态步骤。
- RunGraph 能记录完整过程。
- 执行后能生成 CapabilityCandidate。

### 23.5 审计和安全

- 所有 tool call 有审计。
- 所有 approval 有审计。
- 所有 capability selection 有记录。
- 所有 external install request 有记录。

## 24. 关键风险

### 24.1 过早固化 Workflow

风险：

跨境电商任务变化大，固化过早会导致系统僵硬。

策略：

优先沉淀 Skill、Tool、Team、Workflow Skeleton。

### 24.2 能力太多找不到

风险：

Skill/MCP/Tool 数量增长后无法发现和治理。

策略：

Capability Registry + Retrieval + 质量评分 + 去重治理。

### 24.3 外部能力风险

风险：

外部 MCP/Skill 可能访问敏感数据或执行不可控动作。

策略：

对话触发、用户确认、管理员审核、沙盒测试、内部 CapabilityCard 转换。

### 24.4 Agent 越权

风险：

Agent 通过工具绕过权限写外部系统。

策略：

Tool Gateway 是唯一外部动作边界。

### 24.5 成本失控

风险：

开放探索和批量任务大量调用模型。

策略：

PlanDraft 显示预算，模型策略按节点控制，batch 有成本上限。

## 25. 最终实现顺序

### 阶段 1：稳定底座

1. FastAPI 基础服务。
2. Postgres schema。
3. Clerk 租户用户映射。
4. Nango Shopify connection。
5. Tool Gateway。
6. Approval。
7. Agno Listing Agent / Team / Workflow。
8. Next.js Chat + Run Timeline。

### 阶段 2：开放对话

1. ConversationGoal。
2. ClarificationQuestion。
3. PlanDraft。
4. Capability Registry 最小版。
5. Capability Retrieval 最小版。
6. ExplorationRun。
7. RunGraph。

### 阶段 3：能力沉淀

1. SkillDraft。
2. WorkflowSkeletonDraft。
3. CapabilityCandidate。
4. Capability review。
5. Capability quality metrics。

### 阶段 4：外部能力

1. CapabilityGap。
2. ExternalCapabilityCandidate。
3. CapabilityInstallRequest。
4. SandboxEvaluation。
5. TenantCapabilityInstallation。

### 阶段 5：复杂业务 case

1. 竞品链接到 Shopify 上架。
2. 独立站爆品发现。
3. Google/Amazon 外部选品研究。
4. 广告投放建议。
5. 批量 Listing 优化。

## 26. 最终结论

本平台最终不是一个“固定工作流工具”，也不是一个“聊天机器人”。

它应该是：

```text
跨境电商开放式对话 Agent 操作系统。
```

它允许用户用自然语言提出开放目标，AI 通过追问和计划确认把目标收敛，再调用已治理的能力执行任务。执行过程全量审计，高风险动作审批，成功经验沉淀为 Skill、Tool、MCP、Team、Workflow Skeleton 或稳定 Workflow。

这个 PRD 的核心转变是：

```text
从 Workflow-first
转向 Conversation + Capability-first。
```

Workflow 仍然重要，但它只是稳定高频流程的执行形态，不是所有业务经验的唯一归宿。

## 27. 后端实现模块拆分

### 27.1 FastAPI 模块建议

```text
backend/app/
- main.py
- core/
  - config.py
  - auth.py
  - tenant_context.py
  - permissions.py
- db/
  - session.py
  - models/
  - migrations/
- conversations/
  - router.py
  - service.py
  - schemas.py
- orchestrator/
  - service.py
  - prompts.py
  - schemas.py
- plan_drafts/
  - router.py
  - service.py
  - schemas.py
- exploration_runs/
  - router.py
  - service.py
  - run_graph.py
- capabilities/
  - router.py
  - registry_service.py
  - retrieval_service.py
  - compatibility_service.py
  - install_service.py
  - definition_service.py
  - quality_service.py
  - schemas.py
- agents/
  - builder.py
  - registry.py
  - runs.py
  - definitions.py
- teams/
  - builder.py
  - runs.py
  - definitions.py
- workflows/
  - builder.py
  - runs.py
  - replay.py
  - skeletons.py
- tool_gateway/
  - router.py
  - service.py
  - policies.py
  - shopify_tools.py
- approvals/
  - router.py
  - service.py
- connectors/
  - nango_service.py
  - connector_gateway.py
  - integration_delegate.py
  - shopify_service.py
- memory/
  - candidates.py
  - policies.py
  - retrieval.py
- llm/
  - model_policy.py
  - invocation_log.py
- audit/
  - service.py
```

产品级 runtime 和 integration 目录建议：

```text
runtime/agno/
- runtime_builder.py
- agent_adapter.py
- team_adapter.py
- workflow_adapter.py
- tool_gateway_adapter.py
- trace_adapter.py

integrations/nango/
- client.py
- connection_resolver.py
- scope_checker.py
- provider_action_proxy.py
- error_mapper.py

integrations/shopify/
- product_reader.py
- product_writer.py
- listing_diff_mapper.py
- payload_builder.py
- domain_models.py
```

### 27.2 Runtime Builder

Runtime Builder 负责把业务配置转换成 Agno runtime 对象。

输入：

- RuntimePlan。
- AgentVersion snapshot。
- TeamVersion snapshot。
- WorkflowVersion snapshot。
- ToolPolicy snapshot。
- ModelPolicy snapshot。
- MemoryPolicy snapshot。

输出：

- Agno Agent。
- Agno Team。
- Agno Workflow。
- Tool Gateway callable。

Runtime Builder 禁止：

- 直接读取未审核 draft。
- 直接暴露 write tool 给普通 Agent。
- 直接使用未授权 Nango connection。

Runtime Builder 还必须支持：

- 按 `runtime_tier` 限制 Agent 能力。
- 按 `delegation_allowed` 和 `max_delegation_depth` 限制委派。
- 按 Capability Definition 生成 runtime tool list。
- 把 Agno trace 转换为平台 `RunGraph`。
- 把 runtime error 转换成可恢复的业务状态。

### 27.3 Capability Retrieval 服务

Capability Retrieval 必须拆成可测试步骤：

```text
build_query()
hard_filter()
semantic_retrieve()
rule_rank()
llm_rerank()
compatibility_check()
explain_selection()
```

每一步都要记录 audit。

### 27.4 外部能力安装服务

支持示例：

- 用户说“抓竞品页面”时发现 Playwright MCP / browser automation 候选。
- 用户说“做产品机会分析”时发现 Superpower 类 Product Research Skill 候选。
- 用户说“看 Google 趋势和 Amazon 评论”时发现 Google Trends / Amazon Research connector 候选。

这些候选能力都不能直接使用，必须走：

```text
ExternalCapabilityCandidate
  -> CapabilityInstallRequest
  -> SandboxEvaluation
  -> CapabilityCard
  -> TenantCapabilityInstallation
```

## 28. 前端实现模块拆分

### 28.1 页面

```text
frontend/app/
- workspace/[workspaceId]/chat
- workspace/[workspaceId]/runs/[runId]
- workspace/[workspaceId]/explorations/[explorationRunId]
- workspace/[workspaceId]/approvals
- workspace/[workspaceId]/capabilities
- workspace/[workspaceId]/capabilities/[capabilityId]
- workspace/[workspaceId]/capability-install-requests
- workspace/[workspaceId]/connectors
- workspace/[workspaceId]/settings/roles
- workspace/[workspaceId]/audit
```

### 28.2 Chat 工作台组件

```text
ChatThread
PlanDraftPanel
ClarificationPrompt
CapabilitySelectionPanel
RunTimeline
ToolCallCard
ApprovalDiffCard
ArtifactGallery
MemoryCandidateCard
CapabilityInstallRequestCard
CostEstimateBadge
RiskBadge
```

### 28.3 前端关键交互

用户应该始终知道：

- AI 现在理解的目标是什么。
- 缺哪些信息。
- AI 准备用哪些能力。
- 哪些能力还没安装。
- 这次执行会不会访问外网。
- 这次执行会不会写 Shopify。
- 预计成本和风险。
- 哪一步需要审批。
- 当前任务卡在哪里。

## 29. 新增技术验证任务清单

基于 case 复核，建议在 `/Users/ske/PrimeAgent/tasks` 后续新增：

| 优先级 | 任务文档 | 目的 |
| --- | --- | --- |
| P0 | `10-开放式对话与PlanDraft验证.md` | 验证意图理解、追问、计划确认、目标变更 |
| P0 | `11-ExplorationRun与RunGraph验证.md` | 验证非固定流程执行、节点记录、证据链、回放 |
| P0 | `12-CapabilityRegistry与能力检索验证.md` | 验证能力卡、能力边界、过滤、检索、排序和选择解释 |
| P0 | `13-外部能力发现申请与安装验证.md` | 验证对话触发的能力缺口、外部候选、安装申请、沙盒和撤销 |
| P0 | `14-Skill与WorkflowSkeleton沉淀验证.md` | 验证 Skill、Tool、Team、Workflow Skeleton 与 Full Workflow 的沉淀边界 |
| P1 | `15-竞品链接到Shopify上架全链路验证.md` | 验证竞品采集、图片资产、A+ 页面、Shopify 导入包和审批写入 |
| P1 | `16-外部研究与选品分析验证.md` | 验证 Google/Amazon 等外部研究、来源证据和选品报告 |
| P1 | `17-批量任务与部分成功验证.md` | 验证批量子任务、部分失败、批量审批、成本上限 |
| P1 | `18-审批编辑拒绝与重做闭环验证.md` | 验证 original_diff、edited_diff、final_diff、多次审批和 revise path |
| P1 | `19-前端PlanDraft与任务执行体验验证.md` | 验证对话、计划确认、能力选择、审批、运行时间线 |

## 30. 第一版可编码切片

### Slice 1：Listing 稳定 Workflow

目标：

- 跑通最小商业闭环。

包含：

- Shopify mock / real read。
- Listing Agent。
- Listing Review Team。
- ListingDiff。
- Approval。
- Shopify mock / real write。
- Audit。

### Slice 2：PlanDraft 对话

目标：

- 用户开放表达时，AI 能追问和生成计划。

包含：

- ConversationGoal。
- ClarificationQuestion。
- PlanDraft。
- PlanDraft 前端确认。

### Slice 3：Capability Registry 最小版

目标：

- AI 能从结构化能力目录找能力。

包含：

- CapabilityCard。
- SkillSpec。
- ToolSpec。
- Capability search。
- Hard filter。
- selection explanation。

### Slice 4：ExplorationRun

目标：

- 不固定 Workflow 的任务也能执行和追踪。

包含：

- ExplorationRun。
- RunGraph。
- Artifact。
- UserDecision。
- CapabilityCandidate。

### Slice 5：外部能力申请

目标：

- 用户对话中缺能力时能发现候选并申请安装。

包含：

- CapabilityGap。
- ExternalCapabilityCandidate。
- CapabilityInstallRequest。
- SandboxEvaluation。
- TenantCapabilityInstallation。

## 31. 最终 PRD Check 清单

### Conversation

- [ ] 用户一次说完整需求可解析。
- [ ] 用户逐步表达可维护上下文。
- [ ] 用户中途改目标可更新 PlanDraft。
- [ ] AI 不理解时必须追问。

### Capability

- [ ] 每个能力都有 CapabilityCard。
- [ ] 每个 Skill 都有 SkillSpec。
- [ ] 每个 Tool/MCP 都有边界说明。
- [ ] Capability Retrieval 不越权。
- [ ] 外部能力不能静默安装。

### Execution

- [ ] 稳定任务走 WorkflowRun。
- [ ] 开放任务走 ExplorationRun。
- [ ] RunGraph 记录完整证据。
- [ ] 高风险动作必须 Approval。
- [ ] Tool Gateway 是唯一外部动作边界。

### Governance

- [ ] Agent/Team/Workflow/Skill/Tool/MCP 都有版本。
- [ ] active 版本不可原地修改。
- [ ] draft 不能直接生产执行。
- [ ] 回放不能写外部系统。
- [ ] 能力可禁用和撤销。
