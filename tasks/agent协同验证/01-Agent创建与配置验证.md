# 01 Agent 创建与配置验证

## 研究目标

验证跨境电商专业 Agent 如何被创建、配置、运行和持久化。

重点不是创建一个聊天机器人，而是创建一个有业务边界、工具权限、记忆策略、知识范围、输出结构和审批策略的专业 Agent。

## 业务场景

创建一个 `Listing 优化 Agent`。

它负责：

- 读取商品快照。
- 生成标题、描述、标签、SEO 字段优化建议。
- 输出结构化 `ListingSuggestion`。
- 不直接写回 Shopify。
- 写回动作必须交给 Workflow 和 Tool Gateway。

## 需要阅读的源码

- `/Users/ske/agent/agno/libs/agno/agno/agent/agent.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_init.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_run.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_tools.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_storage.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/factory.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/utils.py`
- `/Users/ske/agent/agno/libs/agno/agno/models`
- `/Users/ske/agent/agno/libs/agno/agno/tools`
- `/Users/ske/agent/agno/libs/agno/agno/memory`
- `/Users/ske/agent/agno/libs/agno/agno/knowledge`
- `/Users/ske/agent/agno/libs/agno/agno/db`

## 源码阅读结论

### 1. Agno Agent 是一个高度可配置的运行时对象

`Agent` 在 `/Users/ske/agent/agno/libs/agno/agno/agent/agent.py` 中定义，虽然使用 dataclass 风格，但它手写了 `__init__`，构造参数非常完整。

和我们平台相关的关键配置包括：

- `model`
- `fallback_models`
- `fallback_config`
- `name`
- `id`
- `user_id`
- `session_id`
- `session_state`
- `dependencies`
- `memory_manager`
- `db`
- `knowledge`
- `knowledge_filters`
- `tools`
- `tool_call_limit`
- `tool_choice`
- `tool_hooks`
- `pre_hooks`
- `post_hooks`
- `instructions`
- `expected_output`
- `additional_context`
- `input_schema`
- `output_schema`
- `parser_model`
- `output_model`
- `parse_response`
- `structured_outputs`
- `stream`
- `stream_events`
- `metadata`

结论：Agno 的 Agent 配置能力足够承载我们的 `Listing 优化 Agent`。我们不需要改 Agno 源码才能创建专业 Agent。

### 2. Agent 支持运行时动态构造

Agno 提供 `AgentFactory`：

- `/Users/ske/agent/agno/libs/agno/agno/agent/factory.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/utils.py`

`AgentFactory` 基于 `RequestContext` 每次请求生成一个新的 Agent。`RequestContext` 包含：

- `user_id`
- `session_id`
- `request`
- `input`
- `trusted`

`trusted` 来自后端可信中间件，适合放 JWT claims、scopes 等安全上下文。

结论：Agno 原生支持“每次请求按上下文动态构造 Agent”。这和我们的多租户场景匹配。第一版可以不用 AgentOS 直接暴露给前端，但可以借鉴 `AgentFactory` 思路，在 FastAPI 业务层根据 tenant / shop / agent_instance 动态组装 Agent。

### 3. Agent 初始化会自动解析模型和基础能力

`_init.py` 中的 `initialize_agent()` 会处理：

- 默认 model。
- debug。
- agent id。
- telemetry。
- memory manager。
- culture manager。
- session summary manager。
- compression manager。
- learning machine。

`get_models()` 会把字符串模型转换为具体 `Model` 实例，例如 `openai:gpt-4o` 这种形式会进入 `agno.models.utils.get_model()` 解析。

结论：业务数据库中可以保存模型字符串，但进入运行时前必须经过平台允许列表校验，然后交给 Agno 转成 Model。不要让租户自由填任意 provider/model。

### 4. Agno 支持多 provider 模型字符串

`/Users/ske/agent/agno/libs/agno/agno/models/utils.py` 支持形如：

```text
<provider>:<model_id>
```

支持的 provider 很多，包括：

