-- Migrasi role SO (Display QR read-only).
-- Jalankan di Supabase SQL Editor sekali.
alter table if exists ec_admin_allowlist drop constraint if exists ec_admin_allowlist_role_check;
alter table if exists ec_admin_allowlist
  add constraint ec_admin_allowlist_role_check check (role in ('superadmin', 'operator', 'so'));

-- Daftarkan 1 user SO (ganti username_so dengan username member). Aman diulang.
-- insert into ec_admin_allowlist (username, role, created_by) values
--   ('username_so', 'so', 'superadmin')
-- on conflict (username) do update set role = excluded.role;
