# English Club UPB — Word Hunt

Game arcade pencarian kata 5×5 untuk UKM English Club Universitas Putra Bangsa Kebumen. Pemain swipe huruf bertetangga untuk membentuk kata Inggris valid — mode kompetitif 1 menit, combo ×10, fever, tanpa translate.

## Dokumentasi

- [Panduan instalasi lengkap](docs/installation.md)
- [Walkthrough dan changelog](docs/walkthrough.md)
- [Log aktivitas](docs/Activity.md)

## Struktur Direktori

```
Englishclub/
├── backend/
│   ├── data/
│   │   ├── valid_words.txt   # 358.612 kata ENABLE
│   │   ├── words.txt         # 332 kata familiar (seed)
│   │   └── leaderboard.db    # SQLite (di-ignore, auto-create)
│   ├── dictionary.py         # dual-tier loader + bobot huruf
│   ├── game.py               # session, scoring, combo, timer 60s
│   ├── grid.py               # generate 5×5 & smart refill
│   ├── leaderboard.py        # top 10 SQLite
│   ├── main.py               # FastAPI + static serve
│   ├── smoke_test.py         # 7 skenario tes
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── Logo_ec.jpg       # logo resmi (ganti file = ganti logo)
│   ├── src/
│   │   ├── App.vue           # root: landing/form/board/play/over + loading
│   │   ├── api.js            # fetch wrapper
│   │   ├── audio.js          # Web Audio API
│   │   ├── style.css         # design system
│   │   └── components/
│   │       ├── LandingView.vue      # profil UKM (fokus)
│   │       ├── PlayFormView.vue     # pengisian nama (halaman terpisah)
│   │       ├── LeaderboardPage.vue  # klasemen (halaman terpisah)
│   │       ├── GameBoard.vue        # grid 5×5 swipe (pointer+touch)
│   │       ├── HudBar.vue           # skor, timer, combo, word pill
│   │       ├── TileCell.vue
│   │       ├── FoundWords.vue
│   │       └── GameOverScreen.vue
│   ├── index.html
│   ├── vite.config.js        # proxy /api → :8000
│   └── package.json
├── docs/
│   ├── installation.md       # panduan instalasi dan troubleshooting
│   ├── walkthrough.md        # changelog & spesifikasi
│   ├── Activity.md           # log aktivitas timestamp
│   └── nextV.md              # rencana pengembangan
└── .gitignore
```

## Quick Start

Untuk prasyarat, aktivasi virtual environment, dan troubleshooting, lihat [docs/installation.md](docs/installation.md).

**1. Siapkan environment**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Push-Location frontend
npm install
Pop-Location
```

**2. Jalankan development**

Buka dua terminal dari root project.

Terminal 1, backend:
```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# API: http://localhost:8000/api/ping
```

Terminal 2, frontend:
```powershell
Push-Location frontend
npm run dev -- --host 0.0.0.0
Pop-Location
# Buka alamat Vite, biasanya http://localhost:5173
```

**3. Test**
```powershell
python backend/smoke_test.py
# Output terakhir: SEMUA TES LULUS
```

**4. Production lokal**
```powershell
Push-Location frontend
npm run build
Pop-Location
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# Buka http://localhost:8000
```

## Spesifikasi Game

| Parameter | Nilai |
|---|---|
| Grid | 5×5 (25 sel), 8 arah garis lurus |
| Timer | 60 detik fixed, **tidak ada bonus waktu** |
| Skor | `(sum nilai huruf × panjang × 2) × combo + fever (combo≥3 → +50×(combo-2))` |
| Combo | ×1 → ×10, reset ke 1 jika kata ditolak, fever glow ≥×3 |
| Kamus | 358k valid + 332 seed, bobot huruf frekuensi seed, vokal ±40% |

## Halaman

* **Landing** (`LandingView`) — profil UKM (Tentang Kami, Visi/Misi, Program, Cerita Anggota) + teaser Word Hunt
* **Main** (`PlayFormView`) — input nama (halaman terpisah)
* **Klasemen** (`LeaderboardPage`) — Top 10 privat/global (halaman terpisah)
* **Play** — HUD (skor, timer, combo) + papan + chip kata + Selesai & Simpan
* **Over** — skor akhir + Simpan ke leaderboard + Top 10

## Catatan

* `frontend/dist`, `node_modules`, `__pycache__`, `*.db` di-ignore (lihat `.gitignore`).
* Logo di `frontend/public/Logo_ec.jpg` otomatis ikut build.
* `docs/nextV.md` berisi rencana pengembangan berikutnya.
