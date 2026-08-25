"""Grid 5x5: Word Search bebas — kata ditanam garis lurus, pemain swipe kata apa saja.

Ukuran grid: 5×5 = 25 sel.
Kata ditanam dalam garis lurus (8 arah) sehingga mudah ditemukan secara visual.
Setelah swipe, sel bekas swipe WAJIB menjadi bagian kata familiar baru, dan grid
dijamin tetap memiliki minimal 5 kata familiar yang bisa ditemukan.
"""

import random

from dictionary import dictionary

SIZE = 5
CELLS = SIZE * SIZE
MIN_WORD_LEN = 3
MAX_WORD_LEN = SIZE  # kata terpanjang = 5 huruf (sesuai lebar grid)
TARGET_VOWELS = 10    # ±40% dari 25 sel
MIN_FAMILIAR_WORDS = 5

# 8 arah garis lurus klasik Word Search
DIRECTIONS = [
    (0, 1),    # →
    (0, -1),   # ←
    (1, 0),    # ↓
    (-1, 0),   # ↑
    (1, 1),    # ↘
    (1, -1),   # ↙
    (-1, 1),   # ↗
    (-1, -1),  # ↖
]


# ── Tetangga (8-arah) untuk validasi swipe ───────────────────────────────────

def _build_neighbors() -> tuple[tuple[int, ...], ...]:
    neighbors = []
    for i in range(CELLS):
        r, c = divmod(i, SIZE)
        cell = []
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < SIZE and 0 <= nc < SIZE:
                    cell.append(nr * SIZE + nc)
        neighbors.append(tuple(cell))
    return tuple(neighbors)


NEIGHBORS = _build_neighbors()


# ── Penanaman Kata Garis Lurus ────────────────────────────────────────────────

def _try_plant_straight(
    grid: list[str],
    word: str,
    *,
    must_include: set[int] | None = None,
    allow_overlap: bool = True,
    max_collateral: int = 0,
) -> list[int] | None:
    """Cari jalur garis lurus untuk `word`. Kembalikan daftar indeks atau None.

    - Sel kosong selalu boleh dilewati.
    - Sel berhuruf yang hurufnya cocok dihitung overlap (dibolehkan bila
      allow_overlap); sel berhuruf berbeda dihitung "collateral" dan dibatasi
      oleh max_collateral.
    - Jika must_include diisi, jalur wajib memuat minimal satu indeks dari situ.
    - Untuk max_collateral > 0 dipilih jalur dengan collateral terkecil.
    """
    dirs = list(DIRECTIONS)
    random.shuffle(dirs)
    starts = list(range(CELLS))
    random.shuffle(starts)

    best: list[int] | None = None
    best_cost = max_collateral + 1

    for start in starts:
        r0, c0 = divmod(start, SIZE)
        for dr, dc in dirs:
            path = []
            cost = 0
            ok = True
            for k in range(len(word)):
                r, c = r0 + dr * k, c0 + dc * k
                if not (0 <= r < SIZE and 0 <= c < SIZE):
                    ok = False
                    break
                idx = r * SIZE + c
                ch = grid[idx]
                if ch:
                    if not allow_overlap:
                        ok = False
                        break
                    if ch != word[k]:
                        cost += 1
                        if cost >= best_cost:
                            ok = False
                            break
                path.append(idx)
            if ok and len(path) == len(word):
                if must_include is not None and not (must_include & set(path)):
                    continue
                if max_collateral == 0:
                    return path
                if cost < best_cost:
                    best, best_cost = path, cost
                    if best_cost == 0:
                        return best
    return best


def _write_path(grid: list[str], path: list[int], word: str) -> None:
    for idx, ch in zip(path, word):
        grid[idx] = ch


def _seed_pool() -> list[str]:
    pool = [w for w in dictionary.seed_words if MIN_WORD_LEN <= len(w) <= MAX_WORD_LEN]
    random.shuffle(pool)
    return pool


