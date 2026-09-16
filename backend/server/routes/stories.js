import { Router } from 'express'
import { db } from '../utils/db.js'
import { auditAdmin, auditTech } from '../utils/audit.js'

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
  const b = (batch || 'Pengunjung Stand').toString().slice(0, 30)
  try {
    const story = await db.addStory(name.trim(), b.trim() || 'Pengunjung Stand', comment.trim())
    await auditAdmin('Story baru', name.trim(), { batch: story.batch })
    res.json({ story })
  } catch (e) {
    console.error('Stories POST error:', e)
    await auditTech('POST /api/stories', 503, e.message)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

r.patch('/:id/prize', async (req, res) => {
  try {
    const { prize_won } = req.body
    if (!prize_won || typeof prize_won !== 'string') return res.status(422).json({ detail: 'prize_won wajib diisi' })
    const updated = await db.updateStoryPrize(req.params.id, prize_won.trim().slice(0, 40))
    if (!updated) return res.status(404).json({ detail: 'Story tidak ditemukan' })
    res.json({ ok: true, story: updated })
  } catch (e) {
    console.error('Stories PATCH error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

export default r
