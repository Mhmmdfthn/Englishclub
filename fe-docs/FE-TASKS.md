# English Club Frontend Tasks

> Implementation plan for the English Club frontend redesign.
>
> Status: Draft
> Scope: Frontend implementation
> Priority: Deadline-oriented
>
> This document is the execution checklist for the current frontend redesign.
> It follows:
> - FE-REDESIGN.md
> - FE-DESIGN-SYSTEM.md
> - FE-FLOW.md
> - FE-SOP-Anti-Slop.md
> - PRD_Homepage_Redesign.md (untuk homepage publik)

---

# 1. Objective

Menyelesaikan redesign frontend utama tanpa merusak
functionalitas existing.

Target utama untuk initial delivery:

> Login → Dashboard → Attendance

Frontend harus terlihat lebih modern, konsisten, responsive,
dan memiliki identitas English Club.

---

# 2. Current Project Context

Existing functionality harus dipertahankan.

Verified in the current repository:

- authentication route dan flow member sudah tersedia
- login sudah functional
- sign up sudah functional
- member dashboard sudah tersedia
- dashboard saat ini menampilkan profil dan kelompok
- frontend menggunakan Vue 3 + Vite + vue-router
- existing Word Hunt, leaderboard, program, dan admin flow harus tetap hidup
- landing/homepage ikut didesain ulang (lihat `PRD_Homepage_Redesign.md` dan bagian 13A), tetapi route dan fungsinya tetap harus hidup

Attendance belum tersedia sebagai API method di `frontend/src/api.js`
dan belum terlihat sebagai route backend pada current branch yang diverifikasi.
Karena itu:

> Attendance adalah integration target yang menunggu backend contract,
> bukan endpoint yang boleh ditebak oleh frontend.

Karena project sudah berjalan:

> Redesign, don't rewrite.

Detail existing implementation wajib diverifikasi dari branch/code
terbaru sebelum mengubahnya.

---

# 3. Priority System

## P0 — Critical

Harus selesai sebelum demo utama.

## P1 — Important

Dikerjakan setelah P0 stabil.

## P2 — Optional

Dikerjakan hanya jika P0 dan P1 sudah aman.

---

# 4. P0.1 Inspect Existing Frontend

### Objective

Memahami frontend sebelum melakukan perubahan.

### Tasks

- [ ] Pull latest branch
- [ ] Jalankan project secara lokal
- [ ] Pastikan project dapat berjalan
- [ ] Identifikasi entry point
- [ ] Identifikasi router
- [ ] Identifikasi login page
- [ ] Identifikasi sign up page
- [ ] Identifikasi dashboard/member page
- [ ] Identifikasi attendance-related component
- [ ] Identifikasi existing reusable components
- [ ] Identifikasi global styling
- [ ] Identifikasi API wrapper / service
- [ ] Catat file yang akan disentuh

### Rule

Jangan mengubah code sebelum struktur existing dipahami.

### Done When

Developer dapat menjelaskan:

- halaman utama berada di mana
- route utama berada di mana
- authentication bekerja melalui file apa
- attendance terhubung melalui component/API apa

---

# 5. P0.2 Establish Base Design System

### Objective

Membuat foundation visual sebelum redesign halaman satu per satu.

### Tasks

- [ ] Tetapkan global background
- [ ] Tetapkan primary color
- [ ] Tetapkan accent color
- [ ] Tetapkan text hierarchy
- [ ] Tetapkan border color
- [ ] Tetapkan spacing baseline
- [ ] Tetapkan radius baseline
- [ ] Tetapkan shadow baseline
- [ ] Tetapkan button style
- [ ] Tetapkan input style

### Done When

Halaman baru tidak membutuhkan style random
untuk warna, spacing, atau button dasar.

---

# 6. P0.3 Shared Components

### Objective

Membangun ulang component dasar yang diperlukan
sebelum halaman utama.

### Priority Components

- [ ] Button
- [ ] Input
- [ ] Card
- [ ] Badge / Status
- [ ] Navigation
- [ ] Page container
- [ ] Loading state
- [ ] Empty state
- [ ] Error state

