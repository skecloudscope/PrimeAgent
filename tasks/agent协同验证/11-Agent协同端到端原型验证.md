# 11 Agent 协同端到端原型验证

## 一句话结论

端到端原型的目标不是一次性做完整商业系统，而是用最小闭环验证平台内核是否成立：

```text
Orchestrator
  -> Business Registry
  -> Runtime Plan
  -> Agno Workflow
  -> Agent
  -> Team
  -> Tool Gateway
  -> Approval
  -> Mock Shopify Write
  -> Audit Log
```

只要这条链路跑通，就说明“跨境电商垂类 Agent 商业框架”的核心技术路线成立。前端、多租户、Nango、真实 Shopify 写入可以在这个闭环上逐步替换 mock。

## 原型目标

验证用户一句自然语言，能进入一个可控、可追踪、可审批、可回放的跨境电商业务流程。

第一条端到端链路固定为：

```text
用户输入：帮我优化这个 Shopify 商品 Listing，并准备写回
        |
Orchestrator Agent 识别任务
        |
业务 Registry 返回可用 Workflow 白名单
        |
Runtime Plan Resolver 锁定版本
        |
Listing 优化并写回 Shopify Workflow
        |
Mock Shopify Read Tool 读取 ProductSnapshot
        |
Listing 优化 Agent 生成 ListingOptimizationDraft
        |
Listing Review Team 多角度评审
        |
Workflow 生成 ListingWriteBackPlan / ListingDiff
        |
Tool Gateway 创建 ApprovalRequest
        |
用户审批通过
        |
Mock Shopify Write Tool 执行写回
        |
Audit Log 记录全链路
        |
Memory Candidate 进入待确认区
```

## 本原型要验证什么

### 必须真实验证

| 能力 | 原型要求 |
| --- | --- |
| Orchestrator | 真实 Agno Agent 或等价 runtime 调用 |
| Agent | 真实 Agno Agent run |
| Team | 真实 Agno Team run，优先 broadcast |
| Workflow | 真实 Agno Workflow run |
| Step 状态 | 每个关键步骤有状态记录 |
| 版本绑定 | run 绑定 workflow_version_id / agent_version_id / team_version_id / tool_version_id |
| structured output | Agent 输出结构化对象 |
| Approval pause/resume | 写操作前暂停，审批后继续 |
| Tool Gateway | 写工具必须经过统一网关 |
| Audit Log | 每个关键事件可追踪 |

### 可以先 mock

| 模块 | mock 方式 |
| --- | --- |
| Shopify read | 本地 fixture 返回 ProductSnapshot |
| Shopify write | 本地函数打印/记录 ListingDiff |
| Nango | mock connection_id 和 token 状态 |
| Clerk | 固定 user_id / tenant_id / role |
| 前端审批 UI | CLI/API 调用 approve endpoint 或本地函数 |
| 真实数据库 | 可以先 SQLite/Postgres 任一，但表结构要贴近最终设计 |
| 模型 provider | 可以先单 provider，保留 model_policy 字段 |

## 原型边界

第一版不做：

- 真实 Shopify 写入。
- 完整 Nango OAuth。
- 完整 Clerk 登录。
- 完整前端工作台。
- 完整多租户后台。
- 自动优化 Agent prompt。
- 复杂 Agent marketplace。
- 任意用户自定义 Workflow 图谱。

第一版必须保留字段和边界：

- `tenant_id`
- `user_id`
- `shop_id`
- `workflow_instance_id`
- `workflow_version_id`
- `agent_instance_id`
- `agent_version_id`
- `team_instance_id`
- `team_version_id`
- `tool_version_id`
- `approval_request_id`
- `audit_log_id`

即使这些值来自 mock，也要在 run 中真实传递和记录。

## 最小组件清单

### 1. Mock 租户与店铺

```text
tenant_id = tenant_demo
user_id = user_demo_admin
role = owner
shop_id = shop_demo_us
nango_connection_id = conn_shopify_demo
```

### 2. ProductSnapshot fixture

```text
ProductSnapshot
- product_id
- shop_id
- title
- description
- bullet_points
- product_type
- vendor
- tags
- price
- images
- variants
- seo_title
- seo_description
- target_market = US
- language = en
```