def _count_straight_seed_words(grid: list[str]) -> int:
    """Hitung kata familiar unik yang terbentuk garis lurus (dua arah) di grid."""
    found: set[str] = set()
    seed_set = dictionary.seed_set
    for start in range(CELLS):
        r0, c0 = divmod(start, SIZE)
        for dr, dc in DIRECTIONS:
            word = ""
            for k in range(MAX_WORD_LEN):
                r, c = r0 + dr * k, c0 + dc * k
                if not (0 <= r < SIZE and 0 <= c < SIZE):
                    break
                word += grid[r * SIZE + c]
                if len(word) >= MIN_WORD_LEN and word in seed_set:
                    found.add(word)
    return len(found)


def ensure_familiar_words(
    grid: list[str],
    min_words: int = MIN_FAMILIAR_WORDS,
    rounds=((35, 0), (25, 1), (25, 2)),
) -> None:
    """Pastikan grid punya cukup kata familiar; tanam ekstra bila kurang.

    Tiap putaran punya kuota percobaan dan batas collateral (huruf lain yang
    boleh ditimpa). Penanaman yang justru mengurangi jumlah kata otomatis
    dibatalkan (revert).
    """
    for attempts, collateral in rounds:
        used = 0
        while used < attempts and _count_straight_seed_words(grid) < min_words:
            used += 1
            word = dictionary.random_word(MIN_WORD_LEN, MAX_WORD_LEN)
            path = _try_plant_straight(grid, word, max_collateral=collateral)
            if not path:
                continue
            before = _count_straight_seed_words(grid)
            backup = [(i, grid[i]) for i in path]
            _write_path(grid, path, word)
            if _count_straight_seed_words(grid) < before:
                for i, ch in backup:
                    grid[i] = ch


def _fill_random(grid: list[str]) -> None:
    """Isi sel kosong dengan huruf berbobot + kuota vokal agar ±40% vokal."""
    empties = [i for i in range(CELLS) if not grid[i]]
    if not empties:
        return
    current_vowels = sum(1 for ch in grid if ch in "aeiou")
    need_vowels = max(0, min(len(empties), TARGET_VOWELS - current_vowels))
    vowel_slots = set(random.sample(empties, need_vowels)) if need_vowels else set()
    for i in empties:
        grid[i] = (
            dictionary.random_vowel() if i in vowel_slots else dictionary.random_consonant()
        )


def _rebalance_vowels(grid: list[str]) -> None:
    """Naikkan jumlah vokal ke target dengan mengganti sebagian konsonan.

    Penukaran yang membuat jumlah kata familiar berkurang dibatalkan.
    Dipanggil di akhir generate/refill karena saat itu umumnya tak ada lagi
    sel kosong untuk diisi _fill_random.
    """
    vowels = sum(1 for ch in grid if ch in "aeiou")
    need = TARGET_VOWELS - 1 - vowels
    if need <= 0:
        return
    consonant_cells = [i for i in range(CELLS) if grid[i] and grid[i] not in "aeiou"]
    random.shuffle(consonant_cells)
    for idx in consonant_cells:
        if need <= 0:
            break
        old = grid[idx]
        before = _count_straight_seed_words(grid)
        grid[idx] = dictionary.random_vowel()
        if _count_straight_seed_words(grid) < before:
            grid[idx] = old
        else:
            need -= 1


# ── Generate Grid Baru ────────────────────────────────────────────────────────

def generate_grid() -> list[str]:
    """Buat grid 5×5: tanam hingga 8 kata familiar garis lurus (tanpa tumpang-
    tindih huruf berbeda), isi sisa dengan huruf berbobot, lalu jamin threshold
    kata familiar. Pilih konfigurasi terbaik dari 15 percobaan.
    """
    best_grid: list[str] = []
    best_planted = 0

    for _ in range(15):
        grid: list[str] = [""] * CELLS
        planted = 0

        candidates = random.sample(_seed_pool(), min(len(dictionary.seed_words), 14))
        for word in candidates:
            if planted >= 8:
                break
            path = _try_plant_straight(grid, word, allow_overlap=False)
            if path:
                _write_path(grid, path, word)
                planted += 1

        _fill_random(grid)

        if planted > best_planted:
            best_planted = planted
            best_grid = list(grid)
            if planted >= 7:
                break

    if not best_grid:
        best_grid = [dictionary.random_letter() for _ in range(CELLS)]
    ensure_familiar_words(best_grid)
    _fill_random(best_grid)
    _rebalance_vowels(best_grid)
    return best_grid


