# 04 Team 调用 Agent 与协同模式验证

## 研究目标

验证 Agno Team 如何调用多个 Agent，以及 `route / coordinate / broadcast / tasks` 四种模式在跨境电商场景中的适用边界。

核心问题：

- Team 能不能承载多专家协作。
- Team 能不能锁定成员 Agent 版本。
- Team 是否适合直接执行高风险写操作。
- Team 和 Workflow 的边界如何划分。

## 业务场景

`Listing Review Team` 包含：

- SEO Agent。
- Copywriting Agent。
- Compliance Agent。

它对 Listing 优化方案进行多角度评审，输出结构化 `ListingReviewResult`，再交给 Workflow 决定是否进入人工审批和写回 Shopify。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/team/team.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/mode.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_init.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_messages.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_tools.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_default_tools.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_run.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/_storage.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/task.py`
- `/Users/ske/agent/agno/libs/agno/agno/run/team.py`

## 源码阅读结论

### 1. Team 成员可以是 Agent，也可以是嵌套 Team

`Team.members` 类型支持：

```text
List[Agent | Team] | Callable[..., List]
```

也就是说，Team 可以由多个 Agent 组成，也可以由子 Team 组成。

结论：

Agno 原生支持我们未来做多层协作：

```text
Listing Review Team
  - SEO Agent
  - Copywriting Agent
  - Compliance Agent

Store Growth Team
  - Listing Review Team
  - Pricing Agent
  - Inventory Agent
```

但是第一版不建议做太深的 Team 嵌套，因为调试、权限快照、审批和成本统计都会变复杂。

### 2. Team 的四种模式本质是 leader model 使用不同协作策略

`TeamMode` 包含：

- `coordinate`
- `route`
- `broadcast`
- `tasks`

`_init.py` 中会把 mode 归一化：

- `route`：`respond_directly=True`，`delegate_to_all_members=False`。
- `broadcast`：`delegate_to_all_members=True`，`respond_directly=False`。
- `coordinate`：leader 选择一个或多个成员，并综合结果。
- `tasks`：leader 进入任务列表循环，自主拆解、执行、检查任务。

`_messages.py` 会根据 mode 生成不同系统提示词。

结论：

Team mode 不是强业务流程引擎，而是“leader agent 的协作提示词 + 可用工具”的组合。

因此：

- Team 适合做分析、评审、路由、综合判断。
- Team 不适合承担强约束业务流程的唯一控制层。
- 强约束流程仍应该放在 Workflow 和业务后端。

### 3. Team 调用成员靠 delegate tool，不是直接函数调用编排

`_tools.py` 中会给 Team leader 添加成员委派工具：

- `delegate_task_to_member`
- `delegate_task_to_members`

`broadcast` 模式使用 `delegate_task_to_members`，会把任务发给所有成员。

`route / coordinate` 模式使用 `delegate_task_to_member`，由 leader 选择成员。

结论：

Team 的成员调用由 LLM 决策触发，所以存在不确定性。

这对 Listing 评审是可以接受的，因为它属于低风险分析场景。

但对 Shopify 写回不适合：

- 不应该由 Team 自己决定是否写回。
- 不应该由 Team 自己选择写哪个店铺。
- 不应该由 Team 自己绕过审批。

写操作必须回到 Workflow + Tool Gateway。

### 4. route 适合入口分发，但不适合高风险执行

`route` 模式下，Team leader 会选择单个最匹配成员，且成员响应会直接返回。

适合：

- 用户自然语言入口。
- “这个问题该找哪个 Agent”。
- 简单客服/运营问答分流。
- 后台工作台中的快速助手。

不适合：

- 多步骤业务流程。
- 需要强审计的写操作。
- 需要多个专家互相校验的 Listing 改写。

跨境电商第一版建议：

`route` 只用于 Orchestrator 或工作台入口，把请求路由到：

- Listing 优化 Workflow。
- Listing Review Team。
- 某个只读分析 Agent。

不要让 `route` 直接执行写工具。

### 5. broadcast 适合多专家并列评审

`broadcast` 模式会把同一个任务并行发给所有成员，再由 Team leader 汇总。

适合：

- SEO / 文案 / 合规并列评审。
- 标题、描述、标签的多角度打分。
- 对同一个 ListingSuggestion 找风险。

跨境电商第一版最推荐的 Team MVP：

```text
ListingReviewTeam(mode=broadcast)
  -> SEO Agent 评估搜索相关性
  -> Copywriting Agent 评估表达和转化
  -> Compliance Agent 评估禁词和平台风险
  -> Team leader 汇总为 ListingReviewResult
