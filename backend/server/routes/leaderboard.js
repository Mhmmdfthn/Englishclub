import { Router } from 'express'
import { db } from '../utils/db.js'

const r = Router()
const MAX_SCORE = 650000
const MAX_WORDS = 120

r.get('/', async (req, res) => {
  res.json({ entries: await db.top(10) })
})

r.post('/', async (req, res) => {
  const { name, score, words } = req.body
  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 20) return res.status(422).json({ detail: 'name 1-20' })
  if (typeof score !== 'number' || score < 0) return res.status(422).json({ detail: 'score >=0' })
  if (typeof words !== 'number' || words < 0) return res.status(422).json({ detail: 'words >=0' })
  if (score > MAX_SCORE || words > MAX_WORDS) return res.status(400).json({ detail: 'score di luar batas permainan' })
  const rank = await db.addScore(name.trim(), score, words)
  res.json({ rank })
})

export default r
