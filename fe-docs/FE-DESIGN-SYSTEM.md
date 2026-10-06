# English Club Frontend Design System

> Visual and interaction guidelines for the English Club frontend redesign.
>
> Status: Draft
> Scope: Frontend visual system and reusable UI principles

---

## 1. Purpose

Dokumen ini menerjemahkan konsep pada `FE-REDESIGN.md`
menjadi aturan visual yang dapat digunakan secara konsisten
di seluruh frontend.

Untuk homepage publik, keputusan yang sudah Locked ada di
`PRD_Homepage_Redesign.md`. Aturan homepage di bawah (2B) merangkumnya.

Design system harus membantu frontend terasa:

- modern
- clean
- friendly
- playful
- educational
- consistent

Design system bukan kumpulan aturan yang harus diikuti secara
kaku tanpa pertimbangan.

Jika suatu keputusan visual berbeda dari dokumen ini,
harus ada alasan yang jelas dan tetap sesuai dengan
product direction English Club.

---

# 2. Design Direction

## Core Direction

> Modern E-learning × English Club × Playful

Visual harus terasa seperti platform pembelajaran modern,
tetapi tetap memiliki personality organisasi English Club.

Target visual:

> Professional enough for a university organization,
> playful enough to make learning feel approachable.

Jangan terlalu formal dan jangan terlalu childish.

---

# 2A. Existing Visual Tokens to Preserve or Refine

Repo saat ini sudah memiliki brand token yang selaras dengan arah redesign:

- Royal Blue `#0B569B`
- Yellow `#FFE600`

Repo juga sudah memiliki token radius dan shadow.

Redesign boleh merapikan token tersebut, tetapi tidak perlu membuat
sistem visual baru dari nol.

Perhatian khusus:

- body saat ini memakai beberapa gradient background
- card saat ini memakai backdrop blur / glass effect
- beberapa button dan surface memakai heavy shadow / glow

Pattern tersebut adalah bagian dari implementation existing, bukan
aturan yang harus dipertahankan. Redesign dapat menyederhanakannya
bila tidak membantu hierarchy atau usability.

# 2B. Homepage Rules (per PRD)

Berlaku untuk homepage publik. Detail lengkap ada di `PRD_Homepage_Redesign.md`.

- Warna tetap Royal Blue + Yellow. Boleh dilembutkan lewat tint, surface,
  spacing, dan typography, bukan diganti palette baru.
- Hero: background paling detail di sisi kanan (tempat Eli), makin lembut
  dan blur ke tengah-kiri. Ini pengecualian yang disengaja dari aturan
  gradient/blur, karena fungsinya menjaga teks tetap terbaca. Jangan tambah
  glow, shape melayang, atau noise dekoratif.
- Eli harus menyatu dengan komposisi hero, bukan terlihat seperti PNG yang
  menempel. Layout harus tetap jalan kalau Eli diganti nanti.
- Hanya satu primary CTA di hero.
- Navbar sticky, ringan, tanpa hamburger, menyatu dengan hero.
- Action Dock bukan navbar kedua: lebih ringan dari headline, icon
  konsisten, label jelas, tanpa container icon besar, tanpa heading
  "Quick Access".
- Horizontal scroll/drag (Action Dock, program, stories) tidak boleh
  bergantung pada petunjuk visual saja; keyboard dan focus state tetap
  harus bisa dipakai.
- Card program: cover, judul, tanggal/status, deskripsi singkat, akses ke
  detail. Jangan menaruh deskripsi penuh di card.
- Stories: terasa seperti momen editorial komunitas, bukan panel review.
  1-2 story terlihat sekaligus.

---

# 3. Design Priorities

Urutan prioritas visual:

1. Clarity
2. Usability
3. Hierarchy
4. Consistency
5. Brand identity
6. Personality
7. Decoration

Dekorasi tidak boleh mengorbankan lima hal pertama.

---

# 4. Color System

English Club menggunakan identitas utama:

- Blue
- Yellow
- White

