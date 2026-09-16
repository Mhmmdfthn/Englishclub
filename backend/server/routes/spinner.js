import { Router } from 'express'
import { isKvEnabled } from '../utils/cloudStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()
const DEFAULT_PRIZES = [
  { name: 'Stiker', count: 4 },
  { name: 'Permen', count: 3 },
  { name: 'Gantungan Kunci', count: 1 },
  { name: 'Pin', count: 2 },
]

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

async function getSpinnerPrizes() {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    const raw = await kv.get('config:spinner_prizes')
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(p => ({
        name: String(p.name || '').trim().slice(0, 40),
        count: Math.max(1, Math.min(Number(p.count) || 1, 20)),
      }))
    }
    const legacyItems = await kv.get('config:spinner_items')
    if (legacyItems && typeof legacyItems === 'object' && !Array.isArray(legacyItems) && Array.isArray(legacyItems.items)) {
      return legacyItems.items.map(name => ({ name: String(name).trim().slice(0, 40), count: 1 }))
    }
    if (Array.isArray(legacyItems)) {
      return legacyItems.map(name => ({ name: String(name).trim().slice(0, 40), count: 1 }))
    }
    return DEFAULT_PRIZES
  }
  return DEFAULT_PRIZES
}

async function saveSpinnerPrizes(prizes) {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    await kv.set('config:spinner_prizes', prizes)
  }
}

r.get('/', async (req, res) => {
  try {
    const prizes = await getSpinnerPrizes()
    res.json({ prizes })
  } catch (e) {
    console.error('Spinner GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.put('/', requireAdmin, async (req, res) => {
  try {
    const { prizes } = req.body
    if (!Array.isArray(prizes) || prizes.length < 2) return res.status(422).json({ detail: 'prizes harus array minimal 2 item' })
    const cleaned = prizes
      .filter(p => p && typeof p.name === 'string' && p.name.trim())
      .map(p => ({
        name: p.name.trim().slice(0, 40),
        count: Math.max(1, Math.min(Number(p.count) || 1, 20)),
      }))
    if (cleaned.length < 2) return res.status(422).json({ detail: 'Minimal 2 hadiah dengan nama tidak kosong' })
    const totalSegments = cleaned.reduce((sum, p) => sum + p.count, 0)
    await saveSpinnerPrizes(cleaned)
    await auditAdmin('Spinner prizes diubah', req.admin?.username || 'admin', { prizes: cleaned.length, totalSegments })
    res.json({ ok: true, prizes: cleaned, totalSegments })
  } catch (e) {
    console.error('Spinner PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
