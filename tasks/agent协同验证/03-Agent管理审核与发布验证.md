# 03 Agent 管理、审核与发布验证

## 研究目标

验证 Agent 从草稿到上线的生命周期管理，包括创建、审核、发布、暂停、禁用、归档、权限变更和回滚。

这个验证的重点不是“Agno 能不能保存一个 Agent”，而是确认它能否支撑我们要做的跨境电商垂类 Agent 平台：

- 多租户隔离。
- 店铺级权限。
- Agent 版本不可变。
- 写操作强制审批。
- 发布前审核。
- 发布后运行准入。
- 历史运行可追溯到当时版本。

## 业务场景

运营管理员启用 `Listing 优化 Agent`，配置可访问的 Shopify 店铺、可用工具、知识库、记忆策略、模型策略和审批策略。

发布前需要审核。发布后，租户成员才能在工作流中运行它。

如果后续调整了 prompt、模型、输出 schema、工具权限、知识范围、记忆策略或审批策略，不能直接修改线上 Agent，而是必须生成新版本并重新审核。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/db/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/db/postgres/postgres.py`
- `/Users/ske/agent/agno/libs/agno/agno/registry/registry.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/_storage.py`
- `/Users/ske/agent/agno/libs/agno/agno/agent/agent.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/schema.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/components/components.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/agents/router.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/approvals/router.py`
- `/Users/ske/agent/agno/libs/agno/agno/approval/decorator.py`
- `/Users/ske/agent/agno/libs/agno/agno/approval/types.py`
- `/Users/ske/agent/agno/libs/agno/agno/run/approval.py`

## 源码阅读结论

### 1. Agno 有 component/config 持久化能力，可以作为底层参考

`BaseDb` 定义了 component 相关方法：

- `get_component`
- `upsert_component`
- `delete_component`
- `list_components`
- `create_component_with_config`
- `get_config`
- `upsert_config`
- `delete_config`
- `list_configs`
- `set_current_version`
- `get_links`
- `get_dependents`
- `load_component_graph`

Postgres 实现中对应表包括：

- `agno_components`
- `agno_component_configs`
- `agno_component_links`

Agno 的 component 类型包括：

- agent
- team
- workflow

结论：

Agno 已经有一个“组件 + 配置版本”的底层模型。它适合保存运行时组件配置，也适合做 demo 或开发态 Builder。

但它不是完整的商业 Agent 管理系统。我们的业务平台不能只依赖 `agno_components` 来表达 Agent 生命周期。

### 2. Agno config 版本有 draft/published 和 current_version，但状态太少

`upsert_config()` 的规则很有价值：

- draft config 可以编辑。
- published config 不可修改。
- 发布 published 后会自动设置为 `current_version`。
- `set_current_version()` 只允许把 published 版本设为当前版本，可用于 rollback。
- `delete_config()` 只允许删除非 current 的 draft。

结论：

Agno 的这套逻辑和我们需要的“active 版本不可原地修改”方向一致。

但是它只有：

- `draft`
- `published`

我们业务上至少需要：

- draft
- in_review
- rejected
- testing
- active
- paused
- archived
- rolled_back

所以 Agno config stage 不能直接等同于业务 AgentVersion 状态。

推荐做法：

- 业务层自建 `agent_versions.status`。
- 只有当业务版本进入 `testing` 或 `active` 后，才把可运行配置同步或映射成 Agno published config。
- 第一版也可以不直接使用 Agno component API，而是由业务层读取 `agent_versions` 动态构造 Agno Agent。

### 3. Agno Agent save/load 能保存部分配置，但不能覆盖我们的完整配置快照

`Agent.save()` 内部会：

- `upsert_component(component_type=AGENT)`
- `upsert_config(config=to_dict(agent), stage=stage)`

`Agent.load()` 会：

- 读取 db config。
- 通过 `Agent.from_dict()` 重建 Agent。

`to_dict()` 能保存：

- model。
- name / id / description。
- session 配置。
- dependencies。
- learning。
- db。
- history 配置。
- knowledge filters。
- tools 的函数描述。
- tool call limit / tool choice。
- reasoning 配置。
- system message。
- instructions。
- expected output。
- input_schema / output_schema 名称或 dict。
- structured output 相关配置。
- stream 配置。
- metadata。

但是源码中仍然有多处 TODO 或跳过项：

- memory manager 序列化未实现。
- session summary manager 序列化未实现。
- knowledge 序列化未实现。
- parser model 反序列化未实现。
- output model 反序列化未实现。
- compression manager 序列化未实现。
- callable tools 需要 Registry 才能 rehydrate。
- schema 如果只存类名，也需要 Registry 才能恢复。

结论：

Agno 原生 save/load 不能作为我们商业平台的唯一 Agent 配置真相。

我们的 AgentVersion 必须保存平台级配置快照：

- prompt / instructions。
- model policy。
- output schema。
- tool policy。
- tool permission snapshot。
- Nango connection scope。
- knowledge scope。
- memory policy。
- approval policy。
- tenant/shop/workspace 维度。
- guardrails。
- release note。
- reviewer。
- eval summary。

Agno 的 save/load 可以作为运行时缓存或底层组件配置，但业务版本表才是 PRD 真相。

### 4. Registry 是运行时对象查找表，不是商业 Agent Registry

`Registry` 的作用是管理不可序列化对象：

- tools。
- models。
- dbs。
- vector dbs。
- schemas。
- functions。
- code-defined agents。
- code-defined teams。

它可以：

- 根据 schema name 找 schema。
- 根据 db id 找 db。
- 根据 function name 恢复 callable。
- 根据 agent/team id 找代码中注册的 agent/team。

结论：

Agno Registry 是进程内运行时注册表，主要解决“序列化配置如何恢复成 Python 对象”的问题。

它不是我们的 Agent 市场、Agent 模板库、Agent 权限注册中心。

我们需要自建 `Agent Registry`，用于：

- 管理租户可见 Agent。
- 管理系统内置 Agent。
- 管理用户自定义 Agent。
- 管理 AgentTemplate / AgentInstance / AgentVersion。
- 管理可见性、分类、行业场景、适用店铺。
- 管理发布状态、审核状态、使用权限。

Agno Registry 只作为运行时 rehydrate 辅助。

### 5. Agno OS components API 可参考，但不能直接暴露给业务用户

`/os/routers/components/components.py` 提供了组件管理 API：

- `GET /components`
- `POST /components`
- `GET /components/{component_id}`
- `PATCH /components/{component_id}`
- `DELETE /components/{component_id}`
- `GET /components/{component_id}/configs`
- `POST /components/{component_id}/configs`
- `PATCH /components/{component_id}/configs/{version}`
- `GET /components/{component_id}/configs/current`
- `GET /components/{component_id}/configs/{version}`
- `DELETE /components/{component_id}/configs/{version}`
- `POST /components/{component_id}/configs/{version}/set-current`

结论：

这些 API 很适合参考“组件配置版本”的底层操作，但不能作为我们的产品 API 直接暴露。

原因：

- 没有 tenant_id / workspace_id / shop_id。
- 没有业务审核流。
- 没有 AgentTemplate 和 AgentInstance 的区分。
- 没有权限快照。
- 没有审批策略检查。
- 没有发布前评估门禁。
- `ComponentUpdate` 允许更新 `current_version`，这在我们业务里必须由发布/回滚流程控制。

我们的 FastAPI 应该提供业务 API，而不是直接把 Agno OS component API 给前端调用。

### 6. Agno Agents API 支持按 version 运行，但运行准入仍要业务层拦截

`/os/routers/agents/router.py` 中 `POST /agents/{agent_id}/runs` 支持：

- `agent_id`
- `message`
- `stream`
- `session_id`
- `user_id`
- `version`
- `background`
- `factory_input`

内部会调用 `resolve_agent(... version=int(version) if version else None ...)`。

结论：

Agno 能按指定 version 加载并运行 Agent，这对测试 draft/testing 版本很有用。

但它不会理解我们的业务状态：

- 这个租户是否有权运行该 Agent。
- 这个店铺是否授权了 Shopify。
- 这个 AgentVersion 是否 active。
- 这个用户是否能运行 testing 版本。
- 这个 Agent 是否已 paused。
- 这个 Agent 的写工具是否必须走审批。
- 当前 workflow 是否允许调用这个 agent。

所以真正的运行入口必须是我们的业务 API：

```text
/api/agent-runs
  -> 校验 Clerk 用户
  -> 校验 tenant/workspace/shop 权限
  -> 校验 AgentInstance 状态
  -> 解析 active_version_id 或 testing_version_id
  -> 生成 business run record
  -> 动态构造 Agno Agent
  -> 调用 agent.arun()
  -> 保存 run output / trace / metrics / approval 状态
