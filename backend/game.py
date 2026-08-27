"""Sesi permainan Word Hunt bebas — grid 5×5, swipe kata apa saja yang valid."""

import secrets
import time
from dataclasses import dataclass, field

try:
    from . import grid as grid_mod
    from .dictionary import LETTER_VALUES, dictionary
except ImportError:
    import grid as grid_mod
    from dictionary import LETTER_VALUES, dictionary

BASE_TIME = 60.0
MAX_TIME = 60.0
SESSION_TTL = 3 * 3600.0
COMBO_CAP = 10
MIN_WORD_LEN = 3


@dataclass
class Session:
    id: str
    grid: list[str]
    score: int = 0
    combo: int = 1
    best_combo: int = 1
    found: dict[str, tuple[int, ...]] = field(default_factory=dict)
    words_found: int = 0
    longest_word: str = ""
    ends_at: float = 0.0
    touched: float = field(default_factory=time.monotonic)


_sessions: dict[str, Session] = {}


def _purge() -> None:
    now = time.monotonic()
    stale = [sid for sid, s in _sessions.items() if now - s.touched > SESSION_TTL]
    for sid in stale:
        _sessions.pop(sid, None)


def create_session() -> Session:
    _purge()
    session = Session(id=secrets.token_urlsafe(12), grid=grid_mod.generate_grid())
    session.ends_at = time.monotonic() + BASE_TIME
    _sessions[session.id] = session
    return session


def get_session(sid: str) -> Session | None:
    session = _sessions.get(sid)
    if session:
        session.touched = time.monotonic()
    return session


def _time_bonus(length: int, combo: int) -> float:
    # waktu tidak bisa ditambah sama sekali — mode kompetitif murni 30 detik
    return 0.0


def submit_word(session: Session, path: list[int]) -> dict:
    def fail(reason: str) -> dict:
        session.combo = 1
        return {"ok": False, "reason": reason}

    if time.monotonic() > session.ends_at:
        return fail("expired")
    if len(path) < MIN_WORD_LEN:
        return fail("too_short")
    if len(set(path)) != len(path) or any(i < 0 or i >= grid_mod.CELLS for i in path):
        return fail("invalid_path")
    for a, b in zip(path, path[1:]):
        if b not in grid_mod.NEIGHBORS[a]:
            return fail("invalid_path")

    word = "".join(session.grid[i] for i in path)
    if not dictionary.is_word(word):
        return fail("not_a_word")
    if word in session.found:
        return fail("already_found")

    combo_applied = session.combo

    # Scoring: nilai huruf × panjang × 2 × combo + fever bonus
    letter_sum = sum(LETTER_VALUES.get(ch, 1) for ch in word)
    base_points = letter_sum * len(word) * 2
    fever_bonus = (combo_applied - 2) * 50 if combo_applied >= 3 else 0
    points = (base_points * combo_applied) + fever_bonus

    bonus = 0.0  # tidak ada bonus waktu

    pre = session.grid[:]
    changed = grid_mod.refill_cells(session.grid, sorted(set(path)))

    # Kadaluarsakan kata tercatat yang hurufnya ikut berubah setelah refill,
    # sehingga kata yang muncul lagi di lokasi baru bisa ditemukan kembali.
    session.found = {
        w: p for w, p in session.found.items() if all(session.grid[i] == pre[i] for i in p)
    }
    session.found[word] = tuple(path)

    session.combo = min(session.combo + 1, COMBO_CAP)
    session.best_combo = max(session.best_combo, combo_applied)
    session.score += points
    session.words_found += 1
    if len(word) > len(session.longest_word):
        session.longest_word = word
    # waktu tidak ditambah — ends_at tetap

    return {
        "ok": True,
        "word": word,
        "points": points,
        "combo": combo_applied,
        "combo_next": session.combo,
        "fever": combo_applied >= 3,
        "time_bonus": bonus,
        "score": session.score,
        "cells": [{"index": i, "letter": session.grid[i]} for i in sorted(changed)],
        "remaining": round(max(0.0, session.ends_at - time.monotonic()), 2),
    }


def stats(session: Session) -> dict:
    return {
        "score": session.score,
        "words_found": session.words_found,
        "longest_word": session.longest_word,
        "best_combo": session.best_combo,
    }
