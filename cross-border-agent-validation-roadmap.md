# 跨境电商 Agent 平台技术验证与 PRD 拆解路线

本文用于指导后续所有子任务研究、源码阅读、技术验证和 PRD 汇总。目标是把架构从“认可方向”推进到“确认可实现、知道怎么实现、能直接指导编码”的状态。

## 总目标

我们要做的是跨境电商垂类 Agent 平台，不是通用 Agent 平台。

最终文档体系要回答三个问题：

1. 产品到底是什么。
2. 技术架构到底怎么落地。
3. 每个关键链路是否已经通过源码和原型验证。

最终 PRD 不能只写愿景，要包含真实技术细节：

- 前端页面怎么组织。
- 对话流怎么走。
- Agent run 怎么触发。
- Tool call 怎么被权限拦截。
- Nango connection 怎么被使用。
- Shopify 写回怎么审批。
- 记忆怎么写入和管理。
- 数据库核心表怎么设计。
- 哪些事情第一版做，哪些事情第二阶段做。

## 总体拆解原则

采用“总分总”的方式。

第一层：总架构。

- 确认项目定位。
- 确认技术栈。
- 确认 MVP 闭环。
- 确认系统边界。

第二层：分专题验证。

- Agno runtime。
- Agent 协同能力。
- Team 协作模式。
- Workflow 编排。
- Agent / Team / Workflow 迭代优化。
- Agent / Team / Workflow 之间的状态、记忆、工具、审批传递。
- 前端工作台轻 MVP。
- Nango connector。
- 业务后端。
- Shopify MVP。
- 权限和审批。
- 记忆和知识库。
- 数据模型。
- 部署和工程结构。

第三层：总 PRD 汇总。

- 把所有验证结论收敛到一份最终 PRD。
- PRD 中只保留已经验证可行或明确接受风险的方案。
- 所有不确定项必须有验证结论、替代方案或明确延期。

## 当前架构基线

架构基线文档：

`/Users/ske/PrimeAgent/cross-border-agent-architecture-decision.md`

当前确定：

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

后续所有研究都围绕这个基线验证，不再展开泛化选型。

## 验证方法

每个专题都按同一套方法推进。

### 1. 读源码

必须读真实源码或官方 SDK 源码，不只看 README。

当前本地已有：

- Agno：`/Users/ske/agent/agno`
- Nango：`/Users/ske/agent/nango`

Vercel AI SDK 当前本地没有源码目录，后续验证时需要通过以下方式之一获取：

- 在项目初始化后查看 `node_modules/ai`。
- 单独拉取 Vercel AI SDK 仓库。
- 读取官方包源码和 examples。

### 2. 对照业务场景

源码阅读不能泛泛地读。必须对照跨境电商 MVP 场景：

```text
用户登录
        |
连接 Shopify
        |
选择商品
        |
Listing 优化 Agent 读取商品
        |
生成优化建议
        |
用户审批
        |
写回 Shopify
        |
记录审计和记忆
```

所有验证都问一句：它能不能支持这个链路。

### 3. 写技术结论

每个子任务 md 必须包含：

- 研究目标。
- 读了哪些源码。
- 关键源码路径。
- 可行性结论。
- 推荐实现方式。
- 风险点。
- 第一版取舍。
- 后续实现任务。

### 4. 做最小原型

能用代码验证的，不只停留在文字。

第一阶段原型优先级：

- Agno Agent run 原型。
- Agno Team 协同原型。
- Agno Workflow 编排原型。
- Agent / Team / Workflow 混合调用原型。
- Agno tool approval 原型。
- Agno memory / session / state 传递原型。
- Nango Shopify connection 原型。
- Shopify read product / update product 原型。
- Vercel AI SDK 流式对话轻原型。
- FastAPI SSE / streaming 转发轻原型。

## 子任务文档清单

后续建议按下面顺序创建和研究。当前阶段优先围绕 Agent 协同能力验证，前端、多租户、部署先做轻量 MVP 级别验证。

## 00. Agno Agent 协同主验证计划

目标文档：

`/Users/ske/PrimeAgent/tasks/00-Agno-Agent协同主验证计划.md`

要回答的问题：

- Agno 是否能支撑跨境电商业务中的多个专业 Agent 协同。
- Agent、Team、Workflow 各自应该承担什么职责。
- 哪些协同能力可以直接用 Agno，哪些需要我们业务层补。
- Listing 优化、店铺诊断、客服回复、广告分析这些场景怎么拆成 Agent / Team / Workflow。
- 协同过程中的状态、记忆、工具权限、审批和审计怎么串起来。

