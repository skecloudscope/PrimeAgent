# 00A 跨境电商 Agent 协同场景矩阵

## 研究目标

把跨境电商垂类任务拆成 Agent、Team、Workflow、Tool 和 Approval 的组合，明确哪些能力必须第一阶段验证，哪些能力后置。

## 总体原则

跨境电商 Agent 平台的核心不是聊天，而是完成业务动作。

业务动作分三类：

- 分析：读取数据，发现问题。
- 建议：生成方案，给出理由。
- 执行：修改外部系统或触发业务动作。

Agent 主要做分析和建议。

Workflow 负责把业务动作串起来。

Tool 负责读写外部系统。

Approval 负责保护高风险执行。

Team 负责多专家协同，但第一版不让 Team 失控地自由执行写操作。

## 专业 Agent 矩阵

| Agent | 职责 | 输入 | 输出 | 工具 | 记忆 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| Listing 优化 Agent | 优化商品标题、描述、标签、SEO | 商品数据、店铺规则、关键词 | ListingSuggestion | 商品读取、关键词工具 | shop_memory、agent_memory | 中 |
| SEO Agent | 关键词、搜索意图、SEO 字段 | 商品、关键词、竞品摘要 | SEO 建议 | 关键词查询、商品读取 | shop_memory | 中 |
| Copywriting Agent | 文案表达、卖点、品牌语气 | 商品信息、品牌规则 | 标题和描述建议 | 无或只读工具 | shop_memory | 低 |
| Compliance Agent | 平台规则和风险检查 | 待写回内容、平台规则 | 风险报告 | 规则知识库 | knowledge | 高 |
| 店铺数据分析 Agent | 分析销售、转化、订单、库存 | 店铺数据 | 诊断报告 | Shopify read、Sheets read | shop_memory | 低 |
| 客服回复 Agent | 生成客户回复草稿 | 订单、客户消息、店铺规则 | 回复草稿 | 订单读取、知识库 | user_memory、shop_memory | 中 |
| 竞品分析 Agent | 分析竞品 Listing 和价格 | 商品、竞品数据 | 竞品洞察 | 竞品数据工具 | agent_memory | 中 |
| 广告分析 Agent | 分析广告表现和预算建议 | 广告数据、商品数据 | 广告建议 | Ads read | shop_memory | 高 |
| 库存风险 Agent | 发现断货和滞销风险 | 库存、订单、采购周期 | 风险提示 | 库存 read | shop_memory | 中 |

## Team 矩阵

| Team | 成员 | 模式 | 适合任务 | 第一阶段 |
| --- | --- | --- | --- | --- |
| Listing Review Team | SEO Agent、Copywriting Agent、Compliance Agent | coordinate / broadcast | 多角度评审 Listing 优化方案 | 必测 |
| Store Diagnosis Team | 店铺数据分析 Agent、Listing Agent、库存风险 Agent | coordinate | 店铺体检、增长建议 | 轻测 |
| Customer Support Team | 客服回复 Agent、订单 Agent、规则 Agent | route / coordinate | 售后回复草稿 | 后置 |
| Growth Team | Listing Agent、广告分析 Agent、竞品分析 Agent | tasks / coordinate | 增长计划 | 后置 |

## Workflow 矩阵

| Workflow | 步骤 | Agent/Team | Tool | Approval | 第一阶段 |
| --- | --- | --- | --- | --- | --- |
| Listing 优化并写回 Shopify | 读取商品 -> 分析 -> 生成建议 -> 合规检查 -> diff -> 审批 -> 写回 | Listing Agent、Listing Review Team | Shopify read/write | 必须 | 主线 |
| 店铺数据日报 | 读取数据 -> 分析 -> 生成日报 | 店铺数据分析 Agent | Shopify read、Sheets read | 不需要 | 轻测 |
| 客服回复草稿 | 读取订单和消息 -> 生成回复 -> 人工确认 | 客服回复 Agent | Shopify read | 发送消息需审批 | 后置 |
| 广告预算建议 | 读取广告数据 -> 分析 -> 建议预算 | 广告分析 Agent | Ads read/write | 写预算必须审批 | 后置 |
| 库存风险提示 | 读取库存和销量 -> 预测风险 -> 提醒 | 库存风险 Agent | Inventory read | 不需要 | 后置 |

