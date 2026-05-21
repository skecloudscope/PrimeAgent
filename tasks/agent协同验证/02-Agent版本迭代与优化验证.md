# 02 Agent 版本迭代与优化验证

## 研究目标

验证 Agent 如何从运行反馈中持续优化，包括版本管理、评估、回放、灰度和回滚。

## 业务场景

Listing 优化 Agent 经常生成过长标题，用户多次在审批前手动改短。系统应该把这些反馈沉淀为优化候选，生成新的 AgentVersion，经测试后发布。

## 需要阅读的源码

- `/Users/ske/agent/agno/libs/agno/agno/learn`
- `/Users/ske/agent/agno/libs/agno/agno/learn/machine.py`
- `/Users/ske/agent/agno/libs/agno/agno/learn/schemas.py`
- `/Users/ske/agent/agno/libs/agno/agno/learn/stores`
- `/Users/ske/agent/agno/libs/agno/agno/eval`
- `/Users/ske/agent/agno/libs/agno/agno/eval/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/eval/accuracy.py`
- `/Users/ske/agent/agno/libs/agno/agno/eval/reliability.py`
- `/Users/ske/agent/agno/libs/agno/agno/eval/performance.py`
- `/Users/ske/agent/agno/libs/agno/agno/tracing`
- `/Users/ske/agent/agno/libs/agno/agno/tracing/schemas.py`
- `/Users/ske/agent/agno/libs/agno/agno/metrics`
- `/Users/ske/agent/agno/libs/agno/agno/session`
- `/Users/ske/agent/agno/libs/agno/agno/run`
- `/Users/ske/agent/agno/libs/agno/agno/db`

## 源码阅读结论

### 1. Agno LearningMachine 是学习存储编排器，不是 Agent 版本发布系统

`/Users/ske/agent/agno/libs/agno/agno/learn/machine.py` 定义了 `LearningMachine`。

它可以统一管理多种 learning store：

- `user_profile`
- `user_memory`
- `session_context`
- `entity_memory`
- `learned_knowledge`
- `decision_log`
- `custom_stores`

它提供三类核心能力：

- `build_context()`：把已学习内容构造成可注入 prompt 的上下文。
- `get_tools()`：把学习能力暴露成 Agent 可调用工具。
- `process()`：在会话后从 messages 中提取和保存学习内容。

结论：

Agno 的 learning 能帮助 Agent 记住用户、会话、实体、知识和决策，但它不负责创建新 AgentVersion，不负责发布、不负责灰度、不负责回滚。

### 2. Agno 学习模式能辅助“记忆”和“决策记录”，但不能直接改 active Agent

`LearningMachine` 支持 store 自己的 mode。源码注释里明确有：

- ALWAYS
- AGENTIC
- PROPOSE
- HITL

`requires_history` 也说明 PROPOSE / HITL 模式需要多轮历史来确认。

结论：

这适合我们的 `memory candidate`、`decision log`、`优化候选`，但第一版不能让它自动修改 Agent active 配置。

### 3. Agno learn schemas 已经预留 Feedback 和 InstructionUpdate，但属于后期能力

`/Users/ske/agent/agno/libs/agno/agno/learn/schemas.py` 中包含：

- `DecisionLog`
- `Feedback`
- `InstructionUpdate`

其中源码注释写明：

- `DecisionLog` 是 Phase 2。
- `Feedback` 是 Phase 2。
- `InstructionUpdate` 是 Phase 3。

`InstructionUpdate` 字段包括：

- `current_instruction`
- `proposed_instruction`
- `reasoning`
- `evidence`
- `agent_id`
- `team_id`
- `created_at`

结论：

Agno 已经有“基于反馈提出 instruction update”的概念，但不能把它当成当前成熟的自动优化系统。我们的第一版应该自建 `OptimizationSuggestion`，它可以借鉴 `InstructionUpdate`，但发布必须人工确认。

### 4. Agno DecisionLog 对我们很有价值

`DecisionLog` 包含：

- `id`
- `decision`
- `reasoning`
- `decision_type`
- `context`
- `alternatives`
- `confidence`
- `outcome`
- `outcome_quality`
- `tags`
- `session_id`
- `user_id`
- `agent_id`
- `team_id`

结论：

