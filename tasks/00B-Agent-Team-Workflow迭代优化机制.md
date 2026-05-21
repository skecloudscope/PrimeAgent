# 00B Agent / Team / Workflow 迭代优化机制

## 研究目标

设计跨境电商 Agent 平台中 Agent、Team、Workflow 的持续迭代和优化机制。

本平台不是一次性配置 Agent 后长期不变，而是要让 Agent、Team、Workflow 可以基于真实运行结果持续改进。

需要回答的问题：

- Agent 如何迭代。
- Team 如何迭代。
- Workflow 如何迭代。
- 哪些数据可以用于优化。
- 哪些优化可以自动化。
- 哪些优化必须人工确认。
- 如何做版本管理。
- 如何回滚。
- 如何评估优化是否有效。

## 核心判断

Agent 平台的长期壁垒不只是“能调用模型”，而是能形成业务闭环：

```text
运行任务
  -> 记录结果
  -> 收集反馈
  -> 发现失败模式
  -> 生成优化建议
  -> 人工确认
  -> 发布新版本
  -> A/B 或灰度验证
  -> 固化有效改进
```

因此，Agent、Team、Workflow 都必须有版本、评估、反馈和发布机制。

## 优化对象

### 1. Agent 优化

Agent 可优化内容：

- instructions。
- system message。
- output schema。
- tool list。
- tool permission。
- memory policy。
- knowledge scope。
- model。
- temperature 等模型参数。
- fallback model。
- guardrails。
- few-shot examples。

跨境电商例子：

- Listing 优化 Agent 经常生成过长标题，需要调整标题长度规则。
- 客服回复 Agent 语气太强硬，需要调整品牌语气。
- 店铺数据分析 Agent 总是忽略库存风险，需要加入库存检查 instruction。
- Compliance Agent 漏掉平台禁词，需要更新知识库和规则。

### 2. Team 优化

Team 可优化内容：

- 成员 Agent。
- Team mode。
- 成员调用顺序。
- 汇总策略。
- 路由规则。
- 协调者 instructions。
- 共享上下文范围。
- 每个成员可用工具。
- 每个成员的输出 schema。

跨境电商例子：

- Listing Review Team 中 Compliance Agent 经常给出阻塞结论，需要调整其风险分级。
- Store Diagnosis Team 输出太散，需要增加一个 Summary Agent。
- Growth Team 成本太高，需要减少默认调用的 Agent 数量。
- route 模式误判任务类型，需要优化路由规则。

### 3. Workflow 优化

Workflow 可优化内容：

- step 顺序。
- step 条件。
- retry 策略。
- approval 策略。
- error handling。
- timeout。
- 是否加入人工 review。
- 是否加入合规检查。
- 是否拆分为子 Workflow。
- 哪些 step 可以并行。

跨境电商例子：

- Listing 写回前必须加入 Compliance Check。
- 商品优化失败时，不应直接结束，而是回到 Agent 修改建议。
- 读取 Shopify 失败时需要 retry。
- 低风险字段可以一次审批，高风险字段单独审批。

## 可用于优化的数据

### 运行数据

来源：

- Agno run。
- Agno session。
- Agno trace。
- Agno metrics。
- tool call 记录。
- workflow_run。
- step_run。

记录内容：

- 输入。
- 输出。
- 调用的 Agent。
- 调用的工具。
- token 成本。
- 耗时。
- 错误。
- retry 次数。
- 是否被审批拒绝。
- 是否写回成功。

### 用户反馈

来源：

- thumbs up / down。
- 用户编辑后的最终内容。
- 审批通过 / 拒绝。
- 审批拒绝原因。
- 用户手动修改 diff。
- 用户在对话中纠正 Agent。

跨境电商重要反馈：

- 用户改了 Agent 生成的标题。
- 用户删除了夸张营销词。
- 用户拒绝写回某个 SEO 描述。
- 用户重复要求某种品牌语气。

### 业务结果

来源：

- Shopify 商品表现。
- 点击率。
- 转化率。
- 订单数。
- 退货率。
- 客服投诉。
- 广告 ROAS。

第一版不做完整业务归因，但数据模型要预留。

### 审批数据

来源：

- approvals。
- approval decisions。
- approval comments。
- diff。

优化价值：

- 高频拒绝的建议说明 Agent 规则有问题。
- 高频人工修改字段说明输出 schema 或 instruction 需要调整。
- 高频审批通过的低风险动作未来可以配置半自动。

### 失败数据

来源：

- tool error。
- model output parse error。
- workflow timeout。
- provider API failure。
- schema validation failure。
- user rejection。

优化价值：

- 失败案例是 Agent 迭代的核心训练样本。
- Workflow 的错误处理策略依赖失败数据。

## 版本体系

### AgentVersion

每个 Agent instance 必须有版本。

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
- created_by
- created_at
- release_note

状态：

- draft
- testing
- active
- archived
- rolled_back

规则：

- active 版本用于线上运行。
- draft 版本用于调试。
- testing 版本用于灰度或评估。
- 任意配置变更都生成新版本。
- 不直接修改 active 版本。

### TeamVersion

字段建议：

- team_version_id
- team_id
- version
- status
- mode
- member_agent_versions
- coordinator_instructions
- routing_rules
- aggregation_strategy
- shared_context_policy
- created_by
- created_at
- release_note

规则：

- Team 版本必须锁定成员 Agent 的版本。
- 否则无法复现历史运行结果。

### WorkflowVersion

字段建议：

- workflow_version_id
- workflow_id
- version
- status
- steps
- step_conditions
- retry_policy
- approval_policy_snapshot
- error_handling
- timeout_policy
- created_by
- created_at
- release_note

规则：

