# 跨境电商垂类 Agent 平台设计草案

## 目标

做一个面向跨境电商团队的商业化 Agent 平台。平台不是单一聊天机器人，而是一套可多租户使用、可创建专业 Agent、可连接外部系统、可控制记忆和权限的 Agent 工作框架。

核心组合：

- Agno：后端 Agent 平台与多 Agent 编排
- Nango：OAuth 授权、token 存储、token 刷新、外部 SaaS API 连接
- Next.js / React：前端应用
- Vercel AI SDK / AI Elements：对话流、消息展示、tool call 展示
- Postgres：租户、用户、Agent、权限、记忆、审计、连接映射等业务数据

## 产品定位

服务对象：

- 跨境电商卖家
- 运营团队
- 品牌方
- 代运营公司
- 小型出海团队

平台要解决的问题：

- 团队里不同岗位需要不同类型的 AI 助手
- 每个客户/店铺/品牌的数据必须隔离
- Agent 需要接入 Shopify、Amazon、TikTok Shop、Google Sheets、Gmail、Slack、广告平台、ERP 等系统
- 普通成员不能随便污染共享知识库
- 高风险操作需要人工确认
- Agent 需要沉淀长期经验，而不是每次从零开始

## 总体架构

```text
Frontend
  ├─ Chat UI
  ├─ Agent 管理
  ├─ 租户/团队管理
  ├─ 连接管理
  ├─ 记忆审核
  └─ 权限配置

Backend
  ├─ Agno Agent Runtime
  ├─ Orchestrator Agent
  ├─ Specialist Agents
  ├─ Tool Registry
  ├─ Permission Policy
  ├─ Memory / Knowledge
  ├─ Human Approval
  └─ Audit Log

Integration
  └─ Nango
      ├─ OAuth
      ├─ token refresh
      ├─ provider connection
      └─ API proxy / token access

Database
  ├─ tenants
  ├─ users
  ├─ memberships
  ├─ agents
  ├─ agent_versions
  ├─ tools
  ├─ memories
  ├─ memory_review_queue
  ├─ nango_connections
  ├─ approval_requests
  └─ audit_logs
```

## Agent 设计

平台里应该有一个总控 Agent 和多个专业 Agent。

### Orchestrator Agent

用户默认对话的入口。

职责：

- 理解用户意图
- 判断需要调用哪些专业 Agent
- 拆解任务
- 控制执行顺序
- 汇总结果
- 判断是否需要人工确认

示例：

```text
用户：帮我看一下 SKU A100 最近为什么转化下降

Orchestrator:
1. 调用 Sales Agent 看销售趋势
2. 调用 Ads Agent 看广告数据
3. 调用 Review Agent 看近期差评
4. 调用 Competitor Agent 看竞品变化
5. 汇总诊断报告
6. 如建议修改 listing 或广告预算，进入人工确认
```

### Specialist Agents

初期可以设计以下 Agent：

- Listing Agent：标题、五点、描述、关键词、SEO 优化
- Review Agent：评论分析、差评归因、客服话术
- Ads Agent：广告表现分析、预算建议、ACOS/ROAS 诊断
- Inventory Agent：库存、补货、断货风险、采购周期
- Competitor Agent：竞品价格、卖点、评论、Listing 对比
- Product Research Agent：选品、趋势、机会点分析
- Customer Support Agent：邮件、站内信、售后回复
- Operations Report Agent：日报、周报、月报、经营总结

## 多租户模型

租户可以对应：

- 一个公司
- 一个品牌
- 一个店铺组
- 一个代运营客户

基础模型：

```text
Tenant
  id
  name
  plan
  settings

User
  id
  email
  name

Membership
  tenant_id
  user_id
  role
```

建议角色：

- owner：租户所有者
- admin：成员、连接、权限、记忆审核
- builder：创建和编辑 Agent
- operator：使用 Agent，提交业务操作
- viewer：只读使用

## 权限模型

权限必须在后端判断，不能只依赖前端隐藏按钮。

需要控制的对象：

- 谁能创建 Agent
- 谁能修改 Agent prompt / tools
- 谁能调用某个 Agent
- 谁能使用外部连接
- 谁能执行写操作
- 谁能批准记忆进入共享知识库
- 谁能批准高风险业务动作

高风险动作示例：

- 修改商品 Listing
- 修改广告预算
- 批量发送客户邮件
- 删除商品
- 修改价格
- 创建促销活动

这些动作默认需要 human approval。

## 记忆与知识库

记忆需要分层，避免普通成员把共享 Agent 教坏。

建议分层：

```text
tenant shared memory
  租户级共享知识，审核后进入

agent shared memory
  某个 Agent 的长期业务经验，审核后进入

user private memory
  某个用户自己的偏好和工作习惯

session scratch memory
  当前任务临时上下文，用完可丢
```

共享记忆写入流程：

```text
Agent 发现可沉淀经验
  -> 写入 memory_review_queue
  -> admin/builder 审核
  -> approved 后进入共享记忆
  -> rejected 则不进入检索
```

## Nango 集成方式

Nango 只负责外部账号授权和 token。

平台负责：

- 租户权限
- Agent 权限
- tool 调用策略
- API 请求参数校验
- 操作审计
- 人工确认

调用流程：

```text
Agent 需要调用 Shopify/Amazon/Google 等 API
  -> 后端检查 tenant_id / user_id / role
  -> 检查 Agent 是否允许使用该 tool
  -> 根据 tenant_id 找 Nango connection
  -> 通过 Nango 获取 token 或 proxy API
  -> 调 provider API
  -> 返回结构化结果给 Agent
  -> 写入 audit log
```

## 前端方向

前端可以基于 Next.js + Vercel AI SDK 做。

对话界面需要支持：

- 流式输出
- tool call 展示
- 多 Agent 执行时间线
- 人工确认卡片
- 引用数据来源
- 任务状态
- 报告/表格/建议侧栏

管理界面需要支持：

- Agent 列表
- 创建/编辑 Agent
- Agent 版本管理
- 工具权限配置
- 团队成员与角色
- Nango 连接状态
- 记忆审核队列
- 审计日志

Vercel AI SDK 适合做聊天展示和 streaming，但不能负责真正权限。权限、记忆写入、Nango 连接使用，都必须在后端控制。

## MVP 范围

第一阶段不要做太大，先做一个可跑通的闭环。

建议 MVP：

1. 单租户或弱多租户结构先跑通
2. 用户登录和 tenant 上下文
3. Orchestrator Agent
4. 两个专业 Agent：Listing Agent + Review Agent
5. Nango 接一个简单 provider，例如 Google Sheets 或 Shopify
6. Agent 可以读取数据并生成建议
7. 写操作全部进入人工确认
8. 共享记忆必须审核后进入
9. 前端有基础聊天页和 Agent 管理页

## 后续任务文档拆分

后面可以继续拆这些 MD：

- `tasks/01-platform-architecture.md`
- `tasks/02-agent-model.md`
- `tasks/03-tenant-rbac.md`
- `tasks/04-memory-review.md`
- `tasks/05-nango-integration.md`
- `tasks/06-chat-frontend.md`
- `tasks/07-cross-border-tools.md`
- `tasks/08-mvp-roadmap.md`

## 当前判断

Agno + Nango + Next.js/Vercel AI SDK 是适合这个方向的组合。

核心原则：

- 不做一个万能 Agent，要做专业 Agent 体系
- 不让前端承担权限判断
- 不让 Nango 承担业务逻辑
- 不让共享记忆自动污染
- 高风险操作默认人工确认
- 先做一个垂直闭环，再扩展更多平台和 Agent
