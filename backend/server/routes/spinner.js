import { Router } from 'express'
import { requireAdmin } from '../utils/auth.js'
import { auditAdmin } from '../utils/audit.js'

const r = Router()
const DEFAULT_PRIZES = [
  { name: 'Stiker', count: 4 },
  { name: 'Permen', count: 3 },
  { name: 'Gantungan Kunci', count: 1 },
  { name: 'Pin', count: 2 },
]

let memoryPrizes = [...DEFAULT_PRIZES]

async function getSpinnerPrizes() {
  return memoryPrizes
}

async function saveSpinnerPrizes(prizes) {
  memoryPrizes = prizes
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
