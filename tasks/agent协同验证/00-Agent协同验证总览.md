# Agent 协同验证总览

本文是 `agent协同验证` 子目录的总览说明，用来解释为什么要单独拆这个目录、每个验证文件解决什么问题，以及最终要如何支撑跨境电商 Agent 平台的 PRD 和代码实现。

## 为什么单独拆 Agent 协同验证

跨境电商 Agent 平台的核心风险不是前端页面，也不是普通 CRUD，而是 Agent 平台内核是否成立。

我们需要验证：

- Agent 能不能被稳定创建、配置、运行和管理。
- Agent 能不能基于真实反馈持续迭代。
- Team 能不能调用多个 Agent 并形成可控协同。
- Workflow 能不能承载可销售业务流程。
- Tool Gateway 能不能守住外部系统动作边界。
- Approval 能不能保护所有高风险写操作。
- LLM Provider 能不能按任务、租户、成本和风险分层配置。
- Agent Registry 能不能管理 Agent、Team、Workflow、Tool、Template、Version。
- Orchestrator Agent 是否应该作为总控入口。

因此，`agent协同验证` 是平台最核心的一组验证，不是普通子任务。

## 验证总目标

最终要证明这个链路可行：

```text
用户输入自然语言
        |
Orchestrator Agent 识别任务
        |
选择 Listing 优化 Workflow
        |
Workflow 读取商品数据
        |
Listing 优化 Agent 生成建议
        |
Listing Review Team 多角度评审
        |
Workflow 生成 diff
        |
Tool Gateway 创建审批
        |
用户审批
        |
Workflow 继续执行写回
        |
Audit Log
        |
Memory Candidate
        |
反馈进入 Agent / Team / Workflow 迭代系统
```

这个链路如果跑通，说明我们的跨境电商 Agent 平台有真实技术基础。

## 子文档说明

### 01 Agent 创建与配置验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/01-Agent创建与配置验证.md`

解决的问题：

- 一个跨境电商专业 Agent 怎么创建。
- Agent 如何配置模型、工具、知识库、记忆、输出结构。
- Agent 如何绑定租户、店铺、权限和审批策略。
- Agent 是否应该基于模板创建，而不是用户自由写 prompt。

第一版重点：

- 创建 `Listing 优化 Agent`。
- 输入 `ProductSnapshot`。
- 输出结构化 `ListingSuggestion`。
- 不直接执行 Shopify 写操作。

### 02 Agent 版本迭代与优化验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/02-Agent版本迭代与优化验证.md`

解决的问题：

- Agent 如何基于用户反馈、审批拒绝、失败案例持续优化。
- 如何设计 `AgentVersion`。
- 如何回放历史案例。
- 如何发布新版本和回滚。

第一版重点：

- 每次 run 绑定 `agent_version_id`。
- active 版本不可直接修改。
- Optimization Agent 只能生成建议，不能自动发布。

### 03 Agent 管理、审核与发布验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/03-Agent管理审核与发布验证.md`

解决的问题：

- Agent 从 draft 到 active 的生命周期。
- Agent 发布前审核什么。
- 权限变更是否需要重新审核。
- Agent 禁用、归档、回滚如何处理。

第一版重点：

- Agent 必须有审核发布流程。
- write tool 权限变更必须重新审核。
- 租户启用的是 AgentInstance，不是直接修改平台模板。

### 04 Team 调用 Agent 与协同模式验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/04-Team调用Agent与协同模式验证.md`

解决的问题：

- Team 如何调用多个 Agent。
- `route / coordinate / broadcast / tasks` 各适合什么业务场景。
- Team 是否可以承载 Listing 多专家评审。

第一版重点：

- 验证 `Listing Review Team`。
- 成员包括 SEO Agent、Copywriting Agent、Compliance Agent。
- Team 用于分析和评审，不直接执行 write tool。

### 05 Team 版本迭代与成员治理验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/05-Team版本迭代与成员治理验证.md`

解决的问题：

- Team 如何版本化。
- TeamVersion 如何锁定成员 AgentVersion。
- 成员 Agent 升级后 Team 是否自动升级。
- Team 模式、汇总策略和成员组合如何优化。

第一版重点：

- TeamVersion 必须锁定成员 AgentVersion。
- Team 成员升级不自动影响 active Team。
- Team 更新必须走 testing。

### 06 Workflow 整体编排逻辑验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/06-Workflow整体编排逻辑验证.md`

解决的问题：

- Workflow 如何串起 Tool、Agent、Team、Approval、Audit、Memory Candidate。
- Workflow 如何暂停、恢复、处理失败和重试。
- Workflow 是否应该成为商业流程主路径。

第一版重点：

- `Listing 优化并写回 Shopify Workflow` 是 MVP 主流程。
- Agent 和 Team 是 Workflow 的能力节点。
- write tool 只能出现在审批之后。

### 07 Workflow 版本迭代与回放验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/07-Workflow版本迭代与回放验证.md`

解决的问题：

- WorkflowVersion 如何设计。
- Workflow 如何锁定 AgentVersion、TeamVersion、ToolVersion。
- 历史 run 如何回放。
- Workflow 如何回滚。

第一版重点：

- 每次 workflow_run 必须绑定 workflow_version_id。
- 历史 run 不跟随版本升级。
- 回放不执行真实写操作。

### 08 LLM Provider 与模型路由验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/08-LLM-Provider与模型路由验证.md`

