# OpenHuman Agent 框架介绍

说明：本文是基于本地 `/Users/ske/openhuman` 代码阅读后的纯文字架构整理。OpenHuman 当前仓库协议为 GPLv3，因此本文只记录设计理解、模块职责和架构思路，不复制源码、不复刻 prompt、不搬运具体实现代码。

## 一句话概括

OpenHuman 的 agent 体系不是一个单独的大模型聊天循环，而是一套“前台编排 Agent + 专业子 Agent + 工具注册表 + 记忆上下文 + 触发器分流”的多 Agent 运行框架。

它的核心思想是：

- 用户主要和 Orchestrator 对话
- Orchestrator 不直接做所有事，而是根据任务选择专业 Agent
- 每个专业 Agent 有自己的职责、模型路由、工具权限、沙箱级别和上下文裁剪规则
- 子 Agent 执行过程对父 Agent 隐藏，父 Agent 只拿到简洁结果
- 外部事件先经过 triage 判断，再决定忽略、记录、简单反应或升级给 Orchestrator

## 主要模块

OpenHuman 的 agent 体系大致分为以下模块。

### Agent Runtime

这是主对话运行时。

它负责：

- 管理一轮或多轮对话历史
- 调用底层 LLM provider
- 向模型暴露可用工具
- 解析模型发出的 tool call
- 执行工具并把结果回填给模型
- 注入记忆、用户资料、工作区状态等上下文
- 写入会话 transcript
- 触发 post-turn hook，例如学习、归档、记忆更新

可以理解为每一个 agent 实例真正运行时的“容器”。

### Agent Definition

OpenHuman 把 agent 定义做成数据驱动结构。

一个 agent definition 描述：

- agent id
- 显示名称
- 什么时候应该使用它
- 使用哪个模型或模型类型
- 温度
- 最大迭代次数
- 最大输出长度
- 沙箱模式
- 可用工具范围
- 禁止工具
- 是否包含用户资料
- 是否包含长期记忆
- 是否包含通用安全提示
- 是否包含技能目录
- 可以委托给哪些子 Agent
- 这个 Agent 属于哪一层级

这对我们很有价值。我们后面做跨境电商 Agent，也应该把 Agent 当作可配置业务对象，而不是硬编码在代码里。

### Agent Registry

Agent Registry 是所有 Agent 定义的注册表。

OpenHuman 有两类定义来源：

- 内置 Agent
- 用户自定义 Agent

内置 Agent 随程序打包。用户自定义 Agent 可以从工作区目录或用户全局目录加载，并且允许用同 id 覆盖内置定义。

这个设计说明：平台可以先提供一批官方 Agent，同时允许租户或高级用户创建自己的 Agent。对我们的产品来说，可以演化成：

- 平台内置跨境电商 Agent
- 租户自定义 Agent
- 店铺级 Agent
- 品牌级 Agent
- 代运营客户级 Agent

### Orchestrator

Orchestrator 是前台总控 Agent。

它的职责不是亲自完成所有任务，而是：

- 理解用户意图
- 判断是否可以直接回答
- 判断是否需要调用工具
- 判断是否需要委托专业 Agent
- 汇总多个 Agent 的结果
- 用面向用户的方式输出最终答案

OpenHuman 的 Orchestrator 还会根据当前可用的集成连接，动态生成可委托的工具入口。也就是说，用户连接了什么外部服务，Orchestrator 能看到对应的委托能力。

对我们的跨境电商平台，Orchestrator 应该是用户默认入口。例如用户说“帮我看看这个 SKU 为什么转化下降”，它负责拆分给销售、广告、评论、竞品等专业 Agent。

### Specialist Agents

OpenHuman 内置了多个专业 Agent，每个 Agent 有窄职责。

典型类型包括：

- 规划型 Agent：负责复杂任务拆解
- 代码执行 Agent：负责改代码、跑命令、调试
- 研究 Agent：负责搜索网页、读文档、整理资料
- 评论/审查 Agent：负责检查风险、回归、缺测试
- 集成 Agent：负责使用外部 OAuth 工具
- 归档 Agent：负责从会话里提炼长期记忆
- 欢迎 Agent：负责新用户引导
- 帮助 Agent：负责回答产品使用问题
- 触发器分类 Agent：负责判断外部事件是否值得处理
- 触发器反应 Agent：负责小型自动响应

