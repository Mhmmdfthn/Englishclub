# Panduan Instalasi English Club UPB

Panduan ini menjelaskan cara menyiapkan Word Hunt di Windows, macOS, atau Linux.

## 1. Prasyarat

Pastikan perangkat sudah memiliki:

- Python 3.10 atau lebih baru
- Node.js 18 atau lebih baru dan npm
- Git (opsional, jika project diambil dari repository)

Cek versi:

```bash
python --version
node --version
npm --version
```

Di Windows, gunakan `py` jika perintah `python` tidak tersedia.

## 2. Masuk ke folder project

```bash
cd Englishclub
```

## 3. Siapkan backend

Buat virtual environment agar dependency Python project tidak bercampur dengan project lain:

```bash
python -m venv .venv
```

Aktifkan environment:

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

Jika PowerShell memblokir aktivasi script, jalankan sekali:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Lalu ulangi perintah aktivasi.

### macOS / Linux

```bash
source .venv/bin/activate
```

Install dependency backend:

```bash
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

## 4. Siapkan frontend

Install dependency Vue dan Vite:

```bash
cd frontend
npm install
cd ..
```

## 5. Jalankan saat development

Buka dua terminal dari folder root project.

Terminal 1, jalankan API:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2, jalankan frontend:

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Buka alamat yang ditampilkan Vite, biasanya:

- Komputer yang sama: `http://localhost:5173`
- HP pada Wi-Fi yang sama: `http://ALAMAT-IP-KOMPUTER:5173`

Frontend meneruskan request `/api` ke backend melalui proxy Vite.

## 6. Jalankan versi production

Build frontend terlebih dahulu:

```bash
cd frontend
npm run build
cd ..
```

Lalu jalankan FastAPI:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Buka `http://localhost:8000`. FastAPI akan menyajikan hasil build dari `frontend/dist`.

## 7. Jalankan test

Dari folder root project:

```bash
python backend/smoke_test.py
```

Output terakhir yang diharapkan:

```text
SEMUA TES LULUS
```

## Troubleshooting

### `npm` tidak menemukan `package.json`

Jalankan perintah npm dari folder `frontend`, bukan dari root:

```powershell
cd frontend
npm run build
```

### `ModuleNotFoundError: No module named 'game'`

Jalankan Uvicorn dari root dengan module path package:

```bash
python -m uvicorn backend.main:app --reload
```

Jangan menggunakan `uvicorn main:app` dari root.

### Frontend mendapat `ECONNREFUSED /api`

Pastikan backend sedang berjalan di port 8000. Saat development, Vite memakai proxy dari `frontend/vite.config.js`.

### Port sudah digunakan

Gunakan port lain untuk salah satu server. Contoh:

```bash
python -m uvicorn backend.main:app --port 8001
```

Jika backend memakai port selain 8000, sesuaikan proxy di `frontend/vite.config.js`.

### Leaderboard tidak muncul setelah install ulang

Leaderboard disimpan dalam SQLite lokal di `backend/data/leaderboard.db`. File tersebut dibuat otomatis setelah aplikasi menerima data leaderboard dan tidak perlu dibuat manual.

## Struktur singkat

```text
Englishclub/
├── backend/        # FastAPI, game logic, dictionary, SQLite
├── frontend/       # Vue + Vite application
├── docs/           # Installation guide and project notes
├── README.md       # Overview and quick start
└── .gitignore      # Local dependencies and generated files
```
