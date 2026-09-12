import { Router } from 'express'
import { addMember, allMembers, highlight } from '../utils/membersStore.js'
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
    res.status(row.queued ? 202 : 200).json({ ok: true, queued: row.queued, member: row })
  } catch (e) {
    if (e.message && e.message.startsWith('Jurusan tidak valid')) {
      return res.status(422).json({ detail: e.message })
    }
    console.error('Members POST error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// sync endpoint for Google Apps Script
r.get('/sync', async (req, res) => {
  const syncToken = req.header('x-sync-token') || (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
  const expected = process.env.SYNC_TOKEN || process.env.ADMIN_TOKEN
  if (!expected || syncToken !== expected) {
    return res.status(401).json({ detail: 'Unauthorized. Invalid or missing x-sync-token.' })
  }
  const rows = await allMembers(10000)
  res.json({ ok: true, count: rows.length, members: rows })
})

// admin export — generate CSV from the configured member source
r.get('/export', requireAdmin, async (req, res) => {
  const rows = await allMembers(10000)
  const header = 'timestamp,nama,no_hp,jurusan\n'
  const csv = header + rows.map(row => `${row.timestamp},${row.nama},${row.no_hp},${row.jurusan}`).join('\n')
  res.header('Content-Type', 'text/csv')
  res.attachment('pendaftaran_ec.csv')
  res.send(csv)
})

export default r
