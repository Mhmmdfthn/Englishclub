import { Router } from 'express'
import multer from 'multer'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { getAll, getById, addProker, deleteProker, updateProker, addPhotos, removePhoto } from '../utils/prokerStore.js'
import { requireAdminOrSuperMember as requireAdmin } from '../utils/auth.js'
import { auditAdmin, auditTech, auditTechThrottled } from '../utils/audit.js'
import { getSupabase, isSupabaseEnabled, uploadToProkerBucket, removeFromProkerBucket, storagePathFromUrl } from '../utils/supabase.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
let uploadsDir = join(__dirname, '../data/uploads')
try {
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
} catch {
  uploadsDir = join('/tmp', 'uploads')
  try { if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true }) } catch {}
}

const useSupabaseStorage = () => isSupabaseEnabled()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Hanya file gambar'))
    cb(null, true)
  }
})

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Hanya file gambar'))
    cb(null, true)
  }
})

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i

async function validateExternalImage(url) {
  const raw = String(url || '').trim()
  if (!raw) throw new Error('URL gambar wajib diisi')
  if (raw.length > 2048) throw new Error('URL gambar terlalu panjang')
  let parsed
  try { parsed = new URL(raw) } catch { throw new Error('URL gambar tidak valid') }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('URL gambar wajib direct link http/https')
  if (!IMAGE_EXT_RE.test(parsed.pathname)) {
    throw new Error('URL harus berakhiran .jpg/.jpeg/.png/.gif/.webp (Direct Image Link)')
  }
  let res
  try {
    res = await fetch(raw, { method: 'HEAD', redirect: 'follow' })
  } catch {
    throw new Error('URL gambar tidak dapat diakses')
  }
  if (!res.ok) throw new Error(`URL gambar tidak dapat diakses (status ${res.status})`)
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (!ct.startsWith('image/')) throw new Error('URL bukan gambar langsung (Content-Type bukan image)')
  return raw
}

// Simpan satu file cover; kembalikan { imageUrl, imagePublicId (path storage / '') }.
async function saveCoverFile(file, prokerId = 'cover') {
  if (useSupabaseStorage()) {
    const { url, path } = await uploadToProkerBucket(file.buffer, {
      folder: 'covers', prokerId, filename: file.originalname, mimetype: file.mimetype,
    })
    return { imageUrl: url, imagePublicId: path }
  }
  const ext = extname(file.originalname) || '.jpg'
  const fname = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  writeFileSync(join(uploadsDir, fname), file.buffer)
  return { imageUrl: `/uploads/${fname}`, imagePublicId: '' }
}

function coverPublicId(proker) {
  if (!proker) return ''
  if (proker.imagePublicId) return proker.imagePublicId
  if (proker.image_public_id) return proker.image_public_id
  return storagePathFromUrl(proker.imageUrl || proker.image_url || '') || ''
}

