import { Router } from 'express'
import multer from 'multer'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { getAll, getById, addProker, deleteProker, updateProker, addPhotos, removePhoto } from '../utils/prokerStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'
import { auditAdmin, auditTech, auditTechThrottled } from '../utils/audit.js'
import { isCloudinaryEnabled, uploadBuffer, destroyByUrl, destroyPublicId, extractPublicId, validateExternalImage } from '../utils/cloudinary.js'

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

// Cloudinary aktif -> file ditampung di memori lalu diupload permanen.
// Nonaktif -> perilaku lama (disk lokal; ephemeral di serverless Vercel).
const useCloudinary = isCloudinaryEnabled()
const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const ext = extname(file.originalname) || '.jpg'
        cb(null, `${req.params.id}-${Date.now()}${ext}`)
      },
    })
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Hanya file gambar'))
    cb(null, true)
  }
})

// Cover image selalu ditampung in-memory (dipakai create & edit), lalu
// di-upload ke Cloudinary atau ditulis ke disk bila Cloudinary nonaktif.
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Hanya file gambar'))
    cb(null, true)
  }
})

// Simpan satu file cover; kembalikan { imageUrl, imagePublicId }.
async function saveCoverFile(file) {
  if (useCloudinary) {
    const { url, publicId } = await uploadBuffer(file.buffer, file.originalname)
    return { imageUrl: url, imagePublicId: publicId }
  }
  const ext = extname(file.originalname) || '.jpg'
  const fname = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  writeFileSync(join(uploadsDir, fname), file.buffer)
  return { imageUrl: `/uploads/${fname}`, imagePublicId: '' }
}

// public_id asal yang layak di-destroy KETIKA media diganti/dihapus.
function coverPublicId(proker) {
  if (!proker) return ''
  return proker.imagePublicId || extractPublicId(proker.imageUrl || '')
}

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

