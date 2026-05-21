# 05 Team 版本迭代与成员治理验证

## 研究目标

验证 Team 如何版本化、如何锁定成员 Agent 版本、如何优化成员组合、协作模式和汇总策略。

这个验证要解决一个核心问题：

```text
成员 Agent 升级后，已经发布的 Team 是否应该自动使用新 Agent？
```

第一版结论必须是否定的。

跨境电商场景中，Team 输出会影响后续 Listing 审批和 Shopify 写回。如果 Team 成员自动漂移到最新版本，会导致历史回放、质量评估、审批证据和成本统计都不稳定。

## 业务场景

`Listing Review Team v1` 初始只有：

- SEO Agent v1。
- Copywriting Agent v1。

后来发现输出存在合规风险，于是新增：

- Compliance Agent v1。

形成 `Listing Review Team v2`。

v2 发布后，新 run 使用三个成员；历史 v1 run 仍然只能复现 SEO + Copywriting 两个成员。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/team/_storage.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/team.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/mode.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/postgres/postgres.py`

## 源码阅读结论

### 1. Agno Team 可以序列化成员列表，但普通 config 里只保存成员 ID

`Team.to_dict()` 会把成员序列化为：

```text
{"type": "agent", "agent_id": member.id}
{"type": "team", "team_id": member.id}
```

也就是说，Team config 中的 members 默认只表达：

- 成员类型。
- 成员 id。

不表达：

- member_agent_version_id。
- 成员 role policy。
- 成员权限快照。
- 成员模型策略。
- 成员是否 required。
- 成员输出 schema。

结论：

Agno Team config 可以作为运行时组件配置，但不能作为我们业务 TeamVersion 的完整真相。

### 2. Agno Team.save 会保存成员并写 component_links，里面有 child_version

`Team.save()` 做了几件事：

1. 遍历静态 members。
2. 对每个 member 调用 `member.save()`。
3. 收集 link。
4. 保存 Team component。
5. 保存 Team config。

link 中包含：

- `link_kind="member"`
- `link_key="member_{position}"`
- `child_component_id`
- `child_version`
- `position`
- `meta.type`

结论：

Agno 底层 component graph 具备“Team 版本链接成员版本”的能力。

这是一个可复用的好设计，后续如果我们使用 Agno component/config 存储，可以把 `component_links` 作为运行时图谱参考。

但第一版业务上仍然建议自己保存 `team_member_snapshots`，因为我们还需要 tenant/shop/权限/审核/发布信息。

### 3. Agno Team.load 会用 component graph 恢复成员，但业务版本锁定仍不够

`Team.load()` 会调用：

```text
db.load_component_graph(id, version=version, label=label)
```

然后 `_hydrate_from_graph()` 会根据 graph children 恢复成员。

这说明 Agno 的 graph 路径能比单纯 `from_dict()` 更好地恢复成员版本。

但是源码里另一个路径 `Team.from_dict()` 读取 members 时有 TODO：

```text
TODO: Make sure to pass the correct version to get_agent_by_id. Right now its returning the latest version.
```

结论：

如果完全依赖 Agno 原生加载路径，很容易因为不同入口而发生成员版本漂移。

我们的运行时必须由业务层明确构造：

```text
TeamVersion.member_snapshot
  -> load exact AgentVersion
  -> construct Agent
  -> construct Team
  -> run Team
```

不要让 Team 在业务运行时自动拿 latest/current 成员。

### 4. Team mode、leader instructions、成员列表变化都必须生成新版本

Team 行为受这些配置影响：

- mode。
- leader model。
- instructions。
- expected_output。
- output_schema。
- determine_input_for_members。
- share_member_interactions。
- add_team_history_to_members。
- stream_member_events。
- store_member_responses。
- member list。
- member order。
- member role。
- member AgentVersion。

任何变化都可能改变最终评审结论。

结论：

Team active 版本不可原地修改。以下变化必须创建新 TeamVersion：

- 新增成员。
- 删除成员。
- 替换成员。
- 成员 AgentVersion 升级。
- mode 改变。
- leader instructions 改变。
- aggregation strategy 改变。
- output_schema 改变。
- shared context policy 改变。
- member interaction policy 改变。

### 5. Team 不应该自动跟随成员 Agent 升级

假设：

- SEO Agent v1 被 Listing Review Team v1 使用。
- 后来 SEO Agent 发布 v2。

Listing Review Team v1 不应该自动变成：

- SEO Agent v2。
- Copywriting Agent v1。

原因：

- Team v1 的历史评估基于 SEO Agent v1。
- 成员升级可能改变输出风格和风险判断。
- 成本、耗时、准确率都可能变化。
- 审核通过的是旧组合，不是新组合。

正确做法：

```text
SEO Agent v2 发布
        |
