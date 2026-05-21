# 06 Workflow 整体编排逻辑验证

## 研究目标

验证 Workflow 如何成为跨境电商可销售业务流程的主编排层。

我们前面已经确认：

- Agent 是专业生产节点。
- Team 是多专家评审节点。
- Tool Gateway 是外部系统读写边界。
- Approval 是人类确认边界。
- Orchestrator 是入口路由。

因此 Workflow 必须承担 MVP 的确定性流程控制。

## 业务场景

`Listing 优化并写回 Shopify Workflow`。

```text
读取 Shopify 商品
  -> Listing 优化 Agent
  -> Listing Review Team
  -> 生成 ListingDiff
  -> 创建审批
  -> 审批通过后写回 Shopify
  -> 写 audit_log
  -> 生成 memory candidate
```

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/workflow/workflow.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/step.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/types.py`
- `/Users/ske/agent/agno/libs/agno/agno/run/workflow.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/condition.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/router.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/parallel.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/loop.py`

## 源码阅读结论

### 1. Agno Workflow 可以作为确定性编排层

`Workflow` 支持的 step-like 组件包括：

- `Step`
- `Steps`
- `Loop`
- `Parallel`
- `Condition`
- `Router`
- nested `Workflow`
- callable function step

`Step` 支持四种 executor：

- `agent`
- `team`
- `executor`
- `workflow`

并且 `_validate_executor_config()` 强制一个 Step 只能有一个 executor。

结论：

Agno Workflow 足够承载我们的第一版主流程。它可以把函数步骤、Agent、Team、嵌套 Workflow 放到同一条可观察流程里。

### 2. Step 可以调用 Agent 和 Team

`Step.execute()` 中，如果 executor type 是 `agent` 或 `team`，会调用：

```text
active_executor.run(...)
```

并传入：

- input。
- images/videos/audio/files。
- session_id。
- user_id。
- session_state。
- run_context。
- dependencies。
- knowledge_filters。

如果 executor 是 Team，还会默认设置：

```text
store_member_responses=True
```

结论：

Workflow 可以天然调用：

- Listing 优化 Agent。
- Listing Review Team。

Team 的成员运行结果也可以进入 Workflow run 的证据链。

### 3. function step 适合业务确定性逻辑

Step 的 `executor` 可以是普通函数、生成器函数、异步函数。

function step 可以接收：

- `StepInput`
- `session_state`
- `run_context`

并返回：

- `StepOutput`
- 普通对象。
- RunOutput。
- TeamRunOutput。

结论：

我们的确定性业务逻辑应该优先放在 function step：

- 读取 Shopify ProductSnapshot。
- 校验 Nango connection。
- 生成 ListingDiff。
- 校验禁词和长度。
- 创建业务审批单。
- 调用 Tool Gateway 写回 Shopify。
- 写 audit_log。
- 生成 memory candidate。

不要让 Agent 自己承担这些强规则步骤。

### 4. StepInput / StepOutput 可以传递结构化数据

`StepInput` 包含：

- input。
- previous_step_content。
- previous_step_outputs。
- additional_data。
- media。
- workflow_session。

它提供：

- `get_step_output(step_name)`。
- `get_step_content(step_name)`。
- `get_all_previous_content()`。
- `get_last_step_content()`。

`StepOutput` 包含：

- step_name。
- step_id。
- step_type。
- executor_type。
- executor_name。
- content。
- step_run_id。
- metrics。
- success。
- error。
- is_paused。
- nested steps。

结论：

Workflow 可以做结构化数据传递。第一版要尽量让每个 step 的 content 是 Pydantic/JSON schema 对象，而不是自然语言字符串。

推荐关键结构：

- ProductSnapshot。
- ListingSuggestion。
- ListingReviewResult。
- ListingDiff。
- ApprovalRequest。
- ShopifyWriteResult。
- AuditLogEntry。
- MemoryCandidate。

### 5. Workflow 有 HITL 能力，适合审批和人工输入

`HumanReview` 支持：

- `requires_confirmation`
- `confirmation_message`
- `requires_user_input`
- `user_input_message`
- `user_input_schema`
- `requires_output_review`
- `output_review_message`
- `on_reject`
- `on_error`
- `max_retries`
- `timeout`
- `on_timeout`

`OnReject` 支持：

- skip。
- cancel。
- else_branch。
- retry。

`OnError` 支持：

- fail。
- skip。
- pause。

`OnTimeout` 支持：

- cancel。
- skip。
- approve。

结论：

Agno Workflow 的 HITL 能力可以支撑：

- 写回 Shopify 前确认。
- Agent 输出人工复核。
- 用户补充输入。
- step 失败后让用户决定 retry/skip。

但跨境电商产品中，业务审批仍然要自建表保存：

- tenant_id。
- shop_id。
- workflow_version_id。
- workflow_run_id。
- approval_type。
- approver。
- before/after diff。
- Nango connection。
- tool execution snapshot。

Agno 的 HITL 是运行暂停机制，不是完整业务审批系统。

### 6. Agent/Team 工具级暂停可以冒泡到 Workflow

Step 调用 Agent/Team 后会检查：

```text
response.is_paused
```

如果成员因为工具审批或用户输入暂停，Step 会把它转换成 paused step output。

Workflow 内部还有：

- `is_executor_pause`
- `resolve_executor_pause`
- `apply_executor_pause`
- `create_executor_paused_event`

结论：

如果 Agent 或 Team 触发工具级 HITL，Workflow 能感知并暂停。

但第一版仍建议：

- Listing Review Team 不配置 write tool。
- 写 Shopify 的能力只放在 Workflow 的 Tool Gateway step。
- 审批通过后才执行写回。

这样比让 Agent/Team 内部工具暂停更容易产品化和审计。

### 7. Workflow 支持 output review，适合人工审 ListingDiff

Step 支持：

- `requires_output_review`
- `output_review_message`

Workflow 执行后会产生：

- `StepOutputReviewEvent`
- post execution pause state。

结论：

我们的“ListingDiff 人工审批”可以用 output review 思路实现，但建议业务层包装成独立的 `approval_requests`。

推荐：

```text
Step: generate_listing_diff
  -> output ListingDiff

