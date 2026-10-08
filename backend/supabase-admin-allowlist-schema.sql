-- Allowlist username admin (hak akses login admin by username).
-- Aturan enforcement ada di backend: daftar KOSONG = belum dikunci.
-- Username harus SAMA dengan username akun member-nya (pencocokan string,
-- tanpa FK ke member_profiles).
create table if not exists ec_admin_allowlist (
  username citext primary key,
  role text not null default 'operator' check (role in ('superadmin', 'operator')),
  created_by text not null default '',
  created_at timestamptz not null default now()
);
