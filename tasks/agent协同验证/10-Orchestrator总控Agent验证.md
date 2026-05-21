# 10 Orchestrator 总控 Agent 验证

## 一句话结论

需要 Orchestrator 总控 Agent，但它不是万能执行 Agent。

在跨境电商 Agent 平台里，Orchestrator 的定位是“对话入口 + 意图识别 + 参数收集 + Registry 查询 + 白名单 Workflow 启动 + 运行状态解释”。它不能直接持有 Shopify 写工具，不能绕过 Workflow，不能绕过 Tool Gateway，不能绕过人工审批。

第一版采用：

```text
Orchestrator Agent
  -> 只调用业务控制工具
  -> 从业务 Registry 查询可用 Workflow
  -> 选择白名单 Workflow
  -> 发起 workflow_run
  -> 解释进度和结果
```

## 本次验证范围

本文件验证：

1. Orchestrator 是否应该存在。
2. Orchestrator 和 Workflow、Team、Agent 的职责边界。
3. Orchestrator 是否应该由 Agno Agent 实现。
4. Orchestrator 如何避免越权。
5. Orchestrator 如何处理多轮参数收集。
6. Orchestrator 如何与 Registry、Tool Gateway、Approval、Nango 协作。

## 已阅读源码

- `/Users/ske/agent/agno/libs/agno/agno/agent/agent.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/workflow.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/step.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/router.py`
- `/Users/ske/agent/agno/libs/agno/agno/workflow/condition.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/team.py`
- `/Users/ske/agent/agno/libs/agno/agno/team/mode.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/base.py`
- `/Users/ske/agent/agno/libs/agno/agno/factory/utils.py`
- `/Users/ske/agent/agno/libs/agno/agno/os/routers/registry/registry.py`

## 为什么需要 Orchestrator

跨境电商平台的用户不会总是明确说“请运行 workflow_listing_optimize_writeback_v1”。他们会说：

- “帮我优化这个商品。”
- “这个 Listing 为什么转化差？”
- “把这批商品标题改得更适合美国站。”
- “帮我看看最近店铺哪里有问题。”
- “这个产品可以上架到 Shopify 吗？”

这些输入首先是自然语言任务，不是明确 API 调用。

Orchestrator 的价值是把自然语言任务转成平台可控的业务流程：

```text
自然语言
  -> 识别任务类型
  -> 补齐 shop / product / marketplace / language / goal 等参数
  -> 查询当前租户可用 Workflow
  -> 选择最合适的 Workflow
  -> 启动 Workflow
  -> 告诉用户下一步需要什么
```

没有 Orchestrator，用户体验会变成“先自己找功能入口，再填表单，再点运行”。这对垂类 Agent 平台不够自然。

## Orchestrator 不能做什么

Orchestrator 必须弱执行、强路由。

禁止能力：

| 禁止项 | 原因 |
| --- | --- |
| 直接调用 Shopify 写工具 | 会绕过审批和审计 |
| 直接更新价格、库存、Listing、广告预算 | 高风险外部写操作必须走 Tool Gateway |
| 自己读取或保存 Nango token | Nango token 只能由后端连接层管理 |
| 自己决定长期记忆写入 | 记忆必须受 MemoryPolicy 控制 |
| 自己切换 Agent/Workflow active version | 版本发布必须走审核发布流程 |
| 自己创建或发布 Agent | Agent 创建和发布是管理后台能力 |
| 自己绕过 Registry 找工具 | 所有可用组件必须由业务 Registry 过滤 |
| 自己绕过 Workflow 调用多个执行 Agent | 商业流程要可回放、可审核、可灰度 |

## Agno 源码可行性结论

### 1. Orchestrator 可以用 Agno Agent 实现

Agno Agent 支持：

- 指令。
- 工具调用。
- 结构化输出。
- session。
- memory。
- storage。
- model 配置。
- metrics。

这适合实现一个对话式入口 Agent。

但是 Orchestrator Agent 的工具必须是业务控制工具，不是业务执行工具。

### 2. Workflow Router 可以承担流程内路由

`agno/workflow/router.py` 说明 Workflow 有 `Router`：

