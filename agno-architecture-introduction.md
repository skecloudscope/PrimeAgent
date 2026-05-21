# Agno Agent 架构介绍

本文基于本地源码 `/Users/ske/agent/agno` 阅读整理，目标不是复刻源码细节，而是把 Agno 作为「可多租户、自定义 Agent、可控记忆和权限的 Agent 平台底座」时最重要的架构逻辑说明清楚。

## 一句话定位

Agno 不是一个简单的 Agent Demo 框架，而是一个偏生产化的 Agent 平台 SDK。它的核心能力包括：

- 单 Agent 运行时。
- 多 Agent 编排。
- Workflow 流程编排。
- AgentOS API 服务层。
- 会话、记忆、知识库、指标、评估、追踪、审批、计划任务等平台存储。
- 工具体系和第三方集成体系。
- JWT / scope 级别的访问控制。

从源码结构看，Agno 更像一个「后端 Agent 平台内核」，而不是一个带完整业务前端的产品。

## 许可证

本地 Agno 仓库使用 Apache License 2.0。对于商业项目来说，这比 GPLv3 友好很多，可以作为你的跨境电商 Agent 商业框架的后端底座候选。

## 核心目录

主要源码位于：

`/Users/ske/agent/agno/libs/agno/agno`

重要模块如下：

- `agent/`：单个 Agent 的定义和运行逻辑。
- `team/`：多个 Agent 或 Team 的协作编排。
- `workflow/`：更确定性的流程编排。
- `os/`：AgentOS，负责把 Agent、Team、Workflow、Knowledge 等暴露成 FastAPI 服务。
- `tools/`：工具函数、Toolkit、工具调用、人工确认、外部执行等能力。
- `models/`：模型适配层。
- `db/`：数据库抽象和各类存储对象。
- `memory/`：用户记忆管理。
- `knowledge/`：知识库与 RAG。
- `vectordb/`：向量数据库适配。
- `approval/`：工具审批与审计。
- `scheduler/`：定时任务和后台调度。
- `tracing/`：运行追踪。
- `eval/`：评估体系。
- `registry/`：组件注册。

## 总体分层

Agno 可以按下面几层理解。

### 1. 运行对象层

这一层是实际做事的对象：

- `Agent`
- `Team`
- `Workflow`

`Agent` 负责一次具体对话或任务执行。它可以绑定模型、工具、知识库、记忆、DB、上下文、依赖、输出结构、hooks、guardrails 等。

`Team` 负责把多个 Agent 或 Team 组织起来。它不是简单列表，而是有模式的协作单元。

`Workflow` 负责把 Agent、Team、函数、子 Workflow 组合成确定性的执行流程，适合稳定业务链路。

### 2. 平台服务层

这一层主要是 `AgentOS`。

AgentOS 将 Agent、Team、Workflow、Knowledge、DB、接口适配器、认证、调度、追踪等能力整合成一个 FastAPI 应用。它提供类似平台后端的 API 能力，例如：

- 查看可用 Agents。
- 运行 Agent。
- 查看和恢复 session。
- 管理 memory。
- 管理 knowledge。
- 查看 metrics。
- 查看 traces。
- 管理 approvals。
- 管理 schedules。
- 暴露 teams 和 workflows。

如果你要做一个多租户 Agent 平台，AgentOS 是最接近「平台骨架」的位置。

### 3. 存储抽象层

Agno 的 `BaseDb` 把平台内的关键数据统一抽象出来，默认表名包括：

- `agno_sessions`
- `agno_memories`
- `agno_knowledge`
- `agno_metrics`
- `agno_eval_runs`
- `agno_traces`
- `agno_spans`
- `agno_components`
- `agno_component_configs`
- `agno_component_links`
- `agno_learnings`
- `agno_schedules`
- `agno_schedule_runs`
- `agno_approvals`

这说明 Agno 已经把 Agent 平台里常见的持久化对象都抽象好了：会话、记忆、知识、指标、评估、追踪、组件配置、学习结果、调度和审批。

但这也意味着，如果你要做 SaaS 多租户，需要在 Agno 的 DB 使用方式外再补一层租户隔离设计。Agno 有 user_id 和 resource scope，但你的业务上还需要明确 `tenant_id / workspace_id / shop_id / connector_id / agent_id` 这些边界。

### 4. 工具体系层

Agno 的工具层由 `Function` 和 `Toolkit` 构成。