### Rule

Reuse existing component jika masih layak.

Jangan membuat duplicate component hanya karena
nama atau style component existing kurang sesuai.

### Done When

Dashboard dan halaman authentication dapat
menggunakan component yang konsisten.

---

# 7. P0.4 Redesign Login

### Objective

Memberikan first interaction yang lebih polished.

### Tasks

- [ ] Redesign layout
- [ ] Apply design system
- [ ] Preserve existing authentication logic
- [ ] Preserve validation
- [ ] Add loading state
- [ ] Add error state
- [ ] Add password visibility behavior jika existing/needed
- [ ] Integrate Eli
- [ ] Responsive mobile
- [ ] Responsive desktop

### Must Not

- [ ] Rewrite authentication logic
- [ ] Change API contract tanpa kebutuhan
- [ ] Add unnecessary animation
- [ ] Add fake account/demo data

### Done When

Login:

- terlihat sesuai design system
- tetap dapat login
- loading terlihat
- error terlihat
- mobile usable
- desktop usable

---

# 8. P0.5 Redesign Sign Up

### Objective

Memberikan visual yang konsisten dengan login.

### Tasks

- [ ] Redesign layout
- [ ] Apply shared components
- [ ] Preserve existing registration logic
- [ ] Preserve validation
- [ ] Add loading state
- [ ] Add error state
- [ ] Responsive mobile
- [ ] Responsive desktop

### Done When

Sign up memiliki visual language yang sama dengan login
dan existing functionality tetap berjalan.

---

# 9. P0.6 Build Member Dashboard

### Objective

Dashboard menjadi pusat aktivitas member.

### Required Sections

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

### Tasks

- [ ] Create dashboard layout
- [ ] Add greeting
- [ ] Add Eli
- [ ] Add attendance status
- [ ] Add attendance primary action
- [ ] Add today's activity area
- [ ] Add learning area
- [ ] Add secondary information only if data exists
- [ ] Responsive layout
- [ ] Empty states where necessary

### Rule

Dashboard bukan landing page.

Do not add:

- [ ] giant hero
- [ ] fake statistics
- [ ] unnecessary charts
- [ ] excessive decorative sections
- [ ] random feature cards

### Done When

Setelah login, member dapat langsung memahami:

- siapa mereka
- status attendance
- apa aktivitas terdekat
- apa yang bisa dilakukan berikutnya

---

# 10. P0.7 Attendance UI

### Objective

Membuat attendance menjadi primary user flow setelah backend attendance
memiliki contract yang siap dipakai frontend.

### States

Required:

- [ ] Not attended
- [ ] Processing
- [ ] Success
- [ ] Error
- [ ] Unavailable / closed

### Flow

```text
Dashboard
   ↓
Attendance
   ↓
Check In
   ↓
Processing
   ↓
Success / Error
```

### Tasks

- [ ] Confirm backend attendance contract
- [ ] Confirm request/response shape
- [ ] Build attendance component
- [ ] Add attendance API method only after contract is confirmed
- [ ] Disable duplicate submission
- [ ] Display current status
- [ ] Display timestamp when available
- [ ] Add success feedback
- [ ] Add retry behavior
- [ ] Add unavailable state
- [ ] Update UI after success

### Rule

User tidak perlu refresh manual
untuk mengetahui attendance berhasil.

Jangan membuat fake endpoint, fake response, atau local-only attendance
yang terlihat seperti functionality production.

### Done When

User dapat:

1. melihat status
2. check in
3. mendapatkan feedback
4. melihat status berubah

---

# 11. P0.8 Mobile Responsive Pass

### Objective

Memastikan core flow dapat digunakan dari mobile.

### Required Pages

- [ ] Login
- [ ] Sign Up
- [ ] Dashboard
- [ ] Attendance

### Check

- [ ] Navigation
- [ ] Button size
- [ ] Input usability
- [ ] Text readability
- [ ] Card overflow
- [ ] Mascot scale
- [ ] Horizontal scrolling
- [ ] Screen spacing

