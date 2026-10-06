# FE-SOP-Anti-Slop

> Standard Operating Procedure untuk mencegah frontend English Club
> menjadi generic, template-like, atau terasa seperti hasil AI yang
> tidak memiliki keputusan desain yang disengaja.
>
> Catatan: dokumen ini disusun dengan merangkum pola dan prinsip dari
> beberapa repository GitHub yang memang membahas anti-AI-slop / unslop
> frontend. Repo tersebut digunakan sebagai referensi praktik komunitas,
> bukan sebagai standar akademik atau AI detector.

---

# 1. Purpose

Dokumen ini digunakan ketika:

- membuat halaman baru
- redesign halaman existing
- membuat component
- memperbaiki visual UI
- menggunakan AI coding agent
- melakukan visual review

Tujuannya bukan untuk membuat frontend "anti-AI".

Tujuannya adalah:

> Membuat frontend yang terasa sengaja dirancang untuk English Club,
> bukan sekadar hasil rata-rata dari pattern yang sering muncul pada
> AI-generated frontend.

---

# 2. Relationship with Other FE Documents

Dokumen ini bukan design system.

Urutan sumber keputusan:

1. FE-REDESIGN.md
2. FE-DESIGN-SYSTEM.md
3. FE-FLOW.md
4. FE-SOP-Anti-Slop.md
5. Existing project constraints

Catatan: untuk homepage publik, keputusan Locked di
`PRD_Homepage_Redesign.md` didahulukan.

### FE-REDESIGN.md

Menentukan:

- tujuan
- audience
- product direction
- visual personality
- UX principles

### FE-DESIGN-SYSTEM.md

Menentukan:

- color
- typography
- spacing
- components
- radius
- shadow
- mascot usage

### FE-FLOW.md

Menentukan:

- user journey
- interaction
- navigation
- state

### FE-SOP-Anti-Slop.md

Menentukan:

> apa yang harus diperiksa agar implementasi tidak berubah
> menjadi generic AI output.

---

# 3. Core Principle

## Intentionality > Novelty

Anti-slop bukan berarti:

> "Buat desain seunik mungkin."

Anti-slop berarti:

> "Jangan menerima keputusan default tanpa alasan."

Desain yang familiar tidak otomatis buruk.

Desain yang unik juga tidak otomatis bagus.

Sebuah keputusan UI dapat digunakan apabila keputusan tersebut
mendukung:

- user
- product
- content
- brand
- usability
- accessibility
- existing architecture

---

# 4. Product Specificity

Setiap halaman harus terasa seperti bagian dari:

> English Club

bukan:

> generic education dashboard
> generic SaaS dashboard
> generic AI-generated landing page

Gunakan konteks nyata produk:

- English Club
- learning activities
- attendance
- schedules
- materials
- games
- members
- Eli
- Tom
- visual identity existing
- actual content

Jangan mengganti konteks tersebut dengan placeholder generik.

---

# 5. The Purpose Test

Sebelum menambahkan elemen UI, jawab:

### What?

Apa elemen tersebut?

### Why?

Mengapa elemen tersebut diperlukan?

### Who?

Siapa yang menggunakannya?

### What happens without it?

Apa yang terjadi jika elemen tersebut dihilangkan?

Jika jawaban utamanya:

- "biar lebih keren"
- "biar lebih modern"
- "biar kelihatan penuh"
- "AI biasanya membuat ini"
- "supaya tidak kosong"

maka elemen tersebut harus dipertanyakan kembali.

---

# 6. AI Slop Patterns

Pattern berikut bukan absolute ban.

Pattern ini adalah:

> DEFAULT YANG MEMERLUKAN ALASAN.

## 6.1 Generic Hero

Waspadai kombinasi:

- headline besar
- subtitle panjang
- dua CTA
- visual abstrak
- three feature cards

Pattern tersebut boleh digunakan jika sesuai dengan konteks.

Jangan membuatnya hanya karena merupakan pattern umum.

Contoh homepage English Club: hero dengan satu CTA, tanpa quote dan tanpa
teks pemasaran tambahan, sudah mengikuti PRD dan lolos Purpose Test.