- Workflow 版本必须锁定所调用的 AgentVersion / TeamVersion / ToolVersion。
- 历史 workflow_run 必须能回放当时的版本配置。

### ToolVersion

工具也需要版本。

字段建议：

- tool_version_id
- tool_name
- version
- provider
- input_schema
- output_schema
- permission_level
- approval_required
- implementation_ref
- created_at

规则：

- Shopify update product 工具字段变更必须发新版本。
- 审批 diff 依赖 tool schema，不能随意改。

## 运行记录与版本绑定

每次 run 必须记录：

- tenant_id
- workspace_id
- shop_id
- user_id
- agent_id
- agent_version_id
- team_id
- team_version_id
- workflow_id
- workflow_version_id
- tool_versions
- input_hash
- output_hash
- trace_id
- approval_ids
- audit_log_ids

目的：

- 可复现。
- 可回滚。
- 可评估。
- 可对比版本效果。

## 迭代流程

### 1. 人工迭代流程

适用于第一版。

```text
收集运行记录和反馈
        |
人工查看失败案例和拒绝案例
        |
创建 Agent / Team / Workflow draft 版本
        |
本地或测试环境回放案例
        |
人工确认改进
        |
发布 testing 版本
        |
小范围灰度
        |
发布 active
```

第一版必须采用人工确认，不允许系统自动改 active 配置。

### 2. 半自动优化建议

第二阶段引入。

```text
系统聚合失败和反馈
        |
Optimization Agent 生成优化建议
        |
展示建议 diff
        |
人工确认
        |
生成 draft 版本
```

Optimization Agent 只能生成建议，不能直接发布。

### 3. 自动评估

第二阶段引入。

对同一批历史案例运行两个版本：

- current active
- candidate version

比较：

- schema 成功率。
- 审批通过率。
- 用户修改率。
- 失败率。
- 平均成本。
- 平均耗时。
- 业务指标。

通过门槛后才能发布。

## Agent 优化指标

Listing 优化 Agent 指标：

- 输出 schema 成功率。
- 标题长度合规率。
- 禁词命中率。
- 用户审批通过率。
- 用户手动修改率。
- 写回成功率。
- 平均生成耗时。
- 平均 token 成本。

客服回复 Agent 指标：

- 用户采纳率。
- 人工修改率。
- 风险词命中率。
- 客诉率。

店铺数据分析 Agent 指标：

- 报告完成率。
- 用户点击建议动作率。
- 用户反馈有用率。

## Team 优化指标

Listing Review Team 指标：

- Team 输出结构成功率。
- 成员 Agent 失败率。
- 汇总结果采纳率。
- 成本。
- 耗时。
- Compliance 漏检率。
- 用户审批通过率。

Team mode 对比：

- route：路由准确率。
- coordinate：汇总质量。
- broadcast：评审覆盖度。
- tasks：任务完成率。

## Workflow 优化指标

Listing Workflow 指标：

- 完整流程成功率。
- 每个 step 成功率。
- 平均耗时。
- approval 通过率。
- approval 拒绝率。
- write-back 成功率。
- retry 次数。
- 失败 step 分布。

优化方向：

- 高失败 step 优先优化。
- 高频拒绝字段优先调整 Agent。
- 高频 API 错误优先调整 tool retry。

## 记忆参与优化的边界

记忆可以用于优化，但不能失控。

允许：

- 记录用户偏好。
- 记录店铺规则。
- 记录用户确认过的品牌语气。
- 记录用户确认过的禁用词。

不允许：

- 自动记住 token。
- 自动记住支付信息。
- 自动记住隐私数据。
- 自动把一次失败结论变成长期规则。

规则：

- memory candidate 必须可见。
- shop_memory 必须确认。
- agent_memory 需要能回滚。
- memory 使用记录必须可追踪。

## 与 Agno Learn / Eval 的关系

需要阅读 Agno 的：

- `agno/learn`
- `agno/eval`
- `agno/tracing`
- `agno/metrics`

验证问题：

- Agno 是否已有 learning record。
- Agno eval 能否评估 Agent 输出。
- Agno trace 是否足够支撑版本对比。
- Agno metrics 是否能直接用于优化面板。

第一版判断：

- 可以借用 Agno trace / metrics / eval 思路。
- 业务版本管理必须自建。
- 优化发布流程必须自建。

原因：

- 我们的优化对象不只是 Agent prompt，还包括 Team 成员、Workflow step、Tool 权限、审批策略和业务记忆。

## 第一版必须实现的优化能力

MVP 必须有：

- AgentVersion。
- WorkflowVersion。
- tool call 记录。
- approval 记录。
- audit_log。
- 用户反馈。
- 用户编辑后的 final output。
- 失败案例记录。
- 手动创建新版本。
- 手动回滚版本。

MVP 不做：

- 自动发布优化。
- 自动 A/B 测试。
- 自动 prompt 改写。
- 自动训练模型。
- 完整业务结果归因。

## 后续实现任务

1. 阅读 Agno learn / eval / tracing / metrics 源码。
2. 补充 Agno 原生能力和自建能力边界。
3. 设计 AgentVersion / TeamVersion / WorkflowVersion 表。
4. 设计 run 与 version 绑定关系。
5. 设计 feedback / approval / audit 如何反哺版本优化。
6. 设计 Listing Agent 第一版评估指标。
7. 设计手动优化发布流程。

## 结论

Agent、Team、Workflow 的迭代优化必须作为平台核心能力设计，而不是后期补丁。

第一版不追求自动优化，但必须把数据和版本体系打好：

- 每次运行绑定版本。
- 每次工具调用可追踪。
- 每次审批可反馈。
- 每次用户修改可记录。
- 每个版本可回滚。

这样平台才会越用越强，而不是每次都从零开始跑 Agent。