这里最值得借鉴的是“职责窄化”。每个 Agent 不追求万能，而是拥有明确边界、专属工具和专属模型选择。

### Subagent Runner

Subagent Runner 是子 Agent 执行器。

父 Agent 发起委托后，runner 会：

- 找到目标 Agent 定义
- 读取父 Agent 的运行上下文
- 为子 Agent 选择模型
- 按 Agent 定义过滤工具
- 组装更窄的系统提示
- 控制最大迭代次数
- 执行子 Agent 的内部工具循环
- 把最终结果压缩成一个返回值给父 Agent

关键点：子 Agent 的完整内部历史不会直接污染父 Agent 对话。父 Agent 看到的是一个简洁的工具结果。

这个设计适合我们的平台，因为跨境电商任务很容易膨胀。如果 Listing Agent、Ads Agent、Review Agent 都把完整过程塞回总控，会导致上下文爆炸。更好的方式是每个 Agent 内部完成工作，只返回结构化结论。

### Delegation Tools

OpenHuman 不是只暴露一个“调用任意 Agent”的大工具，而是会根据 Agent 的声明生成更具体的委托工具。

这样做的好处是：

- LLM 更容易选择正确工具
- 每个委托入口有清楚说明
- Agent 定义改了，工具说明也能同步变化
- 工具列表更接近业务语义

对于集成类能力，OpenHuman 把多个外部服务折叠成一个集成委托入口，再用参数指定具体 toolkit，避免每连接一个工具就让 Orchestrator 的工具列表线性膨胀。

对我们的项目很重要。我们不应该让 Orchestrator 直接看到几十上百个 Shopify/Amazon/Google API 工具。更合理的是：

- Orchestrator 看到 “交给 Shopify Agent”
- Shopify Agent 内部再看到具体 Shopify tools
- 或者 Orchestrator 看到 “交给 Integration Agent，并指定 provider”

### Tool Filtering

OpenHuman 的子 Agent 不会天然继承所有工具，而是根据定义过滤。

工具控制维度包括：

- 命名工具白名单
- 通配工具范围
- 禁止工具
- skill/toolkit 过滤
- 沙箱模式
- 读写权限

这说明工具权限是 Agent 体系的核心，不是 UI 上隐藏按钮那么简单。

我们的平台也要这样做：

- Listing Agent 可以读取商品和评论，但不能直接改价格
- Ads Agent 可以读广告数据，但调预算必须走人工确认
- Customer Support Agent 可以生成回复草稿，但群发邮件要审批
- Viewer 角色只能调用只读工具

### Agent Tier

OpenHuman 给 Agent 分了层级。

大致可以理解为：

- Chat 层：用户前台体验，响应快，负责路由和汇总
- Reasoning 层：复杂思考、计划拆解
- Worker 层：具体执行，不能继续无限委托

这样做是为了避免同层递归和无限多 Agent 调用。

对我们的平台也应该保留类似约束：

- Orchestrator 是 Chat 层
- Strategy Planner 是 Reasoning 层
- Listing/Ads/Review/Inventory 是 Worker 或 Specialist 层
- Tool Agent 通常是 Worker 层

不要让所有 Agent 都能随便调用所有 Agent，否则系统很快不可控。

### Triage

OpenHuman 有一套外部事件 triage 机制。

外部事件包括：

- webhook
- cron 定时任务
- 集成服务触发器
- 后台事件

事件不会直接进入 Orchestrator，而是先经过 triage 判断：

- 是否丢弃
- 是否只记录
- 是否做一个小反应
- 是否升级给 Orchestrator 做复杂处理

这对跨境电商平台很有启发。比如：

- 新差评来了，不一定都要打扰用户
- 库存低于阈值，可能要触发 Inventory Agent
- 广告 ACOS 突然升高，可能要触发 Ads Agent
- 大客户邮件来了，可能要触发 Customer Support Agent
- 平台 API 同步失败，可能只写入系统日志