Hijau digunakan terutama sebagai warna karakter Eli,
bukan sebagai warna utama seluruh interface.

## Primary

### English Club Blue

```text
#0B569B
```

Digunakan untuk:

- primary button
- active navigation
- important action
- key brand element

---

## Accent

### English Club Yellow

```text
#FFE600
```

Digunakan untuk:

- accent
- highlight
- selected state tertentu
- achievement
- visual emphasis

Yellow bukan warna untuk body text.

---

## Neutral

### Background

```text
#F5F7FA
```

### Surface

```text
#FFFFFF
```

### Primary Text

```text
#1F2937
```

### Secondary Text

```text
#6B7280
```

### Border

```text
#E5E7EB
```

Neutral colors digunakan untuk menjaga interface
tetap ringan dan tidak terlalu saturated.

---

# 5. Semantic Colors

Semantic colors harus tetap dibedakan dari brand colors.

## Success

Gunakan green yang readable.

Purpose:

- attendance success
- completed learning
- successful action

## Warning

Gunakan amber/orange.

Purpose:

- approaching deadline
- incomplete state
- attention required

## Error

Gunakan red.

Purpose:

- failed action
- invalid input
- system error

## Info

Gunakan blue/cyan yang tetap memiliki contrast yang cukup.

Semantic color harus digunakan berdasarkan fungsi,
bukan sekadar dekorasi.

---

# 6. Color Usage Rule

Jangan menggunakan seluruh warna sekaligus hanya karena tersedia.

Default visual hierarchy:

```text
Background
↓
Surface
↓
Primary text
↓
Primary blue
↓
Accent yellow
↓
Semantic colors
```

Blue dan yellow adalah identitas.

Hijau Eli dan biru Tom tidak otomatis menjadi
warna utama seluruh interface.

---

# 7. Typography

Typography harus:

- mudah dibaca
- modern
- friendly
- tidak terlalu dekoratif

### Existing Font Direction

Repo saat ini sudah menggunakan:

- `Plus Jakarta Sans` untuk body / UI text
- `Outfit` untuk heading / display text

Redesign sebaiknya mempertahankan pasangan ini terlebih dahulu.
Jangan menambah font baru hanya demi membuat desain terlihat berbeda.

Jangan menggunakan banyak jenis font hanya untuk membuat
halaman terlihat unik.

---

## Heading

Heading harus memiliki hierarchy yang jelas.

Contoh:

```text
H1
H2
H3
H4
```

Gunakan weight yang cukup kuat untuk membedakan heading,
tetapi hindari heading yang terlalu berat di seluruh halaman.

---

## Body

Body text harus nyaman dibaca pada mobile.

Prioritas:

- readable line-height
- tidak terlalu kecil
- paragraph tidak terlalu lebar
- contrast cukup

---

## Caption

Gunakan untuk:

- metadata
- timestamp
- helper text
- secondary information

Caption bukan tempat untuk informasi penting.

---

# 8. Spacing

Gunakan spacing system yang konsisten.

Default principle:

> More whitespace, less visual clutter.

Jangan mengisi setiap ruang kosong.

Whitespace merupakan bagian dari hierarchy.

Spacing harus konsisten antara:

- sections
- cards
- form fields
- buttons
- navigation
- content blocks

Gunakan spacing token yang konsisten daripada
nilai random pada setiap component.

---

# 9. Border Radius

Interface menggunakan rounded geometry secara terkendali.

Recommended hierarchy:

### Small

Untuk:

- badge
- small controls
- tags

### Medium

Untuk:

- inputs
- buttons
- cards

### Large

Untuk:

- hero surface tertentu
- mascot container
- prominent feature area

Jangan membuat seluruh interface memiliki radius yang sama.

Radius harus membantu menunjukkan hierarchy.

---

# 10. Shadows

Shadow digunakan secara subtle.

Tujuannya:

- menunjukkan elevation
- memisahkan surface
- memberi emphasis

Hindari:

- heavy shadow
- glowing shadow
- colored shadow
- shadow pada setiap element

Default interface harus tetap terlihat clean meskipun shadow
dihilangkan.

---

# 11. Borders

Border digunakan ketika diperlukan untuk:

- grouping
- separation
- input boundary
- table/data structure

Border default harus subtle.

Jangan menggunakan border tebal sebagai dekorasi.

---

# 12. Buttons

Button memiliki hierarchy yang jelas.

## Primary

Digunakan untuk:

- main action
- submit
- attendance
- important CTA

Visual:

- English Club Blue
- readable white text

## Secondary

Digunakan untuk:

- alternative action
- supporting action

## Ghost

Digunakan untuk:

- low priority action
- navigation
- secondary controls

## Destructive

Digunakan untuk:

- delete
- revoke
- destructive action

Jangan menggunakan destructive color
untuk action biasa.

---

# 13. Button Rules

Button harus:

- memiliki label yang jelas
- memiliki adequate touch target
- memiliki visible hover/focus state
- memiliki disabled state
- menunjukkan loading ketika action membutuhkan waktu

Hindari:

- button hanya berisi icon tanpa alasan
- terlalu banyak CTA dalam satu area
- setiap button menggunakan primary style

---

# 14. Forms

Form harus sederhana dan predictable.

Setiap input penting harus memiliki:

- label
- input state
- error state jika diperlukan
- helper text jika diperlukan

Jangan menggunakan placeholder sebagai satu-satunya label
untuk informasi penting.

---

# 15. Cards

Card digunakan untuk mengelompokkan informasi yang memang
memiliki hubungan.

Card bukan default container untuk semua elemen.

Gunakan card terutama untuk:

- attendance
- activity
- learning content
- schedule
- summary information

Jangan membuat card hanya karena area terlihat kosong.

---

# 16. Navigation

Navigation harus:

- predictable
- simple
- consistent
- responsive

Member navigation harus memprioritaskan:

- Dashboard
- Attendance
- Learning / Materials
- Schedule
- Profile

Jika jumlah navigation bertambah terlalu banyak,
gunakan grouping atau secondary navigation.

---

# 17. Dashboard Layout

Dashboard bukan landing page.

Tujuan utama dashboard:

> Member dapat memahami kondisi dan aktivitas mereka
> dengan cepat.

Prioritas layout:

```text
Greeting
↓
Priority Action / Attendance
↓
Today's Activity
↓
Learning
↓
Secondary Information
```

Jangan memenuhi dashboard dengan widget hanya agar terlihat "lengkap".

---

# 18. Responsive Design

Frontend dirancang dengan pendekatan mobile-first.

## Mobile

Pastikan:

- primary action mudah dijangkau
- navigation sederhana
- content tidak terlalu padat
- card tidak terlalu lebar
- text tetap readable

## Tablet

Gunakan ruang tambahan untuk hierarchy,
bukan sekadar memperbesar seluruh component.

## Desktop

Gunakan ruang horizontal untuk:

- content grouping
- sidebar/navigation (member area saja; homepage publik tidak memakai sidebar)
- multi-column layout bila memang membantu

Desktop tidak boleh mengubah product logic.

---

# 19. Responsive Navigation

Mobile navigation harus sederhana.

Prioritas:

- Dashboard
- Attendance
- Learning
- Profile

Schedule dapat:

- masuk sebagai primary navigation,
- atau ditempatkan pada secondary navigation,

tergantung data penggunaan aktual.

Jangan membuat mobile navigation terlalu padat.

---

# 20. Icon System

Gunakan satu visual style icon secara konsisten.

Icon harus:

- simple
- readable
- semantically appropriate

Icon digunakan untuk membantu pemahaman,
bukan memenuhi ruang.

Jangan mengganti icon dengan emoji
hanya agar interface terlihat playful.

---

# 21. Illustration System

Illustration style harus konsisten dengan mascot:

- 2D
- clean
- rounded
- limited color palette
- subtle shading
- clear silhouette