---

## 6.2 Excessive Gradient

Hindari:

- purple → blue gradient
- blue → cyan gradient
- rainbow gradient
- gradient di setiap card
- gradient hanya untuk membuat UI terlihat premium

English Club memiliki identitas warna sendiri.

Gunakan palette produk terlebih dahulu.

Gradient hanya digunakan jika memiliki fungsi visual yang jelas.

---

## 6.3 Excessive Glassmorphism

Jangan membuat:

- navbar glass
- card glass
- modal glass
- sidebar glass
- background blur
- glowing border

semuanya sekaligus.

Jika glass digunakan, harus ada alasan hierarchy
atau depth yang jelas.

---

## 6.4 Rounded Everything

Jangan memberikan radius besar kepada:

- button
- input
- card
- modal
- badge
- image
- navbar
- setiap container

hanya agar semuanya terlihat "cute".

Radius harus menjadi bagian dari hierarchy.

---

## 6.5 Card Spam

Jangan membungkus setiap informasi dengan card.

Contoh buruk:

```text
Dashboard
 ├── Card
 ├── Card
 ├── Card
 ├── Card
 ├── Card
 └── Card
```

Gunakan:

- whitespace
- typography
- grouping
- divider
- hierarchy

sebelum membuat card baru.

---

## 6.6 Decorative Icons

Icon tidak boleh ditambahkan hanya untuk mengisi ruang.

Sebelum menggunakan icon:

> Does this icon communicate useful information?

Jika tidak:

> Remove it.

Gunakan satu icon library yang konsisten.

Jangan mencampur:

- Lucide
- Font Awesome
- Heroicons
- emoji
- random SVG

tanpa alasan.

---

## 6.7 Emoji as UI Decoration

Emoji bukan default untuk:

- feature icon
- card icon
- heading
- navigation
- status illustration

Gunakan proper UI icon atau asset produk.

Emoji boleh digunakan dalam konteks yang memang playful,
misalnya microcopy tertentu, tetapi bukan sebagai sistem visual utama.

---

## 6.8 Excessive Shadow

Jangan setiap element diberi shadow.

Jika semua element terlihat melayang:

> tidak ada hierarchy elevation.

Shadow harus menunjukkan depth yang memang dibutuhkan.

---

## 6.9 Excessive Glow

Glow adalah attention amplifier.

Jangan gunakan glow:

- pada semua button
- semua card
- semua icon
- semua border
- seluruh background

Gunakan hanya jika memang menjadi bagian dari visual direction
dan memiliki fungsi.

---

## 6.10 Decorative Blob / Aurora

Jangan menambahkan:

- blob
- aurora
- blur circle
- floating gradient
- abstract shape

hanya karena background terasa kosong.

Whitespace adalah bagian dari desain.

---

# 7. Dashboard-Specific Rules

Dashboard English Club adalah task surface.

Prioritas:

1. information
2. action
3. navigation
4. feedback
5. decoration

Jangan memaksa dashboard menjadi landing page.

Hindari:

- hero raksasa
- slogan panjang
- decorative section hanya untuk filler
- statistik palsu
- 10+ widgets
- unnecessary charts

Dashboard harus membantu user memahami:

> "Apa yang perlu saya lakukan sekarang?"

---

# 8. Mascot Rules

Mascot English Club terdiri dari:

## Eli

Primary mascot.

Crocodile hoodie robot.

## Tom

Secondary mascot.

Shark hoodie robot.

Mascot memiliki fungsi sebagai supporting character.

Gunakan mascot untuk:

- homepage hero (Eli)
- greeting
- onboarding
- empty state
- success state
- learning context
- game/challenge context

Jangan gunakan mascot:

- di setiap card
- sebagai dekorasi filler
- dengan style berbeda
- dengan proporsi berbeda
- dengan visual rendering yang berbeda

Eli dan Tom harus terasa berasal dari character universe yang sama.

---

# 9. No Invented Product Data

AI tidak boleh mengarang data hanya agar UI terlihat penuh.

Jangan membuat data palsu seperti:

