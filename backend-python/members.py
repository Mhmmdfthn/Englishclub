"""Penyimpanan pendaftaran anggota ke CSV — production hardening."""

import csv
import re
import threading
from datetime import datetime
from pathlib import Path

_CSV = Path(__file__).parent / "data" / "members.csv"
_FIELDS = ["timestamp", "nama", "no_hp", "jurusan"]
_LOCK = threading.Lock()

# allowlist jurusan — sync dengan frontend MemberRegisterMini
ALLOWED_JURUSAN = {
    "Ilmu Komputer",
    "Manajemen",
    "Akuntansi",
    "Bisnis Digital",
    "Sains Data",
    "Agribisnis",
    "Lainnya",
}

# formula injection: excel "=cmd|' /C ..." etc
_CSV_INJECTION_PREFIX = re.compile(r"^[=+\-@|%]")


def _sanitize_field(value: str) -> str:
    """Cegah CSV injection: prefix ' jika diawali = + - @ | % ."""
    if _CSV_INJECTION_PREFIX.match(value):
        return "'" + value
    return value


def _ensure_file() -> None:
    _CSV.parent.mkdir(parents=True, exist_ok=True)
    with _LOCK:
        if not _CSV.exists():
            with _CSV.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=_FIELDS)
                writer.writeheader()
        else:
            # validate header, recreate if corrupt
            try:
                with _CSV.open("r", newline="", encoding="utf-8") as f:
                    header = f.readline().strip()
                    expected = ",".join(_FIELDS)
                    if header != expected:
                        # backup corrupt and recreate
                        backup = _CSV.with_suffix(".corrupt.csv")
                        _CSV.rename(backup)
                        with _CSV.open("w", newline="", encoding="utf-8") as out:
                            writer = csv.DictWriter(out, fieldnames=_FIELDS)
                            writer.writeheader()
            except Exception:
                pass


def add_member(nama: str, no_hp: str, jurusan: str) -> dict:
    _ensure_file()
    # sanitize + truncate after sanitize
    nama = _sanitize_field(nama.strip())[:40]
    no_hp = _sanitize_field(no_hp.strip())[:15]
    jurusan = _sanitize_field(jurusan.strip())[:30]

    if jurusan not in ALLOWED_JURUSAN:
        raise ValueError(f"Jurusan tidak valid: {jurusan}")

    ts = datetime.now().isoformat(timespec="seconds")
    row = {"timestamp": ts, "nama": nama, "no_hp": no_hp, "jurusan": jurusan}
    with _LOCK:
        with _CSV.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=_FIELDS)
            writer.writerow(row)
    return row


def all_members(limit: int = 100) -> list[dict]:
    _ensure_file()
    rows: list[dict] = []
    try:
        with _CSV.open("r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames != _FIELDS:
                return []
            for r in reader:
                # skip empty/malformed
                if not r.get("nama"):
                    continue
                rows.append(r)
    except FileNotFoundError:
        return []
    rows.reverse()
    return rows[:limit]


def highlight(limit: int = 30) -> list[dict]:
    """Public highlight — no HP disembunyikan total, hanya nama+jurusan."""
    rows = all_members(limit)
    out: list[dict] = []
    for r in rows:
        out.append({
            "nama": r.get("nama", ""),
            "jurusan": r.get("jurusan", ""),
            "timestamp": r.get("timestamp", ""),
        })
    return out


def csv_path() -> Path:
    _ensure_file()
    return _CSV
