# 跨境电商 Agent 平台立项架构决策

本文是项目立项架构基线。目标是把前端、Agent 平台、第三方授权、权限、记忆、审批、数据存储等关键选择全部确定下来，后续讨论和实现都以本文为准。

## 项目定位

本项目只做跨境电商垂类 Agent 平台，不做通用 Agent 平台。

平台面向跨境电商团队，提供可连接店铺和外部系统、可运行专业 Agent、可执行标准业务流程、可控制记忆和权限、可审批高风险操作的业务工作台。

第一阶段不做开放式 Agent Marketplace，不做任意用户自由搭建复杂 Agent 图谱，不做通用办公 Agent 平台。

## 最终确定的技术架构

```text
Next.js 前端工作台
        |
FastAPI 业务后端
        |
业务权限 / 租户 / Agent 配置 / 记忆策略 / 审批策略
        |
Agno Runtime Module
        |
Agent / Team / Workflow / Tools / Memory / Knowledge
        |
Nango Connector Service
        |
Shopify / Amazon / TikTok Shop / ERP / Ads / WMS / Google Sheets
```

## 技术选型决策

### 前端

确定使用：

- Next.js
- React
- Vercel AI SDK
- shadcn/ui
- Tailwind CSS

前端定位为业务工作台，不是纯聊天页面。

Vercel AI SDK 只负责对话 UI、流式响应、消息状态和前端交互体验，不负责 Agent 权限、工具权限、记忆策略、Nango token 或业务决策。

### 业务后端

确定使用：

- FastAPI
- Python
- Postgres
- SQLAlchemy 2.0 ORM
- Alembic

业务后端是系统主控层，负责：

- tenant
- workspace
- shop
- user
- role
- agent_config
- workflow_config
- tool_permission
- connector 映射
- memory_policy
- approval_policy
- audit_log
- billing 预留

所有权限判断必须发生在业务后端，不能只依赖前端隐藏按钮。

### Agent Runtime

确定使用：

- Agno

Agno 负责：

- Agent runtime
- Team runtime
- Workflow runtime
- Tools
- Memory
- Knowledge
- Approval / HITL
- Session
- Trace
- Metrics

Agno 不直接作为最终业务后端暴露给前端。前端只访问我们的 FastAPI 业务后端。第一版 Agno 作为 FastAPI 内部 runtime module 被业务后端封装调用。

这样做的原因是：Agno 是 Agent 平台内核，但我们的产品还需要跨境电商租户、店铺、权限、审批、连接、计费等业务模型。

### 第三方 Auth / Connector

确定使用：

- Nango

Nango 只负责第三方平台连接：

- OAuth 授权
- access token 存储
- refresh token 刷新
- connection_id 管理
- provider API 连接
- webhook / sync 能力第二阶段启用

Nango 不负责：

- Agent 记忆
- Agent 配置
- 租户权限
- 工具权限
- 审批策略
- 业务审计
- Agent 优化和迭代

这些全部由我们的业务后端和 Agno runtime 负责。

### 主数据库

确定使用：

- Postgres

Postgres 保存项目主数据：

- 租户
- 工作区
- 店铺
- 用户
- 角色
- Agent 配置
- Workflow 配置
- 第三方连接映射
- 工具权限
- 记忆策略
- 审批策略
- 审计日志
- 任务运行记录

第一版 Agno 的 session、memory、knowledge metadata、approval、trace 等统一放在同一个 Postgres 实例，并通过业务层建立 tenant / workspace / shop / agent 的映射关系。

### 向量库

确定第一版使用：

- pgvector

第一版不引入独立向量数据库。原因是系统复杂度要压住，Postgres + pgvector 已经足够支撑早期知识库和 RAG。

后期只有在数据量、检索性能或多租户隔离压力明显上来后，再考虑 Qdrant 或 Weaviate。

### 登录 Auth

确定第一版使用：

- Clerk

Clerk 负责用户登录、组织成员基础身份、session token。

业务后端仍然保存自己的用户、租户、角色和权限表。Clerk 是身份入口，不是完整业务权限系统。

如果后期需要完全自托管，再迁移到 Better Auth，但第一版不选 Better Auth，避免把时间花在认证基础设施上。

### 队列和后台任务

第一版确定不引入复杂队列。

第一版使用：

- FastAPI BackgroundTasks
- Agno background run
- Postgres 状态表

第二阶段引入：

- Redis
- Dramatiq

引入队列的触发条件：

