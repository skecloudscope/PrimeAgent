---
name: agno-agent-capability-eval
description: Use when testing one Agent capability case at a time, especially PrimeAgent/Agno on localhost:3000 versus a real Codex client conversation transcript. Requires visible query submission, transcript capture, evidence, and a written case record under /Users/ske/PrimeAgent/需求文档 without changing product code.
---

# Agno Agent Capability Eval

Use this skill for **one case per run**. It is for real Agent capability testing, not bulk evaluation.

## Skill Input

The user should provide, or you must derive, these fields:

- `case_id`: stable id, for example `manual-fecify-upload-0001`.
- `scenario_name`: short Chinese name.
- `query`: the exact user request to test.
- `target_ui`: usually `http://localhost:3000`.
- `record_file`: default and canonical path is `/Users/ske/PrimeAgent/需求文档/Agent能力摸盘记录.md`.
- `risk_policy`: `read_only`, `draft_only`, or `approval_required`.
- Optional `codex_client_transcript`: a real transcript from the Codex client conversation, usually provided by the user. This must be actual client behavior, not a predicted baseline.
- Optional: expected behavior, success criteria, failure criteria, screenshots/artifacts to inspect.

If the user only gives a query, create `scenario_name`, `case_slug`, and `case_id` from the query before doing any browser work.

## Non-Negotiables

- Test exactly one case, then stop and report the result.
- Do not produce or update 25-case checkpoints.
- Do not change product code during the test.
- Every tested case must be written to a file under `/Users/ske/PrimeAgent/需求文档/`.
- Agent capability cases must be written to `/Users/ske/PrimeAgent/需求文档/Agent能力摸盘记录.md` unless the user explicitly gives another absolute PrimeAgent 需求文档 path.
- Do not write records relative to the current workspace. The current shell cwd may be another project; always use the absolute PrimeAgent path.
- Record the conversation content, not only a summary or pass/fail.
- Codex comparison must use a real Codex client transcript. Do not invent, simulate, or "baseline judge" what Codex would do.
- If no real Codex client transcript is available, mark Codex comparison as `缺失 / 待补充` and do not draw Agno-vs-Codex conclusions.
- Do not invent tool ability, external platform results, login state, API access, writes, uploads, sends, deletes, or publishing.
- Do not treat PrimeAgent mock, wrapper, static UI, placeholder UI, or descriptor-only state as Agno-native capability.
- External writes and high-risk actions stop at plan/approval. Never execute them during eval.
- Missing URL, file, attachment, login state, API key, OAuth, MCP server, platform permission, or UI access is a blocker to record.
- If `localhost:3000` does not show a submitted query or request evidence, record the UI test as blocked or failed. Do not replace it with a backend-only AgentOS run unless explicitly marked as fallback evidence.
- Before judging Agent capability, verify that `localhost:3000` has discovered a real AgentOS agent and model. If the page shows `请求失败`, `Detecting Environment`, `没有从 Agno AgentOS 发现可运行 Agent`, `模型 选择模型`, or `还没有可用模型 Provider`, treat this as runtime discovery instability, not an Agent capability result.
- A browser automation conflict is a test-harness problem, not an Agent capability result. If Playwright MCP reports `Browser is already in use`, clear only the stale Playwright MCP browser instance and retry once before marking UI automation blocked.

## Required Files

Read only what is needed:

- `/Users/ske/PrimeAgent/Agno能力摸盘记录模板.md`
- `/Users/ske/PrimeAgent/开发铁律.md`
- The target record file under `/Users/ske/PrimeAgent/需求文档/`
- Existing nearby case records if needed for format consistency

Use the existing textual record style. Do not introduce a new schema unless the user asks.

## One-Case Execution Flow

Announce progress in this exact shape:

`正在测试 <case_id>: <scenario_name>，结果会写入 <record_file>`

Then run these steps:

1. **Prepare**
   - Copy the exact `query`.
   - Derive the test identity before execution:
     - `scenario_name`: a concise Chinese name based on the query. It should describe the business target, not the tool. Example: query about Fecify product upload becomes `Fecify 产品上传逻辑对接能力摸盘`.
     - `case_slug`: short ASCII slug based on the scenario, for example `fecify-product-upload`.
     - `case_id`: `<case_slug>-YYYYMMDD-HHMMSS` unless the user provided a specific id. Avoid generic names like `manual-fecify-upload-0003` when a better query-derived slug is available.
     - `record_heading`: `## <case_id>：<scenario_name>`.
   - Verify the record target:
     - For Agent cases, use exactly `/Users/ske/PrimeAgent/需求文档/Agent能力摸盘记录.md`.
     - If the file does not exist, create it with a short title, then append the case.
     - Before finalizing, read back the heading by `rg <case_id> /Users/ske/PrimeAgent/需求文档/Agent能力摸盘记录.md`.
     - If the case was accidentally written elsewhere, move/copy the record into the canonical file and mention the correction.
   - Identify risk policy and external-write boundary.
   - Open or inspect `target_ui`.
   - Prepare browser automation for `localhost:3000`:
     - Prefer the Codex in-app Browser plugin when available.
     - If using Playwright MCP and it fails with `Browser is already in use for .../ms-playwright/mcp-chrome-*`, do not immediately mark the case blocked.
     - Inspect the stale automation browser process with a read-only command such as `ps aux | rg 'ms-playwright|mcp-chrome'`.
     - Kill only the Playwright MCP automation browser/profile process that owns the reported `mcp-chrome-*` profile. Do not kill `next dev`, `node` on port 3000, Python/AgentOS on port 7777, user Chrome, or any unrelated process.
     - Retry browser automation once after cleanup.
     - Record the cleanup as test-harness evidence: `Playwright MCP occupied; stale automation browser killed; retried once`.
     - If the conflict remains after one cleanup, stop the UI part as `阻塞` and record the exact blocker.
   - Verify runtime discovery before submitting:
     - UI should show a concrete agent such as `PrimeAgent Orchestrator`.
     - UI should show a concrete environment such as `Sandbox` or `Production`.
     - UI should show a concrete model such as `gpt-5.5`.
     - If the UI is stuck on `Detecting Environment`, has no agent, or has no model, check AgentOS directly with `/agents` and `/config`.
     - If AgentOS directly returns agents/models but the UI does not, reload `localhost:3000` once and re-check.
     - If reload fixes the page, record this as `runtime discovery recovered after reload` evidence, then continue the case.
     - If reload does not fix it, stop the case as `阻塞` and record the UI/runtime discovery blocker. Do not continue with Agent capability scoring.

