from __future__ import annotations

from agno.db.sqlite import SqliteDb

from primeagent.runtime.settings import DB_FILE


def build_db() -> SqliteDb:
    return SqliteDb(
        id="agentos-sqlite",
        db_file=str(DB_FILE),
        session_table="agentos_sessions",
        memory_table="agentos_memory",
        metrics_table="agentos_metrics",
        eval_table="agentos_evals",
        traces_table="agentos_traces",
        spans_table="agentos_spans",
        knowledge_table="agentos_knowledge",
        schedules_table="agentos_schedules",
        schedule_runs_table="agentos_schedule_runs",
        approvals_table="agentos_approvals",
    )