### Done When

Tidak ada:

- clipped content
- overflowing card
- unreadable text
- inaccessible primary action
- broken layout

---

# 12. P0.9 Core Flow Test

Test end-to-end:

```text
Open app
  ↓
Login
  ↓
Dashboard
  ↓
Attendance
  ↓
Check In
  ↓
Success
  ↓
Updated status
```

### Test Cases

- [ ] Valid login
- [ ] Invalid login
- [ ] Valid signup
- [ ] Invalid signup
- [ ] Attendance success
- [ ] Attendance error
- [ ] Attendance unavailable
- [ ] Refresh after login
- [ ] Logout
- [ ] Mobile flow

### Done When

Core flow dapat berjalan tanpa blocker.

---

# 13. P0.10 Visual QA

Bandingkan implementation
dengan:

- FE-REDESIGN.md
- FE-DESIGN-SYSTEM.md
- FE-FLOW.md
- FE-SOP-Anti-Slop.md

Tambahan:

- pastikan existing Word Hunt tetap berjalan
- pastikan public landing tidak rusak
- pastikan login/sign up/dashboard existing tetap dapat dicapai

Check:

- [ ] visual hierarchy
- [ ] spacing
- [ ] typography
- [ ] color
- [ ] button
- [ ] card
- [ ] navigation
- [ ] mascot
- [ ] responsive
- [ ] states

---

# 13A. Homepage Track (per PRD + FE-INSPIRATION-HOMEPAGE.md)

> Prioritas track ini terhadap P0 member flow belum diputuskan.
> PRD menyebut langkah berikutnya adalah visual mockup, lalu implementasi.
> Referensi visual: `FE-INSPIRATION-HOMEPAGE.md` (Playful Edu modern). PRD Locked tetap menang.

### Objective

Mendesain ulang homepage publik tanpa mengubah fungsi existing.

### Tasks

