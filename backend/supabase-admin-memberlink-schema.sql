-- Taut lunak allowlist admin <-> member_profiles (tanpa FK keras ke auth).
-- member_profiles tidak diubah sama sekali.
alter table if exists ec_admin_allowlist
  add column if not exists member_id uuid null
  references member_profiles(id) on delete set null;

create index if not exists idx_admin_allowlist_member
  on ec_admin_allowlist(member_id);

-- Backfill tautan yang username-nya cocok (case-insensitive).
-- Admin yang bukan anggota tetap NULL dan semua fitur jalan normal.
update ec_admin_allowlist a
set member_id = p.id
from member_profiles p
where lower(p.username) = lower(a.username)
  and a.member_id is null;
