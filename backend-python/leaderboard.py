"""Leaderboard lokal berbasis SQLite."""

import sqlite3
from pathlib import Path

_DB = Path(__file__).parent / "data" / "leaderboard.db"


def _query(sql: str, params: tuple = (), *, fetch: str | None = None):
    con = sqlite3.connect(_DB)
    try:
        cur = con.execute(sql, params)
        if fetch == "one":
            return cur.fetchone()
        if fetch == "all":
            return cur.fetchall()
        con.commit()
        return None
    finally:
        con.close()


def _init() -> None:
    _query(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            words INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )


_init()


def add_score(name: str, score: int, words: int) -> int:
    _query(
        "INSERT INTO scores (name, score, words) VALUES (?, ?, ?)",
        (name[:20], score, words),
    )
    better = _query(
        "SELECT COUNT(*) FROM scores WHERE score > ?", (score,), fetch="one"
    )[0]
    return better + 1


def top(limit: int = 10) -> list[dict]:
    rows = _query(
        """
        SELECT name, score, words, created_at FROM scores
        ORDER BY score DESC, created_at ASC LIMIT ?
        """,
        (limit,),
        fetch="all",
    )
    return [
        {"name": r[0], "score": r[1], "words": r[2], "created_at": r[3]} for r in rows
    ]
