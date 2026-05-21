# 08 LLM Provider 与模型路由验证

## 研究目标

验证底层 LLM provider 如何配置、如何按 Agent/Team/Workflow 选择模型、如何设置 fallback、如何控制成本，以及如何实现租户级模型策略。

核心目标：

- 平台统一管理 provider key。
- 租户只能选择平台允许的模型档位。
- Agent/Team/Workflow 版本记录模型策略快照。
- 每次 run 记录 token、cost、latency。
- 高风险步骤可以强制使用更稳模型。

## 业务场景

不同 Agent 使用不同模型：

- Listing 优化 Agent：强文本生成模型。
- Compliance Agent：稳定、规则遵循能力强的模型。
- 店铺数据分析 Agent：低成本模型。
- Orchestrator Agent：低延迟模型。
- Listing Review Team leader：中等成本、综合能力稳定模型。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/models/utils.py`
- `/Users/ske/agent/agno/libs/agno/agno/models/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/models/fallback.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_init.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_init.py`
- `/Users/ske/agent/agno/libs/agno/agno/metrics.py`

## 源码阅读结论

### 1. Agno 支持多 provider，模型字符串格式明确

`models/utils.py` 支持的 provider 很多，包括：

- openai
- openai-chat
- openai-responses
- anthropic
- google
- azure-openai
- aws-bedrock
- deepseek
- openrouter
- litellm
- groq
- together
- cerebras
- mistral
- cohere
- ollama
- xai
- perplexity
- vertexai-claude
- vercel
- 以及其他 provider。

模型字符串格式：

```text
<provider>:<model_id>
```

例如：

```text
openai:gpt-4o
openai-chat:gpt-4o-mini
anthropic:claude-sonnet-4-20250514
google:gemini-2.5-pro
```

`get_model()` 支持：

- Model 实例。
- string。
- None。

结论：

Agno 的模型抽象足够支持多 provider 和动态模型选择。

我们的业务层可以保存标准化 `model_ref`，运行时再通过 Agno `get_model()` 或直接构造 Model。

### 2. Agent 支持主模型、reasoning model、parser model、output model

`agent/_init.py` 会初始化：

- `agent.model`
- `agent.reasoning_model`
- `agent.parser_model`
- `agent.output_model`

并设置 model type：

- MODEL。
- REASONING_MODEL。
- PARSER_MODEL。
- OUTPUT_MODEL。

结论：

一个 Agent 不只需要一个模型。

第一版可以先只配置主模型和可选 output/parser model，但表结构要预留：

- primary_model。
- reasoning_model。
- parser_model。
- output_model。

Listing 优化 Agent 第一版建议：

- primary_model：强文本模型。
- output_schema：强制结构化输出。
- parser_model：可选，只有主模型结构化不稳定时启用。

### 3. Team 也支持主模型、reasoning/parser/output model 和 fallback

`team/_init.py` 支持：

- team.model。
- team.reasoning_model。
- team.parser_model。
- team.output_model。
- fallback_config。
- fallback_models。

Team leader 的模型非常关键，因为它决定：

- 是否委派成员。
- 委派给谁。
- 如何汇总成员输出。
- 是否遵循 output_schema。

结论：

TeamVersion 必须保存 leader model policy。

成员 Agent 的模型策略由成员 AgentVersion 自己保存，不应该被 Team 随意覆盖。

### 4. Agno fallback_config 能按错误类型降级

`FallbackConfig` 支持：

- `on_error`
- `on_rate_limit`
- `on_context_overflow`
- `callback`

fallback 选择策略：

1. rate limit 优先走 `on_rate_limit`。
2. context window exceeded 走 `on_context_overflow`。
3. 其他 retryable error 走 `on_error`。
4. 400/401/403 等非重试客户端错误不会被普通 fallback 掩盖。

结论：

Agno fallback 可以复用。

但业务层仍需记录：

- primary_model。
- fallback_model。
- fallback_reason。
- fallback_count。
- 是否允许 fallback 到更贵模型。
- 是否允许 fallback 到跨境外 provider。

### 5. Metrics 能记录 token、cost 和 per-model details

`metrics.py` 中有：

- `ModelMetrics`
- `MessageMetrics`
- `RunMetrics`
- `SessionMetrics`

`RunMetrics` 支持：

- input_tokens。
- output_tokens。
- total_tokens。
- reasoning_tokens。
- cache_read_tokens。
- cache_write_tokens。
- cost。
- duration。
- time_to_first_token。
- details。
- additional_metrics。

`details` 按 model type 存 per-model breakdown。

结论：

Agno 的 metrics 足够作为底层成本统计来源。

业务层要把 metrics 汇总到：

- tenant。
- shop。
- workflow_version。
- agent_version。
- team_version。
- model_policy。

### 6. Agno 不负责租户级模型权限和预算

Agno 可以接收任意 model string 或 Model 实例。

但它不会理解：

- 当前 tenant 是否允许用这个模型。
- 当前 plan 是否允许高端模型。
- 当前 shop 是否超过预算。
- 当前任务是否必须用指定模型。
- 当前 provider 是否符合数据合规要求。
- 租户是否允许 BYOK。

结论：

模型权限、预算、合规必须由业务层控制。

不要让前端或租户直接传入任意 provider/model/key。

## 第一版模型策略

第一版采用平台托管 provider key。

规则：

- 平台后端保存 provider key。
- 租户不能随意填 provider key。
- 租户只能选择模型档位。
- AgentTemplate 给默认模型档位。
- AgentInstance 可在平台允许范围内选择。
- Workflow 高风险步骤可以覆盖或强制模型档位。

## 模型档位

### fast

用途：

- Orchestrator 路由。
- 分类。
- 简单摘要。
- 意图识别。

目标：

- 低延迟。
- 低成本。

### standard

用途：

- 普通 Listing 优化。
- 店铺问答。
- 轻量分析。

目标：

- 成本和效果平衡。

### premium

用途：

- 高质量 Listing 文案。
- 多语言本地化。
- 复杂分析。

目标：

- 更好输出质量。

### risk_check

用途：

- 合规检查。
- 写回前风险复核。
- 高影响操作前判断。

目标：

- 稳定。
- 规则遵循能力强。

## 按任务类型路由

| 任务类型 | 推荐档位 | 示例 |
| --- | --- | --- |
| orchestration | fast | 判断用户想优化 Listing 还是查订单 |
| listing_generation | premium 或 standard | 生成标题、描述、SEO 字段 |
| compliance_check | risk_check | 检查禁词、夸大表述、平台风险 |
| review_synthesis | standard | Team leader 汇总 SEO/文案/合规结果 |
| summary | fast | 总结运行结果 |
| classification | fast | 判断产品类目、风险等级 |
| data_analysis | standard | 店铺数据分析 |

## 按风险等级路由

低风险：

- 只读分析。
- 草稿建议。
- 用户可编辑输出。

可用：

- fast。
- standard。

中风险：

- 影响审批建议。
- 影响 ListingDiff。

可用：

- standard。
- premium。

高风险：

- 写回 Shopify 前检查。
- 价格/库存/发布状态相关决策。

必须：

- risk_check。
- 人工审批。
- Tool Gateway fail-close。

## 数据表设计

### llm_providers

- provider_id
- provider_key
- name
- status
- secret_ref
- region
- compliance_tags
- created_at

`provider_key` 示例：

- openai。
- anthropic。
- google。
- openrouter。

`secret_ref` 指向后端 secrets manager，不直接入库明文 key。

### llm_models

- model_id
- provider_id
- model_ref
- display_name
- capability_tags
- context_window
- supports_structured_output
- supports_tool_calling
- input_price
- output_price
- status
- created_at

`model_ref` 示例：

```text
openai:gpt-4o
anthropic:claude-sonnet-4-20250514
```

### model_tiers

- model_tier_id
- tier_key
- display_name
- default_model_id
- fallback_model_ids
- max_cost_per_run
- max_latency_ms
- status

`tier_key`：

- fast
- standard
- premium
- risk_check

### tenant_model_policies

- tenant_model_policy_id
- tenant_id
- allowed_tiers
- allowed_model_ids
- blocked_model_ids
- monthly_budget
- per_run_budget
- allow_byok
- status
- created_at

### model_policy_snapshots

- model_policy_snapshot_id
- target_type
- target_version_id
- primary_tier
- primary_model_id
- fallback_policy
- reasoning_model_id
- parser_model_id
- output_model_id
- max_tokens
- temperature
- budget_limit
- created_at

`target_type`：

- agent_version
- team_version
- workflow_step

### model_invocations

- model_invocation_id
- tenant_id
- workspace_id
- shop_id
- workflow_run_id
- workflow_step_run_id
- agent_run_id
- team_run_id
- provider_id
- model_id
- model_type
- fallback_from_model_id
- fallback_reason
- input_tokens
- output_tokens
- total_tokens
- cost
- latency_ms
- status
- created_at

## AgentVersion 中的模型字段

AgentVersion 应保存：

- model_policy_snapshot_id。
- primary_model_id。
- model_tier。
- fallback_policy。
- reasoning_model_id。
- parser_model_id。
- output_model_id。
- generation_params。

`generation_params`：

- temperature。
- top_p。
- max_tokens。
- response_format。
- tool_choice。

## TeamVersion 中的模型字段

TeamVersion 保存 leader 模型：

- leader_model_policy_snapshot_id。
- leader_primary_model_id。
- leader_model_tier。
- leader_fallback_policy。
- leader_generation_params。

成员模型不在 TeamVersion 重写，而是来自 member AgentVersion。

## WorkflowVersion 中的模型字段

WorkflowVersion 不直接保存一个全局模型，而是保存 step-level policy：

- step_key。
- model_policy_override。
- required_tier。
- risk_level。

例子：

- `optimize_listing` step 使用 Listing AgentVersion 自己的 premium。
- `review_listing` step 使用 TeamVersion leader standard。
- `risk_check_before_write` step 强制 risk_check。

## 运行时模型选择流程

```text
请求进入业务 API
  -> 解析 tenant/shop/user
  -> 读取 workflow_version
  -> 读取 step_snapshot
  -> 读取 agent/team version
  -> 读取 model_policy_snapshot
  -> 校验 tenant_model_policy
  -> 校验预算
  -> 构造 Agno Model
  -> 构造 fallback_config
  -> 运行 Agent/Team
  -> 记录 RunMetrics 和 model_invocations
