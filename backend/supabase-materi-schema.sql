-- Materi embed Canva (tab Materi dashboard member).
-- Jalankan di Supabase SQL Editor sekali. Idempoten (aman diulang).
create table if not exists materials (
  id text primary key,
  title varchar(80) not null check (char_length(title) between 3 and 80),
  canva_url text not null check (canva_url like 'https://www.canva.com/design/%'),
  created_by text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_materials_created on materials(created_at desc);