### 3. Listing 优化 Agent

职责：

- 分析 ProductSnapshot。
- 生成标题、卖点、描述、SEO 建议。
- 输出结构化 `ListingOptimizationDraft`。
- 不持有写工具。

输出：

```text
ListingOptimizationDraft
- proposed_title
- proposed_bullets
- proposed_description
- proposed_seo_title
- proposed_seo_description
- rationale
- risk_notes
- confidence
```

### 4. Listing Review Team

Team mode 第一版使用 `broadcast`。

成员：

```text
SEO Review Agent
Copywriting Review Agent
Compliance Review Agent
```

职责：

- 并行审核 ListingOptimizationDraft。
- 输出风险、建议、是否可写回。
- 不持有写工具。

输出：

```text
ListingReviewResult
- seo_score
- copy_score
- compliance_score
- blocking_issues
- improvement_notes
- writeback_recommended
```

### 5. Listing Workflow

步骤：

```text
1. validate_context
2. mock_shopify_read_product
3. listing_optimizer_agent
4. listing_review_team
5. build_listing_writeback_plan
6. create_approval_request
7. wait_for_approval
8. mock_shopify_write_product
9. write_audit_log
10. propose_memory_candidate
```

规则：

- 第 8 步必须在第 7 步审批通过后执行。
- replay 默认跳过第 8 步。
- 第 3、4、5 步失败时不允许写回。
- Team 输出有 blocking issues 时进入人工 review，不自动写回。

### 6. Tool Gateway

第一版只实现两个工具：

```text
shopify.products.read
- operation_type = read
- risk_level = low
- approval_required = false
- implementation = mock_shopify_read_product

shopify.products.update
- operation_type = write
- risk_level = high
- approval_required = true
- dry_run_required = true
- implementation = mock_shopify_write_product
```

Tool Gateway 必须检查：

- tenant 是否有工具权限。
- user role 是否允许。
- shop_id 是否有 connection。
- tool scope 是否满足。
- write 操作是否已有 approval。

### 7. Approval

```text
ApprovalRequest
- id
- tenant_id
- workflow_run_id
- step_key
- tool_key
- proposed_diff
- status = pending / approved / rejected / expired
- requested_by
- approved_by
- created_at
- decided_at
```

审批通过后 Workflow 才能继续执行写入步骤。

### 8. Audit Log

记录事件：

```text
ORCHESTRATOR_INTENT_DETECTED
REGISTRY_RUNTIME_PLAN_RESOLVED
WORKFLOW_RUN_STARTED
WORKFLOW_STEP_STARTED
WORKFLOW_STEP_COMPLETED
AGENT_RUN_COMPLETED
TEAM_RUN_COMPLETED
TOOL_GATEWAY_APPROVAL_CREATED
APPROVAL_APPROVED
TOOL_EXECUTION_COMPLETED
WORKFLOW_RUN_COMPLETED
MEMORY_CANDIDATE_CREATED
```

## Runtime Plan 示例

```json
{
  "runtime_plan_id": "rp_demo_001",
  "tenant_id": "tenant_demo",
  "shop_id": "shop_demo_us",
  "workflow": {
    "workflow_instance_id": "wf_listing_optimize_writeback",
    "workflow_version_id": "wfv_1"
  },
  "agents": [
    {
      "agent_instance_id": "agt_listing_optimizer",
      "agent_version_id": "agv_1"
    },
    {
      "agent_instance_id": "agt_seo_reviewer",
      "agent_version_id": "agv_1"
    },
    {
      "agent_instance_id": "agt_copy_reviewer",
      "agent_version_id": "agv_1"
    },
    {
      "agent_instance_id": "agt_compliance_reviewer",
      "agent_version_id": "agv_1"
    }
  ],
  "teams": [
    {
      "team_instance_id": "team_listing_review",
      "team_version_id": "tmv_1",
      "mode": "broadcast"
    }
  ],
  "tools": [
    {
      "tool_key": "shopify.products.read",
      "tool_version_id": "toolv_read_1",
      "approval_required": false
    },
    {
      "tool_key": "shopify.products.update",
      "tool_version_id": "toolv_update_1",
      "approval_required": true,
      "dry_run_required": true
    }
  ],
  "model_policy": {
    "default_tier": "balanced",
    "review_tier": "balanced",
    "orchestrator_tier": "fast"
  }
}
```

