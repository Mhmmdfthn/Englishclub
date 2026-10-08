// Allowlist username admin (hak akses login admin by username).
// Aturan: daftar KOSONG = belum dikunci, semua kredensial valid bisa login
// (kompatibel mundur). Sekali ada entri, hanya username terdaftar yang lolos.
// Backend-only via SERVICE_ROLE; mode lokal memakai file JSON.
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

function saveLocal(arr) {
  try {
    writeFileSync(allowPath, JSON.stringify(arr, null, 2), 'utf-8')
  } catch (e) {
    console.error('Allowlist saveLocal failed:', e.message)
  }
}

export function normalizeAdminUsername(v) {
  const s = String(v || '').trim().toLowerCase()
  if (!/^[a-z0-9_@.\-]{3,60}$/.test(s)) {
    throw fail(422, 'Username 3-60 karakter (huruf, angka, _, @, ., -)')
  }
  return s
}

export const ADMIN_MENUS = ['pendaftar', 'proker', 'spinner', 'akun']

function normalizeRoleMenus(role, menus) {
  const r = String(role || 'operator').trim().toLowerCase()
  if (r !== 'superadmin' && r !== 'operator') {
    throw fail(422, 'Role harus superadmin atau operator')
  }
  const ms = Array.isArray(menus) ? menus : []
  const clean = [...new Set(ms.map((m) => String(m).trim().toLowerCase()))]
    .filter((m) => ADMIN_MENUS.includes(m))
  return { role: r, menus: r === 'superadmin' ? [...ADMIN_MENUS] : clean }
}

// Entri lama tanpa field peran = superadmin (anti-lockout).
function withRoleDefaults(row) {
  if (!row) return null
  const role = row.role === 'operator' ? 'operator' : 'superadmin'
  const menus = Array.isArray(row.menus)
    ? row.menus.filter((m) => ADMIN_MENUS.includes(String(m).toLowerCase()))
    : (role === 'superadmin' ? [...ADMIN_MENUS] : [])
  return { ...row, role, menus }
}

export async function getRole(username) {
  const u = String(username || '').trim().toLowerCase()
  const list = await listAllowed()
  const hit = list.find((a) => String(a.username || '').toLowerCase() === u)
  if (!hit) return null
  return withRoleDefaults(hit)
}

export async function setRole(username, role, menus, by) {
  const u = normalizeAdminUsername(username)
  const req = String(by || '').trim().toLowerCase()
  if (u && u === req) throw fail(422, 'Tidak bisa mengubah peran sendiri')
  const { role: r, menus: ms } = normalizeRoleMenus(role, menus)
  const list = await listAllowed()
  const hit = list.find((a) => String(a.username || '').toLowerCase() === u)
  if (!hit) throw fail(404, 'Username tidak ada di daftar')
  const wasSuper = (hit.role || 'superadmin') === 'superadmin'
  if (wasSuper && r !== 'superadmin') {
    const supers = list.filter((a) => (a.role || 'superadmin') === 'superadmin')
    if (supers.length <= 1) throw fail(422, 'Tidak bisa demote superadmin terakhir')
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const member_id = await resolveMemberId(u)
    let { error } = await sb.from('ec_admin_allowlist').update({ role: r, menus: ms, member_id }).eq('username', u)
    if (error && /member_id/i.test(error.message || '')) {
      // Kolom tautan belum migrasi: tulis tanpa member_id.
      const retry = await sb.from('ec_admin_allowlist').update({ role: r, menus: ms }).eq('username', u)
      error = retry.error
    }
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return { username: u, role: r, menus: ms, member_id }
  }
  const arr = loadLocal()
  const i = arr.findIndex((a) => String(a.username || '').toLowerCase() === u)
  arr[i] = { ...arr[i], role: r, menus: ms }
  saveLocal(arr)
  return { username: u, role: r, menus: ms }
}

export async function listAllowed() {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    // Embed info anggota bila kolom member_id sudah migrasi; fallback tanpa
    // embed bila belum (tabel lama) agar tidak error.
    let query = sb
      .from('ec_admin_allowlist')
      .select('username, role, menus, created_by, created_at, member_id, member:member_id(username, fullname, group_name)')
      .order('username', { ascending: true })
    let { data, error } = await query
    if (error) {
      // Fallback skema lama (kolom role/menus/member_id belum migrasi).
      const fb = await sb
        .from('ec_admin_allowlist')
        .select('username, created_by, created_at')
        .order('username', { ascending: true })
      data = (fb.data || []).map((a) => ({ ...a, member: null }))
      error = fb.error
    }
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return (data || []).map((a) => ({ ...a, member: a.member || null }))
  }
  return loadLocal()
}

// Cari id member_profiles dari username (case-insensitive).
// Gagal / mode lokal -> null (tautan opsional, operasi tetap sukses).
async function resolveMemberId(username) {
  try {
    if (!isSupabaseEnabled()) return null
    const sb = getSupabase()
    const { data, error } = await sb
      .from('member_profiles')
      .select('id, username')
      .ilike('username', String(username || '').trim())
      .maybeSingle()
    if (error || !data) return null
    return data.id
  } catch {
    return null
  }
}

// Daftar kosong = belum dikunci (semua lolos) agar tidak lockout saat awal.
export async function isAllowed(username) {
  const u = String(username || '').trim().toLowerCase()
  if (!u) return false
  const list = await listAllowed()
  if (!list.length) return true
  return list.some((a) => String(a.username || '').toLowerCase() === u)
}

export async function addAllowed(username, createdBy = '') {
  const u = normalizeAdminUsername(username)
  const list = await listAllowed()
  if (list.some((a) => String(a.username || '').toLowerCase() === u)) {
    throw fail(409, 'Username sudah ada di daftar')
  }
  const row = {
    username: u,
    created_by: String(createdBy || ''),
    created_at: new Date().toISOString(),
    // Entri pertama = pendiri = superadmin (bootstrap anti-lockout).
    // Berikutnya default operator tanpa menu, wajib di-grant.
    ...(list.length === 0
      ? { role: 'superadmin', menus: [...ADMIN_MENUS] }
      : { role: 'operator', menus: [] }),
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const member_id = await resolveMemberId(u)
    const payload = { ...row, member_id }
    let { error } = await sb.from('ec_admin_allowlist').insert(payload)
    if (error && /member_id|role|menus/i.test(error.message || '')) {
      // Skema lama (kolom belum migrasi): insert minimal.
      const retry = await sb.from('ec_admin_allowlist').insert({
        username: row.username,
        created_by: row.created_by,
        created_at: row.created_at,
      })
      error = retry.error
    }
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return { ...row, member_id }
  }
  const arr = loadLocal()
  arr.push(row)
  saveLocal(arr)
  return row
}

export async function removeAllowed(username, requester = '') {
  const u = normalizeAdminUsername(username)
  const req = String(requester || '').trim().toLowerCase()
  if (u && u === req) throw fail(422, 'Tidak bisa menghapus akun sendiri')
  const list = await listAllowed()
  if (!list.some((a) => String(a.username || '').toLowerCase() === u)) {
    throw fail(404, 'Username tidak ada di daftar')
  }
  if (list.length <= 1) {
    throw fail(422, 'Tidak bisa menghapus entri terakhir (anti-lockout)')
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { error } = await sb.from('ec_admin_allowlist').delete().eq('username', u)
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return { username: u }
  }
  saveLocal(loadLocal().filter((a) => String(a.username || '').toLowerCase() !== u))
  return { username: u }
}
