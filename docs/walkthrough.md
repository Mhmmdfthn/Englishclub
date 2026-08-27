# English Club — Word Hunt: Walkthrough & Changelog

## Ringkasan Game
**Word Hunt** adalah game arcade pencarian kata bahasa Inggris berbasis grid huruf.
Pemain **menggeser (swipe)** huruf yang bertetangga untuk membentuk kata Inggris yang valid.
Semakin banyak kata ditemukan dalam waktu yang tersedia, semakin tinggi skor.

---

## Spesifikasi Teknik

| Parameter | Nilai |
|---|---|
| **Ukuran Grid** | **5×5 (25 sel)** |
| **Timer Default** | 30 detik |
| **Timer Maksimum** | 60 detik (1 menit) |
| **Minimum Panjang Kata** | 3 huruf |
| **Maksimum Panjang Kata** | 5 huruf (sesuai lebar grid) |
| **Kata dalam Kamus Valid** | **358.600+ kata (Official Scrabble / ENABLE1 Complete English Dictionary)** |
| **Kata Familiar (Seeding)** | ~330 kata sehari-hari populer |
| **Combo Maksimum** | x10 |

---

## Cara Bermain
1. Tekan **MULAI BERMAIN** di layar awal
2. Geser (swipe/drag) huruf yang saling bertetangga untuk membentuk kata Inggris
3. Lepaskan jari — kata dikirim ke server untuk divalidasi
4. Jika benar: **+poin** muncul sebagai toast melayang, huruf diisi ulang otomatis
5. Jika salah: papan bergetar (shake) dan pesan error muncul
6. Temukan sebanyak mungkin kata sebelum waktu habis!

---

## Mekanisme Skor

```
Poin = (Jumlah Nilai Huruf × Panjang Kata × 2) × Combo Multiplier + Fever Bonus

Contoh: kata "WATER" (5 huruf) dengan combo x3:
  Nilai huruf: w(4)+a(1)+t(1)+e(1)+r(1) = 8
  Base: 8 × 5 × 2 = 80
  × combo 3 = 240
  + fever bonus (3-2)×50 = +50
  Total = 290 poin
```

### Combo & Fever
| Combo | Multiplier | Status |
|---|---|---|
| x1 | Normal | — |
| x2 | ×2 | — |
| x3–x9 | ×3–×9 | 🔥 **FEVER MODE** — board glow kuning |
| x10 | ×10 | 🔥 **MAX FEVER** |

Combo reset ke 1 setiap kali kata ditolak.

### Bonus Waktu per Kata
Setiap kata yang diterima menambah waktu:
```
Bonus = 2.5 + (panjang_ekstra × 1.5) + (min(combo, 8) × 0.4) detik
```
Waktu tidak bisa melebihi 60 detik.

---

## Desain Grid 5×5

### Pembuatan Papan Baru (`generate_grid`)
- Pilih 6–8 kata familiar (3–5 huruf) dari kamus seed
- Tanam tiap kata dalam **garis lurus** (8 arah: horizontal, vertikal, diagonal)
- Kata tidak saling menimpa huruf yang berbeda
- Sisa sel diisi huruf acak berbobot frekuensi kata familiar
- Pilih konfigurasi terbaik dari 15 percobaan (paling banyak kata berhasil ditanam)

Contoh papan:
```
l y g d c
d e r o n
r s a g i
u t b p o
m b o y j
```
Tersembunyi di atas: `DEEP`, `BOY`, `OPEN`, dan banyak kata lain yang bisa ditemukan via swipe.

### Smart Refill Setelah Swipe
Setiap kali kata ditemukan:
1. **Kosongkan** sel bekas swipe
2. **Tanam kata baru** garis lurus yang **melewati** sel bekas swipe (tidak benar-benar acak)
3. **Isi sisa** sel kosong dengan huruf acak berbobot
4. **Cek** — jika kata familiar < threshold, tanam kata ekstra

