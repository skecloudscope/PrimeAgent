# PrimeAgent 开发约束

本文档是 PrimeAgent 的项目级开发约束。后续写代码、改架构、拆模块、接入第三方服务时，必须优先遵守这里的规则。

## 1. 产品定位约束

PrimeAgent 是跨境电商垂类 Agent 平台，不是通用聊天机器人，也不是单纯固定 Workflow 工具。

核心架构必须坚持：

```text
Conversation
  -> Intent / Goal Understanding
  -> Clarification if needed
  -> Capability Retrieval
  -> Direct Tool / Agent / Team / Workflow Skeleton / Full Workflow
  -> Tool Gateway / Approval / Audit
  -> Capability Sedimentation
```

开发时不要把所有需求都硬编码成固定 Workflow。

Workflow 只适合稳定、高频、可测试、可审批的业务流程。开放探索类任务优先进入 `ExplorationRun`，并在执行后沉淀为 Skill、Tool、Team、Workflow Skeleton、Capability Candidate 或 Full Workflow draft。

## 2. 技术栈约束

已确定技术栈：

- 前端：Next.js + React + Vercel AI SDK + shadcn/ui + Tailwind CSS。
- 后端：FastAPI。
- Agent Runtime：Agno。
- Connector / OAuth：Nango。
- Identity：Clerk。
- Database：Postgres + pgvector。
- Storage：Cloudflare R2。
- First Integration：Shopify。

没有明确原因，不引入替代主框架。

## 3. 目录结构约束

正式实现目录应按下面方向演进：

```text
apps/web                  Next.js 前端
apps/api                  FastAPI 后端
packages/shared           前后端共享类型、常量、枚举
packages/capability-registry
packages/tool-gateway
packages/ecommerce-domain
runtime/agno              本项目自己的 Agno 适配层
integrations/nango        本项目自己的 Nango 适配层
integrations/shopify      Shopify 领域工具和 payload 转换
PRD                       产品和架构文档
cases                     业务 case
tasks                     技术验证任务
```

`agno/` 和 `nango/` 上游源码不应直接 vendor 进本仓库。

产品代码不能把上游 Agno/Nango 目录当业务源码目录使用。业务逻辑必须放在本项目自己的 `runtime/agno`、`integrations/nango`、`apps/api` 或 `packages/*` 中。

强约束：

没有非常明确且经过确认的必要性，不要轻易修改 Agno 或 Nango 的上游源码。

默认策略是围绕 Agno 和 Nango 做产品级适配、封装、组合和治理，而不是 fork 后魔改框架本体。

只有当以下条件同时满足时，才允许考虑修改 Agno/Nango 源码：

- 业务目标无法通过公开 API、配置、适配层、wrapper、插件、hook 或外部服务实现。
- 修改点已经被写入对应 task 或 PRD，并说明为什么不能通过适配层解决。
- 修改范围足够小，能独立测试和回滚。
- 修改不会破坏后续跟随上游升级的能力。
- 用户明确确认可以修改上游源码或 fork 版本。

即使需要改，也应优先在 `runtime/agno` 或 `integrations/nango` 中隔离补丁和适配逻辑，避免把业务规则散落进上游框架。

## 4. 多租户与身份约束

所有核心业务对象必须可追溯到租户上下文。

至少包括：

- tenant。
- workspace。
- user。
- shop。
- connector。
- conversation。
- plan draft。
- workflow run。
- exploration run。
- agent run。
- approval。
- tool execution。
- audit log。
- memory candidate。
- capability。

任何 API、后台任务、tool call、connector call 都不能在没有 tenant/workspace/shop 上下文的情况下执行。

用户身份由 Clerk 提供，但业务权限必须由后端根据 tenant membership、role、permission 自己判断。

## 5. Orchestrator 约束

Orchestrator 是能力路由器，不是执行层，也不是简单 Workflow selector。

Orchestrator 可以做：

- 理解用户意图。
- 判断缺失信息。
- 追问。
- 维护 ConversationGoal。
- 生成 PlanDraft。
- 检索 Capability。
- 路由到 direct answer、direct read tool、specialist agent、team、workflow skeleton、full workflow、external capability request 或 background exploration。
- 解释运行状态。
- 判断是否可沉淀能力。

Orchestrator 禁止：

- 直接写 Shopify。
- 直接调用高风险 write tool。
- 直接安装外部能力。
- 直接发布 Agent、Workflow、Skill。
- 直接写长期共享记忆。
- 绕过 Tool Gateway、Approval 或 Audit。

Orchestrator 不理解用户意图时必须追问，不能假装理解后继续执行。

## 6. Agno Runtime 约束

Agno 是 Agent/Team/Workflow runtime，不是业务事实源。

开发时优先使用 Agno 的现有能力。不要因为业务对象不完全匹配就直接改 Agno 内部实现。

第一选择是：

- Runtime Builder。
- adapter。
- wrapper。
- business snapshot。
- Tool Gateway callable。
- RunGraph trace adapter。