- 长任务明显变多。
- 需要可靠重试。
- 需要任务优先级。
- 需要多 worker 横向扩展。
- webhook / sync 压力上来。

### 文件和知识库存储

第一版确定使用：

- Cloudflare R2

本地开发使用本地文件存储，线上使用 Cloudflare R2。

知识库元数据放 Postgres，向量放 pgvector，原文件放对象存储。

## 前端产品结构

第一版前端只做业务必需页面。

### 1. 工作台 Chat

这是第一版核心页面。

布局确定为三栏：

```text
左侧：Agent / Workflow / 店铺上下文
中间：对话与任务执行流
右侧：工具调用 / 审批 / 商品 / 订单 / 记忆 / 运行详情
```

必须支持：

- 流式输出。
- 工具调用状态。
- 工具调用结果展示。
- 人工确认按钮。
- 当前店铺上下文。
- 当前 Agent 或 Workflow。
- 运行错误展示。
- 运行历史。

### 2. 连接管理

负责管理第三方平台连接。

第一版支持：

- Shopify
- Google Sheets

后续再加：

- Amazon
- TikTok Shop
- Meta Ads
- Google Ads
- ERP
- WMS

连接管理页面展示：

- provider
- connection status
- connected account
- shop mapping
- last sync time
- reconnect
- disconnect

### 3. Agent 管理

第一版不做自由拖拽 Agent Builder。

确定采用「模板化 Agent 配置」：

- 选择 Agent 模板。
- 选择店铺连接。
- 选择工具权限。
- 选择知识库。
- 选择记忆策略。
- 选择审批策略。
- 填写业务偏好。

第一批 Agent 模板：

- Listing 优化 Agent
- 店铺数据分析 Agent
- 客服回复 Agent

### 4. Workflow 管理

第一版 Workflow 隐藏在模板任务里，不做复杂管理 UI。

第一批 Workflow：

- Listing 优化并写回 Shopify
- 店铺数据日报

### 5. 审批中心

所有高风险写操作都必须进入审批中心。

第一版高风险操作包括：

- 修改商品标题。
- 修改商品描述。
- 修改商品价格。
- 修改库存。
- 批量更新商品。
- 发送客户消息。
- 修改广告预算。

第一版必须支持：

- 查看待审批动作。
- 查看 Agent 给出的理由。
- 查看变更前后对比。
- 通过。
- 拒绝。
- 通过后继续执行。

### 6. 记忆中心

第一版做轻量版本。

必须支持：

- 查看 Agent 已保存记忆。
- 删除记忆。
- 禁用记忆。
- 标记记忆作用范围。

后续再支持复杂记忆审核流。

## Agent 平台结构

### Agent

Agent 是专业工作者，不是万能助手。

第一批 Agent：

- Listing 优化 Agent
- 店铺数据分析 Agent
- 客服回复 Agent

每个 Agent 必须有：

- 固定业务职责。
- 明确可用工具。
- 明确可读数据范围。
- 明确可写数据范围。
- 明确记忆策略。
- 明确审批策略。
- 明确输出结构。

### Team

第一版不优先做复杂 Team。

Team 作为第二阶段能力，用于多 Agent 协作。

第一阶段预留 Team 概念，但不把它作为 MVP 主路径。

### Workflow

Workflow 是商业化能力的核心。

第一版先做两个 Workflow：

1. Listing 优化并写回 Shopify。
2. 店铺数据日报。

以后可扩展：

- 广告预算优化。
- 差评处理。
- 断货预警。
- 利润复盘。
- 竞品监控。

### Tools

所有外部平台操作必须工具化。

工具分为三类：

- read 工具：读取商品、订单、库存、广告、报表。
- suggest 工具：生成建议，不改变外部系统。
- write 工具：修改外部系统，必须走权限和审批。

工具调用必须经过业务后端权限检查。

Agent 不能直接绕过业务权限调用 Nango。

## 第三方连接流程

### 授权流程

```text
用户在前端点击连接 Shopify
        |
前端请求 FastAPI
        |
FastAPI 创建 Nango 授权请求
        |
用户完成 OAuth
        |
Nango 保存 token
        |
FastAPI 保存 tenant / workspace / shop / provider / connection_id 映射
```

### 工具执行流程

```text
Agent 请求调用 shopify_update_product
        |
Agno Tool 进入业务工具网关
        |
业务后端检查 tenant / user / agent / tool / shop 权限
        |
如果是写操作，创建审批或校验审批结果
        |
通过 connection_id 调用 Nango
        |
Nango 获取 token 并访问 Shopify
        |
结果返回 Agent
        |
业务后端写 audit_log
```

