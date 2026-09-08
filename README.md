# English Club UPB — Word Hunt + Pendaftaran

Game arcade pencarian kata 5×5 + form pendaftaran anggota untuk UKM English Club Universitas Putra Bangsa Kebumen. Pemain swipe huruf bertetangga untuk membentuk kata Inggris valid — mode kompetitif 60 detik, combo ×10, fever. Pendaftaran 3 field (nama, no HP, jurusan) → CSV + highlight panel, admin hidden `/ec-admin-2026` (akun `admin`), proker gallery 3 foto.

## Stack

- **Frontend:** Vue 3 + Vite + vue-router (`frontend/src/*`, `App.vue` + `router.js`)
- **Backend:** Node Express (`backend/server/index.js`, `type:module`) — translate 1:1 dari Python FastAPI lama (sekarang di `backend-python/`)
- **Data:** JSON/CSV file `backend/server/data/` (`members.csv`, `proker.json`, `scores.json`, `stories.json`, `tokens.json`, `admins.json`, `uploads/`), `words.txt` 332 + `valid_words.txt` 358k
- **Auth:** 1 akun `admin / ec2026onlyblue` (`bcrypt` + Bearer 8h persisten `tokens.json`), guard `Authorization: Bearer` + legacy `x-admin-token`

## Dokumentasi

- [Panduan instalasi lengkap](docs/installation.md) *(perlu update ke Node)*
- [Walkthrough dan changelog](docs/walkthrough.md)
- [Log aktivitas](docs/Activity.md)

## Struktur Direktori

```
Englishclub/
├── backend/                      # JS utama (Express)
│   ├── server/
│   │   ├── index.js              # Express + CORS + static dist + /uploads
│   │   ├── routes/
│   │   │   ├── ping.js, game.js, leaderboard.js, stories.js, members.js, admin.js, proker.js
│   │   └── utils/
│   │       ├── auth.js           # 1 akun bcrypt + Bearer 8h (tokens.json)
│   │       ├── db.js             # scores.json / stories.json
│   │       ├── membersStore.js   # members.csv (hide HP di highlight)
│   │       ├── prokerStore.js    # proker.json (judul 3-40, caption 5-280, gallery 3)
│   │       ├── gameStore.js      # session 60s, combo ×10
│   │       ├── grid.js           # generate 5×5 & smart refill
│   │       └── dictionary.js     # LETTER_VALUES + valid 358k
│   ├── data/
│   │   ├── words.txt             # 332 seed
│   │   ├── valid_words.txt       # 358.612 ENABLE (di-ignore di push baru, baca dari backend-python/data)
│   │   └── uploads/              # foto proker (multer 5MB, max 3)
│   ├── api/index.js              # export app untuk Vercel
│   ├── package.json              # start: node server/index.js
│   └── .env.example              # ADMIN_TOKEN=ec2026onlyblue, PORT=3001
├── backend-python/               # Python lama (backup, FastAPI)
│   ├── main.py, game.py, grid.py, dictionary.py, leaderboard.py, stories.py, members.py
│   └── requirements.txt
├── frontend/
│   ├── public/Logo_ec.jpg
│   ├── src/
│   │   ├── App.vue               # root + router-view + game timer
│   │   ├── router.js             # /, /daftar, /board, /main, /ec-admin-2026 hidden
│   │   ├── api.js                # fetch wrapper 8s + Bearer
│   │   ├── style.css             # design system (royal-blue #0B569B, yellow #FFE600)
│   │   └── components/
│   │       ├── LandingView.vue      # profil BEM Keilmuan + visi/misi + proker (klik → ProgramModal)
│   │       ├── ProgramModal.vue     # detail proker + gallery
│   │       ├── MemberRegisterMini.vue # form 3 field + highlight panel (tanpa HP)
│   │       ├── AdminView.vue        # hidden admin: login akun, Pendaftar (cards mobile) + Proker (judul/caption/gallery)
│   │       ├── GameBoard.vue, HudBar.vue, TileCell.vue, FoundWords.vue, GameOverScreen.vue (tombol Kembali)
│   │       └── Leaderboard*.vue, Testimonials.vue
│   ├── vite.config.js            # proxy /api → :3001
│   └── package.json
└── docs/
```

## Quick Start

**1. Siapkan env & install**

```powershell
Copy-Item backend/.env.example backend/.env  # ADMIN_TOKEN=ec2026onlyblue

npm install --prefix backend
npm install --prefix frontend
```

