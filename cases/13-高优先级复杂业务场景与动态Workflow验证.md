# 13 高优先级复杂业务场景与动态 Workflow 验证

## 文档目的

本文件优先围绕最新提出的 5 个高价值场景进行头脑风暴和技术应对。

这些场景比 `Listing 优化并写回 Shopify` 更接近真实跨境电商公司的复杂业务：

1. 从竞对链接抓数据，生成图片、SKU 图、场景图、A+ 页面，并整理成 Shopify 可导入格式写入 Shopify。
2. 从所有独立站数据里发现效果好的产品，让 AI 过滤后形成投放广告策略；这个过程不是预设固定流程，而是通过对话引导 AI 执行，并希望做过一次后能稳定沉淀为 Workflow / Skill / MCP 之类能力。
3. 做选品分析时，需要从外部获取 Google、Amazon 等信息，并自动处理多轮对话流程。
4. 不同处理节点调用不同大模型。
5. Workflow 是否能像 Agent 一样被自动创建、迭代、审核和发布。

本文件的核心结论：

```text
平台必须支持两种执行模式：

1. 已发布 Workflow 模式：
   稳定、可审计、可复用，适合高频业务流程。

2. 对话探索模式：
   用户通过对话让 Orchestrator 逐步规划、调用工具、生成中间结果；
   成功执行后沉淀为 WorkflowDraft / SkillDraft / ToolConnector需求 / EvaluationCase；
   再经过测试、审核和发布，变成稳定能力。
```

这会把我们的平台从“预设 Agent 工作台”升级为“可沉淀业务流程的 Agent 操作系统”。

## 后续修正：沉淀目标不应只看 Workflow

后续在 [14-开放式对话意图理解与能力沉淀边界.md](/Users/ske/PrimeAgent/cases/14-开放式对话意图理解与能力沉淀边界.md) 中进一步明确：

跨境电商对话通常是开放式、渐进式、经常变化的。一次成功执行后，不一定应该固化成完整 Workflow。

更稳定的沉淀物往往是：

- Skill。
- Tool。
- MCP / Connector。
- AgentVersion。
- TeamVersion。
- Workflow Skeleton。
- 领域记忆和操作偏好。

完整 Workflow 只适合高频、稳定、可测试、可审批的流程。

## 总体设计原则

### 1. 对话可以探索，但执行必须受控

用户可以通过自然语言说：

```text
你先去看这些竞品链接，把素材、卖点、价格、SKU 信息整理出来，然后帮我生成上架素材，最后导入 Shopify。
```

但系统不能让 Agent 自由抓网页、自由生成图、自由写 Shopify。

必须拆成：

```text
用户自然语言
  -> Orchestrator 识别复杂任务
  -> 生成 PlanDraft
  -> 用户确认计划
  -> Runtime 执行只读/生成类步骤
  -> 高风险步骤进入审批
  -> 写 Shopify 走 Tool Gateway
  -> 运行证据进入 RunGraph
  -> 成功后可沉淀为 WorkflowDraft / SkillDraft
```

### 2. Workflow 可以自动生成草稿，但不能自动发布

允许：

- AI 根据一次成功执行生成 `WorkflowDraft`。
- AI 根据运行证据总结步骤。
- AI 建议工具依赖、输入 schema、输出 schema、审批策略。
- AI 生成测试样本和评估标准。

不允许：

- AI 自动把 Workflow 发布到 active。
- AI 自动给 Workflow 加写工具权限。
- AI 自动绕过审核。
- AI 自动创建 MCP server 并接入生产。

最终规则：

```text
自动创建 draft
人工审核 testing
测试集回放
安全检查
人工发布
可回滚
```

### 3. Skill、Workflow、MCP 不是一回事

这三个概念要分清：

| 类型 | 适合沉淀什么 | 是否可以由 AI 生成 draft | 是否能直接生产执行 |
| --- | --- | --- | --- |
| Workflow | 业务流程步骤、审批、工具调用顺序、版本 | 可以 | 不可以，必须审核发布 |
| Skill | Agent 做某类任务的操作知识、提示规范、方法论 | 可以 | 可以作为草稿被引用，正式启用需审核 |
| MCP / Tool Connector | 新工具协议、外部服务连接、API 能力 | 可以生成需求草案 | 不可以，需要工程实现、安全审查 |
| AgentVersion | 某个 Agent 的 instructions、tools、schema、model policy | 可以生成 draft | 不可以，必须审核发布 |

