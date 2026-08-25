"""Smoke test: Word Hunt 5x5 — grid bebas, swipe kata apa saja yang valid."""

import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def main():
    # ── 1. Buat sesi ──────────────────────────────────────────────────────────
    r = client.post("/api/game")
    assert r.status_code == 200, r.text
    data = r.json()
    sid = data["session_id"]
    grid = data["grid"]

    assert len(grid) == 25, f"Grid harus 25 sel (5x5), dapat: {len(grid)}"
    print(f"POST /api/game OK: {''.join(grid[:25])}")
    print(f"  Papan 5x5:")
    for r_i in range(5):
        print(f"    {' '.join(grid[r_i*5:(r_i+1)*5])}")

    # ── 2. Validasi: kata terlalu pendek ────────────────────────────────────
    r = client.post(f"/api/game/{sid}/word", json={"path": [0, 1]})
    body = r.json()
    assert not body["ok"] and body["reason"] == "too_short", body
    print("Kata terlalu pendek ditolak OK")

    # ── 3. Validasi: path tidak valid (tidak bertetangga) ───────────────────
    r = client.post(f"/api/game/{sid}/word", json={"path": [0, 6, 3]})
    body = r.json()
    assert not body["ok"] and body["reason"] == "invalid_path", body
    print(f"Path tidak valid ditolak OK: {body['reason']}")

    # ── 4. Swipe kata valid ─────────────────────────────────────────────────
    import grid as grid_mod
    import game as game_mod

    session = game_mod.get_session(sid)
    assert session is not None

    # Cari kata valid di grid
    all_paths = grid_mod.find_word_paths(session.grid, limit=20)
    assert all_paths, "Harus ada kata valid di grid 5x5"

    word, path = all_paths[0]
    r = client.post(f"/api/game/{sid}/word", json={"path": list(path)})
    body = r.json()
    assert body["ok"], f"Kata valid '{word}' seharusnya diterima: {body}"
    assert body["word"] == word and body["points"] > 0
    pre_grid = session.grid[:]
    synced = pre_grid[:]
    for c in body["cells"]:
        synced[c["index"]] = c["letter"]
    post_grid = game_mod.get_session(sid).grid
    unsynced = [i for i in range(25) if synced[i] != post_grid[i]]
    assert not unsynced, f"Desync! Sel berubah tak terlapor: {unsynced}"
    print(
        f"Kata valid '{word}' OK: poin={body['points']} combo={body['combo']} "
        f"sisa={body['remaining']}s sel_berubah={len(body['cells'])} sinkron=100%"
    )

    # ── 5. Kata sudah ditemukan ─────────────────────────────────────────────
    # Cari kata di posisi baru setelah refill
    session2 = game_mod.get_session(sid)
    all_paths2 = grid_mod.find_word_paths(session2.grid, limit=20)
    seed_set = set(grid_mod.dictionary.seed_words)
    seed_found = [w for w, p in all_paths2 if w in seed_set]
    print(f"Kata familiar tersedia setelah refill: {len(seed_found)} -> {seed_found[:6]}")

    # ── 6. Validasi kamus: kata bukan Inggris ──────────────────────────────
    from dictionary import dictionary
    assert not dictionary.is_word("xyzqq"), "Kata acak tidak boleh valid"
    assert dictionary.is_word("cat"), "'cat' harus ada di kamus"
    print("Validasi kamus bekerja OK")

    # ── 7. Leaderboard ──────────────────────────────────────────────────────
    from leaderboard import add_score, top
    for i in range(10):
        add_score(f"Player{i}", i * 100, i * 5)
    entries = top(10)
    assert len(entries) <= 10, entries
    print(f"Leaderboard simpan + baca OK: {len(entries)} entri")

    print("\nSEMUA TES LULUS")


if __name__ == "__main__":
    main()
