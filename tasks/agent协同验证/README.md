# Agent 协同验证目录

本目录专门验证 Agent 平台最核心的能力：Agent 如何创建、管理、审核、迭代，Team 如何调用和优化 Agent，Workflow 如何编排业务流程，底层 LLM provider 如何配置，Agent Registry 如何组织，以及是否需要总控 Orchestrator Agent。

复杂业务 case 已单独移动到：

`/Users/ske/PrimeAgent/cases`

父级总路线：

`/Users/ske/PrimeAgent/cross-border-agent-validation-roadmap.md`

父级专题：

`/Users/ske/PrimeAgent/tasks/00-Agno-Agent协同主验证计划.md`

## 验证顺序

| 顺序 | 文档 | 解决的问题 |
| --- | --- | --- |
| 0 | [00-Agent协同验证总览.md](/Users/ske/PrimeAgent/tasks/agent协同验证/00-Agent协同验证总览.md) | 总览本目录的拆分逻辑、阅读顺序和最终要回答的技术问题。 |
| 1 | [01-Agent创建与配置验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/01-Agent创建与配置验证.md) | 验证一个跨境电商专业 Agent 如何创建、配置模型、工具、知识、记忆、输出结构和审批策略。 |
| 2 | [02-Agent版本迭代与优化验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/02-Agent版本迭代与优化验证.md) | 验证 Agent 如何基于反馈、失败案例、审批记录和评估结果生成新版本、测试和回滚。 |
| 3 | [03-Agent管理审核与发布验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/03-Agent管理审核与发布验证.md) | 验证 Agent 草稿、审核、发布、禁用、归档、权限变更和上线流程。 |
| 4 | [04-Team调用Agent与协同模式验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/04-Team调用Agent与协同模式验证.md) | 验证 Team 如何调用 Agent，route、coordinate、broadcast、tasks 各适合什么业务场景。 |
| 5 | [05-Team版本迭代与成员治理验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/05-Team版本迭代与成员治理验证.md) | 验证 Team 如何锁定成员 Agent 版本、优化成员组合、调整协作模式和汇总策略。 |
| 6 | [06-Workflow整体编排逻辑验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/06-Workflow整体编排逻辑验证.md) | 验证 Workflow 如何串起 Tool、Agent、Team、Approval、Audit 和 Memory Candidate。 |
| 7 | [07-Workflow版本迭代与回放验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/07-Workflow版本迭代与回放验证.md) | 验证 Workflow 版本如何锁定 AgentVersion、TeamVersion、ToolVersion，并支持历史回放和回滚。 |
| 8 | [08-LLM-Provider与模型路由验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/08-LLM-Provider与模型路由验证.md) | 验证底层 LLM provider、model、fallback model、成本、能力分层和租户级模型策略。 |
| 9 | [09-Agent-Registry与组件发现验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/09-Agent-Registry与组件发现验证.md) | 验证 Agno Registry、Agno Components 和业务 Registry 的边界，并确定 Runtime Plan 解析方式。 |
| 10 | [10-Orchestrator总控Agent验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/10-Orchestrator总控Agent验证.md) | 验证总控 Orchestrator Agent 的职责、白名单 Workflow 启动方式和防越权边界。 |
| 11 | [11-Agent协同端到端原型验证.md](/Users/ske/PrimeAgent/tasks/agent协同验证/11-Agent协同端到端原型验证.md) | 把 Orchestrator、Registry、Agent、Team、Workflow、Tool Gateway、Approval、Audit 串成 Listing 优化写回原型。 |

## 关联 Case

| 编号 | 文档 | 说明 |
| --- | --- | --- |
| 12 | [12-用户使用场景头脑风暴与验证缺口分析.md](/Users/ske/PrimeAgent/cases/12-用户使用场景头脑风暴与验证缺口分析.md) | 从真实用户使用场景反推当前验证总结是否完整，并列出建议新增的验证文档。 |
| 13 | [13-高优先级复杂业务场景与动态Workflow验证.md](/Users/ske/PrimeAgent/cases/13-高优先级复杂业务场景与动态Workflow验证.md) | 优先分析竞品链接到 Shopify 上架、对话探索沉淀 Workflow、外部选品研究、多模型节点和 Workflow 自动治理。 |