一句话：

```text
Workflow 沉淀流程。
Skill 沉淀做法。
MCP/Tool 沉淀外部能力。
AgentVersion 沉淀角色能力。
```

## 场景 1：竞对链接到 Shopify 上架全链路

### 用户原始需求

```text
我有一个产品，需要从几个竞对链接中抓取数据，分析他们的卖点、价格、图片和 SKU。
然后帮我刷图，生成 SKU 图片，生成产品场景图，设计 A+ 页面。
最后把所有数据整理成 Shopify 能导入的格式，并通过 Shopify 接口塞进店铺。
```

### 这是一个什么类型的任务

这是一个“新品上架生产链路”，不是单个 Agent 能完成的任务。

它包含：

- 外部网页数据采集。
- 竞品信息抽取。
- 合规和版权风险检查。
- 商品结构化建模。
- 图片生成/改图/场景图生成。
- SKU 资产生成。
- 详情页/A+ 页面内容设计。
- Shopify product / variants / media / metafields 写入。
- 审批和审计。

### 推荐系统路径

```text
Orchestrator
  -> 识别 new_product_launch_from_competitor_links
  -> 收集竞对链接、目标市场、品牌规则、目标店铺
  -> 创建 PlanDraft
  -> 用户确认计划
  -> Competitor Research Workflow
  -> Product Structuring Agent
  -> Image Production Workflow
  -> A+ Page Design Agent / Team
  -> Shopify Import Package Builder
  -> Compliance Review Team
  -> Approval
  -> Shopify Tool Gateway 写入
```

### 建议拆成的 Agent / Team / Workflow

#### Agent

```text
Competitor Data Extract Agent
- 从竞对页面抽取标题、价格、卖点、SKU、图片 URL、评论摘要。
- 只读，不写外部系统。

Product Structuring Agent
- 把竞品信息转成我们自己的 ProductDraft。
- 生成标题、卖点、描述、SKU 结构。

Image Brief Agent
- 生成图片生产需求。
- 不直接复制竞对图片，只提炼风格、场景、角度、卖点。

Shopify Import Builder Agent
- 输出 Shopify product payload、variants、media、metafields。

Compliance Review Agent
- 检查侵权、敏感词、夸大宣传、竞对复制风险。
```

#### Team

```text
Product Launch Review Team
- SEO Reviewer
- Copywriting Reviewer
- Compliance Reviewer
- Shopify Data Reviewer
- Visual Asset Reviewer
```

#### Workflow

```text
New Product Launch Workflow
1. validate_competitor_links
2. fetch_competitor_pages
3. extract_competitor_data
4. normalize_product_requirements
5. generate_product_draft
6. generate_image_briefs
7. generate_sku_image_jobs
8. generate_scene_image_jobs
9. design_aplus_page
10. build_shopify_import_package
11. compliance_review
12. user_review_assets_and_payload
13. create_approval_request
14. shopify_create_product
15. upload_media
16. write_audit_log
17. create_memory_candidates
```

### 关键数据对象

```text
CompetitorLinkInput
- url
- marketplace
- product_type
- notes

CompetitorProductSnapshot
- source_url
- title
- price
- currency
- images
- variants
- bullet_points
- description
- reviews_summary
- detected_claims

ProductLaunchBrief
- target_market
- brand_rules
- target_customer
- product_positioning
- differentiation
- forbidden_claims

GeneratedAssetJob
- asset_type = main_image / sku_image / scene_image / aplus_block
- prompt
- source_references
- output_uri
- review_status

ShopifyImportPackage
- product_payload
- variants_payload
- media_payload
- metafields_payload
- seo_payload
- warnings
```

### 风险和边界

这个场景风险很高。

必须特别处理：

- 不直接复制竞对图片。
- 不直接复制竞对文案。
- 竞对数据只能作为分析参考。
- 图片生成要保留 prompt、source reference、生成模型、版本。
- Shopify 写入前必须人工审批。
- A+ 页面如果指 Amazon A+，不能直接等同 Shopify 页面，需要转成 Shopify sections / metafields / rich text / media blocks。

### 技术验证缺口

当前 `00-12` 还没有覆盖：

- 外部网页抓取。
- 非结构化页面抽取。
- 图片生成/改图资产流水线。
- 资产审批。
- Shopify product + variants + media + metafields 组合写入。
- A+ 页面到 Shopify 内容模块的映射。