Jangan mencampurkan:

- realistic illustration
- 3D render
- stock illustration
- random AI art
- unrelated cartoon style

dalam satu interface tanpa alasan.

---

# 22. Mascot System

English Club memiliki dua mascot.

---

## Eli

### Identity

Mini robot dengan crocodile hoodie.

### Role

Primary mascot.

### Personality

- friendly
- curious
- energetic
- slightly playful

### Main Usage

- Homepage hero
- Dashboard
- Login
- Attendance
- Onboarding
- Empty state
- Success state

### Visual

Dominant colors:

- Green
- Blue
- Yellow
- White

Robot body harus tetap konsisten.

---

## Tom

### Identity

Mini robot dengan shark hoodie.

### Role

Secondary mascot.

### Personality

- playful
- adventurous
- competitive
- energetic

### Main Usage

- Game
- Challenge
- Leaderboard
- Achievement
- Special event

---

# 23. Mascot Consistency

Eli dan Tom harus terasa berasal dari character universe yang sama.

Pertahankan:

- head shape
- body proportion
- face structure
- limb size
- shoe style
- outline
- rendering style

Perbedaan utama:

```text
Eli → Crocodile Hoodie
Tom → Shark Hoodie
```

Jangan mengubah robot menjadi dua
character design yang berbeda.

---

# 24. Mascot Placement

Mascot boleh tampil dalam:

### Greeting

Menyambut user.

### Feedback

Menunjukkan success/error/empty state.

### Learning

Mendukung konteks pembelajaran.

### Game

Memberikan personality dan energy.

Mascot tidak boleh dipasang:

- pada setiap card
- pada setiap section
- sebagai wallpaper
- hanya karena area kosong

---

# 25. Mascot Asset Rules

Asset utama sebaiknya:

- transparent background
- full body
- reusable
- consistent proportions

Gunakan pose yang memang memiliki fungsi.

Contoh Eli:

- standing
- waving
- thinking
- success

Contoh Tom:

- standing
- pointing
- achievement

Tidak perlu membuat puluhan pose sebelum ada kebutuhan nyata.

---

# 26. Animation

Animation bersifat progressive enhancement.

Default:

> UI harus tetap baik tanpa animation.

Animation dapat digunakan untuk:

- loading
- transition
- success
- feedback
- subtle interaction

Hindari:

- infinite floating mascot
- excessive bouncing
- decorative spinning
- continuous motion
- animation yang memperlambat task

---

# 27. Interaction States

Komponen interaktif minimal memiliki:

- default
- hover
- focus
- active
- disabled
- loading bila diperlukan

Status harus terlihat tanpa bergantung pada satu warna saja.

---

# 28. Loading State

Loading state harus:

- jelas
- ringan
- tidak mengganggu
- tidak membuat user mengira aplikasi rusak

Skeleton dapat digunakan jika membantu.

Jangan membuat loading animation besar
hanya sebagai dekorasi.

---

# 29. Empty State

Empty state harus menjelaskan:

1. kondisi
2. mengapa kosong jika relevan
3. apa yang dapat dilakukan berikutnya

Mascot dapat digunakan untuk empty state
jika sesuai konteks.

Contoh:

```text
Nothing here yet.

Your learning materials will appear here
once they are available.
```

---

# 30. Success State

Success state harus:

- singkat
- jelas
- memberikan confirmation

Contoh:

```text
Attendance recorded!

Nice, you're in.
```

Eli dapat digunakan sebagai supporting visual.

---

# 31. Error State

Error state harus:

- jelas
- tidak menyalahkan user
- memberikan next action jika memungkinkan

Contoh:

```text
Something went wrong.

Please try again.
```

Jangan menggunakan error hanya sebagai
warna merah tanpa penjelasan.

---

# 32. Content Style

Microcopy harus:

- singkat
- human
- jelas
- friendly

English Club dapat menggunakan bahasa Inggris
untuk elemen UI tertentu agar sesuai dengan konteks pembelajaran.

