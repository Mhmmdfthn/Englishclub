import { getSupabase, isSupabaseEnabled } from './supabase.js'
import { withWIB } from './time.js'

const ALLOWED_JURUSAN = new Set(['Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'])
let memoryMembers = []

function sanitize(v) {
  if (/^[=+\-@|%]/.test(v)) return "'" + v
  return v
}

function toRow(r) {
  const ts = r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19)
  return { timestamp: ts, nama: r.nama, no_hp: r.no_hp, jurusan: r.jurusan }
}

export async function addMember(nama, no_hp, jurusan) {
  const n = sanitize(nama.trim()).slice(0, 40)
  const hp = sanitize(no_hp.trim()).slice(0, 15)
  const j = sanitize(jurusan.trim()).slice(0, 30)
  if (!ALLOWED_JURUSAN.has(j)) throw new Error(`Jurusan tidak valid: ${j}`)

  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('members')
      .insert({ nama: n, no_hp: hp, jurusan: j })
      .select('timestamp, nama, no_hp, jurusan')
      .single()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    const row = toRow(data)
    return { ...row, queued: false }
  }

  // Fallback memory lokal (dipakai sebelum SUPABASE_* diset / project belum dibuat)
  const row = { timestamp: new Date().toISOString().slice(0, 19), nama: n, no_hp: hp, jurusan: j }
  memoryMembers.push(row)
  return { ...row, queued: false }
}

export async function allMembers(limit = 100) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('members')
      .select('timestamp, nama, no_hp, jurusan')
      .order('id', { ascending: false })
      .limit(limit)
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return withWIB(data.map(toRow))
  }
  return withWIB([...memoryMembers].reverse().slice(0, limit))
}

export async function highlight(limit = 30) {
  const rows = await allMembers(limit)
  return rows.map(r => ({ nama: r.nama, jurusan: r.jurusan, timestamp: r.timestamp, timestamp_wib: r.timestamp_wib }))
}

export function csvFilePath() {
  return null
}
