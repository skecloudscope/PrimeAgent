from __future__ import annotations

from importlib import import_module
from typing import Any

from agno.os import AgentOS

from primeagent.runtime.db import build_db
from primeagent.runtime.settings import ensure_runtime_dirs, env, env_bool


def _load_list(module: Any | None, name: str) -> list[Any]:
    if module is None:
        return []
    value = getattr(module, name, [])
    if callable(value):
        value = value()
    if value is None:
        return []
    if not isinstance(value, list):
        raise TypeError(f"{name} from AGNO_RUNTIME_MODULE must be a list, got {type(value).__name__}")
    return value


def _load_runtime_module() -> Any | None:
    module_name = env("AGNO_RUNTIME_MODULE")
    if not module_name:
        return None
    return import_module(module_name)


ensure_runtime_dirs()

db = build_db()
runtime_module = _load_runtime_module()
agents = _load_list(runtime_module, "agents")
teams = _load_list(runtime_module, "teams")
workflows = _load_list(runtime_module, "workflows")
knowledge = _load_list(runtime_module, "knowledge")
interfaces = _load_list(runtime_module, "interfaces")

agent_os = AgentOS(
    id=env("AGNO_OS_ID", "agentos"),
    name=env("AGNO_OS_NAME", "Agno AgentOS"),
    description="Transparent AgentOS runtime loaded from the local Agno source tree.",
    db=db,
    agents=agents or None,
    teams=teams or None,
    workflows=workflows or None,
    knowledge=knowledge or None,
    interfaces=interfaces,
    a2a_interface=env_bool("PRIMEAGENT_ENABLE_A2A", True),
    enable_mcp_server=env_bool("PRIMEAGENT_ENABLE_MCP", False),
    tracing=env_bool("PRIMEAGENT_ENABLE_TRACING", True),
    scheduler=env_bool("PRIMEAGENT_ENABLE_SCHEDULER", True),
    scheduler_base_url=env("PRIMEAGENT_SCHEDULER_BASE_URL", "http://127.0.0.1:7777"),
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ],
    telemetry=False,
)

app = agent_os.get_app()


if __name__ == "__main__":
    agent_os.serve(app="primeagent.runtime.app:app", host="0.0.0.0", port=int(env("API_PORT", "7777")), reload=True)
