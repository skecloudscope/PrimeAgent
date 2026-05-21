# 09 Agent Registry 与组件发现验证

## 一句话结论

Agno 的 `Registry` 可以作为运行时对象注册表，用来让 Agno 找到不可序列化的 Python 对象，例如 Tool、Model、DB、VectorDB、Schema、Function、代码定义的 Agent、代码定义的 Team。

但是它不是我们的产品级 Agent Registry。跨境电商 Agent 平台必须自建业务 Registry，用来管理租户可见性、权限、版本、审核、发布状态、行业场景、Shopify 店铺范围、工具策略、模型策略、记忆策略和运行时解析。

最终架构定为：

```text
前端工作台
  -> 业务 Registry API
  -> 解析当前租户可用的 Agent / Team / Workflow / Tool / ModelPolicy
  -> 生成 Runtime Plan
  -> Runtime Builder 构造 Agno Agent / Team / Workflow
  -> Agno Registry 只负责补齐 Python callable / schema / db / model / tool 对象
```

## 本次验证范围

本文件验证四件事：

1. Agno Registry 到底管理什么。
2. Agno Components API 是否能保存 Agent、Team、Workflow 配置版本。
3. AgentFactory 是否适合动态创建按租户、按店铺、按版本的 Agent。
4. 我们自己的业务 Registry 应该如何设计，才能支撑跨境电商垂类 Agent 平台。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/registry/registry.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/registry/registry.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/components/components.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/schema.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/postgres/postgres.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/factory.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/utils.py`

## Agno Registry 源码结论

### 1. Agno Registry 是运行时对象表

`Registry` 是一个 dataclass，核心字段包括：

| 字段 | 含义 | 对我们的价值 |
| --- | --- | --- |
| `tools` | Toolkit、Function、callable 工具 | 运行时找工具函数 |
| `models` | Agno Model 实例 | 运行时找模型对象 |
| `dbs` | DB 实例 | 运行时解析 DB 引用 |
| `vector_dbs` | VectorDB 实例 | 运行时解析向量库对象 |
| `schemas` | Pydantic schema | 运行时解析结构化输入输出 |
| `functions` | 普通 callable | Workflow 条件、router、selector 等函数 |
| `agents` | 代码定义的 Agent | Workflow rehydrate 时找 Agent |
| `teams` | 代码定义的 Team | Workflow rehydrate 时找 Team |

它提供的方法也说明了它的定位：

| 方法 | 用途 |
| --- | --- |
| `rehydrate_function` | 从序列化 Function dict 恢复 Function，并重新挂载 entrypoint |
| `get_schema` | 按 schema 名称查 Pydantic class |
| `get_db` | 按 DB id 查 DB 对象 |
| `get_function` | 按函数名查 callable |
| `get_agent` | 按 Agent id 查代码定义 Agent |
| `get_team` | 按 Team id 查代码定义 Team |
| `get_all_component_ids` | 返回 Registry 中代码定义的 Agent/Team id |

结论：

Agno Registry 的目标是“让运行时能恢复 Python 对象”，不是“给 SaaS 前端展示一个租户可用的 Agent 商店”。

### 2. Agno Registry Router 是内部 introspection API

`agno/os/routers/registry/registry.py` 暴露 `GET /registry`，支持按类型和名称过滤。

支持的 `RegistryResourceType`：

| 类型 | 含义 |
| --- | --- |
| `tool` | 工具或工具包 |
| `model` | 模型 |
| `db` | 数据库 |
| `vector_db` | 向量库 |
| `schema` | Pydantic schema |
| `function` | callable 函数 |
| `agent` | 代码定义 Agent |
| `team` | 代码定义 Team |

Router 会提取工具函数签名、参数 schema、是否需要 confirmation、是否 external execution、model provider、db id、vector collection、schema json 等信息。

这个 API 对开发调试很有价值，但对产品前台不够：

| 产品需求 | Agno Registry Router 是否满足 | 说明 |
| --- | --- | --- |
| tenant 隔离 | 不满足 | 没有 tenant_id、organization_id、shop_id 维度 |
| 权限过滤 | 不满足 | 没有 RBAC、Plan、Role、Scope |
| Agent 审核发布 | 不满足 | 没有 review、approval、release event |
| Agent 版本 | 不完整 | 可看到对象，但不是业务版本目录 |
| Workflow 商业状态 | 不满足 | 没有业务流程状态、适用场景、禁用原因 |
| Shopify 店铺范围 | 不满足 | 没有 shop connection、store scope |
| 记忆策略 | 不满足 | 没有 MemoryPolicy 业务绑定 |
| 模型预算策略 | 不满足 | 没有 tenant budget、model tier、cost control |

### 3. Agno Components API 可以参考，但不能直接等同业务 Registry

`agno/os/routers/components/components.py` 提供了 Agent、Team、Workflow 的组件配置管理：

| 能力 | 源码表现 | 结论 |
| --- | --- | --- |
| 创建 component | `POST /components` | 可创建 agent/team/workflow 配置 |
| 配置版本 | `POST /components/{id}/configs` | 可创建新版本 |
| 草稿修改 | `PATCH /components/{id}/configs/{version}` | draft 可编辑 |
| published 不可变 | DB 层禁止更新 published config | 适合借鉴 |
| current version | `set-current` 只能指向 published version | 适合借鉴 |
| rollback | 切换 current_version | 适合借鉴 |
| component links | links 要求 `child_version` | 适合 Team/Workflow 锁版本 |

但是它仍然不是完整业务 Registry：

- component 类型只有 `agent/team/workflow`。
- 没有 `tenant_id`。
- 没有业务审核表。
- 没有发布人、审核人、回滚原因、灰度比例。
- 没有按行业场景、店铺、角色、套餐过滤。
- 没有 ToolGatewayPolicy、ModelPolicy、MemoryPolicy。
- 没有 Nango connection 绑定。
- 没有 Shopify scope 和危险操作约束。

所以我们应该吸收它的设计思想，但业务库必须自己建。

### 4. AgentFactory 适合做动态运行时构造入口

`AgentFactory` 继承 `BaseFactory`。核心模式是：

```text
AgentOS 注册一个 factory id
每次请求带入 RequestContext
Factory 校验 factory_input
Factory 基于 trusted claims / scopes / input 构造一个新的 Agent
BaseFactory 强制 produced component.id = factory.id
BaseFactory 自动挂载 db
AgentFactory 调用 initialize_agent
```

`RequestContext` 包含：

| 字段 | 含义 |
| --- | --- |
| `user_id` | 用户 id |
| `session_id` | 会话 id |
| `request` | FastAPI Request |
| `input` | 已校验的 factory_input |
| `trusted.claims` | 由可信中间件注入的 JWT claims |
| `trusted.scopes` | 由可信中间件注入的权限 scopes |

这对我们的意义很大：

```text
业务 Registry 决定这个租户、用户、店铺能用哪个 AgentVersion
Runtime Builder 根据 AgentVersionSnapshot 构造 Agno Agent
AgentFactory 作为 AgnoOS 的 per-request 入口
```

但是有一个关键限制：

Factory 自身不是产品目录。Factory 是运行时构造器，不负责业务发现、审核、版本治理、权限治理。

## 平台最终设计决定

### 业务 Registry 必须自建

我们建立自己的 `Business Registry`，它是跨境电商 Agent 平台的“组件目录 + 版本中心 + 权限中心 + 运行时解析中心”。

它管理：

- Agent 模板、实例、版本。
- Team 模板、实例、版本。
- Workflow 模板、实例、版本。
- Tool 定义、版本、危险等级、审批策略。
- Model Provider、Model Tier、租户模型策略、预算策略。
- Memory Policy、Knowledge Source、数据保留策略。
- Nango Integration、Connection、Provider Config。
- 发布审核、回滚、禁用、审计。
- 行业场景分类，例如 Listing、广告、客服、库存、竞品、利润。

### Agno Registry 只在运行时使用

Agno Registry 在我们的系统里只承担以下职责：

1. 注册 Python 工具函数，例如 `shopify_get_product`、`shopify_update_product_draft`。
2. 注册 Pydantic 输入输出 schema，例如 `ListingOptimizationInput`、`ListingWriteBackPlan`。
3. 注册 DB、VectorDB、Model 对象。
4. 让 Workflow 反序列化时能找回 function、schema、tool entrypoint。
5. 给内部开发页面展示 runtime resource introspection。

它不直接暴露给普通租户前端。

### Agno Components 可作为内部配置层或参考实现

短期 MVP 不强依赖 Agno Components API。我们的业务 Registry 表先落在 FastAPI + Postgres。

可以借鉴 Agno Components 的规则：

- draft 版本可编辑。
- published 版本不可变。
- current_version 只允许指向 published。
- Team/Workflow 通过 links 锁 child_version。
- rollback 只切换 current_version，不修改历史版本。

后续如果需要兼容 AgnoOS UI 或复用 Agno component config，可在业务 Registry 发布后同步一份 Agno component config，但不能反过来让 Agno component config 成为唯一事实源。

## 业务 Registry 核心数据模型

### Agent

```text
agent_templates
- id
- key
- name
- description
- vertical = cross_border_ecommerce
- category = listing / ads / customer_service / inventory / competitor / finance
- owner_type = platform / tenant
- created_by
- status = active / archived