建议新增子验证：

```text
外部竞品采集与合规边界验证
图片资产生成与审核验证
Shopify导入包生成与写入验证
```

## 场景 2：从所有独立站数据中发现爆品，并通过对话沉淀 Workflow

### 用户原始需求

```text
可以从数据库中分析所有独立站站点中的数据，找出哪些产品效果非常好。
让 AI 自己过滤，过滤完成之后再进行投放广告。
但这种场景肯定不会是事先固化下来的，而是通过对话方式引导 AI 去执行。
如果做过一次之后，AI 能不能稳定地生成 Workflow，或者 Skill、MCP 之类？
```

### 这是一个什么类型的任务

这是“对话探索型数据分析 -> 行动执行 -> 流程沉淀”的核心场景。

它不是一开始就有固定 Workflow，而是：

```text
用户提出模糊目标
  -> AI 追问指标
  -> AI 查询数据
  -> AI 尝试筛选
  -> 用户调整标准
  -> AI 生成候选产品
  -> 用户确认
  -> AI 生成广告投放建议
  -> 用户审批
  -> 后续沉淀成稳定 Workflow
```

### 推荐系统路径

```text
Orchestrator
  -> 识别 exploratory_product_winner_analysis
  -> 创建 ExplorationRun
  -> 对话收集过滤标准
  -> Data Query Agent 查询内部数据
  -> Product Scoring Agent 生成评分
  -> User 调整筛选逻辑
  -> Ads Strategy Agent 生成投放计划
  -> Approval
  -> Ads Tool Gateway 执行或导出投放包
  -> RunGraph Builder 记录成功路径
  -> WorkflowDraft Generator 生成可复用 Workflow 草稿
  -> 人工审核发布
```

### 关键设计：ExplorationRun

为这类场景，需要新增一个概念：

```text
ExplorationRun
- id
- tenant_id
- user_id
- conversation_id
- goal
- data_sources
- tool_calls
- intermediate_tables
- user_decisions
- final_outputs
- accepted_actions
- run_graph
- can_convert_to_workflow
```

它和 WorkflowRun 的区别：

| 类型 | 特点 |
| --- | --- |
| WorkflowRun | 已发布流程的一次执行，步骤固定，可回放 |
| ExplorationRun | 对话探索的一次执行，步骤动态，结束后可生成 WorkflowDraft |

### AI 能不能稳定生成 Workflow？

答案：

```text
可以生成 WorkflowDraft，但不能直接发布为稳定 Workflow。
```

生成流程：

```text
ExplorationRun
  -> 提取成功 run graph
  -> 识别稳定步骤
  -> 识别变量输入
  -> 识别工具依赖
  -> 识别审批节点
  -> 生成 WorkflowDraft
  -> 生成测试样本
  -> shadow replay
  -> 人工审核
  -> 发布 WorkflowVersion
```

### AI 能不能生成 Skill？

可以生成 `SkillDraft`，例如：

```text
爆品筛选 Skill
- 指标优先级：CVR、GMV、ROAS、退款率、毛利率、库存可用性
- 过滤方法：剔除低样本量、剔除低毛利、剔除缺货 SKU
- 输出格式：候选产品、原因、投放建议、风险
```

Skill 更像“做事方法”，可以被 Agent 引用。

### AI 能不能生成 MCP？

不能直接生成生产可用 MCP。

更准确地说：

```text
AI 可以生成 MCP/Tool Connector 需求草案或脚手架建议；
工程和安全审核后才能接入生产。
```

如果 AI 在探索中发现缺少工具，例如：

```text
需要查询所有 Shopify 店铺的 30 天商品 GMV + CVR + 库存 + 毛利率
```

它可以生成：

```text
ToolRequirementDraft
- tool_key = analytics.products.performance.query
- required_inputs
- expected_outputs
- data_sources
- permission_scope
- risk_level
```

然后由工程实现为内部 Tool 或 MCP server。

### 技术验证缺口

当前文档还缺：

- ExplorationRun。
- 对话式数据分析 Plan。
- RunGraph 到 WorkflowDraft 的转换。
- SkillDraft。
- ToolRequirementDraft。
- WorkflowDraft 审核发布流程。

建议新增验证：

```text
对话探索运行与Workflow沉淀验证
Skill草稿生成与启用验证
工具需求草案与MCP边界验证
```

## 场景 3：选品分析时自动获取 Google、Amazon 等外部信息

