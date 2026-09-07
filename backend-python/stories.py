"""Penyimpanan cerita anggota English Club dalam SQLite."""

import sqlite3
from pathlib import Path

_DB = Path(__file__).parent / "data" / "leaderboard.db"


def _query(sql: str, params: tuple = (), *, fetch: str | None = None):
    con = sqlite3.connect(_DB)
    try:
        cur = con.execute(sql, params)
        if fetch == "all":
            return cur.fetchall()
        con.commit()
        return None
    finally:
        con.close()


def _init() -> None:
    _query(
        """
        CREATE TABLE IF NOT EXISTS member_stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            batch TEXT NOT NULL,
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )


_init()


def add_story(name: str, batch: str, comment: str) -> dict:
    _query(
        "INSERT INTO member_stories (name, batch, comment) VALUES (?, ?, ?)",
        (name[:40], batch[:30], comment[:220]),
    )
    return {"name": name[:40], "batch": batch[:30], "comment": comment[:220]}


def latest(limit: int = 100) -> list[dict]:
    rows = _query(
        """
        SELECT name, batch, comment FROM member_stories
        ORDER BY id DESC LIMIT ?
        """,
        (limit,),
        fetch="all",
    )
    return [{"name": row[0], "batch": row[1], "comment": row[2]} for row in rows]
