import { Router } from 'express'
import multer from 'multer'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { getAll, getById, addProker, deleteProker, updateProker, addPhotos, removePhoto } from '../utils/prokerStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  __dirname.includes('task') ||
  __dirname.startsWith('/var')
)
let uploadsDir = isServerless ? join('/tmp', 'uploads') : join(__dirname, '../data/uploads')
try {
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
} catch (e) {
  uploadsDir = join('/tmp', 'uploads')
  try {
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
  } catch (err) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg'
    cb(null, `${req.params.id}-${Date.now()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Hanya file gambar'))
    cb(null, true)
  }
})

async function requireAdmin(req, res, next) {
  const bearer = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
  const legacy = req.header('x-admin-token')
  const token = bearer || legacy || req.body.token
  let username = null
  if (isDbEnabled()) username = await verifyTokenAsync(token)
  else username = verifyToken(token)
  if (username) { req.admin = { username }; return next() }
  const expected = process.env.ADMIN_TOKEN
  if (expected && token === expected) { req.admin = { username: 'admin' }; return next() }
  return res.status(401).json({ detail: 'Unauthorized' })
}

const r = Router()

// public
r.get('/', async (req, res) => {
  try {
    res.json({ proker: await getAll() })
  } catch (e) {
    console.error('Proker GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.get('/:id', async (req, res) => {
  try {
    const p = await getById(req.params.id)
    if (!p) return res.status(404).json({ detail: 'Proker tidak ditemukan' })
    res.json({ proker: p })
  } catch (e) {
    console.error('Proker GET id error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/', requireAdmin, async (req, res) => {
  try {
    const proker = await addProker(req.body)
    res.status(201).json({ ok: true, proker })
  } catch (e) {
    if (e.code === 'INVALID_PROKER_PAYLOAD') return res.status(400).json({ error: 'Payload tidak valid' })
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('valid')) {
      return res.status(422).json({ detail: e.message })
    }
    console.error('Proker POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// admin — bisa ganti judul dan/atau caption
r.put('/:id', requireAdmin, async (req, res) => {
  if (!Object.keys(req.body).length) return res.status(422).json({ detail: 'data proker wajib' })
  try {
    const p = await updateProker(req.params.id, req.body)
    res.json({ ok: true, proker: p })
  } catch (e) {
    if (e.code === 'INVALID_PROKER_PAYLOAD') return res.status(400).json({ error: 'Payload tidak valid' })
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('valid')) {
      return res.status(422).json({ detail: e.message })
    }
    console.error('Proker PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteProker(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    console.error('Proker DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/:id/photos', requireAdmin, upload.array('photos', 3), async (req, res) => {
  try {
    const urls = (req.files || []).map(f => `/uploads/${f.filename}`)
    const p = await addPhotos(req.params.id, urls)
    res.json({ ok: true, proker: p })
  } catch (e) {
    for (const f of (req.files || [])) { try { unlinkSync(join(uploadsDir, f.filename)) } catch {} }
    if (e.code === 'INVALID_PROKER_PAYLOAD') return res.status(400).json({ error: 'Payload tidak valid' })
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('Maksimal')) return res.status(400).json({ detail: e.message })
    console.error('Proker photos POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.delete('/:id/photos/:idx', requireAdmin, async (req, res) => {
  const idx = parseInt(req.params.idx, 10)
  try {
    const before = await getById(req.params.id)
    const url = before?.photos?.[idx]
    const p = await removePhoto(req.params.id, idx)
    if (url) {
      const fname = url.split('/').pop()
      try { unlinkSync(join(uploadsDir, fname)) } catch {}
    }
    res.json({ ok: true, proker: p })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    console.error('Proker photo DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
