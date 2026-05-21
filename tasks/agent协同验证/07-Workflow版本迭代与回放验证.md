# 07 Workflow 版本迭代与回放验证

## 研究目标

验证 Workflow 如何版本化、如何绑定 AgentVersion、TeamVersion、ToolGatewayPolicyVersion，以及如何支持历史回放、对比评估和回滚。

这份文档解决三个问题：

- Workflow 变化后如何安全发布。
- 历史 run 如何追溯当时配置。
- 新版本上线前如何用历史案例 dry-run 回放。

## 业务场景

`Listing Workflow v1` 没有合规检查。

```text
读取 Shopify 商品
  -> Listing 优化 Agent
  -> 生成 ListingDiff
  -> 审批
  -> 写回 Shopify
```

后续 `Listing Workflow v2` 加入：

- Listing Review Team。
- Compliance Agent。
- diff 风险分级。
- 更严格的审批策略。

历史 run 必须仍然能追溯：

- 当时用的是 v1 还是 v2。
- 当时调用了哪个 AgentVersion。
- 当时是否经过 TeamReview。
- 当时写回 Shopify 的 diff 是什么。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/workflow/workflow.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/step.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/types.py`
- `/Users/ske/agent/agno/libs/agno/agno/run/workflow.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/postgres/postgres.py`

## 源码阅读结论

### 1. Agno Workflow 可以保存配置版本，但不能直接等同业务 WorkflowVersion

`Workflow.save()` 会：

1. 保存 step 中的 Agent/Team。
2. 收集 step links。
3. `upsert_component(component_type=WORKFLOW)`。
4. `upsert_config(config=self.to_dict(), links=all_links)`。

Agno component/config 已支持：

- draft。
- published。
- published 不可变。
- current_version。
- set_current_version rollback。

结论：

Agno 有底层版本保存能力，但业务 WorkflowVersion 仍然必须自建。

原因：

- Agno config 没有 tenant/shop/workspace。
- Agno config 没有审批审核状态。
- Agno config 没有 Nango scope 快照。
- Agno config 没有 Tool Gateway 策略版本。
- Agno config 没有发布门禁。
- Agno config 没有 dry-run 回放策略。

### 2. Workflow.save 会写 step links，但 Workflow.load 目前没有使用完整 component graph

`Workflow.save()` 保存 step links 时会写入：

- `step_agent`
- `step_team`
- `step_workflow`
- `child_component_id`
- `child_version`
- `position`

这说明 Agno 底层能表达：

```text
WorkflowVersion -> Step -> Agent/Team child version
```

但是 `Workflow.load()` 源码里有 TODO：

```text
TODO: Use db.load_component_graph instead of get_config
```

当前 `Workflow.load()` 还是通过 `db.get_config()` 读取 workflow config，然后 `Workflow.from_dict()` 重建。

`Step.from_dict()` 读取 agent/team 时，会按 id 从 registry 或 db 找，不一定严格使用 link 里的 child_version。

结论：

不能依赖 Agno Workflow 原生 load 来保证业务版本锁定。

我们的业务运行时必须按 `workflow_step_snapshots` 自己装配：

```text
WorkflowVersion
  -> StepSnapshot
      -> AgentVersion / TeamVersion / FunctionRef / ToolGatewayPolicy
  -> construct Agno Workflow