### 用户原始需求

```text
有时候会进行选品分析，这时候需要去外界获取 Google、Amazon 之类的信息，是否能自动处理这样的对话流程？
```

### 这是一个什么类型的任务

这是“外部研究型 Agent 流程”。

用户不一定知道具体要查哪些来源，所以 Orchestrator 要能引导：

```text
你想分析哪个品类？
目标市场是哪里？
希望关注搜索趋势、竞品价格、评论痛点、广告竞争，还是利润空间？
```

### 推荐系统路径

```text
Orchestrator
  -> 识别 product_research
  -> 收集品类、市场、价格带、渠道
  -> Product Research Workflow
  -> External Search Agent
  -> Amazon Competitor Agent
  -> Trend Analysis Agent
  -> Review Pain Point Agent
  -> Profit / Supply Risk Agent
  -> Research Review Team
  -> 输出 ProductOpportunityReport
```

### 外部数据工具层

第一版不要让 Agent 直接无限制浏览互联网。

建议统一通过 Tool Gateway 的只读工具：

```text
external.google.search
external.google.trends.query
external.amazon.search
external.amazon.product.read
external.amazon.review_summary
external.webpage.fetch
external.webpage.extract
```

每个工具都要记录：

- query。
- source url。
- fetched_at。
- extracted_content_hash。
- citation/source。
- cost。
- rate limit。
- legal/ToS risk tag。

### 是否能自动处理对话流程？

可以，但要分层：

```text
Orchestrator 负责追问和收集目标。
Product Research Workflow 负责研究步骤。
External Research Agents 负责外部查询和总结。
Research Review Team 负责交叉验证。
最终输出 Research Report，而不是直接下单或上架。
```

### 输出对象

```text
ProductOpportunityReport
- product_idea
- target_market
- demand_signals
- competitor_summary
- price_band
- review_pain_points
- differentiation_opportunities
- sourcing_risks
- compliance_risks
- recommended_next_actions
- source_citations
- confidence
```

### 技术验证缺口

当前文档缺：

- 外部搜索工具治理。
- 来源引用和证据保存。
- 外部信息过期时间。
- 研究报告置信度。
- 多来源冲突处理。

建议新增验证：

```text
外部研究工具与来源证据验证
选品分析Workflow验证
```

## 场景 4：不同处理节点调用不同大模型

### 用户原始需求

```text
有时候想在不同的处理节点调用不同的大模型，是否能支持？
```

### 结论

支持，而且这应该成为平台的一等能力。

现有 `08-LLM-Provider与模型路由验证.md` 已经确认：

- Agno Agent 可以配置模型。
- Agno Team 可以配置模型。
- Workflow 中每个 Step 调用的 Agent/Team 可以使用不同模型。
- 支持 fallback。
- metrics 能记录 token、cost、duration。

### 在复杂流程里的模型分配

以场景 1 为例：

```text
Orchestrator
- fast model
- 负责意图识别、追问、状态解释

Competitor Data Extract Agent
- balanced model
- 负责网页抽取和结构化

Product Structuring Agent
- premium model
- 负责商品定位和文案结构

Image Brief Agent
- premium / multimodal model
- 负责图片 prompt 和视觉需求

Compliance Review Agent
- risk_check model
- 负责合规风险

Shopify Import Builder Agent
- balanced model
- 负责结构化 payload

Workflow function steps
- 不调用 LLM
- 做确定性转换、校验、diff、写库
```

### 需要的数据结构

```text
WorkflowStepModelPolicySnapshot
- workflow_version_id
- step_key
- model_tier
- provider
- model_id
- fallback_policy
- max_cost
- max_tokens
- reason
```

或者直接放入：

```text
workflow_step_snapshots.model_policy_snapshot
agent_versions.model_policy_snapshot
team_versions.model_policy_snapshot
```

### 必须增加的规则

- 高风险步骤不能为了省钱自动降级到弱模型。
- 合规审核、写回计划生成、广告预算建议等必须使用 `risk_check` 或更强模型。
- 大批量任务必须有 per-run 和 per-batch 成本上限。
- fallback 发生时必须写入 audit 和 model_invocations。
- 不同模型输出 schema 必须统一。

### 当前是否遗漏？

`08` 已经覆盖基础能力。

但在复杂业务里还要补：

- Workflow step 级模型策略。
- 成本预算在 batch/exploration run 中如何中断。
- 多模态模型如何管理图片生成和图片理解。

