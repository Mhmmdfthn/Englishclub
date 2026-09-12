import { isDbEnabled, getDb } from './pg.js'
import { addMemberToSheets, cloudMembers, isSheetsEnabled, cloudAddMember, cloudAllMembers, isKvEnabled } from './cloudStore.js'
import { withWIB } from './time.js'

const ALLOWED_JURUSAN = new Set(['Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'])
let memoryMembers = []

function sanitize(v) {
  if (/^[=+\-@|%]/.test(v)) return "'" + v
  return v
}

export async function addMember(nama, no_hp, jurusan) {
  const n = sanitize(nama.trim()).slice(0, 40)
  const hp = sanitize(no_hp.trim()).slice(0, 15)
  const j = sanitize(jurusan.trim()).slice(0, 30)
  if (!ALLOWED_JURUSAN.has(j)) throw new Error(`Jurusan tidak valid: ${j}`)
  const row = { timestamp: new Date().toISOString().slice(0, 19), nama: n, no_hp: hp, jurusan: j }

  if (isKvEnabled()) {
    return cloudAddMember(row)
  }
  if (isSheetsEnabled()) {
    return addMemberToSheets(row)
  }
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query(
      'INSERT INTO members (nama, no_hp, jurusan) VALUES ($1,$2,$3) RETURNING timestamp, nama, no_hp, jurusan',
      [n, hp, j]
    )
    const r = rows[0]
    r.timestamp = new Date(r.timestamp).toISOString().slice(0, 19)
    return r
  }

  // Fallback in-memory lokal (tanpa akses filesystem/EROFS)
  memoryMembers.push(row)
  return row
}

export async function allMembers(limit = 100) {
  if (isKvEnabled()) return cloudAllMembers(limit)
  if (isSheetsEnabled()) return withWIB(await cloudMembers(limit))
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT timestamp, nama, no_hp, jurusan FROM members ORDER BY id DESC LIMIT $1', [limit])
    return withWIB(rows.map(r => ({ ...r, timestamp: new Date(r.timestamp).toISOString().slice(0, 19) })))
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
