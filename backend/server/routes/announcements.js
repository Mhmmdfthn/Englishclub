import { Router } from 'express'
import { getAll, getById, addAnnouncement, updateAnnouncement, deleteAnnouncement } from '../utils/announcementStore.js'
import { requireAdminOrSuperMember as requireAdmin } from '../utils/auth.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()

// publik — dibaca dashboard member tanpa login
r.get('/', async (req, res) => {
  try {
    res.json({ announcements: await getAll() })
  } catch (e) {
    console.error('Announcements GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.get('/:id', async (req, res) => {
  try {
    const a = await getById(req.params.id)
    if (!a) return res.status(404).json({ detail: 'Pengumuman tidak ditemukan' })
    res.json({ announcement: a })
  } catch (e) {
    console.error('Announcements GET id error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/', requireAdmin, async (req, res) => {
  try {
    const a = await addAnnouncement(req.body || {})
    await auditAdmin('Pengumuman ditambah', req.admin?.username || 'admin', { id: a.id, judul: a.title })
    res.status(201).json({ ok: true, announcement: a })
  } catch (e) {
    if (e.message?.includes('wajib') || e.message?.includes('karakter')) {
      return res.status(422).json({ detail: e.message })
    }
    if (e.message?.includes('Tabel announcements belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Announcements POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.put('/:id', requireAdmin, async (req, res) => {
  try {
    const a = await updateAnnouncement(req.params.id, req.body || {})
    await auditAdmin('Pengumuman diubah', req.admin?.username || 'admin', { id: a.id, judul: a.title })
    res.json({ ok: true, announcement: a })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('Tidak ada data')) {
      return res.status(422).json({ detail: e.message })
    }
    if (e.message?.includes('Tabel announcements belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Announcements PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteAnnouncement(req.params.id)
    await auditAdmin('Pengumuman dihapus', req.admin?.username || 'admin', { id: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('Tabel announcements belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Announcements DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