```

原因：

- 输入明确。
- 成员职责明确。
- 结果可并列比较。
- 对写操作没有直接权限。
- 适合做结构化输出。

### 6. coordinate 适合综合诊断，但可控性弱于 Workflow

`coordinate` 模式下，leader 可以选择一个或多个成员，并综合他们的输出。

适合：

- 店铺诊断。
- 商品页综合优化建议。
- “为什么这个 listing 转化差”的多因素分析。
- 需要 leader 按情况选择专家的任务。

风险：

- leader 可能少叫某个关键成员。
- leader 可能重复委派。
- leader 的综合过程不如显式 Workflow 可控。

第一版建议：

- `coordinate` 可以用于分析型场景。
- 关键商业流程仍用 Workflow 显式规定步骤。

比如：

```text
Workflow step 1: ProductSnapshot
Workflow step 2: Listing Optimize Agent
Workflow step 3: Listing Review Team(mode=broadcast or coordinate)
Workflow step 4: Human Approval
Workflow step 5: Tool Gateway write back
```

### 7. tasks 模式有自主任务列表，但不适合 MVP 主流程

`tasks` 模式会启用任务管理工具，leader 可以：

- 创建任务。
- 分配任务。
- 并行执行任务。
- 记录任务状态。
- 判断任务完成。

`team/task.py` 中定义了：

- `Task`
- `TaskList`
- `TaskStatus`

状态包括：

- pending
- in_progress
- completed
- failed
- blocked

结论：

tasks 模式很强，适合长期做“复杂运营项目助手”，例如：

- 新品上架计划。
- 一周增长计划。
- 全店 SEO 改造计划。

但第一版不建议把它作为主商业流程。

原因：

- 自主循环不确定性高。
- 成本更难预测。
- 需要更强的观察、暂停、恢复、审批和任务审计。
- 跨境电商写操作不能由自主任务循环直接推进。

第一版可以把 `tasks` 作为实验功能，不作为 Listing 写回 MVP 的核心路径。

### 8. Team 成员共享同一个 session_id，但 session_state 会复制后合并

在 `delegate_task_to_member` 中，成员运行时会使用：

- 同一个 `session.session_id`。
- 同一个 `user_id`。
- `session_state` 的 copy。
- 运行后再 merge 回 Team 的 session_state。

成员运行结果会：

- 设置 `parent_run_id`。
- 写入 Team session。
- 可选加入 Team run response 的 member responses。

结论：

Agno Team 天然支持把一次 Team 运行和成员运行串起来。

但我们的业务层仍然必须额外记录：

- team_version_id。
- member_agent_version_id。
- tenant_id。
- shop_id。
- workflow_run_id。
- 每个成员的权限快照。

Agno 的 parent_run_id 可以辅助追踪，但不是完整商业审计链路。

### 9. Team 可以传播成员的 HITL pause，但审批边界仍要业务层管理

`_propagate_member_pause()` 会把成员 run 的 human input / approval requirement 复制到 Team run response。

这意味着：

- 如果成员 Agent 调用了需要审批的工具。
- Team run 可以进入 paused。
- Team continue_run 可以继续把审批结果路由回成员。

结论：

Agno 对 Team 内成员暂停/继续做了基础支持。

但跨境电商第一版仍建议：

- Team 成员默认不配置 write tool。
- Team 只输出建议和评审。
- 写操作集中在 Workflow 的 Tool Gateway step。

这样审批体验更可控，也更容易审计。

### 10. Team 可以结构化输出

`Team` 支持：

- `input_schema`
- `output_schema`
- `parser_model`
- `output_model`
- `use_json_mode`
- `parse_response`

`route` 模式下，如果 Team 有 output_schema，且成员没有 output_schema，源码会把 Team output_schema 传给成员。

结论：

Listing Review Team 可以输出结构化结果。

第一版建议定义：

```text
ListingReviewResult
  - seo_score
  - copy_score
  - compliance_score
  - risk_level
  - required_changes
  - optional_suggestions
  - approval_recommendation
```

Team 输出不能直接写回 Shopify，只能作为 Workflow 下一步输入。

### 11. Team save/load 支持 members link，但成员版本锁定仍需业务层保证

`Team.save()` 会：

- 先保存每个成员。
- 收集 member link。
- 保存 Team config。
- 写入 component links。

link 中包含：

- `link_kind="member"`
- `child_component_id`
- `child_version`
- `position`
- `meta.type`

这是非常有用的底层能力。

但是 `Team.from_dict()` 中读取 members 时有源码 TODO：当前加载 member agent 时没有正确传入版本，可能会拿到 latest/current。

结论：

不能只依赖 Agno Team 原生加载来保证“TeamVersion 锁定成员 AgentVersion”。

我们的业务层必须自建：

- TeamTemplate。
- TeamInstance。
- TeamVersion。
- TeamMemberSnapshot。

TeamVersion 必须明确保存：

- member_agent_instance_id。
- member_agent_version_id。
- member_role。
- member_policy。
- position。

运行时由业务层按 TeamVersion 快照构造成员 Agent，而不是让 Team 自动拿最新成员。

## Team 在我们平台中的定位

第一版定位：

```text
Team = 多专家分析/评审单元
Workflow = 商业流程控制单元
Tool Gateway = 外部读写权限边界
Orchestrator = 入口路由/意图识别
```

不要把 Team 当成 Workflow 的替代品。

Team 可以帮我们提升质量，但不能替代：

- 审批。
- 权限。
- 版本锁定。
- 可回放流程。
- 写操作边界。

## 推荐 MVP Team

第一版只做一个 Team：

```text
Listing Review Team
mode: broadcast
members:
  - SEO Agent
  - Copywriting Agent
  - Compliance Agent