解决的问题：

- 底层 LLM provider 怎么配置。
- Agent、Team、Workflow 如何选择不同模型。
- fallback model 怎么设置。
- 成本、延迟、风险如何分层。
- 租户是否可以选择模型档位。

第一版重点：

- provider key 由平台后端管理。
- AgentTemplate 提供推荐模型。
- 高风险检查用更强模型。
- routing / orchestration 使用低延迟模型。

### 09 Agent Registry 与组件发现验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/09-Agent-Registry与组件发现验证.md`

解决的问题：

- Agent Registry 管哪些东西。
- Agno Registry 能复用多少。
- 业务平台是否需要自建 Registry。
- 前端如何知道租户可用哪些 Agent / Workflow。
- Runtime Plan 如何解析和锁定版本。

第一版重点：

- 业务 Registry 必须自建。
- 前端展示的 Agent 列表来自业务 Registry。
- Agno Registry 作为运行时参考，不作为业务权限和版本事实源。
- Agno Components 的 draft / published / current_version / links 思想可以借鉴，但不能成为业务事实源。

### 10 Orchestrator 总控 Agent 验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/10-Orchestrator总控Agent验证.md`

解决的问题：

- 是否需要总控 Orchestrator Agent。
- Orchestrator 和 Team、Workflow、业务 API 的边界是什么。
- Orchestrator 是否能启动 Workflow。
- 如何防止 Orchestrator 越权。

第一版重点：

- 需要 Orchestrator。
- Orchestrator 是入口和路由层，不是执行层。
- Orchestrator 只能启动白名单 Workflow。
- 所有写操作仍然由 Workflow + Tool Gateway + Approval 执行。
- Workflow 内部路由交给 Router / Condition，Orchestrator 只选择启动哪个业务流程。

### 11 Agent 协同端到端原型验证

文件：

`/Users/ske/PrimeAgent/tasks/agent协同验证/11-Agent协同端到端原型验证.md`

解决的问题：

- 把 Orchestrator、Agent、Team、Workflow、Tool Gateway、Approval、Registry、LLM Provider 串成一个可跑原型。
- 验证整体链路是否真实可行。

第一版重点：

- 可以 mock Shopify。
- 可以 mock tenant。
- 但必须真实验证 Agno Agent、Team、Workflow、structured output、pause / resume。
- 必须验证 Runtime Plan、版本绑定、Tool Gateway 拦截、Approval 之后才能写入、Audit Log 可追踪。

## 关联 Case 目录

复杂业务 case 已移动到：

`/Users/ske/PrimeAgent/cases`

当前重点 case：

- `/Users/ske/PrimeAgent/cases/12-用户使用场景头脑风暴与验证缺口分析.md`
- `/Users/ske/PrimeAgent/cases/13-高优先级复杂业务场景与动态Workflow验证.md`

这些 case 不属于本目录的技术验证步骤，而是用真实业务压力测试反推本目录是否需要新增验证专题。

当前 case 已经把后续优先级调整为：

- 动态对话探索与 Workflow 沉淀。
- 竞品链接到 Shopify 上架全链路。
- 外部选品研究。
- Workflow 自动创建、迭代、审核、发布和回滚。

## 推荐阅读顺序

第一轮先读：

1. `01-Agent创建与配置验证.md`
2. `04-Team调用Agent与协同模式验证.md`
3. `06-Workflow整体编排逻辑验证.md`
4. `10-Orchestrator总控Agent验证.md`
5. `11-Agent协同端到端原型验证.md`

关联阅读：

1. `/Users/ske/PrimeAgent/cases/12-用户使用场景头脑风暴与验证缺口分析.md`
2. `/Users/ske/PrimeAgent/cases/13-高优先级复杂业务场景与动态Workflow验证.md`

第二轮再读：

1. `02-Agent版本迭代与优化验证.md`
2. `03-Agent管理审核与发布验证.md`
3. `05-Team版本迭代与成员治理验证.md`
4. `07-Workflow版本迭代与回放验证.md`

第三轮补充：

1. `08-LLM-Provider与模型路由验证.md`
2. `09-Agent-Registry与组件发现验证.md`

## 和父级任务的关系

父级文档：

- `00-Agno-Agent协同主验证计划.md`：定义 Agent 协同主线。
- `00A-跨境电商Agent协同场景矩阵.md`：定义业务场景。
- `00B-Agent-Team-Workflow迭代优化机制.md`：定义迭代优化总原则。

本目录的作用：

- 把父级原则拆成可执行验证专题。
- 每一篇都可以对应一次源码阅读或原型实验。
- 最后汇总回 `02-Agno运行时可行性验证.md` 和最终 PRD。

## 最终要输出的技术结论

完成本目录验证后，我们应该能明确回答：

- Agent 怎么创建。
- Agent 怎么管理。
- Agent 怎么审核。
- Agent 怎么迭代。
- Team 怎么调用 Agent。
- Team 怎么版本化。
- Workflow 怎么串联 Agent / Team / Tool / Approval。
- Workflow 怎么版本化和回放。
- LLM Provider 怎么配置和路由。
- Agent Registry 怎么做。
- 是否需要 Orchestrator。
- Orchestrator 如何安全实现。
- 端到端 MVP 原型怎么跑。
- 真实用户场景是否覆盖充分。
- 哪些遗漏验证需要新增。

这些结论会直接进入最终 PRD 和代码实现任务。