## 权限架构

权限分四层。

### 1. 身份层

Clerk 负责用户身份。

### 2. SaaS 业务权限

业务后端负责：

- tenant
- workspace
- shop
- role
- member

第一版角色：

- owner
- admin
- operator
- viewer

### 3. Agent 权限

控制：

- 谁能查看 Agent。
- 谁能运行 Agent。
- 谁能配置 Agent。
- Agent 能访问哪些店铺。
- Agent 能访问哪些知识库。

### 4. Tool 权限

控制：

- Agent 能调用哪些工具。
- 工具是 read 还是 write。
- 是否需要审批。
- 是否允许批量操作。
- 是否有金额、数量、范围限制。

## 记忆架构

记忆不允许无控制地自动沉淀。

第一版记忆分四类：

- user_memory：用户偏好。
- shop_memory：店铺事实和运营规则。
- agent_memory：某个 Agent 的工作经验。
- workflow_memory：某个流程的历史偏好和参数。

第一版记忆写入策略：

- 普通偏好可以自动写入。
- 店铺规则必须用户确认后写入。
- 涉及价格、广告预算、客户沟通规则的记忆必须确认。
- 凭证、token、支付信息、隐私数据禁止写入。

## 审批架构

写操作默认需要审批。

第一版审批策略：

- 所有外部系统 write 工具都需要审批。
- read 工具不需要审批。
- suggest 工具不需要审批。
- 通过审批后才能继续执行。
- 拒绝审批后 run 结束或回到 Agent 修改建议。

后续可以按租户配置自动审批规则，但第一版不做。

## MVP 闭环

第一版只做一个主闭环：

```text
用户登录
        |
连接 Shopify
        |
创建或启用 Listing 优化 Agent
        |
选择一个 Shopify 商品
        |
Agent 读取商品信息
        |
Agent 生成标题、描述、关键词优化建议
        |
用户审批
        |
Agent 写回 Shopify
        |
系统记录审计日志
        |
系统沉淀可确认记忆
```

第二个轻量闭环：

```text
连接 Shopify
        |
店铺数据分析 Agent 读取数据
        |
生成日报
        |
输出问题、机会、建议动作
```

## 第一阶段不做的事情

第一阶段明确不做：

- 通用 Agent Marketplace。
- 自由拖拽式 Agent Builder。
- 完整多 Agent Team 编排 UI。
- 复杂队列系统。
- 独立向量数据库。
- 自建完整登录系统。
- 复杂计费系统。
- 大量第三方平台同时接入。
- 自动执行高风险写操作。
- 让 Agent 直接管理 Nango token。

## 代码和服务拆分

第一版采用单仓多模块，不拆独立微服务。

确定目录：

```text
/apps/web              Next.js 前端
/apps/api              FastAPI 业务后端
/packages/agent        Agno Agent / Workflow / Toolkits
/packages/db           数据模型和 migration
/packages/connectors   Nango provider 封装
/docs                  架构和任务文档
```

当前正式开发仓库为 `/Users/ske/PrimeAgent`，先在仓库内完成设计文档，MVP 任务文档确定后初始化 monorepo 项目结构。

## 最佳最快实践

最快路径确定为：

1. 先做 Shopify。
2. 先做 Listing 优化。
3. 先做一个 Agent。
4. 先做一个 Workflow。
5. 先做 read + suggest + approval + write-back 闭环。
6. 先用 Postgres + pgvector。
7. 先用 Clerk。
8. 先用 Nango。
9. 先用 Vercel AI SDK 做 Chat 工作台。
10. 后端先 FastAPI 单体，内部封装 Agno，不急着拆微服务。

## 立项结论

本项目确定采用：

- 前端：Next.js + Vercel AI SDK + shadcn/ui。
- 后端：FastAPI。
- Agent runtime：Agno。
- 第三方连接：Nango。
- 登录身份：Clerk。
- 主数据库：Postgres。
- 向量库：pgvector。
- 文件存储：Cloudflare R2。
- 第一平台连接：Shopify。
- 第一核心 Agent：Listing 优化 Agent。
- 第一核心 Workflow：Listing 优化并写回 Shopify。

项目第一阶段的目标不是把平台功能铺满，而是打通一个可演示、可销售、可继续扩展的跨境电商 Agent 工作闭环。