- [ ] Visual mockup homepage berdasarkan keputusan Locked di PRD
- [ ] Review komposisi dan hierarchy, revisi, lalu kunci layout
- [ ] Sticky Navbar (Home, What's Happening, About, Stories, Login; tanpa hamburger)
- [ ] Hero: Eli, `Learn. Connect. Grow.`, supporting copy, satu CTA, background sesuai PRD
- [ ] Action Dock (Home, Absen, Materi, Word Hunt) dengan horizontal drag/swipe
- [ ] What's Happening at English Club?: 6 item awal dari data program/proker existing, sisanya horizontal
- [ ] About dari konten `Siapa Kami` + visi/misi yang sudah ada
- [ ] Stories from English Club dari data stories existing
- [ ] Footer (branding, link sekunder, kontak/sosial yang sudah ada)
- [ ] Responsive: desktop, tablet, mobile
- [ ] Accessibility: focus state, keyboard pada area horizontal, contrast di atas background hero

### Must Not

- [ ] Menambah sidebar atau hamburger
- [ ] Menambah section learning/progress di homepage
- [ ] Mengarang data atau endpoint untuk `Absen` / `Materi`
- [ ] Menambah filter program hanya karena backend mendukung

### Done When

- Semua route dan fungsi existing (Word Hunt, program detail, login) tetap jalan
- Action Dock tidak terasa seperti navbar kedua
- Tidak bergantung pada fitur backend yang belum ada

---

# 14. P1 — Important

P1 hanya dikerjakan setelah P0 stabil.

---

# 15. P1.1 Learning / Materials

- [ ] Learning page
- [ ] Material list
- [ ] Material detail
- [ ] Empty state
- [ ] Loading state
- [ ] Error state
- [ ] Responsive

Do not invent lesson data.

---

# 16. P1.2 Schedule

- [ ] Schedule page
- [ ] Upcoming activities
- [ ] Date
- [ ] Time
- [ ] Event information
- [ ] Empty state
- [ ] Responsive

Avoid building a complex calendar
unless product requirements actually require it.

---

# 17. P1.3 Profile

- [ ] Profile page
- [ ] Account information
- [ ] Allowed settings
- [ ] Logout
- [ ] Responsive

Do not add account features
that backend does not support.

---

# 18. P1.4 Tom Integration

Tom is the secondary mascot.

Use primarily in:

- [ ] Game
- [ ] Challenge
- [ ] Leaderboard
- [ ] Achievement
- [ ] Special event

Tom is optional for the first critical demo.

---

# 19. P1.5 Secondary UI States

Add reusable:

- [ ] Empty state patterns
- [ ] Error state patterns
- [ ] Loading state patterns
- [ ] Success feedback
- [ ] Confirmation where necessary

---

# 20. P2 — Optional

Only start P2 when:

> P0 is stable  
> AND  
> P1 is sufficiently complete.

Possible tasks:

- [ ] Additional mascot poses
- [ ] Mascot animation
- [ ] Advanced leaderboard
- [ ] Gamification
- [ ] Achievement system
- [ ] Additional dashboard personalization
- [ ] Advanced transitions
- [ ] Dark mode

These tasks must not delay the core demo.

---

# 21. Two-Day Execution Plan

## Day 1 — Foundation + Core UI

### Phase A

- [ ] Pull latest code
- [ ] Run locally
- [ ] Inspect architecture
- [ ] Identify target files

### Phase B

- [ ] Establish design tokens
- [ ] Build/reuse shared components
- [ ] Redesign Login
- [ ] Redesign Sign Up

### Phase C

- [ ] Build Dashboard layout
- [ ] Add Eli
- [ ] Add Attendance section

### End of Day 1 Goal

```text
Login ✅
Sign Up ✅
Dashboard structure ✅
Attendance UI partially/fully ready
```

The application should already look substantially
different from the old frontend.

---

# 22. Day 2 — Functional Flow + QA

### Phase A

- [ ] Finish Attendance integration
- [ ] Finish success/error states
- [ ] Finish dashboard data integration

### Phase B

- [ ] Responsive mobile pass
- [ ] Responsive desktop pass
- [ ] Empty/loading/error states

### Phase C

- [ ] End-to-end test
- [ ] Visual QA
- [ ] Anti-Slop review
- [ ] Fix blockers
- [ ] Clean unused code
- [ ] Commit
- [ ] Push
- [ ] Verify deployment

### End of Day 2 Goal

```text
Login ✅
Sign Up ✅
Dashboard ✅
Attendance ✅
Responsive ✅
Core flow tested ✅
Deployment verified ✅
```

---

# 23. Git Workflow

Jangan bekerja langsung pada main
kecuali repository workflow memang mewajibkannya.

Preferred:

```text
main
  │
  └── feature/frontend-redesign
          │
          ├── commit 1
          ├── commit 2
          ├── commit 3
          └── final
```

---

# 24. Existing Architecture Boundary

Current frontend masih menggunakan pola screen orchestration
di `App.vue` yang melakukan sinkronisasi route → screen dan menampilkan
berbagai feature seperti landing, game, auth, dan member dashboard.

Karena itu:

- jangan memindahkan semua feature ke architecture baru hanya demi redesign
- jangan menghapus logic Word Hunt dari `App.vue`
- jangan mengganti routing architecture tanpa kebutuhan
- prefer targeted component/style changes

Jika architecture memang perlu diubah, lakukan sebagai task terpisah
dengan alasan yang dapat direview.

# 25. Suggested Commit Checkpoints

Commit setelah perubahan yang masuk akal.

Contoh:

```text
feat(fe): establish design system
feat(fe): redesign authentication pages
feat(fe): redesign member dashboard
feat(fe): implement attendance interface
fix(fe): handle attendance error state
fix(fe): responsive mobile layout
```

Jangan membuat satu commit raksasa
yang mengandung seluruh redesign.

---

# 25. Before Pull / Merge

Sebelum merge:

- [ ] Local app runs
- [ ] Core flow works
- [ ] No console errors yang tidak diketahui
- [ ] No broken route
- [ ] No broken API call yang previously worked
- [ ] No accidental file changes
- [ ] Diff reviewed

---

# 26. AI Task Protocol

Setiap task yang diberikan kepada AI
harus memiliki scope.

### Good

```text
Redesign DashboardView.vue according to:

- FE-REDESIGN.md
- FE-DESIGN-SYSTEM.md
- FE-FLOW.md
- FE-SOP-Anti-Slop.md

Requirements:
- preserve current API logic
- reuse existing components
- do not add dependencies
- do not invent data
- only modify files necessary for dashboard
```

### Bad

```text
Make the whole website modern and beautiful.
```

AI harus mengerjakan task kecil
yang dapat diverifikasi.

---

# 27. AI Review Before Accepting Changes

Sebelum menerima hasil AI:

- [ ] What files changed?
- [ ] Why did they change?
- [ ] Is the change necessary?
- [ ] Did AI invent functionality?
- [ ] Did AI change API logic?
- [ ] Did AI add dependency?
- [ ] Did AI duplicate components?
- [ ] Does UI follow design system?
- [ ] Does flow remain correct?

Jika tidak dapat menjelaskan diff:

> Do not merge yet.

---

# 28. Scope Control

Selama deadline:

## Allowed

- visual redesign
- shared component improvement
- responsive fixes
- state handling
- mascot integration
- existing API integration
- UX improvements

## Require Explicit Reason

- new dependency
- router changes
- authentication changes
- backend changes
- architecture changes
- database changes

## Not Allowed Without New Requirement

- framework migration
- backend rewrite
- database rewrite
- unrelated feature development
- large-scale refactor
- experimental architecture

---

# 29. Anti-Slop Gate

Sebelum final commit, jalankan:

`FE-SOP-Anti-Slop.md`

Minimum:

- [ ] No unnecessary decoration
- [ ] No fake data
- [ ] No generic filler copy
- [ ] No card spam
- [ ] No unnecessary animation
- [ ] No unnecessary dependency
- [ ] No unnecessary rewrite
- [ ] Product-specific decisions remain visible
- [ ] Eli/Tom used intentionally

---

# 30. Definition of Ready

Task dianggap READY apabila:

- target page/component jelas
- purpose jelas
- source files diketahui
- relevant design rules diketahui
- relevant flow diketahui
- API dependency diketahui jika ada

Jika requirement belum jelas:

> Clarify before implementation.

---

# 31. Definition of Done

Task dianggap DONE apabila:

### Function

- [ ] functionality works
- [ ] existing behavior preserved

### UX

- [ ] user flow works
- [ ] feedback works
- [ ] no unnecessary step

### Visual

- [ ] follows design system
- [ ] responsive
- [ ] mascot usage consistent
- [ ] no obvious visual slop

### Quality

- [ ] loading/empty/error considered
- [ ] no fake production data
- [ ] no unnecessary dependency
- [ ] code diff reviewed
- [ ] no known blocker

---

# 32. Final Delivery Checklist

## Core

- [ ] Login
- [ ] Sign Up
- [ ] Dashboard
- [ ] Attendance

## UX

- [ ] Primary actions obvious
- [ ] Navigation works
- [ ] Feedback works
- [ ] No unnecessary step

## Responsive

- [ ] Mobile
- [ ] Tablet
- [ ] Desktop

## Visual

- [ ] Design system applied
- [ ] Eli integrated
- [ ] Tom integrated only where needed
- [ ] No AI slop patterns

## Technical

- [ ] No broken API
- [ ] No console blocker
- [ ] No accidental changes
- [ ] Deployment verified

---

# 33. Priority Rule

When time becomes limited:

```text
P0 > P1 > P2
```

And within P0:

```text
Functionality
    ↓
User flow
    ↓
Responsive
    ↓
Visual polish
    ↓
Decoration
```

Never sacrifice a functioning attendance flow
for a decorative animation.

---

# 34. Final Principle

> Ship the smallest complete experience,
> not the largest unfinished one.

The first successful version should make this journey feel simple:

```text
Login
  ↓
Dashboard
  ↓
See attendance
  ↓
Check in
  ↓
Get confirmation
```

Everything else is secondary until this flow is reliable.
