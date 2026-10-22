import { getSupabase, isSupabaseEnabled } from './supabase.js'

let memoryMaterials = []

function isMissingTable(err) {
  return err?.code === 'PGRST205' || String(err?.message || '').includes('schema cache')
}

function missingTableError() {
  return new Error('Tabel materials belum dibuat — jalankan backend/supabase-materi-schema.sql di Supabase SQL Editor')
}

function slug(title) {
  return (
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'materi'
  )
}

function normalize(item) {
  return {
    id: String(item.id || ''),
    title: item.title || 'Materi',
    canva_url: item.canva_url || item.canvaUrl || '',
    created_by: item.created_by || item.createdBy || '',
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
  }
}

function sortList(rows) {
  // Urutan tampil: pertemuan terlama di atas, terbaru di bawah.
  return [...rows].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
}

// Terima URL share Canva atau potongan <iframe> dari menu Embed Canva.
// Kembalikan URL embed yang dinormalisasi, atau throw bila bukan Canva.
export function normalizeCanvaUrl(input) {
  let raw = String(input || '').trim()
  if (!raw) throw new Error('Link Canva wajib diisi')
  // Boleh paste seluruh snippet <iframe ... src="..."> — ambil src-nya.
  const srcMatch = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  if (srcMatch) raw = srcMatch[1].trim()
  // Buang atribut/quotes nyasar bila paste tidak rapi.
  raw = raw.replace(/^["'<>\s]+|["'<>\s]+$/g, '')
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Link Canva tidak valid. Pakai link Bagikan > Sematkan dari Canva.')
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'www.canva.com') {
    throw new Error('Hanya link Canva (www.canva.com) yang didukung')
  }
  if (!url.pathname.startsWith('/design/')) {
    throw new Error('Link harus dari desain Canva (Bagikan > Sematkan > salin link/embed)')
  }
  // Bentuk embed: pastikan query ?embed agar mode presentasi tersemat.
  // Bersihkan param pelacak bila ada.
  url.searchParams.delete('utm_source')
  url.searchParams.delete('utm_medium')
  url.searchParams.delete('utm_campaign')
  let out = url.toString().replace(/[?&]embed=$/, '').replace(/[?&]embed=&/, (m) => (m[0] === '?' ? '?' : '&'))
  if (!/[?&]embed([=&]|$)/.test(out)) out += (out.includes('?') ? '&' : '?') + 'embed'
  return out
}

export function validateMaterial({ title, canva_url, canvaUrl }, required = false) {
  const link = canva_url ?? canvaUrl
  if (required && (title === undefined || typeof title !== 'string' || !title.trim())) {
    throw new Error('Judul wajib diisi')
  }
  if (required && (link === undefined || (typeof link === 'string' && !link.trim()))) {
    throw new Error('Link Canva wajib diisi')
  }
  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80)) {
    throw new Error('Judul 3-80 karakter')
  }
  if (link !== undefined) normalizeCanvaUrl(link)
}

export async function getAll() {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('materials').select('*').order('created_at', { ascending: true })
    if (error && isMissingTable(error)) {
      console.warn('Materials: tabel belum ada. Jalankan backend/supabase-materi-schema.sql')
      return []
    }
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return sortList((data || []).map(normalize))
  }
  return sortList(memoryMaterials.map(normalize))
}

export async function getById(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('materials').select('*').eq('id', id).maybeSingle()
    if (error && isMissingTable(error)) return null
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return data ? normalize(data) : null
  }
  return memoryMaterials.map(normalize).find((m) => m.id === id) || null
}

export async function addMaterial(data, createdBy = '') {
  validateMaterial(data, true)
  const now = new Date().toISOString()
  const row = normalize({
    id: `${slug(data.title)}-${Date.now().toString(36)}`,
    title: data.title.trim(),
    canva_url: normalizeCanvaUrl(data.canva_url ?? data.canvaUrl),
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  })
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { error } = await sb.from('materials').insert({
      id: row.id,
      title: row.title,
      canva_url: row.canva_url,
      created_by: row.created_by,
    })
    if (error && isMissingTable(error)) throw missingTableError()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return row
  }
  memoryMaterials.push(row)
  return row
}

export async function updateMaterial(id, data) {
  validateMaterial(data)
  if (data.title === undefined && (data.canva_url === undefined && data.canvaUrl === undefined)) {
    throw new Error('Tidak ada data untuk diubah')
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const patch = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) patch.title = data.title.trim()
    const link = data.canva_url ?? data.canvaUrl
    if (link !== undefined) patch.canva_url = normalizeCanvaUrl(link)
    const { data: updated, error } = await sb.from('materials').update(patch).eq('id', id).select('*').maybeSingle()
    if (error && isMissingTable(error)) throw missingTableError()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    if (!updated) throw new Error('Materi tidak ditemukan')
    return normalize(updated)
  }
  const i = memoryMaterials.findIndex((m) => m.id === id)
  if (i === -1) throw new Error('Materi tidak ditemukan')
  if (data.title !== undefined) memoryMaterials[i].title = data.title.trim()
  const link = data.canva_url ?? data.canvaUrl
  if (link !== undefined) memoryMaterials[i].canva_url = normalizeCanvaUrl(link)
  memoryMaterials[i].updated_at = new Date().toISOString()
  memoryMaterials[i] = normalize(memoryMaterials[i])
  return memoryMaterials[i]
}

export async function deleteMaterial(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur, error: readErr } = await sb.from('materials').select('*').eq('id', id).maybeSingle()
    if (readErr && isMissingTable(readErr)) throw missingTableError()
    if (readErr) throw new Error('Database sibuk, silakan coba lagi')
    if (!cur) throw new Error('Materi tidak ditemukan')
    const { error } = await sb.from('materials').delete().eq('id', id)
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return normalize(cur)
  }
  const idx = memoryMaterials.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error('Materi tidak ditemukan')
  const [removed] = memoryMaterials.splice(idx, 1)
  return normalize(removed)
}
