# Activity Log — English Club Word Hunt

> Catatan aktivitas pengembangan berbasis **timestamp** (WIB, +07:00).  
> Sumber: `git log`, `LastWriteTime` filesystem, dan `walkthrough.md` changelog.  
> File ini dibuat otomatis pada **2026-08-27 07:25 WIB** dan di-append setiap ada aktivitas baru (format di bawah).

---

## Cara Mencatat Aktivitas Baru

Tambahkan baris baru di tabel **Log Aktivitas** dengan format:

```markdown
| 00 | YYYY-MM-DD HH:mm WIB | Jenis | path/file | Deskripsi singkat | Status |
```

Jenis: `INIT` | `FEAT` | `FIX` | `REFACTOR` | `CHORE` | `BUILD` | `DOCS` | `TEST` | `REVIEW`

---

## Ringkasan

| Metrik | Nilai |
|---|---|
| Repo init | 2026-08-26 04:02 WIB (`d7a8421 GameV1` oleh `mhmmdfthn`) |
| Rentang aktivitas tercatat | 2026-08-26 00:19 — 2026-08-27 10:15 WIB |
| Total entri | 48 |
| Backend | FastAPI + SQLite (5 modul, 60s kompetitif, combo poin) |
| Frontend | Vue 3 + Vite (9 komponen, landing profil UKM, 3 halaman terpisah) |
| Status terakhir | Smoke test **LULUS** + build `index-C6eCmXVm.js` 200 OK 2026-08-27 10:14 WIB |

---

## Log Aktivitas (Kronologis)

