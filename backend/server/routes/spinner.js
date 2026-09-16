import { Router } from 'express'
import { isKvEnabled } from '../utils/cloudStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()
const DEFAULT_ITEMS = ['Stiker', 'Permen', 'Gantungan Kunci', 'Pin']

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

async function getSpinnerItems() {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    const items = await kv.get('config:spinner_items')
    if (Array.isArray(items) && items.length > 0) return items
    return DEFAULT_ITEMS
  }
  return DEFAULT_ITEMS
}

async function saveSpinnerItems(items) {
  if (isKvEnabled()) {
    const { kv } = await import('@vercel/kv')
    await kv.set('config:spinner_items', items)
  }
}

r.get('/', async (req, res) => {
  try {
    const items = await getSpinnerItems()
    res.json({ items })
  } catch (e) {
    console.error('Spinner GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.put('/', requireAdmin, async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length < 1) return res.status(422).json({ detail: 'items harus array minimal 1 item' })
    const cleaned = items.filter(i => typeof i === 'string' && i.trim()).map(i => i.trim().slice(0, 40))
    if (cleaned.length === 0) return res.status(422).json({ detail: 'items tidak boleh kosong' })
    await saveSpinnerItems(cleaned)
    await auditAdmin('Spinner items diubah', req.admin?.username || 'admin', { jumlah: cleaned.length })
    res.json({ ok: true, items: cleaned })
  } catch (e) {
    console.error('Spinner PUT error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