- jumlah member
- attendance rate
- ranking
- score
- progress
- event
- lesson
- achievement
- statistic

Jika data belum tersedia:

gunakan:

- loading state
- empty state
- unavailable state
- real placeholder yang jelas

Jangan membuat data palsu terlihat seperti data produksi.

---

# 10. No Fake Product Copy

Hindari copy generik seperti:

- "Empower your learning journey"
- "Unlock your potential"
- "Take your English to the next level"
- "Revolutionize your learning"
- "Supercharge your productivity"

Gunakan bahasa yang sesuai dengan aktivitas nyata.

Contoh:

> "You haven't checked in yet."

lebih baik daripada:

> "Unlock your attendance potential."

---

# 10A. Existing Product Surfaces Matter

Anti-slop review harus memperhatikan bahwa repo English Club bukan
hanya dashboard.

Current product surface meliputi:

- public/community landing
- Word Hunt
- leaderboard
- program kerja
- member authentication
- member dashboard
- hidden admin operations

Jangan mengubah seluruh produk menjadi "generic e-learning dashboard"
jika fitur public/game/community tetap merupakan bagian dari produk.

Untuk initial redesign, bedakan:

> redesign focus = member experience

dengan:

> existing product = seluruh application surface.

# 11. Existing Project First

Redesign harus menghormati project existing.

Sebelum membuat sesuatu:

1. periksa existing component
2. periksa existing style
3. periksa existing route
4. periksa existing API usage
5. periksa existing dependency

Reuse existing architecture apabila masih sesuai.

Jangan menambah framework/library baru hanya karena AI
lebih nyaman menggunakannya.

---

# 12. No Unnecessary Rewrite

Redesign frontend tidak berarti:

> rewrite everything.

Jika satu halaman membutuhkan perubahan:

ubah bagian yang dibutuhkan.

Jangan mengubah:

- backend
- database
- router
- unrelated component
- API contract
- global architecture

tanpa kebutuhan yang jelas.

---

# 13. Minimal Change Principle

> Make the smallest change that correctly solves the problem.

Prefer:

```text
Existing Component
        ↓
Small targeted change
```

over:

```text
Existing Component
        ↓
Delete
        ↓
AI generates replacement
        ↓
Unknown side effects
```

---

# 14. AI Coding Protocol

AI tidak langsung diberi perintah:

> "Make this look modern."

Gunakan urutan:

## Step 1 — Context

Berikan:

- FE-REDESIGN.md
- FE-DESIGN-SYSTEM.md
- FE-FLOW.md
- target component

## Step 2 — Constraints

Berikan batasan:

- do not change backend
- do not change API
- reuse existing components
- do not install dependency
- do not invent data

## Step 3 — Plan

AI harus menjelaskan:

- file yang akan diubah
- alasan perubahan
- component yang akan digunakan kembali
- behavior yang dipertahankan

## Step 4 — Implementation

Baru implementasikan.

## Step 5 — Review

Periksa diff dan hasil visual.

---

# 14A. Architecture Must Be Evidence-Based

AI tidak boleh berasumsi bahwa architecture frontend mengikuti
framework convention yang berbeda dari repo.

Current frontend menggunakan `App.vue` sebagai orchestration layer
untuk route-to-screen state dan berbagai feature yang existing.

Karena itu AI harus:

- membaca `App.vue`
- membaca `router.js`
- membaca target component
- memahami existing state flow
- memahami API wrapper

sebelum melakukan refactor.

Jangan mengganti architecture hanya karena architecture baru terlihat
lebih "clean".

# 15. AI Must Not Invent

AI tidak boleh mengarang tanpa instruction:

- feature
- route
- API endpoint
- database field
- user role
- business rule
- statistic
- content
- brand asset

Jika informasi tidak tersedia:

> Ask / state assumption / preserve existing behavior.

Jangan diam-diam mengarang.

---

# 16. Accessibility Baseline

Setiap UI harus mempertahankan minimal:

- readable contrast
- semantic HTML
- clear labels
- accessible form fields
- meaningful alt text
- keyboard-friendly interactions
- status tidak hanya bergantung pada warna