---

## Kamus Kata

### Struktur Dual-Tier
- **`valid_words.txt`** (7.200+ kata): kamus validasi luas — kata Inggris umum yang semua diterima saat di-swipe
- **`words.txt`** (330+ kata): kamus seed populer — kata sehari-hari familiar yang diutamakan untuk ditanam di grid

### Contoh Kata Seed
`air, ant, arm, ball, bank, bear, book, boy, bread, bus, cake, call, cat, city, clap, cloud, club, cold, dog, door, dream, dry, duck, ear, eat, egg, eye, face, fish, fly, food, fun, game, gold, good, hand, happy, hat, head, heart, help, home, hope, hot, house, ice, jam, jump, keep, king, kiss, leaf, light, like, lion, live, long, look, love, luck, milk, mind, moon, nest, night, nose, nut, oak, open, owl, pan, park, path, pay, pen, pet, pig, pink, play, rain, rat, read, red, rice, ride, ring, road, rock, roof, rope, rose, run, safe, sail, salt, sand, save, sea, seed, ship, shoe, shop, show, sing, skin, sky, sleep, snow, soap, soft, song, soup, spin, star, stay, step, stone, stop, sun, swim, tail, talk, tall, tea, team, tell, tent, time, tiny, tire, toe, top, toy, train, tree, trip, true, turn, wait, wake, walk, wall, warm, wash, water, wave, web, week, well, west, wind, win, wolf, wood, word, work, yard, year, zoo`

---

## Sistem Audio
Diimplementasikan via Web Audio API (zero-dependency) di `frontend/src/audio.js`:
- 🔔 **Select** — klik ringan saat hover/mulai swipe
- ✅ **Success** — nada naik saat kata diterima (makin tinggi saat combo tinggi)
- 🔥 **Fever** — chord dramatis saat combo pertama kali mencapai ×3
- ❌ **Error** — nada turun saat kata ditolak
- Tombol mute/unmute di pojok kanan atas

---

## Palette Warna (English Club Brand)

Tema utama aplikasi: **PUTIH / TERANG** (sejak v3.2). Warna gelap hanya untuk teks.

| Warna | HEX | Penggunaan |
|---|---|---|
| Royal Blue | `#0B569B` | Tombol sekunder, highlight judul, teks skor, garis globe & cincin orbit logo, progress bar |
| Vibrant Yellow | `#FFE600` | Tile saat diswipe, sampul buku logo, badge combo/fever, tombol MAIN |
| Dark Navy | `#1D2B3A` | Teks utama di atas putih, huruf tile, angka HUD, topi toga logo |
| Light Gray | `#E2E8F0` | Border kartu, garis halaman buku, pembatas statistik |
| Pure White | `#FFFFFF` | Latar halaman, latar kartu/papan/tile |

Logo resmi English Club (`Logo_ec.jpg`) disimpan di `frontend\public\` dan tampil di layar awal — file di folder `public` otomatis ikut setiap build dan bisa diganti kapan saja tanpa ubah kode.

---

## Struktur File

```
Englishclub/
├── backend/
│   ├── main.py           # FastAPI routes (POST /api/game, POST .../word, leaderboard)
│   ├── game.py           # Session state, scoring, combo, timer
│   ├── grid.py           # Grid 5x5: generate_grid, refill_cells, find_word_paths
│   ├── dictionary.py     # Dual-tier dictionary loader
│   ├── leaderboard.py    # Top-10 leaderboard persistence
│   ├── smoke_test.py     # Automated smoke tests
│   └── data/
│       ├── words.txt         # ~330 kata familiar untuk seeding grid
│       └── valid_words.txt   # ~7200 kata untuk validasi swipe
└── frontend/
    ├── index.html            # Google Fonts (Outfit, Plus Jakarta Sans)
    └── src/
        ├── App.vue               # Root: timer, game state, submit handler
        ├── api.js                # API client (startGame, submitWord)
        ├── audio.js              # Web Audio API sound effects
        ├── style.css             # CSS variables, global styles
        └── components/
            ├── StartScreen.vue   # Layar awal + best score
            ├── HudBar.vue        # Skor, timer, combo display
            ├── GameBoard.vue     # Grid 5x5, swipe handler (pointer events)
            ├── TileCell.vue      # Tile huruf + animasi selected/pop
            ├── FoundWords.vue    # Daftar kata yang sudah ditemukan
            └── GameOverScreen.vue# Layar akhir + input nama + leaderboard
