import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const origDataDir = join(__dirname, '../data')
const dataDir = isVercel ? join('/tmp', 'data') : origDataDir
const prokerPath = join(dataDir, 'proker.json')
const origProkerPath = join(origDataDir, 'proker.json')

const DEFAULT = [
  { id: 'english-fun-day', title: 'English Fun Day', caption: 'Word Hunt dan vocabulary battle untuk melatih kemampuan bahasa Inggris dengan cara yang menyenangkan dan interaktif.', photos: [], order: 1 },
  { id: 'speaking-corner', title: 'Speaking Corner', caption: 'Ruang praktik daily conversation yang santai dan mendukung untuk meningkatkan confidence dalam berbicara.', photos: [], order: 2 },
  { id: 'debate-clinic', title: 'Debate Clinic', caption: 'Program pembinaan debate dan public speaking untuk mengasah kemampuan argumentasi dan presentasi.', photos: [], order: 3 },
  { id: 'toefl-prep', title: 'TOEFL Prep', caption: 'Persiapan ujian TOEFL dengan strategi dan tips dari mentor berpengalaman untuk hasil maksimal.', photos: [], order: 4 },
]

function ensure() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  } catch {}
  if (!existsSync(prokerPath)) {
    // copy from orig if exists (Vercel)
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

export function getAll() {
  return load().sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function getById(id) {
  return load().find(p => p.id === id) || null
}

export function updateProker(id, { title, caption }) {
  const arr = load()
  const idx = arr.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Proker tidak ditemukan')
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 40) throw new Error('Judul 3-40 karakter')
    arr[idx].title = title.trim()
  }
  if (caption !== undefined) {
    if (typeof caption !== 'string' || caption.trim().length < 5 || caption.length > 280) throw new Error('Caption 5-280 karakter')
    arr[idx].caption = caption.trim()
  }
  arr[idx].updatedAt = new Date().toISOString()
  save(arr)
  return arr[idx]
}

export function updateCaption(id, caption) {
  return updateProker(id, { caption })
}

export function addPhotos(id, urls) {
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

export function removePhoto(id, photoIdx) {
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