- openai
- openai-chat
- openai-responses
- anthropic
- google
- groq
- openrouter
- litellm
- aws-bedrock
- azure-openai
- deepseek
- ollama

结论：底层 LLM provider 可以由 Agno 适配，但我们的业务平台必须加一层 `ModelPolicy`，控制每个 AgentTemplate / tenant / plan 可以使用哪些模型。

### 5. Agent 支持结构化输入和输出

`Agent` 支持：

- `input_schema`
- `output_schema`
- `parse_response`
- `structured_outputs`
- `use_json_mode`
- `parser_model`
- `output_model`

`_run.py` 中每次 run 会先用 `validate_input(input, agent.input_schema)` 校验输入。`_response.py` 会根据 `output_schema` 和模型能力选择 response format，并把输出解析成 Pydantic model 或 dict。

`_run_options.py` 还说明：run 时传入的 `output_schema` 优先级高于 agent 默认 `output_schema`。

结论：`ListingSuggestion`、`ProductSnapshot`、`ListingDiff` 这些对象应该定义成 Pydantic schema，并作为 Agent / Workflow step 的强约束。审批 diff 不能从自然语言里解析。

### 6. Tool 支持 list 和 callable factory 两种方式

`Agent.tools` 可以是：

- `Toolkit`
- `Callable`
- `Function`
- `Dict`
- callable factory

`_tools.py` 中 `get_tools()` 会在 run 时解析 callable factory，并把默认工具也合并进来，例如：

- 读历史。
- 搜索过去 session。
- agentic memory。
- learning tools。
- session_state update。
- knowledge search。
- skills tools。

`parse_tools()` 会把工具转成 `Function`，并注入：

- `_agent`
- `_team`
- `_run_context`
- media context
- tool_hooks

结论：我们的工具层可以做成 callable factory，根据 tenant / shop / agent_instance / tool_permission 动态返回工具列表。这样比把工具固定写死在 AgentTemplate 里更适合多租户权限。

### 7. Agent 可以完全不暴露 write tool

Agno 的工具列表由我们传入。只要 `Listing 优化 Agent` 不传入 `shopify_update_product` 之类写工具，它就无法直接写回 Shopify。

结论：第一版要强制规则：

- 分析型 Agent 只拿 read/suggest 工具。
- write tool 只出现在 Workflow 的审批后 step。
- Orchestrator Agent 也不能拥有 write tool。

### 8. Agent 支持 session_state 和 dependencies

`Agent` 支持：

- `session_state`
- `add_session_state_to_context`
- `enable_agentic_state`
- `dependencies`
- `add_dependencies_to_context`

运行时 `_run.py` 会创建 `RunContext`，其中包含：

- `run_id`
- `session_id`
- `user_id`
- `dependencies`
- `knowledge_filters`
- `metadata`
- `session_state`
- `output_schema`
- `tools`
- `knowledge`
- `members`

`_init._initialize_session_state()` 会注入：

- `current_user_id`
- `current_session_id`
- `current_run_id`

结论：跨境电商运行时上下文，比如 `tenant_id`、`workspace_id`、`shop_id`、`agent_instance_id`、`agent_version_id`，建议放进 `metadata` 和业务自定义 run 表；临时执行态可以放进 `session_state`，但不要把 tenant 权限判断只放在 prompt 或 session_state 里。

### 9. Agent 原生支持持久化组件配置，但不够覆盖我们的业务需求

`_storage.py` 提供：

- `agent.to_dict()`
- `Agent.from_dict()`
- `agent.save()`
- `Agent.load()`

`save()` 会写入 Agno 的 component 和 config 表：

- component type 为 `agent`
- config 使用 `to_dict(agent)` 序列化
- 支持 `stage`
- 支持 `label`
- 支持 `version`

这说明 Agno 原生有组件版本配置能力。

但是源码里存在几个重要限制：

- `memory_manager` 序列化是 TODO。
- `knowledge` 序列化是 TODO。
- `session_summary_manager` 序列化是 TODO。
- `parser_model` / `output_model` 反序列化是 TODO。
- callable 型 `instructions` 会被跳过。
- callable factory 型 `tools` 不会被完整序列化。
- schema 名称反序列化依赖 `Registry`。