`Function` 是模型可调用工具的标准描述，它包含：

- 工具名。
- 工具描述。
- JSON Schema 参数。
- 实际执行函数。
- 前后置 hook。
- 是否需要确认。
- 是否需要用户输入。
- 是否外部执行。
- 是否停止在工具调用后。
- 是否显示工具结果。
- 是否缓存结果。
- 审批类型。

`Toolkit` 是一组工具的集合，可以按 include / exclude 控制暴露哪些工具，也可以给某些工具加确认、外部执行、缓存等行为。

这对你的项目很关键。Nango 连接到的平台，比如 Shopify、Amazon、TikTok Shop、ERP、仓储、广告平台，都可以被封装成 Agno Toolkit。每个租户授权后的 connector，可以在运行时生成该租户可用的工具集合。

### 5. 记忆层

Agno 的 `MemoryManager` 负责用户记忆的读写、更新、删除和清理。它可以使用模型判断哪些内容应该被写入记忆，并把记忆落到 DB。

记忆支持按 `user_id` 读取。Agent 或 Team 可以接入 memory manager，把长期偏好、业务事实、操作习惯、历史决策等纳入上下文。

对你的平台来说，Agno 的记忆层可以作为基础能力，但需要额外加「可控记忆」产品规则：

- 哪些记忆允许自动写入。
- 哪些记忆必须用户确认。
- 哪些记忆只属于个人。
- 哪些记忆属于店铺。
- 哪些记忆属于某个 Agent。
- 哪些记忆可以跨 Agent 共享。
- 哪些记忆会过期或需要复审。

### 6. 知识库层

Agno 的 `Knowledge` 负责内容导入和检索。它支持从 path、url、文本内容、topic、remote content 等来源插入知识，并连接 vector_db 做检索。

它同时有 `contents_db` 和 `vector_db` 两个概念：

- `contents_db` 更偏内容元数据和内容记录。
- `vector_db` 负责向量检索。

源码里有 `isolate_vector_search` 设计，用于多个 Knowledge 实例共享同一个向量库时做隔离。这对多租户很重要，但仍建议在业务层显式设计 metadata 过滤，例如 `tenant_id / workspace_id / agent_id / knowledge_scope`。

### 7. 审批与 HITL 层

Agno 支持工具级审批。`@approval` 可以把某个工具标记为：

- `required`：阻塞式审批，审批通过前 run 不能继续。
- `audit`：非阻塞审计记录。

工具本身也支持：

- `requires_confirmation`
- `requires_user_input`
- `external_execution`

这套能力非常适合跨境电商场景中的高风险动作，例如：

- 修改商品价格。
- 删除商品。
- 批量更新库存。
- 调整广告预算。
- 发送客户消息。
- 提交退款。
- 创建采购单。
- 修改店铺配置。

建议把所有会改变外部系统状态的工具默认设为需要确认，成熟后再按租户、角色、金额、风险等级逐步放开。

### 8. 权限层

Agno 的 AgentOS 有两类权限机制：

- 简单 security key。
- JWT + scopes。

scope 的格式大致是：

- `agents:read`
- `agents:<agent-id>:run`
- `agents:*:run`
- `teams:read`
- `workflows:<workflow-id>:run`
- `memories:read`
- `knowledge:write`
- `approvals:write`
- `agent_os:admin`

源码中已经有资源级访问检查，例如用户是否可以 read/run 某个 agent、team、workflow。

这对你的项目是好基础，但它还不是完整的 SaaS RBAC。你仍然需要在业务层补：

- tenant 级隔离。
- workspace / shop 级隔离。
- 用户角色。
- connector 权限。
- agent 权限。
- 工具权限。
- 数据范围权限。
- 审批权限。

Agno 的 scope 可以作为底层 API 权限，业务权限建议单独建表和策略层。

## Agent

`Agent` 是 Agno 最核心的运行对象。

一个 Agent 可以配置：

- 模型。
- fallback 模型。
- user_id。
- session_id。
- session state。
- DB。
- memory manager。
- knowledge。
- tools。
- skills。
- dependencies。
- system message。
- instructions。
- structured output。
- input / output guardrails。
- hooks。
- reasoning。
- media 输入输出。
- run history。
- session summary。

Agent 的运行逻辑不只是「调用一次 LLM」。它会处理：