也就是说，我们后面可以设计一个 Event Triage Agent，用于判断事件是否值得触发业务 Agent。

### Memory And Context

OpenHuman 的 agent 运行时会注入多种上下文。

常见上下文包括：

- 用户资料
- 长期记忆
- 当前工作区状态
- 记忆检索结果
- 会话历史
- 外部连接状态
- 工具执行记录

不同 Agent 可以选择是否包含这些上下文。比如前台 Agent 需要用户资料和长期记忆，窄任务执行 Agent 通常会裁剪掉大量背景内容。

这对我们非常重要：

- Orchestrator 需要知道用户是谁、租户是谁、店铺是谁
- Listing Agent 需要产品信息、品牌语气、平台规则
- Ads Agent 需要广告指标和历史策略
- Tool Agent 不需要人格化记忆，只需要参数和权限
- Memory Curator 需要看完整执行过程，用来提炼经验

### Transcript And Learning

OpenHuman 会保存会话 transcript，并通过归档/学习相关 hook 把会话中的长期信息沉淀到记忆系统。

它的理念是：

- 原始会话留存
- 重要经验经过提炼
- 提炼结果进入长期记忆
- 长期记忆在后续会话里被注入或检索

我们的平台需要更严格，因为涉及多人团队。不能让普通用户的每一句话自动污染共享 Agent。可以借鉴 transcript + curator 思路，但共享记忆必须经过审核。

## 内置 Agent 角色拆解

下面是纯文字概括，不包含源码内容。

### Orchestrator

用户前台入口。负责判断、路由、委托、汇总。它有一组直接工具，也有一组根据 subagent 定义生成的委托工具。它尽量不亲自做重执行，而是把工作交给更专业的 Agent。

### Planner

复杂任务规划者。适合把大任务拆成步骤、依赖关系和验收标准。它偏只读，更多用于制定方案，而不是直接执行修改。

### Code Executor

代码执行专家。用于写代码、改文件、跑测试、调试。拥有较强工具权限，但运行在受控沙箱模式下。

### Researcher

研究专家。用于网页搜索、文档阅读、资料压缩、市场数据查询。它适合处理“需要外部知识”的任务。

### Critic

审查专家。用于代码审查、风险检查、回归检查、测试缺口分析。它偏只读。

### Integrations Agent

外部服务集成专家。一次只处理一个外部 toolkit。它负责使用 OAuth 集成工具完成任务，而不是让 Orchestrator 直接接触所有外部服务动作。

### Tools Agent

通用工具执行专家。适合处理需要大量本地工具、HTTP、文件、搜索、记忆等能力的杂项任务，但不适合处理托管 OAuth 集成。

### Archivist

归档和记忆提炼 Agent。用于从会话中提取长期经验、更新记忆文件或索引。它通常是后台运行。

### Summarizer

运行时压缩 Agent。用于处理过大的工具结果，通常不是给 LLM 主动调用，而是由 runtime 在需要时触发。

### Trigger Triage

触发器分类 Agent。判断外部事件该忽略、记录、简单响应，还是升级给更强 Agent。

### Trigger Reactor

小型响应 Agent。用于处理 triage 判断后的小动作，比如记录记忆、做一个轻量反应，或者发现事情复杂后再升级。

### Welcome / Help

产品体验类 Agent。Welcome 负责新用户引导，Help 负责产品文档问答。这说明 OpenHuman 把“用户体验流程”也纳入 Agent 体系，而不只是业务执行。

## OpenHuman Agent 框架的关键设计原则

### 1. Agent 是声明式业务对象

每个 Agent 不是散落在代码里的函数，而是一个拥有 id、描述、模型、工具、沙箱、上下文策略和委托能力的声明式对象。

我们应该借鉴这一点，把跨境电商 Agent 存成数据库对象，并带版本。

### 2. Orchestrator 应该少做，更多负责路由

OpenHuman 明确把 Orchestrator 定位成路由、判断、汇总，而不是万能执行者。

这对跨境电商平台非常重要。总控 Agent 不应该直接调用所有平台 API，而应该调用专业 Agent。

### 3. 工具权限比 prompt 更重要

Prompt 会漂移，工具权限才是硬边界。