agent_instances
- id
- tenant_id
- template_id
- shop_scope = all / selected_shops
- name
- description
- active_version_id
- status = draft / active / paused / archived

agent_versions
- id
- agent_instance_id
- version
- name
- instructions_snapshot
- tools_snapshot
- model_policy_snapshot
- memory_policy_snapshot
- knowledge_sources_snapshot
- output_schema_snapshot
- guardrails_snapshot
- release_status = draft / in_review / approved / published / rejected / deprecated
- created_by
- reviewed_by
- published_by
- created_at
- published_at
```

### Team

```text
team_templates
- id
- key
- name
- category
- description

team_instances
- id
- tenant_id
- template_id
- active_version_id
- status

team_versions
- id
- team_instance_id
- version
- mode = route / coordinate / broadcast / tasks
- members_snapshot
- routing_policy_snapshot
- output_merge_policy_snapshot
- release_status

team_member_snapshots
- id
- team_version_id
- member_type = agent / team
- member_instance_id
- member_version_id
- role_name
- position
- required = true / false
```

### Workflow

```text
workflow_templates
- id
- key
- name
- category
- description

workflow_instances
- id
- tenant_id
- template_id
- active_version_id
- status

workflow_versions
- id
- workflow_instance_id
- version
- entry_schema_snapshot
- steps_snapshot
- approval_policy_snapshot
- error_policy_snapshot
- replay_policy_snapshot
- release_status