最后选择才是修改 Agno 源码。

Agno 负责：

- 构建和运行 Agent。
- 构建和运行 Team。
- 构建和运行 Workflow。
- 承接 runtime trace、step result、tool result、model invocation。

Agno 不负责：

- 租户隔离。
- 用户身份。
- OAuth。
- 审批策略。
- 业务权限。
- 能力审核发布。
- Capability Registry 的最终事实源。
- 第三方系统真实写入授权。

必须通过 Runtime Builder 把业务版本转换成 Agno runtime object。

Runtime Builder 必须输入快照：

- AgentVersion。
- TeamVersion。
- WorkflowVersion。
- ToolPolicySnapshot。
- ModelPolicySnapshot。
- MemoryPolicySnapshot。
- ApprovalPolicySnapshot。

Runtime Builder 禁止直接读取未审核 draft，禁止直接暴露 write tool 给普通 Agent，禁止直接使用未授权 Nango connection。

## 7. Nango 与 Connector 约束

Nango 只负责：

- OAuth。
- connection id。
- token refresh。
- provider token。
- provider config。

Nango 不负责：

- Agent 记忆。
- Skill 沉淀。
- Workflow 优化。
- 能力评分。
- 跨租户权限。
- 业务审批。
- 哪个 Agent 可以用哪个工具。

开发时优先使用 Nango 的现有 OAuth、connection 和 provider action 能力。不要为了业务审批、能力治理、记忆或权限模型去修改 Nango 内部实现。

第一选择是：

- Connector Gateway。
- connection resolver。
- scope checker。
- provider action proxy。
- error mapper。
- normalized domain object mapper。

最后选择才是修改 Nango 源码。

Agent、Team、Workflow、Orchestrator 都不能直接拿 provider token。

所有第三方读写必须走：

```text
Tool Gateway
  -> Connector Gateway
  -> TenantConnectorBinding
  -> Nango connection
  -> Provider API
  -> Normalized Domain Object
  -> Audit
```

Provider 原始返回不能直接污染业务对象，必须转换为跨境电商领域对象。

## 8. Tool Gateway 与外部动作约束

Tool Gateway 是外部系统读写的唯一边界。

任何访问 Shopify、广告平台、Google、Amazon、爬虫、MCP、外部 API 的动作都必须经过 Tool Gateway 或 Connector Gateway。

工具必须分类：

- read tool。
- transform tool。
- draft generation tool。
- write tool。
- external capability tool。

高风险 write tool 必须审批。

禁止 Agent 或 Team 自己持有直接写 Shopify 的工具。第一版写回只能由 Workflow 的 Tool Gateway step 执行。

审批通过后，只能使用审批时冻结的 diff、参数和权限上下文执行写回，不能在审批后偷偷修改参数。

## 9. Approval 与审计约束

以下动作必须审批：

- 写 Shopify。
- 创建或更新商品。
- 更新价格、库存、SEO、metafields。
- 外发客服消息。
- 广告投放或预算调整。
- 安装外部 Skill、MCP、Tool、Connector。
- 发布 Agent、Team、Workflow、Skill。
- 写入长期共享记忆。

审批必须保存：

- 原始 diff。
- 用户编辑后的 diff。
- 最终执行 diff。
- 审批人。
- 审批时间。
- 关联 run。
- 关联 tool execution。
- 关联 connector。

所有 tool call、model invocation、capability selection、approval decision、connector call 都必须写 audit log。

## 10. Capability Registry 约束

Skill、Tool、MCP/Connector、Agent、Team、Workflow Skeleton、Workflow 都必须进入 Capability Registry。

每个能力必须有 CapabilityCard，至少包含：

- 能力说明。
- 适用场景。
- 不适用场景。
- 输入要求。
- 输出契约。
- 权限要求。
- 数据源要求。
- 风险等级。
- 成本等级。
- 版本。
- owner。
- status。
- 示例和反例。
- 质量指标。

Capability Retrieval 必须先做 hard filter，再做语义检索和排序。

LLM 只能在合法候选内排序和解释，不能越过权限、选择 disabled 能力、选择未审核外部能力或绕过审批。

能力太多时，不允许靠 prompt 记忆找能力，必须通过 Registry、标签、边界说明、质量评分、使用历史和语义检索治理。

## 11. Agent / Team / Workflow 版本约束

Agent、Team、Workflow、Skill、Tool、MCP 都必须版本化。

active 版本不可原地修改。

任何会改变行为的修改都必须产生新版本。

AgentVersion 必须锁定：

- instructions / system prompt。
- tools。
- connectors。
- model policy。
- memory policy。
- approval policy。
- output schema。

TeamVersion 必须锁定成员 AgentVersion。成员 Agent 升级后，Team 不能自动升级，必须创建新 TeamVersion。

WorkflowVersion 必须锁定：

- AgentVersion。
- TeamVersion。
- ToolVersion。
- ModelPolicySnapshot。
- ApprovalPolicySnapshot。
- StepSnapshot。

