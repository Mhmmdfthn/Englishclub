-- Migrasi kelompok anggota (PRD Signup v2).
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor > New query > Run.
-- RLS sudah ON dari tabel existing (tanpa policy = akses via backend SERVICE_ROLE saja).

alter table ec_members_validation
  add column if not exists group_name text not null default '';
alter table member_profiles
  add column if not exists group_name text not null default '';

-- Batasi ke 5 kelompok resmi (baris lama dengan grup kosong tetap lolos via pengecualian '')
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ec_members_validation_group_check') then
    alter table ec_members_validation
      add constraint ec_members_validation_group_check
      check (group_name in ('', 'Zeus', 'Athena', 'Hades', 'Apollo', 'Hermes'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'member_profiles_group_check') then
    alter table member_profiles
      add constraint member_profiles_group_check
      check (group_name in ('', 'Zeus', 'Athena', 'Hades', 'Apollo', 'Hermes'));
  end if;
end $$;

create index if not exists idx_ec_members_validation_group on ec_members_validation(group_name);
create index if not exists idx_member_profiles_group on member_profiles(group_name);