async function destroyCover(publicIdOrUrl) {
  if (!publicIdOrUrl) return false
  if (useSupabaseStorage()) {
    const path = publicIdOrUrl.startsWith('http')
      ? storagePathFromUrl(publicIdOrUrl)
      : publicIdOrUrl
    if (path) return removeFromProkerBucket([path])
    return false
  }
  return false
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
      const up = await saveCoverFile(req.file, 'cover')
      uploadedNew = up.imagePublicId
      payload.imageUrl = up.imageUrl
      payload.imagePublicId = up.imagePublicId
    } else if (typeof payload.imageUrl === 'string' && payload.imageUrl.trim()) {
      payload.imageUrl = await validateExternalImage(payload.imageUrl.trim())
      payload.imagePublicId = ''
    } else {
      payload.imagePublicId = ''
    }
    const proker = await addProker(payload)
    await auditAdmin('Proker ditambah', req.admin?.username || 'admin', { id: proker.id, judul: proker.title })
    res.status(201).json({ ok: true, proker })
  } catch (e) {
    if (uploadedNew) { try { await destroyCover(uploadedNew) } catch {} }
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
    const oldCover = old.imageUrl || old.image_url || ''
    let mediaChanged = false
    let newPublicId = ''

    if (req.file) {
      const up = await saveCoverFile(req.file, req.params.id)
      uploadedNew = up.imagePublicId
      payload.imageUrl = up.imageUrl
      newPublicId = up.imagePublicId
      mediaChanged = true
    } else if (typeof payload.imageUrl === 'string') {
      const url = payload.imageUrl.trim()
      if (url === '') {
        if (oldCover) { payload.imageUrl = ''; mediaChanged = true }
        else delete payload.imageUrl
      } else if (url !== oldCover) {
        payload.imageUrl = await validateExternalImage(url)
        mediaChanged = true
        newPublicId = ''
      } else {
        delete payload.imageUrl
      }
    }

    const oldPublicId = coverPublicId(old)
    if (mediaChanged && oldPublicId) {
      const destroyed = await destroyCover(oldPublicId)
      if (useSupabaseStorage() && oldPublicId && !destroyed) {
        if (uploadedNew) { try { await destroyCover(uploadedNew) } catch {} }
        return res.status(500).json({ detail: 'Gagal menghapus gambar lama' })
      }
    }

    if (!mediaChanged) delete payload.imagePublicId
    if (mediaChanged) {
      payload.imageUrl = payload.imageUrl ?? ''
      payload.imagePublicId = newPublicId
    }

    const p = await updateProker(req.params.id, payload)
    await auditAdmin('Proker diubah', req.admin?.username || 'admin', { id: p.id, judul: p.title })
    res.json({ ok: true, proker: p })
  } catch (e) {
    if (uploadedNew) { try { await destroyCover(uploadedNew) } catch {} }
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
    const oldPublicId = coverPublicId(old)
    if (oldPublicId) {
      await destroyCover(oldPublicId)
    }
    // Hapus gallery storage yang masih nyangkut (best-effort)
    const galleryPaths = (old?.photos || []).map(u => storagePathFromUrl(u)).filter(Boolean)
    if (galleryPaths.length && useSupabaseStorage()) {
      await removeFromProkerBucket(galleryPaths)
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
  const uploadedPaths = []
  const uploadedFiles = []
  try {
    const files = req.files || []
    let urls
    if (files.length) {
      if (useSupabaseStorage()) {
        urls = []
        for (const f of files) {
          // eslint-disable-next-line no-await-in-loop
          const { url, path } = await uploadToProkerBucket(f.buffer, {
            folder: 'gallery', prokerId: req.params.id, filename: f.originalname, mimetype: f.mimetype,
          })
          uploadedPaths.push(path)
          urls.push(url)
        }
      } else {
        for (const f of files) {
          const ext = extname(f.originalname) || '.jpg'
          const fname = `${req.params.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`
          writeFileSync(join(uploadsDir, fname), f.buffer)
          uploadedFiles.push(fname)
        }
        urls = uploadedFiles.map(fname => `/uploads/${fname}`)
      }
    } else {
      const u = String(req.body?.url || '').trim()
      if (!u) return res.status(422).json({ detail: 'Pilih file atau isi URL gambar' })
      urls = [await validateExternalImage(u)]
    }
    const p = await addPhotos(req.params.id, urls)
    await auditAdmin('Foto proker ditambah', req.admin?.username || 'admin', { id: p.id, jumlah: urls.length })
    res.json({ ok: true, proker: p })
  } catch (e) {
    for (const filename of uploadedFiles) { try { unlinkSync(join(uploadsDir, filename)) } catch {} }
    if (uploadedPaths.length) { try { await removeFromProkerBucket(uploadedPaths) } catch {} }
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
      const spath = storagePathFromUrl(url)
      if (spath && useSupabaseStorage()) {
        await removeFromProkerBucket([spath])
      } else if (/^https?:\/\//i.test(url)) {
        // URL eksternal lama: cukup lepas dari array
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