output:
  - ListingReviewResult
```

它接收：

- ProductSnapshot。
- ListingSuggestion。
- 店铺品牌约束。
- 平台规则摘要。

它输出：

- 多维评分。
- 风险项。
- 必改项。
- 可选优化项。
- 是否建议进入人工审批。

## TeamVersion 设计

### team_templates

- team_template_id
- name
- vertical
- description
- default_mode
- default_output_schema
- status
- created_at

### team_instances

- team_instance_id
- tenant_id
- workspace_id
- shop_id
- team_template_id
- name
- status
- active_version_id
- created_by
- created_at

### team_versions

- team_version_id
- team_instance_id
- version
- status
- mode
- leader_model_policy
- instructions
- output_schema
- member_snapshot
- knowledge_scope_snapshot
- memory_policy_snapshot
- approval_policy_snapshot
- eval_summary
- release_note
- created_by
- reviewed_by
- published_at
- created_at

### team_member_snapshots

- team_member_snapshot_id
- team_version_id
- member_type
- member_instance_id
- member_version_id
- member_role
- position
- required
- policy_snapshot

`member_type`：

- agent
- team

## Team 运行记录

### team_runs

- team_run_id
- tenant_id
- workspace_id
- shop_id
- team_instance_id
- team_version_id
- workflow_run_id
- agno_team_run_id
- agno_session_id
- status
- input_snapshot
- output_snapshot
- member_run_snapshots
- metrics_snapshot
- created_by
- created_at

### member_run_snapshots

- member_type
- member_instance_id
- member_version_id
- agno_run_id
- parent_run_id
- status
- output_snapshot
- tool_calls_snapshot
- metrics_snapshot

## 与 Workflow 的关系

第一版主流程：

```text
Workflow: Listing 优化并写回 Shopify

1. 读取 Shopify ProductSnapshot
2. Listing 优化 Agent 生成 ListingSuggestion
3. Listing Review Team 评审 ListingSuggestion
4. 如果 Review 通过，进入人工审批
5. 人工审批通过后，Tool Gateway 写回 Shopify
6. 保存运行证据和优化样本
```

Team 只在第 3 步提供评审结果。

## 原型任务

1. 创建 SEO Agent、Copywriting Agent、Compliance Agent。
2. 创建 Listing Review Team。
3. 使用 `broadcast` 模式对同一个 ListingSuggestion 并列评审。
4. 输出 `ListingReviewResult`。
5. 把 Team 输出传给 Workflow 下一步。
6. 验证 Team run 中能看到成员 run。
7. 验证成员 run 能绑定业务 agent_version_id。
8. 验证 TeamVersion 能锁定成员版本。
9. 验证 Team 不具备 write tool。
10. 验证 Workflow 才能触发写回审批。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Team 成员可以是 Agent 还是 Team | 两者都可以，且支持嵌套 Team。 |
| Team 是否支持四种协作模式 | 支持 route、coordinate、broadcast、tasks。 |
| Team 调用成员是否由 LLM 决策 | 是。通过 delegate tool 触发。 |
| broadcast 是否适合 Listing 多专家评审 | 适合，是第一版最推荐 Team MVP。 |
| coordinate 是否适合综合诊断 | 适合，但不如 Workflow 可控。 |
| route 是否适合入口分发 | 适合，但不适合直接高风险写操作。 |
| tasks 是否适合 MVP 主流程 | 不建议。适合作为后续实验能力。 |
| Team 是否能结构化输出 | 能，支持 output_schema / parser / output model。 |
| Team 是否共享 session | 成员使用同一个 Team session_id，并写入 Team session。 |
| Team 成员权限是否天然隔离 | 不够。必须由业务层和 Tool Gateway 做成员级权限快照。 |
| Team 能否锁定成员 AgentVersion | Agno links 有 child_version，但原生 from_dict 有 TODO。业务层必须自建 TeamVersion member snapshot。 |
| Team 成员审批能否传播 | 能传播 member pause，但第一版仍建议 Team 不配置 write tool。 |

## 第一版结论

Agno Team 能实现类似 OpenHuman 多 Agent 协作中的“专家组”能力，尤其适合：

- 多专家评审。
- 入口路由。
- 综合分析。
- 后续复杂任务计划。

但它不应该成为第一版商业流程的主控制层。

我们的第一版架构应该是：

```text
Workflow 控制确定性流程
Agent 负责专业生产
Team 负责多专家评审
Tool Gateway 负责外部系统读写
Approval 负责人类确认
Orchestrator 负责入口路由
```

Listing Review Team 采用 `broadcast` 模式是最稳的 MVP：

- 成员职责清楚。
- 输入输出可控。
- 容易结构化。
- 成本可估算。
- 不直接接触 Shopify 写操作。
- 能明显提升 Listing 优化质量。
