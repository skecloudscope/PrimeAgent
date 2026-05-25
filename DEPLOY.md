# PrimeAgent Docker Deployment

PrimeAgent uses separate Docker Compose files for local macOS development and Linux production deployment.

## macOS development

Use this on the development machine when you want hot reload and direct Agno source overrides.

```bash
cd /Users/ske/PrimeAgent
docker compose -f docker-compose.dev.yml up -d --build
```

The dev compose file mounts:

- `./agent-platform:/app`
- `./platform/agno/libs/agno/agno:/usr/local/lib/python3.12/site-packages/agno`
- `./frontend:/app`

This is intentional for local development, but it is fragile for production because missing host paths can override container code with empty directories.

## Linux production

Copy the whole `PrimeAgent` directory to the Linux server, including:

- `agent-platform/`
- `frontend/`
- `platform/agno/`
- `Dockerfile.agentos.prod`
- `Dockerfile.frontend.prod`
- `docker-compose.prod.yml`
- `.env`

Start with:

```bash
cd /path/to/PrimeAgent
COMPOSE_BAKE=false docker compose -f docker-compose.prod.yml up -d --build
```

The production compose file does not mount application source code. It builds images that contain:

- AgentOS app code from `agent-platform/`
- Agno source code from `platform/agno/libs/agno/agno`
- Built Next.js frontend from `frontend/`

## Ports

Defaults:

- Frontend: `3000`
- AgentOS API: `8000`
- Postgres: `5432`

Override them with environment variables:

```bash
FRONTEND_PORT=80 AGENTOS_PORT=8000 POSTGRES_PORT=5432 docker compose -f docker-compose.prod.yml up -d --build
```

## Sanity checks

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS http://localhost:8000/health
curl -I http://localhost:3000
```