```

### 7. Agno 有工具审批能力，但不等于 Agent 发布审核

Agno 的 `@approval` decorator 可以把工具标记为：

- `required`
- `audit`

`required` 会让工具带上 `requires_confirmation`，运行暂停后创建 approval record。

Agno approvals 表和 API 支持：

- 创建 approval。
- 查询 approval。
- 列表过滤 pending/approved/rejected。
- resolve approval。
- pending count。
- 按 run_id 更新 run_status。

approval 记录包含：

- run_id。
- session_id。
- status。
- approval_type。
- pause_type。
- tool_name。
- tool_args。
- source_type。
- agent_id。
- team_id。
- workflow_id。
- user_id。
- requirements。
- resolved_by。
- resolved_at。
- run_status。

结论：

Agno 的 approval 适合“运行时工具调用审批”，比如写回 Shopify 前暂停，等待人工批准。

但它不是“Agent 发布审核”。Agent 发布审核需要审核配置、权限、模型、知识库、记忆策略、评估结果和发布说明。

我们需要两个审批概念：

- `agent_review`：AgentVersion 发布审核。
- `tool_approval`：运行时工具写操作审批，可复用或包装 Agno approval。

### 8. 写工具权限必须由 Tool Gateway 兜底，不能只靠 prompt 或 Agent 配置

对跨境电商平台来说，风险最大的不是 Agent 生成文本，而是：

- 更新 Shopify 商品标题。
- 更新价格。
- 更新库存。
- 发布商品。
- 批量改标签。
- 删除图片。
- 同步广告或营销活动。

Agno 能暂停需要审批的工具，但我们的业务层仍然必须控制：

- 当前 agent_version 是否允许这个 tool。
- 当前 user 是否有权限发起这个 tool。
- 当前 shop 是否已经通过 Nango 连接。
- 当前 Nango connection 是否具备所需 scope。
- 当前 workflow 是否允许该写操作。
- 当前操作是否超过风险阈值。
- 是否必须人工审批。
- 审批通过后是否仍然只允许执行当时快照中的参数。

结论：

Tool Gateway 是强边界。

Agent 只能提出 tool call，不能直接拿 Nango token，也不能直接调用 Shopify。

## 我们的 Agent 生命周期

建议把“模板、实例、版本”拆开：

```text
AgentTemplate
  -> AgentInstance
      -> AgentVersion
