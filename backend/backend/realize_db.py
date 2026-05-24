"""PostgreSQL helpers for drafts / history / search_results (session API)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator

import psycopg2
from psycopg2.extras import Json


def _conn_params() -> dict[str, Any]:
    return {
        "host": os.environ.get("PGHOST", "localhost"),
        "port": int(os.environ.get("PGPORT", "5432")),
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
