-- Peran admin per menu (lanjutan supabase-admin-allowlist-schema.sql).
-- Baris lama otomatis superadmin agar tidak lockout.
alter table if exists ec_admin_allowlist
  add column if not exists role text not null default 'superadmin';

alter table if exists ec_admin_allowlist
  add column if not exists menus jsonb not null default '[]'::jsonb;

-- Nilai role yang sah.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ec_admin_allowlist_role_check') then
    alter table ec_admin_allowlist
      add constraint ec_admin_allowlist_role_check
      check (role in ('superadmin', 'operator'));
  end if;
end $$;
