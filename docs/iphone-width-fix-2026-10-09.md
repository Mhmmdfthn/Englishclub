# Fix Lebar iPhone (geser / width kurang pas) — 2026-10-09

Status: menunggu ACC di iPhone fisik (Safari + Chrome iOS).

Lanjutan dari `docs/absensi-polish-2026-10-09.md`. Tanpa ubah BE.

## Gejala
- Android aman. Di iPhone lebar halaman terasa kurang pas: disentuh /
  kesenggol sedikit langsung bergeser kanan-kiri.
- Area yang terlihat: landing page awal, kemungkinan merembet ke halaman lain.
- Perilaku beda antar browser (Safari vs Chrome iOS).

## Root cause
1. `overflow-x: hidden` hanya di `body` (`frontend/src/style.css`).
   Safari iOS terkenal mengabaikannya (bug WebKit 153852 + regresi Safari 26).
   Penguncian harus di `html` + `body` + wrapper, pakai `clip` (bukan `hidden`)
   supaya `position: sticky` (navbar dashboard, navbar landing) tidak rusak.
2. Scroller horizontal bersarang tanpa penahan gesture: link navbar mobile
   (`PublicNavbar.vue`), dock track (`ActionDock.vue`), strip filter
   (`HappeningSection.vue`). Swipe diagonal di atasnya merambat ke halaman
   (bug WebKit 240861). Rail (`HorizontalRail`) sudah aman karena punya
   `overscroll-behavior-x: contain` — ketiga lainnya disamakan.
3. Safari auto-zoom tiap fokus input < 16px (`.ec-field` ±15px). Berlaku di
   form cerita (landing!), absensi, dan login. Halaman jadi "mengambang" dan
   bisa di-pan. Fix: 16px khusus perangkat sentuh, TANPA `maximum-scale=1` /
   `user-scalable=no` agar pinch-zoom tetap bisa (aksesibilitas).
4. Rantai `min-width: 0` putus di `.dash__body`, `.presensi*`, kartu Happening:
   anak lebar (nama panjang, token `ECA1:...`, label tombol nowrap) mendorong
   halaman. Tombol `.ec-btn` global `white-space: nowrap` + label panjang
   ("Buka Kamera & Scan QR") meluap di 320–375px.
5. `background-attachment: fixed` di body buggy di iOS (repaint goyang).

Sengaja TIDAK dipakai: `touch-action` locking global — karena aturan
intersection akan mematikan scroll horizontal rail DAN merusak gesture
Word Hunt (`GameBoard.vue` butuh `touch-action: none` miliknya sendiri).

## Yang diubah (FE saja, 6 file)
- `frontend/src/style.css`
  - `html, body`: `overflow-x: clip; width: 100%`; `body: position: relative`;
    body `hidden` -> `clip` + `overscroll-behavior-x: none`;
    `#app`: `max-width: 100%; overflow-x: clip`.
  - `@media (pointer: coarse)`: `input/select/textarea/.field` 16px
    (+ `input.ec-field` dkk. untuk menang cascade lokal).
  - `@media (hover: none)`: `background-attachment: scroll`.
- `frontend/src/styles/design-system.css`
  - `@media (pointer: coarse)`: `.ec-field` 16px (ditaruh di sini karena file
    ini dimuat setelah `style.css` — lihat `main.js`).
- `frontend/src/components/home/PublicNavbar.vue` — `.ec-nav__links`:
  `min-width: 0` + `overscroll-behavior-x: contain` (scoped).
- `frontend/src/components/home/ActionDock.vue` — `.dock__track`:
  `min-width: 0` + `overscroll-behavior-x: contain` (scoped).
- `frontend/src/components/home/HappeningSection.vue`
  - `.happening__filters`: `overscroll-behavior-x: contain` +
    `max-width: calc(100% + var(--ec-gutter) * 2)` (kunci strip full-bleed).
  - `.happening__card`: `min-width: 0`.
- `frontend/src/components/PresensiView.vue`
  - `.presensi/.presensi__form/.presensi__card`: `min-width: 0`;
    `.presensi .ec-btn`: boleh wrap (`white-space: normal`, scoped saja —
    `.ec-btn` global tidak diubah); tombol aksi full-width di ≤400px.
  - `.presensi__reader, .presensi__reader *`: `max-width: 100%` (kekang DOM
    suntikan `html5-qrcode` yang ber-width fix).
  - `.ec-field--mono`: 16px di `(pointer: coarse)` (scoped menang atas global).
- `frontend/src/components/MemberDashboardView.vue`
  - `.dash__body`: `min-width: 0` + `overflow-x: clip`.

Tidak diubah: `backend/*`, `api.js`, logika rail/drift, viewport meta,
warna/desain, alur check-in.

## Verifikasi yang sudah dilakukan
- `npm run build` dari root lolos (1927 modules, ~14 dtk).
- Aturan baru confirmed ada di `dist/assets/*.css`
  (`overflow-x:clip`, `overscroll-behavior-x:contain`, `max(16px`).
- Grep memastikan tidak ada `maximum-scale` / `user-scalable=no` /
  `touch-action` locking baru (yang ada hanya bawaan game + `manipulation`).

## Verifikasi yang butuh iPhone fisik (ACC)
1. Safari iPhone 320/375/390/430: `document.documentElement.scrollWidth <=
   window.innerWidth` di landing, dashboard/absensi, login.
2. Swipe diagonal di atas navbar-links / dock / filter / stories-rail tidak
   menggeser halaman.
3. Ketuk form cerita (landing) + password (absensi/login) tidak auto-zoom.
4. Pembanding Chrome iOS + 1 Android: tidak regresi; gesture Word Hunt normal.
5. Pinch-zoom masih bisa (tidak dikorbankan).

## Rollback
- Per file: `git checkout -- <path file di atas>`.
- Full: `git stash` / `git diff` untuk review sebelum commit.
- Menghapus file catatan ini tidak mengubah kode.