# ── Refill Setelah Swipe ──────────────────────────────────────────────────────

def refill_cells(grid: list[str], indices: list[int]) -> list[int]:
    """Smart Refill sesuai walkthrough v3. Kembalikan SEMUA indeks sel berubah.

    Langkah:
    1. Kosongkan sel bekas swipe.
    2. Tanam hingga 2 kata familiar baru yang WAJIB melewati sel bekas swipe
       (sel berhuruf lain tidak boleh ditimpa kecuali hurufnya kebetulan cocok).
    3. Isi sisa sel kosong dengan huruf acak berbobot + kuota vokal.
    4. Jika kata familiar tersisa < MIN_FAMILIAR_WORDS, tanam kata ekstra.
    """
    if not indices:
        return []

    snapshot = "".join(grid)
    freed = set(indices)

    for idx in indices:
        grid[idx] = ""

    pool = _seed_pool()
    pos = 0

    def next_word():
        nonlocal pos
        if pos < len(pool):
            w = pool[pos]
            pos += 1
            return w
        return None

    # Slot 1 & 2: kata familiar WAJIB melewati sel bekas swipe.
    # Bertingkat: mulai tanpa menimpa huruf lain, lalu longgar bila papan padat.
    tiers = ((60, 0), (60, 1), (80, 2))
    planted = 0
    for max_tries, collateral in tiers:
        tries = 0
        while planted < 2 and tries < max_tries and pos < len(pool):
            tries += 1
            word = next_word()
            path = _try_plant_straight(
                grid, word, must_include=freed, max_collateral=collateral
            )
            if path:
                _write_path(grid, path, word)
                planted += 1
        if planted >= 2:
            break

    if planted == 0:
        # Fallback terakhir: satu kata familiar di mana saja, korban minim.
        for word in pool[pos:]:
            path = _try_plant_straight(grid, word, max_collateral=2)
            if path:
                _write_path(grid, path, word)
                break

    # Urutan penting: ensure dulu (bisa menimpa huruf via collateral),
    # lalu isi sel kosong dan terakhir seimbangkan kuota vokal papan.
    ensure_familiar_words(grid)
    _fill_random(grid)
    _rebalance_vowels(grid)

    return [i for i in range(CELLS) if snapshot[i] != grid[i]]


# ── Pencarian Kata (DFS, untuk validasi umum) ────────────────────────────────

def find_word_paths(
    grid: list[str], limit: int = 50, max_len: int = 6, budget: int = 80000
) -> list[tuple[str, tuple[int, ...]]]:
    """Cari kata-kata valid dalam grid via DFS 8-arah."""
    results: list[tuple[str, tuple[int, ...]]] = []
    seen: set[str] = set()
    remaining = [budget]

    def dfs(idx: int, prefix: str, path: list[int], visited: set[int]) -> bool:
        if remaining[0] <= 0:
            return True
        remaining[0] -= 1
        word = prefix + grid[idx]
        if word not in dictionary.prefixes:
            return False
        path.append(idx)
        if len(word) >= MIN_WORD_LEN and word in dictionary.words and word not in seen:
            seen.add(word)
            results.append((word, tuple(path)))
            if len(results) >= limit:
                return True
        if len(word) < max_len:
            nxt_list = list(NEIGHBORS[idx])
            random.shuffle(nxt_list)
            for nxt in nxt_list:
                if nxt in visited:
                    continue
                visited.add(nxt)
                if dfs(nxt, word, path, visited):
                    return True
                visited.discard(nxt)
        path.pop()
        return False

    order = list(range(CELLS))
    random.shuffle(order)
    for start in order:
        if dfs(start, "", [], {start}):
            break
    return results
