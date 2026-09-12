import { Router } from 'express'
import { db } from '../utils/db.js'
import { auditAdmin, auditTech } from '../utils/audit.js'

const r = Router()
const MAX_SCORE = 650000
const MAX_WORDS = 120

r.get('/', async (req, res) => {
  try {
    res.json({ entries: await db.top(10) })
  } catch (e) {
    console.error('Leaderboard GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/', async (req, res) => {
  const { name, score, words } = req.body
  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 20) return res.status(422).json({ detail: 'name 1-20' })
  if (typeof score !== 'number' || score < 0) return res.status(422).json({ detail: 'score >=0' })
  if (typeof words !== 'number' || words < 0) return res.status(422).json({ detail: 'words >=0' })
  if (score > MAX_SCORE || words > MAX_WORDS) return res.status(400).json({ detail: 'score di luar batas permainan' })
  try {
    const rank = await db.addScore(name.trim(), score, words)
    auditAdmin('Skor baru', name.trim(), { score, words, rank })
    res.json({ rank })
  } catch (e) {
    console.error('Leaderboard POST error:', e)
    auditTech('POST /api/leaderboard', 503, e.message)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