- 初始化运行上下文。
- 加载 session。
- 加载历史消息。
- 加载记忆。
- 检索知识库。
- 构造系统消息和用户消息。
- 调用模型。
- 执行工具。
- 处理工具确认、用户输入、外部执行。
- 流式返回事件。
- 持久化运行结果。
- 更新 session metrics。
- 写入记忆或 summary。
- 处理取消和异常。

所以 Agno 的 Agent 已经接近一个生产级 Agent runtime。

## Team

`Team` 用来组织多个 Agent 或其他 Team。它支持几种协作模式：

- `coordinate`：协调模式，由 Team 进行整体调度。
- `route`：路由模式，把任务交给最合适的成员。
- `broadcast`：广播模式，让多个成员都处理。
- `tasks`：任务模式，更像任务拆分和执行。

Team 本身也可以有模型、工具、知识库、记忆、DB、session、hooks、guardrails、structured output 等配置。

对你的跨境电商平台来说，Team 适合做「业务工作台级编排」：

- Listing 优化 Team。
- 广告投放 Team。
- 售后处理 Team。
- 竞品分析 Team。
- 供应链补货 Team。
- 财务利润分析 Team。

每个 Team 内部可以挂多个专家 Agent。

## Workflow

`Workflow` 是更确定性的流程层。它由多个 Step 组成，每个 Step 可以包装：

- Agent。
- Team。
- 普通函数。
- 子 Workflow。

Step 支持：

- 重试。
- 输入校验。
- 用户确认。
- 用户输入。
- 输出审核。
- 错误处理。
- 拒绝处理。
- 超时处理。

Workflow 支持：

- 顺序执行。
- 条件执行。
- 循环。
- 并行。
- 路由。
- 暂停和恢复。
- 后台运行。
- 流式事件。
- 持久化。

这对商业框架非常重要。实际业务里，很多跨境电商任务不应该完全交给 Agent 自由发挥，而应该用 Workflow 固化主链路，把 Agent 放在某些需要理解、生成、判断的节点。

例如「Listing 优化」可以是：

1. 拉取商品数据。
2. 拉取竞品数据。
3. 分析关键词。
4. 生成标题和五点描述。
5. 做合规检查。
6. 请求人工确认。
7. 写回 Shopify 或 Amazon。
8. 记录版本和效果。

这里 1、2、7、8 更像工具和系统动作，3、4、5 更适合 Agent。

## AgentOS

AgentOS 是 Agno 的平台服务入口。它把本地定义的 agents、teams、workflows、knowledge、db 等挂到 FastAPI 应用中，并提供 API。

从源码看，AgentOS 的 router 覆盖了：

- agents
- teams
- workflows
- sessions
- memory
- knowledge
- approvals
- metrics
- traces
- evals
- schedules
- registry
- database
- health

它也处理：

- CORS。
- auth dependency。
- JWT middleware。
- user scope。
- SSE streaming。
- resumable run。
- background run。
- scheduler internal token。
- remote agent / team / workflow 的 token 转发。

如果你选择 Agno 做后端，AgentOS 可以先作为内部 API 服务，不一定直接暴露给前端。你可以在它上面再包一层自己的业务 API。

## 单 Agent 运行流程

一个典型 Agent run 可以理解为：

1. 前端或业务 API 发起 run 请求。
2. AgentOS router 校验认证和资源权限。
3. 解析 message、session_id、user_id、图片、音频、视频、文件等输入。
4. 找到对应 Agent。
5. Agent 加载 session、history、memory、knowledge。
6. Agent 组装 prompt 和上下文。
7. 模型生成响应或工具调用。
8. 如果工具需要确认或外部执行，run 暂停。
9. 如果工具可直接执行，则调用工具并把结果回传模型。
10. 输出最终结果。
11. 保存 session、run、metrics、trace。
12. 可能更新 memory 或 summary。

## 多 Agent 运行流程

Team 的运行可以理解为：

1. 用户请求进入 Team。
2. Team 根据 mode 决定是协调、路由、广播还是任务拆分。
3. Team 把输入、上下文、历史、知识、记忆传递给成员 Agent。
4. 成员 Agent 各自执行。
5. Team 汇总或选择结果。
6. 返回给用户或进入下一步 Workflow。

在你的平台中，可以把「跨境电商业务助手」做成 Team，把「商品、广告、客服、库存、利润、竞品」做成成员 Agent。

