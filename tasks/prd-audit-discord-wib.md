# PRD: Audit Discord + Penyeragaman Timestamp WIB

## 1. Introduction/Overview

Aplikasi Englishclub tidak punya jejak audit: aksi admin (tambah/edit/hapus proker, login) dan aksi publik penting (pendaftaran, skor, stories) terjadi tanpa catatan terpusat. Selain itu timestamp yang tampil bukan WIB — backend menulis `new Date().toISOString()` (UTC) lalu memotongnya, sehingga jam yang terlihat selisih ±7 jam dari waktu Indonesia.

PRD ini menetapkan dua hal: (a) setiap aksi penting dikirim sebagai pesan audit terstruktur ke channel Discord melalui Discord App/Webhook dalam dua kategori — **aktivitas admin** dan **log teknis**; (b) semua timestamp tetap disimpan UTC/ISO, dan **aturan WIB berlaku di backend maupun frontend** — backend menyajikan waktu WIB siap tampil, frontend memformatnya dengan helper yang sama.

## 2. Goals

- 100% aksi admin (CRUD proker, upload/hapus foto, login/logout, export CSV) dan aksi publik penting (pendaftaran member, skor leaderboard, stories) menghasilkan event audit.
- Setiap event audit tiba di channel Discord ≤ 5 detik setelah aksi terjadi (best-effort, non-blocking).
- Semua waktu yang dilihat manusia (Discord, API, web) tersedia dalam WIB dengan label zona eksplisit, tanpa mengubah format simpan yang sudah ada.
- Kegagalan pengiriman audit tidak pernah menggagalkan request utama (audit bersifat fire-and-forget).

## 3. User Stories

- **Sebagai Admin**, saya menerima notifikasi Discord setiap ada perubahan data (mis. "Proker X diedit oleh admin Y, 12 Sep 2026 20:15 WIB") sehingga aktivitas mencurigakan langsung terlihat.
- **Sebagai Developer**, saya menerima log teknis di channel Discord terpisah saat terjadi error (KV gagal, validasi gagal berulang, login gagal) beserta pesan error yang jelas, bukan kegagalan diam-diam.
- **Sebagai Pengguna/Pendaftar**, saya melihat jam pendaftaran dan jam stories dalam WIB yang benar, bukan jam UTC.

## 4. Functional Requirements

1. **Pengiriman audit ke Discord:** Backend wajib mengirim event audit via `DISCORD_WEBHOOK_URL` (satu webhook untuk aktivitas admin, satu opsional untuk log teknis — bila env kedua kosong, pakai webhook yang sama dengan prefix `[TEKNIS]`).
2. **Kategori aktivitas admin:** catat tambah/edit/hapus proker (sertakan id + judul), upload/hapus foto, login/logout admin (sertakan username), export CSV. Format pesan: aksi, aktor, id data, waktu WIB.
3. **Kategori log teknis:** catat error penyimpanan (KV/DB/Sheets gagal), validasi 422 yang berulang dari IP sama (>10/menit), login gagal, dan guard `INVALID_PROKER_PAYLOAD`/`WRONGTYPE` yang terpicu. Sertakan route, status HTTP, dan pesan error (tanpa secret/token/password).
4. **Cakupan aksi publik:** pendaftaran member, submit skor, tambah story ikut dicatat sebagai event ringkas (tanpa no_hp / tanpa data sensitif).
5. **Non-blocking:** pengiriman Discord dilakukan async fire-and-forget di dalam `try...catch` sendiri; kegagalannya hanya `console.error`, tidak mengubah status respon API.
6. **Format simpan tidak berubah:** `timestamp`/`created_at` tetap ISO-UTC (`toISOString()`). Dilarang menulis WIB ke database.
7. **Helper WIB ganda, satu aturan:**
   - Backend: modul `backend/server/utils/time.js` mengekspor `toWIB(iso)` → string `"12 Sep 2026, 20:15 WIB"` memakai `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ... })`. Dipakai untuk teks/waktu di embed Discord, field waktu tambahan di respon API, dan prefix log server.
   - Frontend: helper `formatWIB()` dengan logika identik untuk semua tampilan jam.
