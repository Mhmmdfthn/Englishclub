# English Club Frontend Flow

> User-flow and interaction blueprint for the English Club frontend redesign.
>
> Status: Draft
> Scope: Navigation, user journeys, page behavior, and UI states

---

# 1. Purpose

Dokumen ini mendefinisikan bagaimana pengguna bergerak di dalam
frontend English Club.

Fokus utama:

- user journey
- navigation
- page transitions
- primary actions
- interaction states
- success / error / empty / loading state
- mobile behavior

Dokumen ini tidak mendefinisikan:

- API endpoint
- database structure
- backend logic
- visual tokens
- implementation detail Vue

Visual mengikuti `FE-DESIGN-SYSTEM.md`.

Homepage publik mengikuti `PRD_Homepage_Redesign.md`.

Product direction mengikuti `FE-REDESIGN.md`.

Quality control mengikuti `FE-SOP-Anti-Slop.md`.

---

# 2. Core Flow Principle

## One Clear Next Step

Pada setiap halaman, user harus dapat mengetahui:

> "Apa yang seharusnya saya lakukan sekarang?"

Jangan memberikan terlalu banyak primary action
dalam satu layar.

---

# 3. Application Areas

Frontend dibagi menjadi:

```text
PUBLIC
│
├── Landing
├── Login
└── Sign Up
│
MEMBER
│
├── Dashboard
├── Attendance
├── Learning / Materials
├── Schedule
└── Profile
│
ADMIN
│
├── Admin Dashboard
├── Attendance Management
├── Members
├── Materials
└── Events / Schedule
```

Member dan admin memiliki tujuan yang berbeda.

Member:

> Action-oriented

Admin:

> Management-oriented

---

# 3A. Current Route Reality

Route yang saat ini tersedia di frontend antara lain:

```text
/
 /main
 /board
 /buat-akun
 /masuk
 /dashboard
 /program/:id
 /ec-admin-2026
```

Member authentication dan dashboard sudah terhubung ke route tersebut.

Attendance belum boleh diasumsikan memiliki route/API existing hanya
karena flow-nya sudah direncanakan di dokumen ini.

Flow attendance dalam dokumen ini adalah:

> target product flow untuk implementasi setelah backend contract siap.

# 4. Authentication Flow

## 4.1 First Visit

```text
Visitor
   ↓
Landing
   │
   ├── Login
   │
   └── Sign Up
```

Landing hanya menjadi entry point.

Jika aplikasi memprioritaskan authenticated experience,
user tidak perlu melewati landing setiap kali membuka aplikasi.

---

# 4A. Homepage Flow (Public)

Mengikuti `PRD_Homepage_Redesign.md`.

## Guest

```text
Open homepage
    ↓
Hero (pahami English Club)
    ↓
Pilih:
  Explore English Club
  Login
  Jelajahi What's Happening
    ↓
About / Stories
```

## Member

```text
Open homepage
    ↓
Hero
    ↓
Action Dock
  ├── Absen
  ├── Materi
  └── Word Hunt
```

## Navbar vs Action Dock

- Navbar = menjelajah website. Sticky, ada Login, tanpa hamburger.
- Action Dock = aksi penting. Bukan navbar kedua.

Keduanya tidak boleh digabung atau saling menduplikasi.

## Catatan Penting

- `Word Hunt` sudah ada. Dock cukup menautkan ke route/flow existing.
- `Absen` dan `Materi` belum punya backend contract (lihat 3A dan `FE-TASKS.md`).
  Perilaku item dock ini sebelum backend siap (disembunyikan, disabled, atau
  diarahkan ke Login/Dashboard) belum diputuskan. Jangan mengarang endpoint
  atau data. Putuskan bersama backend developer.
- Homepage tidak memakai sidebar. Navigasi sekunder dipegang footer.
- Setelah login, entry point akun mengikuti flow existing; jangan hard-code
  behavior session baru di homepage.

---

# 5. Login Flow

## Standard Flow

```text
Login
  ↓
Enter credentials
  ↓
Submit
  ↓
Authentication
  │
  ├── Success → Dashboard
  │
  └── Failed → Error state
```

### Success

User langsung diarahkan ke:

> Member Dashboard

Jangan mengarahkan user ke halaman perantara
tanpa alasan.

### Failed

Tetap berada pada halaman login.

Berikan:

- error message
- field guidance jika relevan
- kesempatan retry

Password tidak boleh dihapus tanpa alasan.

---

# 6. Sign Up Flow

```text
Sign Up
   ↓
Fill required fields
   ↓
Submit
   │
   ├── Success
   │      ↓
   │    Account created
   │      ↓
   │    Login / authenticated flow
   │
   └── Failed
          ↓
       Error state
```

Form harus meminimalkan field yang tidak diperlukan.