```

### AgentTemplate

表示系统提供的 Agent 类型。

例子：

- Listing 优化 Agent 模板。
- 商品标题本地化 Agent 模板。
- 图片 alt text 优化 Agent 模板。
- 评论洞察 Agent 模板。

### AgentInstance

表示某个租户/店铺启用的 Agent。

例子：

- tenant_a / shop_001 启用的 Listing 优化 Agent。

### AgentVersion

表示 AgentInstance 的某次可运行配置。

任何会影响行为或权限的变化都生成新版本。

## 业务生命周期

```text
draft
  -> in_review
  -> rejected
  -> testing
  -> active
  -> paused
  -> archived
```

补充：

- `rolled_back` 不一定是版本状态，也可以是 release event。
- rollback 本质是切换 `AgentInstance.active_version_id` 到旧的 active 版本。
- 历史 run 永远绑定运行时的 `agent_version_id`。

## 需要审核的内容

- instructions 是否合规。
- tool 权限是否过大。
- 是否包含 write tool。
- write tool 是否强制审批。
- Nango connection scope 是否匹配。
- Shopify 店铺范围是否越权。
- knowledge scope 是否越权。
- memory policy 是否允许敏感记忆。
- model 是否符合成本策略。
- output schema 是否稳定。
- eval result 是否达标。
- 是否通过 Listing 场景测试集。
- 是否有 release note。

## 发布门禁

AgentVersion 从 `in_review` 到 `testing / active` 必须满足：

- 配置 JSON schema 校验通过。
- instructions 通过敏感词和越权检查。
- tool policy 校验通过。
- write tool 必须绑定 approval policy。
- Nango scope 校验通过。
- knowledge scope 不越过 tenant/shop。
- memory policy 不允许自动保存敏感字段。
- output schema 能被 Pydantic 或 JSON Schema 校验。
- 固定测试集通过最低阈值。
- reviewer 明确批准。

## 第一版表设计

### agent_templates

- agent_template_id
- name
- category
- vertical
- description
- default_config
- supported_tools
- default_output_schema
- status
- created_at

### agent_instances

- agent_instance_id
- tenant_id
- workspace_id
- shop_id
- agent_template_id
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

### agent_versions

- agent_version_id
- agent_instance_id
- version
- status
- model_policy
- instructions
- output_schema
- tool_policy_snapshot
- approval_policy_snapshot
- nango_scope_snapshot
- knowledge_scope_snapshot
- memory_policy_snapshot
- guardrails
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

### agent_reviews

- agent_review_id
- tenant_id
- agent_instance_id
- agent_version_id
- status
- reviewer_id
- review_result
- review_comment
- risk_snapshot
- checklist_snapshot
- created_at
- reviewed_at

`status`：

- pending
- approved
- rejected
- cancelled

### agent_release_events

- release_event_id
- tenant_id
- agent_instance_id
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

### agent_runs

- agent_run_id
- tenant_id
- workspace_id
- shop_id
- agent_instance_id
- agent_version_id
- agno_run_id
- agno_session_id
- trace_id
- status
- input_snapshot
- output_snapshot
- metrics_snapshot
- created_by
- created_at

## 与 Agno 表的关系

```text
business.agent_templates
        |