## 场景 5：Workflow 能否自动创建、迭代、审核，是否类似 Agent

### 用户原始问题

```text
workflow 能自动被创建、以及迭代、审核之类的吗，是不是类似 agent？
```

### 结论

Workflow 必须像 Agent 一样有完整生命周期。

而且在商业平台里，Workflow 的治理重要性甚至高于 Agent，因为 Workflow 决定：

- 调哪些 Agent。
- 调哪些 Tool。
- 哪一步需要审批。
- 什么时候写外部系统。
- 错误如何处理。
- 成本如何控制。
- 能否回放和回滚。

### Workflow 生命周期

```text
WorkflowTemplate
  -> WorkflowInstance
  -> WorkflowVersion draft
  -> 自动/人工生成步骤
  -> 静态安全检查
  -> 测试集运行
  -> shadow replay
  -> 人工审核
  -> published
  -> active
  -> run
  -> 收集反馈
  -> OptimizationCase
  -> WorkflowVersion draft vNext
  -> rollback / deprecate
```

### 自动创建 Workflow 的方式

推荐三种来源：

#### 1. 从对话生成

```text
用户和 Orchestrator 多轮对话
  -> 生成 PlanDraft
  -> 用户确认
  -> 执行 ExplorationRun
  -> 成功后生成 WorkflowDraft
```

#### 2. 从成功运行生成

```text
用户标记某次执行“以后按这个流程”
  -> RunGraph Builder 提取步骤
  -> WorkflowDraft Generator 生成草稿
```

#### 3. 从管理员配置生成

```text
管理员在后台选择：
- 输入 schema
- 步骤
- Agent/Team
- Tool
- Approval
- ModelPolicy
系统生成 WorkflowVersion draft
```

### Workflow 和 Agent 的相同点

| 能力 | Agent | Workflow |
| --- | --- | --- |
| Template | 需要 | 需要 |
| Instance | 需要 | 需要 |
| Version | 需要 | 需要 |
| draft/published | 需要 | 需要 |
| 审核发布 | 需要 | 需要 |
| 回放测试 | 需要 | 更需要 |
| 回滚 | 需要 | 需要 |
| 运行记录 | 需要 | 需要 |
| 优化案例 | 需要 | 需要 |

### Workflow 和 Agent 的不同点

| 差异 | Agent | Workflow |
| --- | --- | --- |
| 核心职责 | 专业判断/生成 | 流程控制/外部动作编排 |
| 风险来源 | 输出错误、工具误用 | 串错步骤、绕过审批、误写外部系统 |
| 版本影响 | 单个能力变化 | 整条业务流程变化 |
| 审核重点 | prompt、tools、schema、model | step graph、tool policy、approval、error path、cost |
| 回放要求 | 样本输出对比 | 全流程 dry-run/shadow-run |

### Workflow 自动迭代

允许自动生成优化建议：

```text
WorkflowOptimizationSuggestion
- 失败步骤过多
- 某个 Agent 输出不稳定
- 某个 Team 成本太高
- 审批拒绝率高
- 用户经常手动编辑某一步输出
- 某个外部工具频繁 rate limit
- 可以新增前置校验步骤
```

不允许自动修改 active Workflow。

迭代流程：

```text
workflow_runs / audit_logs / approval_logs
  -> WorkflowOptimizationCase
  -> WorkflowOptimizationSuggestion
  -> WorkflowVersion draft
  -> replay test
  -> review
  -> publish
```

## 新增核心架构：动态执行到稳定沉淀

这 5 个场景共同要求我们新增一条主线：

```text
Conversation
  -> PlanDraft
  -> ExplorationRun
  -> RunGraph
  -> WorkflowDraft / SkillDraft / ToolRequirementDraft
  -> Evaluation
  -> Review
  -> Published Workflow / Skill / Tool
```

### 新数据模型草案

