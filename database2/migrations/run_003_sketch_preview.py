"""One-off runner for 003_history_sketch_preview.sql (uses backend realize_db settings)."""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend" / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from realize_db import get_connection  # noqa: E402

MIGRATION = Path(__file__).resolve().parent / "003_history_sketch_preview.sql"


def main() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql)
        cur.execute(
            """
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'history' AND column_name = 'sketch_preview_url'
            """
        )
        row = cur.fetchone()
    if not row:
        raise SystemExit("Migration ran but sketch_preview_url column was not found.")
    print("Migration OK: history.sketch_preview_url exists")
    print(f"  type={row[1]}, default={row[2]}")


if __name__ == "__main__":
    main()
