# English Club FE Docs — Index (Pintu Masuk AI & Developer)

> Baca file ini dulu sebelum mengubah frontend apa pun.
> Status: Locked untuk urutan baca. Isi tiap dokumen tetap menjadi source of truth masing-masing.

## 1. Urutan baca wajib

1. `PRD_Homepage_Redesign.md` — keputusan **Locked** homepage publik. Menang jika bertentangan dengan dokumen lain.
2. `FE-DESIGN-SYSTEM.md` — token visual: Royal Blue `#0B569B`, Yellow `#FFE600`, font `Plus Jakarta Sans + Outfit`, maskot Eli + Tom.
3. `FE-FLOW.md` — alur user: guest/member, Action Dock vs Navbar, state loading/empty/error.
4. `FE-INSPIRATION-HOMEPAGE.md` — referensi visual homepage (Playful Edu modern). Pola yang boleh dipinjam + adaptasinya.
5. `FE-SOP-Anti-Slop.md` — quality gate. Wajib lolos sebelum commit. Lihat bab 26 untuk workflow berbasis referensi.
6. `FE-REDESIGN.md` — konsep besar (member flow, dashboard, attendance).
7. `FE-TASKS.md` — checklist eksekusi P0/P1/P2. Homepage = §13A.
8. Brief per-section (contoh: `FE-WHATS-HAPPENING.md`) — kontrak preservasi spesifik section.

## 2. Aturan konflik

```text
PRD_Homepage_Redesign (Locked homepage)
  > FE-DESIGN-SYSTEM (token)
  > FE-FLOW (behavior)
  > FE-INSPIRATION (referensi, bukan template)
  > FE-SOP-Anti-Slop (filter)
  > FE-REDESIGN / FE-TASKS (konsep & prioritas)
```

Referensi inspirasi tidak pernah mengalahkan PRD Locked, token, atau behavior existing.

## 3. Cara memberi instruksi ke AI (protokol singkat)

1. **Context:** kirim file index ini + 2-3 file relevan + file Vue target.
2. **Constraints:** sebut yang tidak boleh berubah (route, API, gambar asli, ukuran card, state).
3. **Plan:** minta AI tulis file yang diubah + alasan + komponen reuse + behavior yang dipertahankan.
4. **Implementation:** perubahan kecil, targeted.
5. **Review:** cek diff + `FE-SOP-Anti-Slop.md` §20 Pre-Commit Audit.

Contoh prompt baik ada di `FE-TASKS.md` §26 dan `FE-SOP-Anti-Slop.md` §14.

## 4. Peta file

| File | Peran | Status |
|---|---|---|
| `PRD_Homepage_Redesign.md` | Apa yang dibangun di homepage | Locked |
| `FE-DESIGN-SYSTEM.md` | Bagaimana tampilannya | Draft stabil |
| `FE-FLOW.md` | Bagaimana user bergerak | Draft stabil |
| `FE-INSPIRATION-HOMEPAGE.md` | Inspirasi apa yang dipakai | Locked arah, detail evolving |
| `FE-SOP-Anti-Slop.md` | Apa yang dilarang | Active gate |
| `FE-WHATS-HAPPENING.md` | Contoh brief section yang sudah applied | Applied |
| `FE-TASKS.md` | Urutan kerja | Active |

## 5. Yang tidak ada di sini

- Skema database / endpoint backend: lihat `PRD*.md` di root repo dan `backend/server/`.
- Spesifikasi game Word Hunt: lihat `README.md` + `docs/walkthrough.md`.
