"""PostgreSQL helpers for drafts / history / search_results (session API)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import Json

# Load backend/backend/.env (override Windows PG* vars that point at wrong Postgres on 5432).
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


def _conn_params() -> dict[str, Any]:
    return {
        # 127.0.0.1 avoids localhost → ::1 hitting a different Postgres than Docker on 5433.
        "host": os.environ.get("PGHOST", "127.0.0.1"),
        "port": int(os.environ.get("PGPORT", "5433")),
        "dbname": os.environ.get("PGDATABASE", "fyp_clothing_db"),
        "user": os.environ.get("PGUSER", "postgres"),
        "password": os.environ.get("PGPASSWORD", "my126403"),
    }


@contextmanager
def get_connection(*, autocommit: bool = True) -> Generator[psycopg2.extensions.connection, None, None]:
    conn = psycopg2.connect(**_conn_params())
    try:
        yield conn
        if autocommit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def json_param(obj: Any) -> Json:
    """Wrap dict/list for JSONB columns."""
    return Json(obj)
