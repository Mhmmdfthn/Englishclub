import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isDbEnabled, getDb } from './pg.js'
import { cloudGetProker, cloudSaveProker, isKvEnabled } from './cloudStore.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const origDataDir = join(__dirname, '../data')
const dataDir = isVercel ? join('/tmp', 'data') : origDataDir
const prokerPath = join(dataDir, 'proker.json')
const origProkerPath = join(origDataDir, 'proker.json')

const DEFAULT = [
  { id: 'english-fun-day', title: 'English Fun Day', description: 'Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.', imageUrl: '', date: '', status: 'upcoming', order: 1 },
  { id: 'speaking-corner', title: 'Speaking Corner', description: 'Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.', imageUrl: '', date: '', status: 'upcoming', order: 2 },
  { id: 'debate-clinic', title: 'Debate Clinic', description: 'Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.', imageUrl: '', date: '', status: 'upcoming', order: 3 },
  { id: 'toefl-prep', title: 'TOEFL Prep', description: 'Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.', imageUrl: '', date: '', status: 'upcoming', order: 4 },
]

const STATUSES = new Set(['upcoming', 'ongoing', 'completed'])

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

function ensure() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  } catch {}
  if (!existsSync(prokerPath)) {
    try {
      if (isVercel && existsSync(origProkerPath)) {
        writeFileSync(prokerPath, readFileSync(origProkerPath, 'utf-8'), 'utf-8')
        return
      }
    } catch {}
    try { writeFileSync(prokerPath, JSON.stringify(DEFAULT, null, 2), 'utf-8') } catch {}
  }
}

function load() {
  ensure()
  try { return JSON.parse(readFileSync(prokerPath, 'utf-8')) } catch { return [...DEFAULT] }
}

function save(arr) {
  ensure()
  writeFileSync(prokerPath, JSON.stringify(arr, null, 2), 'utf-8')
}

export async function getAll() {
  if (isKvEnabled()) {
    const rows = await cloudGetProker()
    if (!rows.length) {
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
  return load().map(normalize).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getById(id) {
  if (isKvEnabled()) return (await getAll()).find(p => p.id === id) || null
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT id, title, caption, photos, "order", updated_at FROM proker WHERE id=$1', [id])
    return rows[0] || null
  }
  return load().map(normalize).find(p => p.id === id) || null
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

export async function addProker(data) {
  validateData(data, true)
  const rows = await getAll()
  const id = `${data.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
  const row = normalize({ ...data, id, order: rows.length + 1 })
  rows.push(row)
  if (isKvEnabled()) await cloudSaveProker(rows)
  else { save(rows); }
  return row
}

export async function deleteProker(id) {
  const rows = await getAll()
  const next = rows.filter(p => p.id !== id)
  if (next.length === rows.length) throw new Error('Proker tidak ditemukan')
  next.forEach((p, i) => { p.order = i + 1 })
  if (isKvEnabled()) await cloudSaveProker(next)
  else save(next)
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
    await cloudSaveProker(rows)
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
  const arr = load()
  const i = arr.findIndex(p => p.id === id)
  if (i === -1) throw new Error('Proker tidak ditemukan')
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 40) throw new Error('Judul 3-40 karakter')
    arr[i].title = title.trim()
  }
  if (caption !== undefined) {
    if (typeof caption !== 'string' || caption.trim().length < 5 || caption.length > 280) throw new Error('Caption 5-280 karakter')
    arr[i].caption = caption.trim()
  }
  if (rest.description !== undefined) arr[i].description = rest.description.trim()
  if (rest.imageUrl !== undefined) arr[i].imageUrl = rest.imageUrl.trim()
  if (rest.date !== undefined) arr[i].date = rest.date
  if (rest.status !== undefined) arr[i].status = rest.status
  arr[i] = normalize(arr[i])
  arr[i].updatedAt = new Date().toISOString()
  save(arr)
  return arr[i]
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
  const arr = load()
  const idx = arr.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Proker tidak ditemukan')
  const cur = arr[idx].photos || []
  if (cur.length + urls.length > 3) throw new Error('Maksimal 3 foto per proker')
  arr[idx].photos = [...cur, ...urls]
  arr[idx].updatedAt = new Date().toISOString()
  save(arr)
  return arr[idx]
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
  const arr = load()
  const idx = arr.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Proker tidak ditemukan')
  const photos = arr[idx].photos || []
  if (photoIdx < 0 || photoIdx >= photos.length) throw new Error('Foto tidak ditemukan')
  photos.splice(photoIdx, 1)
  arr[idx].photos = photos
  arr[idx].updatedAt = new Date().toISOString()
  save(arr)
  return arr[idx]
}
