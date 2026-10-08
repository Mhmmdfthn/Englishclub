import { Router } from 'express'
import { verifyAdminTokenAsync, verifyPassword, revokeToken, loginWithPassword, issueLocalToken } from '../utils/auth.js'
import { isSupabaseEnabled, getSupabaseAuth } from '../utils/supabase.js'
import { auditAdmin, auditTechThrottled } from '../utils/audit.js'
import { listAllowed, addAllowed, removeAllowed, isAllowed, getRole, setRole } from '../utils/adminAllowlist.js'

const r = Router()

async function requireAdmin(req, res) {
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '') || req.header('x-admin-token')
  const username = await verifyAdminTokenAsync(token)
  if (!username) {
    res.status(401).json({ detail: 'Unauthorized' })
    return null
  }
  return username
}

async function requireSuperadmin(req, res) {
  const me = await requireAdmin(req, res)
  if (!me) return null
  const r = await getRole(me).catch(() => null)
  if (!r || r.role !== 'superadmin') {
    res.status(403).json({ detail: 'Khusus superadmin' })
    return null
  }
  return me
}

r.post('/verify', async (req, res) => {
  try {
    const token = req.body?.token
    const username = await verifyAdminTokenAsync(token)
    if (!username) return res.status(401).json({ detail: 'Token salah' })
    const r = await getRole(username).catch(() => null)
    return res.json({ ok: true, username, role: r?.role || 'superadmin', menus: r?.menus || [] })
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
      if (!(await isAllowed(sess.username))) {
        await auditTechThrottled('login-ditolak', 60000, 'POST /api/admin/login', 403, `Allowlist menolak: ${sess.username.slice(0, 30)}`)
        return res.status(403).json({ detail: 'Username tidak punya hak akses admin' })
      }
      await auditAdmin('Login admin', sess.username, {})
      return res.json({ ok: true, token: sess.token, username: sess.username })
    }
    const ok = await verifyPassword(username.trim(), password)
    if (!ok) {
      await auditTechThrottled('login-gagal', 60000, 'POST /api/admin/login', 401, `Login gagal: ${username.trim().slice(0, 30)}`)
      return res.status(401).json({ detail: 'Username atau password salah' })
    }
    if (!(await isAllowed(username.trim()))) {
      await auditTechThrottled('login-ditolak', 60000, 'POST /api/admin/login', 403, `Allowlist menolak: ${username.trim().slice(0, 30)}`)
      return res.status(403).json({ detail: 'Username tidak punya hak akses admin' })
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
  const username = await verifyAdminTokenAsync(token)
  if (!username) return res.status(401).json({ detail: 'Unauthorized' })
  const r = await getRole(username).catch(() => null)
  res.json({ username, role: r?.role || 'superadmin', menus: r?.menus || [] })
})

// Cek apakah username member terdaftar di allowlist (pintu Menu Admin di
// drawer dashboard). Tidak membocorkan isi daftar: hanya status + peran milik sendiri.
r.get('/check-member', async (req, res) => {
  try {
    if (!isSupabaseEnabled()) return res.json({ isAdmin: false, role: null })
    const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ detail: 'Unauthorized' })
    const { data, error } = await getSupabaseAuth().auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ detail: 'Unauthorized' })
    const email = data.user.email || ''
    if (!email.endsWith('@members.englishclub.local')) return res.json({ isAdmin: false, role: null })
    const username = email.split('@')[0] || ''
    const list = await listAllowed()
    const hit = list.find((a) => String(a.username || '').toLowerCase() === String(username).toLowerCase())
    if (!hit) return res.json({ isAdmin: false, role: null })
    const role = hit.role === 'operator' ? 'operator' : 'superadmin'
    res.json({ isAdmin: true, role })
  } catch (e) {
    res.status(500).json({ detail: 'Gagal memeriksa hak akses' })
  }
})

// ── Allowlist hak akses login admin (by username, superadmin only) ──
r.get('/allowlist', async (req, res) => {
  const me = await requireSuperadmin(req, res)
  if (!me) return
  try {
    res.json({ allowlist: await listAllowed() })
  } catch (e) {
    res.status(e.status || 500).json({ detail: e.message || 'Gagal memuat daftar' })
  }
})

r.post('/allowlist', async (req, res) => {
  const me = await requireSuperadmin(req, res)
  if (!me) return
  try {
    const row = await addAllowed(req.body?.username, me)
    await auditAdmin('Allowlist tambah', me, { username: row.username })
    res.json({ ok: true, ...row })
  } catch (e) {
    res.status(e.status || 500).json({ detail: e.message || 'Gagal menambah' })
  }
})

r.delete('/allowlist/:username', async (req, res) => {
  const me = await requireSuperadmin(req, res)
  if (!me) return
  try {
    const row = await removeAllowed(req.params.username, me)
    await auditAdmin('Allowlist hapus', me, { username: row.username })
    res.json({ ok: true, ...row })
  } catch (e) {
    res.status(e.status || 500).json({ detail: e.message || 'Gagal menghapus' })
  }
})

r.patch('/roles/:username', async (req, res) => {
  const me = await requireSuperadmin(req, res)
  if (!me) return
  try {
    const row = await setRole(req.params.username, req.body?.role, req.body?.menus, me)
    await auditAdmin('Role admin diubah', me, { username: row.username, role: row.role, menus: row.menus })
    res.json({ ok: true, ...row })
  } catch (e) {
    res.status(e.status || 500).json({ detail: e.message || 'Gagal mengubah peran' })
  }
})

export default r