## 目录建议

原型代码可以放在：

```text
/Users/ske/PrimeAgent/prototypes/listing协同端到端原型/
```

建议结构：

```text
listing协同端到端原型/
- README.md
- app/
  - main.py
  - schemas.py
  - mock_data.py
  - registry.py
  - runtime_plan.py
  - orchestrator.py
  - agents.py
  - teams.py
  - workflow.py
  - tool_gateway.py
  - approvals.py
  - audit.py
- tests/
  - test_end_to_end_listing_workflow.py
```

如果先不启 FastAPI，也可以先用一个脚本验证：

```text
python run_demo.py
```

但字段和模块边界要按上面的结构组织，避免 demo 变成不可迁移的一次性脚本。

## API 原型

### 1. Orchestrator 对话入口

```http
POST /api/chat/orchestrator
```

请求：

```json
{
  "tenant_id": "tenant_demo",
  "user_id": "user_demo_admin",
  "shop_id": "shop_demo_us",
  "message": "帮我优化这个商品 Listing，并准备写回 Shopify",
  "context": {
    "product_id": "product_demo_001"
  }
}
```

响应：

```json
{
  "intent": {
    "intent_type": "listing_optimize",
    "confidence": 0.91,
    "target_workflow_key": "listing_optimize_writeback",
    "missing_fields": []
  },
  "next_action": "start_workflow",
  "workflow_run_id": "wfr_demo_001"
}
```

### 2. 查询 Workflow Run

```http
GET /api/workflow-runs/{workflow_run_id}
```

返回：

```json
{
  "workflow_run_id": "wfr_demo_001",
  "status": "waiting_approval",
  "current_step": "create_approval_request",
  "steps": [
    {"key": "mock_shopify_read_product", "status": "completed"},
    {"key": "listing_optimizer_agent", "status": "completed"},
    {"key": "listing_review_team", "status": "completed"},
    {"key": "create_approval_request", "status": "completed"},
    {"key": "mock_shopify_write_product", "status": "waiting"}
  ],
  "approval_request_id": "apr_demo_001"
}
```

### 3. 审批

```http
POST /api/approval-requests/{approval_request_id}/approve
```

响应：

```json
{
  "approval_request_id": "apr_demo_001",
  "status": "approved",
  "workflow_run_id": "wfr_demo_001",
  "resume_required": true
}
```

### 4. 继续 Workflow

```http
POST /api/workflow-runs/{workflow_run_id}/resume
```

响应：

```json
{
  "workflow_run_id": "wfr_demo_001",
  "status": "completed",
  "tool_execution_id": "tex_demo_001"
}
```

## 实施步骤

### 第 1 步：建立 schema 和 mock 数据

产物：

- `ProductSnapshot`
- `ListingOptimizationDraft`
- `ListingReviewResult`
- `ListingWriteBackPlan`
- `RuntimePlan`
- `WorkflowRun`
- `ApprovalRequest`
- `AuditEvent`

验收：

- 所有对象能序列化为 JSON。
- run 中能看到 version id。

### 第 2 步：建立 mock Business Registry

产物：

- `list_available_workflows`
- `list_available_agents`
- `resolve_runtime_plan`

验收：

- 只返回当前 tenant/shop/user 可用组件。
- RuntimePlan 锁定版本。
- 未授权 workflow 会被拒绝。

### 第 3 步：建立 Tool Gateway

产物：

- `execute_tool`
- `create_approval_request`
- `check_tool_permission`

验收：

- read tool 可直接执行。
- write tool 无 approval 时被拦截。
- approval 通过后 write tool 可执行。

### 第 4 步：建立 Listing 优化 Agent

产物：

- Agno Agent。
- 输入 ProductSnapshot。
- 输出 ListingOptimizationDraft。

验收：

- 输出结构化。
- 不含 Shopify 写工具。
- run 记录 agent_version_id。

### 第 5 步：建立 Listing Review Team

产物：

- SEO Agent。
- Copywriting Agent。
- Compliance Agent。
- Agno Team broadcast。

验收：

- Team 能接收 ListingOptimizationDraft。
- Team 能输出 ListingReviewResult。
- TeamVersion 锁定成员 AgentVersion。