结论：Agno 的 component config 可以作为运行时辅助，但不能作为我们业务平台的唯一 Agent 配置事实源。我们必须自建 `AgentTemplate / AgentInstance / AgentVersion`。

### 10. Agent run 会记录模型、provider、run_id、session_id

`_run.py` 中 run 会：

- 校验 input_schema。
- 初始化 session。
- 初始化 Agent。
- 创建 `RunContext`。
- 解析 run options。
- 计算 response_format。
- 创建 `RunOutput`。
- 写入 `run_id`、`session_id`、`agent_id`、`user_id`、`agent_name`、`metadata`、`session_state`、`input`。
- 记录 `model` 和 `model_provider`。
- 统计 metrics。

结论：Agno 的 run output 足够作为运行时记录基础。但我们的业务 run 表仍然必须记录 tenant / shop / agent_instance / agent_version / workflow_version / approval / audit 这些业务字段。

## 需要验证的配置项

- agent id。
- agent name。
- description。
- model。
- fallback model。
- instructions。
- expected output。
- structured output schema。
- tools。
- knowledge。
- memory manager。
- session。
- user_id。
- debug mode。
- guardrails。
- tool hooks。
- run hooks。

## 推荐业务配置模型

Agent 分三层：

```text
AgentTemplate
  -> 定义业务类型、默认 instruction、默认 schema、默认工具范围

AgentInstance
  -> 绑定 tenant、workspace、shop、具体工具权限、知识库、记忆策略

AgentVersion
  -> 固化某一次可运行配置，绑定 model、instructions、schema、tool policy、knowledge scope、memory policy
```

第一版不允许用户自由创建任意 Agent，只允许基于模板创建。

### AgentTemplate

平台内置，不由租户自由创建。

建议字段：

- template_id
- name
- category
- description
- default_model_policy
- default_instructions
- default_output_schema_ref
- allowed_tool_categories
- default_knowledge_scope
- default_memory_policy
- default_approval_policy
- status

### AgentInstance

租户启用模板后生成。

建议字段：

- agent_instance_id
- tenant_id
- workspace_id
- template_id
- name
- enabled_shop_ids
- tool_permission_policy_id
- knowledge_scope_id
- memory_policy_id
- approval_policy_id
- active_version_id
- status

### AgentVersion

每次发布生成不可变版本。

建议字段：

- agent_version_id
- agent_instance_id
- version
- status
- model_ref
- fallback_model_refs
- instructions_snapshot
- output_schema_ref
- tool_policy_snapshot
- knowledge_scope_snapshot
- memory_policy_snapshot
- approval_policy_snapshot
- created_by
- created_at
- release_note

### 运行时组装方式

```text
FastAPI 收到 run 请求
        |
校验 Clerk 身份和业务权限
        |
加载 AgentInstance + active AgentVersion
        |
加载 tenant / workspace / shop 上下文
        |
根据 tool_permission 动态创建 tools callable factory
        |
根据 knowledge_scope 创建 knowledge_filters
        |
根据 memory_policy 创建 memory_manager 或 memory 注入策略
        |
构造 Agno Agent
        |
调用 agent.arun()
```

第一版建议走 `arun()`，因为后续工具和数据库更可能是 async。

## 验证问题

| 问题 | 结论 |
| --- | --- |
| Agno Agent 是否可以动态创建 | 可以。直接构造 `Agent(...)`，也可以通过 `AgentFactory` 基于 `RequestContext` 每次请求构造。 |
| Agent 配置能否从数据库加载 | Agno 原生支持 component config 保存和加载，但 memory/knowledge 等部分反序列化仍是 TODO。业务侧必须自建配置事实源。 |
| Agent 能否绑定不同 model | 可以。支持 Model 实例或 `<provider>:<model_id>` 字符串。 |
| Agent 能否绑定不同 tool list | 可以。`tools` 支持列表，也支持 callable factory。 |
| Agent 能否输出 Pydantic 结构 | 可以。通过 `output_schema`、`parse_response`、`structured_outputs` 等实现。 |
| Agent 是否能在 FastAPI 请求中按 tenant/shop 动态构造 | 可以。建议业务层参考 `AgentFactory` 自行构造。 |
| Agent 是否可以不暴露直接写工具 | 可以。工具完全由我们传入，第一版必须禁止分析 Agent 拿 write tool。 |