```text
plan_drafts
- id
- tenant_id
- user_id
- conversation_id
- goal
- proposed_steps
- required_tools
- required_data_sources
- risk_level
- estimated_cost
- status = proposed / confirmed / rejected / executed

exploration_runs
- id
- tenant_id
- user_id
- plan_draft_id
- conversation_id
- status
- started_at
- completed_at
- final_result
- run_graph_id

run_graphs
- id
- exploration_run_id
- nodes
- edges
- tool_calls
- agent_runs
- model_invocations
- user_decisions
- artifacts

workflow_drafts
- id
- tenant_id
- source_type = conversation / exploration_run / admin
- source_id
- name
- steps_snapshot
- input_schema
- output_schema
- approval_policy_snapshot
- tool_policy_snapshot
- model_policy_snapshot
- status = draft / testing / in_review / rejected / published

skill_drafts
- id
- tenant_id
- source_type
- source_id
- name
- instructions
- examples
- constraints
- evaluation_cases
- status

tool_requirement_drafts
- id
- tenant_id
- source_type
- source_id
- tool_key
- description
- required_inputs
- expected_outputs
- data_sources
- risk_level
- implementation_status
```

## 这些场景对现有验证文档的修正

### 对 10 Orchestrator 的修正

原来 Orchestrator 只需要选择白名单 Workflow。

现在要扩展为：

```text
Orchestrator 可以在没有现成 Workflow 时创建 PlanDraft。
但 PlanDraft 执行必须受工具白名单、成本、权限和审批控制。
```

### 对 11 端到端原型的修正

原来的 11 是稳定 Workflow 原型。

现在需要新增第二条原型：

```text
对话探索型原型：
用户提出模糊目标
  -> Orchestrator 追问
  -> PlanDraft
  -> ExplorationRun
  -> 生成 WorkflowDraft
```

### 对 12 用户场景头脑风暴的修正

原来建议优先补批量任务、审批编辑和前端执行流。

现在根据你的新场景，优先级要调整：

```text
第一优先：
1. 动态对话探索与 Workflow 沉淀
2. 竞品链接到 Shopify 上架全链路
3. 外部研究与选品分析

第二优先：
4. 批量任务与部分成功
5. 审批编辑拒绝与重做
6. 前端任务执行流
```

## 建议新增验证文档重新排序

建议从现在开始新增：

| 编号 | 文件名 | 目的 | 优先级 |
| --- | --- | --- | --- |
| 14 | `14-动态对话探索与Workflow沉淀验证.md` | 验证从对话执行一次复杂任务后，生成 WorkflowDraft / SkillDraft / ToolRequirementDraft | P0 |
| 15 | `15-竞品链接到Shopify上架全链路验证.md` | 验证竞品采集、产品结构化、图片资产、A+ 页面、Shopify 导入包和写入审批 | P0 |
| 16 | `16-外部研究与选品分析Workflow验证.md` | 验证 Google/Amazon 等外部研究工具、来源证据和选品报告 | P0 |
| 17 | `17-Workflow自动创建迭代审核发布验证.md` | 验证 Workflow 像 Agent 一样创建、迭代、审核、发布和回滚 | P0 |
| 18 | `18-批量任务与部分成功验证.md` | 验证批量商品、批量审批、部分失败和重试 | P1 |
| 19 | `19-审批编辑拒绝与重做闭环验证.md` | 验证审批 diff 编辑、拒绝、重做和多次审批 | P1 |
| 20 | `20-前端任务执行流与审批体验验证.md` | 验证 Chat + plan draft + workflow timeline + approval UI | P1 |
| 21 | `21-可控记忆候选与写入审核验证.md` | 验证 memory candidate、确认写入、scope 和撤销 | P1 |

## 最终判断

这 5 个场景说明，我们的平台不能只做“固定 Workflow 的 Agent 工作台”。

真正要成立的产品形态是：

```text
用户通过对话提出复杂业务目标
  -> AI 先探索和执行一次
  -> 平台记录完整过程
  -> 成功过程沉淀成可复用 Workflow / Skill / Tool 能力
  -> 审核发布后变成稳定商业流程
```

这也回答了最关键的问题：

```text
Workflow 可以自动创建和迭代，但只能自动生成 draft。
Workflow 必须像 Agent 一样审核、测试、发布、回滚。
不同节点可以调用不同模型，而且应该作为 Workflow/Agent/Team 版本快照的一部分。
外部研究、图片生成、Shopify 写入都可以做，但必须通过 Tool Gateway、资产审核、来源证据和人工审批控制风险。
```

下一步建议优先写：

1. `14-动态对话探索与Workflow沉淀验证.md`
2. `15-竞品链接到Shopify上架全链路验证.md`
3. `17-Workflow自动创建迭代审核发布验证.md`

这三篇会直接决定平台是不是能从“执行预设任务”升级为“把用户的业务过程沉淀成能力”。
