import { isDbEnabled, getDb } from './pg.js'
import { cloudGetProker, cloudSaveProker, isKvEnabled } from './cloudStore.js'

const DEFAULT = [
  { id: 'english-fun-day', title: 'English Fun Day', description: 'Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.', imageUrl: '', date: '', status: 'upcoming', order: 1 },
  { id: 'speaking-corner', title: 'Speaking Corner', description: 'Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.', imageUrl: '', date: '', status: 'upcoming', order: 2 },
  { id: 'debate-clinic', title: 'Debate Clinic', description: 'Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.', imageUrl: '', date: '', status: 'upcoming', order: 3 },
  { id: 'toefl-prep', title: 'TOEFL Prep', description: 'Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.', imageUrl: '', date: '', status: 'upcoming', order: 4 },
]

const STATUSES = new Set(['upcoming', 'ongoing', 'completed'])
let memoryProker = [...DEFAULT]

function normalize(item, index = 0) {
  return {
    id: item.id,
    title: item.title || 'Proker',
    description: item.description ?? item.caption ?? '',
    imageUrl: item.imageUrl ?? item.photos?.[0] ?? '',
    date: item.date || '',
    status: STATUSES.has(item.status) ? item.status : 'upcoming',
    order: item.order ?? index + 1,
    photos: item.photos || [],
  }
}

export async function getAll() {
  if (isKvEnabled()) {
    const rows = await cloudGetProker()
    if (!rows || !rows.length) {
      await cloudSaveProker(DEFAULT)
      return DEFAULT.map(normalize)
    }
    return rows.map(normalize).sort((a, b) => a.order - b.order)
  }
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT id, title, caption, photos, "order", updated_at FROM proker ORDER BY "order" ASC')
    return rows.map(r => ({ ...r, photos: r.photos || [] }))
  }
  return memoryProker.map(normalize).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getById(id) {
  if (isKvEnabled()) return (await getAll()).find(p => p.id === id) || null
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT id, title, caption, photos, "order", updated_at FROM proker WHERE id=$1', [id])
    return rows[0] || null
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
  if (isKvEnabled()) await cloudSaveProker(data)
  else if (!isDbEnabled()) memoryProker = data
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
  const rows = await getAll()
  const next = rows.filter(p => p.id !== id)
  if (next.length === rows.length) throw new Error('Proker tidak ditemukan')
  next.forEach((p, i) => { p.order = i + 1 })
  await saveProkers(next)
  return true
}

export async function updateProker(id, data) {
  const { caption, title, ...rest } = data
  if (title !== undefined) rest.title = title
  if (caption !== undefined && rest.description === undefined) rest.description = caption
  validateData(rest)
  if (isKvEnabled()) {
    const rows = await getAll()
    const index = rows.findIndex(p => p.id === id)
    if (index < 0) throw new Error('Proker tidak ditemukan')
    rows[index] = normalize({ ...rows[index], ...rest })
    rows[index].updatedAt = new Date().toISOString()
    await saveProkers(rows)
    return rows[index]
  }
  if (isDbEnabled()) {
    const pool = getDb()
    const fields = []
    const vals = []
    let idx = 1
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 40) throw new Error('Judul 3-40 karakter')
      fields.push(`title=$${idx++}`)
      vals.push(title.trim())
    }
    if (caption !== undefined) {
      if (typeof caption !== 'string' || caption.trim().length < 5 || caption.length > 280) throw new Error('Caption 5-280 karakter')
      fields.push(`caption=$${idx++}`)
      vals.push(caption.trim())
    }
    if (!fields.length) throw new Error('title atau caption wajib')
    fields.push(`updated_at=now()`)
    vals.push(id)
    const q = `UPDATE proker SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, title, caption, photos, "order", updated_at`
    const { rows } = await pool.query(q, vals)
    if (!rows.length) throw new Error('Proker tidak ditemukan')
    return rows[0]
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
  if (isDbEnabled()) {
    const pool = getDb()
    const cur = await getById(id)
    if (!cur) throw new Error('Proker tidak ditemukan')
    const curPhotos = cur.photos || []
    if (curPhotos.length + urls.length > 3) throw new Error('Maksimal 3 foto per proker')
    const newPhotos = [...curPhotos, ...urls]
    const { rows } = await pool.query('UPDATE proker SET photos=$1, updated_at=now() WHERE id=$2 RETURNING *', [newPhotos, id])
    return rows[0]
  }
  if (isKvEnabled()) {
    const rows = await getAll()
    const idx = rows.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Proker tidak ditemukan')
    const cur = rows[idx].photos || []
    if (cur.length + urls.length > 3) throw new Error('Maksimal 3 foto per proker')
    rows[idx].photos = [...cur, ...urls]
    rows[idx].updatedAt = new Date().toISOString()
    await saveProkers(rows)
    return rows[idx]
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
  if (isDbEnabled()) {
    const pool = getDb()
    const cur = await getById(id)
    if (!cur) throw new Error('Proker tidak ditemukan')
    const photos = cur.photos || []
    if (photoIdx < 0 || photoIdx >= photos.length) throw new Error('Foto tidak ditemukan')
    photos.splice(photoIdx, 1)
    const { rows } = await pool.query('UPDATE proker SET photos=$1, updated_at=now() WHERE id=$2 RETURNING *', [photos, id])
    return rows[0]
  }
  if (isKvEnabled()) {
    const rows = await getAll()
    const idx = rows.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Proker tidak ditemukan')
    const photos = rows[idx].photos || []
    if (photoIdx < 0 || photoIdx >= photos.length) throw new Error('Foto tidak ditemukan')
    photos.splice(photoIdx, 1)
    rows[idx].photos = photos
    rows[idx].updatedAt = new Date().toISOString()
    await saveProkers(rows)
    return rows[idx]
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
