-- Skema kanonis Supabase (PRD DB SUPABASE §4.2).
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor > New query > Run.
-- RLS: aktifkan manual per tabel setelah ini (tanpa policy = backend-only via SERVICE_ROLE_KEY).

-- members (pengganti members_list KV + Sheets + members.csv)
create table if not exists members (
  id bigint generated always as identity primary key,
  timestamp timestamptz default now() not null,
  nama varchar(40) not null,
  no_hp varchar(15) not null,
  jurusan varchar(30) not null check (jurusan in ('Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'))
);
create index if not exists idx_members_jurusan on members(jurusan);
create index if not exists idx_members_id_desc on members(id desc);

-- scores / leaderboard (pengganti leaderboard_list)
create table if not exists scores (
  id bigint generated always as identity primary key,
  name varchar(20) not null,
  score int not null check (score >= 0 and score <= 650000),
  words int not null check (words >= 0 and words <= 120),
  created_at timestamptz default now() not null
);
create index if not exists idx_scores_score on scores(score desc, created_at asc);

-- stories (pengganti stories_list)
create table if not exists stories (
  id bigint generated always as identity primary key,
  name varchar(40) not null,
  batch varchar(30) not null default 'Pengunjung Stand',
  comment varchar(220) not null,
  prize_won varchar(40) null,
  created_at timestamptz default now() not null
);
create index if not exists idx_stories_id on stories(id desc);

-- proker (unifikasi caption/description + photos)
create table if not exists proker (
  id text primary key,
  title varchar(80) not null check (char_length(title) between 3 and 80),
  description text not null default '',
  image_url text not null default '',
  image_public_id text not null default '',
  photos text[] not null default '{}',
  date date null,
  status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed')),
  "order" int not null,
  updated_at timestamptz default now() not null
);

-- seed 4 default
insert into proker (id, title, description, "order") values
  ('english-fun-day','English Fun Day','Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.',1),
  ('speaking-corner','Speaking Corner','Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.',2),
  ('debate-clinic','Debate Clinic','Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.',3),
  ('toefl-prep','TOEFL Prep','Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.',4)
on conflict (id) do nothing;

-- announcements (pengumuman dashboard, pengganti Kegiatan Sorotan)
create table if not exists announcements (
  id text primary key,
  title varchar(80) not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 5 and 500),
  pinned boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_announcements_pin_created on announcements(pinned desc, created_at desc);

insert into announcements (id, title, body, pinned) values
  ('selamat-datang-ec','Selamat datang di English Club UPB','Pantau pengumuman ini untuk info absensi, materi, dan agenda terbaru. Praktik rutin bikin progres.',true)
on conflict (id) do nothing;