## 第一版结论方向

- `AgentTemplate` 由平台内置。
- `AgentInstance` 由租户启用和配置。
- `AgentVersion` 固化每次发布的可运行配置。
- Agent 不直接持有 Nango token。
- Agent 不直接执行 write tool。
- 所有 write tool 通过 Workflow + Tool Gateway + Approval。
- Agno component config 可作为参考，不作为唯一业务事实源。
- Agent 运行时由 FastAPI 业务层根据租户上下文动态构造。
- 模型选择必须经过平台 `ModelPolicy`，不能让租户随意填 provider/model。
- 工具使用 callable factory 动态生成，确保每次 run 都经过权限计算。

## Listing 优化 Agent 第一版配置草案

```text
id: listing_optimizer
name: Listing 优化 Agent
model: 由 ModelPolicy 决定，例如 openai:gpt-4o / anthropic:claude-...
input_schema: ProductSnapshot
output_schema: ListingSuggestion
tools:
  - 允许 read / suggest 类工具
  - 不允许 shopify_update_product
knowledge:
  - tenant + shop + listing scope
memory:
  - 只读已确认 shop_memory
  - 可生成 memory_candidate
approval:
  - Agent 本身不审批
  - Workflow 写回前审批
metadata:
  - tenant_id
  - workspace_id
  - shop_id
  - agent_instance_id
  - agent_version_id
```

## 技术风险

### 1. Agno 原生配置保存不完整

Agno `to_dict/from_dict` 很有用，但源码里对 memory_manager、knowledge、parser_model、output_model 等存在 TODO。

处理方式：

- 自建业务配置表。
- Agno config 只作为运行时辅助或调试快照。
- 所有 active 配置由 `AgentVersion` 生成。

### 2. 动态工具必须严格受控

callable factory 很适合多租户，但如果设计不严，会把不该暴露的工具交给 Agent。

处理方式：

- 工具生成只能由业务 Tool Gateway 完成。
- write tool 不进入普通 Agent。
- 每次 run 记录 tool_policy_snapshot。

### 3. session_state 不是权限边界

session_state 可以帮助上下文传递，但不能作为安全边界。

处理方式：

- tenant/shop/user 权限必须在 FastAPI 和 Tool Gateway 判断。
- Agent prompt 中的上下文只是辅助。

### 4. 默认模型不适合直接使用

Agno 如果没有传 model，会默认设置 OpenAI Responses。

处理方式：

- 我们所有 AgentVersion 必须显式指定 model_ref。
- 禁止生产环境无 model 默认运行。

## 原型任务

1. 创建 ListingSuggestion Pydantic schema。
2. 创建 Listing 优化 Agent。
3. 使用 mock ProductSnapshot 输入。
4. 返回结构化 ListingSuggestion。
5. 记录 run_id / session_id。
6. 验证不传 write tool 时 Agent 无法写回。
7. 验证 tools callable factory 可以按 shop/tool permission 返回不同工具。
8. 验证 run metadata 能带上 tenant_id / shop_id / agent_version_id。

## 结论

Agno 的 Agent 创建和配置能力满足第一版需求。我们可以不改 Agno 源码，直接基于它创建 `Listing 优化 Agent`。

但生产平台不能把 Agno Agent config 当成唯一事实源。我们的业务系统必须自建：

- AgentTemplate
- AgentInstance
- AgentVersion
- ModelPolicy
- ToolPermissionPolicy
- KnowledgeScope
- MemoryPolicy

Agno 负责运行时执行；业务后端负责多租户、权限、版本、审核、发布和审计。
