// Allowlist username admin — minimal: daftar + cek.
// Aturan: daftar KOSONG = belum dikunci (semua lolos, kompatibel mundur).
// Username dicocokkan case-insensitive dengan username akun member.
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getSupabase, isSupabaseEnabled } from './supabase.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const allowPath = join(__dirname, '../data/allowed-admins.json')

function fail(status, detail) {
  const e = new Error(detail)
  e.status = status
  return e
}

function loadLocal() {
  if (!existsSync(allowPath)) return []
  try {
    const arr = JSON.parse(readFileSync(allowPath, 'utf-8'))
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function normalizeAdminUsername(v) {
  const s = String(v || '').trim().toLowerCase()
  if (!/^[a-z0-9_@.\-]{3,60}$/.test(s)) {
    throw fail(422, 'Username 3-60 karakter (huruf, angka, _, @, ., -)')
  }
  return s
}

export async function listAllowed() {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('ec_admin_allowlist')
      .select('username, role, created_by, created_at')
      .order('username', { ascending: true })
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return (data || []).map((a) => ({
      ...a,
      role: a.role === 'operator' ? 'operator' : 'superadmin',
    }))
  }
  return loadLocal().map((a) => ({
    ...a,
    role: a.role === 'operator' ? 'operator' : 'superadmin',
  }))
}

// Daftar kosong = belum dikunci (semua lolos) agar tidak lockout saat awal.
export async function isAllowed(username) {
  const u = String(username || '').trim().toLowerCase()
  if (!u) return false
  const list = await listAllowed()
  if (!list.length) return true
  return list.some((a) => String(a.username || '').toLowerCase() === u)
}

export async function getAdminRole(username) {
  const u = String(username || '').trim().toLowerCase()
  const list = await listAllowed()
  const hit = list.find((a) => String(a.username || '').toLowerCase() === u)
  if (!hit) return null
  return hit.role === 'operator' ? 'operator' : 'superadmin'
}