必须阅读：

- Agno Agent。
- Agno Team。
- Agno Team mode。
- Agno Workflow。
- Agno Step。
- Agno Run / Session。
- Agno Memory。
- Agno Tools。
- Agno Approval。

必须测试：

- 单 Agent 执行。
- Team route。
- Team coordinate。
- Team broadcast。
- Team tasks。
- Workflow 顺序执行。
- Workflow 条件执行。
- Workflow 中调用 Agent。
- Workflow 中调用 Team。
- Tool 需要审批时暂停并恢复。
- 多 Agent 共享同一个 session / state / memory 的边界。
- Agent 之间传递结构化结果。
- Agent 调用业务工具网关。

第一版结论方向：

- Agent 是专业角色。
- Team 是多专家协作容器。
- Workflow 是可销售业务流程。
- Tool Gateway 是外部动作边界。
- Approval 是所有写操作的安全阀。
- Memory 和 state 必须显式控制，不能默认全局共享。

## 00A. 跨境电商 Agent 协同场景矩阵

目标文档：

`/Users/ske/PrimeAgent/tasks/00A-跨境电商Agent协同场景矩阵.md`

要回答的问题：

- 跨境电商平台第一阶段需要哪些专业 Agent。
- 每个 Agent 的输入、输出、工具、记忆、知识库、风险等级是什么。
- 哪些任务适合单 Agent。
- 哪些任务适合 Team。
- 哪些任务必须做成 Workflow。

第一批场景：

- Listing 优化。
- 店铺数据诊断。
- 客服回复草稿。
- 竞品分析。
- 广告预算建议。
- 库存风险提示。

第一版结论方向：

- MVP 主线仍然是 Listing 优化并写回 Shopify。
- 其他场景先用于验证协同抽象，不进入第一版完整产品。

## 00B. Agent / Team / Workflow 迭代优化机制

目标文档：

`/Users/ske/PrimeAgent/tasks/00B-Agent-Team-Workflow迭代优化机制.md`

要回答的问题：

- Agent 如何基于运行结果、用户反馈和失败案例迭代。
- Team 如何优化成员、模式、路由和汇总策略。
- Workflow 如何优化 step 顺序、审批策略、retry 和错误处理。
- 如何做 AgentVersion / TeamVersion / WorkflowVersion。
- 每次 run 如何绑定版本，保证可复现和可回滚。
- Agno 的 learn / eval / tracing / metrics 能提供哪些能力。
- 哪些优化第一版必须人工确认，哪些第二阶段可以半自动。

必须阅读：

- Agno learn。
- Agno eval。
- Agno tracing。
- Agno metrics。
- Agno session / run。
- Agno component configs。

必须测试：

- 不同 Agent 版本跑同一批案例。
- Workflow 版本绑定 AgentVersion。
- TeamVersion 锁定成员 AgentVersion。
- 用户反馈和审批拒绝如何形成优化候选。
- 失败案例如何回放。

第一版结论方向：

- MVP 必须有版本管理和回滚。
- MVP 不做自动优化发布。
- Optimization Agent 只能生成建议，不能直接修改 active 配置。
- 每次 run 必须绑定版本和 trace。

## 01. 前端工作台与 Vercel AI SDK 验证

目标文档：

`/Users/ske/PrimeAgent/tasks/01-前端工作台与VercelAI-SDK验证.md`

要回答的问题：

- Vercel AI SDK 是否适合做我们的 Chat 工作台。
- 如何展示 streaming message。
- 如何展示 tool call 状态。
- 如何展示 approval pending。
- 如何和 FastAPI 后端对接。
- 前端是否直接连 Agno，结论必须是否定：前端只连业务后端。

必须阅读：

- Vercel AI SDK core package。
- React hooks。
- streaming protocol。
- tool call message structure。
- examples 中的 chat、tool calling、structured output 相关实现。

验证点：

- Next.js 页面能否接收 FastAPI 返回的流式响应。
- Vercel AI SDK 是否必须使用自己的后端 route。
- 如果使用 FastAPI，前端如何适配。
- 工具调用和审批状态如何作为 message part 展示。

第一版结论方向：

- Vercel AI SDK 负责前端消息状态和流式 UI。
- FastAPI 负责业务 API 和 Agent run。
- 前端封装一个适配层，把 FastAPI SSE / event stream 转换为工作台消息。

## 02. Agno Runtime 验证

目标文档：

`/Users/ske/PrimeAgent/tasks/02-Agno运行时可行性验证.md`

