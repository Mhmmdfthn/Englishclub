# English Club Frontend Redesign

> Concept document for the redesign of the English Club frontend.
>
> Status: Draft
> Scope: Frontend / UX / Visual Direction
> Homepage publik: keputusan Locked ada di `PRD_Homepage_Redesign.md`

---

## 1. Overview

Frontend English Club akan didesain ulang menjadi sebuah platform pembelajaran
English Club yang terasa:

- modern
- sederhana
- ramah
- playful
- educational

Redesign tidak bertujuan untuk mengganti seluruh sistem aplikasi dari awal.

Fokus utama adalah memperbaiki pengalaman dan tampilan frontend yang sudah
berfungsi, terutama pada area yang digunakan langsung oleh anggota:

- Login
- Sign Up
- Dashboard
- Attendance
- Learning / Materials
- Schedule
- Profile

Prinsip utama:

> User should be able to understand what to do next without thinking too much.

---

## 2. Current Repository Alignment

Dokumen redesign harus mengikuti kondisi repo yang benar-benar ada,
bukan mengasumsikan aplikasi sudah memiliki semua fitur yang direncanakan.

Repo saat ini memiliki tiga product surface:

### Public / Community Surface

Sudah ada:

- Landing / profil English Club
- Program kerja dan artikel program
- Word Hunt
- Leaderboard
- Kesan pengunjung / stories
- Entry point login dan sign up anggota

### Member Surface

Sudah ada:

- Login anggota
- Sign Up anggota
- Dashboard anggota
- Profil dasar anggota
- Informasi kelompok

Target redesign utama saat ini adalah surface ini.

### Admin Surface

Sudah ada:

- Admin route tersembunyi
- Pengelolaan pendaftar / member data
- Whitelist / validasi nama
- Pengelolaan akun anggota
- Reset password
- Program kerja / gallery
- Spinner / prize-related functionality

Fitur seperti learning materials, schedule management, dan attendance
tidak boleh dianggap sudah tersedia hanya karena sudah tertulis di
dokumen konsep. Fitur tersebut harus mengikuti implementasi dan contract
backend yang benar-benar tersedia.

### Initial Redesign Focus

Untuk deadline awal, ada dua track:

**Track A — Member flow**

> Member login → Member dashboard → Attendance

**Track B — Homepage publik** (detail di `PRD_Homepage_Redesign.md`)

> Navbar → Hero → Action Dock → What's Happening → About → Stories → Footer

Word Hunt dan admin harus tetap berfungsi selama redesign.
Redesign tidak boleh mengorbankan fitur existing hanya demi mengganti visual.

Login/Sign Up dan Dashboard member tidak ikut didefinisikan di PRD homepage;
keduanya tetap mengikuti dokumen FE ini.

## 2. Problem

Frontend saat ini sudah memiliki beberapa fungsi yang dapat digunakan,
tetapi tampilannya masih cukup basic dan belum memiliki identitas visual
yang kuat sebagai platform English Club.

Beberapa masalah yang ingin diperbaiki:

### 2.1 Visual

- Tampilan masih terasa basic.
- Hierarki informasi belum cukup kuat.
- Komponen belum memiliki visual language yang konsisten.
- Identitas English Club belum terasa kuat pada keseluruhan aplikasi.

### 2.2 User Experience

Pengguna seharusnya dapat melakukan aktivitas utama dengan jumlah langkah
seminimal mungkin.

Contoh:

User ingin melakukan absensi.

Ideal:

Dashboard  
→ Attendance  
→ Check Attendance  
→ Done

Bukan:

Dashboard  
→ menu  
→ submenu  
→ halaman  
→ modal  
→ confirmation  
→ kembali ke dashboard

### 2.3 Product Identity

Website tidak hanya harus "berfungsi", tetapi juga harus memiliki karakter
yang dapat dikenali.

English Club membutuhkan visual identity yang terasa:

> English learning, but not boring.

---

## 3. Redesign Goals

Redesign memiliki tujuan berikut:

### Primary Goals

