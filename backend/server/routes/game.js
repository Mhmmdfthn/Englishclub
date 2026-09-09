import { Router } from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { create_session, get_session, submit_word, BASE_TIME } from '../utils/gameStore.js'

const r = Router()
const __dirname = dirname(fileURLToPath(import.meta.url))

r.post('/', (req, res) => {
  const session = create_session()
  res.json({ session_id: session.id, grid: session.grid, time_limit: BASE_TIME })
})

r.get('/dictionary', (req, res) => {
  res.type('text/plain')
  const validWords = readFileSync(join(__dirname, '../data/valid_words.txt'), 'utf8')
  const seedWords = readFileSync(join(__dirname, '../data/words.txt'), 'utf8')
  res.send(`${validWords}\n${seedWords}`)
})

r.post('/:session_id/word', (req, res) => {
  const session = get_session(req.params.session_id)
  if (!session) return res.status(404).json({ detail: 'Sesi tidak ditemukan' })
  const path = req.body.path
  if (!Array.isArray(path)) return res.status(422).json({ detail: 'path required' })
  const result = submit_word(session, path)
  res.json(result)
})

export default r