Jangan meminta informasi tambahan
hanya karena informasi tersebut tersedia.

---

# 7. Authentication Guard

Halaman member membutuhkan authentication.

```text
Unauthenticated
      ↓
Protected page
      ↓
Redirect → Login
```

Jika user sudah authenticated:

```text
Login page
      ↓
Already authenticated
      ↓
Dashboard
```

User tidak seharusnya masuk ke halaman login
padahal session yang valid masih tersedia,
kecuali memang diperlukan oleh aplikasi.

---

# 8. Member Navigation

### Initial / Current

Prioritaskan navigation yang benar-benar tersedia:

```text
Dashboard
Logout / Account
```

### Target

Setelah fitur tersedia:

```text
Dashboard
Attendance
Learning
Schedule
Profile
```

Jangan membuat navigation item untuk fitur yang belum memiliki
halaman atau backend support.

---

# 9. Member Dashboard Flow

Dashboard adalah titik pusat pengalaman member.

```text
Login
  ↓
Dashboard
```

Dashboard harus menjawab:

> What should I know or do right now?

---

## 9.1 Dashboard Priority

Urutan informasi:

```text
Greeting
   ↓
Attendance
   ↓
Today's Activity
   ↓
Learning
   ↓
Secondary Information
```

Jangan membuat semua section memiliki priority yang sama.

---

# 10. Dashboard Greeting

Greeting memberikan konteks personal.

Contoh:

```text
Good morning, Fajri!
Ready for today's English session?
```

Eli dapat muncul sebagai supporting character.

Greeting tidak perlu menjadi hero besar.

---

# 11. Attendance Flow

Attendance merupakan primary member action.

## Standard Flow

```text
Dashboard
   ↓
Attendance Card
   ↓
Check Attendance
   ↓
Attendance Processing
   │
   ├── Success
   │
   └── Error
```

Tujuan utama:

> User dapat melakukan attendance
> tanpa berpindah terlalu banyak halaman.

---

# 12. Attendance: Not Yet Attended

Jika sesi attendance aktif dan user belum absen:

```text
Attendance Card

Status:
Not yet attended

Primary Action:
Check In
```

Primary action harus terlihat jelas.

Jangan menyembunyikan action utama
di dalam secondary menu.

---

# 13. Attendance: Processing

Saat user melakukan check-in:

```text
Check In
   ↓
Processing
```

UI harus memberi feedback bahwa request sedang berjalan.

Contoh:

```text
Checking attendance...
```

Button tidak boleh memungkinkan
duplicate submission tanpa alasan.

---

# 14. Attendance: Success

Jika berhasil:

```text
Processing
   ↓
Success
```

Tampilkan:

- success status
- waktu jika tersedia
- confirmation

Contoh:

```text
Attendance recorded!

Nice, you're in.
```

Eli dapat digunakan di state ini.

Setelah success:

```text
Attendance
   ↓
Updated status
```

User tidak perlu melakukan action tambahan
hanya untuk melihat bahwa status telah berubah.

---

# 15. Attendance: Error

Jika request gagal:

```text
Processing
   ↓
Error
```

Tampilkan:

- what happened
- retry action

Contoh:

```text
Something went wrong.

Please try again.
```

Jangan membuat user kembali ke awal
hanya karena satu request gagal.

---

# 16. Attendance: Closed / Unavailable

Jika attendance belum dibuka atau sudah ditutup:

```text
Attendance Card
      ↓
Unavailable
```

UI harus menjelaskan kondisi.

Contoh:

```text
Attendance is not available right now.
```

Tidak perlu menampilkan primary check-in action
jika action memang tidak dapat dilakukan.

---

# 17. Attendance History

History merupakan secondary information.

Prioritas:

```text
Current attendance
      ↓
History
```

Jangan membuat history mengambil perhatian lebih besar
daripada attendance saat ini.

History dapat menggunakan:

- list
- compact table
- timeline

sesuai kebutuhan data.

---

# 18. Learning Flow

Learning menjadi secondary primary experience
setelah attendance.

```text
Dashboard
   ↓
Learning
   ↓
Available materials / activities
   ↓
Selected material
   ↓
Learning content
```

Jika terdapat progress:

```text
Learning
   ↓
Material
   ↓
Progress
```

Progress harus menggunakan data nyata.

---

# 19. Learning: Empty State

Jika belum tersedia materi:

```text
Learning
   ↓
Empty state
```

Contoh:

```text
Nothing here yet.

Learning materials will appear here
when they are available.
```

Eli dapat digunakan sebagai supporting visual.

Jangan membuat fake lessons
untuk membuat halaman terlihat penuh.

---

# 20. Schedule Flow

```text
Dashboard
   ↓
Schedule
   ↓
Upcoming activities
```

User terutama membutuhkan:

- activity
- date
- time
- relevant location / information
- status