## Workflow 运行流程

Workflow 的运行可以理解为：

1. 用户或系统触发一个业务流程。
2. Workflow 按 Step 执行。
3. 每个 Step 调用 Agent、Team、函数或子 Workflow。
4. 风险步骤可以暂停等待用户确认。
5. 外部系统写操作通过工具执行。
6. 失败时走重试、错误处理或人工介入。
7. 全流程状态持久化，支持后台执行和恢复。

建议你把稳定可售卖的业务能力沉淀成 Workflow，而不是只沉淀成 Agent。

## 对跨境电商 Agent 平台的映射

可以按下面方式设计第一版。

### 平台层

自建业务后端，负责：

- tenant。
- workspace。
- shop。
- user。
- role。
- connector。
- agent 配置。
- agent 权限。
- 工具权限。
- 记忆策略。
- 审批策略。
- 计费。

Agno 负责：

- Agent runtime。
- Team runtime。
- Workflow runtime。
- 工具调用。
- session。
- memory。
- knowledge。
- approval。
- traces。
- metrics。

Nango 负责：

- OAuth 授权。
- token 存储和刷新。
- 第三方 API 连接。
- connection_id 管理。
- webhook 或 sync 的部分连接能力。

### Agent 层

可以把每一个业务专家定义为一个 Agno Agent：

- 商品 Listing Agent。
- 广告优化 Agent。
- 客服回复 Agent。
- 竞品分析 Agent。
- 利润分析 Agent。
- 库存补货 Agent。
- 物流异常 Agent。
- 数据报表 Agent。

每个 Agent 都应该有：

- 明确业务边界。
- 可用工具列表。
- 可读知识范围。
- 可读记忆范围。
- 可写记忆策略。
- 是否允许执行外部写操作。
- 输出结构。
- 风险等级。

### Team 层

可以把跨场景任务定义为 Team：

- 增长 Team：广告 Agent + Listing Agent + 竞品 Agent。
- 运营 Team：库存 Agent + 物流 Agent + 售后 Agent。
- 利润 Team：利润 Agent + 广告 Agent + 采购 Agent。
- 店铺体检 Team：数据 Agent + 商品 Agent + 风险 Agent。

Team 负责多 Agent 协作，但不建议一开始把所有能力放进一个万能 Team。商业产品更需要边界清楚、结果稳定。

### Workflow 层

可以把可售卖的标准任务定义为 Workflow：

- 新品上架 Workflow。
- Listing 优化 Workflow。
- 广告预算调整 Workflow。
- 差评处理 Workflow。
- 断货预警 Workflow。
- 利润复盘 Workflow。
- 竞品监控 Workflow。
- 批量改价 Workflow。

Workflow 是以后产品化、计费、SOP、权限审批和效果追踪的核心。

### Tool 层

所有外部平台操作都应该工具化：

- `shopify_get_products`
- `shopify_update_product`
- `amazon_get_listing`
- `amazon_update_listing`
- `tiktok_get_orders`
- `erp_get_inventory`
- `ads_get_campaigns`
- `ads_update_budget`

Nango 不直接变成 Agent 记忆或平台存储。它更适合变成工具执行时的连接层：

1. 工具收到 tenant_id、connector_id、connection_id。
2. 工具向 Nango 获取访问凭证或代理请求。
3. 工具调用外部平台 API。
4. 工具把结果返回给 Agent。
5. 业务后端记录操作日志、审批记录和版本。

## 建议的第一版架构

第一版可以用这个结构：

```text
前端对话 / 工作台
        |
自建业务 API
        |
权限策略 / 租户策略 / Agent 配置 / 工具策略 / 记忆策略
        |
Agno AgentOS 或自定义 Agno Runtime Service
        |
Agent / Team / Workflow
        |
Agno Tools / Custom Toolkits
        |
Nango
        |
Shopify / Amazon / TikTok Shop / ERP / Ads / WMS
```

数据库建议：

- Postgres 作为主业务库。
- Agno DB 表可以先放同一个 Postgres，但需要加租户隔离字段或业务侧映射。
- 向量库可以用 pgvector、Qdrant、Weaviate 等，第一版用 pgvector 更容易收敛。
- Nango 使用自己的连接存储，不要把它当成 Agent 平台主存储。

## 关键设计判断

### Agno 能否实现类似 OpenHuman 的 Agent 能力