Anti-slop tidak boleh menghasilkan UI yang cantik tetapi sulit digunakan.

---

# 17. Responsive Baseline

Setiap perubahan visual harus dipikirkan untuk:

- mobile
- tablet
- desktop

Jangan hanya membuat desktop kemudian memperkecil semuanya.

Pertahankan:

- readable text
- usable touch target
- clear hierarchy
- accessible navigation
- proper content priority

---

# 18. States

Fitur yang mengambil data harus memiliki state yang sesuai.

Minimal pertimbangkan:

### Loading

User mengetahui data sedang diproses.

### Empty

User mengetahui tidak ada data.

### Error

User mengetahui terjadi masalah.

### Success

User mengetahui action berhasil.

Jangan membiarkan state penting terlihat seperti UI rusak.

---

# 19. Design Exceptions

Pattern yang masuk daftar "anti-slop" boleh digunakan.

Tidak ada larangan absolut jika:

1. sesuai dengan design system,
2. memiliki fungsi,
3. mendukung hierarchy,
4. relevan dengan product,
5. digunakan secara terkendali.

Contoh:

### Gradient

Boleh jika:

- bagian dari brand
- mempunyai fungsi visual
- tidak digunakan di setiap section

### Card

Boleh jika:

- informasi memang perlu dikelompokkan.

### Shadow

Boleh jika:

- menunjukkan elevation.

### Animation

Boleh jika:

- memberikan feedback
- menunjukkan state
- membantu navigation
- meningkatkan usability

---

# 20. Pre-Commit Anti-Slop Audit

Sebelum commit, lakukan pemeriksaan berikut.

## Product Fit

- [ ] Apakah halaman jelas untuk English Club?
- [ ] Apakah menggunakan content/context nyata?
- [ ] Apakah primary action jelas?

## Visual

- [ ] Apakah ada dekorasi tanpa fungsi?
- [ ] Apakah terlalu banyak card?
- [ ] Apakah terlalu banyak shadow?
- [ ] Apakah terlalu banyak gradient?
- [ ] Apakah semua elemen memiliki radius yang sama?
- [ ] Apakah icon digunakan secara berlebihan?
- [ ] Apakah mascot dipakai dengan alasan?

## UX

- [ ] Apakah user flow sederhana?
- [ ] Apakah jumlah langkah sudah minimal?
- [ ] Apakah feedback action jelas?
- [ ] Apakah loading/empty/error state tersedia?

## Data

- [ ] Tidak ada statistik palsu.
- [ ] Tidak ada user data palsu.
- [ ] Tidak ada event palsu.
- [ ] Tidak ada content palsu yang terlihat seperti production data.

## Code

- [ ] Existing component sudah diperiksa.
- [ ] Tidak ada dependency baru tanpa alasan.
- [ ] Tidak ada rewrite yang tidak diperlukan.
- [ ] Backend/API tidak berubah tanpa kebutuhan.
- [ ] Diff dapat dijelaskan dengan sederhana.

---

# 21. The Distinctiveness Test

Setelah UI selesai, tanyakan:

> Jika logo English Club dihapus,
> apakah halaman ini masih terlihat seperti produk English Club?

Jika jawabannya "tidak":

identitas produk belum cukup kuat.

Kemudian tanyakan:

> Apakah komponen ini dapat dipindahkan ke dashboard SaaS
> mana pun tanpa perubahan berarti?

Jika iya:

periksa kembali apakah komponen terlalu generik.

---

# 22. The Slop Test

Tanyakan:

> "Apa keputusan desain di halaman ini yang benar-benar berasal
> dari English Club?"

Minimal harus ada keputusan yang berasal dari:

- user
- content
- product
- brand
- mascot
- actual workflow

Jika seluruh keputusan dapat dijelaskan dengan:

> "karena ini pattern modern"

maka desain perlu ditinjau kembali.

---

# 23. Quality Gate

Frontend dianggap belum siap apabila:

### FAIL

- visual generik
- data palsu
- feature invented
- decorative clutter
- broken responsive behavior
- existing functionality rusak
- AI membuat rewrite besar tanpa alasan
- hierarchy tidak jelas