这很适合记录 Agent 为什么做某个建议、为什么调用某个工具、为什么给某个 Listing 改法。后续可以把这些作为 Agent 迭代样本。

但业务上仍然要自建更强的 `agent_feedback`、`approval_decision`、`optimization_case` 表，因为 Agno 的 DecisionLog 不包含 tenant/shop/workflow/version 这些关键业务维度。

### 5. Agno Eval 可以复用为候选版本评估工具

`/Users/ske/agent/agno/libs/agno/agno/eval` 包含：

- `BaseEval`
- `AccuracyEval`
- `ReliabilityEval`
- `PerformanceEval`
- `AgentAsJudge`

`AccuracyEval` 支持对 Agent 或 Team 运行输入和 expected_output，并用 evaluator agent 给出 score 和 reason。

`ReliabilityEval` 用于检查 tool calls 和参数是否符合预期。

`PerformanceEval` 用于统计运行耗时和内存。

结论：

Agno Eval 可以用于测试 AgentVersion 候选版本，但它不是完整的业务评估系统。我们需要把 eval 结果和 `agent_version_id`、`tenant_id`、`scenario_id`、`test_case_id` 绑定起来。

### 6. Agno DB 已经有 eval 和 learning 表

`BaseDb` 和 Postgres 实现中有：

- `agno_eval_runs`
- `agno_learnings`

相关方法包括：

- `create_eval_run`
- `get_eval_run`
- `get_eval_runs`
- `rename_eval_run`
- `get_learning`
- `upsert_learning`
- `delete_learning`
- `get_learnings`

结论：

Agno 已经能存 eval 和 learning 记录。第一版可以复用这些表保存 Agno 原生 eval/learning 数据，但业务版本管理仍然要自建。

### 7. Agno Trace 足够定位运行链路，但缺业务版本维度

`/Users/ske/agent/agno/libs/agno/agno/tracing/schemas.py` 中 `Trace` 包含：

- `trace_id`
- `name`
- `status`
- `start_time`
- `end_time`
- `duration_ms`
- `total_spans`
- `error_count`
- `run_id`
- `session_id`
- `user_id`
- `agent_id`
- `team_id`
- `workflow_id`

`Span` 包含：

- `span_id`
- `trace_id`
- `parent_span_id`
- `name`
- `span_kind`
- `status_code`
- `status_message`
- `duration_ms`
- `attributes`

结论：

Agno Trace 能帮我们定位失败步骤、耗时和错误，但它缺少 `tenant_id / shop_id / agent_version_id / workflow_version_id / tool_version_id`。这些必须放到我们业务 run 表或 trace metadata 里。

### 8. Agno Metrics 可以支撑成本和性能评估

`/Users/ske/agent/agno/libs/agno/agno/metrics.py` 包含：

- `ModelMetrics`
- `ToolCallMetrics`
- `MessageMetrics`
- `RunMetrics`
- `SessionMetrics`

`RunMetrics` 能记录：

- input_tokens
- output_tokens
- total_tokens
- audio tokens
- cache tokens
- reasoning_tokens
- cost
- duration
- time_to_first_token
- per-model details
- additional_metrics

结论：

这些足够支撑 AgentVersion 对比中的成本、耗时、模型使用统计。我们需要在业务评估表里把这些 metrics 汇总到版本维度。

### 9. RunOutput 是失败案例和回放样本的核心来源

`/Users/ske/agent/agno/libs/agno/agno/run/agent.py` 中 `RunOutput` 序列化包含：

- content
- status
- messages
- metrics
- tools
- metadata
- input
- reasoning_steps
- references
- requirements
- events

并提供：

- `tools_requiring_confirmation`
- `tools_requiring_user_input`
- `tools_awaiting_external_execution`

结论：

`RunOutput` 是我们构建 `optimization_case` 的基础。每次失败、审批拒绝、用户修改，都应该关联到具体 run output、tool execution、agent_version。

### 10. Agno 原生能力和我们自建能力边界

Agno 可以复用：

- 运行记录。
- 结构化输出。
- tool execution。
- metrics。
- trace。
- eval。
- learning stores。
- decision log 概念。

我们必须自建：

- AgentVersion。
- active version pointer。
- draft/testing/active 发布流。
- 版本回滚。
- 版本灰度。
- 业务测试集。
- approval feedback。
- 用户编辑 diff。
- optimization case。
- optimization suggestion。
- 版本对比报告。

