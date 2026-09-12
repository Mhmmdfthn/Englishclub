import { Router } from 'express'
import { db } from '../utils/db.js'

const r = Router()

r.get('/', async (req, res) => {
  try {
    res.json({ stories: await db.latest(100) })
  } catch (e) {
    console.error('Stories GET error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.post('/', async (req, res) => {
  const { name, batch, comment } = req.body
  if (!name || name.trim().length < 1 || name.trim().length > 40) return res.status(422).json({ detail: 'name 1-40' })
  if (!comment || comment.trim().length < 1 || comment.trim().length > 220) return res.status(422).json({ detail: 'comment 1-220' })
  const b = (batch || 'Anggota EC UPB').toString().slice(0, 30)
  try {
    const story = await db.addStory(name.trim(), b.trim() || 'Anggota EC UPB', comment.trim())
    res.json({ story })
  } catch (e) {
    console.error('Stories POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