2. **PrimeAgent/Agno UI Conversation**
   - Submit the exact `query` through the visible query input on `localhost:3000` when possible.
   - Capture evidence that the UI really submitted the request:
     - screenshot path, or
     - visible conversation text, or
     - browser/network request, or
     - AgentOS run id/session id linked to the UI action.
   - Record the full Agno-side transcript:
     - user query
     - assistant reply
     - follow-up turns, if any
     - number of rounds until stop/solution/blocker
   - If UI submission is impossible, record the exact blocker and evidence. A direct AgentOS API run may be used only as fallback and must be labeled `UI blocked, API fallback`.

3. **Codex Client Transcript**
   - "Codex" means the Codex client conversation that the user normally uses, not an API, not a hypothetical baseline, and not your eval-constrained reasoning.
   - Preferred source: the user provides the Codex client transcript, including timestamps, elapsed time, visible tool/search/command activity, final answer, and whether files were changed.
   - If a real accessible Codex duplicate/client window exists and the user explicitly wants you to operate it, submit the same exact `query` there and capture its transcript.
   - If the only available context is this eval conversation, do not treat your own safe eval summary as Codex client behavior.
   - Record Codex client evidence exactly:
     - user query
     - assistant/client reply
     - visible progress text, searches, commands, file reads/writes, browser actions, or artifacts
     - start time, end time or elapsed time
     - number of user/assistant turns until stop/solution/blocker
     - whether it changed files or only planned
   - If no real Codex client transcript is available, write `Codex 客户端 transcript 缺失，待用户补充` and skip Codex comparison scoring for this case.

4. **Compare**
   - Compare whether each side solved the user's target.
   - Count rounds for each side.
   - Note whether either side asked for the right missing inputs.
   - Note whether either side crossed high-risk write boundaries.
   - Only compare Agno vs Codex when a real Codex client transcript exists.
   - If Codex transcript is missing, compare status must be `不可比较：缺少真实 Codex 客户端 transcript`.
   - Mark the case as `通过`, `失败`, `部分通过`, or `阻塞`.

5. **Write Record**
   - Append the case record to the target file under `/Users/ske/PrimeAgent/需求文档/`.
   - If the case reveals a serious independent requirement, also create or update a focused `需求-*.md` file under the same directory.
   - Optionally append a one-line summary to `/Users/ske/PrimeAgent/需求文档/Agno与Codex对比记录.md` if that file already exists and the user wants comparison aggregation.

## Case Record Fields

Write plain Chinese text with these fields:

- 测试编号
- 场景名称
- 原始请求
- 风险策略
- 为什么测试这个场景
- 期望验证什么
- PrimeAgent/Agno 测试入口
- PrimeAgent/Agno 请求提交证据
- PrimeAgent/Agno 对话记录
- PrimeAgent/Agno 轮次
- Codex 测试入口
- Codex 请求提交证据
- Codex 客户端 transcript 来源：用户提供 / 可访问客户端实测 / 缺失待补充
- Codex 客户端对话记录
- Codex 客户端可见执行过程：搜索、命令、文件读写、浏览器动作、artifact
- Codex 客户端是否改代码
- Codex 客户端耗时
- Codex 轮次
- 两者差异
- 是否解决用户目标
- 使用了哪些工具或能力
- Agno 是否使用原生能力
- Agno 暴露出的能力边界
- PrimeAgent 是否需要薄适配
- 是否涉及高风险或外部写入
- 本条结果：通过 / 失败 / 部分通过 / 阻塞
- 失败或阻塞原因
- 证据：run id、session id、日志、截图、artifact、接口响应、源码路径等
- 是否产生新需求或能力缺口
- 对后续开发模型的提醒
- 下一步建议

## Result Standards

- `通过`: UI or approved executable target really ran the query, transcript is recorded, answer reaches the expected safe outcome, and evidence exists.
- `部分通过`: The model reasoned correctly but some required surface was blocked, such as UI submission, third-party API, attachment, login, or tool permission.
- `阻塞`: The test cannot proceed because a required surface is unavailable.
- `失败`: The model gives unsafe, fabricated, irrelevant, or materially incomplete behavior despite having enough input.
- Codex comparison status is separate from Agno result. If Codex client transcript is missing, do not mark Codex as passed/failed; mark it `待补充`.

## Final Response To User

Keep it short:

- Say which case was tested.
- Say where the record was written.
- Give Agno rounds and result.
- Give Codex rounds and result.
- Name blockers honestly.
- Give the next concrete action.
