import { Router } from 'express'
import { isKvEnabled } from '../utils/cloudStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()
const DEFAULT_ITEMS = ['Stiker', 'Permen', 'Gantungan Kunci', 'Pin']
const DEFAULT_SEGMENT_COUNT = 8

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

async function getSpinnerConfig() {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    const raw = await kv.get('config:spinner_items')
    if (Array.isArray(raw)) return { items: raw, segmentCount: DEFAULT_SEGMENT_COUNT }
    if (raw && typeof raw === 'object' && Array.isArray(raw.items)) {
      return { items: raw.items, segmentCount: raw.segmentCount || DEFAULT_SEGMENT_COUNT }
    }
    return { items: DEFAULT_ITEMS, segmentCount: DEFAULT_SEGMENT_COUNT }
  }
  return { items: DEFAULT_ITEMS, segmentCount: DEFAULT_SEGMENT_COUNT }
}

async function saveSpinnerConfig(items, segmentCount) {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    await kv.set('config:spinner_items', { items, segmentCount })
  }
}

r.get('/', async (req, res) => {
  try {
    const config = await getSpinnerConfig()
    res.json(config)
  } catch (e) {
    console.error('Spinner GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.put('/', requireAdmin, async (req, res) => {
  try {
    const { items, segmentCount } = req.body
    if (!Array.isArray(items) || items.length < 2) return res.status(422).json({ detail: 'items harus array minimal 2 item' })
    const cleaned = items.filter(i => typeof i === 'string' && i.trim()).map(i => i.trim().slice(0, 40))
    if (cleaned.length < 2) return res.status(422).json({ detail: 'items minimal 2 item tidak kosong' })
    const sc = Math.max(cleaned.length, Math.min(Number(segmentCount) || cleaned.length * 2, 16))
    await saveSpinnerConfig(cleaned, sc)
    await auditAdmin('Spinner config diubah', req.admin?.username || 'admin', { items: cleaned.length, segmentCount: sc })
    res.json({ ok: true, items: cleaned, segmentCount: sc })
  } catch (e) {
    console.error('Spinner PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