## 需要验证的数据来源

- 用户 thumbs up / down。
- 审批通过 / 拒绝。
- 审批拒绝原因。
- 用户编辑后的 final output。
- schema validation failure。
- tool call failure。
- workflow failure。
- token cost。
- run latency。

## 第一版数据闭环设计

Agent 迭代不是直接“自动改 prompt”，而是一个受控闭环。

```text
AgentVersion 运行
        |
RunOutput / Trace / Metrics
        |
Approval / 用户修改 / 失败记录
        |
OptimizationCase
        |
OptimizationSuggestion
        |
人工审核
        |
生成新 AgentVersion draft
        |
测试集回放
        |
发布 testing / active
```

### OptimizationCase

用于记录一个值得优化的案例。

建议字段：

- optimization_case_id
- tenant_id
- workspace_id
- shop_id
- agent_instance_id
- agent_version_id
- workflow_run_id
- run_id
- trace_id
- case_type
- severity
- input_snapshot
- output_snapshot
- expected_or_final_output
- user_feedback
- approval_decision_id
- tool_execution_id
- metrics_snapshot
- created_at

`case_type` 建议：

- schema_error
- user_rejected
- user_edited
- approval_rejected
- tool_error
- hallucination
- policy_violation
- low_quality
- high_cost
- slow_run

### OptimizationSuggestion

用于记录优化建议。

建议字段：

- optimization_suggestion_id
- optimization_case_ids
- target_type
- target_id
- target_version_id
- suggestion_type
- proposed_change
- reasoning
- evidence
- status
- created_by
- reviewed_by
- created_at
- reviewed_at

`target_type`：

- agent
- team
- workflow
- tool
- memory_policy
- knowledge_scope

`suggestion_type`：

- instruction_update
- schema_update
- tool_policy_update
- model_change
- knowledge_update
- memory_policy_update
- guardrail_update

## AgentVersion 设计

字段建议：

- agent_version_id
- agent_id
- version
- status
- model
- instructions
- output_schema
- tool_permissions_snapshot
- knowledge_scope_snapshot
- memory_policy_snapshot
- guardrails
- eval_result
- eval_summary
- metrics_summary
- failure_summary
- release_note
- created_by
- created_at

状态：

- draft
- testing
- active
- archived
- rolled_back

## AgentVersion 发布规则

第一版采用严格人工发布：

```text
draft
  -> testing
  -> active
  -> archived
```

规则：

- `active` 不允许原地修改。
- 任意 instructions / model / schema / tool policy / knowledge scope / memory policy 变化都生成新版本。
- `testing` 版本只能在测试集、指定用户或指定店铺中运行。
- 发布 active 必须记录 release_note。
- rollback 只切换 `AgentInstance.active_version_id`。
- 历史 run 永远绑定当时的 `agent_version_id`。

## 测试集设计

### AgentTestCase

建议字段：

- test_case_id
- scenario
- input_snapshot
- expected_constraints
- expected_output
- tags
- risk_level
- created_from_run_id
- created_at

Listing 优化 Agent 的 `expected_constraints`：

- 标题长度不超过平台限制。
- 不包含禁词。
- SEO title 不为空。
- SEO description 不超过长度限制。
- tags 数量在合理范围。
- 输出必须符合 `ListingSuggestion` schema。

### AgentVersionEvalRun

建议字段：

- eval_run_id
- agent_instance_id
- agent_version_id
- test_case_ids
- eval_result
- schema_success_rate
- approval_prediction_score
- forbidden_word_count
- avg_cost
- avg_latency
- created_at

## Listing 优化 Agent 指标

第一版评估指标：

- schema_success_rate
- title_length_pass_rate
- forbidden_word_pass_rate
- seo_fields_completion_rate
- user_acceptance_rate
- user_edit_rate
- approval_rejection_rate
- tool_error_rate
- avg_latency
- avg_cost

这些指标中，第一版必须先做：

