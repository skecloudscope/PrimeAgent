from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4

from app.schemas.chat import PlanDraft, PlanStep
from app.schemas.common import RiskLevel


@dataclass
class ConversationState:
    id: str
    goal_id: str
    tenant_id: str
    workspace_id: str
    user_id: str
    shop_id: Optional[str] = None
    intent: Optional[str] = None
    execution_mode: str = "exploration"
    known_inputs: dict = field(default_factory=dict)
    constraints: list[str] = field(default_factory=list)
    messages: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class OrchestratorDecision:
    message: str
    conversation_id: str
    conversation_goal_id: str
    plan_draft: Optional[PlanDraft]
    suggested_next_action: str
    needs_user_confirmation: bool
    audit_action: str
    audit_metadata: dict


class AgnoOrchestratorRuntime:
    """Generic Orchestrator capability that sits in the Agno runtime layer.

    This is intentionally framework-facing. The FastAPI service only passes
    tenant context and persists the decision; intent routing belongs here.
    """

    def decide(
        self,
        state: ConversationState,
        message: str,
        shop_id: Optional[str] = None,
    ) -> OrchestratorDecision:
        normalized = message.strip()
        state.messages.append({"role": "user", "content": normalized})
        if shop_id:
            state.shop_id = shop_id

        route = self._classify(normalized)
        self._merge_state(state, route, normalized)

        if route in {"create_skill", "create_agent", "create_mcp", "create_workflow"}:
            return self._capability_creation_plan(state, route)
        if route == "no_workflow":
            return self._exploration_ack(state)
        if route == "product_launch":
            return self._product_launch_plan(state)
        if route in {"listing", "writeback"}:
            return self._listing_plan(state, require_writeback=route == "writeback")
        if route == "competitor":
            return self._competitor_plan(state)
        if route == "product_research":
            return self._product_research_plan(state)
        if route == "exploration":
            return self._general_exploration_plan(state)

        return self._contextual_clarification(state)

    def _classify(self, message: str) -> str:
        text = message.lower()
        if self._contains_create_intent(text, ["skill", "技能"]):
            return "create_skill"
        if self._contains_create_intent(text, ["agent", "智能体", "助手", "专家"]):
            return "create_agent"
        if self._contains_create_intent(text, ["mcp", "connector", "连接器", "工具服务"]):
            return "create_mcp"
        if self._contains_create_intent(text, ["workflow", "工作流", "流程"]):
            return "create_workflow"
        if any(token in text for token in ["不要 workflow", "不做 workflow", "不做workflow", "先探索", "自由意图", "开放"]):
            return "no_workflow"
        if any(token in text for token in ["竞品", "竞对", "竞争对手", "链接", "对标"]):
            return "competitor"
        if any(token in text for token in ["选品", "爆品", "机会", "市场", "amazon", "google trends"]):
            return "product_research"
        if any(token in text for token in ["产品上架", "新品上架", "商品上架", "创建商品", "新产品", "新品"]):
            return "product_launch"
        if any(token in text for token in ["写回", "导入", "发布到 shopify", "同步到 shopify"]):
            return "writeback"
        if any(token in text for token in ["listing", "标题", "描述", "seo", "优化", "shopify"]):
            return "listing"
        if any(token in text for token in ["分析", "看看", "研究", "帮我做", "我想"]):
            return "exploration"
        return "unknown"

    def _contains_create_intent(self, text: str, targets: list[str]) -> bool:
        create_words = ["创建", "新增", "新建", "沉淀", "做一个", "生成一个", "配置一个"]
        return any(word in text for word in create_words) and any(target in text for target in targets)

    def _merge_state(self, state: ConversationState, route: str, message: str) -> None:
        if route != "unknown":
            state.intent = route
        product_id = self._extract_product_id(message)
        if product_id:
            state.known_inputs["product_id"] = product_id
        if "不要" in message or "不做" in message:
            state.constraints.append(message)
        if route == "no_workflow":
            state.execution_mode = "exploration"
        elif route.startswith("create_"):
            state.execution_mode = "capability_draft"
        elif route in {"listing", "writeback"} and state.execution_mode != "exploration":
            state.execution_mode = "workflow"

    def _exploration_ack(self, state: ConversationState) -> OrchestratorDecision:
        state.execution_mode = "exploration"
        return OrchestratorDecision(
            message=(
                "收到，我们先不固化 Workflow。我会按开放探索处理：先理解目标，逐步补齐输入，"
                "再选择 Skill、Tool、Agent 或 Team。只有流程反复稳定后，才建议沉淀 Workflow Skeleton 或 Workflow。"
            ),
            conversation_id=state.id,
            conversation_goal_id=state.goal_id,
            plan_draft=None,
            suggested_next_action="continue_exploration",
            needs_user_confirmation=False,
            audit_action="orchestrator.exploration_mode.selected",
            audit_metadata={"intent": state.intent, "execution_mode": state.execution_mode},
        )

    def _capability_creation_plan(self, state: ConversationState, route: str) -> OrchestratorDecision:
        capability_type = route.replace("create_", "")
        labels = {
            "skill": "Skill",
            "agent": "Agent",
            "mcp": "MCP / Connector",
            "workflow": "Workflow Draft",
        }
        capability_label = labels[capability_type]
        risk = RiskLevel.high if capability_type in {"mcp", "workflow"} else RiskLevel.medium
        plan = PlanDraft(
            id=f"pd_{uuid4().hex[:10]}",
            conversation_goal_id=state.goal_id,
            goal=f"创建 {capability_label} 草稿",
            known_inputs={"shop_id": state.shop_id or "shop_demo", **state.known_inputs},
            missing_inputs=["能力名称", "适用场景", "不适用场景", "输入输出边界"],
            assumptions=[
                "这里只创建 draft，不会自动发布到 active。",
                "需要测试、审核和权限确认后才能启用。",
            ],
            proposed_steps=[
                PlanStep(
                    id="define_boundary",
                    title="定义能力边界",
                    description="明确 when_to_use、not_when_to_use、输入、输出、风险和权限。",
                ),
                PlanStep(
                    id="draft_spec",
                    title="生成草稿规格",
                    description=f"生成 {capability_label} 的结构化草稿，进入 Capability Registry 的 draft 状态。",
                ),
                PlanStep(
                    id="review",
                    title="测试和审核",
                    description="准备 eval case、沙盒测试、人工审核，不自动发布。",
                    risk_level=risk,
                    requires_approval=True,
                ),
            ],
            required_capabilities=["capability_registry", "capability_draft_builder", "review_queue"],
            risk_level=risk,
        )
        return OrchestratorDecision(
            message=(
                f"可以，这不是业务 Workflow 执行任务，而是创建 {capability_label} 能力草稿。"
                "我会先收集能力边界，再生成 draft，默认不发布。"
            ),
            conversation_id=state.id,
            conversation_goal_id=state.goal_id,
            plan_draft=plan,
            suggested_next_action="confirm_capability_draft_plan",
            needs_user_confirmation=True,
            audit_action="orchestrator.capability_draft.plan_created",
            audit_metadata={"capability_type": capability_type, "plan_draft_id": plan.id},
        )

    def _product_launch_plan(self, state: ConversationState) -> OrchestratorDecision:
        plan = self._build_exploration_plan(
            state=state,
            goal="新品/商品上架开放探索",
            steps=[
                ("clarify_product", "确认商品输入", "收集商品来源、竞品链接、素材、目标市场、品牌规则和店铺。"),
                ("structure", "结构化上架资料", "生成 ProductDraft、SKU 草案、图片需求和页面模块建议。"),
                ("review_assets", "审查资产和合规", "检查标题、卖点、图片、素材授权和平台合规风险。"),
                ("choose_next", "选择下一步", "用户决定继续探索、沉淀 Skill/Agent/MCP，或转成可审批写回流程。"),
            ],
            capabilities=[
                "product_structuring_agent",
                "competitor_analysis_skill",
                "shopify_import_package_tool",
            ],
        )
        return self._plan_decision(
            state,
            plan,
            "产品上架信息还不够明确，我先按轻量 ExplorationRun 规划，不直接启动重 Workflow。",
        )

    def _listing_plan(self, state: ConversationState, require_writeback: bool) -> OrchestratorDecision:
        product_id = state.known_inputs.get("product_id", "mock_product_001")
        mode_note = "审批后写回 Shopify" if require_writeback else "先生成 ListingDiff，不自动写回"
        steps = [
            PlanStep(
                id="read_product",
                title="读取商品上下文",
                description="通过 Connector Gateway 读取商品快照、当前标题、描述和 SEO 字段。",
            ),
            PlanStep(
                id="listing_agent",
                title="生成 ListingDiff",
                description="调用 Listing Agent 输出结构化标题、描述、卖点和 SEO 建议。",
            ),
            PlanStep(
                id="review",
                title="人工审查",
                description="展示差异、风险和建议理由，由用户决定是否采用。",
                risk_level=RiskLevel.medium,
                requires_approval=True,
            ),
        ]
        if require_writeback:
            steps.append(
                PlanStep(
                    id="write_back",
                    title="受控写回",
                    description="审批通过后，通过 Tool Gateway 使用冻结 diff 写回 Shopify。",
                    risk_level=RiskLevel.high,
                    requires_approval=True,
                )
            )
        plan = PlanDraft(
            id=f"pd_{uuid4().hex[:10]}",
            conversation_goal_id=state.goal_id,
            goal=f"优化商品 Listing：{mode_note}",
            known_inputs={"product_id": product_id, "shop_id": state.shop_id or "shop_demo"},
            missing_inputs=[],
            assumptions=["如果用户后续说不写回，则保持 ExplorationRun，不进入 Full Workflow。"],
            proposed_steps=steps,
            required_capabilities=[
                "shopify_product_read_tool",
                "listing_optimization_agent",
                "listing_review_approval",
            ]
            + (["shopify_product_write_tool"] if require_writeback else []),
            risk_level=RiskLevel.high if require_writeback else RiskLevel.medium,
        )
        return OrchestratorDecision(
            message=f"理解了，当前意图是 Listing 优化，执行方式是 {state.execution_mode}。我先给你一个可确认计划。",
            conversation_id=state.id,
            conversation_goal_id=state.goal_id,
            plan_draft=plan,
            suggested_next_action="confirm_plan_draft",
            needs_user_confirmation=True,
            audit_action="orchestrator.plan_draft.created",
            audit_metadata={"plan_draft_id": plan.id, "intent": state.intent},
        )

    def _competitor_plan(self, state: ConversationState) -> OrchestratorDecision:
        plan = self._build_exploration_plan(
            state=state,
            goal="围绕竞品/竞对链接做开放探索",
            steps=[
                ("collect_sources", "整理竞品来源", "识别用户提供的链接、平台、市场和目标品类。"),
                ("research", "采集和结构化信息", "调用受控浏览/采集能力，沉淀卖点、价格、素材和页面结构。"),
                ("compare", "生成差异分析", "对比自有商品与竞品，输出机会点和风险。"),
                ("sediment", "沉淀能力候选", "根据执行证据建议沉淀 Skill、Tool 或 Workflow Skeleton。"),
            ],
            capabilities=["browser_research_tool", "competitor_analysis_skill", "product_structuring_agent"],
        )
        return self._plan_decision(state, plan, "竞品研究不是固定 Workflow，我会先按 ExplorationRun 思路规划。")

    def _product_research_plan(self, state: ConversationState) -> OrchestratorDecision:
        plan = self._build_exploration_plan(
            state=state,
            goal="开放式选品与市场机会研究",
            steps=[
                ("clarify_market", "确认市场和约束", "收集目标国家、价格带、品类、供应链和投放约束。"),
                ("external_signals", "获取外部信号", "按需申请 Google、Amazon、趋势、评论等受控研究能力。"),
                ("score", "生成候选评分", "用结构化指标筛选机会产品和风险产品。"),
                ("next_action", "建议下一步动作", "输出投放、上架、素材或继续研究建议。"),
            ],
            capabilities=["product_research_skill", "market_signal_connector", "opportunity_scoring_agent"],
        )
        return self._plan_decision(state, plan, "选品是开放探索任务，我会先做可调整的研究计划，不默认固化 Workflow。")

    def _general_exploration_plan(self, state: ConversationState) -> OrchestratorDecision:
        plan = self._build_exploration_plan(
            state=state,
            goal="开放式跨境电商任务探索",
            steps=[
                ("understand", "理解目标", "整理已知输入、缺失信息、约束和风险。"),
                ("retrieve", "检索能力", "从 Capability Registry 中找合适 Skill、Tool、Agent 或 Team。"),
                ("execute", "小步执行", "先做低风险读取、分析或草稿生成。"),
                ("review", "确认下一步", "让用户决定继续探索、审批执行或沉淀能力。"),
            ],
            capabilities=["orchestrator", "capability_retrieval", "exploration_run"],
        )
        return self._plan_decision(state, plan, "我先按自由意图探索，不会反复问同一个问题。")

    def _contextual_clarification(self, state: ConversationState) -> OrchestratorDecision:
        if state.intent:
            return OrchestratorDecision(
                message=(
                    f"我会把这句话补充到当前 {state.intent} 目标里。你可以继续补充限制、数据来源、"
                    "是否允许外部研究、是否要写回，或者直接让我生成计划。"
                ),
                conversation_id=state.id,
                conversation_goal_id=state.goal_id,
                plan_draft=None,
                suggested_next_action="continue_conversation",
                needs_user_confirmation=False,
                audit_action="orchestrator.context_updated",
                audit_metadata={"intent": state.intent},
            )
        return OrchestratorDecision(
            message=(
                "我可以按自由意图接住你的目标。你可以直接说：要分析竞品、做选品、优化 Listing、"
                "创建 Skill/Agent/MCP/Workflow，或者先探索不做 Workflow。"
            ),
            conversation_id=state.id,
            conversation_goal_id=state.goal_id,
            plan_draft=None,
            suggested_next_action="clarify_goal",
            needs_user_confirmation=False,
            audit_action="orchestrator.clarification.required",
            audit_metadata={"reason": "no_intent"},
        )

    def _build_exploration_plan(
        self,
        state: ConversationState,
        goal: str,
        steps: list[tuple[str, str, str]],
        capabilities: list[str],
    ) -> PlanDraft:
        return PlanDraft(
            id=f"pd_{uuid4().hex[:10]}",
            conversation_goal_id=state.goal_id,
            goal=goal,
            known_inputs={"shop_id": state.shop_id or "shop_demo", **state.known_inputs},
            missing_inputs=[],
            assumptions=["当前按 ExplorationRun 处理，不默认发布或执行 Full Workflow。"],
            proposed_steps=[
                PlanStep(id=step_id, title=title, description=description)
                for step_id, title, description in steps
            ],
            required_capabilities=capabilities,
            risk_level=RiskLevel.medium,
        )

    def _plan_decision(self, state: ConversationState, plan: PlanDraft, message: str) -> OrchestratorDecision:
        return OrchestratorDecision(
            message=message,
            conversation_id=state.id,
            conversation_goal_id=state.goal_id,
            plan_draft=plan,
            suggested_next_action="confirm_plan_draft",
            needs_user_confirmation=True,
            audit_action="orchestrator.plan_draft.created",
            audit_metadata={"plan_draft_id": plan.id, "intent": state.intent, "execution_mode": state.execution_mode},
        )

    def _extract_product_id(self, message: str) -> Optional[str]:
        for token in message.split():
            if token.startswith("gid://") or token.startswith("prod_"):
                return token
        return None
