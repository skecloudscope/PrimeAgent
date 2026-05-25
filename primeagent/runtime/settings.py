from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("PRIMEAGENT_DATA_DIR", ROOT_DIR / "data")).resolve()
WORKSPACE_DIR = Path(os.getenv("PRIMEAGENT_WORKSPACE_DIR", DATA_DIR / "workspace")).resolve()
DB_FILE = Path(os.getenv("PRIMEAGENT_DB_FILE", DATA_DIR / "primeagent.db")).resolve()

load_dotenv(ROOT_DIR / ".env")


def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


def env_bool(name: str, default: bool = False) -> bool:
    value = env(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def ensure_runtime_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