要回答的问题：

- Agno Agent 如何创建和运行。
- Agno Workflow 如何表达 Listing 优化并写回 Shopify。
- Agno Tool 如何封装 Nango / Shopify 调用。
- Agno approval 如何支持人工确认。
- Agno memory 是否适合作为第一版记忆底座。
- Agno session、trace、approval 如何落到 Postgres。

必须阅读：

- `/Users/ske/agent/agno/libs/agno/agno/agent`
- `/Users/ske/agent/agno/libs/agno/agno/workflow`
- `/Users/ske/agent/agno/libs/agno/agno/tools`
- `/Users/ske/agent/agno/libs/agno/agno/approval`
- `/Users/ske/agent/agno/libs/agno/agno/memory`
- `/Users/ske/agent/agno/libs/agno/agno/knowledge`
- `/Users/ske/agent/agno/libs/agno/agno/db`
- `/Users/ske/agent/agno/libs/agno/agno/os`

验证点：

- Agent 是否能在 FastAPI 内部被调用。
- Tool 是否能挂业务权限网关。
- approval 是否能暂停 run 并继续。
- background run 是否适合长任务。
- Workflow step 是否适合 read / suggest / approval / write-back。
- Agno DB 表是否能放进同一个 Postgres。

第一版结论方向：

- Agno 作为 FastAPI 内部 runtime module。
- 不直接暴露 AgentOS 给前端。
- Workflow 是商业任务主路径。
- Agent 是专业工作者。
- Tool 是外部系统操作边界。

## 03. Nango Connector 与 Shopify 验证

目标文档：

`/Users/ske/PrimeAgent/tasks/03-Nango-Shopify连接可行性验证.md`

要回答的问题：

- Nango 如何创建 Shopify 授权连接。
- connection_id 如何和 tenant / workspace / shop 绑定。
- 后端如何通过 Nango 获取 token 或 proxy 调用 Shopify。
- Nango webhook / sync 第一版是否需要。
- Nango 本地部署和云服务边界是什么。

必须阅读：

- `/Users/ske/agent/nango` 的 app、server、packages 结构。
- Nango provider 配置。
- OAuth connection 相关代码。
- token refresh 相关代码。
- proxy / API call 相关代码。
- sync / webhook 相关代码，只做第二阶段判断。

验证点：

- 能否完成 Shopify OAuth。
- 能否拿到稳定 connection_id。
- 能否通过 connection_id 调用 Shopify API。
- token refresh 是否由 Nango 托管。
- 业务后端是否完全不接触 refresh token。

第一版结论方向：

- Nango 只做第三方连接层。
- 业务库保存 provider + connection_id + shop mapping。
- Agent Tool 通过业务后端工具网关间接调用 Nango。
- 第一版不启用复杂 sync，先走按需 read/write API。

## 04. 业务后端与 API 边界设计

目标文档：

`/Users/ske/PrimeAgent/tasks/04-FastAPI业务API边界设计.md`

要回答的问题：

- 前端调用哪些 API。
- FastAPI 如何封装 Agno。
- FastAPI 如何封装 Nango。
- 工具权限在哪里判断。
- 审批在哪里创建和继续。
- 审计日志在哪里写入。

必须设计：

- `/api/chat/runs`
- `/api/chat/runs/{run_id}/resume`
- `/api/connectors`
- `/api/connectors/shopify/start`
- `/api/agents`
- `/api/workflows`
- `/api/approvals`
- `/api/memories`
- `/api/products`

验证点：

- 前端不直接接触 Agno。
- 前端不直接接触 Nango token。
- Agent 不绕过业务权限调用工具。
- 所有外部写操作都能被审批拦截。

第一版结论方向：

- FastAPI 是唯一业务入口。
- Agno 和 Nango 都是后端内部能力。
- 前端只拿业务态数据。

## 05. 数据模型与多租户隔离

目标文档：

`/Users/ske/PrimeAgent/tasks/05-领域模型与多租户隔离.md`

要回答的问题：

- tenant / workspace / shop 的关系是什么。
- user / role / member 怎么设计。
- agent_config 怎么保存。
- workflow_config 怎么保存。
- connector mapping 怎么保存。
- memory / approval / audit_log 怎么关联业务对象。

必须设计的核心表：

- tenants
- workspaces
- shops
- users
- memberships
- roles
- connectors
- agent_templates
- agent_instances
- workflow_templates
- workflow_runs
- tool_permissions
- approvals
- memories
- audit_logs
- products_snapshot

