import { Router } from 'express'
import multer from 'multer'
import { requireAdmin } from '../utils/auth.js'
import { loginWithPassword } from '../utils/auth.js'
import { getSupabaseAuth, isSupabaseEnabled } from '../utils/supabase.js'
import {
  registerMemberAccount,
  findProfileByUsername,
  findProfileById,
  resolveLiveGroup,
  emailFor,
  GROUP_NAMES,
  listValidation,
  addValidationNames,
  updateValidationGroup,
  deleteValidation,
  importValidationCsv,
  csvTemplate,
  listMemberProfiles,
  resetMemberPassword,
} from '../utils/memberAuthStore.js'
import { auditAdmin, auditTech } from '../utils/audit.js'

const r = Router()

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase()
    if (!name.endsWith('.csv') && file.mimetype !== 'text/csv') {
      return cb(null, false) // ditolak halus -> ditangani sebagai 422 di route
    }
    cb(null, true)
  },
})

function sendStoreError(res, e, fallback) {
  const status = e.status && Number.isInteger(e.status) ? e.status : 503
  if (status === 503) {
    console.error(fallback, e)
    return res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
  return res.status(status).json({ detail: e.message })
}

function requireSupabase(req, res, next) {
  if (!isSupabaseEnabled()) {
    return res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
  return next()
}

// Flag deploy: MEMBER_AUTH_ENABLED=false (Vercel production) -> API auth publik
// jawab "segera hadir". Endpoint admin (whitelist/akun/reset) TIDAK kena flag.
function requireMemberAuthOn(req, res, next) {
  if (process.env.MEMBER_AUTH_ENABLED === 'false') {
    return res.status(503).json({ error: 'Fitur akun segera hadir' })
  }
  return next()
}

// ---- Publik: registrasi akun anggota ----
r.post('/register', requireSupabase, requireMemberAuthOn, async (req, res) => {
  try {
    const { fullname, username, password } = req.body ?? {}
    const profile = await registerMemberAccount(fullname, username, password)
    const sess = await loginWithPassword(profile.username, password, emailFor(profile.username))
    await auditAdmin('Akun anggota dibuat', profile.username, { fullname: profile.fullname })
    res.status(201).json({
      ok: true,
      token: sess?.token || null,
      username: profile.username,
      fullname: profile.fullname,
      group_name: profile.group_name || '',
    })
  } catch (e) {
    await auditTech('POST /api/members-auth/register', e.status || 503, e.message)
    sendStoreError(res, e, 'Member register error:')
  }
})

// ---- Publik: login anggota ----
r.post('/login', requireSupabase, requireMemberAuthOn, async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) return res.status(422).json({ detail: 'username & password required' })
    const profile = await findProfileByUsername(username)
    if (!profile) return res.status(401).json({ detail: 'Username atau password salah' })
    const sess = await loginWithPassword(profile.username, password, emailFor(profile.username))
    if (!sess) return res.status(401).json({ detail: 'Username atau password salah' })
    const group_name = await resolveLiveGroup(profile.fullname)
    res.json({ ok: true, token: sess.token, username: profile.username, fullname: profile.fullname, group_name })
  } catch (e) {
    console.error('Member login error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// ---- Member: profil sendiri ----
r.get('/me', requireSupabase, requireMemberAuthOn, async (req, res) => {
  try {
    const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ detail: 'Unauthorized' })
    const { data, error } = await getSupabaseAuth().auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ detail: 'Unauthorized' })
    const profile = await findProfileById(data.user.id)
    if (!profile) return res.status(401).json({ detail: 'Unauthorized' })
    const group_name = await resolveLiveGroup(profile.fullname)
    res.json({ ok: true, username: profile.username, fullname: profile.fullname, group_name, created_at: profile.created_at })
  } catch (e) {
    console.error('Member me error:', e)
    res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
})

// ---- Admin: whitelist ----
r.get('/whitelist', requireAdmin, async (req, res) => {
  try {
    res.json({ whitelist: await listValidation(req.query.q || '', 200) })
  } catch (e) {
    sendStoreError(res, e, 'Whitelist GET error:')
  }
})

r.post('/whitelist', requireAdmin, async (req, res) => {
  try {
    const { names, fullname, group_name } = req.body ?? {}
    const result = await addValidationNames(names ?? fullname, group_name || '')
    await auditAdmin('Whitelist ditambah', req.admin?.username || 'admin', { requested: result.requested })
    res.status(201).json({ ok: true, ...result })
  } catch (e) {
    sendStoreError(res, e, 'Whitelist POST error:')
  }
})

// Template CSV whitelist (admin)
r.get('/whitelist/template', requireAdmin, async (req, res) => {
  res.header('Content-Type', 'text/csv')
  res.attachment('template_whitelist_ec.csv')
  res.send(csvTemplate())
})

r.get('/groups', async (req, res) => {
  res.json({ groups: GROUP_NAMES })
})

// Import CSV whitelist + sync kelompok
r.post('/whitelist/import', requireAdmin, csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(422).json({ detail: 'Pilih file .csv dulu' })
    const result = await importValidationCsv(req.file.buffer)
    await auditAdmin('Whitelist import CSV', req.admin?.username || 'admin', {
      inserted: result.inserted, updated: result.updated, errors: result.errors.length,
    })
    res.json({ ok: true, ...result })
  } catch (e) {
    if (e.message?.includes('Hanya file')) return res.status(422).json({ detail: e.message })
    sendStoreError(res, e, 'Whitelist import error:')
  }
})

r.put('/whitelist/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await updateValidationGroup(req.params.id, req.body?.group_name)
    await auditAdmin('Grup whitelist diubah', req.admin?.username || 'admin', { fullname: updated.fullname, group: updated.group_name })
    res.json({ ok: true, whitelist: updated })
  } catch (e) {
    sendStoreError(res, e, 'Whitelist PUT error:')
  }
})

r.delete('/whitelist/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await deleteValidation(req.params.id)
    await auditAdmin('Whitelist dihapus', req.admin?.username || 'admin', { fullname: removed.fullname })
    res.json({ ok: true })
  } catch (e) {
    sendStoreError(res, e, 'Whitelist DELETE error:')
  }
})

// ---- Admin: daftar akun anggota + reset password ----
r.get('/accounts', requireAdmin, async (req, res) => {
  try {
    res.json({ accounts: await listMemberProfiles(req.query.q || '', 200) })
  } catch (e) {
    sendStoreError(res, e, 'Accounts GET error:')
  }
})

r.post('/accounts/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const profile = await resetMemberPassword(req.params.id, req.body?.newPassword)
    await auditAdmin('Password anggota direset', req.admin?.username || 'admin', { username: profile.username })
    res.json({ ok: true, username: profile.username })
  } catch (e) {
    sendStoreError(res, e, 'Reset password error:')
  }
})

export default r
