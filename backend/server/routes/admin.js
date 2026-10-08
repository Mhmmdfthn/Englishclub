import { Router } from 'express'
import { verifyTokenAsync, verifyPassword, revokeToken, loginWithPassword, issueLocalToken } from '../utils/auth.js'
import { isSupabaseEnabled } from '../utils/supabase.js'
import { auditAdmin, auditTechThrottled } from '../utils/audit.js'

const r = Router()

r.post('/verify', async (req, res) => {
  try {
    const token = req.body?.token
    const username = await verifyTokenAsync(token)
    if (username) return res.json({ ok: true, username })
    return res.status(401).json({ detail: 'Token salah' })
  } catch (e) {
    console.error('Admin verify error:', e)
    res.status(500).json({ detail: 'Gagal memverifikasi token' })
  }
})

r.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) return res.status(422).json({ detail: 'username & password required' })
    if (isSupabaseEnabled()) {
      const sess = await loginWithPassword(username.trim(), password)
      if (!sess) {
        await auditTechThrottled('login-gagal', 60000, 'POST /api/admin/login', 401, `Login gagal: ${username.trim().slice(0, 30)}`)
        return res.status(401).json({ detail: 'Username atau password salah' })
      }
      await auditAdmin('Login admin', sess.username, {})
      return res.json({ ok: true, token: sess.token, username: sess.username })
    }
    const ok = await verifyPassword(username.trim(), password)
    if (!ok) {
      await auditTechThrottled('login-gagal', 60000, 'POST /api/admin/login', 401, `Login gagal: ${username.trim().slice(0, 30)}`)
      return res.status(401).json({ detail: 'Username atau password salah' })
    }
    const token = await issueLocalToken(username.trim())
    await auditAdmin('Login admin', username.trim(), {})
    res.json({ ok: true, token, username: username.trim() })
  } catch (e) {
    console.error('Admin login error:', e)
    res.status(500).json({ detail: 'Gagal memproses login' })
  }
})

r.post('/logout', async (req, res) => {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.body?.token
  if (token) await revokeToken(token)
  await auditAdmin('Logout admin', 'admin', {})
  res.json({ ok: true })
})

r.get('/me', async (req, res) => {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.header('x-admin-token')
  const username = await verifyTokenAsync(token)
  if (!username) return res.status(401).json({ detail: 'Unauthorized' })
  res.json({ username })
})

export default r