- 可以通过 selector 函数选择分支。
- 可以通过 CEL 表达式选择分支。
- 可以让用户 HITL 选择路线。
- 可以要求 confirmation。
- 可以要求 output review。

这说明“流程内部的路线选择”不需要全部交给 Orchestrator。

边界定为：

```text
Orchestrator 选择启动哪个 Workflow。
Workflow Router 选择 Workflow 内部走哪个步骤或分支。
```

例子：

```text
用户：帮我优化这个 Listing
Orchestrator：选择 Listing 优化 Workflow
Workflow Router：根据输入判断是仅优化草稿、优化并审核、还是优化后申请写回
```

### 3. Workflow Condition 可以承担规则判断

`agno/workflow/condition.py` 支持：

- callable evaluator。
- bool evaluator。
- CEL 表达式。
- else branch。
- confirmation。
- error pause。

这适合处理流程内的商业规则：

- 如果商品缺少图片，进入补充素材分支。
- 如果目标市场是美国，使用 US SEO policy。
- 如果写操作风险等级高，进入审批分支。
- 如果 Nango connection 缺失，暂停并提示用户授权。

### 4. Factory 可以支撑按租户构造 Orchestrator

`BaseFactory` 的 `RequestContext.trusted.claims/scopes` 可以由后端可信中间件注入。

因此 Orchestrator 可以按租户、用户、角色、店铺动态构造：

```text
同一个 Orchestrator runtime factory
不同 tenant / user / shop
拿到不同的 workflow 白名单和工具白名单
```

这符合多租户平台设计。

## 选型结论

### 候选方案对比

| 方案 | 描述 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- | --- |
| A. 普通 Agent + 很多工具 | Orchestrator 自己调用各种 Agent/Tool | 灵活 | 越权风险高，难审计 | 不采用 |
| B. 业务 API 路由器 + 小模型分类 | 后端规则或分类模型选择 Workflow | 可控 | 对话体验弱 | 作为 fallback |
| C. Orchestrator Agent + Workflow 白名单 | Agent 只选择允许的 Workflow 并启动 | 灵活且可控 | 需要严格工具边界 | 采用 |

最终定为方案 C。

## Orchestrator 权限模型

Orchestrator 只拥有这些工具：

| 工具 | 类型 | 是否允许 |
| --- | --- | --- |
| `list_my_shops` | 业务查询 | 允许 |
| `list_available_workflows` | Registry 查询 | 允许 |
| `list_available_agents` | Registry 查询 | 允许，只读 |
| `search_product_candidates` | 商品候选查询 | 允许，只读 |
| `get_product_summary` | 商品摘要查询 | 允许，只读 |
| `resolve_runtime_plan` | 运行计划解析 | 允许 |
| `start_workflow` | 启动 Workflow | 允许 |
| `get_workflow_status` | 查询运行状态 | 允许 |
| `ask_user_for_missing_fields` | 参数收集 | 允许 |

明确禁止：

| 工具 | 原因 |
| --- | --- |
| `shopify.products.update` | 写 Shopify |
| `shopify.inventory.update` | 写库存 |
| `shopify.price.update` | 改价格 |
| `shopify.product.delete` | 删除商品 |
| `ads.budget.update` | 改广告预算 |
| `send_customer_message` | 外发消息 |
| `memory.write_long_term` | 长期记忆写入必须受策略控制 |
| `agent.publish` | 发布必须走审核 |
| `workflow.set_active_version` | 版本切换必须走管理后台 |

## Orchestrator 的结构化输出

Orchestrator 每轮不只输出自然语言，还要输出结构化意图。

建议 schema：

```text
TaskIntent
- intent_type:
  - listing_optimize
  - listing_review
  - listing_writeback
  - store_diagnosis
  - product_research
  - ads_analysis
  - customer_service
  - unknown
- confidence
- tenant_id
- shop_id
- product_ids
- marketplace
- language
- target_workflow_key
- missing_fields
- risk_level
- proposed_next_action:
  - ask_user
  - resolve_runtime_plan
  - start_workflow
  - show_status
  - refuse
```

运行前必须经过后端校验：

```text
Orchestrator 输出 TaskIntent
  -> FastAPI 校验 TaskIntent
  -> Registry 解析 workflow 白名单
  -> 权限校验
  -> 才能 start_workflow
```