## MVP 主流程拆解

第一阶段主流程固定为：

```text
Shopify Product Read Tool
        |
Listing Optimization Agent
        |
Listing Review Team
        |
Listing Diff Builder
        |
Approval Step
        |
Shopify Product Write Tool
        |
Audit Log
        |
Memory Candidate
```

## Agent 协同数据对象

### ProductSnapshot

用于保存商品当前状态。

字段：

- product_id
- shop_id
- title
- description
- tags
- seo_title
- seo_description
- product_type
- vendor
- variants
- images
- updated_at

### ListingSuggestion

Agent 输出的优化建议。

字段：

- suggested_title
- suggested_description
- suggested_tags
- suggested_seo_title
- suggested_seo_description
- reasoning
- confidence
- risks

### ListingReviewResult

Team 或多个 Agent 的评审结果。

字段：

- seo_review
- copywriting_review
- compliance_review
- recommended_changes
- blocking_risks
- final_score

### ListingDiff

审批页面使用的变更前后对比。

字段：

- field
- before
- after
- reason
- risk_level

### ApprovalRequest

写操作审批对象。

字段：

- approval_id
- tenant_id
- shop_id
- agent_id
- workflow_run_id
- tool_name
- diff
- requested_by
- status

### WriteBackResult

写回结果。

字段：

- success
- provider
- external_id
- changed_fields
- error
- executed_at

## 必测协同问题

### 1. Team 是否真的必要

验证方式：

- 用单 Agent 生成 ListingSuggestion。
- 用三个 Agent 组成 Listing Review Team 生成 ListingReviewResult。
- 比较输出质量、可控性、耗时、成本。

判断：

- 如果 Team 可控且质量明显更高，Listing Review Team 进入 MVP。
- 如果 Team 不稳定，MVP 改成 Workflow 中顺序调用多个 Agent step。

### 2. coordinate 和 broadcast 哪个更适合评审

验证方式：

- 同一个商品分别用 coordinate 和 broadcast。
- 比较输出结构稳定性和可追踪性。

判断：

- broadcast 更适合并列评审。
- coordinate 更适合最终汇总。

### 3. Workflow 是否必须作为主路径

验证方式：

- 用单 Agent 自由完成完整任务。
- 用 Workflow 固定步骤完成完整任务。

判断：

- 涉及写回、审批、审计的任务必须走 Workflow。
- 单 Agent 只适合分析和建议。

### 4. Memory 该不该参与第一版

验证方式：

- 不使用 memory 跑 Listing 优化。
- 使用 shop_memory 注入店铺规则后再跑。

判断：

- 第一版允许读取确认过的 shop_memory。
- 第一版不允许 Agent 自动写入店铺规则。
- 自动写入只允许生成 memory candidate。

### 5. Tool 权限是否能完全收住

验证方式：

- Agent 尝试调用 read tool。
- Agent 尝试调用 write tool。
- write tool 必须被 approval 拦截。

判断：

- Tool Gateway 是必需层。
- Agent 不能直接拿 Nango connection。

## 第一阶段测试优先级

P0：

- 单 Agent 结构化输出。
- Workflow 调用 Agent。
- Workflow 暂停等待审批。
- Workflow 审批后继续。
- Tool Gateway mock。
- Team broadcast / coordinate。

P1：

- Team route / tasks。
- shared session。
- memory candidate。
- trace / metrics。

P2：

- 前端 streaming。
- 多租户轻模型。
- Nango Shopify 真实连接。

## 第一版产品取舍

进入 MVP：

- Listing 优化 Agent。
- Listing Review Team，前提是测试稳定。
- Listing 优化 Workflow。
- Shopify read/write tool。
- Approval。
- Audit log。
- memory candidate。

不进入 MVP：

- 完整 Agent Builder。
- 多 Team 管理。
- 自动广告预算调整。
- 自动客服发送。
- 批量商品更新。
- 多平台同时接入。

## 结论

第一阶段验证的主问题是：Agno 的 Agent 协同能力能不能支撑跨境电商可销售业务流程。

前端、多租户、Nango 都重要，但它们不是第一风险。第一风险是 Agent / Team / Workflow / Tool / Approval 能不能形成稳定、可控、可追踪的协同系统。