Jangan membuat calendar system kompleks
jika kebutuhan sebenarnya hanya daftar kegiatan.

---

# 21. Schedule: Upcoming Activity

Upcoming activity harus mudah dipindai.

Contoh:

```text
Friday
19:00

English Club Session
Speaking Practice
```

Jika user memiliki action yang relevan,
action tersebut harus berada dekat dengan activity.

---

# 22. Profile Flow

```text
Dashboard
   ↓
Profile
```

Profile digunakan untuk:

- melihat account information
- edit allowed information
- account settings
- logout

Profile bukan tempat untuk menaruh semua feature
yang tidak memiliki tempat.

---

# 23. Logout Flow

```text
Profile
   ↓
Logout
   ↓
Session ended
   ↓
Login / Landing
```

Jika logout membutuhkan confirmation,
confirmation harus jelas dan singkat.

Jangan menggunakan confirmation modal
untuk action yang tidak berisiko jika tidak diperlukan.

---

# 24. Mobile Navigation Flow

Pada mobile, navigation harus memprioritaskan
frequent actions.

Recommended:

```text
Dashboard
Attendance
Learning
Profile
```

Schedule dapat:

- masuk sebagai primary navigation,
- atau ditempatkan pada secondary navigation,

tergantung data penggunaan aktual.

Jangan membuat mobile navigation terlalu padat.

---

# 25. Navigation Rule

Ketika user berpindah halaman:

> Preserve context whenever possible.

Contoh:

```text
Learning
   ↓
Material A
```

Setelah selesai atau kembali:

```text
← Back to Learning
```

User tidak seharusnya kehilangan konteks
tanpa alasan.

---

# 26. Back Navigation

Back behavior harus predictable.

Prioritas:

1. browser history
2. application-level back
3. contextual back

Jangan membuat tombol back
melakukan sesuatu yang berbeda
dari ekspektasi user.

---

# 27. Deep Link Behavior

User dapat membuka halaman tertentu secara langsung.

Contoh:

```text
/attendance
/materials
/profile
```

Jika halaman protected:

```text
Unauthenticated
      ↓
Login
      ↓
Return to intended page
```

Jika memungkinkan, setelah login
user kembali ke tujuan awal.

---

# 28. Loading Flow

Setiap asynchronous page harus mempertimbangkan:

```text
Page open
   ↓
Loading
   ↓
Data loaded
   ↓
Content
```

Jika gagal:

```text
Loading
   ↓
Error
```

Jika tidak ada data:

```text
Loading
   ↓
Empty
```

Loading state tidak boleh terlihat
seperti broken UI.

---

# 29. Empty Flow

General:

```text
No data
  ↓
Empty state
  ↓
Explanation
  ↓
Optional next action
```

Tidak semua empty state membutuhkan CTA.

CTA hanya diberikan jika terdapat action
yang benar-benar dapat dilakukan user.

---

# 30. Error Flow

General:

```text
Action
  ↓
Error
  ↓
Explanation
  ↓
Retry / alternative action
```

Jangan membuat error hanya berupa:

```text
Error 500
```

Bila informasi teknis diperlukan,
informasi teknis dapat disimpan untuk developer/logging,
sementara user mendapat message yang dapat dipahami.

---

# 31. Success Flow

General:

```text
Action
  ↓
Processing
  ↓
Success
  ↓
Updated UI
```

Success tidak boleh menjadi dead end.

Setelah action selesai,
UI harus berada pada state terbaru.

Contoh attendance:

```text
Check In
   ↓
Success
   ↓
Attendance status:
Present
```

Bukan:

```text
Success popup
   ↓
User harus refresh manual
```

---

# 32. Unsaved Changes

Jika user sedang mengubah data
dan meninggalkan halaman:

```text
Unsaved changes
      ↓
Warn user
```

Gunakan hanya jika kehilangan data
benar-benar mungkin dan relevan.

Jangan membuat confirmation
untuk setiap navigation.

---

# 33. Mascot Flow

Mascot digunakan berdasarkan context.

## Eli

```text
Dashboard
   ↓
Greeting

Attendance
   ↓
Success / Empty

Login
   ↓
Supporting illustration
```

## Tom

```text
Game
   ↓
Challenge

Leaderboard
   ↓
Achievement

Special Event
   ↓
Supporting illustration
```

Mascot tidak mengubah navigation.

Mascot merupakan supporting element,
bukan interactive control kecuali ada
use case khusus yang ditentukan kemudian.

---

# 34. Admin Flow

Admin memiliki flow yang berbeda dengan member.

Current conceptual structure:

```text
Admin Login
    ↓
Admin Area
    │
    ├── Whitelist / Member Validation
    ├── Member Accounts
    ├── Password Reset
    ├── Program Kerja / Gallery
    └── Spinner / Prize Management
```

