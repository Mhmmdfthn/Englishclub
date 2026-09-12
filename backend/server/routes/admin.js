import { Router } from 'express'
import { verifyToken, verifyTokenAsync, verifyPassword, issueToken, revokeToken } from '../utils/auth.js'
import { isDbEnabled } from '../utils/pg.js'
import { auditAdmin, auditTechThrottled } from '../utils/audit.js'

const r = Router()

// lama: token verify (tetap dukung untuk kompatibel)
r.post('/verify', async (req, res) => {
  try {
    const token = req.body?.token
    let username = null
    if (isDbEnabled()) username = await verifyTokenAsync(token)
    else username = verifyToken(token)
    if (username) return res.json({ ok: true, username })
    const expected = process.env.ADMIN_TOKEN
    if (expected && token === expected) return res.json({ ok: true, username: 'admin' })
    if (!expected) return res.status(500).json({ detail: 'ADMIN_TOKEN belum dikonfigurasi' })
    return res.status(401).json({ detail: 'Token salah' })
  } catch (e) {
    console.error('Admin verify error:', e)
    res.status(500).json({ detail: 'Gagal memverifikasi token' })
  }
})

// baru: login akun
r.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) return res.status(422).json({ detail: 'username & password required' })
    const ok = await verifyPassword(username.trim(), password)
    if (!ok) {
      auditTechThrottled('login-gagal', 60000, 'POST /api/admin/login', 401, `Login gagal: ${username.trim().slice(0, 30)}`)
      return res.status(401).json({ detail: 'Username atau password salah' })
    }
    const token = await issueToken(username.trim())
    auditAdmin('Login admin', username.trim(), {})
    res.json({ ok: true, token, username: username.trim() })
  } catch (e) {
    console.error('Admin login error:', e)
    res.status(500).json({ detail: 'Gagal memproses login' })
  }
})

r.post('/logout', async (req, res) => {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.body.token
  if (token) await revokeToken(token)
  auditAdmin('Logout admin', 'admin', {})
  res.json({ ok: true })
})

r.get('/me', async (req, res) => {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.header('x-admin-token')
  let username = null
  if (isDbEnabled()) username = await verifyTokenAsync(token)
  else username = verifyToken(token)
  if (!username) {
    const expected = process.env.ADMIN_TOKEN
    if (expected && token === expected) return res.json({ username: 'admin' })
    return res.status(401).json({ detail: 'Unauthorized' })
  }
  res.json({ username })
})

export default r
