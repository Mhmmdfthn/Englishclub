"""Kamus kata Inggris: validasi kata luas, kata target familiar, dan frekuensi huruf."""

import random
from collections import Counter
from pathlib import Path

_VALID_DATA = Path(__file__).parent / "data" / "valid_words.txt"
_SEED_DATA = Path(__file__).parent / "data" / "words.txt"

LETTER_VALUES = {
    "a": 1, "b": 3, "c": 3, "d": 2, "e": 1, "f": 4, "g": 2, "h": 4,
    "i": 1, "j": 8, "k": 5, "l": 1, "m": 3, "n": 1, "o": 1, "p": 3,
    "q": 10, "r": 1, "s": 1, "t": 1, "u": 1, "v": 4, "w": 4, "x": 8,
    "y": 4, "z": 10,
}


class Dictionary:
    def __init__(self) -> None:
        # Kamus Validasi Lengkap (Semua kata umum bahasa Inggris)
        if _VALID_DATA.exists():
            valid_list = _VALID_DATA.read_text(encoding="utf-8").split()
        else:
            valid_list = []

        # Kamus Seed / Target Familiar (50 kata familiar untuk penanaman di grid)
        seed_list = _SEED_DATA.read_text(encoding="utf-8").split() if _SEED_DATA.exists() else []

        all_words = set(valid_list) | set(seed_list)
        self.words = frozenset(all_words)
        self.seed_words = tuple(seed_list) if seed_list else tuple(valid_list)
        self.seed_set = frozenset(self.seed_words)

        prefixes: set[str] = set()
        for w in self.words:
            for n in range(1, len(w) + 1):
                prefixes.add(w[:n])
        self.prefixes = frozenset(prefixes)

        # Frekuensi huruf berdasarkan kata familiar
        freq = Counter(ch for w in self.seed_words for ch in w)
        self._letters = sorted(freq)
        self._weights = [freq[ch] for ch in self._letters]

        self._vowel_letters = [c for c in self._letters if c in "aeiou"]
        self._vowel_weights = [freq[c] for c in self._vowel_letters]
        self._cons_letters = [c for c in self._letters if c not in "aeiou"]
        self._cons_weights = [freq[c] for c in self._cons_letters]

        self.by_length: dict[int, list[str]] = {}
        for w in self.seed_words:
            self.by_length.setdefault(len(w), []).append(w)

    def is_word(self, word: str) -> bool:
        return word.lower() in self.words

    def random_word(self, min_len: int = 3, max_len: int = 6) -> str:
        pool: list[str] = []
        for n in range(min_len, max_len + 1):
            pool.extend(self.by_length.get(n, ()))
        if not pool:
            pool = list(self.seed_words)
        return random.choice(pool)

    def random_letter(self) -> str:
        return random.choices(self._letters, weights=self._weights, k=1)[0]

    def random_vowel(self) -> str:
        if not self._vowel_letters:
            return self.random_letter()
        return random.choices(self._vowel_letters, weights=self._vowel_weights, k=1)[0]

    def random_consonant(self) -> str:
        if not self._cons_letters:
            return self.random_letter()
        return random.choices(self._cons_letters, weights=self._cons_weights, k=1)[0]


dictionary = Dictionary()