1. Membuat frontend terlihat modern dan lebih profesional.
2. Membuat user flow lebih sederhana.
3. Membuat dashboard menjadi pusat aktivitas pengguna.
4. Membentuk visual identity English Club yang konsisten.
5. Membuat interface nyaman digunakan pada desktop maupun mobile.
6. Memiliki karakter visual yang memorable melalui Eli dan Tom.

### Secondary Goals

1. Membuat komponen frontend lebih mudah digunakan ulang.
2. Mempermudah pengembangan fitur berikutnya.
3. Mengurangi kebutuhan untuk membuat layout baru dari nol pada setiap halaman.
4. Menjaga desain tetap ringan dan tidak berlebihan.

---

## 4. Design Direction

### Core Direction

> Modern E-learning × English Club × Playful

Desain mengambil inspirasi dari platform e-learning modern, tetapi tetap
memiliki personality sebagai organisasi English Club.

Karakter visual harus berada di antara dua ekstrem:

### Terlalu formal

- seperti dashboard administrasi kampus
- terlalu banyak tabel
- terlalu banyak teks
- terasa kaku

### Terlalu playful

- terlalu ramai
- terlalu banyak ilustrasi
- terlalu banyak animasi
- terasa seperti website anak-anak

Target redesign berada di tengah:

> Professional enough for a university organization,
> playful enough to make learning feel approachable.

---

## 5. Design Principles

### 5.1 Simplicity First

Setiap halaman harus memiliki tujuan utama yang jelas.

User tidak perlu mempelajari interface sebelum menggunakannya.

### 5.2 Minimal User Movement

Kurangi jumlah klik dan perpindahan halaman untuk aktivitas yang sering dilakukan.

Terutama:

- attendance
- melihat aktivitas hari ini
- membuka materi
- melihat jadwal

### 5.3 Clear Hierarchy

Informasi yang paling penting harus paling mudah ditemukan.

Contoh pada dashboard:

1. Greeting / current context
2. Attendance
3. Today's activity
4. Learning progress
5. Secondary information

### 5.4 Consistency

Komponen yang memiliki fungsi sama harus terlihat dan berperilaku sama
di seluruh aplikasi.

Contoh:

- button
- card
- input
- badge
- navigation
- status indicator

### 5.5 Progressive Disclosure

Tidak semua informasi harus ditampilkan sekaligus.

Tampilkan informasi yang dibutuhkan terlebih dahulu.
Informasi tambahan dapat dibuka ketika diperlukan.

### 5.6 Friendly, Not Childish

Interface boleh playful, tetapi tetap sesuai dengan pengguna mahasiswa.

---

## 6. Target Users

### Primary User: English Club Member

Anggota yang menggunakan platform untuk:

- login
- melakukan attendance
- melihat kegiatan
- melihat materi
- melihat jadwal
- memantau progress mereka

Pengguna tidak seharusnya membutuhkan pengetahuan teknis untuk menggunakan
aplikasi.

### Secondary User: English Club Admin

Admin menggunakan platform untuk mengelola aktivitas organisasi.

Kebutuhan admin berbeda dengan kebutuhan member.

Admin membutuhkan interface yang lebih:

- information-dense
- structured
- operational

Sedangkan member membutuhkan interface yang lebih:

- simple
- friendly
- action-oriented

Karena itu, user dashboard dan admin dashboard tidak harus memiliki layout
yang sama.

---

## 7. Product Experience

Aplikasi harus memberikan kesan:

### Saat pertama login

> "Saya langsung tahu apa yang bisa saya lakukan."

### Saat membuka dashboard

> "Saya tahu kondisi saya hari ini."

### Saat ingin absen

> "Saya tidak perlu mencari-cari tombolnya."

### Setelah selesai melakukan aktivitas

> "Saya mendapat feedback yang jelas."

---

## 8. Information Architecture

Struktur utama aplikasi dibagi menjadi tiga area.

### 8.1 Public / Community

- Landing / Homepage (mengikuti `PRD_Homepage_Redesign.md`)
- Program / Program Article
- Word Hunt
- Leaderboard
- Kesan Pengunjung
- Login
- Sign Up

#### Struktur Homepage (per PRD)

