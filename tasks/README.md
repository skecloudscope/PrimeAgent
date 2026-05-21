# 子任务研究目录

本目录用于沉淀跨境电商 Agent 平台的专题验证文档。

总路线见：

`/Users/ske/PrimeAgent/cross-border-agent-validation-roadmap.md`

架构基线见：

`/Users/ske/PrimeAgent/cross-border-agent-architecture-decision.md`

推进顺序：

| 顺序 | 文档 | 解决的问题 |
| --- | --- | --- |
| 1 | [00-Agno-Agent协同主验证计划.md](/Users/ske/PrimeAgent/tasks/00-Agno-Agent协同主验证计划.md) | 先验证 Agno 能不能支撑 Agent、Team、Workflow、Tool、Approval、State、Memory 的协同主链路。 |
| 2 | [00A-跨境电商Agent协同场景矩阵.md](/Users/ske/PrimeAgent/tasks/00A-跨境电商Agent协同场景矩阵.md) | 把 Listing、店铺诊断、客服、广告、库存等跨境电商任务拆成 Agent / Team / Workflow。 |
| 3 | [00B-Agent-Team-Workflow迭代优化机制.md](/Users/ske/PrimeAgent/tasks/00B-Agent-Team-Workflow迭代优化机制.md) | 设计 Agent、Team、Workflow 如何基于反馈、审批、失败案例持续迭代、版本化和回滚。 |
| 4 | [agent协同验证/README.md](/Users/ske/PrimeAgent/tasks/agent协同验证/README.md) | 深入拆解 Agent 创建、管理、审核、迭代、Team、Workflow、LLM Provider、Registry、Orchestrator 和端到端原型。 |
| 5 | [02-Agno运行时可行性验证.md](/Users/ske/PrimeAgent/tasks/02-Agno运行时可行性验证.md) | 读 Agno 源码，验证 Agent、Team、Workflow、Approval、Memory、DB 等真实可行性。 |
| 6 | [06-权限工具网关与审批验证.md](/Users/ske/PrimeAgent/tasks/06-权限工具网关与审批验证.md) | 验证工具调用如何经过业务权限网关，写操作如何审批、暂停和恢复。 |
| 7 | [07-记忆与知识库策略验证.md](/Users/ske/PrimeAgent/tasks/07-记忆与知识库策略验证.md) | 验证可控记忆、知识库隔离、memory candidate、shop memory 等策略。 |
| 8 | [03-Nango-Shopify连接可行性验证.md](/Users/ske/PrimeAgent/tasks/03-Nango-Shopify连接可行性验证.md) | 验证 Nango 如何管理 Shopify OAuth、connection_id、token refresh 和 API 调用。 |
| 9 | [08-Shopify-Listing优化MVP验证.md](/Users/ske/PrimeAgent/tasks/08-Shopify-Listing优化MVP验证.md) | 验证第一个商业闭环：读商品、生成 Listing 建议、审批 diff、写回 Shopify。 |
| 10 | [01-前端工作台与VercelAI-SDK验证.md](/Users/ske/PrimeAgent/tasks/01-前端工作台与VercelAI-SDK验证.md) | 轻 MVP 验证前端能展示 streaming、tool call、approval、运行状态。 |
| 11 | [04-FastAPI业务API边界设计.md](/Users/ske/PrimeAgent/tasks/04-FastAPI业务API边界设计.md) | 定义前端、FastAPI、Agno、Nango 的边界，保证前端只连业务 API。 |
| 12 | [05-领域模型与多租户隔离.md](/Users/ske/PrimeAgent/tasks/05-领域模型与多租户隔离.md) | 设计 tenant、workspace、shop、agent、connector、approval、memory、audit 等核心模型。 |
| 13 | [09-工程结构与部署验证.md](/Users/ske/PrimeAgent/tasks/09-工程结构与部署验证.md) | 验证 monorepo、启动方式、环境变量、migration、R2、Nango 部署等工程路径。 |
| 14 | `/Users/ske/PrimeAgent/PRD/01-跨境电商Agent平台详细PRD.md` | 汇总所有验证结论，形成最终 PRD 和真实技术架构文档。 |