workflow_step_snapshots
- id
- workflow_version_id
- step_key
- step_type = function / agent / team / workflow / approval / tool
- component_instance_id
- component_version_id
- input_mapping
- output_mapping
- retry_policy
- timeout_seconds
- position
```

### Tool 与权限

```text
tool_definitions
- id
- key
- name
- provider = shopify / platform / internal
- operation_type = read / write / delete / external_action
- risk_level = low / medium / high / critical
- description

tool_versions
- id
- tool_definition_id
- version
- input_schema_snapshot
- output_schema_snapshot
- runtime_callable_key
- nango_integration_key
- required_provider_scopes
- status = draft / published / deprecated

tool_gateway_policies
- id
- tenant_id
- tool_definition_id
- allowed_roles
- approval_required
- dry_run_required
- max_batch_size
- allowed_shop_scope
- audit_level
```

### Model 与记忆

```text
model_providers
- id
- provider = openai / anthropic / google / deepseek / groq
- key_mode = platform_managed / tenant_managed
- status

model_tiers
- id
- key = fast / balanced / premium / reasoning
- provider
- model_id
- default_temperature
- max_output_tokens
- cost_weight

tenant_model_policies
- id
- tenant_id
- allowed_tiers
- default_tier
- monthly_budget
- per_run_budget
- fallback_policy

