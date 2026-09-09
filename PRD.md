# /tasks/prd-local-word-validation.md

## 1. Introduction/Overview
Saat ini, game menebak kata memvalidasi setiap input pengguna dengan mengirimkan *request* ke *backend* untuk dicocokkan dengan daftar 300.000 kosakata. Hal ini menyebabkan *lag* saat bermain dan berisiko membebani *server* atau terkena limit *request*. Fitur ini akan memindahkan beban komputasi validasi kata ke *client-side* (browser pengguna). Data kosakata dari file `backend/server/data/words.txt`[cite: 1] akan diunduh sekali, disimpan di penyimpanan lokal browser, dan divalidasi tanpa koneksi internet selama permainan berlangsung.

## 2. Goals
* Menghilangkan *delay* atau *lag* jaringan (ping) saat pemain memvalidasi kata selama permainan.
* Mengurangi beban *request* ke *server* secara drastis (API hanya dipanggil saat *game over*).
* Mencegah manipulasi skor dasar dengan menambahkan batas maksimal masuk akal pada *backend*.

## 3. User Stories
* **Sebagai pemain**, saya ingin mendapatkan *feedback* instan (benar/salah) saat memasukkan kata, sehingga sisa waktu bermain saya tidak terbuang untuk menunggu *loading server*.
* **Sebagai pemain**, saya ingin game tetap bisa memvalidasi kata dengan lancar meskipun koneksi internet saya tiba-tiba tidak stabil saat permainan berlangsung.
* **Sebagai admin**, saya ingin *server* menolak skor yang angkanya mustahil dicapai oleh manusia, agar *leaderboard* tetap adil.

## 4. Functional Requirements
1. **Pengecekan Cache Lokal:** Saat komponen game dimuat, sistem *frontend* harus mengecek ketersediaan data kosakata di `IndexedDB` browser.
2. **Pengunduhan Kosakata:** Jika data belum ada di `IndexedDB`, *frontend* harus melakukan *fetch* (GET) ke *backend* untuk mengunduh daftar kata, lalu menyimpannya ke `IndexedDB`. Jika data sudah ada, lewati langkah pengunduhan.
3. **Pemuatan ke Memori:** Sebelum timer game dimulai, *frontend* harus memuat daftar kata dari `IndexedDB` ke dalam memori variabel Vue (disarankan menggunakan struktur data `Set` pada JavaScript untuk pencarian super cepat).
4. **Validasi Lokal:** Selama game berjalan, fungsi pengecekan kata hanya boleh memvalidasi input terhadap variabel memori lokal tersebut. Tidak boleh ada API *call* ke *backend*.
5. **Pengiriman Skor (Game Over):** Saat waktu habis, *frontend* mengirimkan satu *request* POST berisi JSON `{ "name": "...", "score": ... }` ke *backend*.
6. **Validasi Anti-Cheat Dasar:** *Backend* menerima POST skor, lalu memvalidasi angka tersebut. Jika skor melebihi batas logika matematis (contoh: batas waktu 60 detik, rata-rata ketik manusia maksimal 2 kata per detik, skor maksimal yang diizinkan adalah X), *backend* harus merespons dengan *error* dan menolak menyimpan skor tersebut.

## 5. Non-Goals (Out of Scope)
* **Integrasi Google Sheets:** Mekanisme penyimpanan hasil akhir skor ke *database* atau Google Sheets tidak dibahas di sini dan akan dikerjakan pada PRD terpisah.
* **Anti-Cheat Lanjutan:** Tidak perlu membuat sistem pelacakan *keystroke* (ketikan keyboard), enkripsi *payload* yang rumit, atau pelacakan pergerakan *mouse*. Validasi skor maksimal di *backend* sudah cukup.

## 6. Design Considerations
* **Loading State:** Karena pengunduhan awal 300.000 kata mungkin memakan waktu 1-3 detik tergantung koneksi, tambahkan indikator *loading* (misal: "Memuat Kamus Data...") di antarmuka sebelum tombol "Mulai Main" bisa diklik.
* Proses validasi saat pemain mengetik harus terasa instan tanpa *flicker* di UI.

## 7. Technical Considerations
* **Penggunaan IndexedDB:** Jangan menggunakan `localStorage` karena batasnya hanya sekitar 5MB dan pengoperasiannya *synchronous* (bisa membuat browser *freeze*). Gunakan `IndexedDB` murni, atau gunakan *wrapper library* ringan seperti `idb` atau `localforage` agar mudah menggunakan format *Promise/async-await*.
* **Struktur Data:** Saat menyimpan daftar kata di RAM/Variabel Vue untuk divalidasi, gunakan objek `Set` (`const wordSet = new Set(wordArray)`), bukan `Array`. Mengecek kata dengan `wordSet.has(input)` jauh lebih cepat (O(1)) daripada `wordArray.includes(input)` (O(n)) untuk 300.000 data.

## 8. Success Metrics
* Jumlah *request* API ke *server* selama sesi permainan aktif adalah 0 (Nol).
* Pengguna yang memuat ulang (*refresh*) halaman untuk kedua kalinya tidak lagi mengunduh data 2-4 MB (memanfaatkan *cache* lokal).
* *Backend* berhasil mengembalikan kode status HTTP `400 Bad Request` atau `406 Not Acceptable` jika ada pengguna yang mengirimkan *payload* skor di luar batas wajar secara manual.

## 9. Open Questions
* Berapa batas maksimal skor (*Max Possible Score*) yang akan kita tetapkan di *backend*? (Perlu dihitung berdasarkan mekanik poin dan durasi *timer* game saat ini).