验证点：

- 一个租户多个店铺。
- 一个用户多个租户。
- 一个 Agent 绑定多个 shop 的权限。
- 一个 Nango connection 绑定一个外部账号或店铺。
- 所有 run、approval、memory、audit 都能追溯到 tenant / workspace / shop / user / agent。

第一版结论方向：

- Postgres 是主事实源。
- Agno 表和业务表通过 run_id / session_id / agent_id / user_id 做映射。
- 所有业务查询必须带 tenant_id。

## 06. 权限、工具网关与审批验证

目标文档：

`/Users/ske/PrimeAgent/tasks/06-权限工具网关与审批验证.md`

要回答的问题：

- role 权限怎么映射到 Agent 权限。
- Agent 权限怎么映射到 Tool 权限。
- read / suggest / write 工具怎么分类。
- 写操作怎么进入审批。
- 审批通过后如何继续 run。

必须验证：

- Agno tool 的 `requires_confirmation`。
- Agno approval decorator。
- Agno external execution。
- 自建 approval 表和 Agno approval 的关系。
- 拒绝审批后的 run 状态。

第一版结论方向：

- 所有 tool call 都经过业务工具网关。
- write tool 默认审批。
- approval 是业务对象，不只是一条 Agno 内部记录。
- 审批中心是第一版核心页面。

## 07. 记忆与知识库策略验证

目标文档：

`/Users/ske/PrimeAgent/tasks/07-记忆与知识库策略验证.md`

要回答的问题：

- Agno MemoryManager 能否满足第一版。
- 哪些记忆自动写入。
- 哪些记忆必须确认。
- 哪些内容禁止记忆。
- shop memory 和 user memory 如何隔离。
- 知识库如何按 tenant / shop / agent 隔离。

必须阅读：

- Agno memory manager。
- Agno memory strategies。
- Agno knowledge。
- Agno vector db adapter。

验证点：

- memory 是否能按 user_id / agent_id / team_id 查询。
- 是否需要自建 memory_policy 表。
- knowledge metadata 是否能做 tenant / shop / agent 过滤。
- pgvector 是否能支撑第一版知识检索。

第一版结论方向：

- 记忆必须产品化可见。
- 店铺规则记忆必须确认。
- token、凭证、支付、隐私禁止记忆。
- 知识库默认按 tenant + shop + agent scope 隔离。

## 08. Shopify Listing MVP 业务流程验证

目标文档：

`/Users/ske/PrimeAgent/tasks/08-Shopify-Listing优化MVP验证.md`

要回答的问题：

- Shopify 商品读取需要哪些字段。
- Listing 优化 Agent 输入是什么。
- Agent 输出结构是什么。
- 审批页面要展示哪些 diff。
- 写回 Shopify 的最小字段是什么。
- 审计日志记录什么。

必须验证：

- Shopify read product。
- Shopify update product。
- title / description / tags / SEO fields。
- 变更前后 diff。
- 写回失败重试和错误提示。

第一版结论方向：

- MVP 只改单个商品。
- MVP 只支持 title、description、tags、SEO title、SEO description。
- 不做批量更新。
- 不自动写回，必须审批。

## 09. 工程结构与部署验证

目标文档：

`/Users/ske/PrimeAgent/tasks/09-工程结构与部署验证.md`

要回答的问题：

- monorepo 怎么组织。
- 前端和后端如何本地启动。
- 环境变量怎么管理。
- 数据库 migration 怎么管理。
- Nango 本地和线上怎么部署。
- Cloudflare R2 怎么接。

确定目录：

```text
/apps/web
/apps/api
/packages/agent
/packages/db
/packages/connectors
/docs
```

验证点：

- 本地开发一条命令能启动前后端。
- FastAPI 能调用 Agno。
- Next.js 能消费 FastAPI streaming。
- Postgres migration 可重复执行。
- Nango connection 配置可在本地验证。

## 10. 最终 PRD 汇总

目标文档：

`/Users/ske/PrimeAgent/PRD/01-跨境电商Agent平台详细PRD.md`

PRD 必须包含：

- 项目定位。
- 用户画像。
- 第一版业务闭环。
- 页面结构。
- API 架构。
- Agent 架构。
- Workflow 架构。
- Tool 架构。
- Nango 架构。
- 数据模型。
- 权限模型。
- 记忆策略。
- 审批策略。
- MVP 范围。
- 非目标。
- 技术风险。
- 实施里程碑。

PRD 的规则：

