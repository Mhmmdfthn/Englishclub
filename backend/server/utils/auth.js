// Auth via Supabase Auth (PRD DB SUPABASE). Backend-only service_role.
// Jika SUPABASE_* belum diset (project belum dibuat), fallback lokal
// (admins.json + bcrypt + memory token 8h) agar dev/test tetap jalan.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import { getSupabase, getSupabaseAuth, isSupabaseEnabled } from './supabase.js'
import { listAllowed } from './adminAllowlist.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
try {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
} catch {}
const adminsPath = join(dataDir, 'admins.json')

function loadAdmins() {
  if (!existsSync(adminsPath)) return []
  try { return JSON.parse(readFileSync(adminsPath, 'utf-8')) } catch { return [] }
}
function saveAdmins(arr) {
  try { writeFileSync(adminsPath, JSON.stringify(arr, null, 2), 'utf-8') } catch (e) {
    console.error('Auth saveAdmins failed:', e.message)
  }
}

const TTL = 8 * 3600 * 1000
const tokens = new Map()

function verifyLocalToken(token) {
  if (!token) return null
  const v = tokens.get(token)
  if (!v) return null
  if (Date.now() > v.exp) { tokens.delete(token); return null }
  return v.username
}

export async function verifyPassword(username, password) {
  if (isSupabaseEnabled()) {
    const sb = getSupabaseAuth()
    // Cari email admin: username 'admin' -> admin@englishclub.local (konvensi seed)
    const email = username.includes('@') ? username : `${username}@englishclub.local`
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return false
    try { await sb.auth.signOut() } catch {}
    return true
  }
  const adm = loadAdmins().find(a => a.username === username)
  if (!adm) return false
  return bcrypt.compare(password, adm.password_hash)
}

export async function issueToken(username) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const email = username.includes('@') ? username : `${username}@englishclub.local`
    // Password sudah diverifikasi di verifyPassword; di sini kita butuh password lagi?
    // Untuk menjaga kontrak {ok,token}, login route memanggil signIn langsung.
    // Fallback: token random yang dipetakan ke username, diverifikasi via getUser di verify.
    // Namun pola benar: route /login memakai supabase langsung (lihat routes/admin.js).
    // Fungsi ini tetap ada untuk kompatibilitas: kembalikan session token via signIn ulang tidak mungkin
    // tanpa password, jadi route harus memakai loginWithPassword di bawah.
    throw new Error('Gunakan loginWithPassword untuk Supabase Auth')
  }
  const token = randomBytes(24).toString('base64url')
  tokens.set(token, { username, exp: Date.now() + TTL })
  return token
}

export async function loginWithPassword(username, password, emailOverride = null) {
  const sb = getSupabaseAuth()
  const email = emailOverride || (username.includes('@') ? username.trim() : `${username.trim()}@englishclub.local`)
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error || !data?.session?.access_token) return null
  return { token: data.session.access_token, username: username.trim(), email }
}

export async function verifyTokenAsync(token) {
  if (!token) return null
  if (isSupabaseEnabled()) {
    const sb = getSupabaseAuth()
    const { data, error } = await sb.auth.getUser(token)
    if (error || !data?.user) return null
    const email = data.user.email || ''
    return email.replace('@englishclub.local', '') || email
  }
  return verifyLocalToken(token)
}

export function verifyToken(token) {
  if (isSupabaseEnabled()) return null // async path wajib dipakai
  return verifyLocalToken(token)
}

// Guard admin terpusat (dipakai semua router admin; logika identik di
// satu tempat agar tidak drift). Menerima Bearer maupun x-admin-token.
export async function requireAdmin(req, res, next) {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.header('x-admin-token')
  const username = await verifyTokenAsync(token)
  if (username) {
    req.admin = { username }
    return next()
  }
  return res.status(401).json({ detail: 'Unauthorized' })
}

// Verifikasi token untuk jalur brankas. Kembalikan username bila SALAH SATU
// terpenuhi: JWT admin valid, atau JWT member yang terdaftar SUPERADMIN.
// Selain itu kembalikan null. Tidak pernah melempar.
export async function verifyAdminOrSuperMemberToken(token) {
  if (!token) return null
  try {
    if (isSupabaseEnabled()) {
      const { data, error } = await getSupabaseAuth().auth.getUser(token)
      if (!error && data?.user) {
        const email = data.user.email || ''
        if (email.endsWith('@members.englishclub.local')) {
          const username = email.split('@')[0] || ''
          try {
            const list = await listAllowed()
            const hit = list.find((a) => String(a.username || '').toLowerCase() === username.toLowerCase())
            if (hit && hit.role !== 'operator') return username
          } catch {
            return null
          }
          return null
        }
      }
    }
    const adminUser = await verifyTokenAsync(token)
    // Hasil verify yang masih mengandung '@' bukan username admin yang sah
    // (mis. email member lolos strip domain) — tolak di jalur kredensial.
    if (adminUser && !String(adminUser).includes('@')) return adminUser
    return null
  } catch {
    return null
  }
}

// Guard brankas: lolos bila SALAH SATU terpenuhi —
// (a) JWT admin valid (jalur kredensial /ec-admin-2026), atau
// (b) JWT member valid yang username-nya terdaftar sebagai SUPERADMIN.
// Token member biasa / operator / tak dikenal → 401. Tanpa bocorkan daftar.
export async function requireAdminOrSuperMember(req, res, next) {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.header('x-admin-token')
  const username = await verifyAdminOrSuperMemberToken(token)
  if (username) {
    req.admin = { username }
    return next()
  }
  return res.status(401).json({ detail: 'Unauthorized' })
}

export async function revokeToken(token) {
  if (isSupabaseEnabled()) {
    // JWT stateless: tidak bisa revoke tanpa blocklist; signOut best-effort.
    try {
      const sb = getSupabase()
      await sb.auth.admin.signOut(token)
    } catch {}
    return
  }
  tokens.delete(token)
}

export async function ensureSeed() {
  if (isSupabaseEnabled()) {
    console.log('Auth: Supabase Auth aktif (seed via Dashboard > Users)')
    return
  }
  const arr = loadAdmins()
  if (arr.length === 0) {
    const hash = await bcrypt.hash('ec2026onlyblue', 10)
    arr.push({ username: 'admin', password_hash: hash, created_at: new Date().toISOString() })
    saveAdmins(arr)
    console.log('Seeded admin lokal: admin / ec2026onlyblue')
  }
}

export async function createAdmin(username, password) {
  if (isSupabaseEnabled()) throw new Error('Buat admin via Supabase Dashboard > Authentication > Users')
  const hash = await bcrypt.hash(password, 10)
  const arr = loadAdmins()
  if (arr.find(a => a.username === username)) throw new Error('Username sudah ada')
  arr.push({ username, password_hash: hash, created_at: new Date().toISOString() })
  saveAdmins(arr)
  return { username }
}

export async function getAdminAsync(username) {
  if (isSupabaseEnabled()) return { username }
  return loadAdmins().find(a => a.username === username) || null
}

export function getAdmin(username) {
  return loadAdmins().find(a => a.username === username) || null
}

export function listAdmins() {
  return loadAdmins().map(a => ({ username: a.username, created_at: a.created_at }))
}

// Dipakai route login fallback lokal
export async function issueLocalToken(username) {
  const token = randomBytes(24).toString('base64url')
  tokens.set(token, { username, exp: Date.now() + TTL })
  return token
}