不要让 Orchestrator 的结构化输出直接变成执行命令。

## 核心交互流程

### 场景 1：用户明确要优化单个商品

输入：

```text
帮我优化这个商品的 Listing：gid://shopify/Product/123
```

流程：

```text
1. Orchestrator 识别 intent_type = listing_optimize。
2. Orchestrator 检查 shop_id 是否存在。
3. Orchestrator 调 list_available_workflows。
4. 选择 Listing 优化 Workflow。
5. 调 resolve_runtime_plan。
6. 如果 runtime plan 合法，调 start_workflow。
7. Workflow 执行读取、优化、审核。
8. 如果需要写回，Workflow 进入 Approval。
9. Orchestrator 只解释状态，不执行写回。
```

### 场景 2：用户要“直接写回”

输入：

```text
把这个商品标题优化后直接写回 Shopify。
```

流程：

```text
1. Orchestrator 可以识别用户想写回。
2. Orchestrator 不能直接写回。
3. Orchestrator 启动 Listing 优化并写回 Workflow。
4. Workflow 生成写回计划。
5. Tool Gateway 创建审批。
6. 用户审批后 Tool Gateway 执行 Shopify update。
```

Orchestrator 回复要表达：

```text
我可以发起优化和写回流程。写回 Shopify 前会生成变更预览，并需要你确认。
```

### 场景 3：用户任务不清楚

输入：

```text
帮我看看店铺哪里有问题。
```

流程：

```text
1. Orchestrator 识别为 store_diagnosis，但缺少时间范围。
2. 调 ask_user_for_missing_fields。
3. 用户补充“最近 30 天”。
4. 查询 Registry 可用 Store Diagnosis Workflow。
5. 启动诊断 Workflow。
```

## Orchestrator 与 Workflow 的边界

| 问题 | Orchestrator | Workflow |
| --- | --- | --- |
| 用户意图识别 | 负责 | 不负责 |
| 多轮参数收集 | 负责 | 可在 HITL 节点补充 |
| 选择哪个业务流程 | 负责，但必须在白名单内 | 不负责 |
| 流程内部步骤 | 不负责 | 负责 |
| 流程内部条件分支 | 不负责 | Router/Condition 负责 |
| 调用分析 Agent | 不直接调用，除非是只读辅助 | 负责 |
| 写 Shopify | 禁止 | 通过 Tool Gateway |
| 审批 | 不审批，只提示 | 触发 ApprovalRequest |
| 回放 | 不执行 | Workflow replay 负责 |
| 审计 | 写对话和启动事件 | 写运行、步骤、工具、审批审计 |

## Orchestrator 与 Team 的边界

Orchestrator 可以选择启动包含 Team 的 Workflow，但不应该直接把 Team 当作执行层随意调用。

允许：

```text
Orchestrator -> start_workflow(Store Diagnosis Workflow)
Workflow -> Store Diagnosis Team
```

谨慎允许：

```text
Orchestrator -> ask_readonly_team_for_clarification
```

禁止：

```text
Orchestrator -> Team -> Shopify write tool
```

MVP 不给 Team 写工具，所有外部写操作统一通过 Workflow 的 Tool Gateway 节点。

## Orchestrator 与 Registry 的边界

Orchestrator 不能直接读数据库表。

它只能通过业务工具访问 Registry：

```text
list_available_workflows(tenant_id, user_id, shop_id, category)
resolve_runtime_plan(tenant_id, user_id, shop_id, workflow_instance_id, input)
```

Registry 返回的是已经过滤后的白名单，不是全量组件目录。

过滤维度：

- tenant。
- user role。
- shop。
- Shopify connection 状态。
- plan 套餐。
- workflow release status。
- workflow active version。
- tool scope。
- model policy。

## Orchestrator 与 Nango 的边界

Orchestrator 不知道 access token。

它只知道：

```text
shop_id 是否已经连接 Shopify
connection_status = connected / expired / missing_scope / disconnected
missing_scopes = [...]
```

如果 Nango connection 不可用，Orchestrator 只能引导用户授权：