生成 Team 优化候选
        |
创建 Listing Review Team v2 draft
        |
member_snapshot 指向 SEO Agent v2
        |
测试集回放
        |
人工审核
        |
发布 Team v2 active
```

### 6. Team 迭代应该基于运行证据，而不是手动感觉

Team 迭代的数据来源：

- Team output schema 失败。
- 成员 run 失败。
- 成员观点冲突。
- Compliance Agent 经常发现 SEO/文案风险。
- 人工审批经常拒绝 Team 建议通过的方案。
- 用户经常编辑 Team 认为合格的结果。
- Team 成本过高。
- Team latency 过长。
- 某成员长期没有贡献。

这些应该形成：

- TeamOptimizationCase。
- TeamOptimizationSuggestion。

然后再生成新 TeamVersion draft。

### 7. Team 成员治理要解决“谁能进 Team”和“能做什么”

成员治理不是简单的成员列表。

每个成员都应该有成员策略：

- member_role。
- required / optional。
- input_scope。
- output_contract。
- allowed_tools。
- denied_tools。
- max_cost。
- max_latency。
- failure_policy。

例如 Listing Review Team：

- SEO Agent：只读 ProductSnapshot 和 ListingSuggestion，不允许写 Shopify。
- Copywriting Agent：只读，不允许写。
- Compliance Agent：只读规则库，不允许写。

结论：

第一版 Team 成员默认不授予 write tool。写回只能由 Workflow 的 Tool Gateway step 执行。

## TeamVersion 设计

### team_templates

- team_template_id
- name
- vertical
- description
- default_mode
- default_member_roles
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
- updated_at

`status`：

- draft
- active
- paused
- archived

### team_versions

- team_version_id
- team_instance_id
- version
- status
- mode
- leader_model_policy
- coordinator_instructions
- routing_rules
- aggregation_strategy
- shared_context_policy
- output_schema
- member_snapshot
- knowledge_scope_snapshot
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

### team_member_snapshots

- team_member_snapshot_id
- team_version_id
- member_type
- member_instance_id
- member_version_id
- member_role
- position
- required
- input_scope
- output_contract
- tool_policy_snapshot
- memory_policy_snapshot
- failure_policy
- created_at

`member_type`：

- agent
- team

`failure_policy`：

- fail_team
- continue_without_member
- retry_once
- fallback_member

## TeamReview 设计

Team 发布审核需要独立于 Agent 发布审核。

### team_reviews

- team_review_id
- tenant_id
- team_instance_id
- team_version_id
- status
- reviewer_id
- review_result
- review_comment
- member_diff_snapshot
- risk_snapshot
- eval_summary_snapshot
- created_at
- reviewed_at

审核重点：

- 成员是否都已发布。
- 成员版本是否锁定。
- 是否引入 write tool。
- 是否有成员越权读取店铺数据。
- output_schema 是否稳定。
- mode 是否适合场景。
- 成员变更是否通过测试集。
- 成本和耗时是否可接受。

## Team 迭代闭环

```text
TeamVersion 运行
        |
TeamRun / MemberRun / Metrics / ReviewResult
        |
Approval / 用户编辑 / 失败记录 / 成员冲突
        |
TeamOptimizationCase
        |
TeamOptimizationSuggestion
        |
人工审核
        |
生成 TeamVersion draft
        |
测试集回放
        |
发布 testing / active
```

### TeamOptimizationCase

- team_optimization_case_id
- tenant_id
- workspace_id
- shop_id
- team_instance_id
- team_version_id
- workflow_run_id
- team_run_id
- case_type
- severity
- input_snapshot
- output_snapshot
- member_run_snapshots
- expected_or_final_output
- user_feedback
- approval_decision_id
- metrics_snapshot
- created_at

`case_type`：

- member_failed
- schema_error
- member_conflict
- wrong_reviewer_result
- approval_rejected
- user_edited_after_review
- missing_compliance_check
- high_cost
- slow_run

### TeamOptimizationSuggestion

- team_optimization_suggestion_id
- team_optimization_case_ids
- target_team_version_id
- suggestion_type
- proposed_change
- reasoning
- evidence
- status
- created_by
- reviewed_by
- created_at
- reviewed_at

`suggestion_type`：

- add_member
- remove_member
- replace_member_version
- mode_change
- coordinator_instruction_update
- output_schema_update
- aggregation_strategy_update
- member_policy_update

## Listing Review Team 版本示例

### v1

```text
mode: broadcast
members:
  - SEO Agent v1
  - Copywriting Agent v1