历史 run 不跟随 active version 变化。

回放不能真实写外部系统。

## 12. Workflow 与 ExplorationRun 约束

稳定流程走 WorkflowRun。

开放探索走 ExplorationRun。

ExplorationRun 必须记录 RunGraph，包括：

- 用户消息。
- Orchestrator 决策。
- clarification。
- capability search。
- agent run。
- team run。
- tool call。
- mcp call。
- approval。
- artifact。
- final output。

ExplorationRun 执行成功后可以生成 SkillDraft、ToolRequirementDraft、WorkflowSkeletonDraft、WorkflowDraft 或 CapabilityCandidate，但不能自动发布。

WorkflowDraft、AgentDraft、SkillDraft 可以由 AI 辅助生成，但必须测试、审核、发布后才能进入 active。

## 13. Memory 与 Knowledge 约束

Agent 不能直接写长期共享记忆。

只能生成 MemoryCandidate。

MemoryCandidate 必须包含：

- scope。
- source run。
- reason。
- risk。
- PII 检查结果。
- 建议写入内容。
- 审核状态。

写入长期 tenant/shop/user memory 必须经过用户或管理员确认。

记忆必须分层：

- session scratch memory。
- user private memory。
- shop memory。
- tenant memory。
- agent memory。

不同租户、workspace、shop 的记忆不能串用。

## 14. LLM Provider 与模型路由约束

不同节点可以使用不同模型，但必须由 ModelPolicy 控制。

模型档位建议：

- fast：意图识别、分类、轻量追问。
- standard：一般生成和分析。
- premium：复杂计划、文案和多步骤推理。
- risk_check：合规、风险、写回前检查。
- multimodal：图片理解和图片生成 prompt。

高风险步骤不能为了省钱自动降级到弱模型。

合规审核、写回计划生成、广告预算建议等必须使用 `risk_check` 或更强模型。

fallback 发生时必须记录 from model、to model、reason、cost、output quality。

批量任务必须有 per-run 和 per-batch 成本上限。

## 15. 外部能力发现与安装约束

外部 Skill、MCP、Tool、Connector 的发现只能由对话中的能力缺口触发。

不能后台静默自动发现、自动安装、自动启用外部能力。

典型触发：

- 用户说要爬虫，可以发现 Playwright MCP / browser automation 候选。
- 用户说要做产品分析，可以发现 Product Research Skill 候选。
- 用户说要看 Google 趋势和 Amazon 评论，可以发现相关 connector 候选。

外部候选能力必须走：

```text
CapabilityGap
  -> ExternalCapabilityCandidate
  -> CapabilityInstallRequest
  -> SandboxEvaluation
  -> CapabilityCard
  -> TenantCapabilityInstallation
```

安装和启用必须有用户确认、管理员或策略审核、沙盒测试和审计。

## 16. 前端交互约束

前端必须让用户始终知道：

- AI 当前理解的目标是什么。
- 缺哪些信息。
- AI 准备用哪些能力。
- 哪些能力还没安装。
- 是否会访问外网。
- 是否会写 Shopify 或其他外部系统。
- 预计成本和风险。
- 哪一步需要审批。
- 当前任务卡在哪里。

前端不能把高风险动作隐藏在聊天气泡里。

PlanDraft、RunTimeline、ToolCallCard、ApprovalDiffCard、CapabilitySelectionPanel、CapabilityInstallRequestCard 是 MVP 的核心交互，不应被省略。

## 17. 数据和接口约束

前端只调用业务 API，不直接调用 Agno、Nango、Shopify 或 LLM provider。

API 返回给前端的对象应该是业务对象或领域对象，不应该泄露 provider token、内部 runtime object 或第三方原始敏感响应。

跨模块传递尽量使用结构化 schema，不用自然语言字符串承载关键业务数据。

ListingDiff、ProductDraft、ShopifyPayload、ApprovalRequest、PlanDraft、CapabilityCard 等必须有明确 schema。

## 18. MVP 开发顺序约束

第一阶段只做最小商业闭环：

```text
Chat 工作台
  -> Orchestrator 识别 Listing 优化意图
  -> PlanDraft
  -> Shopify 商品读取 mock/真实
  -> Agno Listing Agent
  -> ListingDiff
  -> Review / Approval
  -> Tool Gateway 写回 mock/真实 Shopify
  -> Audit / Run Timeline
```

不要在第一阶段过早开发完整 marketplace、复杂多平台广告、复杂自动安装系统或全量能力治理后台。

第一阶段允许 mock Shopify / Nango / LLM，但 mock 的接口形状必须贴近真实边界。

## 19. 工程实践约束

所有实现都要优先贴合已有 PRD、cases、tasks。

新增重要架构判断时，必须同步更新文档。

代码变更应保持小步提交，提交信息说明业务目的。

不要把本地 `.env`、token、provider secret、店铺真实隐私数据提交到仓库。

不要引入与当前架构无关的大型依赖。

如果实现与本文档冲突，先更新约束文档或 PRD，再改代码。
