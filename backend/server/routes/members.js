import { Router } from 'express'
import { addMember, allMembers, highlight, csvFilePath } from '../utils/membersStore.js'
import { verifyToken, verifyTokenAsync } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'

const r = Router()
const ALLOWED = new Set(['Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'])

async function requireAdmin(req, res, next) {
  const bearer = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
  const legacy = req.header('x-admin-token')
  const token = bearer || legacy
  let username = null
  if (isDbEnabled()) username = await verifyTokenAsync(token)
  else username = verifyToken(token)
  if (username) { req.admin = { username }; return next() }
  const expected = process.env.ADMIN_TOKEN
  if (expected && token === expected) { req.admin = { username: 'admin' }; return next() }
  if (!expected) return res.status(500).json({ detail: 'ADMIN_TOKEN belum dikonfigurasi di server' })
  return res.status(401).json({ detail: 'Unauthorized' })
}

// public highlight
r.get('/highlight', async (req, res) => {
  const hl = await highlight(30)
  const total = (await allMembers(1000)).length
  res.json({ highlight: hl, total })
})

// admin list
r.get('/', requireAdmin, async (req, res) => {
  res.json({ members: await allMembers(100) })
})

// public post
r.post('/', async (req, res) => {
  let { nama, no_hp, jurusan } = req.body
  if (!nama || typeof nama !== 'string' || nama.trim().length < 2 || nama.trim().length > 40) return res.status(422).json({ detail: 'nama 2-40' })
  if (!no_hp || typeof no_hp !== 'string') return res.status(422).json({ detail: 'no_hp required' })
  const hp = no_hp.trim().replace(/\s|-/g,'')
  if (!/^08[0-9]{8,11}$/.test(hp)) return res.status(422).json({ detail: 'No HP harus format 08xxxxxxxxxx (10-13 digit)' })
  if (!jurusan || !ALLOWED.has(jurusan)) return res.status(422).json({ detail: 'Jurusan harus salah satu: ' + [...ALLOWED].join(', ') })
  try {
    const row = await addMember(nama.trim(), hp, jurusan.trim())
    res.json({ ok: true, member: row })
  } catch (e) {
    res.status(400).json({ detail: String(e.message || e) })
  }
})

// admin export
r.get('/export', requireAdmin, (req, res) => {
  const path = csvFilePath()
  res.download(path, 'pendaftaran_ec.csv')
})

export default r
