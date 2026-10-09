# Homepage Inspiration — Playful Edu Modern

> Arah Locked: **Playful Edu modern** untuk homepage publik.
> Scope: homepage saja (`PublicNavbar`, `HeroSection`, `ActionDock`, `HappeningSection`, `AboutSection`, `StoriesSection`, `SiteFooter`).
> Referensi = bukti pola interaksi/visual, bukan template untuk di-clone pixel-per-pixel.
> PRD Locked (`PRD_Homepage_Redesign.md`) tetap menang jika bertentangan.

## 1. Goal homepage (5 detik)

- Guest langsung paham: ini English Club UPB, tempat `Learn. Connect. Grow.`
- Member langsung bisa aksi: `Absen`, `Materi`, `Word Hunt` via Action Dock tanpa scroll jauh.
- Tidak ada section terasa seperti dashboard SaaS generik atau landing AI generik.

## 2. Referensi yang dipakai

### A. Hero + maskot — Duolingo / ClassDojo pattern

Sumber pola:
- https://www.duolingo.com/
- https://www.classdojo.com/

**Pattern yang dipinjam:**
- Komposisi 2 kolom desktop: teks kiri, maskot + environment kanan.
- Maskot menyatu dengan background, bukan PNG mengambang.
- 1 primary CTA dominan.

**Adaptasi ke English Club:**
- Teks kiri: `English Club UPB` + `Learn. Connect. Grow.` + 1 kalimat supporting + 1 CTA `Explore English Club →`.
- Kanan: Eli (croc hoodie robot). Background paling detail di kanan, melembut + blur ke tengah-kiri agar teks terbaca.
- Token: Blue `#0B569B` untuk CTA, Yellow `#FFE600` aksen terkontrol, font `Outfit` headline + `Plus Jakarta Sans` body.

**Yang TIDAK dipinjam:**
- Gradient ungu-biru, aurora/blob, glow berlebihan, 2 CTA sejajar, quote panjang di hero.

### B. Daftar program — Eventbrite / Meetup pattern

Sumber pola:
- https://www.eventbrite.com/d/online/events/
- https://www.meetup.com/find/events/
- Detail implementasi: `FE-WHATS-HAPPENING.md`

**Pattern yang dipinjam:**
- Filter status chips di atas list: `All`, `Upcoming`, `Ongoing`, `Completed`.
- Anatomi card konsisten: cover + judul + tanggal/status + deskripsi pendek + aksi `View`.
- Filter jalan di client dari data `/api/proker` existing, tanpa endpoint baru.

**Adaptasi ke English Club:**
- Header tetap: `What's Happening at English Club?`
- Panel judul tinted restrained: kuning pucat (upcoming), hijau pucat (ongoing), biru pucat (completed).
- Label status Indonesia di card (`Akan datang`, `Berlangsung`, `Selesai`), label filter Inggris mengikuti referensi visual.
- Ukuran card dikunci: `clamp(260px, 30vw, 330px)` desktop, `min(78vw, 300px)` mobile.

**Yang TIDAK dipinjam:**
- Taxonomy kategori Fever yang berat, angka attendee palsu, tanggal palsu, horizontal rail wajib drag tanpa keyboard.

### C. Stories — editorial komunitas pattern

Sumber pola: blog komunitas kampus / Medium publication.

**Pattern yang dipinjam:**
- 1-2 story tampil sekaligus, hierarki quote kuat, identitas penulis jelas.
- Terasa seperti momen editorial, bukan panel review produk.

**Adaptasi ke English Club:**
- Judul: `Stories from English Club`.
- Pakai data `stories` existing, tanpa invent testimoni.
- Loading / empty / error state tetap ada.

## 3. Preservation contract (tidak boleh diubah demi inspirasi)

- Route existing tetap hidup: `/`, `/program/:id`, Word Hunt, login.
- Data dari API existing: proker, stories. Tidak ada program/story/contoh palsu.
- Gambar program asli tetap tampil sebagai crop foto kompak di panel judul. Jangan ganti dengan ilustrasi/gradient.
- Navbar: sticky, ringan, tanpa hamburger, menyatu dengan hero. Link: `Home, What's Happening, About, Stories, Login`.
- Action Dock: `Home, Absen, Materi, Word Hunt`. Bukan navbar kedua: lebih ringan dari headline, ikon konsisten, tanpa heading `Quick Access`.
- `Absen` / `Materi` belum punya backend contract — jangan karang endpoint. Perilaku sebelum backend siap diputuskan bersama backend dev (lihat `FE-FLOW.md` §4A, `FE-TASKS.md`).
- Aksesibilitas: chip filter = `<button>` + `aria-pressed` + focus visible; area horizontal tetap bisa keyboard; kontras di atas hero terbaca; hormati `prefers-reduced-motion`.

## 4. Checklist review referensi → implementasi

- [ ] Perubahan terbatas pada section homepage yang diminta.
- [ ] Aset gambar asli tetap ada, alt text bermakna.
- [ ] Ukuran card / layout terkunci tidak berubah tanpa permintaan eksplisit.
- [ ] Filter hanya memfilter data existing, tanpa request baru.
- [ ] Desktop + mobile sama-sama disengaja (grid wrap 3-2-1, bukan rail tersembunyi).
- [ ] Token EC dipakai, bukan copy warna/font referensi.
- [ ] Lolos `FE-SOP-Anti-Slop.md` §20 audit + §21 Distinctiveness Test.

## 5. Cara pakai file ini bersama AI

Kirim minimal: `00-INDEX.md` + `PRD_Homepage_Redesign.md` + `FE-DESIGN-SYSTEM.md` + file ini + komponen target (misal `HeroSection.vue`).
Minta AI isi dulu: Pattern / Purpose / Adaptasi / Preserved behavior untuk tiap perubahan, baru coding.