OpenHuman 通过工具白名单、沙箱、读写级别控制 Agent 能做什么。我们的平台也必须把 Shopify、Amazon、广告平台等写操作放在强权限和审批后面。

### 4. 子 Agent 结果要压缩返回

子 Agent 内部可以多轮执行，但父 Agent 不应该接收完整内部过程。父 Agent 需要的是可用结论。

这能降低上下文成本，也能让总控更稳定。

### 5. 外部事件必须先 triage

不是所有 webhook 都值得触发复杂 Agent。先分类，再决定是否升级，是成本和体验都更稳的方案。

### 6. 记忆需要分层

OpenHuman 有长期记忆、用户资料、会话记录、记忆检索等机制。我们的平台要进一步做租户隔离和审核队列，避免共享 Agent 被污染。

## 对跨境电商 Agent 平台的启发

我们可以参考 OpenHuman 的模式，但不能复制其 GPLv3 实现。

推荐映射如下：

- OpenHuman Orchestrator -> 跨境电商运营总控 Agent
- OpenHuman Planner -> 经营策略规划 Agent
- OpenHuman Researcher -> 市场/竞品研究 Agent
- OpenHuman Integrations Agent -> Nango Provider Agent
- OpenHuman Archivist -> 记忆审核草稿 Agent
- OpenHuman Trigger Triage -> 电商事件分流 Agent
- OpenHuman Trigger Reactor -> 小型自动响应 Agent
- OpenHuman Tool Filtering -> 我们自己的 RBAC + tool policy
- OpenHuman Agent Definition -> 我们自己的 Agent 数据模型和版本系统

## 我们自己的 Agent 体系建议

### 第一层：Platform Agents

- Orchestrator Agent
- Planner Agent
- Approval Agent
- Event Triage Agent
- Report Agent

### 第二层：Business Specialist Agents

- Listing Agent
- Review Insight Agent
- Ads Diagnostic Agent
- Competitor Agent
- Inventory Agent
- Product Research Agent
- Customer Support Agent
- Operations Report Agent

### 第三层：Integration / Tool Agents

- Shopify Agent
- Amazon SP-API Agent
- Google Sheets Agent
- Gmail Agent
- Slack Agent
- TikTok Shop Agent
- Ads Platform Agent

这些 Agent 不一定都需要强推理能力。很多时候它们只是安全、结构化、权限受控的数据访问层。

### 第四层：Learning / Evaluation Agents

- Run Evaluator Agent
- Memory Curator Agent
- Agent Optimizer Agent

这些 Agent 负责评估执行效果、总结经验、提出 prompt 或 workflow 优化建议，但不应该自动修改生产 Agent。

## 初始 MVP Agent 集合

建议先做：

- Orchestrator Agent
- Listing Agent
- Review Insight Agent
- Shopify Tool Agent 或 Google Sheets Tool Agent
- Approval Agent
- Memory Curator Agent

这几个可以形成最小闭环：

```text
用户提出业务问题
Orchestrator 判断任务
调用专业 Agent
专业 Agent 调用工具取数
输出建议
涉及写操作则进入审批
执行结果进入记录
可沉淀经验进入记忆审核
```

## 数据模型方向

为了实现类似 OpenHuman 的能力，但适配商业多租户平台，我们至少需要这些对象：

- Agent
- AgentVersion
- AgentToolPolicy
- AgentRun
- AgentRunStep
- AgentDelegation
- ToolCall
- ApprovalRequest
- MemoryDraft
- MemoryEntry
- TenantAgentPermission

这些对象应该存在我们的数据库中，而不是存在 Nango。Nango 只负责外部连接和 token 生命周期。

## 结论

OpenHuman 的 Agent 框架最值得借鉴的不是某段代码，而是整体产品架构：

- 声明式 Agent 定义
- 前台总控 + 专业 Agent
- 动态委托工具
- 工具权限和沙箱
- 子 Agent 内部执行、外部只返回结果
- 触发器 triage
- 长期记忆和归档

我们可以把这些思想迁移到 Agno + Nango + Postgres 的新体系里，做出适合跨境电商商业场景的 Agent 平台，同时避免继承 GPLv3 代码风险。