business.agent_instances
        |
business.agent_versions
        |
business.agent_runs
        |
Agno RunOutput / Trace / Metrics / Approval
```

Agno component/config 可选复用：

```text
business.agent_versions
        |
同步或映射
        |
agno_components / agno_component_configs
```

第一版建议：

- 业务 DB 是主数据源。
- Agno component/config 只作为可选底层能力，不作为前端直接依赖。
- 运行时由业务层动态构造 Agno Agent。
- 后续如果要用 Agno Builder，再考虑双写或映射。

## Agent 管理 API 草案

### 创建 Agent 实例

```text
POST /api/agents
```

输入：

- tenant_id
- workspace_id
- shop_id
- agent_template_id
- name

行为：

- 创建 agent_instance。
- 创建第一个 draft agent_version。

### 更新 draft 版本

```text
PATCH /api/agents/{agent_instance_id}/versions/{agent_version_id}
```

只允许更新 draft 或 rejected 版本。

### 提交审核

```text
POST /api/agents/{agent_instance_id}/versions/{agent_version_id}/submit-review
```

行为：

- 校验配置。
- 生成 risk_snapshot。
- 创建 agent_review。
- 版本状态变为 `in_review`。

### 审核通过

```text
POST /api/agent-reviews/{agent_review_id}/approve
```

行为：

- 写入 reviewer。
- 版本状态变为 `testing` 或 `active`。
- 如果直接发布 active，更新 `agent_instances.active_version_id`。
- 生成 release event。

### 审核拒绝

```text
POST /api/agent-reviews/{agent_review_id}/reject
```

行为：

- 版本状态变为 `rejected`。
- 保存拒绝原因。

### 发布 active

```text
POST /api/agents/{agent_instance_id}/versions/{agent_version_id}/publish
```

规则：

- 只能发布审核通过版本。
- 必须有 release note。
- 必须通过测试集阈值。
- 发布后切换 `active_version_id`。

### 回滚

```text
POST /api/agents/{agent_instance_id}/rollback
```

输入：

- target_agent_version_id
- reason

行为：

- 校验目标版本曾经 active 或已审核通过。
- 切换 `active_version_id`。
- 生成 release event。

## 运行准入规则

Agent run 不能直接由前端传 `agent_id` 给 Agno OS 执行。

第一版运行入口：

```text
POST /api/agent-runs
```

业务层必须先做：

1. Clerk 用户身份校验。
2. tenant/workspace/shop 权限校验。
3. AgentInstance 状态校验。
4. AgentVersion 状态校验。
5. Nango connection 校验。
6. tool policy 校验。
7. approval policy 注入。
8. memory/knowledge scope 注入。
9. 创建 agent_runs 记录。
10. 动态构造 Agno Agent。
11. 调用 `agent.arun()`。
12. 保存 RunOutput / Trace / Metrics。

## 原型验证任务

1. 创建 `Listing 优化 Agent` template。
2. 给测试租户和 Shopify shop 创建 agent_instance。
3. 创建 v1 draft。
4. 配置只读 Shopify 工具和输出 schema。
5. 提交审核。
6. 审核通过到 testing。
7. 使用测试 ProductSnapshot 运行 testing 版本。
8. 通过后发布 active。
9. 创建 v2 draft，增加 `write_back_listing` 工具。
10. 校验 write tool 必须绑定 approval policy。
11. 审核通过后运行，触发工具审批。
12. 审批通过后由 Tool Gateway 写回模拟 Shopify。
13. 回滚到 v1。
14. 验证历史 run 仍然绑定 v2。

## 需要验证的问题

| 问题 | 结论 |
| --- | --- |
| Agno 是否能保存 Agent 配置版本 | 能。component/config 支持 agent/team/workflow，支持 draft/published。 |
| Agno published config 是否不可修改 | 是。Postgres `upsert_config()` 会阻止更新 published config。 |
| Agno 是否支持 current version / rollback | 支持。`set_current_version()` 只能把 published 版本设为 current。 |
| Agno 是否有完整商业 Agent 审核流 | 没有。必须自建 `agent_reviews` 和发布门禁。 |
| Agno Registry 是否等于我们的 Agent Registry | 不是。它是运行时对象恢复表，不是业务注册中心。 |
| Agno approval 是否等于 Agent 发布审核 | 不是。它是运行时工具审批。 |
| Agno run 是否支持指定 version | 支持，但业务准入必须在我们自己的 API 层完成。 |
| Agent 配置是否可以完全安全序列化 | 不能完全依赖 Agno 原生序列化。memory/knowledge/parser/output model 等仍有 TODO 或需要 Registry。 |
| active 版本是否可以锁定不变 | Agno published config 可锁定，但业务 active 状态、审核和权限快照必须自建。 |
| 历史 run 是否能追溯旧版本 | 必须由 `business.agent_runs.agent_version_id` 保证。Agno run 本身不够。 |

## 第一版结论

Agno 已经提供了有价值的底层组件版本能力：

- component。
- config version。
- draft/published。
- published immutable。
- current_version。
- set_current_version rollback。
- tool approval。
- run version loading。

但是它不能替代我们的商业平台管理层。

我们的跨境电商 Agent 平台必须自建：

- AgentTemplate。
- AgentInstance。
- AgentVersion。
- AgentReview。
- AgentReleaseEvent。
- AgentRun。
- 权限快照。
- Nango scope 快照。
- Shopify shop scope。
- 发布门禁。
- 运行准入。
- Tool Gateway。

第一版落地原则：

```text
业务层拥有 Agent 生命周期和权限真相
Agno 只负责按已审核配置运行 Agent
Tool Gateway 负责所有外部系统读写边界
Nango 只负责第三方连接和 token
```

这能避免一个核心风险：

不要把“能保存/运行 Agent”误判为“能管理商业 Agent 平台”。
