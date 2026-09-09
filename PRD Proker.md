# /tasks/prd-proker-management.md

## 1. Introduction/Overview
Fitur Program Kerja (Proker) dirancang untuk menampilkan daftar kegiatan dan agenda UKM English Club secara dinamis kepada pengunjung website. Data proker akan disimpan di dalam Vercel KV untuk menjamin waktu muat (load time) yang sangat cepat. Proses penambahan, pengubahan, dan penghapusan data proker hanya dapat dilakukan oleh panitia melalui halaman *dashboard* admin yang dilindungi oleh autentikasi token.

## 2. Goals
* Menyajikan informasi program kerja UKM yang komprehensif (mencakup judul, gambar, jadwal, dan status) kepada pengunjung dengan kecepatan maksimal.
* Menyediakan antarmuka manajemen (Admin UI) yang mudah digunakan oleh panitia tanpa harus mengedit kode sumber atau mengakses *database* secara manual.
* Memastikan hanya pengguna yang memiliki akses rahasia (token) yang dapat memodifikasi data proker.

## 3. User Stories
* **Sebagai pengunjung website**, saya ingin melihat daftar program kerja UKM English Club yang menampilkan gambar, tanggal pelaksanaan, dan status kegiatan (Akan Datang/Selesai) agar saya mengetahui agenda komunitas.
* **Sebagai admin/panitia**, saya ingin menambahkan proker baru atau mengubah status proker yang sudah selesai melalui halaman admin tanpa memerlukan bantuan *programmer*.
* **Sebagai sistem**, saya harus memblokir semua upaya penambahan atau penghapusan proker jika *request* tersebut tidak menyertakan *password/token* admin yang sah.

## 4. Functional Requirements
1. **Struktur Data (Vercel KV):**
   * *Backend* harus menyimpan array objek JSON di Vercel KV melalui fungsi di `backend/server/utils/prokerStore.js`[cite: 1].
   * Skema data wajib mencakup: `id` (unik), `title` (string), `description` (teks panjang), `imageUrl` (string URL dari Cloudinary), `date` (format tanggal), dan `status` (enum: "upcoming", "ongoing", "completed").
2. **Public API (GET):**
   * *Endpoint* GET di `backend/server/routes/proker.js`[cite: 1] harus mengembalikan seluruh daftar proker yang ada di Vercel KV. *Endpoint* ini bersifat publik (tidak perlu token).
3. **Protected Admin API (POST, PUT, DELETE):**
   * *Endpoint* untuk menambah, mengedit, dan menghapus proker di `backend/server/routes/proker.js`[cite: 1] wajib mengekstrak *header* `Authorization`.
   * Sistem harus mencocokkan token yang dikirim dengan *environment variable* `ADMIN_TOKEN` (seperti yang dikonfigurasi di `backend/.env.example`[cite: 1]). Jika tidak cocok, kembalikan status `401 Unauthorized`.
4. **Admin UI (Frontend):**
   * Komponen `frontend/src/components/AdminView.vue`[cite: 1] harus memiliki form input untuk mengisi Judul, Deskripsi, URL Gambar, Tanggal, dan Dropdown Status.
   * Komponen ini harus menyimpan input token admin (bisa lewat *prompt* atau input *field* khusus) yang akan disertakan pada setiap *request* mutasi data ke *backend*.
5. **Tampilan Publik (Frontend):**
   * Halaman utama harus menampilkan *list* atau *grid card* proker. Jika `imageUrl` kosong, gunakan gambar *fallback* (misal: logo UKM `Logo_ec.jpg` dari folder `frontend/public/`[cite: 1]).

## 5. Non-Goals (Out of Scope)
* **Direct Image Upload ke Server:** *Backend* tidak akan menangani proses *upload* file fisik gambar proker. Admin harus mengunggah gambar ke Cloudinary (atau layanan serupa) terlebih dahulu secara mandiri dan menempelkan URL-nya ke form.
* **Sistem Akun Multi-Admin:** Tidak ada fitur *login* menggunakan *username* atau email (*Role-Based Access Control* kompleks). Cukup satu `ADMIN_TOKEN` rahasia yang dibagikan secara internal ke panitia inti.

## 6. Design Considerations
* **Status Badges:** Pada tampilan *frontend*, gunakan label visual (misal: warna hijau untuk "Completed", kuning untuk "Upcoming") agar pengunjung cepat memahami status proker.
* **Error Handling di Admin:** Jika token salah, UI di `AdminView.vue`[cite: 1] harus memunculkan notifikasi "Token tidak valid" dan membersihkan *form* untuk mencegah kebingungan admin.

## 7. Technical Considerations
* Middleware Autentikasi: Sangat disarankan untuk memisahkan logika pengecekan token ke dalam file *middleware* tersendiri (misal: menggunakan fungsi di `backend/server/utils/auth.js`[cite: 1]) agar dapat digunakan ulang pada *route* sensitif lainnya.
* Vercel KV beroperasi secara *asynchronous* (`Promise`-based). Pastikan semua rute POST/PUT/DELETE di `backend/server/routes/proker.js`[cite: 1] menggunakan `async/await` dan blok `try...catch` yang rapi.

## 8. Success Metrics
* Halaman Admin berhasil melakukan verifikasi token dengan benar 100% dari waktu (akses tanpa token tertolak seketika).
* Penambahan proker baru melalui form admin otomatis muncul di halaman publik tanpa perlu me-*refresh* (*restart*) server Vercel.

## 9. Open Questions
* Apakah *frontend* memerlukan fitur filter proker berdasarkan status (misalnya menampilkan *tab* terpisah antara "Proker Aktif" dan "Proker Selesai")?