import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

let pool = null

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) return process.env.DATABASE_URL
  const candidates = [
    join(__dirname, '../../global-config.json'),
    join(__dirname, '../../../englishclub-global-config.json'),
    join(__dirname, '../../server/data/global-config.json'),
  ]
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const j = JSON.parse(readFileSync(p, 'utf-8'))
        if (j.DATABASE_URL && j.DATABASE_URL.startsWith('postgres')) return j.DATABASE_URL
        if (j.databaseUrl && j.databaseUrl.startsWith('postgres')) return j.databaseUrl
      }
    } catch {}
  }
  return null
}

function getPool() {
  const url = resolveDatabaseUrl()
  if (!url) return null
  if (pool) return pool
  pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  pool.on('error', (e) => console.error('pg pool error', e.message))
  return pool
}

export function isDbEnabled() {
  return !!resolveDatabaseUrl()
}

export function getDb() {
  return getPool()
}

// init tables if DB enabled — dipanggil di server start
export async function ensureDb() {
  const p = getPool()
  if (!p) return
  await p.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT now(),
      nama VARCHAR(40) NOT NULL,
      no_hp VARCHAR(15) NOT NULL,
      jurusan VARCHAR(30) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS proker (
      id TEXT PRIMARY KEY,
      title VARCHAR(40) NOT NULL,
      caption VARCHAR(280) NOT NULL,
      photos TEXT[] DEFAULT '{}',
      "order" INT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(20) NOT NULL,
      score INT NOT NULL,
      words INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(40) NOT NULL,
      batch VARCHAR(30) NOT NULL,
      comment VARCHAR(220) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      username TEXT REFERENCES admins(username) ON DELETE CASCADE,
      exp TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_stories_id ON stories(id DESC);
    CREATE INDEX IF NOT EXISTS idx_members_jurusan ON members(jurusan);
  `)
  const { rows } = await p.query('SELECT COUNT(*) FROM proker')
  if (parseInt(rows[0].count, 10) === 0) {
    await p.query(`
      INSERT INTO proker (id, title, caption, photos, "order") VALUES
      ('english-fun-day', 'English Fun Day', 'Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.', '{}', 1),
      ('speaking-corner', 'Speaking Corner', 'Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.', '{}', 2),
      ('debate-clinic', 'Debate Clinic', 'Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.', '{}', 3),
      ('toefl-prep', 'TOEFL Prep', 'Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.', '{}', 4)
      ON CONFLICT (id) DO NOTHING
    `)
  }
}
