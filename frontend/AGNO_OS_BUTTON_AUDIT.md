# Agno OS Button Audit

Scope: PrimeAgent frontend at `http://localhost:3000`, backed by local AgentOS at `http://localhost:8000`.

Official `https://os.agno.com` note: using the Codex in-app browser directly, the official logged-in session was accessible and survived navigation between `https://os.agno.com` and `http://localhost:3000`. A logged-in official module/control snapshot is stored at `frontend/official-agno-audit.json`.

## Architecture Alignment

Agno docs describe AgentOS as the service runtime that provides streaming agent APIs, session storage, history injection, tracing, auth, and operational APIs. The UI connects from the browser to AgentOS instead of reimplementing agent behavior in a separate backend.

The official `os.agno.com` public bundle exposes the same AgentOS route families: `/chat`, `/sessions`, `/metrics`, `/knowledge`, `/evaluation`, `/memory`, `/traces`, `/scheduler`, `/approvals`, `/studio`, `/settings`, plus native run and management endpoints such as `/agents/{agent_id}/runs`, `/teams/{team_id}/runs`, `/memories`, `/schedules`, and `/knowledge/content`.

PrimeAgent follows that shape:

- Frontend bridge: `/api/agno/*`
- Backend target: AgentOS `/agents`, `/teams`, `/workflows`, `/sessions`, `/traces`, `/memories`, `/knowledge`, `/metrics`, `/eval-runs`, `/approvals`, `/schedules`
- Chat runs:
  - Agents: `POST /agents/{agent_id}/runs`
  - Teams: `POST /teams/{team_id}/runs`
  - Workflows: `POST /workflows/{workflow_id}/runs`
- Session continuity is handled by AgentOS `session_id`, not frontend history stuffing.

## Module Order

PrimeAgent currently exposes:

1. Home
2. Chat
3. Sessions
4. Traces
5. Studio
6. Memory
7. Knowledge
8. Metrics
9. Evaluation
10. Approvals
11. Scheduler
12. Settings

## Verified Buttons And Actions