Admin dashboard harus berorientasi pada:

- management
- information density
- monitoring
- operational action

Attendance management, materials management, dan event management
hanya ditambahkan setelah backend dan business rules benar-benar tersedia.

Jangan membuat admin dashboard
memiliki flow yang sama persis dengan member.

---

# 35. Admin Attendance Flow

Konseptual:

```text
Admin Dashboard
    ↓
Attendance Management
    ↓
Select session / date
    ↓
View attendance
    ↓
Management action
```

Detail action mengikuti backend/business rule
yang tersedia.

Frontend tidak boleh mengarang business rule.

---

# 36. Admin Member Flow

Konseptual:

```text
Admin Dashboard
    ↓
Members
    ↓
Member list
    ↓
Member detail
    ↓
Allowed management action
```

Search/filter hanya ditambahkan
jika data dan kebutuhan memang mendukungnya.

---

# 37. Admin Materials Flow

Konseptual:

```text
Admin Dashboard
    ↓
Materials
    ↓
Material list
    ├── Create
    ├── Edit
    └── Remove
```

Exact permission mengikuti business logic existing.

---

# 38. Admin Schedule / Event Flow

Konseptual:

```text
Admin Dashboard
    ↓
Events / Schedule
    ↓
Event list
    ↓
Create / Edit / Manage
```

Jangan menentukan field atau workflow
yang belum disepakati backend/product.

---

# 39. Role Separation

User role menentukan entry point.

```text
Authenticated User
       │
       ├── Member → Member Dashboard
       │
       └── Admin  → Admin Dashboard
```

Member tidak boleh diarahkan ke admin interface
hanya karena route dapat dibuka.

Role handling mengikuti existing authentication
dan backend authorization.

---

# 40. Priority for Initial Redesign

Karena redesign memiliki deadline pendek,
prioritas flow adalah:

## P0 — Critical

```text
Login
  ↓
Dashboard
  ↓
Attendance
  ↓
Success / Error
```

## P1 — Important

```text
Sign Up
Learning / Materials
Schedule
Profile
```

Catatan: item P1 di atas adalah target pengembangan, bukan jaminan
bahwa endpoint/backend-nya sudah tersedia di current branch.

## P2 — Later

```text
Advanced game flow
Advanced leaderboard
Additional gamification
Additional mascot interaction
```

Admin flow didokumentasikan sebagai target sistem,
tetapi tidak boleh menggeser P0 member flow
tanpa kebutuhan project.

---

# 41. Interaction Principle

Untuk action utama:

```text
Intent
  ↓
Action
  ↓
Feedback
  ↓
Updated State
```

Contoh:

```text
Want to attend
  ↓
Check In
  ↓
Processing
  ↓
Success
  ↓
Present
```

User harus dapat melihat hubungan
antara action yang dilakukan dan hasilnya.

---

# 42. Avoid Dead Ends

Setiap halaman penting harus memiliki
jalur keluar yang jelas.

Contoh:

```text
Learning
   ↓
Material
   ↓
← Back to Learning
```

Jangan membuat user hanya mengandalkan browser back
jika contextual navigation memang diperlukan.

---

# 43. Flow Consistency

Action dengan behavior yang sama
harus mengikuti pattern yang sama.

Contoh:

```text
Submit form
→ Processing
→ Success / Error
```

Jangan membuat:

```text
Login
→ spinner

Attendance
→ modal

Profile
→ page redirect

Material
→ toast
```

tanpa alasan.

Consistency mengurangi cognitive load.

---

# 44. No Unnecessary Confirmation

Confirmation hanya digunakan
ketika action memiliki konsekuensi
yang penting atau sulit dibatalkan.

Contoh yang mungkin membutuhkan confirmation:

- destructive action
- logout dari situasi tertentu
- delete data

Contoh yang tidak perlu:

- membuka halaman
- menyimpan preference sederhana
- successful attendance

---

# 45. Flow Review Checklist

## Navigation

- [ ] User tahu halaman saat ini
- [ ] Primary navigation jelas
- [ ] Mobile navigation tidak terlalu padat
- [ ] Back behavior predictable

## Actions

- [ ] Primary action jelas
- [ ] Tidak ada langkah yang tidak diperlukan
- [ ] Action memiliki feedback
- [ ] Success memperbarui state

## States

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Success
- [ ] Disabled / unavailable jika diperlukan

## Data

- [ ] Tidak ada data palsu
- [ ] Tidak ada business rule yang diarang
- [ ] Existing behavior dipertahankan

## Mascot

- [ ] Eli/Tom digunakan sesuai konteks
- [ ] Mascot tidak mengganggu task utama

---

# 46. Core Flow Rule

> The interface should guide the user,
> not make the user figure out the interface.

Untuk aktivitas utama:

> Fewer steps, clearer feedback, predictable navigation.
