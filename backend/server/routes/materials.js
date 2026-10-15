import { Router } from 'express'
import { getAll, getById, addMaterial, updateMaterial, deleteMaterial } from '../utils/materialStore.js'
import { requireCanDisplay, verifyDisplayToken, verifyTokenAsync } from '../utils/auth.js'
import { getSupabaseAuth, isSupabaseEnabled } from '../utils/supabase.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()

// Materi khusus anggota login (tab Materi ada di dashboard member).
// Terima JWT member maupun admin; tanpa token → 401.
async function requireMemberLogin(req, res, next) {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ detail: 'Unauthorized' })
  try {
    if (isSupabaseEnabled()) {
      const { data, error } = await getSupabaseAuth().auth.getUser(token)
      if (error || !data?.user) return res.status(401).json({ detail: 'Unauthorized' })
      req.viewer = { email: data.user.email || '' }
      return next()
    }
    const username = await verifyTokenAsync(token)
    if (!username) return res.status(401).json({ detail: 'Unauthorized' })
    req.viewer = { username }
    return next()
  } catch {
    return res.status(401).json({ detail: 'Unauthorized' })
  }
}

function actorName(req) {
  return req.admin?.username || req.viewer?.email || req.viewer?.username || 'anggota'
}

r.get('/', requireMemberLogin, async (req, res) => {
  try {
    res.json({ materials: await getAll() })
  } catch (e) {
    console.error('Materials GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.get('/:id', requireMemberLogin, async (req, res) => {
  try {
    const m = await getById(req.params.id)
    if (!m) return res.status(404).json({ detail: 'Materi tidak ditemukan' })
    res.json({ material: m })
  } catch (e) {
    console.error('Materials GET id error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// Tulis: SO ke atas (guard yang sama dengan Display QR).
r.post('/', requireCanDisplay, async (req, res) => {
  try {
    const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
    const who = (await verifyDisplayToken(token)) || actorName(req)
    const m = await addMaterial(req.body || {}, who)
    await auditAdmin('Materi ditambah', who, { id: m.id, judul: m.title })
    res.status(201).json({ ok: true, material: m })
  } catch (e) {
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('Canva') || e.message?.includes('valid')) {
      return res.status(422).json({ detail: e.message })
    }
    if (e.message?.includes('Tabel materials belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Materials POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.put('/:id', requireCanDisplay, async (req, res) => {
  try {
    const m = await updateMaterial(req.params.id, req.body || {})
    await auditAdmin('Materi diubah', actorName(req), { id: m.id, judul: m.title })
    res.json({ ok: true, material: m })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('wajib') || e.message?.includes('karakter') || e.message?.includes('Canva') || e.message?.includes('valid') || e.message?.includes('Tidak ada data')) {
      return res.status(422).json({ detail: e.message })
    }
    if (e.message?.includes('Tabel materials belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Materials PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.delete('/:id', requireCanDisplay, async (req, res) => {
  try {
    await deleteMaterial(req.params.id)
    await auditAdmin('Materi dihapus', actorName(req), { id: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    if (e.message?.includes('tidak ditemukan')) return res.status(404).json({ detail: e.message })
    if (e.message?.includes('Tabel materials belum dibuat')) return res.status(503).json({ detail: e.message })
    console.error('Materials DELETE error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