| Module | Button / Control | Real action |
| --- | --- | --- |
| Shell | `agent-platform` | `GET /health`, `GET /info`, `GET /models` |
| Shell | `REFRESH` | Reloads `/config` and current module endpoints |
| Home | Agent `CHAT` | Opens the native AgentOS agent in Chat |
| Home | Agent `CONFIG` | `GET /agents/{agent_id}` |
| Home | `ALL OSES` | Shows local AgentOS runtime metadata from `/config` |
| Home | `EDIT` | Opens local Settings / OS & Security |
| Home | `DELETE` | Shows explicit local-runtime limitation; local AgentOS has no DELETE OS endpoint |
| Home | `SWITCH TO OS` | Opens local Chat for the current AgentOS |
| Chat | Agent / Team / Workflow selector | Selects native `/config` components only |
| Chat | `New AgentOS session` | Creates a fresh frontend session id for AgentOS |
| Chat | `Copy AgentOS base URL` | Copies bridge endpoint |
| Chat | `Attach files` | Adds files to the next multipart AgentOS run |
| Chat | Paste image | Adds pasted image to the next multipart AgentOS run |
| Chat | Enter / Send | `POST /agents/{id}/runs`, `POST /teams/{id}/runs`, or `POST /workflows/{id}/runs` |
| Chat | `Copy transcript` | Copies rendered transcript |
| Chat | `View AgentOS session` | `GET /sessions/{session_id}` |
| Chat | `Cancel current run` | `POST /{agents,teams,workflows}/{id}/runs/{run_id}/cancel` |
| Sessions | `AGENTS API` | `GET /agents` |
| Sessions | `TEAMS API` | `GET /teams` |
| Sessions | `WORKFLOWS API` | `GET /workflows` |
| Sessions | `DETAIL` | `GET /sessions/{session_id}` |
| Sessions | `RUNS` | `GET /sessions/{session_id}/runs` |
| Sessions | `RENAME` | `POST /sessions/{session_id}/rename` |
| Sessions | `DELETE` | `DELETE /sessions/{session_id}` |
| Traces | `SEARCH` | `GET /traces` or `POST /traces/search` when filtered |
| Traces | `FILTER SCHEMA` | `GET /traces/filter-schema` |
| Traces | `SESSION STATS` | `GET /trace_session_stats` |
| Traces | `DETAIL` | `GET /traces/{trace_id}` |
| Studio | Agents / Teams / Workflows | Native components from `/config` |
| Studio | Registry | `GET /registry` |
| Studio | `CHAT` | Opens selected native component in Chat |
| Studio | `EDIT` | Registers / updates via `/components` where supported |
| Studio | `CONFIG` | `GET /components/{component_id}/configs` when registered |
| Studio | `Contact us` | Opens Agno support mail link, matching official AgentOS Studio |
| Studio | `Refresh Page` | Reloads local AgentOS config and current module endpoints |
| Memory | `TOPICS` | `GET /memory_topics` |
| Memory | `USER STATS` | `GET /user_memory_stats` |
| Memory | `OPTIMIZE PREVIEW` | `POST /optimize-memories` with `apply=false` |
| Memory | `Create memory` | `POST /memories` |
| Memory | `DETAIL` | `GET /memories/{memory_id}` |
| Memory | `EDIT` | `PATCH /memories/{memory_id}` |
| Memory | `DELETE` | `DELETE /memories/{memory_id}` |
| Knowledge | `CONFIG` | `GET /knowledge/config` |
| Knowledge | `SEARCH SAMPLE` | `POST /knowledge/search` |
| Knowledge | `UPLOAD CONTENT` | `POST /knowledge/content` |
| Knowledge | `DETAIL` | `GET /knowledge/content/{content_id}` |
| Knowledge | `STATUS` | `GET /knowledge/content/{content_id}/status` |
| Metrics | Month controls | `GET /metrics?starting_date=...&ending_date=...` |
| Metrics | `REFRESH METRICS` | `POST /metrics/refresh` |
| Metrics | `EXPORT` | Exports current metrics response |
| Evaluation | `Run Evaluation` | `POST /eval-runs` |
| Evaluation | `DETAIL` | `GET /eval-runs/{eval_run_id}` |
| Evaluation | `RENAME` | `PATCH /eval-runs/{eval_run_id}` |
| Approvals | `REFRESH` | `GET /approvals` |
| Approvals | `COUNT` | `GET /approvals/count` |
| Approvals | `DETAIL` | `GET /approvals/{approval_id}` |
| Approvals | `STATUS` | `GET /approvals/{approval_id}/status` |
| Approvals | `APPROVE` / `DENY` | `POST /approvals/{approval_id}/resolve` |
| Scheduler | `CREATE SCHEDULE` | `POST /schedules` |
| Scheduler | `DETAIL` | `GET /schedules/{schedule_id}` |
| Scheduler | `RUNS` | `GET /schedules/{schedule_id}/runs` |
| Scheduler | `EDIT` | `PATCH /schedules/{schedule_id}` |
| Scheduler | `TRIGGER` | `POST /schedules/{schedule_id}/trigger` |
| Scheduler | `Enable schedule` / `Disable schedule` | `POST /schedules/{schedule_id}/enable` or `/disable` |
| Scheduler | `DELETE` | `DELETE /schedules/{schedule_id}` |
| Settings | `LOAD /info` | `GET /info` |
| Settings | `LOAD /models` | `GET /models` |
| Settings | `VIEW /config` | Shows loaded `/config` |
| Settings | `COPY ENDPOINT` | Copies bridge endpoint |
| Settings | `VIEW DATABASES` | Shows `/config.databases` |
| Settings | AgentOS Name / ID / Endpoint / Security Key / Description / Tags / Custom Headers | Mirrors official OS & Security structure using local AgentOS runtime/env data |
| Settings | `SAVE` | Shows the local source-controlled settings location rather than pretending to mutate cloud settings |
| Settings | `DELETE AgentOS` | Shows explicit local-runtime limitation; local AgentOS has no DELETE OS endpoint |

