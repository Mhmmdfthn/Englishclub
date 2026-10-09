# Polish Absensi — 2026-10-09

Status: menunggu ACC.

## Masalah awal
- Halaman Absensi (`/dashboard` > tab Absensi) terlihat penuh: dua CTA berantem
  (biru `Buka Kamera & Scan QR` + kuning full-block `Catat Kehadiran`).
- Password wajib diisi sebelum scan, tapi browser (Edge/Chrome) tidak menawarkan
  autofill. User harus ketik manual tiap kali.
- Error merah `Isi password akun dulu sebelum scan.` muncul seolah permanen.
- Kolom kode manual selalu terbuka penuh padahal jarang dipakai.
- Copy menyuruh ketik password dulu, padahal QR berganti tiap 7 detik —
  keburu kedaluwarsa (`410`) saat user mengetik.

## Root cause (tanpa ubah BE)
- Kontrak BE tidak berubah: `POST /api/attendance/checkin` tetap butuh
  `{ qr, password }` + `Authorization: Bearer <member_token>`
  (`backend/server/routes/attendance.js:136-168`). Alasan password ganda
  kemungkinan re-auth / anti pinjam HP login — sengaja tidak dihapus
  karena yang pegang BE sedang sibuk.
- Autofill gagal karena input password berdiri sendiri, bukan di `<form>`,
  tanpa field username dan tanpa `name="password"`
  (sebelumnya `frontend/src/components/PresensiView.vue:245-252`).
  Password manager butuh `<form>` + `username` + `password` + tombol submit.
  Login (`MemberLoginView.vue`) sudah benar pakai `<form>`, absensi belum.
- Gate `if (!password) return` di `startScan()` memaksa ketik dulu baru boleh
  buka kamera → balapan dengan masa berlaku QR.

## Yang diubah (hanya FE, 1 file)
File: `frontend/src/components/PresensiView.vue` (BE, `api.js`,
`QrDisplayView.vue`, `MemberDashboardView.vue`, `design-system.css` tidak disentuh).

1. Bungkus check-in jadi `<form autocomplete="on" @submit.prevent="submit">`.
   Tambah hidden username (`name="username"`, `autocomplete="username"`,
   dari `localStorage member_username`) + `name="password"`,
   `autocomplete="current-password"` + toggle Lihat/Sembunyi.
   Payload API sama persis, jadi tanpa perubahan BE.
2. Hierarki tombol: Scan = satu-satunya `ec-btn--primary`;
   `Catat Kehadiran` jadi `ec-btn--secondary`, `type="submit"`,
   `:disabled` sampai ada kode QR. Hilangkan kuning full-block yang teriak.
3. Kode manual dipindah ke `<details><summary>Kamera bermasalah? ...</summary>`.
   Default tertutup.
4. Alur scan-first: gate password di `startScan()` dilepas. Hasil scan hanya
   mengisi `qrText`; kalau password kosong, fokus ke password + pesan
   `QR terbaca. Isi password akun lalu tekan Catat Kehadiran.`
   Kalau password sudah ada, tetap auto-submit seperti semula.
5. Hero sesi: badge `Live` (`ec-badge--completed` + dot pulse, nonaktif saat
   `prefers-reduced-motion`) + banner `Kamu sudah tercatat hadir...`
   (FE-only, dari data `mine` yang sudah ada).
6. List `Hadir` / `Recent`: `max-height: 320px; overflow-y: auto`.
   Result banner tetap `v-if="result"` + `aria-live="polite"`.
   Semua styling pakai token `--ec-*` existing, tanpa warna/bayangan baru.

## Yang sengaja TIDAK diubah
- Tidak hapus field password, tidak ubah endpoint/rate-limit BE.
- Tidak tambah dependency, animasi selebrasi, ilustrasi, atau warna baru.
- Tidak ubah logika QR 7-detik, polling 5 detik, insecure-context guard.

## Cara test ulang (ACC)
1. `npm run build` dari root (bukan `frontend/` langsung) — lolos 2026-10-09.
2. Login → tab Absensi:
   - Edge/Chrome menawarkan autofill password (sebelumnya tidak).
   - Saat pertama buka, tidak ada banner merah.
   - `Catat Kehadiran` disabled sampai ada kode QR.
   - Buka Kamera tanpa isi password → bisa. Selesai scan → diminta password.
   - Password salah → `Password salah.` QR lama → `QR kedaluwarsa...`
3. Cek mobile 360px + desktop 1180px, tidak overflow, target sentuh ≥44px.
4. Tab `Display QR` hanya untuk superadmin (`canDisplay`) — tidak berubah.

## Rollback
- `git diff -- frontend/src/components/PresensiView.vue` untuk lihat diff.
- `git checkout -- frontend/src/components/PresensiView.vue` untuk batalkan semua.
- File ini hanya catatan; menghapus file ini tidak mengubah kode.

## Tindak lanjut (butuh BE, belum dikerjakan)
- Hapus `password` dari check-in, andalkan Bearer saja + rate-limit device,
  kalau disetujui pemilik BE. Itu yang bikin flow jadi 1 langkah.
