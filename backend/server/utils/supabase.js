// Supabase primary store (PRD DB SUPABASE): Postgres + Auth + Storage via PostgREST.
// Backend-only: memakai SERVICE_ROLE_KEY (bypass RLS). Frontend tidak query langsung.
// Jika env belum diset (project belum dibuat), isSupabaseEnabled() = false dan
// store memakai fallback memory agar dev lokal tetap jalan sebelum cut-over.
import { createClient } from '@supabase/supabase-js'

let client = null
let authClient = null

export function isSupabaseEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getSupabase() {
  if (!isSupabaseEnabled()) return null
  if (client) return client
  client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  return client
}

// Client KHUSUS Auth (anon key, TANPA service_role). WAJIB dipakai untuk
// signIn/getUser: memanggil auth di client service_role akan menempelkan
// session JWT user ke client tersebut sehingga query PostgREST berikutnya
// berjalan sebagai role `authenticated` (bukan service_role) dan RLS
// mengembalikan 0 baris tanpa error.
export function getSupabaseAuth() {
  if (!isSupabaseEnabled()) return null
  if (authClient) return authClient
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  authClient = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false },
  })
  return authClient
}

export function requireSupabase() {
  const sb = getSupabase()
  if (!sb) {
    const err = new Error('Database sibuk, silakan coba lagi')
    err.code = 'SUPABASE_DISABLED'
    err.status = 503
    throw err
  }
  return sb
}

export const PROKER_BUCKET = 'Proker-photos'

function extOf(name = '', mime = '') {
  const m = String(name).match(/\.([a-z0-9]+)$/i)
  if (m) return `.${m[1].toLowerCase()}`
  if (mime.includes('png')) return '.png'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('gif')) return '.gif'
  return '.jpg'
}

export async function uploadToProkerBucket(buffer, { folder = 'gallery', prokerId = 'misc', filename = '', mimetype = 'image/jpeg' } = {}) {
  const sb = requireSupabase()
  const ext = extOf(filename, mimetype)
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${folder}/${prokerId}-${Date.now()}-${rand}${ext}`
  const { error } = await sb.storage.from(PROKER_BUCKET).upload(path, buffer, {
    contentType: mimetype,
    upsert: false,
  })
  if (error) throw new Error(`Gagal upload foto: ${error.message}`)
  const { data } = sb.storage.from(PROKER_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function removeFromProkerBucket(paths = []) {
  const sb = getSupabase()
  if (!sb || !paths.length) return false
  const { error } = await sb.storage.from(PROKER_BUCKET).remove(paths)
  if (error) {
    console.error('Supabase storage remove gagal:', error.message)
    return false
  }
  return true
}

// image_public_id kini menyimpan path storage; dukung juga URL lama
// (Cloudinary / /uploads) agar foto lama tetap dirender tanpa merusak request.
export function storagePathFromUrl(url) {
  try {
    const u = String(url || '')
    const marker = `${PROKER_BUCKET}/`
    const i = u.indexOf(marker)
    if (i === -1) return null
    return decodeURIComponent(u.slice(i + marker.length).split('?')[0])
  } catch {
    return null
  }
}

export async function supabaseHealth() {
  const sb = getSupabase()
  if (!sb) return { enabled: false }
  // Select nyata (bukan head-count) agar tabel hilang ikut terdeteksi (PGRST205).
  const { error, status } = await sb.from('proker').select('id').limit(1)
  if (error || status < 200 || status >= 300) {
    return { enabled: true, ok: false, error: error?.message || `status ${status}` }
  }
  return { enabled: true, ok: true }
}