r.post('/', requireAdmin, coverUpload.single('image'), async (req, res) => {
  let uploadedNew = null
  try {
    const payload = { ...(req.body || {}) }
    if (req.file) {
      const up = await saveCoverFile(req.file)
      uploadedNew = up.imagePublicId
      payload.imageUrl = up.imageUrl
      payload.imagePublicId = up.imagePublicId
    } else if (typeof payload.imageUrl === 'string' && payload.imageUrl.trim()) {
      payload.imageUrl = await validateExternalImage(payload.imageUrl.trim())
      payload.imagePublicId = ''
    } else {
      payload.imagePublicId = '' // client tidak boleh mengatur sendiri
    }
    const proker = await addProker(payload)
    await auditAdmin('Proker ditambah', req.admin?.username || 'admin', { id: proker.id, judul: proker.title })
    res.status(201).json({ ok: true, proker })
  } catch (e) {
    if (uploadedNew) { try { await destroyPublicId(uploadedNew) } catch {} }
    if (e.code === 'INVALID_PROKER_PAYLOAD') {
      await auditTechThrottled('proker-payload', 60000, 'POST /api/proker', 400, e.message)
      return res.status(400).json({ error: 'Payload tidak valid' })
    }
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('valid') ||
        e.message?.includes('URL') || e.message?.includes('gambar') || e.message?.includes('Gagal')) {
      return res.status(422).json({ detail: e.message })
    }
    console.error('Proker POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// admin — bisa ganti judul, caption, dan/atau gambar cover (file atau URL eksternal)
r.put('/:id', requireAdmin, coverUpload.single('image'), async (req, res) => {
  const body = req.body || {}
  if (!Object.keys(body).length && !req.file) return res.status(422).json({ detail: 'data proker wajib' })
  let uploadedNew = null
  try {
    const old = await getById(req.params.id)
    if (!old) return res.status(404).json({ detail: 'Proker tidak ditemukan' })
    const payload = { ...body }
    const oldCover = old.imageUrl || ''
    let mediaChanged = false
    let newPublicId = ''

    if (req.file) {
      // 1) file baru -> upload dulu, tandai media berubah
      const up = await saveCoverFile(req.file)
      uploadedNew = up.imagePublicId
      payload.imageUrl = up.imageUrl
      newPublicId = up.imagePublicId
      mediaChanged = true
    } else if (typeof payload.imageUrl === 'string') {
      const url = payload.imageUrl.trim()
      if (url === '') {
        // 2) hapus cover, hanya jika saat ini ada gambar
        if (oldCover) { payload.imageUrl = ''; mediaChanged = true }
        else delete payload.imageUrl
      } else if (url !== oldCover) {
        // 3) cover diganti -> validasi URL eksternal dahulu
        payload.imageUrl = await validateExternalImage(url)
        mediaChanged = true
        newPublicId = ''
      } else {
        delete payload.imageUrl // tidak berubah -> biarkan yang lama
      }
    }

    // destroy gambar lama SEBELUM simpan; gagal -> batalkan seluruh proses (abort, HTTP 500)
    const oldPublicId = coverPublicId(old)
    if (mediaChanged && oldPublicId && isCloudinaryEnabled()) {
      const destroyed = await destroyPublicId(oldPublicId)
      if (!destroyed) {
        if (uploadedNew) { try { await destroyPublicId(uploadedNew) } catch {} }
        return res.status(500).json({ detail: 'Gagal menghapus gambar lama' })
      }
    }

    if (!mediaChanged) delete payload.imagePublicId // client tidak boleh mengatur sendiri
    if (mediaChanged) {
      payload.imageUrl = payload.imageUrl ?? ''
      payload.imagePublicId = newPublicId
    }

    const p = await updateProker(req.params.id, payload)
    await auditAdmin('Proker diubah', req.admin?.username || 'admin', { id: p.id, judul: p.title })
    res.json({ ok: true, proker: p })
  } catch (e) {
    if (uploadedNew) { try { await destroyPublicId(uploadedNew) } catch {} }
    if (e.code === 'INVALID_PROKER_PAYLOAD') return res.status(400).json({ error: 'Payload tidak valid' })
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('valid') ||
        e.message?.includes('URL') || e.message?.includes('gambar')) {
      return res.status(422).json({ detail: e.message })
    }
    console.error('Proker PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const old = await getById(req.params.id)
    await deleteProker(req.params.id)
    // hapus gambar cover Cloudinary (best-effort; record sudah terhapus)
    const oldPublicId = coverPublicId(old)
    if (oldPublicId && isCloudinaryEnabled()) {
      await destroyPublicId(oldPublicId)
    }
    await auditAdmin('Proker dihapus', req.admin?.username || 'admin', { id: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    console.error('Proker DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/:id/photos', requireAdmin, upload.array('photos', 3), async (req, res) => {
  const uploadedCloud = []
  const uploadedFiles = []
  try {
    const files = req.files || []
    let urls
    if (files.length) {
      if (useCloudinary) {
        urls = []
        for (const f of files) {
          // eslint-disable-next-line no-await-in-loop
          const { url, publicId } = await uploadBuffer(f.buffer, f.originalname)
          uploadedCloud.push(publicId)
          urls.push(url)
        }
      } else {
        uploadedFiles.push(...files.map(f => f.filename))
        urls = files.map(f => `/uploads/${f.filename}`)
      }
    } else {
      // foto lewat URL eksternal (direct image link) — divalidasi dulu
      const u = String(req.body?.url || '').trim()
      if (!u) return res.status(422).json({ detail: 'Pilih file atau isi URL gambar' })
      urls = [await validateExternalImage(u)]
    }
    const p = await addPhotos(req.params.id, urls)
    await auditAdmin('Foto proker ditambah', req.admin?.username || 'admin', { id: p.id, jumlah: urls.length })
    res.json({ ok: true, proker: p })
  } catch (e) {
    // best-effort rollback: hapus file/upload yang sudah terlanjur masuk
    for (const filename of uploadedFiles) { try { unlinkSync(join(uploadsDir, filename)) } catch {} }
    for (const publicId of uploadedCloud) { try { await destroyPublicId(publicId) } catch {} }
    for (const f of (req.files || [])) { try { if (f.filename) unlinkSync(join(uploadsDir, f.filename)) } catch {} }
    if (e.code === 'INVALID_PROKER_PAYLOAD') return res.status(400).json({ error: 'Payload tidak valid' })
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('Maksimal')) return res.status(400).json({ detail: e.message })
    if (e.message?.includes('URL') || e.message?.includes('gambar') || e.message?.includes('Pilih file')) {
      return res.status(422).json({ detail: e.message })
    }
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
    await auditAdmin('Foto proker dihapus', req.admin?.username || 'admin', { id: p.id, index: idx })
    if (url) {
      if (/^https?:\/\//i.test(url)) {
        await destroyByUrl(url) // permanen di Cloudinary; gagal pun cukup lepas dari array
      } else {
        const fname = url.split('/').pop()
        try { unlinkSync(join(uploadsDir, fname)) } catch {}
      }
    }
    res.json({ ok: true, proker: p })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    console.error('Proker photo DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