## Expected Backend States

- `GET /knowledge/config` and `POST /knowledge/search` can return `400` when no knowledge instance is configured. That is a real AgentOS backend response.
- `POST /optimize-memories` can return `404` when the selected user has no memories. That is a real AgentOS backend response.
- Teams and workflows can be empty when `/config` contains no native teams/workflows.

## Image Input Verification

Verified with Playwright on the local frontend:

- File upload path:
  - Selected `/tmp/primeagent-normal-image.png`.
  - UI showed `primeagent-normal-image.png`.
  - Request was `POST /api/agno/agents/web-search/runs`.
  - Request content type was `multipart/form-data`.
  - AgentOS returned `200`.
  - The agent read the image text: `PrimeAgent image upload test`.
- Paste image path:
  - Dispatched a real PNG file through the textarea paste event as `pasted-primeagent-image.png`.
  - UI showed `pasted-primeagent-image.png`.
  - Request was `POST /api/agno/agents/web-search/runs`.
  - Request content type was `multipart/form-data`.
  - AgentOS returned `200`.
  - The agent read the image text: `PrimeAgent pasted image test`.

Screenshot: `/Users/ske/Documents/测试agno 2/primeagent-image-upload-verified.png`.

## Chat Page Replication Pass

Updated on 2026-05-24 for the Chat page only.

- Official screenshots and DOM:
  - `frontend/chat-qa/official-chat-before.png`
  - `frontend/chat-qa/official-chat-typed.png`
  - `frontend/chat-qa/official-chat-after-send.png`
- Local screenshots after this pass:
  - `frontend/chat-qa/local-chat-final2-before.png`
  - `frontend/chat-qa/local-chat-fixed-typed.png`
  - `frontend/chat-qa/local-chat-fixed-after-send.png`
- Removed the local-only Chat object side panel so messages use the full Chat canvas like official Agno OS.
- Changed Chat toolbar actions to official-style icon controls while preserving native actions:
  - config -> local target config modal
  - sessions -> native Sessions module
  - new session -> fresh AgentOS session id
  - copy/session/cancel/delete remain available where applicable
- Changed empty Chat state to `New Session` with official quick prompt layout.
- Changed the composer to official-style two-row layout: input on top, attach/options on the left, current AgentOS target chip and send on the right.
- Verified at `768x982`: no object panel, no horizontal overflow, quick prompts visible after `/config` loads, and the local AgentOS run still posts to the native run endpoint.

## Official Safe Click Audit

Updated on 2026-05-24 using the Codex in-app browser logged in to `https://os.agno.com`.

- Confirmed login survives navigation between official Agno OS and `http://localhost:3000`.
- Clicked through the official module order: Home, Chat, Sessions, Traces, Studio, Memory, Knowledge, Metrics, Evaluation, Approvals, Scheduler, Settings.
- Stored the full visible control snapshots and safe click outcomes in `frontend/official-agno-safe-click-audit.json`.
- Skipped official destructive or account-mutating controls: Home delete, Approvals `APPROVE` / `DENY`, Scheduler `Enable schedule`, Settings `SAVE` / `DELETE AgentOS`.
- Aligned local labels and controls to official UI wording where it matters: `View:All`, `All time`, `Create memory`, `Run Evaluation`, `Enable schedule`, `Disable schedule`, Studio `Contact us`, and Studio `Refresh Page`.

The in-app browser automation surface exposes DOM, screenshot, console, and interaction APIs, but it does not expose a DevTools Network panel. Backend alignment is therefore verified through the official visible behavior, the public AgentOS route families, and local OpenAPI-backed requests to `http://localhost:8000`.

## Docker Verification

The root `docker-compose.yml` now runs the local AgentOS API on `8000` and the frontend on `3000`.

- AgentOS container command: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- Frontend bridge target inside Docker: `INTERNAL_AGNO_AGENTOS_BASE_URL=http://agentos-api:8000`
- Health check: `GET http://localhost:8000/health`
- Frontend: `GET http://localhost:3000`
