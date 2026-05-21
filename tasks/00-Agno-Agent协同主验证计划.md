# 00 Agno Agent 协同主验证计划

## 研究目标

验证 Agno 是否能作为跨境电商 Agent 平台的核心协同引擎。

本阶段优先验证 Agent 协同，不优先做完整前端、多租户和部署。前端、多租户只做轻 MVP 验证，先证明主能力成立。

## 核心判断

我们的平台不是“一个聊天 Agent”，而是多个专业 Agent 共同完成跨境电商任务。

因此要验证的不是 Agno 能不能跑一个 Agent，而是：

- 多个 Agent 能不能协同。
- Team 能不能承担专家组调度。
- Workflow 能不能承载可销售业务流程。
- Tool 能不能成为外部系统动作边界。
- Approval 能不能控制高风险写操作。
- State / Memory / Session 能不能被明确共享或隔离。
- Agent 输出能不能结构化传递给下一个 Agent 或 Workflow step。

## 跨境电商主场景

第一验证场景：

```text
Listing 优化并写回 Shopify
```

该场景里至少包含：

- 商品数据读取。
- 关键词分析。
- 标题优化。
- 描述优化。
- SEO 字段优化。
- 合规和风险检查。
- 人工审批。
- Shopify 写回。
- 审计记录。
- 可控记忆写入。

这不是单个 Agent 聊天就能完成的，它天然需要 Agent、Workflow、Tool、Approval 协同。

## 要验证的 Agno 能力

### 1. 单 Agent 能力

验证项：

- 创建专业 Agent。
- 注入 instructions。
- 注入 tools。
- 注入 knowledge。
- 注入 memory。
- 使用 structured output。
- 获取 run_id / session_id。
- streaming 输出。
- 非 streaming 输出。

跨境电商映射：

- Listing 优化 Agent。
- 店铺诊断 Agent。
- 客服回复 Agent。
- 竞品分析 Agent。

验收：

- Agent 能根据输入商品信息返回结构化建议。
- Agent 不直接执行外部写操作。
- Agent 输出能被下游 step 使用。

### 2. Team 协作能力

验证 Agno Team 四种模式：

- route
- coordinate
- broadcast
- tasks

#### route

用途：

- 根据用户问题路由到最合适的专业 Agent。

跨境电商例子：

- 用户问“这个商品为什么转化差”，路由到 Listing Agent 或店铺数据分析 Agent。
- 用户问“这条差评怎么回复”，路由到客服回复 Agent。

验收：

- Team 能选择合适 Agent。
- 路由理由可追踪。
- 不合适的 Agent 不被调用。

#### coordinate

用途：

- 一个协调者分配任务给多个 Agent，再汇总结论。

跨境电商例子：

- 店铺诊断 Team 同时调用数据分析 Agent、Listing Agent、广告 Agent，最后汇总成诊断报告。

验收：

- 多个 Agent 的输出能被汇总。
- 汇总结果能保留来源。
- 能控制每个 Agent 的工具权限。

#### broadcast

用途：

- 同一个问题广播给多个 Agent，从不同角度给意见。

跨境电商例子：

- 对一个 Listing 优化方案，让 SEO Agent、合规 Agent、品牌语气 Agent 同时评审。

验收：

- 多个 Agent 都能收到同一输入。
- 输出能并列展示或进入下一步汇总。

#### tasks

用途：

- 将一个复杂任务拆成多个子任务执行。

跨境电商例子：

- 新品上架：关键词、标题、描述、图片建议、价格建议、合规检查分别处理。

验收：

- 任务拆分结果可追踪。
- 子任务输出能被汇总。
- 失败子任务不会污染整个结果。

### 3. Workflow 编排能力

验证项：

- 顺序 step。
- 条件 step。
- 函数 step。
- Agent step。
- Team step。
- 子 Workflow。
- step retry。
- step error handling。
- pause / resume。

跨境电商主流程：

```text
读取商品
  -> Listing 分析 Agent
  -> SEO 优化 Agent
  -> 合规检查 Agent
  -> 生成 diff
  -> 等待人工审批
  -> 写回 Shopify
  -> 记录 audit_log
  -> 生成可确认记忆
```

验收：

- Workflow 能明确承载 read / think / review / approve / write。
- Agent 只负责智能判断和生成。
- Tool 只负责外部系统动作。
- 审批能暂停流程。
- 审批通过后能继续流程。

### 4. Agent / Team / Workflow 混合调用

验证项：

- Workflow 中调用 Agent。
- Workflow 中调用 Team。
- Team 成员中包含 Agent。
- Team 成员中包含 Team。
- Agent 输出进入 Workflow 下一步。
- Team 汇总结果进入 Workflow 下一步。

跨境电商例子：

```text
Listing Optimization Workflow
  -> Product Read Tool
  -> Listing Review Team
       -> SEO Agent
       -> Copywriting Agent
       -> Compliance Agent
  -> Final Suggestion Agent
  -> Approval Step
  -> Shopify Write Tool
```

验收：

- 混合调用链路能跑通。
- 每一步输入输出边界清晰。
- run / session / trace 可以追踪。

### 5. 结构化输出传递

验证项：

- Agent 使用 Pydantic schema 输出。
- Team 汇总输出结构化。
- Workflow step 之间传递结构化对象。
- 前端能展示结构化结果。
- 审批 diff 能从结构化结果生成。

跨境电商核心对象：

- `ProductSnapshot`
- `ListingSuggestion`
- `ListingDiff`
- `ApprovalRequest`
- `WriteBackResult`

验收：

- 不依赖纯文本解析。
- diff 能稳定生成。
- 审批页面可以直接消费结构化对象。

### 6. Tool Gateway 验证

验证项：

