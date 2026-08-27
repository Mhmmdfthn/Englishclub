# Next Version — Word Hunt Room 1-Menit + Spin Top2

> Status: **Planned — Keep dulu** (belum dieksekusi). Akan diimplementasikan setelah `v3` landing profil UKM stabil.
> Dibuat: 2026-08-27 07:xx WIB | Penulis: Muse Spark

---

## 1. Ringkasan Fitur
Room code hidup **60 detik** lalu auto-hapus. **Top 2** per room berhak spin hadiah. Hadiah **diinput manual admin** saat create room. Leaderboard room **privat** (hanya member). **Tanpa room code tetap bisa main** (free play ke leaderboard global). Auth admin **1 akun** (`admin1`).

---

## 2. Requirement Freeze (hasil diskusi 2026-08-27)
1. **TTL 60s hard delete** — `code` valid 60 detik sejak dibuat, lewat itu auto `DELETE`.
2. **Top 2** — juara 1 & juara 2 masing-masing dapat spin 1× dengan hadiah berbeda.
3. **Hadiah input manual** — admin isi `prize_top1 + stock_top1` dan `prize_top2 + stock_top2` saat generate.
4. **Room leaderboard privat** — `GET /api/rooms/{code}/leaderboard` butuh `session_id` member, non-member → 403.
5. **Auth admin 1 akun** — `admins` seed 1 row, login `POST /api/admin/login` → token Bearer.

---

## 3. Desain Data (SQLite `backend/data/leaderboard.db` via `backend/leaderboard.py:9`)

```sql
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);
-- seed: INSERT INTO admins VALUES ('admin1', '<bcrypt hash dari ADMIN_PASS||upb2026>')

CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL, -- datetime('now','+60 seconds')
  status TEXT NOT NULL CHECK(status IN ('open','expired','closed')) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS room_members (
  code TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(code, session_id),
  FOREIGN KEY(code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_scores (
  code TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  words INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(code, session_id),
  FOREIGN KEY(code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_prizes (
  code TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK(rank IN (1,2)),
  label TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(code, rank),
  FOREIGN KEY(code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  session_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  prize TEXT NOT NULL,
  spun_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code, session_id),
  FOREIGN KEY(code) REFERENCES rooms(code) ON DELETE CASCADE
);
```

**Purge:** `backend/game.py:38` tambah `_purge_rooms()` dipanggil di `create_session()`/`get_session()` dan tiap `POST /api/*`. `DELETE FROM rooms WHERE expires_at < datetime('now')`. Untuk presisi, tambah daemon `threading.Thread` tiap 10s (opsional). `room_scores` ditahan 5 menit setelah `rooms` terhapus agar Top2 masih bisa claim spin meski room sudah expired.

---

## 4. Backend — API & Logic

### 4.1 Auth (`backend/auth.py` baru)
- `hash_password(pw)`, `verify(pw, hash)` via `bcrypt` (atau `hashlib.pbkdf2` jika tanpa deps).
- `POST /api/admin/login {username,password}` → cek `admins` → `token = secrets.token_urlsafe(24)` simpan di `admin_tokens` dict/memory + `expires_at` 8 jam → `{token}`.
- Middleware `require_admin` cek `Authorization: Bearer <token>` untuk `POST /api/admin/rooms`, `GET /api/admin/rooms`.

### 4.2 Endpoints baru di `backend/main.py:41`
| Method | Path | Auth | Body / Query | Deskripsi |
|---|---|---|---|---|
| POST | `/api/admin/login` | - | `{username,password}` | Login admin1 |
| POST | `/api/admin/rooms` | admin | `{prize_top1, stock_top1, prize_top2, stock_top2, max_players?:10}` | Generate code 6 alnum, `expires_at=now+60s`, insert `rooms`+`room_prizes` |
| GET | `/api/admin/rooms` | admin | - | List rooms open/expired |
| POST | `/api/game?room_code=CODE` | - | - | Modif `post_game()` — jika `room_code` ada, validasi `open && now<expires_at`, buat session + insert `room_members` atomik. Tanpa code → free play (seperti sekarang) |
| GET | `/api/rooms/{code}` | member? | - | Info room (hadiah, sisa detik). Privat: butuh `?session_id` jika mau detail? Atau public info hadiah saja |
| GET | `/api/rooms/{code}/leaderboard?session_id=...` | member | - | Privat 403 jika `session_id` bukan di `room_members`. Return `room_scores` sorted `score DESC, updated_at ASC` |
| POST | `/api/rooms/{code}/finish` | - | `{session_id}` | Tandai selesai (opsional, untuk trigger spin) |
| POST | `/api/rooms/{code}/spin` | - | `{session_id}` | Cek sudah expired, cek rank Top2, cek belum pernah spin, cek stock rank tersebut, `stock-1`, insert `spins` → `{rank, prize}` atau `{eligible:false, reason}` |

### 4.3 Modif `backend/game.py:45` `create_session(room_code?)` & `backend/grid.py:11` tidak perlu ubah logic papan. `backend/main.py:41` `post_game` return `time_limit:0` tetap, tambah `room_code` echo.

---

## 5. Frontend

### 5.1 Routing (tanpa `vue-router`, via `frontend/src/App.vue:11` `screen` ref)
`screen = 'landing' | 'form' | 'board' | 'roomBoard' | 'admin' | 'play' | 'over'`
- `landing` → `LandingView.vue` (sudah ada, tambah room code entry)
- `form` → `PlayFormView.vue` (halaman terpisah pengisian)
- `board` → `LeaderboardPage.vue` (global)
- `roomBoard` → leaderboard privat
- `admin` → `AdminView.vue` (baru)

### 5.2 Komponen