```text
Sticky Navbar
↓
Hero (Eli + "Learn. Connect. Grow." + 1 CTA + Action Dock)
↓
What's Happening at English Club?
↓
About
↓
Stories from English Club
↓
Footer
```

Urutan ini provisional sampai visual review.

Dua navigasi yang berbeda dan tidak boleh disatukan:

- Navbar = menjelajah website (Home, What's Happening, About, Stories, Login)
- Action Dock = melakukan aksi penting (Home, Absen, Materi, Word Hunt)

Homepage tidak memakai hamburger menu maupun sidebar.

### 8.2 Member

Current:

- Dashboard
- Member profile / group information

Target redesign / future:

- Attendance
- Learning / Materials
- Schedule
- Profile settings

### 8.3 Admin

Current operational areas:

- Admin Dashboard / hidden admin
- Whitelist / member validation
- Member accounts
- Password reset
- Program kerja / gallery
- Spinner / prize-related management

Jangan menganggap area future sebagai existing functionality.

Struktur ini dapat berkembang mengikuti kebutuhan aplikasi.

---

## 9. Core User Journey

### New User

```text
Landing
   ↓
Sign Up
   ↓
Account Created
   ↓
Login
   ↓
Dashboard
```

### Existing User

```text
Login
   ↓
Dashboard
```

### Attendance

```text
Dashboard
   ↓
Attendance
   ↓
Check Attendance
   ↓
Success / Failed
```

### Learning

```text
Dashboard
   ↓
Learning Content
   ↓
Material / Activity
   ↓
Progress
```

User journey harus selalu menyediakan jalan yang jelas untuk kembali ke
aktivitas utama.

---

## 10. Dashboard Concept

Dashboard merupakan halaman utama setelah login.

Dashboard bukan sekadar kumpulan shortcut.

Dashboard harus memberikan snapshot mengenai:

> "What is happening for me today?"

### Main sections

#### Greeting

Menampilkan konteks personal pengguna.

Contoh:

> Good morning, Fajri!

Dapat digunakan bersama Eli atau Tom secara kontekstual.

#### Attendance

Informasi status kehadiran saat ini.

Contoh status:

- Not yet attended
- Present
- Attendance closed

Attendance merupakan salah satu informasi prioritas tertinggi.

#### Today's Activity

Menampilkan kegiatan terdekat atau kegiatan yang sedang berlangsung.

Contoh:

- English Club Session
- Speaking Practice
- Game / Challenge

#### Learning

Menampilkan materi atau aktivitas yang sedang dapat dilanjutkan.

Contoh:

> Continue Learning

#### Secondary Information

Informasi tambahan dapat ditempatkan setelah area utama.

---

## 11. Mobile-first Consideration

Frontend harus dirancang dengan mempertimbangkan penggunaan melalui mobile
device.

Prinsip:

- primary actions mudah dijangkau
- navigation sederhana
- card tidak terlalu padat
- text tetap terbaca
- button memiliki touch target yang nyaman
- dashboard tidak bergantung pada layout desktop

Desktop tetap didukung, tetapi struktur mobile tidak boleh diperlakukan
sebagai versi desktop yang diperkecil.

---

## 12. Visual Personality

Visual English Club diarahkan menjadi:

### Modern

Menggunakan layout yang bersih dan komponen yang terstruktur.

### Friendly

Menggunakan rounded shapes, bahasa yang tidak terlalu formal, dan
karakter maskot.

### Playful

Menggunakan ilustrasi dan accent color secara terkontrol.

### Educational

Tetap terlihat sebagai platform belajar, bukan sekadar website game.

---

## 13. Mascot System

English Club menggunakan dua karakter utama:

### Eli

Role:

> Primary Mascot

Concept:

Mini cartoon robot dengan crocodile hoodie.

Personality:

- friendly
- curious
- energetic
- slightly playful

Primary usage:

- Homepage hero
- Dashboard
- Login
- Attendance
- Onboarding
- Empty state
- Success state

---

### Tom

Role:

> Secondary Mascot

Concept:

Mini cartoon robot dengan shark hoodie.

Personality:

- playful
- adventurous
- competitive
- energetic

Primary usage:

- Games
- Challenges
- Leaderboard
- Achievement
- Special events

---

## 14. Mascot Design Principles

Eli dan Tom harus terasa sebagai dua karakter dalam satu universe.

Karena itu:

- bentuk robot harus konsisten
- proporsi tubuh harus konsisten
- ekspresi menggunakan visual language yang sama
- outline dan rendering harus konsisten
- warna mengikuti visual identity English Club
- keduanya tidak boleh terlihat seperti karakter dari dua brand berbeda

Mascot digunakan sebagai supporting character.

Mascot tidak boleh ditempatkan pada setiap komponen hanya sebagai dekorasi.

---

## 15. Interaction Personality

Microcopy dan feedback UI boleh memiliki personality yang ramah.

Contoh:

### Attendance belum dilakukan

> Ready to check in?

### Attendance berhasil

> Nice! You're in. 🎉

### Empty state

> Nothing here yet.

### Error

> Something went wrong. Let's try again.

Bahasa harus tetap singkat dan mudah dipahami.

---

## 16. What the Redesign Is Not

Redesign ini bukan:

- membangun ulang backend dari nol
- mengganti framework frontend tanpa alasan
- mengubah seluruh business logic yang sudah berjalan
- menambahkan fitur hanya karena terlihat menarik
- membuat dashboard penuh widget
- membuat interface seperti aplikasi game
- menambahkan animasi berlebihan

Prioritas tetap:

> Existing functionality + better experience.

---

## 17. Scope for Initial Redesign

### Must Have

- Homepage redesign (Navbar, Hero, Action Dock, What's Happening, About, Stories, Footer) sesuai PRD
- Login redesign
- Sign Up redesign
- User Dashboard redesign
- Attendance interface
- Responsive layout
- Consistent navigation
- Design system dasar
- Eli integration

### Should Have

- Materials
- Schedule
- Profile
- Tom integration
- Empty states
- Success states

### Later

- Advanced gamification
- Advanced leaderboard
- Complex animations
- Additional mascot poses
- Dark mode
- Additional personalization

---

## 18. Success Criteria

Redesign dianggap berhasil apabila:

### Visual

- Interface memiliki visual identity yang konsisten.
- Halaman tidak lagi terasa terlalu basic.
- Eli dan Tom terasa menjadi bagian dari produk.
- Desktop dan mobile tetap terlihat rapi.

### UX

- User memahami fungsi utama dashboard dengan cepat.
- Attendance dapat dilakukan tanpa langkah yang tidak diperlukan.
- Navigation mudah dipahami.
- Feedback setelah sebuah action jelas.

### Development

- Komponen visual dapat digunakan kembali.
- Redesign tidak merusak fungsi existing.
- Developer dapat menambahkan halaman baru tanpa membuat style baru
  dari nol.

---

## 19. Design Philosophy

Prinsip paling penting dari redesign:

> Make English learning feel easier to start.

Interface tidak harus terlihat spektakuler.

Interface harus membantu user:

1. mengetahui apa yang harus dilakukan,
2. melakukannya dengan sedikit langkah,
3. mendapatkan feedback yang jelas,
4. kembali belajar tanpa friction yang tidak perlu.

Visual yang menarik adalah pendukung pengalaman tersebut,
bukan tujuan utama.

---

## 20. Next Design Documents

Untuk homepage publik, keputusan yang sudah Locked ada di `PRD_Homepage_Redesign.md`.
Jika bertentangan dengan dokumen ini, PRD yang dipakai untuk homepage.

Dokumen ini menjadi dasar untuk:

- `FE-DESIGN-SYSTEM.md`
- `FE-FLOW.md`
- `FE-TASKS.md`

`FE-DESIGN-SYSTEM.md` menerjemahkan konsep di atas menjadi aturan visual
konkret.

`FE-FLOW.md` mendefinisikan perilaku dan alur user.

`FE-TASKS.md` mengatur prioritas implementasi berdasarkan deadline.

`FE-SOP-Anti-Slop.md` menjadi quality gate agar implementasi tidak
berubah menjadi output generik yang tidak sesuai konteks produk.