```

---

## Changelog

### v3.2 — Logo Resmi + Tema Putih (Terkini)
- ✅ **Logo resmi `Logo_ec.jpg`** tampil di layar awal (disajikan dari folder `frontend\public\`, ganti file = ganti logo, tanpa build ulang kode)
- ✅ **Tema utama diubah dari gelap menjadi PUTIH**: latar halaman, kartu, papan 5×5, dan tile semuanya terang; teks menggunakan Dark Navy agar kontras
- ✅ Aksen brand tetap terjaga: tombol utama kuning, elemen interaktif royal blue, badge **ENGLISH**/**CLUB**
- ✅ Semua komponen (HUD, board, chip kata, leaderboard, game over, toast, tombol suara) disesuaikan ke tema terang

### v3.1 — Fix Sinkronisasi & Smart Refill
- ✅ **Fix bug desync grid** — refill dulu bisa mengubah huruf di luar sel swipe tanpa dilaporkan; kini respons API memuat **semua sel yang berubah**, frontend selalu 100% sinkron dengan server (tidak ada lagi kata benar ditolak karena papan tidak sama)- ✅ **Smart refill wajib lewat sel bekas swipe** — kata familiar baru selalu menempati area yang baru dikosongkan (bertingkat: tanpa menimpa huruf → maksimal 1–2 penimpaan bila papan padat)
- ✅ **Jaminan minimal 5 kata familiar** tersedia setiap saat (langkah 4 spesifikasi kini benar-benar diimplementasikan, dengan proteksi revert agar penanaman baru tidak merusak kata lain)
- ✅ **Penyeimbang vokal ±40%** aktif di akhir generate/refill — huruf acak lebih sering membentuk kata
- ✅ **Fix `already_found`** — kata tercatat otomatis kadaluarsa saat huruf di jalurnya berubah, sehingga kata yang muncul lagi di lokasi baru bisa ditemukan kembali
- ✅ Regresi 30 swipe (3 seed): nol desinkronisasi, kata familiar stabil 5–9 per langkah (`sea, hat, bus, cup, oil…`)

### v3.0 — Grid 5×5 + Kata Lurus
- ✅ **Grid diperluas ke 5×5 (25 sel)** — lebih banyak huruf, lebih banyak kombinasi
- ✅ **Kata ditanam garis lurus** (8 arah) — mudah dilihat secara visual
- ✅ **Smart Refill** — sel bekas swipe selalu diisi kata baru via jalur lurus
- ✅ **Tidak ada daftar kata target** — mode bebas, temukan kata apa saja
- ✅ Kamus seed diperluas ke 330+ kata familiar sehari-hari

### v2.0 — Word Search Arcade (Sebelumnya)
- Mode dengan 5 kata target yang ditampilkan di panel samping
- Kata target langsung diganti setelah ditemukan
- Dihapus karena mengurangi kebebasan bermain

### v1.0 — Versi Awal (4×4)
- Grid 4×4 dengan kata zig-zag acak
- Fitur Hint (petunjuk) — dihapus atas permintaan
- Timer 30 detik (max 60 detik)
- Combo multiplier, Fever mode, floating toast
- Web Audio API sound effects
- Desain English Club brand (Royal Blue + Vibrant Yellow + Dark Navy)