memory_policies
- id
- tenant_id
- key
- scope = user / shop / agent / workflow / tenant
- retention_days
- pii_policy
- writable_by_agent
- readable_by_agent
```

## 业务 Registry API 草案

### 前端发现可用 Agent

```http
GET /api/registry/agents?category=listing&shop_id=xxx
```

返回：

```json
{
  "data": [
    {
      "agent_instance_id": "agt_listing_optimizer",
      "name": "Listing 优化 Agent",
      "category": "listing",
      "active_version": 3,
      "status": "active",
      "capabilities": ["title", "bullet_points", "description", "seo_keywords"],
      "allowed_actions": ["run", "preview"],
      "write_tools_enabled": false
    }
  ]
}
```

### 前端发现可用 Workflow

```http
GET /api/registry/workflows?category=listing&shop_id=xxx
```

返回：

```json
{
  "data": [
    {
      "workflow_instance_id": "wf_listing_optimize_writeback",
      "name": "Listing 优化并写回 Shopify",
      "active_version": 2,
      "requires_approval": true,
      "supported_inputs": ["shopify_product_id", "manual_listing_draft"],
      "allowed_actions": ["run", "dry_run"]
    }
  ]
}
```

### 查询组件详情

```http
GET /api/registry/components/{component_instance_id}
```

用于前端详情页、管理页、审核页。

返回需要包含：

- 当前 active version。
- 所有历史版本。
- release status。
- 最近运行质量指标。
- 被哪些 Team / Workflow 引用。
- 可编辑项。
- 审核记录。
- 回滚记录。

### 解析运行时计划

```http
POST /api/registry/resolve-runtime-plan
```

请求：

```json
{
  "tenant_id": "tenant_001",
  "shop_id": "shopify_shop_001",
  "workflow_instance_id": "wf_listing_optimize_writeback",
  "input": {
    "shopify_product_id": "gid://shopify/Product/123"
  }
}
```

返回：

```json
{
  "runtime_plan_id": "rp_001",
  "workflow": {
    "workflow_instance_id": "wf_listing_optimize_writeback",
    "workflow_version_id": "wfv_2"
  },
  "agents": [
    {
      "agent_instance_id": "agt_listing_optimizer",
      "agent_version_id": "agv_3"
    }
  ],
  "teams": [
    {
      "team_instance_id": "team_listing_review",
      "team_version_id": "tmv_1"
    }
  ],
  "tools": [
    {
      "tool_key": "shopify.products.read",
      "tool_version_id": "toolv_1",
      "approval_required": false
    },
    {
      "tool_key": "shopify.products.update",
      "tool_version_id": "toolv_1",
      "approval_required": true,
      "dry_run_required": true
    }
  ],
  "model_policy": {
    "default_tier": "balanced",
    "fallback_tier": "fast"
  }
}
```

这个 API 是 Runtime Builder 的入口，也是前端“开始运行前确认”的依据。

## MVP Registry 初始条目

### Agent：Listing 优化 Agent

```text
agent_template.key = listing_optimizer
agent_instance.name = Listing 优化 Agent
category = listing
active_version = v1
tools = shopify.products.read, keyword_research.read
write_tools_enabled = false
output_schema = ListingOptimizationDraft
memory_scope = shop + agent
model_tier = balanced
```

用途：

- 读取 Shopify 商品信息。
- 分析标题、卖点、描述、SEO keyword。
- 输出优化草稿。
- 不直接写回 Shopify。

### Team：Listing Review Team

```text
team_template.key = listing_review_team
team_instance.name = Listing 审核 Team
mode = broadcast
members =
  - Listing 优化 Agent v1
  - SEO 审核 Agent v1
  - 合规检查 Agent v1
output_merge_policy = platform_merge_summary
```

用途：

- 多专家并行审核 Listing 优化结果。
- 给出结构化风险、建议和置信度。
- 不直接调用写工具。

### Workflow：Listing 优化并写回 Shopify

```text
workflow_template.key = listing_optimize_writeback
workflow_instance.name = Listing 优化并写回 Shopify
steps =
  1. shopify.products.read
  2. Listing 优化 Agent
  3. Listing Review Team
  4. 生成写回计划
  5. 人工审批
  6. shopify.products.update
```

硬性规则：

- 第 6 步必须通过 Tool Gateway。
- 写回前必须 dry-run。
- 写回前必须人工审批。
- Replay 默认不能触发第 6 步。
- Team 和 Agent 不直接持有 Shopify 写工具。

### Tool：Shopify read/write

```text
tool_definitions:
  - shopify.products.read
    operation_type = read
    risk_level = low
    nango_integration_key = shopify

  - shopify.products.update
    operation_type = write
    risk_level = high
    nango_integration_key = shopify
    approval_required = true
    dry_run_required = true
```

Nango 的职责：

- 保存 Shopify OAuth connection。
- 刷新 token。
- 提供 connection_id 对应的 access token。
- 不管理 Agent 版本、审核、记忆、权限。

Tool Gateway 的职责：

- 检查当前租户是否有该 tool 权限。
- 检查当前用户角色是否可执行。
- 检查 Nango connection 是否存在且 scope 足够。
- 对写操作生成 approval request。
- 审批通过后执行真实写入。
- 记录审计日志。

## 运行时解析流程

```text
1. 用户在前端选择 Listing 优化并写回 Shopify Workflow。
2. 前端请求业务 Registry：
   GET /api/registry/workflows?category=listing&shop_id=xxx
3. 用户点击运行。
4. FastAPI 调用 resolve-runtime-plan。
5. Registry 校验：
   - tenant 是否可用该 Workflow
   - user role 是否允许运行
   - shop_id 是否绑定 Shopify Nango connection
   - active WorkflowVersion 是否 published
   - Workflow 引用的 Agent/Team/Tool version 是否仍可用
   - 写工具是否需要审批
