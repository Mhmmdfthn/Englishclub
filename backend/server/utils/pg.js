// Shim depresiasi (PRD DB SUPABASE): Postgres generik via pg.Pool tidak dipakai lagi.
// Supabase (PostgREST) adalah primary store. Fungsi dipertahankan agar import lama
// tidak crash selama transisi; selalu return false/null.
export function isDbEnabled() {
  return false
}

export function getDb() {
  return null
}

export async function ensureDb() {
  return
}
