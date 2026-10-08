-- Presensi QR 7-detik: sesi/pertemuan + record kehadiran.
-- Secret tidak disimpan mentah di QR; QR = HMAC(secret, window 7s) + nonce anti-replay.
create table if not exists ec_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  date date not null default (now() at time zone 'Asia/Jakarta')::date,
  secret text not null,
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_attendance_sessions_date on ec_attendance_sessions(date desc);

create table if not exists ec_attendance_records (
  id bigint generated always as identity primary key,
  member_id uuid not null references member_profiles(id) on delete cascade,
  session_id uuid not null references ec_attendance_sessions(id) on delete cascade,
  status text not null default 'hadir' check (status in ('hadir', 'izin', 'alpa')),
  scanned_at timestamptz not null default now(),
  unique (member_id, session_id)
);
create index if not exists idx_attendance_records_session on ec_attendance_records(session_id, scanned_at desc);
create index if not exists idx_attendance_records_member on ec_attendance_records(member_id, scanned_at desc);
