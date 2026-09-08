import { Router } from 'express'
import multer from 'multer'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { getAll, getById, updateCaption, updateProker, addPhotos, removePhoto } from '../utils/prokerStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const uploadsDir = isVercel ? join('/tmp', 'uploads') : join(__dirname, '../data/uploads')
try {
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
} catch (e) {
  console.warn('uploads mkdir failed (Vercel read-only, using /tmp):', e.message)
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
  res.json({ proker: await getAll() })
})

r.get('/:id', async (req, res) => {
  const p = await getById(req.params.id)
  if (!p) return res.status(404).json({ detail: 'Proker tidak ditemukan' })
  res.json({ proker: p })
})

// admin — bisa ganti judul dan/atau caption
r.put('/:id', requireAdmin, async (req, res) => {
  const { title, caption } = req.body
  if (title === undefined && caption === undefined) return res.status(422).json({ detail: 'title atau caption wajib' })
  try {
    const p = await updateProker(req.params.id, { title, caption })
    res.json({ ok: true, proker: p })
  } catch (e) {
    res.status(e.message.includes('tidak ditemukan') ? 404 : 422).json({ detail: e.message })
  }
})

r.post('/:id/photos', requireAdmin, upload.array('photos', 3), async (req, res) => {
  try {
    const urls = (req.files || []).map(f => `/uploads/${f.filename}`)
    const p = await addPhotos(req.params.id, urls)
    res.json({ ok: true, proker: p })
  } catch (e) {
    for (const f of (req.files || [])) { try { unlinkSync(join(uploadsDir, f.filename)) } catch {} }
    res.status(e.message.includes('Maksimal') ? 400 : 404).json({ detail: e.message })
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
    res.status(404).json({ detail: e.message })
  }
})

export default r