- schema_success_rate
- title_length_pass_rate
- forbidden_word_pass_rate
- user_edit_rate
- approval_rejection_rate
- avg_latency
- avg_cost

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Agno 是否有原生 learn/eval 能力可以复用 | 有。LearningMachine、Eval、Trace、Metrics 都能复用为证据来源和评估工具。 |
| Agno 是否有 AgentVersion 发布系统 | 没有完整业务版本发布系统。必须自建。 |
| Agno trace 是否能定位失败案例 | 可以定位 run/session/agent/team/workflow 和 span 错误，但缺 tenant/shop/version 维度。 |
| 同一批历史案例能否跑两个 AgentVersion | 可以通过自建 test case + 动态构造 AgentVersion 实现。Agno Eval 可辅助。 |
| active version 是否可以锁定不变 | 业务侧必须保证。Agno component config 有 version/stage，但不覆盖我们的完整业务需求。 |
| draft version 是否可以测试 | 可以。业务层构造 draft Agent 并使用隔离 session/test case 运行。 |
| rollback 是否只需要切 active pointer | 是。业务侧 `AgentInstance.active_version_id` 切回旧版本即可，历史 run 不变。 |

## 第一版结论方向

- 版本管理必须自建。
- Agno learn/eval/tracing 可以作为辅助能力。
- 第一版不自动发布优化。
- Optimization Agent 只能生成优化建议，不能修改 active version。
- 每次 run 必须记录 agent_version_id。
- 每次 run 必须记录 trace_id、metrics、input/output snapshot。
- 用户编辑、审批拒绝、tool error 都要进入 OptimizationCase。
- AgentVersion 的评估必须基于固定测试集和真实历史案例回放。

## 与 Agno Learn 的关系

第一版不建议直接启用所有 LearningMachine 自动写入能力。

建议：

- `DecisionLog` 概念可借鉴，用于记录 Agent 决策。
- `Feedback` / `InstructionUpdate` 先作为业务表设计参考。
- `learned_knowledge` 可以后续用于沉淀店铺运营经验，但必须经过 memory/knowledge policy。
- 不允许 LearningMachine 自动更新 active Agent instructions。

## 与 Agno Eval 的关系

第一版可以复用：

- `AccuracyEval`：评估输出是否符合预期。
- `ReliabilityEval`：评估 tool call 是否符合预期。
- `PerformanceEval`：评估运行耗时和资源。

但必须外包一层业务评估：

- 绑定 agent_version_id。
- 绑定 test_case_id。
- 绑定 tenant/shop 维度。
- 保存 eval summary。
- 用于发布审批。

## 与 Agno Trace / Metrics 的关系

Agno Trace / Metrics 作为底层观测来源。

业务层需要增加：

- agent_version_id。
- workflow_version_id。
- tool_version_id。
- tenant_id。
- shop_id。
- optimization_case_id。

这些字段不一定要写入 Agno trace 表，但必须能通过 run_id/trace_id 关联。

## 原型任务

1. 保存两个 Listing Agent 版本。
2. 对同一个 ProductSnapshot 运行两个版本。
3. 对比输出 schema 成功率、标题长度、风险词。
4. 模拟用户反馈。
5. 生成优化建议。
6. 手动切换 active version。
7. 记录 OptimizationCase。
8. 记录 OptimizationSuggestion。
9. 基于同一批 AgentTestCase 生成 AgentVersionEvalRun。

## 第一版表设计补充

需要在业务 DB 中增加：

- agent_versions
- agent_test_cases
- agent_version_eval_runs
- optimization_cases
- optimization_suggestions
- agent_feedback

这些表和 Agno 表的关系：

```text
business.agent_versions
        |
business.agent_runs / workflow_runs
        |
Agno RunOutput / Trace / Metrics
        |
business.optimization_cases
        |
business.optimization_suggestions
        |
business.agent_versions draft
```

## 结论

Agno 提供了 Agent 迭代优化所需的底层证据能力，包括 learning、eval、trace、metrics、run output 和 DB 存储接口。

但 Agno 不提供完整的商业化 Agent 版本发布系统。我们的平台必须自建 AgentVersion、测试集、优化案例、优化建议、人工审核、发布和回滚。

第一版不做自动优化，只做受控闭环：

```text
记录证据 -> 形成优化案例 -> 生成人工可审的优化建议 -> 创建 draft 版本 -> 测试集回放 -> 人工发布 -> 可回滚
```

这条线是平台“越用越准”的基础，也是后续商业壁垒之一。