Namun clarity tetap lebih penting daripada memaksakan
bahasa Inggris pada setiap teks.

Homepage: headline dan supporting copy memakai bahasa Inggris
(`Learn. Connect. Grow.`), sedangkan label Action Dock mengikuti PRD
(`Home`, `Absen`, `Materi`, `Word Hunt`).

Hindari:

- corporate jargon
- marketing filler
- kalimat panjang untuk action sederhana

---

# 33. Data Visualization

Chart hanya digunakan apabila data benar-benar
membutuhkan visualisasi.

Untuk informasi sederhana:

> gunakan text / badge / simple indicator.

Jangan membuat chart hanya agar dashboard
terlihat lebih sophisticated.

Tidak boleh ada data dummy yang terlihat seperti production data.

---

# 34. Tables

Table digunakan ketika user perlu membandingkan
banyak data terstruktur.

Untuk informasi sederhana,
gunakan list atau compact content block.

Mobile version harus memiliki strategi responsive
yang jelas.

---

# 35. Page Hierarchy

Setiap halaman harus memiliki:

### Primary goal

Apa tujuan utama halaman?

### Primary action

Apa yang paling penting dilakukan user?

### Secondary information

Apa yang mendukung action tersebut?

### Optional information

Apa yang boleh diabaikan user?

Jika seluruh elemen memiliki visual emphasis yang sama,
hierarchy harus diperbaiki.

---

# 36. Visual Density

Target density:

> Comfortable, not empty and not crowded.

Terlalu kosong:

- informasi sulit ditemukan
- terlalu banyak decorative space

Terlalu padat:

- sulit dipindai
- terlihat seperti admin tool

Gunakan whitespace untuk membantu scanning.

---

# 37. Decorative Elements

Decorative elements boleh digunakan jika:

- memperkuat brand
- memperjelas hierarchy
- memberi personality
- tidak mengganggu task

Contoh yang sesuai:

- subtle mascot placement
- yellow accent shape
- small illustration
- controlled background detail

Hindari decorative elements yang hanya mengisi kekosongan.

---

# 38. Component Reuse

Sebelum membuat component baru,
periksa apakah kebutuhan dapat dipenuhi
dengan component existing.

Component baru harus memiliki:

- purpose
- reusable behavior
- predictable API
- design system compatibility

Jangan membuat component baru hanya karena
nama component lama terasa kurang keren.

---

# 39. Accessibility Baseline

Semua UI harus mempertahankan:

- sufficient contrast
- semantic HTML
- readable text
- accessible labels
- visible focus state
- keyboard-friendly interaction
- meaningful alt text

Design yang menarik tetapi sulit digunakan
dianggap gagal.

---

# 40. Design Review Checklist

Sebelum halaman dianggap selesai:

## Visual

- [ ] Color sesuai design system
- [ ] Typography konsisten
- [ ] Spacing konsisten
- [ ] Radius digunakan secara terkontrol
- [ ] Shadow tidak berlebihan
- [ ] Tidak ada dekorasi yang tidak perlu

## UX

- [ ] Primary goal jelas
- [ ] Primary action jelas
- [ ] User flow sederhana
- [ ] Feedback jelas

## Responsive

- [ ] Mobile
- [ ] Tablet
- [ ] Desktop

## Components

- [ ] Existing components dipertimbangkan
- [ ] Tidak ada component duplicate tanpa alasan

## Mascot

- [ ] Eli/Tom sesuai konteks
- [ ] Character style konsisten
- [ ] Tidak digunakan sebagai filler

## States

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Success

---

# 41. Decision Rule

Ketika dua pilihan desain sama-sama dapat bekerja:

Pilih yang:

1. lebih jelas,
2. lebih sederhana,
3. lebih mudah digunakan kembali,
4. lebih sesuai dengan English Club,
5. memiliki lebih sedikit visual noise.

---

# 42. Final Principle

> Good design does not need every space to say something.

English Club frontend harus terasa:

> Designed with intention,
> not decorated by default.
