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

const VALID_ROLES = new Set(['superadmin', 'operator', 'so'])

function normalizeRole(role) {
  const r = String(role || '').toLowerCase()
  return VALID_ROLES.has(r) ? r : 'superadmin'
}

export async function listAllowed() {
  if (isSupabaseEnabled()) {    const sb = getSupabase()
    const { data, error } = await sb
      .from('ec_admin_allowlist')
      .select('username, role, created_by, created_at')
      .order('username', { ascending: true })
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return (data || []).map((a) => ({
      ...a,
      role: normalizeRole(a.role),
    }))
  }
  return loadLocal().map((a) => ({
    ...a,
    role: normalizeRole(a.role),
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
  return normalizeRole(hit.role)
}

// Role efektif member untuk Display QR: 'biasa' bila tanpa baris allowlist,
// 'so' bila baris so, selain itu role allowlist-nya (superadmin/operator).
export async function getMemberDisplayRole(username) {
  const role = await getAdminRole(username)
  if (!role) return 'biasa'
  return role
}

// Hanya untuk jalur biasa<->so: tolak bila target sedang superadmin/operator.
export async function setMemberSoRole(username, role, createdBy = '') {
  const u = normalizeAdminUsername(username)
  if (role !== 'biasa' && role !== 'so') throw fail(422, "role harus 'biasa' atau 'so'")
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur, error: readErr } = await sb
      .from('ec_admin_allowlist')
      .select('username, role')
      .eq('username', u)
      .maybeSingle()
    if (readErr) throw fail(503, 'Database sibuk, silakan coba lagi')
    const curRole = cur ? normalizeRole(cur.role) : null
    if (curRole === 'superadmin' || curRole === 'operator') {
      throw fail(403, 'Akun superadmin/operator tidak bisa diubah dari menu ini')
    }
    if (role === 'biasa') {
      if (!cur) return { username: u, role: 'biasa' }
      const { error } = await sb.from('ec_admin_allowlist').delete().eq('username', u)
      if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
      return { username: u, role: 'biasa' }
    }
    const { error } = await sb.from('ec_admin_allowlist').upsert(
      { username: u, role: 'so', created_by: createdBy || '' },
      { onConflict: 'username' },
    )
    if (error) {
      if (String(error.message || '').includes('role_check') || String(error.message || '').includes('check constraint')) {
        throw fail(503, 'Migrasi role SO belum dijalankan — jalankan backend/supabase-so-role-migration.sql')
      }
      throw fail(503, 'Database sibuk, silakan coba lagi')
    }
    return { username: u, role: 'so' }
  }
  const arr = loadLocal()
  const idx = arr.findIndex((a) => String(a.username || '').toLowerCase() === u)
  const curRole = idx >= 0 ? normalizeRole(arr[idx].role) : null
  if (curRole === 'superadmin' || curRole === 'operator') {
    throw fail(403, 'Akun superadmin/operator tidak bisa diubah dari menu ini')
  }
  if (role === 'biasa') {
    if (idx >= 0) arr.splice(idx, 1)
  } else if (idx >= 0) {
    arr[idx].role = 'so'
  } else {
    arr.push({ username: u, role: 'so', created_by: createdBy || '', created_at: new Date().toISOString() })
  }
  try {
    writeFileSync(allowPath, JSON.stringify(arr, null, 2), 'utf-8')
  } catch (e) {
    console.error('Allowlist saveLocal failed:', e.message)
  }
  return { username: u, role }
}