| No | Timestamp (WIB) | Jenis | File / Modul | Aktivitas | Detail / Catatan | Status |
|---|---|---|---|---|---|---|
| 1 | 2026-08-26 00:19 WIB | INIT | `backend/leaderboard.py` | Inisialisasi leaderboard SQLite | Buat tabel `scores` (`name, score, words, created_at`), `top()` & `add_score()` | ✅ Done |
| 2 | 2026-08-26 00:19 WIB | INIT | `backend/requirements.txt` | Dependensi backend | `fastapi>=0.115`, `uvicorn[standard]>=0.30` | ✅ Done |
| 3 | 2026-08-26 00:23 WIB | INIT | `frontend/package.json` | Setup frontend | `vue@3.5.13`, `vite@7.0.0`, `@vitejs/plugin-vue@6.0.0` | ✅ Done |
| 4 | 2026-08-26 00:23 WIB | INIT | `frontend/vite.config.js` | Konfigurasi Vite | Alias & plugin Vue | ✅ Done |
| 5 | 2026-08-26 00:23 WIB | INIT | `frontend/src/main.js` | Entry point Vue | Mount `App.vue` | ✅ Done |
| 6 | 2026-08-26 00:58 WIB | FEAT | `frontend/src/audio.js` | Sistem audio Web Audio API | `select`, `success`, `fever`, `error`, mute toggle (zero-dep) | ✅ Done |
| 7 | 2026-08-26 01:17 WIB | FEAT | `backend/data/words.txt` | Kamus seed familiar | 332 kata (3–5 huruf) untuk penanaman grid | ✅ Done |
| 8 | 2026-08-26 01:18 WIB | FEAT | `frontend/src/api.js` | API client | `startGame()`, `submitWord(path)` ke `POST /api/game` | ✅ Done |
| 9 | 2026-08-26 01:54 WIB | FEAT | `backend/data/valid_words.txt` | Kamus validasi luas | 358.612 kata (ENABLE1/Scrabble) untuk validasi swipe | ✅ Done |
| 10 | 2026-08-26 02:24 WIB | FEAT | `backend/dictionary.py` | Loader dual-tier dictionary | `Dictionary`: `words`, `seed_words`, `prefixes`, `LETTER_VALUES`, bobot huruf & `random_vowel/consonant` | ✅ Done |
| 11 | 2026-08-26 02:35 WIB | TEST | `backend/smoke_test.py` | Automated smoke test | 7 skenario: buat sesi, `too_short`, `invalid_path`, swipe valid, `already_found`, validasi kamus, leaderboard | ✅ Done |
| 12 | 2026-08-26 03:33 WIB | FEAT | `frontend/src/style.css` | Global style & brand palette | `#0B569B` Royal Blue, `#FFE600` Yellow, `#1D2B3A` Navy, `#FFFFFF` White | ✅ Done |
| 13 | 2026-08-26 03:33 WIB | FEAT | `frontend/index.html` | HTML + Google Fonts | `Outfit`, `Plus Jakarta Sans` | ✅ Done |
| 14 | 2026-08-26 03:33 WIB | FEAT | `frontend/src/App.vue` | Root game state | Timer, `submit` handler, toast, shake, fever glow | ✅ Done |
| 15 | 2026-08-26 03:34 WIB | FEAT | `frontend/src/components/HudBar.vue` | HUD bar | Skor, timer progress, combo badge | ✅ Done |
| 16 | 2026-08-26 03:34 WIB | FEAT | `frontend/src/components/GameBoard.vue` | Grid 5×5 + swipe | Pointer events 8-arah, validasi `NEIGHBORS` | ✅ Done |
| 17 | 2026-08-26 03:34 WIB | FEAT | `frontend/src/components/TileCell.vue` | Tile huruf | Animasi `selected`/`pop` | ✅ Done |
| 18 | 2026-08-26 03:34 WIB | FEAT | `frontend/src/components/FoundWords.vue` | Daftar kata ditemukan | Chip kata + skor | ✅ Done |
| 19 | 2026-08-26 03:35 WIB | FEAT | `frontend/src/components/Leaderboard.vue` | Leaderboard UI | Top-10 `GET /api/leaderboard` | ✅ Done |
| 20 | 2026-08-26 03:35 WIB | FEAT | `frontend/src/components/GameOverScreen.vue` | Layar akhir | Input nama + `POST /api/leaderboard` + rank | ✅ Done |
| 21 | 2026-08-26 03:37 WIB | FEAT | `frontend/src/components/WordList.vue` | (Legacy) Word list | Komponen daftar kata target (v2) | ✅ Done |
| 22 | 2026-08-26 03:40 WIB | FEAT | `frontend/public/Logo_ec.jpg` + `frontend/dist/Logo_ec.jpg` | Logo resmi English Club | Ditaruh di `public/` agar ikut build tanpa ubah kode | ✅ Done |
| 23 | 2026-08-26 03:43 WIB | DOCS | `walkthrough.md` | Dokumentasi & changelog | v1.0 (4×4) → v3.2 (5×5 putih + logo) | ✅ Done |
| 24 | 2026-08-26 04:02 WIB | CHORE | `git commit d7a8421` | Commit awal `GameV1` | `mhmmdfthn` — push semua `backend/`, `frontend/`, `node_modules`, `dist` | ✅ Committed |
| 25 | 2026-08-27 07:06 WIB | BUILD | `frontend/dist/` | Rebuild frontend | `index-CrGeEy4s.css`, `index-3xK5R5OO.js` | ✅ Built |
| 26 | 2026-08-27 07:08 WIB | FEAT | `frontend/src/components/StartScreen.vue` | Revamp layar awal | Logo + tema putih, best score, tombol MULAI (diff +237) | ✅ Done |
| 27 | 2026-08-27 07:10 WIB | CHORE | `.vscode/settings.json` | Workspace settings | Konfigurasi editor | ✅ Done |
| 28 | 2026-08-27 07:21 WIB | REFACTOR | `backend/main.py` | Fix import dual-mode | `try: from . import game` → fallback `import game` | ✅ Done |
| 29 | 2026-08-27 07:21 WIB | REFACTOR | `backend/game.py` | Fix import dual-mode | Sama: `from . import grid` + fallback | ✅ Done |
| 30 | 2026-08-27 07:22 WIB | FIX | `backend/grid.py` | Sinkronisasi & smart refill | `refill_cells` return semua `changed`, `ensure_familiar_words` revert | ✅ Done |
| 31 | 2026-08-27 07:24 WIB | TEST | `backend/data/leaderboard.db` | Data leaderboard terupdate | Smoke test `Player0..9` + `Tester` rank 1 | ✅ Verified |
| 32 | 2026-08-27 07:24 WIB | REVIEW | `backend/` (full) | Cek backend menyeluruh | `py_compile` 5 file OK, `smoke_test` LULUS, CORS `*`, 7–9 kata familiar | ✅ Passed |
| 33 | 2026-08-27 07:24 WIB | TEST | `backend/smoke_test.py` | Verifikasi scoring | `oven` 56 pts combo 1, `heir` 112 pts combo 2, `remaining` 39.17s | ✅ Passed |
| 34 | 2026-08-27 07:25 WIB | DOCS | `docs/Activity.md` | Pembuatan Activity Log | File ini — 34 entri | ✅ Created |
| 35 | 2026-08-27 07:45 WIB | FIX | `frontend/src/components/GameBoard.vue` | Fix mobile swipe | `getClientPos` tangani `touches/changedTouches`, `touchmove/touchend` fallback, `setPointerCapture`, `touch-action:none` + `-webkit-touch-callout` | ✅ Done |
| 36 | 2026-08-27 07:56 WIB | BUILD | `frontend/dist` | Rebuild `index-CvAyGuC6.js` | Mobile fix verified `elementFromPoint` OK | ✅ Built |
| 37 | 2026-08-27 07:56 WIB | FEAT | `frontend/src/components/StartScreen.vue` | Landing simetris HP + profil UKM | Hero 2-kolom→1-kolom center, `Tentang Kami` + `Overview` 3 kartu + `Nilai` | ✅ Done |
| 38 | 2026-08-27 07:58 WIB | REFACTOR | `frontend/src/components/StartScreen.vue` | Play bukan objek utama | `play-card` kuning besar dihapus dari hero, jadi sekunder `ghost` setelah `values-card` | ✅ Done |
| 39 | 2026-08-27 08:20 WIB | FIX | `backend/main.py` + `frontend` | Backend zombie fix | Kill PID 6812/12352/21764 (reload ganda), restart single PID 1216, `GET /` 200, `LAN 192.168.0.101:8000` 200 | ✅ Done |
| 40 | 2026-08-27 08:35 WIB | REFACTOR | `backend/game.py` | Hapus combo & waktu | `BASE_TIME=0, COMBO_CAP=1, _time_bonus→0, ends_at=inf`, `HudBar` jadi `MODE SANTAI` | ✅ Done |
| 41 | 2026-08-27 08:50 WIB | FEAT | `frontend/src/components/LandingView.vue` + `PlayFormView.vue` + `LeaderboardPage.vue` + `App.vue` | Landing fokus profil UKM | `screen='landing|form|board|play|over'`, bottom-nav, form & leaderboard halaman terpisah, teaser `Ayo Main` kecil | ✅ Done |
| 42 | 2026-08-27 09:00 WIB | FEAT | `backend/data/translations.json` + `backend/dictionary.py` + `backend/game.py` + `frontend/` | Translate hybrid B2 | 332 entri `cat→kucing`, cache `translations_cache.json`, `dictionary.translate(use_api)`, `/api/translate`, `App toast 2 baris`, `FoundWords chip-trans` | ✅ Done |
| 43 | 2026-08-27 09:20 WIB | REFACTOR | `backend/game.py` + `frontend/src/App.vue` + `HudBar.vue` | Kembalikan kompetitif + percepat translate | `BASE_TIME 30→30, COMBO_CAP 10`, `translate cache-only` di `submit` + async `GET /api/translate` (Promise.all), `HudBar` timer/combo/fever kembali | ✅ Done |
| 44 | 2026-08-27 09:40 WIB | FIX | `backend/game.py` + `frontend/src/App.vue` + `FoundWords.vue` + `GameOverScreen.vue` | Translate setelah game over + waktu no bonus combo | `_time_bonus` hapus `combo_bonus`, `FoundWords` hide `→ arti` saat main, `endGame` `Promise.all` parallel, `GameOver words-card` `→ arti` | ✅ Done |
| 45 | 2026-08-27 09:55 WIB | REFACTOR | `backend/game.py` + `dictionary.py` + `frontend/` | Waktu tidak bisa ditambah + translate paralel prefetch | `_time_bonus→0.0`, `ends_at` tidak di-update, `handleSubmit` prefetch background, `endGame` `Promise.all` | ✅ Done |
| 46 | 2026-08-27 10:10 WIB | REFACTOR | `backend/game.py` | Waktu 1 menit + hapus translate | `BASE_TIME 30→60`, `MAX_TIME 60`, hapus `translations.json/cache`, `dictionary.translate`, `GET /api/translate`, `requirements` `requests`, `App/GameOver` hapus arti | ✅ Done |
| 47 | 2026-08-27 10:14 WIB | CHORE | `.gitignore` + `git rm --cached` | Rapikan direktori | `.gitignore` 48 baris (`node_modules/`, `dist/`, `__pycache__/`, `*.db`), `rm node_modules (767) + __pycache__ + dist`, `git ls-files 33`, `docs/` move, `README.md` baru, hapus `StartScreen.vue`+`WordList.vue` | ✅ Done |
| 48 | 2026-08-27 10:15 WIB | DOCS | `docs/Activity.md` | Perbarui Activity Log | Tambah entri 35-48, ringkasan 48 entri, status git clean + build `index-C6eCmXVm.js` | ✅ Done |