output_schema: ListingReviewResult v1
```

问题：

- 用户反馈标题合规风险被漏掉。
- Shopify 写回审批中经常被人工拒绝。

### v2 draft

```text
mode: broadcast
members:
  - SEO Agent v1
  - Copywriting Agent v1
  - Compliance Agent v1
output_schema: ListingReviewResult v2
```

变更：

- 新增 Compliance Agent。
- 输出增加 `compliance_score`、`blocked_terms`、`risk_level`。

发布要求：

- 固定测试集通过。
- Compliance Agent 版本已 active。
- TeamReview 审核通过。
- 成本和耗时在阈值内。

## 运行时构造原则

业务运行时不要直接传一个 team_id 让 Agno 自己找 current 成员。

建议流程：

```text
Business API
  -> 读取 TeamInstance.active_version_id
  -> 读取 TeamVersion
  -> 读取 team_member_snapshots
  -> 逐个读取 member AgentVersion / TeamVersion
  -> 动态构造成员 Agent/Team
  -> 动态构造 Agno Team
  -> 调用 team.arun()
  -> 保存 team_runs 和 member_run_snapshots
```

这样能保证：

- 成员版本不漂移。
- 历史 run 可复现。
- 成本统计可归因。
- 审批证据可追溯。
- 测试集回放可对比。

## 优化指标

第一版 Team 指标：

- output_schema_success_rate。
- member_failure_rate。
- member_conflict_rate。
- review_acceptance_rate。
- approval_pass_rate_after_review。
- user_edit_rate_after_review。
- avg_cost。
- avg_latency。
- per_member_cost。
- per_member_latency。

Listing Review Team 第一版必须先做：

- output_schema_success_rate。
- member_failure_rate。
- approval_pass_rate_after_review。
- user_edit_rate_after_review。
- avg_cost。
- avg_latency。

## 原型任务

1. 创建 Listing Review Team v1。
2. v1 绑定 SEO Agent v1 和 Copywriting Agent v1。
3. 对固定 ListingSuggestion 测试集运行 v1。
4. 保存 team_run 和 member_run_snapshots。
5. 创建 Compliance Agent v1。
6. 创建 Listing Review Team v2 draft。
7. v2 绑定 SEO Agent v1、Copywriting Agent v1、Compliance Agent v1。
8. 对同一测试集运行 v2。
9. 对比 v1/v2 的合规风险发现率、成本、耗时。
10. 审核并发布 v2。
11. 验证 SEO Agent 后续发布 v2 时，Team v2 不自动升级成员。
12. 创建 Team v3 draft 才能显式采用 SEO Agent v2。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Team 是否能保存成员列表 | 能。`Team.to_dict()` 能保存成员 id，`Team.save()` 能写 component_links。 |
| Agno links 是否能记录成员版本 | 能。`Team.save()` 写入 `child_version`。 |
| Team 成员是否可以锁定 AgentVersion | Agno graph 路径有基础能力，但业务层必须自建 TeamVersion member snapshot。 |
| Team mode 变化是否必须生成新版本 | 必须。mode 改变会改变协作策略。 |
| Team 汇总 instruction 变化是否必须生成新版本 | 必须。会改变最终评审结论。 |
| 成员 Agent 升级后 Team 是否自动升级 | 不应该自动升级。必须创建新 TeamVersion。 |
| 历史 Team run 是否能复现当时成员和模式 | 必须由业务 `team_runs + member_run_snapshots` 保证。 |
| Team 能否直接拥有 write tool | 第一版不允许。写操作必须集中到 Workflow + Tool Gateway。 |
| Agno Team 原生 save/load 是否足够做商业治理 | 不足。缺 tenant/shop/review/permission/eval/release 维度。 |

## 第一版结论

TeamVersion 必须锁定成员 AgentVersion。

Agno 的 component graph 提供了很好的底层参考：

- Team 可以保存成员。
- member link 可以保存 child_version。
- load_component_graph 可以恢复 Team 和成员图。

但我们的商业平台不能只依赖 Agno 原生 Team 存储。

第一版必须自建：

- TeamTemplate。
- TeamInstance。
- TeamVersion。
- TeamMemberSnapshot。
- TeamReview。
- TeamRun。
- MemberRunSnapshot。
- TeamOptimizationCase。
- TeamOptimizationSuggestion。

最重要的产品规则：

```text
成员升级不自动影响已发布 Team
Team active 版本不可原地修改
Team 更新必须走 testing 和审核
Team 不直接执行 write tool
Workflow 才是商业流程主控
```

这条规则会让我们的 Team 协作能力可测试、可回放、可审计，也更适合跨境电商这种有真实外部系统写操作的场景。