Step: create_approval_request
  -> 写业务 approval_requests
  -> Workflow paused

用户审批通过
  -> continue workflow
  -> write_back_shopify
```

### 8. Workflow 支持错误 pause / skip / fail，但业务场景要 fail-close

Agno 支持：

- step retry。
- skip_on_failure。
- on_error=pause。
- error requirement。

跨境电商写操作要遵循 fail-close：

- 读取 Shopify 失败：fail。
- Nango connection 不存在：fail。
- ListingSuggestion schema 失败：fail 或进入人工修正。
- Review Team 失败：fail 或降级为人工审核，不自动写回。
- 写 Shopify 失败：fail，并记录 audit。

第一版不建议随意 `skip_on_failure=True`，尤其不能跳过审批或写回校验。

### 9. Workflow save 会保存 step 里的 Agent/Team 并写 links，但业务仍要自建 WorkflowVersion

`Workflow.save()` 会：

1. 遍历 steps。
2. 保存 step 中的 Agent/Team。
3. 收集 step links。
4. `upsert_component(component_type=WORKFLOW)`。
5. `upsert_config(config=self.to_dict(), links=all_links)`。

step links 包含：

- `step_agent`
- `step_team`
- `step_workflow`
- `child_component_id`
- `child_version`
- `position`

这是有价值的底层能力。

但源码里 `Workflow.load()` 目前仍有 TODO：

```text
TODO: Use db.load_component_graph instead of get_config
```

而 `Step.from_dict()` 加载 agent/team 时会按 id 从 registry/db 找，仍然不等于我们的业务版本锁定。

结论：

必须自建 WorkflowVersion 和 StepSnapshot，明确锁定：

- agent_version_id。
- team_version_id。
- nested_workflow_version_id。
- tool_gateway_policy_version。
- approval_policy_version。

Agno component links 可作为底层参考，不作为业务真相。

### 10. WorkflowRunOutput 能保存完整运行证据

Workflow 事件包括：

- WorkflowStarted。
- WorkflowCompleted。
- WorkflowError。
- WorkflowCancelled。
- StepStarted。
- StepCompleted。
- StepPaused。
- StepContinued。
- StepExecutorPaused。
- StepExecutorContinued。
- StepOutputReview。
- StepError。
- StepOutput。

`StepOutput` 能记录：

- content。
- step_run_id。
- metrics。
- success/error。
- nested steps。

结论：

Agno Workflow 的运行输出足够作为底层执行证据。

业务层仍需要自建 `workflow_runs` 绑定：

- tenant_id。
- shop_id。
- workflow_version_id。
- actor_user_id。
- product_id。
- nango_connection_id。
- approval_request_id。
- audit_log_id。

## 第一版 Workflow 定位

```text
Workflow = 可销售业务流程
Agent = 专业生产能力
Team = 专家评审能力
Tool Gateway = 第三方读写边界
Approval = 人类确认边界
```

第一版商业产品不卖“一个聊天 Agent”，而是卖：

```text
Listing 优化并安全写回 Shopify 的流程
```

## Listing 优化并写回 Shopify Workflow v1

### Step 1: validate_context

类型：function step。

职责：

- 校验 tenant/workspace/shop。
- 校验 Clerk user 权限。
- 校验 Agent/Workflow 是否 active。
- 校验 Shopify shop 是否已通过 Nango 连接。

失败策略：

- fail。

### Step 2: read_shopify_product

类型：function step。

职责：

- 通过 Tool Gateway 调用 Nango connection。
- 读取 Shopify product。
- 生成 ProductSnapshot。

失败策略：

- fail。

### Step 3: optimize_listing

类型：Agent step。

职责：

- 调用 Listing 优化 Agent。
- 输入 ProductSnapshot。
- 输出 ListingSuggestion。

要求：

- output_schema 必须校验。
- 不允许 write tool。

失败策略：

- schema 失败进入人工修正或 fail。

### Step 4: review_listing

类型：Team step。

职责：

- 调用 Listing Review Team。
- SEO / 文案 / 合规多专家评审。
- 输出 ListingReviewResult。

要求：

- Team 不允许 write tool。
- output_schema 必须校验。

失败策略：

- fail 或进入人工审核。

### Step 5: generate_listing_diff

类型：function step。

职责：

- 对比 ProductSnapshot 和 ListingSuggestion。
- 生成 ListingDiff。
- 标记字段级风险。

输出：

- title diff。
- description diff。
- seo title diff。
- seo description diff。
- tags diff。
- risk summary。

失败策略：

- fail。

### Step 6: create_approval_request

类型：function step + workflow pause。

职责：

- 创建业务审批单。
- 保存 before/after diff。
- 保存 tool execution plan。
- 暂停 Workflow。

拒绝策略：

- 用户拒绝后进入 revise path，不写回。

### Step 7: write_back_shopify

类型：function step。

职责：

- 审批通过后，由 Tool Gateway 执行写回。
- 使用审批时冻结的 diff 和参数。
- 通过 Nango connection 获取 token。
- 写回 Shopify。

要求：

- 不允许 Agent 直接调用。
- 不允许审批后修改参数。

失败策略：

- fail。
- 记录失败 audit。

### Step 8: write_audit_log

类型：function step。

职责：

- 记录完整审计链路：
  - actor。
  - tenant/shop。
  - workflow_version。
  - agent/team versions。
  - approval decision。
  - Shopify write result。

### Step 9: generate_memory_candidate

类型：function step 或 Agent step。

职责：

- 从审批和用户修改中提取记忆候选。
- 不直接写入长期记忆。
- 进入 memory review。

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
- approval_policy_snapshot
- tool_gateway_policy_snapshot
- nango_scope_snapshot
- memory_policy_snapshot
- eval_summary
- release_note
- created_by
- reviewed_by
- published_at
- created_at

### workflow_step_snapshots

- workflow_step_snapshot_id
- workflow_version_id
- step_key
- step_name
- step_type
- executor_type
- executor_ref_type
- executor_instance_id
- executor_version_id
- position
- input_mapping
- output_mapping
- retry_policy
- timeout_policy
- approval_policy
- failure_policy
- created_at

`executor_ref_type`：

- function
- agent
- team
- workflow
- tool_gateway

## WorkflowRun 设计

### workflow_runs

- workflow_run_id
- tenant_id
- workspace_id
- shop_id
- workflow_instance_id
- workflow_version_id
- product_external_id
- nango_connection_id
- actor_user_id
- status
- paused_reason
- current_step_key
- input_snapshot
- output_snapshot
- agno_workflow_run_id
- agno_session_id
- metrics_snapshot
- created_at
- updated_at

### workflow_step_runs

- workflow_step_run_id
- workflow_run_id
- step_key
- step_snapshot_id
- status
- executor_run_id
- input_snapshot
- output_snapshot
- error_snapshot
- metrics_snapshot
- started_at
- completed_at

### approval_requests

- approval_request_id
- tenant_id
- workspace_id
- shop_id
- workflow_run_id
- workflow_step_run_id
- status
- approval_type
- before_snapshot
- after_snapshot
- diff_snapshot
- tool_execution_plan_snapshot
- requested_by
- reviewed_by
- reviewed_at
- rejection_reason
- created_at

## 与 Nango / Tool Gateway 的关系

Nango 只负责：

- 第三方 OAuth。
- connection。
- token。
- provider config。

Tool Gateway 负责：

- 根据 tenant/shop 找 Nango connection。
- 校验 scope。
- 校验当前 WorkflowStep 是否允许调用。
- 构造 Shopify API 请求。
- 执行读写。
- 记录 tool execution。

Workflow 不直接拿 token。

Agent / Team 更不能拿 token。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Workflow 是否能调用 Agent | 能。Step 支持 agent executor。 |
| Workflow 是否能调用 Team | 能。Step 支持 team executor，并可保存 member responses。 |
| Workflow 是否能调用 function step | 能。适合业务确定性逻辑。 |
| Workflow 是否支持 nested workflow | 支持，但序列化恢复仍有限制，第一版少用嵌套。 |
| Step 之间如何传递结构化数据 | 通过 StepInput / StepOutput / previous_step_outputs。 |
| Step 失败如何处理 | max_retries、skip_on_failure、on_error fail/skip/pause。 |
| 审批如何暂停 | HumanReview 或业务 approval step 都可以暂停。产品上建议自建 approval_requests。 |
| 审批通过后如何继续 | Workflow 支持 continue_run，继续 paused step 或下一步。 |
| 用户拒绝审批后如何处理 | OnReject 支持 skip/cancel/retry；业务上拒绝写回并进入 revise path。 |
| Agent/Team 内部工具审批能否冒泡 | 能。executor pause 可冒泡到 Workflow。 |
| Workflow run 如何记录状态 | Agno 有 WorkflowRunOutput 和 events；业务层必须自建 workflow_runs。 |
| Workflow 是否能锁定 Agent/Team 版本 | Agno save links 有基础能力，但业务层必须自建 WorkflowVersion step snapshot。 |

## 原型任务

1. 创建 ProductSnapshot schema。
2. 创建 ListingSuggestion schema。
3. 创建 ListingReviewResult schema。
4. 创建 ListingDiff schema。
5. 实现 mock `validate_context`。
6. 实现 mock `read_shopify_product`。
7. 接入 Listing 优化 Agent。
8. 接入 Listing Review Team。
9. 实现 `generate_listing_diff`。
10. 实现 mock `create_approval_request` 并暂停。
11. 实现 mock `write_back_shopify`。
12. 实现 `write_audit_log`。
13. 保存 workflow_runs / workflow_step_runs。
14. 验证拒绝审批不会写回。
15. 验证通过审批后只按冻结 diff 写回。

## 第一版结论

Agno Workflow 可以承担我们的 MVP 主编排层。

它已经具备：

- function step。
- Agent step。
- Team step。
- nested workflow step。
- StepInput / StepOutput。
- retry。
- error pause。
- confirmation。
- user input。
- output review。
- Agent/Team executor pause 冒泡。
- workflow events。
- workflow run output。
- component/config 版本保存。

但商业平台仍然必须自建：

- WorkflowTemplate。
- WorkflowInstance。
- WorkflowVersion。
- WorkflowStepSnapshot。
- WorkflowRun。
- WorkflowStepRun。
- ApprovalRequest。
- ToolExecution。
- AuditLog。

第一版架构原则：

```text
Agno Workflow 负责运行编排
业务后端负责版本、权限、审批、审计和第三方写入边界
Tool Gateway 是唯一能读写 Shopify 的地方
Agent/Team 只能生产建议和评审
```

这条路径最适合我们现在要做的跨境电商垂类 Agent 商业框架：足够快，也足够可控。