```

### 3. WorkflowRunOutput 可以保存回放所需的底层证据

`WorkflowRunOutput` 包含：

- input。
- content。
- workflow_id。
- workflow_name。
- run_id。
- session_id。
- user_id。
- parent_run_id。
- workflow_step_id。
- step_results。
- step_executor_runs。
- workflow_agent_run。
- events。
- metrics。
- metadata。
- status。
- step_requirements。
- error_requirements。
- paused_step_index。
- paused_step_name。
- pause_kind。

它支持 `to_dict()` / `from_dict()`，并能恢复：

- StepOutput。
- Agent RunOutput。
- TeamRunOutput。
- nested WorkflowRunOutput。
- workflow events。
- step requirements。
- error requirements。

结论：

Agno 的 WorkflowRunOutput 足够作为底层执行证据。但业务层仍要额外保存：

- workflow_version_id。
- step_snapshot_id。
- agent_version_id。
- team_version_id。
- tool_gateway_policy_version_id。
- tenant/shop/product。
- approval_request_id。
- write_back_execution_id。

### 4. Workflow continue_run 能支撑审批后继续和拒绝后重试

`continue_run()` 支持：

- 从 run_response 继续。
- 从 run_id + session_id 加载后继续。
- 传入更新后的 step_requirements。
- stream / non-stream。

它会处理：

- unresolved requirements 校验。
- timeout。
- reject skip。
- reject retry。
- reject cancel。
- condition else。
- post-execution review。
- edited output。
- user_input。
- router selection。
- executor HITL requirements。

结论：

Agno 的暂停/继续机制足够支撑工作流级审批。

但业务平台必须自己保存 approval request 和 decision，因为审批不只是继续 run，还关系到：

- 谁批准。
- 批准哪个 diff。
- 使用哪个 Nango connection。
- 是否允许写 Shopify。
- 写回参数是否冻结。

### 5. 回放不能重新执行真实写回

这是跨境电商平台的核心安全规则。

Workflow 回放分三类：

1. `trace replay`：只展示历史输入、输出、事件、审批和写回结果，不重新调用 LLM 或 Shopify。
2. `dry-run replay`：重新运行 Agent/Team/function 逻辑，但所有外部写工具禁用。
3. `shadow replay`：新版本用历史输入重跑，结果只用于对比，不影响线上数据。

默认回放必须是：

```text
dry-run / shadow-run
```

绝不能重新执行：

- Shopify update product。
- Shopify publish product。
- price update。
- inventory update。
- delete image。
- marketing action。

真实写回只能来自当前 active Workflow 的审批链路。

### 6. 历史 run 不跟随版本升级

如果：

- Workflow v1 用 Listing Agent v1。
- Workflow v2 用 Listing Agent v2 + Listing Review Team v1。

那么历史 WorkflowRun 必须永远绑定当时版本：

- workflow_version_id。
- step_snapshot_id。
- agent_version_id。
- team_version_id。

结论：

rollback 也不能修改历史 run。rollback 只是切换：

```text
workflow_instances.active_version_id
```

历史 run 的版本指针不变。

## WorkflowVersion 设计

### workflow_templates

- workflow_template_id
- name
- vertical
- description
- default_steps
- default_input_schema
- default_output_schema
- status
- created_at

### workflow_instances

- workflow_instance_id
- tenant_id
- workspace_id
- shop_id
- workflow_template_id
- name
- status
- active_version_id
- created_by
- created_at
- updated_at

### workflow_versions

- workflow_version_id
- workflow_instance_id
- version
- status
- input_schema
- output_schema
- step_snapshot
- step_conditions
- retry_policy
- approval_policy_snapshot
- tool_gateway_policy_snapshot
- nango_scope_snapshot
- memory_policy_snapshot
- eval_summary
- release_note
- created_by
- reviewed_by
- reviewed_at
- published_at
- created_at

`status`：

- draft
- in_review
- rejected
- testing
- active
- archived

### workflow_step_snapshots

- workflow_step_snapshot_id
- workflow_version_id
- step_key
- step_name
- position
- step_type
- executor_type
- executor_ref_type
- executor_instance_id
- executor_version_id
- input_mapping
- output_mapping
- retry_policy
- timeout_policy
- approval_policy_snapshot
- tool_gateway_policy_snapshot
- failure_policy
- dry_run_policy
- created_at

`executor_ref_type`：

- function
- agent
- team
- workflow
- tool_gateway

## WorkflowRun 版本绑定

### workflow_runs

- workflow_run_id
- tenant_id
- workspace_id
- shop_id
- workflow_instance_id
- workflow_version_id
- status
- mode
- product_external_id
- nango_connection_id
- actor_user_id
- input_snapshot
- output_snapshot
- agno_workflow_run_id
- agno_session_id
- metrics_snapshot
- paused_reason
- current_step_key
- created_at
- updated_at

`mode`：

- live
- dry_run
- replay
- shadow

### workflow_step_runs

- workflow_step_run_id
- workflow_run_id
- workflow_step_snapshot_id
- step_key
- status
- executor_type
- executor_run_id
- executor_instance_id
- executor_version_id
- input_snapshot
- output_snapshot
- error_snapshot
- metrics_snapshot
- started_at
- completed_at

### workflow_replay_runs

- workflow_replay_run_id
- source_workflow_run_id
- replay_workflow_version_id
- replay_mode
- status
- input_snapshot
- output_snapshot
- diff_summary
- metrics_comparison
- created_by
- created_at

`replay_mode`：

- trace_replay
- dry_run_replay
- shadow_replay

## 版本发布流程

```text
draft
  -> in_review
  -> testing
  -> active
  -> archived