- 不写空泛愿景。
- 不写未验证的技术承诺。
- 每个关键设计都能追溯到子任务 md。
- 每个第一版功能都能对应到实现任务。

## 验证优先级

优先级按能否证明 Agent 协同主能力排序，其次才是前端、多租户和部署。

第一优先级：

1. Agno 单 Agent run + tool call。
2. Agno Team route / coordinate / broadcast / tasks。
3. Agno Workflow 调用 Agent / Team / function。
4. Agent / Team / Workflow 的 session / state / memory 传递。
5. Tool approval 暂停和恢复。
6. 结构化输出在 Agent 之间传递。
7. 业务工具网关拦截 tool call。

第二优先级：

1. Nango Shopify connection。
2. Shopify read / update product。
3. FastAPI 对 Agno 的封装边界。
4. Vercel AI SDK + FastAPI streaming 轻 MVP。
5. 审计日志。

第三优先级：

1. 数据模型和多租户隔离。
2. 记忆策略产品化。
3. 知识库。
4. 多平台接入。
5. 自动 sync。
6. 队列系统。

## 阶段计划

### 阶段 0：文档和验证计划

产出：

- 架构决策文档。
- 本验证路线文档。
- 子任务 md 模板。

状态：

- 架构决策文档已完成。
- 本文档为验证路线文档。

### 阶段 1：Agent 协同核心能力验证

目标：

- 证明 Agno 可以支撑跨境电商平台的 Agent 协同、Team 协作、Workflow 编排、工具调用、审批暂停恢复和状态传递。

产出：

- 00 Agno Agent 协同主验证计划 md。
- 00A 跨境电商 Agent 协同场景矩阵 md。
- 00B Agent / Team / Workflow 迭代优化机制 md。
- 02 Agno runtime 验证 md。
- 06 权限工具审批 md。
- 07 记忆知识库 md。

验收：

- 能触发 Agent。
- 能触发 Team。
- 能触发 Workflow。
- 能在 Workflow 中调用 Agent 和 Team。
- 能让多个 Agent 传递结构化结果。
- 能让工具调用进入审批。
- 能在审批通过后继续 run。
- 能明确 state / memory / session 的共享和隔离策略。
- 能明确 Agent / Team / Workflow 的版本、反馈、回滚和优化机制。

### 阶段 2：MVP 链路验证

目标：

- 证明前端、FastAPI、Agno、Nango、Shopify 的主链路能连起来。

产出：

- 01 前端验证 md。
- 03 Nango Shopify 验证 md。
- 04 FastAPI API 边界 md。
- 08 Shopify Listing MVP 验证 md。

验收：

- 能发起一次前端对话。
- 能通过 FastAPI 调用 Agno。
- 能连接 Shopify。
- 能读取 Shopify 商品。
- 能生成 Listing 优化建议。
- 能审批。
- 能写回 Shopify。

### 阶段 2.5：轻平台化验证

目标：

- 用最小成本验证多租户、前端和工程结构可行，不抢 Agent 协同验证的主线。

产出：

- 05 数据模型 md。
- 09 工程结构与部署 md。

验收：

- 数据模型能表达 tenant / workspace / shop / agent / connector。
- 前端能表达工作台、审批和连接管理的轻 MVP。
- 工程结构能支撑后续开发。

### 阶段 3：最终 PRD

目标：

- 将所有子任务结论汇总成可实施 PRD。

产出：

- `cross-border-agent-final-prd.md`

验收：

- 可以直接基于 PRD 拆开发任务。
- 开发任务不需要重新争论底层架构。
- 每个模块都有清楚边界和技术路径。

## 子任务 md 模板

每个子任务文档统一使用下面结构。

```text
# 标题

## 研究目标

## 业务场景

## 需要阅读的源码

## 源码阅读结论

## 技术可行性判断

## 推荐实现方案

## 数据结构或 API 设计

## 风险点

## 第一版取舍

## 后续实现任务

## 结论
```

## 总结

我们现在不直接进入编码，而是先用一组子任务 md 把关键技术链路验证透。

验证顺序必须围绕跨境电商 MVP，不围绕通用平台能力。

最重要的判断是：

- 前端是否能稳定承接 Agent streaming 和审批状态。
- Agno 是否能作为 FastAPI 内部 Agent runtime。
- Nango 是否能稳定管理 Shopify connection。
- Tool 网关是否能把权限、审批、审计全部收住。
- Postgres 数据模型是否能支撑多租户和后续扩展。

这些验证完成后，再汇总成最终 PRD。最终 PRD 才是后续代码实现的主依据。
