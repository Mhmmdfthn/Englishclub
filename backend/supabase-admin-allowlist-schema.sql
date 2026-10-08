-- Allowlist username admin (hak akses login admin by username).
-- Aturan enforcement ada di backend: daftar KOSONG = belum dikunci.
create table if not exists ec_admin_allowlist (
  username citext primary key,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