```

发布规则：

- active 版本不可原地修改。
- 任意 step 变化生成新 WorkflowVersion。
- AgentVersion / TeamVersion 引用变化生成新 WorkflowVersion。
- Tool Gateway policy 变化生成新 WorkflowVersion。
- Nango scope 要求变化生成新 WorkflowVersion。
- approval policy 变化生成新 WorkflowVersion。
- 发布 active 必须有 release note。
- 发布 active 前必须通过固定测试集和 dry-run replay。

## 哪些变化必须生成新 WorkflowVersion

- 新增 step。
- 删除 step。
- 修改 step 顺序。
- 修改 condition/router 规则。
- 修改 AgentVersion。
- 修改 TeamVersion。
- 修改 Tool Gateway policy。
- 修改 approval policy。
- 修改 retry/on_error/on_reject。
- 修改 output schema。
- 修改 input mapping / output mapping。
- 修改 Nango scope。
- 修改 memory policy。

## 回放设计

### trace replay

只读取历史记录，不重新执行。

用途：

- 用户查看历史执行过程。
- 审计。
- 客服排查。
- bug 定位。

不调用：

- LLM。
- Shopify。
- Nango。
- Tool Gateway。

### dry-run replay

使用历史 input snapshot 重新运行 Workflow。

外部写操作全部 mock 或禁用。

允许：

- 重新跑 Agent。
- 重新跑 Team。
- 重新计算 ListingDiff。
- 重新走审批逻辑模拟。

禁止：

- 真实写 Shopify。
- 创建真实 Shopify side effect。
- 修改长期 memory。

### shadow replay

使用新 WorkflowVersion 对历史样本批量运行。

用途：

- v2 上线前对比 v1。
- 评估新 Agent/Team 组合。
- 评估成本和耗时。
- 评估审批通过率预测。

输出：

- schema 成功率对比。
- 合规风险发现率对比。
- 用户编辑率预测。
- 平均成本对比。
- 平均耗时对比。

## Listing Workflow v1 -> v2 示例

### v1

```text
1. read_shopify_product
2. optimize_listing: Listing Agent v1
3. generate_listing_diff
4. approval
5. write_back_shopify
```

问题：

- 没有合规检查。
- 审批拒绝率较高。
- 用户经常手动删掉风险词。

### v2 draft

```text
1. read_shopify_product
2. optimize_listing: Listing Agent v2
3. review_listing: Listing Review Team v1
4. generate_listing_diff_with_risk
5. approval_with_risk_summary
6. write_back_shopify
```

上线前必须：

- 对 v1 的历史拒绝案例做 shadow replay。
- 验证 Team 是否发现合规风险。
- 验证成本和耗时是否可接受。
- 验证审批通过率预测是否提升。

## 回滚设计

rollback 不复制旧版本，也不修改历史 run。

只做：

```text
workflow_instances.active_version_id = target_workflow_version_id
```

并记录：

### workflow_release_events

- workflow_release_event_id
- tenant_id
- workflow_instance_id
- from_version_id
- to_version_id
- event_type
- reason
- created_by
- created_at

`event_type`：

- publish
- pause
- resume
- rollback
- archive

## 发布门禁

WorkflowVersion 发布 active 前必须检查：

- 所有 AgentVersion 已 active。
- 所有 TeamVersion 已 active。
- TeamVersion 成员版本已锁定。
- Tool Gateway policy 已审核。
- write step 必须在 approval step 之后。
- write step 必须有 frozen input。
- dry-run replay 不产生外部副作用。
- output schema 通过率达标。
- 审批拒绝率预测可接受。
- 平均成本在阈值内。
- 平均耗时在阈值内。

## 第一版回放指标

- workflow_success_rate。
- step_failure_rate。
- output_schema_success_rate。
- approval_rejection_rate。
- user_edit_rate。
- compliance_risk_detected_rate。
- write_tool_blocked_in_dry_run_rate。
- avg_cost。
- avg_latency。

第一版必须先做：

- workflow_success_rate。
- output_schema_success_rate。
- write_tool_blocked_in_dry_run_rate。
- avg_cost。
- avg_latency。

## 原型任务

1. 创建 Listing Workflow v1。
2. 运行 5 个 ProductSnapshot 样本。
3. 保存 workflow_runs / workflow_step_runs。
4. 创建 Listing Workflow v2 draft。
5. v2 增加 Listing Review Team。
6. 对 v1 历史样本做 shadow replay。
7. 验证 v2 不真实写 Shopify。
8. 生成 v1/v2 对比报告。
9. 审核并发布 v2。
10. 创建 rollback 事件，切回 v1。
11. 验证新 run 使用 v1。
12. 验证历史 v2 run 仍绑定 v2。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Workflow step 配置是否能序列化 | 能。Workflow/Step 都有 to_dict/from_dict。 |
| Workflow 是否能保存 Agent/Team link | 能。Workflow.save 会写 step links，并带 child_version。 |
| Workflow 原生 load 是否完整使用 component graph | 目前不是，源码有 TODO。业务层不能依赖它做版本锁定。 |
| Workflow 是否能锁定 AgentVersion | Agno 底层有 link 能力，但业务层必须用 StepSnapshot 显式锁定。 |
| Workflow 是否能锁定 TeamVersion | 同上，业务层必须显式锁定。 |
| Workflow 是否能锁定 ToolVersion | Agno 不管理我们的 Tool Gateway policy，必须业务层自建。 |
| 历史 run 是否能按照旧配置回放 | 可以通过业务快照 + dry-run replay 实现。不能依赖 current 配置。 |
| rollback 是否只需切换 active WorkflowVersion | 是。切 active pointer，并记录 release event。 |
| 回放是否能重新写 Shopify | 不能。回放默认 dry-run/shadow-run，真实写回必须禁用。 |
| continue_run 是否支持审批后继续 | 支持。Agno continue_run 能处理确认、拒绝、重试、编辑输出和用户输入。 |

## 第一版结论

WorkflowVersion 是我们的商业流程版本，不是简单的 Agno config version。

Agno 提供了很好的执行和底层版本能力：

- Workflow to_dict/from_dict。
- Workflow.save。
- component/config version。
- step links。
- child_version。
- WorkflowRunOutput。
- StepOutput。
- step_executor_runs。
- continue_run。
- HITL requirements。

但我们的平台必须自建：

- WorkflowVersion。
- WorkflowStepSnapshot。
- WorkflowRun。
- WorkflowStepRun。
- WorkflowReplayRun。
- WorkflowReleaseEvent。
- ToolGatewayPolicyVersion。
- ApprovalPolicySnapshot。

第一版最关键的安全规则：

```text
历史 run 不跟随版本升级
回放不允许真实写回 Shopify
rollback 只切 active_version_id
所有 write step 必须在审批之后
```

这套规则会让我们既能快速迭代 Listing Workflow，又不会把用户真实店铺数据暴露在不可控自动化风险里。