6. Runtime Builder 基于 snapshot 构造 Agno Workflow。
7. 构造过程中使用 Agno Registry 获取 callable、schema、db、model。
8. Agno 执行 Workflow。
9. 写 Shopify 时进入 Tool Gateway。
10. Tool Gateway 生成审批或执行写入。
11. Run、ToolExecution、Approval、AuditLog 全部写入业务库。
```

## 与 Agno Components 的关系

### 可以复用的思想

Agno Components 的这些规则值得沿用：

- published config immutable。
- draft config editable。
- current_version 指针。
- set-current 做 rollback。
- links 锁 child_version。

### 不直接依赖的原因

我们的业务 Registry 需要更强的业务语义：

| 需要的能力 | Agno Components | 业务 Registry |
| --- | --- | --- |
| 租户隔离 | 无 | 必须有 |
| 店铺范围 | 无 | 必须有 |
| 用户角色权限 | 无 | 必须有 |
| 审核流 | 无 | 必须有 |
| Tool 风险等级 | 无 | 必须有 |
| Nango connection | 无 | 必须有 |
| 记忆策略 | 无 | 必须有 |
| 模型预算 | 无 | 必须有 |
| 行业场景搜索 | 无 | 必须有 |

所以 Agno Components 可以作为内部 runtime config mirror，但不能作为业务事实源。

## 与 AgentFactory 的关系

推荐实现方式：

```text
注册固定 factory id：
  - ecommerce_agent_runtime
  - ecommerce_team_runtime
  - ecommerce_workflow_runtime

每次请求传入：
  - tenant_id
  - user_id
  - shop_id
  - component_instance_id
  - input

Factory 内部：
  - 读取 trusted claims
  - 调业务 Registry 解析 active version
  - 校验权限
  - 调 Runtime Builder
  - 返回 Agno Agent / Team / Workflow
```

注意：

Agno `BaseFactory` 会把返回组件的 id 强制设成 factory id。因此如果我们希望每个业务 Agent 都有独立的产品 id，不应该直接把 Agno component id 当作业务 Agent id。业务 id 要放在 run metadata、session metadata 或业务 Run 表里。

推荐：

```text
Agno runtime id = ecommerce_agent_runtime
业务 agent_instance_id = agt_listing_optimizer
业务 agent_version_id = agv_3
写入 run metadata / business run table
```

这样既能利用 AgnoOS 的 factory，又不会把产品目录和 runtime handle 混在一起。

## 验证清单

### 代码验证

- [x] 确认 Agno Registry 管理工具、模型、DB、向量库、schema、function、Agent、Team。
- [x] 确认 Registry Router 只提供 runtime introspection。
- [x] 确认 Components API 支持 component/config/current_version。
- [x] 确认 published config 不可变。
- [x] 确认 component links 要求 child_version。
- [x] 确认 AgentFactory 支持 per-request 动态构造 Agent。
- [x] 确认 RequestContext 有 trusted claims/scopes。

### 原型验证

- [ ] 建立最小业务 Registry 表。
- [ ] 插入 Listing 优化 Agent v1。
- [ ] 插入 Listing Review Team v1，并锁定 AgentVersion。
- [ ] 插入 Listing 优化并写回 Shopify Workflow v1，并锁定 TeamVersion 和 ToolVersion。
- [ ] 实现 `GET /api/registry/agents`。
- [ ] 实现 `GET /api/registry/workflows`。
- [ ] 实现 `POST /api/registry/resolve-runtime-plan`。
- [ ] Runtime Builder 基于 runtime plan 构造 Agno Workflow。
- [ ] 写工具必须进入 Tool Gateway。
- [ ] Replay 默认 dry-run，不允许真实写 Shopify。

## 最终结论

Agno Registry 和 Components 对我们非常有价值，但它们的职责应限定在 Agno runtime 内部。

跨境电商 Agent 平台真正需要的是业务 Registry。它必须成为平台的事实源，统一管理 Agent、Team、Workflow、Tool、Model、Memory、Nango Connection、审核、发布、权限和审计。

MVP 的实现顺序定为：

1. 先建业务 Registry。
2. 再建 Runtime Plan Resolver。
3. 再建 Runtime Builder。
4. 再接 Agno Agent/Team/Workflow。
5. 再接 Nango + Tool Gateway。
6. 最后做前端发现、运行和审批界面。

这条路径可以最大化保留 Agno 的运行时能力，同时避免把业务平台的核心控制权交给运行时框架。
