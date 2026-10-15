import { getSupabase, isSupabaseEnabled } from './supabase.js'

const DEFAULT = [
  {
    id: 'selamat-datang-ec',
    title: 'Selamat datang di English Club UPB',
    body: 'Pantau pengumuman ini untuk info absensi, materi, dan agenda terbaru. Praktik rutin bikin progres.',
    pinned: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let memoryAnnouncements = [...DEFAULT]

function isMissingTable(err) {
  return err?.code === 'PGRST205' || String(err?.message || '').includes('schema cache')
}

function missingTableError() {
  return new Error('Tabel announcements belum dibuat — jalankan backend/supabase-schema.sql di Supabase SQL Editor')
}

function slug(title) {
  return (
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'pengumuman'
  )
}

function normalize(item) {
  return {
    id: String(item.id || ''),
    title: item.title || 'Pengumuman',
    body: item.body ?? '',
    pinned: Boolean(item.pinned),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
  }
}

function toDbRow(a) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: Boolean(a.pinned),
    updated_at: new Date().toISOString(),
  }
}

function fromDbRow(r) {
  if (!r) return null
  return normalize({
    id: r.id,
    title: r.title,
    body: r.body ?? '',
    pinned: r.pinned,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })
}

function sortList(rows) {
  return [...rows].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

export function validateAnnouncement({ title, body }, required = false) {
  if (required && (title === undefined || typeof title !== 'string' || !title.trim())) throw new Error('Judul wajib diisi')
  if (required && (body === undefined || typeof body !== 'string' || !body.trim())) throw new Error('Isi pengumuman wajib diisi')
  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80)) throw new Error('Judul 3-80 karakter')
  if (body !== undefined && (typeof body !== 'string' || body.trim().length < 5 || body.trim().length > 500)) throw new Error('Isi 5-500 karakter')
}

export async function getAll() {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })
    // Tabel belum dimigrasi di Supabase live: dashboard tetap jalan dengan seed default.
    if (error && isMissingTable(error)) {
      console.warn('Announcements: tabel belum ada, pakai seed default. Jalankan backend/supabase-schema.sql')
      return DEFAULT.map(normalize)
    }
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    if (!data || !data.length) return DEFAULT.map(normalize)
    return sortList(data.map(fromDbRow))
  }
  return sortList(memoryAnnouncements.map(normalize))
}

export async function getById(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('announcements').select('*').eq('id', id).single()
    if (error && isMissingTable(error)) {
      return DEFAULT.map(normalize).find((a) => a.id === id) || null
    }
    if (data) return fromDbRow(data)
    return DEFAULT.map(normalize).find((a) => a.id === id) || null
  }
  return memoryAnnouncements.map(normalize).find((a) => a.id === id) || null
}

async function persist(rows) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { error } = await sb.from('announcements').upsert(rows.map(toDbRow), { onConflict: 'id' })
    if (error && isMissingTable(error)) throw missingTableError()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return rows
  }
  memoryAnnouncements = rows
  return rows
}

export async function addAnnouncement(data) {
  validateAnnouncement(data, true)
  const rows = await getAll()
  const now = new Date().toISOString()
  const row = normalize({
    ...data,
    id: `${slug(data.title)}-${Date.now().toString(36)}`,
    title: data.title.trim(),
    body: data.body.trim(),
    pinned: Boolean(data.pinned),
    created_at: now,
    updated_at: now,
  })
  rows.push(row)
  await persist(sortList(rows))
  return row
}

export async function updateAnnouncement(id, data) {
  validateAnnouncement(data)
  if (data.title === undefined && data.body === undefined && data.pinned === undefined) {
    throw new Error('Tidak ada data untuk diubah')
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const patch = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) patch.title = data.title.trim()
    if (data.body !== undefined) patch.body = data.body.trim()
    if (data.pinned !== undefined) patch.pinned = Boolean(data.pinned)
    const { data: updated, error } = await sb.from('announcements').update(patch).eq('id', id).select('*').single()
    if (error && isMissingTable(error)) throw missingTableError()
    if (error || !updated) throw new Error('Pengumuman tidak ditemukan')
    return fromDbRow(updated)
  }
  const i = memoryAnnouncements.findIndex((a) => a.id === id)
  if (i === -1) throw new Error('Pengumuman tidak ditemukan')
  if (data.title !== undefined) memoryAnnouncements[i].title = data.title.trim()
  if (data.body !== undefined) memoryAnnouncements[i].body = data.body.trim()
  if (data.pinned !== undefined) memoryAnnouncements[i].pinned = Boolean(data.pinned)
  memoryAnnouncements[i].updated_at = new Date().toISOString()
  memoryAnnouncements[i] = normalize(memoryAnnouncements[i])
  return memoryAnnouncements[i]
}

export async function deleteAnnouncement(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur, error: readErr } = await sb.from('announcements').select('*').eq('id', id).single()
    if (readErr && isMissingTable(readErr)) throw missingTableError()
    if (!cur) throw new Error('Pengumuman tidak ditemukan')
    const removed = fromDbRow(cur)
    const { error } = await sb.from('announcements').delete().eq('id', id)
    if (error && isMissingTable(error)) throw missingTableError()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return removed
  }
  const rows = await getAll()
  const next = rows.filter((a) => a.id !== id)
  if (next.length === rows.length) throw new Error('Pengumuman tidak ditemukan')
  const removed = rows.find((a) => a.id === id)
  await persist(next)
  return removed
}
