import pg from 'pg'

const { Pool } = pg

let pool = null

function getPool() {
  if (!process.env.DATABASE_URL) return null
  if (pool) return pool
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  pool.on('error', (e) => console.error('pg pool error', e.message))
  return pool
}

export function isDbEnabled() {
  return !!process.env.DATABASE_URL
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
  `)
  // seed proker default jika kosong
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
