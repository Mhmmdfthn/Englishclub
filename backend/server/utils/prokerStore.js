import { getSupabase, isSupabaseEnabled } from './supabase.js'

const DEFAULT = [
  { id: 'english-fun-day', title: 'English Fun Day', description: 'Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.', imageUrl: '', date: '', status: 'upcoming', order: 1 },
  { id: 'speaking-corner', title: 'Speaking Corner', description: 'Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.', imageUrl: '', date: '', status: 'upcoming', order: 2 },
  { id: 'debate-clinic', title: 'Debate Clinic', description: 'Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.', imageUrl: '', date: '', status: 'upcoming', order: 3 },
  { id: 'toefl-prep', title: 'TOEFL Prep', description: 'Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.', imageUrl: '', date: '', status: 'upcoming', order: 4 },
]

const STATUSES = new Set(['upcoming', 'ongoing', 'completed'])
let memoryProker = [...DEFAULT]

function normalize(item, index = 0) {
  const photos = Array.isArray(item.photos) ? item.photos : []
  const imageUrl = item.imageUrl ?? item.image_url ?? photos[0] ?? ''
  return {
    id: item.id,
    title: item.title || 'Proker',
    description: item.description ?? item.caption ?? '',
    imageUrl,
    image_url: imageUrl,
    imagePublicId: item.imagePublicId ?? item.image_public_id ?? '',
    image_public_id: item.imagePublicId ?? item.image_public_id ?? '',
    date: item.date || '',
    status: STATUSES.has(item.status) ? item.status : 'upcoming',
    order: item.order ?? index + 1,
    photos,
  }
}

function toDbRow(p) {
  const photos = Array.isArray(p.photos) ? p.photos : []
  const imageUrl = p.imageUrl ?? p.image_url ?? photos[0] ?? ''
  return {
    id: p.id,
    title: (p.title || '').trim(),
    description: (p.description ?? p.caption ?? '').trim(),
    image_url: imageUrl || '',
    image_public_id: p.imagePublicId ?? p.image_public_id ?? '',
    photos,
    date: p.date || null,
    status: STATUSES.has(p.status) ? p.status : 'upcoming',
    order: p.order ?? 1,
  }
}

function fromDbRow(r, index = 0) {
  if (!r) return null
  return normalize({
    id: r.id,
    title: r.title,
    description: r.description ?? r.caption ?? '',
    imageUrl: r.image_url ?? r.imageUrl ?? (r.photos?.[0] ?? ''),
    imagePublicId: r.image_public_id ?? r.imagePublicId ?? '',
    date: r.date ?? '',
    status: r.status ?? 'upcoming',
    order: r.order ?? index + 1,
    photos: r.photos || [],
  }, index)
}

export async function getAll() {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('proker').select('*').order('order', { ascending: true })
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    if (!data || !data.length) return DEFAULT.map(normalize)
    return data.map(fromDbRow).sort((a, b) => a.order - b.order)
  }
  return memoryProker.map(normalize).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getById(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data, error } = await sb.from('proker').select('*').eq('id', id).single()
    if (error) return null
    return fromDbRow(data)
  }
  return memoryProker.map(normalize).find(p => p.id === id) || null
}

function validateData({ title, description, imageUrl, date, status }, required = false) {
  if (required && (title === undefined || typeof title !== 'string' || !title.trim())) throw new Error('Judul wajib diisi')
  if (required && (description === undefined || typeof description !== 'string' || !description.trim())) throw new Error('Deskripsi wajib diisi')
  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80)) throw new Error('Judul 3-80 karakter')
  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 5 || description.trim().length > 1000)) throw new Error('Deskripsi 5-1000 karakter')
  if (imageUrl !== undefined && typeof imageUrl !== 'string') throw new Error('URL gambar tidak valid')
  if (date !== undefined && date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tanggal harus format YYYY-MM-DD')
  if (status !== undefined && !STATUSES.has(status)) throw new Error('Status tidak valid')
}

export async function saveProkers(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    const error = new Error('Payload tidak valid')
    error.code = 'INVALID_PROKER_PAYLOAD'
    throw error
  }
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const rows = data.map((p, i) => toDbRow(normalize(p, i)))
    const { error } = await sb.from('proker').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return data
  }
  memoryProker = data
  return data
}