```

## fallback 策略

第一版建议：

- rate limit：可 fallback 到同档位其他 provider。
- context overflow：fallback 到更大上下文模型，或先压缩上下文。
- 5xx/network：fallback 到同档位备用模型。
- 401/403：不 fallback，直接失败并报警。
- premium -> risk_check 不自动 fallback，除非策略明确允许。
- risk_check 不 fallback 到低能力模型。

## 成本控制

必须记录：

- 每次 model invocation。
- 每次 AgentRun cost。
- 每次 TeamRun cost。
- 每次 WorkflowRun cost。
- 每个 tenant / shop 月度成本。

第一版预算策略：

- tenant monthly budget。
- per workflow run budget。
- per agent run budget。
- per replay batch budget。

超过预算：

- 低风险任务降级模型。
- 高风险任务不降级，直接要求人工确认或暂停。
- replay batch 可以停止。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Agno 支持哪些 provider | 支持很多 provider，包括 OpenAI、Anthropic、Google、Azure、AWS、OpenRouter、LiteLLM、Ollama 等。 |
| Agent 如何设置 model | Agent 接收 Model 实例或 `<provider>:<model_id>` 字符串。 |
| Team 如何设置 model | Team 同样接收 Model 实例或字符串，并支持 fallback_config。 |
| Workflow 中不同 Agent 是否可用不同 model | 可以。每个 Step 里的 Agent/Team 自己带模型。 |
| fallback model 如何配置 | Agno FallbackConfig 支持 on_error/on_rate_limit/on_context_overflow。 |
| model 调用失败如何降级 | Agno fallback 会按错误类型选择 fallback。业务层要记录和限制。 |
| 是否能记录 token usage 和 cost | 能。RunMetrics/ModelMetrics 支持 token、cost、duration、per-model details。 |
| 是否能按 tenant 限制可用模型 | Agno 不负责。必须业务层自建 tenant_model_policies。 |
| 租户能否自由填 provider key | 第一版不允许。平台托管 provider key。 |

## 原型任务

1. 建立 `llm_providers` 和 `llm_models` 种子配置。
2. 建立 fast/standard/premium/risk_check 四个 tier。
3. 给 Listing AgentVersion 绑定 premium 或 standard。
4. 给 Compliance AgentVersion 绑定 risk_check。
5. 给 Orchestrator Agent 绑定 fast。
6. 给 TeamVersion leader 绑定 standard。
7. 构造 fallback_config。
8. 模拟 rate limit，验证 fallback。
9. 保存 model_invocations。
10. 从 Agno RunMetrics 汇总 workflow_run 成本。

## 第一版结论

Agno 的模型层足够强，可以作为运行时模型调用抽象。

它已经提供：

- 多 provider 支持。
- 字符串模型引用。
- Agent/Team 模型配置。
- reasoning/parser/output model。
- fallback_config。
- token/cost/duration metrics。
- per-model details。

但我们的商业平台必须自建：

- provider 管理。
- secret 管理。
- model catalog。
- model tiers。
- tenant model policy。
- budget control。
- model invocation log。
- model policy snapshot。

第一版原则：

```text
平台管理 provider key
租户选择模型档位
业务层校验模型权限和预算
Agno 只负责按已批准的模型策略执行
```

这能让我们快速接入多模型，同时避免租户乱填 key、成本失控和高风险步骤误用低能力模型。