**`frontend/src/components/LandingView.vue:1` (profil UKM fokus)**
- Tambah card kecil "Punya Room Code? [______] [Masuk]" → `emit('goRoom',code)` → `api.getRoom(code)` → jika ok nav `form?code=...`, jika 404/410 toast "Room expired".
- Teaser "Ayo Main Word Hunt" tetap sebagai sisipan kecil, bukan objek utama.

**`frontend/src/components/PlayFormView.vue:1` (halaman pengisian terpisah)**
- Field `Nama` + field `Room Code (opsional)` + preview hadiah `Juara 1: Voucher 10k (stock 5)` dari `GET /api/rooms/{code}`.
- Validasi code sebelum `play` (cek `expires_at` countdown).
- `api.startGame(roomCode)` kirim `POST /api/game?room_code=CODE`.

**`frontend/src/components/LeaderboardPage.vue:1` (halaman leaderboard terpisah)**
- Tab `Global | Room CODE` (tab Room hanya muncul jika `sessionStorage room_code` ada dan member).
- Room tab fetch `GET /api/rooms/{code}/leaderboard?session_id=...`, jika 403 → sembunyikan.

**`frontend/src/components/AdminView.vue` (baru)**
- Login form → `POST /api/admin/login` simpan `localStorage.admin_token`.
- Form create room: 2 input `Hadiah Juara 1 [____] Stock [1]` `Hadiah Juara 2 [____] Stock [1]` + `Generate` → tampil `CODE` besar + countdown 60s + QR + auto poll `GET /api/rooms/{code}` tiap 5s, jika 404 → "Expired & terhapus".

**`frontend/src/components/SpinWheel.vue` (baru)**
- Dipanggil di `frontend/src/components/GameOverScreen.vue:47` atau `App.vue:49` `endGame()` jika `room_code` ada dan room sudah `expired` → `POST /api/rooms/{code}/spin` → tampil `Selamat! Kamu Juara #1 dapat Voucher` atau `Belum Top 2`.

**`frontend/src/api.js:10`**
```js
adminLogin: (u,p)=>req('/api/admin/login',{method:'POST',body:JSON.stringify({username:u,password:p})}),
createRoom: (token, data)=>req('/api/admin/rooms',{method:'POST', headers:{Authorization:`Bearer ${token}`}, body:JSON.stringify(data)}),
getRoom: (code)=>req(`/api/rooms/${code}`),
getRoomBoard: (code, sid)=>req(`/api/rooms/${code}/leaderboard?session_id=${sid}`),
spin: (code, sid)=>req(`/api/rooms/${code}/spin`,{method:'POST', body:JSON.stringify({session_id:sid})}),
```

**`frontend/src/App.vue:152` `bottom-nav`**
- `Profil UKM | Main | Klasemen | Admin` (Admin hanya jika `admin_token` ada).

---

## 6. Alur Lengkap

1. **Admin** login di `/admin` → create room `prize_top1=Voucher 10k, prize_top2=Tumbler` → dapat `CODE=A3K9` + countdown 60s → share WA/QR.
2. **Player A/B** di HP (`http://192.168.0.101:8000`) → Landing → Masuk code `A3K9` → PlayForm isi nama → `POST /api/game?room_code=A3K9` → `play` (grid 5×5 santai tanpa waktu/combo).
3. Main swipe → `POST /api/game/{id}/word` → `room_scores` ter-update per kata.
4. Setelah 60s room auto `expired` (purge) → Player klik `Selesai & Simpan Skor` → `POST /api/rooms/A3K9/spin` → jika rank 1/2 → dapat `prize` (stock-1) + simpan `spins`, jika bukan Top2 → `{eligible:false}`.
5. **Tanpa code** → flow lama: `POST /api/game` → `play` → `room_scores` tidak terisi → leaderboard global `GET /api/leaderboard` tetap.

---

## 7. File yang Akan Diubah Saat Eksekusi

| File | Perubahan |
|---|---|
| `backend/leaderboard.py:9` | tambah `_init` tabel baru + seed `admin1` |
| `backend/game.py:38` | `_purge_rooms()`, `create_session(room_code?)` |
| `backend/main.py:7` | import `auth`, endpoints admin/room/spin, modif `post_game` |
| `backend/auth.py` | **baru** hash + token |
| `frontend/src/api.js:10` | 6 fungsi baru |
| `frontend/src/App.vue:11` | screen `landing|form|board|roomBoard|admin|play|over` + token |
| `frontend/src/components/LandingView.vue:1` | room code entry |
| `frontend/src/components/PlayFormView.vue:1` | room_code field + preview hadiah |
| `frontend/src/components/LeaderboardPage.vue:1` | dual tab privat |
| `frontend/src/components/AdminView.vue` | **baru** |
| `frontend/src/components/SpinWheel.vue` | **baru** |

---

## 8. Risiko & Mitigasi

- **60s sangat pendek** → player harus join cepat; mitigasi: `rooms` dihapus tapi `room_scores`/`room_prizes` ditahan 5 menit untuk claim spin (purge `rooms` dulu, `scores` delayed).
- **Tie Top2** → tie-break `score DESC, updated_at ASC` (yang capai skor dulu menang).
- **Stock habis** → spin return `prize=null` + pesan "Hadiah juara X habis".
- **Room privat** → player iseng brute force code 6 char (36^6) kecil kemungkinan; tambah rate limit `POST /api/rooms/{code}/join` 5 req/menit.

---

## 9. Next Step

1. **Iterasi 1 — Backend**: `auth` + `rooms` + purge 60s + Top2 spin.
2. **Iterasi 2 — Frontend**: `AdminView` + `PlayForm` room + `roomBoard` privat + `SpinWheel`.
3. Test: `python backend/smoke_test.py` + manual 2 HP join 1 room 60s + spin.
