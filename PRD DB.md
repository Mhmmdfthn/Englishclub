# /tasks/prd-hybrid-database-setup.md

## 1. Introduction/Overview
Saat ini aplikasi membutuhkan sistem penyimpanan data yang handal untuk di-deploy ke Vercel. Karena lingkungan Vercel bersifat *serverless* (tidak bisa menyimpan file fisik seperti JSON secara dinamis), sistem database akan menggunakan arsitektur Hybrid. Data dengan *traffic* tinggi (Leaderboard dan Stories) akan disimpan di Vercel KV (berbasis JSON/Redis), sedangkan data administratif (Pendaftaran Members) akan dikirim ke Google Sheets. Sistem juga akan dilengkapi dengan mekanisme *retry* dan *caching* untuk mengatasi limit API Google.

## 2. Goals
* Memastikan data Leaderboard dan Stories dapat dibaca dan ditulis dengan sangat cepat tanpa terkena limit API.
* Memudahkan panitia/admin melihat data pendaftar baru langsung melalui UI visual Google Sheets.
* Mencegah hilangnya data pendaftar jika API Google Sheets sedang *down* atau terkena *rate limit*.

## 3. User Stories
* **Sebagai pemain**, saya ingin skor saya langsung masuk ke Leaderboard tanpa *error* atau *loading* lama, berapapun jumlah orang yang sedang bermain.
* **Sebagai admin**, saya ingin melihat daftar mahasiswa yang mendaftar UKM secara *real-time* di file Spreadsheet yang sudah saya bagikan ke panitia lain.
* **Sebagai sistem**, saya harus bisa menyimpan data pendaftar sementara jika Google Sheets menolak koneksi, lalu mencoba mengirimkannya lagi nanti.

## 4. Functional Requirements
1. **Setup Vercel KV (Leaderboard & Stories):**
   * Integrasikan *library* `@vercel/kv` pada *backend*.
   * Rute GET/POST untuk Leaderboard dan Stories sepenuhnya diarahkan untuk membaca dan menulis struktur JSON/Array dari memori Vercel KV.
2. **Setup Google Sheets (Members):**
   * Integrasikan `googleapis` menggunakan *Service Account credentials*.
   * Rute POST `/api/members` akan menambahkan (append) baris baru ke dalam Spreadsheet "Members".
3. **Mekanisme Caching (Baca Data Sheets):**
   * Jika ada fitur di *frontend* yang perlu menampilkan data Pendaftar dari Sheets, *backend* harus menyimpan *cache* respon tersebut di memori selama minimal 2 menit. *Request* dalam rentang waktu tersebut akan disajikan dari *cache*, bukan dengan memanggil API Google.
4. **Sistem Antrean/Retry (Tulis Data Sheets):**
   * Saat *backend* mencoba POST ke Google Sheets dan mendapatkan *error* (misal: 429 Too Many Requests), tangkap *error* tersebut.
   * Simpan *payload* pendaftar yang gagal terkirim ke dalam list khusus di **Vercel KV** (misal: dengan key `failed_members_queue`).
   * Buat satu *endpoint* khusus (atau jalankan pengecekan setiap kali ada *request* baru) yang bertugas mengecek `failed_members_queue` ini. Jika ada data, coba kirim ulang ke Sheets, lalu hapus dari *queue* jika berhasil.

## 5. Non-Goals (Out of Scope)
* **Dashboard Admin Web:** Pembuatan UI *frontend* khusus untuk admin melihat pendaftar tidak diprioritaskan, karena fungsi tersebut sudah digantikan oleh kemudahan akses langsung via Google Sheets.
* **Menyimpan Gambar Langsung ke Sheets:** URL gambar pendaftar (jika ada) diasumsikan sudah di-handle oleh Cloudinary atau pihak ketiga, sehingga *backend* hanya menerima dan memproses string URL.

## 6. Technical Considerations
* **Serverless Lifecycle Vercel:** Fungsi *backend* di Vercel maksimal hanya hidup selama 10-15 detik pada tier gratis. Oleh karena itu, logika *retry* (antrean) **tidak boleh** menggunakan `setTimeout` atau proses *background* murni di memori RAM. Data yang gagal harus dilempar ke Vercel KV terlebih dahulu sebagai *storage* antrean sementara yang persisten.
* **Keamanan Kredensial:** Seluruh kredensial Google (*Client Email, Private Key, Spreadsheet ID*) dan kredensial Vercel KV (REST API URL, Token) harus disimpan secara ketat di *Environment Variables* Vercel, tidak boleh di-*hardcode* di *source code*.

## 7. Success Metrics
* Halaman Leaderboard dan Stories dapat memuat data dalam waktu kurang dari 500ms (rata-rata kecepatan Vercel KV).
* 100% *Zero Data Loss* untuk pendaftaran; semua data masuk ke Sheets meskipun API Google sempat terkena limit.
* Log Vercel tidak memunculkan *crash* akibat *timeout*.

## 8. Open Questions
* Bagaimana struktur kolom pasti yang harus disiapkan panitia di file Google Sheets untuk tabel Members? (Perlu diselaraskan dengan input form di *frontend*).