### 第 6 步：建立 Listing Workflow

产物：

- Agno Workflow。
- 顺序步骤。
- 写入前暂停审批。

验收：

- Workflow 能串起 read、Agent、Team、diff、approval、write。
- 审批前不会执行 write。
- 审批后可以 resume。

### 第 7 步：建立 Orchestrator

产物：

- Orchestrator Agent。
- 工具：list workflow、resolve plan、start workflow、get status。

验收：

- 用户一句话能触发正确 workflow。
- 缺参数时能追问。
- 无权 workflow 不可启动。
- Orchestrator 没有写工具。

### 第 8 步：建立端到端测试

测试用例：

```text
test_listing_workflow_requires_approval_before_write
test_orchestrator_can_start_listing_workflow
test_write_tool_rejects_without_approval
test_runtime_plan_binds_versions
test_team_output_blocks_write_when_compliance_issue_exists
test_replay_never_calls_write_tool
```

验收：

- 所有测试通过。
- audit log 数量和顺序符合预期。
- mock write 只在 approval 后执行。

## 成功标准

端到端原型成功必须满足：

- 用户自然语言可以被 Orchestrator 转成 `listing_optimize` intent。
- Registry 能返回白名单 Workflow。
- RuntimePlan 能锁定所有版本。
- Workflow 能真实调用 Agent。
- Workflow 能真实调用 Team。
- Team 能聚合多个 Agent 的评审。
- 写操作前必然创建 ApprovalRequest。
- Approval 通过前 write tool 不会执行。
- Approval 通过后 Workflow 可以继续。
- AuditLog 能还原完整链路。
- Replay 不会执行 mock write。

## 失败降级策略

### Team 不稳定

降级为：

```text
Workflow 顺序调用 SEO Agent、Copywriting Agent、Compliance Agent
```

保留 TeamVersion 数据模型，但 MVP 执行层先不用 Team。

### Agno Approval 不适合业务审批

降级为：

```text
Agno Workflow 只负责暂停
业务 ApprovalRequest 自建
审批通过后由 FastAPI resume Workflow
```

Approval 表和审计完全由业务后端控制。

### Orchestrator 越权风险太高

降级为：

```text
Orchestrator 只输出 TaskIntent
FastAPI 根据 TaskIntent 和 Registry 决定是否启动 Workflow
```

也就是 Orchestrator 不直接调用 `start_workflow`，只做分类和参数收集。

### Workflow replay 难以控制写工具

降级为：

```text
Replay 使用独立 ReplayRunner
ReplayRunner 禁用所有 operation_type=write 的 Tool
```

所有 write tool 在 replay 模式下强制返回 dry-run 结果。

## 与最终产品的关系

这个端到端原型不是临时 demo，而是最终系统的缩小版。

原型中的 mock 将来替换为：

| 原型模块 | 最终替换 |
| --- | --- |
| mock tenant/user | Clerk + Business RBAC |
| mock Nango connection | Nango real connection |
| mock Shopify read | Nango + Shopify API |
| mock Shopify write | Tool Gateway + Nango + Shopify API |
| mock Registry | Postgres Business Registry |
| mock Approval UI | Next.js 审批侧栏 |
| local audit list | Postgres audit_logs |
| local run state | workflow_runs / workflow_steps |

核心边界不变：

```text
Orchestrator 不写外部系统
Agent 不写外部系统
Team 不写外部系统
Workflow 负责商业流程
Tool Gateway 负责外部动作
Approval 负责高风险确认
Registry 负责可用性、权限和版本
Audit 负责追溯
```

## 最终结论

端到端原型的第一目标是跑通 `Listing 优化并写回 Shopify`。

第一版可以 mock Shopify、Nango、Clerk 和前端审批，但必须真实验证 Agno Agent、Team、Workflow、结构化输出、版本绑定、审批暂停、Tool Gateway 拦截和 Audit Log。

如果这条链路通过，我们就可以进入真正的 MVP 实现：

1. 先做后端原型。
2. 再把 mock Registry 换成 Postgres。
3. 再接 Nango Shopify。
4. 再接 Next.js + Vercel AI SDK 前端。
5. 再做多租户、管理后台和迭代优化体系。