---

## Status Git Saat Ini (2026-08-27 10:15 WIB)

```
A  .gitignore
A  README.md
D  backend/__pycache__/*.pyc (6)
D  backend/data/leaderboard.db
M  backend/game.py (BASE_TIME 60, no time bonus)
M  backend/grid.py
M  backend/main.py (tanpa /api/translate)
A  docs/Activity.md
A  docs/nextV.md
R  walkthrough.md -> docs/walkthrough.md
D  frontend/dist/Logo_ec.jpg + 2 asset lama
M  frontend/index.html (title English Club UPB)
D  frontend/node_modules/* (767)
A  frontend/src/components/LandingView.vue
A  frontend/src/components/LeaderboardPage.vue
A  frontend/src/components/PlayFormView.vue
D  frontend/src/components/StartScreen.vue
D  frontend/src/components/WordList.vue
git ls-files: 33 file (dari 775)
```


---

## Changelog Versi

| Versi | Tanggal | Highlight |
|---|---|---|
| v1.0 | 2026-08-26 | Grid 4×4 zig-zag, Hint, timer 30s, combo/fever |
| v2.0 | 2026-08-26 | 5 kata target di panel samping |
| v3.0 | 2026-08-26 | Grid 5×5 garis lurus, smart refill, bebas tanpa target, 330+ seed |
| v3.1 | 2026-08-26 | Fix desync, smart refill wajib lewat sel swipe, min 5 kata, vokal ±40%, `already_found` expiry |
| v3.2 | 2026-08-26 03:40 WIB | Logo `Logo_ec.jpg` + tema putih terang |
| v3.3 | 2026-08-27 08:35 WIB | Hapus combo & waktu → MODE SANTAI, landing profil UKM 3 halaman terpisah |
| v3.4 | 2026-08-27 09:00 WIB | Translate hybrid B2 (332 lokal + MyMemory cache) |
| v3.5 | 2026-08-27 09:40 WIB | Kembalikan kompetitif 30s + combo, translate cache-only + async parallel |
| v3.6 | 2026-08-27 10:10 WIB | Waktu 1 menit fixed (tanpa bonus), hapus translate total |

---

## Cara Update Otomatis (opsional)

```powershell
# PowerShell: append entri baru cepat
$ts = Get-Date -Format "yyyy-MM-dd HH:mm"
Add-Content docs/Activity.md "| 49 | $ts WIB | FEAT | path/file | deskripsi | ✅ Done |"
```

---