8. **API menyajikan WIB siap tampil:** setiap respon yang memuat waktu (GET members/highlight, stories, leaderboard, proker) menyertakan field turunan siap tampil, mis. `timestamp_wib` / `created_at_wib`, tanpa menghapus field ISO aslinya.
9. **Keamanan:** dilarang mengirim token, password/hash, dan no_hp ke Discord. Webhook URL hanya dari env server, tidak pernah ke frontend.

## 5. Non-Goals (Out of Scope)

- Bot Discord interaktif (slash command, tombol, query balik) — hanya push satu arah.
- Retensi/arsip log jangka panjang di Discord; Discord bukan database audit.
- Migrasi ulang timestamp lama ke WIB (data lama tetap UTC, tinggal diformat saat tampil).
- Perubahan state management frontend selain memakai helper `formatWIB`.

## 6. Design Considerations

- Pesan Discord memakai **embed**: judul = jenis aksi, field = aktor / data / route+status (untuk teknis), footer = waktu WIB, warna embed hijau (sukses), kuning (validasi), merah (error).
- Dua channel disarankan: `#audit-aktivitas` dan `#audit-teknis`; bila satu channel, bedakan dengan prefix dan warna.
- Helper `formatWIB` ditaruh di satu modul util frontend agar konsisten di semua komponen.

## 7. Technical Considerations

- Tambah env `DISCORD_WEBHOOK_URL` (+ opsional `DISCORD_TECH_WEBHOOK_URL`) di Vercel dashboard (scope Production) + `backend/.env.example`; tanpa env ini, modul audit no-op (tidak error).
- Buat modul `backend/server/utils/audit.js`: fungsi `auditAdmin(aksi, aktor, detail)` dan `auditTech(route, status, pesan)`; panggil dari rute members/leaderboard/stories/proker/admin setelah operasi sukses/gagal.
- Buat `backend/server/utils/time.js` (butir FR 7); backend dan frontend memakai `timeZone: 'Asia/Jakarta'` dengan suffix eksplisit `WIB`.
- Gunakan `fetch` bawaan Node dengan timeout ~3 detik (AbortController); kegagalan = `console.error` agar muncul di Vercel Logs.
- Hati-hati rate limit webhook Discord (±30 req/menit per webhook): event 422 berulang di-throttle (butir FR 3), jangan kirim tiap GET/read.
- Integrasi dengan modul yang ada: panggil audit setelah `cloudAddMember`/`cloudAddScore`/`cloudAddStory`/`saveProkers`/login; tidak mengubah logika penyimpanan sedia ada.

## 8. Success Metrics

- 1 pendaftaran + 1 edit proker oleh admin memunculkan 2 pesan embed di Discord dengan jam WIB yang benar (±1 menit dari jam tangan).
- Payload `GET /api/stories` dan `/api/members/highlight` memuat pasangan `created_at` (UTC) + `created_at_wib` yang selisihnya tepat +7 jam.
- Mematikan webhook (env dikosongkan) tidak merusak request apa pun (semua endpoint tetap 200/201/422 seperti sebelumnya).
- Semua jam di frontend menampilkan suffix "WIB" dan cocok dengan waktu Indonesia.

## 9. Open Questions

- Satu atau dua channel Discord? (Rekomendasi: dua; konfirmasi ID channel saat implementasi.)
- Apakah event pendaftaran publik yang gagal validasi (422) perlu masuk audit teknis, atau hanya yang sukses? (Rekomendasi: hanya pola berulang, untuk hemat rate limit.)
- Retensi: butuh arsip audit di KV/Postgres kelak, atau Discord cukup? (Di luar scope PRD ini.)