### PASS

- product-specific
- intentional
- functional
- consistent
- responsive
- accessible
- restrained
- existing behavior preserved

---

# 24. Core Rule

> English Club should feel designed,
> not generated.

Anti-slop bukan berarti membuat desain aneh.

Anti-slop berarti:

> setiap keputusan memiliki alasan.

---

# 25. Research Notes

Dokumen ini terinspirasi oleh pola dan prinsip yang dibahas pada
repository berikut:

1. `rwcod/anti-ai-slop-ui`
   - design intent sebelum component
   - design tokens dan layout strategy
   - quality gate / audit
   - kewaspadaan terhadap pattern UI generik

2. `miqdadbadjuber/anti-slop`
   - anti-slop sebagai filter, bukan pengganti design direction
   - keputusan visual tetap berasal dari design document
   - fokus pada intentionality dan product fit

3. `muris11/anti-ai-slop`
   - pola Tell → Why → Fix
   - restraint terhadap gradient, glassmorphism, shadow, radius,
     dan decorative effects

4. `yuwen-lu/unslop-ui`
   - visual restraint
   - penggunaan whitespace dan hierarchy
   - kewaspadaan terhadap decorative icon/card patterns

5. `hu553in/skills/anti-slop-design`
   - anti-slop bukan AI detector
   - product requirements dan repository constraints harus didahulukan
   - jangan melakukan perubahan arsitektur/dependency hanya demi
     "menghilangkan AI smell"

Sumber:

- https://github.com/rwcod/anti-ai-slop-ui
- https://github.com/miqdadbadjuber/anti-slop
- https://github.com/muris11/anti-ai-slop
- https://github.com/yuwen-lu/unslop-ui
- https://github.com/hu553in/skills/tree/main/anti-slop-design

---

# 26. Reference-Led Design Workflow

Use this section when a user provides a screenshot, asks to explore examples,
or requests a section to look like an external reference.

## 26.1 Learn the Pattern, Do Not Clone the Page

Before implementation:

1. Inspect the supplied reference and the existing target component.
2. Review several relevant live products when browsing is available; record
        the useful interaction/layout patterns, not someone else's exact styling,
        copy, assets, or page composition.
3. Check the applicable PRD, design system, and existing runtime behavior.
4. Write a small FE brief in `fe-docs/` when the decision is intended to guide
        implementation or future review.

A reference is evidence for a visual/interaction direction, not authorization
to discard product requirements or copy another product pixel-for-pixel.

## 26.2 Record the Preservation Contract

Before changing a section, list what must remain stable:

- existing card/component dimensions or expressly requested sizing
- real user/product imagery and meaningful alt text
- real content and existing data source
- routes, emitted events, and detail behavior
- loading, empty, error, and success states
- keyboard, touch, focus, and responsive behavior

When the user explicitly says to retain an asset or dimension, treat it as a
locked constraint. A reference's missing image or different card size does not
override that instruction.

## 26.3 Explain Each Borrowed Pattern

For each pattern carried into the UI, document:

- **Pattern:** what was observed (for example, status chips or a compact title panel)
- **Purpose:** which real user task it supports
- **Adaptation:** how it is expressed with English Club tokens and content
- **Preserved behavior:** what existing behavior remains unchanged

If a pattern has no clear purpose or conflicts with a locked requirement, omit
it or ask for clarification rather than silently inventing a compromise.

## 26.4 Reference-to-Implementation Review

Before marking the work complete, verify:

- [ ] Reference-inspired changes are limited to the requested surface.
- [ ] Existing image assets remain present unless removal was explicitly requested.
- [ ] Requested sizing and existing content constraints are preserved.
- [ ] Any new filters operate on verified existing data and expose their state accessibly.
- [ ] The desktop arrangement and mobile behavior are both intentional.
- [ ] The result uses English Club tokens and is not a generic copy of the reference.
- [ ] The FE brief and implementation agree on states, layout, and interactions.

For the current program-listing design, see `FE-WHATS-HAPPENING.md`.