```text
需要先连接 Shopify 店铺，才能读取商品数据。
```

具体 OAuth、token refresh、token storage 全部由 Nango 和后端 Connector Service 处理。

## Orchestrator 与 Memory 的边界

Orchestrator 可以读取有限上下文：

- 当前用户最近对话。
- 当前 shop。
- 最近正在运行的 workflow。
- 用户偏好的语言和市场。

Orchestrator 不能自由写长期记忆。

长期记忆写入必须经过：

```text
MemoryPolicy
  -> 判断是否允许写
  -> 判断 scope
  -> 判断 retention
  -> 判断是否含敏感信息
  -> 写入 MemoryStore
```

MVP 中 Orchestrator 只写短期 session state，不写长期 memory。

## MVP 实现设计

### 后端工具

```text
orchestrator_tools/
- list_my_shops
- list_available_workflows
- search_product_candidates
- resolve_runtime_plan
- start_workflow
- get_workflow_status
```

所有工具都要走 FastAPI service，不直接访问第三方 API。

### Orchestrator Agent 配置

```text
name = 跨境电商任务总控 Agent
role = 识别用户意图，选择平台允许的业务流程，收集参数，解释运行状态
tools =
  - list_my_shops
  - list_available_workflows
  - search_product_candidates
  - resolve_runtime_plan
  - start_workflow
  - get_workflow_status
model_tier = fast 或 balanced
memory = session only
write_tools = none
```

### 启动 Workflow 的请求

```json
{
  "tenant_id": "tenant_001",
  "shop_id": "shopify_shop_001",
  "workflow_instance_id": "wf_listing_optimize_writeback",
  "workflow_version_id": "wfv_2",
  "input": {
    "shopify_product_id": "gid://shopify/Product/123",
    "goal": "optimize_listing",
    "marketplace": "US",
    "language": "en"
  },
  "started_by": {
    "type": "orchestrator",
    "user_id": "user_001",
    "conversation_id": "conv_001"
  }
}
```

## 防越权策略

### 1. 工具白名单

Orchestrator Agent 初始化时只注入允许工具。

### 2. 后端二次校验

即使 Orchestrator 试图调用不存在或无权限的 workflow，FastAPI 也必须拒绝。

### 3. Registry 只返回过滤结果

Orchestrator 看不到租户无权使用的 Agent/Workflow。

### 4. 写工具不注入 Orchestrator

物理上不给 Orchestrator `shopify.products.update`。

### 5. Workflow 写操作必须 Tool Gateway

Workflow 里也不直接调用 Shopify SDK，而是调用 Tool Gateway。

### 6. 审计日志

记录：

- Orchestrator 识别了什么 intent。
- 查了哪些 registry。
- 选择了哪个 workflow。
- 发起了哪个 run。
- 用户是否确认。
- 是否触发审批。

## 原型验收标准

- [ ] 输入“帮我优化这个商品”，Orchestrator 能识别 `listing_optimize`。
- [ ] 缺少 `shop_id` 时，Orchestrator 会追问。
- [ ] 缺少 `product_id` 时，Orchestrator 会追问或给候选商品。
- [ ] Orchestrator 只能看到 Registry 返回的 workflow 白名单。
- [ ] Orchestrator 能启动 `Listing 优化 Workflow`。
- [ ] Orchestrator 不能调用 Shopify 写工具。
- [ ] 用户要求“直接写回”时，Orchestrator 启动写回 Workflow，但写回前必须审批。
- [ ] Orchestrator 能查询 workflow status 并解释进度。
- [ ] 后端拒绝 Orchestrator 启动未授权 workflow。
- [ ] 所有 Orchestrator tool call 写入 audit log。

## 最终结论

Orchestrator 必须存在，但它是入口层，不是执行层。

MVP 中它只做五件事：

1. 理解用户想做什么。
2. 补齐运行 Workflow 需要的参数。
3. 从业务 Registry 里选择白名单 Workflow。
4. 启动 Workflow。
5. 向用户解释状态、审批点和结果。

它不直接写 Shopify，不直接管理 Nango，不直接发布 Agent，不直接改版本，不自由写长期记忆。

这个边界能同时满足对话体验和商业平台的可控性。