Python lama (opsional):
```powershell
python -m venv .venv; .venv\Scripts\Activate.ps1
python -m pip install -r backend-python/requirements.txt
```

**2. Jalankan development (2 terminal)**

Terminal 1 — backend JS (3001):
```powershell
node backend/server/index.js
# atau npm run dev --prefix backend
# API: http://localhost:3001/api/ping
```

Terminal 2 — frontend (5173):
```powershell
npm run dev --prefix frontend -- --host 0.0.0.0
# Buka http://localhost:5173
# Daftar: http://localhost:5173/daftar
# Admin hidden: http://localhost:5173/ec-admin-2026 (admin / ec2026onlyblue)
```

Python lama (3000/8000):
```powershell
python -m uvicorn backend-python.main:app --host 0.0.0.0 --port 8000 --reload
```

**3. Test**

```powershell
# members highlight tanpa HP
curl http://localhost:3001/api/members/highlight
# login akun
curl -X POST http://localhost:3001/api/admin/login -H "Content-Type: application/json" -d '{"username":"admin","password":"ec2026onlyblue"}'
# game
curl -X POST http://localhost:3001/api/game
```

**4. Production lokal (single-port)**

```powershell
npm run build --prefix frontend
node backend/server/index.js
# Buka http://localhost:3001  (Express serve frontend/dist + /api + /uploads)
```

## Spesifikasi Game

| Parameter | Nilai |
|---|---|
| Grid | 5×5 (25 sel), 8 arah garis lurus |
| Timer | 60 detik fixed, **tidak ada bonus waktu** |
| Skor | `(sum nilai huruf × panjang × 2) × combo + fever (combo≥3 → +50×(combo-2))` |
| Combo | ×1 → ×10, reset 1 jika ditolak, fever glow ≥×3 |
| Kamus | 358k valid + 332 seed, bobot huruf frekuensi seed, vokal ±40% |

## Fitur

- **Landing** — hero + profil BEM Keilmuan singkat + visi/misi (visi: lingkungan menyenangkan, bahasa umum; misi 4 poin) + program kerja 4 card (klik → modal foto gallery 3) + Word Hunt teaser + cerita ospek dummy 8
- **Daftar** (`MemberRegisterMini`) — 3 field (nama 2-40, no HP 08 10-13 digit, jurusan 7 opsi) → `backend/server/data/members.csv`, highlight panel hide HP, refresh otomatis
- **Admin hidden** (`/ec-admin-2026`) — login `admin` → tab **Pendaftar** (stats total/hari ini, search, table desktop + cards mobile simple, Download CSV) + tab **Proker** (edit judul 3-40, caption 5-280, gallery 3 foto 5MB)
- **Game** — `PlayFormView` nama → `GameBoard` swipe + `HudBar` + `FoundWords` → `GameOverScreen` (MAIN LAGI + KEMBALI kaku, 0 radius)

## API

| Method | Path | Auth | Ket |
|---|---|---|---|
| GET | `/api/ping` | - | pong |
| POST | `/api/game` | - | session 25 grid |
| POST | `/api/game/:id/word` | - | submit path |
| GET/POST | `/api/leaderboard` | - | top 10 |
| GET/POST | `/api/stories` | - | cerita 100 |
| POST | `/api/members` | - | daftar 3 field |
| GET | `/api/members/highlight` | - | 30 tanpa HP |
| GET | `/api/members`, `/api/members/export` | Bearer | admin |
| POST | `/api/admin/login`, `/verify`, `/logout`, `GET /me` | - / Bearer | akun |
| GET/PUT/POST/DELETE | `/api/proker`, `/api/proker/:id`, `/api/proker/:id/photos` | Bearer | proker + gallery |

## Catatan

- `frontend/dist`, `node_modules`, `__pycache__`, `*.db`, `backend/server/data/members.csv`, `*.json` data, `uploads/` di-ignore (lihat `.gitignore`). `valid_words.txt` besar juga di-ignore push baru — ambil dari `backend-python/data/` jika butuh.
- Logo `frontend/public/Logo_ec.jpg` ikut build.
- Data file `backend/server/data/*` ephemeral di Vercel (hilang tiap deploy) — untuk prod persisten butuh volume (VM) atau migrasi ke Postgres + Blob (Vercel). Single-service `node backend/server/index.js` dengan volume `backend/server/data` paling aman untuk sementara.
- Semua tombol kaku `border-radius 0` (`style.css` `.btn`), mobile hamburger `680px`, pendaftar cards simple di HP.
- Python backup di `backend-python/` — JS di `backend/` adalah utama sekarang.
