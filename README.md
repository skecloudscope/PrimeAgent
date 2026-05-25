# PrimeAgent

PrimeAgent is a local Agno OS style web console.

The boundary is intentional:

- The frontend mirrors the official `os.agno.com` shell: Chat, Sessions, Traces, Studio, Memory, Knowledge, Metrics, Evaluation, Approvals, and Scheduler.
- The browser calls the same-origin `/api/agno/*` bridge.
- The bridge transparently forwards to the AgentOS API from `agent-platform` on port `8000`.
- The frontend only displays Agents, Teams, Workflows, sessions, traces, metrics, and other resources returned by AgentOS native endpoints. It does not invent PrimeAgent agents or custom capability names.

## Docker

From the repo root:

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- AgentOS config: http://localhost:8000/config
- AgentOS docs: http://localhost:8000/docs

The root compose uses the same backend shape as `agent-platform/compose.yaml`: Postgres plus `agent-platform` AgentOS on port `8000`, with the frontend bridge pointing to `http://agentos-api:8000` inside Docker.

If you already have `agent-platform/compose.yaml` running on port `8000`, run only the frontend locally:

```bash
cd frontend
INTERNAL_AGNO_AGENTOS_BASE_URL=http://localhost:8000 NEXT_PUBLIC_AGNO_AGENTOS_BASE_URL=/api/agno npm run dev
```

## Native AgentOS Mapping

- Chat targets: `/config`, `/agents`, `/teams`, `/workflows`
- Agent run: `/agents/{agent_id}/runs`
- Team run: `/teams/{team_id}/runs`
- Workflow run: `/workflows/{workflow_id}/runs`
- Sessions: `/sessions`
- Traces: `/traces`
- Memory: `/memories`
- Knowledge: `/knowledge/config`
- Metrics: `/metrics`
- Evaluation: `/evals`
- Approvals: `/approvals`
- Scheduler: `/schedules`
- Studio surfaces: `/components`, `/registry`