可以实现，而且在「后端平台化」方面更适合商业项目。Agno 本身已经有 Agent、Team、Workflow、Memory、Knowledge、Tool、Approval、AgentOS、RBAC、Scheduler、Tracing 等模块。

但 Agno 不等于完整 OpenHuman 产品。你仍然需要自己做：

- 前端工作台。
- Agent 创建和配置 UI。
- 租户体系。
- 业务权限体系。
- 工具市场或工具配置。
- 记忆管理 UI。
- 审批中心。
- 知识库管理 UI。
- 操作审计。
- 业务模板。
- 计费和套餐。

### 自定义 Agent 怎么落地

不要一开始让用户完全自由创建任意 Agent。更适合先做「模板化自定义」：

- 选择业务类型。
- 选择可用平台连接。
- 选择工具权限。
- 选择知识库。
- 选择记忆范围。
- 选择审批策略。
- 填写业务偏好。
- 生成 Agent 配置。

底层可以映射成 Agno Agent 配置。

### 多 Agent 调用怎么落地

三种方式可以并存：

- 简单任务：直接调用某个 Agent。
- 跨领域任务：调用 Team。
- 稳定业务流程：调用 Workflow。

建议产品上把 Workflow 放到最重要的位置，因为商业客户买的是稳定完成某项工作，而不是看 Agent 自由聊天。

### 可控记忆怎么落地

Agno 有 MemoryManager，但产品上要加策略：

- 自动记忆：低风险偏好和事实。
- 待确认记忆：业务规则、价格策略、客户沟通风格。
- 禁止记忆：敏感凭证、支付信息、隐私数据。
- 可见范围：个人、店铺、团队、Agent、全局。
- 生命周期：永久、阶段性、过期、人工复审。
- 变更记录：谁创建、谁确认、哪个 Agent 使用过。

### 权限怎么落地

Agno 的 scope 可以管 AgentOS API 资源访问，但你的平台还要管业务权限。

建议拆成三层：

1. SaaS 权限：tenant、workspace、shop、role。
2. Agent 权限：谁能看、谁能运行、谁能配置某个 Agent。
3. Tool 权限：某个 Agent 是否能读、写、批量写、删除、调预算、发消息。

高风险工具默认走审批。

## 和 Nango 的关系

Nango 在这个架构里不是 Agent 的记忆系统，也不是 Agent 的优化系统。

Nango 更适合负责：

- 第三方 OAuth。
- access token / refresh token。
- connection_id。
- 多平台 API 连接。
- 部分同步任务。
- webhook 接入。

Agno 更适合负责：

- Agent 怎么思考和执行。
- Agent 怎么调用工具。
- Agent 怎么管理 session。
- Agent 怎么用 memory。
- Agent 怎么用 knowledge。
- Agent 怎么审批和追踪。

你的业务后端负责把两者粘起来，并建立多租户、权限、配置和审计。

## 推荐下一步

建议后续继续落盘几个更具体的设计文档：

1. `cross-border-agent-domain-model.md`
   - tenant、workspace、shop、user、role、agent、tool、connector、memory、approval 的业务模型。

2. `cross-border-agent-runtime-design.md`
   - Agno Agent / Team / Workflow 在项目中的运行方式。

3. `cross-border-agent-nango-tools-design.md`
   - Nango connector 如何变成 Agno Toolkit。

4. `cross-border-agent-memory-policy.md`
   - 可控记忆的分类、权限、写入、审核和删除策略。

5. `cross-border-agent-permission-design.md`
   - SaaS RBAC + Agent 权限 + Tool 权限 + 审批策略。

6. `cross-border-agent-first-workflows.md`
   - 第一批可产品化的跨境电商 Workflow。

## 结论

Agno 适合做你的后端 Agent 平台底座，尤其适合承载：

- 专家 Agent。
- 多 Agent Team。
- 标准业务 Workflow。
- 工具调用。
- 可审批操作。
- 会话、记忆、知识和追踪。

但 Agno 不应该直接等同于最终产品。你的商业框架真正的壁垒会在：

- 跨境电商业务对象建模。
- 高质量 Agent 模板。
- Nango 工具体系。
- 可控记忆。
- 权限和审批。
- 可复用 Workflow。
- 前端工作台体验。

因此，推荐策略是：Agno 做 Agent runtime，Nango 做第三方连接，自建业务后端做多租户和商业产品层。