- Agent tool 不直接调用 Shopify。
- Agent tool 调用业务工具网关。
- 工具网关检查 tenant / user / agent / shop / tool 权限。
- 工具网关调用 Nango。
- 工具网关写 audit_log。

工具分类：

- read：读取外部数据。
- suggest：生成建议。
- write：修改外部系统。

验收：

- read tool 可直接执行。
- write tool 默认进入审批。
- Agent 无法绕过业务权限。

### 7. Approval / HITL 验证

验证项：

- Agno `requires_confirmation`。
- Agno `@approval`。
- external execution。
- run pause。
- run continue。
- 拒绝审批。
- 审批超时。

跨境电商写操作：

- 修改标题。
- 修改描述。
- 修改 SEO 字段。
- 修改价格。
- 修改库存。
- 发客户消息。

验收：

- 写操作必须暂停。
- 审批请求中包含变更前后 diff。
- 审批通过后继续执行。
- 拒绝后不执行写操作。
- 审批记录是业务对象，能被前端审批中心展示。

### 8. Session / State / Memory 验证

验证项：

- session_id 如何贯穿 Agent / Team / Workflow。
- state 如何在 Workflow step 之间传递。
- memory 是否按 user / shop / agent 隔离。
- Team 是否共享 memory。
- Agent 是否只读自己允许范围内的 memory。

跨境电商记忆类型：

- user_memory
- shop_memory
- agent_memory
- workflow_memory

验收：

- Listing Agent 不能随意读取客服 Agent 的私有记忆。
- 店铺规则类记忆必须确认后写入。
- Workflow 临时 state 不等于长期 memory。
- 敏感信息禁止进入 memory。

### 9. Trace / Metrics 验证

验证项：

- 每次 run 是否有 run_id。
- 每个 Agent 调用是否可追踪。
- 每个 tool call 是否可追踪。
- approval 是否可追踪。
- 最终 audit_log 如何关联 trace。

验收：

- 一个业务任务能追踪到每个 Agent 和工具动作。
- 前端运行详情能展示关键步骤。
- 后续可以做成本、耗时、成功率分析。

## 最小测试原型顺序

### Prototype A：单 Agent + 结构化输出

目标：

- Listing Agent 输入商品信息，输出 ListingSuggestion。

验收：

- 输出结构稳定。
- 能用于生成 diff。

### Prototype B：Workflow 顺序编排

目标：

- read product mock -> Agent suggestion -> diff -> fake approval -> write mock。

验收：

- Workflow step 能传递结构化数据。
- 写操作前能暂停。

### Prototype C：Team 协同

目标：

- SEO Agent、Copywriting Agent、Compliance Agent 组成 Team。

验收：

- route / coordinate / broadcast 至少跑通两个模式。
- Team 输出能进入 Workflow。

### Prototype D：真实 Tool Gateway

目标：

- Tool 不直接执行 Shopify，而是调用业务工具网关 mock。

验收：

- read 可通过。
- write 被拦截并创建 approval。

### Prototype E：Approval Resume

目标：

- 审批通过后继续执行 write mock。

验收：

- run 能恢复。
- audit_log 能记录。

### Prototype F：接入 Nango + Shopify

目标：

- 用真实 Nango connection 读取 Shopify 商品。

验收：

- connection_id 能映射 shop。
- read product 成功。
- update product 在审批后成功。

## 本阶段不重点验证

本阶段不重点验证：

- 完整前端页面。
- 完整多租户后台。
- 复杂 Agent Builder。
- Team 管理 UI。
- 多平台接入。
- 自动 sync。
- 队列系统。

这些只做轻 MVP 或后置验证。

## 风险清单

### 风险 1：Agno Team 模式不适合业务可控协同

处理：

- 如果 Team 输出不可控，则把 Team 降级为 Workflow 中多个 Agent step。
- Workflow 作为主编排，Team 只用于非关键分析。

### 风险 2：Approval pause / resume 不够贴合业务审批

处理：

- Agno approval 只作为 runtime pause 机制。
- 业务审批中心使用自建 approvals 表。
- 审批通过后由业务后端触发 continue。

### 风险 3：Memory 默认共享边界不够清晰

处理：

- 第一版不使用全局自动记忆。
- 所有长期记忆通过业务 memory_policy 写入。
- Agent 只读取显式授权范围。

### 风险 4：结构化输出不稳定

处理：

- 所有关键 step 使用 Pydantic schema。
- 输出失败进入 retry 或人工修正。
- 审批 diff 不从自然语言中解析。

### 风险 5：Workflow 太重

处理：

- MVP 只保留一个主 Workflow。
- 非核心任务用单 Agent 或轻 Team。

## 第一版结论方向

第一版架构优先级：

```text
Workflow > Agent > Tool Gateway > Approval > Team
```

解释：

- Workflow 承载可销售业务流程。
- Agent 承载专业判断和内容生成。
- Tool Gateway 承载权限、连接和审计。
- Approval 承载安全控制。
- Team 用于多专家协作，但不是 MVP 的唯一主路径。

## 后续实现任务

1. 阅读 Agno Agent / Team / Workflow / Tool / Approval 源码。
2. 做 Prototype A：单 Agent + 结构化输出。
3. 做 Prototype B：Workflow 顺序编排。
4. 做 Prototype C：Team 协同。
5. 做 Prototype D：Tool Gateway mock。
6. 做 Prototype E：Approval resume。
7. 将验证结论补回本文档。

## 结论

本阶段先验证 Agno 的 Agent 协同主能力。

只有当 Agent、Team、Workflow、Tool、Approval、State、Memory 这些协同机制跑通后，前端、多租户、Nango、Shopify 才进入完整 MVP 链路验证。

