-- Skema akun anggota EC (tasks/PRD SIgnup.md).
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor > New query > Run.
-- RLS: aktifkan manual per tabel setelah ini (tanpa policy = akses via backend SERVICE_ROLE saja).

create extension if not exists citext;

-- Whitelist nama anggota (diisi Admin via dashboard whitelist)
create table if not exists ec_members_validation (
  id bigint generated always as identity primary key,
  fullname citext not null unique,
  is_registered boolean not null default false,
  created_at timestamptz default now() not null,
  registered_at timestamptz null
);
create index if not exists idx_ec_members_validation_registered on ec_members_validation(is_registered);

-- Profil akun anggota (id = auth.users.id, email sintetis {username}@members.englishclub.local)
create table if not exists member_profiles (
  id uuid primary key,
  username citext not null unique,
  fullname citext not null,
  created_at timestamptz default now() not null
);
create index if not exists idx_member_profiles_username on member_profiles(username);