export async function addProker(data) {
  validateData(data, true)
  const rows = await getAll()
  const id = `${data.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
  const row = normalize({ ...data, id, order: rows.length + 1 })
  rows.push(row)
  await saveProkers(rows)
  return row
}

export async function deleteProker(id) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur } = await sb.from('proker').select('*').eq('id', id).single()
    if (!cur) throw new Error('Proker tidak ditemukan')
    const removed = fromDbRow(cur)
    const { error } = await sb.from('proker').delete().eq('id', id)
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return removed
  }
  const rows = await getAll()
  const next = rows.filter(p => p.id !== id)
  if (next.length === rows.length) throw new Error('Proker tidak ditemukan')
  const removed = rows.find(p => p.id === id)
  next.forEach((p, i) => { p.order = i + 1 })
  await saveProkers(next)
  return removed
}

export async function updateProker(id, data) {
  const { caption, title, ...rest } = data
  if (title !== undefined) rest.title = title
  if (caption !== undefined && rest.description === undefined) rest.description = caption
  validateData(rest)
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const patch = {}
    if (rest.title !== undefined) {
      if (rest.title.trim().length < 3 || rest.title.trim().length > 80) throw new Error('Judul 3-80 karakter')
      patch.title = rest.title.trim()
    }
    if (rest.description !== undefined) patch.description = rest.description.trim()
    if (rest.imageUrl !== undefined) patch.image_url = rest.imageUrl
    if (rest.imagePublicId !== undefined) patch.image_public_id = rest.imagePublicId || ''
    if (rest.date !== undefined) patch.date = rest.date || null
    if (rest.status !== undefined) patch.status = rest.status
    if (rest.photos !== undefined) patch.photos = rest.photos
    if (!Object.keys(patch).length) throw new Error('title atau caption wajib')
    patch.updated_at = new Date().toISOString()
    const { data: updated, error } = await sb.from('proker').update(patch).eq('id', id).select('*').single()
    if (error || !updated) throw new Error('Proker tidak ditemukan')
    return fromDbRow(updated)
  }
  const i = memoryProker.findIndex(p => p.id === id)
  if (i === -1) throw new Error('Proker tidak ditemukan')
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 40) throw new Error('Judul 3-40 karakter')
    memoryProker[i].title = title.trim()
  }
  if (caption !== undefined) {
    if (typeof caption !== 'string' || caption.trim().length < 5 || caption.length > 280) throw new Error('Caption 5-280 karakter')
    memoryProker[i].caption = caption.trim()
  }
  if (rest.description !== undefined) memoryProker[i].description = rest.description.trim()
  if (rest.imageUrl !== undefined) memoryProker[i].imageUrl = rest.imageUrl.trim()
  if (rest.imagePublicId !== undefined) memoryProker[i].imagePublicId = rest.imagePublicId || ''
  if (rest.date !== undefined) memoryProker[i].date = rest.date
  if (rest.status !== undefined) memoryProker[i].status = rest.status
  memoryProker[i] = normalize(memoryProker[i])
  memoryProker[i].updatedAt = new Date().toISOString()
  return memoryProker[i]
}

export function updateCaption(id, caption) {
  return updateProker(id, { caption })
}

export async function addPhotos(id, urls) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur, error: readErr } = await sb.from('proker').select('*').eq('id', id).single()
    if (readErr || !cur) throw new Error('Proker tidak ditemukan')
    const curPhotos = cur.photos || []
    if (curPhotos.length + urls.length > 3) throw new Error('Maksimal 3 foto per proker')
    const newPhotos = [...curPhotos, ...urls]
    const { data, error } = await sb.from('proker').update({ photos: newPhotos, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return fromDbRow(data)
  }
  const idx = memoryProker.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Proker tidak ditemukan')
  const cur = memoryProker[idx].photos || []
  if (cur.length + urls.length > 3) throw new Error('Maksimal 3 foto per proker')
  memoryProker[idx].photos = [...cur, ...urls]
  memoryProker[idx].updatedAt = new Date().toISOString()
  return memoryProker[idx]
}

export async function removePhoto(id, photoIdx) {
  if (isSupabaseEnabled()) {
    const sb = getSupabase()
    const { data: cur, error: readErr } = await sb.from('proker').select('*').eq('id', id).single()
    if (readErr || !cur) throw new Error('Proker tidak ditemukan')
    const photos = [...(cur.photos || [])]
    if (photoIdx < 0 || photoIdx >= photos.length) throw new Error('Foto tidak ditemukan')
    photos.splice(photoIdx, 1)
    const { data, error } = await sb.from('proker').update({ photos, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) throw new Error('Database sibuk, silakan coba lagi')
    return fromDbRow(data)
  }
  const idx = memoryProker.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Proker tidak ditemukan')
  const photos = memoryProker[idx].photos || []
  if (photoIdx < 0 || photoIdx >= photos.length) throw new Error('Foto tidak ditemukan')
  photos.splice(photoIdx, 1)
  memoryProker[idx].photos = photos
  memoryProker[idx].updatedAt = new Date().toISOString()
  return memoryProker[idx]
}
