import { Router } from 'express'
import { requireAdminOrSuperMember as requireAdmin, requireCanDisplay } from '../utils/auth.js'
import { getSupabaseAuth, isSupabaseEnabled } from '../utils/supabase.js'
import { loginWithPassword } from '../utils/auth.js'
import { emailFor, findProfileById } from '../utils/memberAuthStore.js'
import { auditAdmin } from '../utils/audit.js'
import {
  getActiveSession, createSession, getSession, closeSession, recordCheckin, myRecords, sessionsForMember, getOverview,
  listSessionRoster, upsertSessionMemberStatus, sessionStats, buildQrPayload, parseQrPayload, verifyQrToken,
  listRecordsPage,
  QR_WINDOW_MS,
  checkPwRate, recordPwFail, resetPwRate,
} from '../utils/attendanceStore.js'

const r = Router()

function sendStoreError(res, e, fallback) {
  const status = e.status && Number.isInteger(e.status) ? e.status : 503
  if (status === 503) {
    console.error(fallback, e)
    return res.status(503).json({ error: 'Database sibuk, silakan coba lagi' })
  }
  return res.status(status).json({ detail: e.message })
}

function requireSupabaseDb(req, res) {
  if (!isSupabaseEnabled()) {
    res.status(503).json({ error: 'Fitur absensi butuh database. Hubungi SO.' })
    return false
  }
  return true
}

// Flag deploy: ATTENDANCE_ENABLED=false (Vercel production) -> endpoint anggota
// jawab "segera hadir". Endpoint SO/admin tidak kena flag (mirror MEMBER_AUTH).
function requireAttendanceOn(req, res, next) {
  if (process.env.ATTENDANCE_ENABLED === 'false') {
    return res.status(503).json({ error: 'Fitur absensi segera hadir' })
  }
  return next()
}

async function requireMember(req, res) {
  if (!requireSupabaseDb(req, res)) return null
  const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ detail: 'Unauthorized' })
    return null
  }
  try {
    const { data, error } = await getSupabaseAuth().auth.getUser(token)
    if (error || !data?.user) {
      res.status(401).json({ detail: 'Unauthorized' })
      return null
    }
    const profile = await findProfileById(data.user.id)
    if (!profile) {
      res.status(401).json({ detail: 'Unauthorized' })
      return null
    }
    return { profile, token }
  } catch (e) {
    return sendStoreError(res, e, 'Absensi member auth error'), null
  }
}

// ---- Sesi aktif (tanpa auto-create): untuk anggota maupun SO ----
r.get('/active', requireAttendanceOn, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const token = (req.header('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ detail: 'Unauthorized' })
    const { verifyTokenAsync } = await import('../utils/auth.js')
    const { data, error } = await getSupabaseAuth().auth.getUser(token)
    if (!error && data?.user) {
      const email = data.user.email || ''
      if (email.endsWith('@members.englishclub.local')) {
        const profile = await findProfileById(data.user.id)
        if (!profile) return res.status(401).json({ detail: 'Unauthorized' })
      } else if (!(await verifyTokenAsync(token))) {
        return res.status(401).json({ detail: 'Unauthorized' })
      }
    } else {
      return res.status(401).json({ detail: 'Unauthorized' })
    }
    const s = await getActiveSession()
    if (!s) return res.json({ ok: true, session: null })
    res.json({ ok: true, session: { id: s.id, title: s.title, date: s.date, is_active: s.is_active } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi active error:')
  }
})

// ---- SO: daftar sesi untuk pengelolaan manual per sesi ----
r.get('/sessions', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { getSupabase } = await import('../utils/supabase.js')
    const sb = getSupabase()
    const { data, error } = await sb
      .from('ec_attendance_sessions')
      .select('id, title, date, is_active, created_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw Object.assign(new Error('Database sibuk, silakan coba lagi'), { status: 503 })
    res.json({ ok: true, sessions: data || [] })
  } catch (e) {
    sendStoreError(res, e, 'Absensi list sessions error:')
  }
})

// ---- SO: buat sesi baru (otomatis tutup sesi aktif lain; maks 1 aktif) ----
r.post('/sessions', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { title } = req.body ?? {}
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(422).json({ detail: 'Judul sesi wajib diisi.' })
    }
    const s = await createSession(title, req.admin?.username || 'admin')
    await auditAdmin('Sesi absensi dibuka', req.admin?.username || 'admin', { session_id: s.id, title: s.title })
    res.json({ ok: true, session: { id: s.id, title: s.title, date: s.date, is_active: s.is_active } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi create session error:')
  }
})

r.post('/sessions/:id/close', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const s = await closeSession(req.params.id)
    await auditAdmin('Sesi absensi ditutup', req.admin?.username || 'admin', { session_id: s.id })
    res.json({ ok: true, session: { id: s.id, title: s.title, is_active: s.is_active } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi close session error:')
  }
})

// ---- Display QR read-only (superadmin + SO). Endpoint tulis tetap superadmin-only. ----
r.get('/display-token', requireCanDisplay, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { session } = req.query
    if (!session) return res.status(422).json({ detail: 'session required' })
    const s = await getSession(String(session))
    if (!s.is_active) return res.status(410).json({ detail: 'Sesi sudah ditutup.' })
    const payload = buildQrPayload(s.id, s.secret)
    const winEnd = (Math.floor(Date.now() / QR_WINDOW_MS) + 1) * QR_WINDOW_MS
    res.json({ ok: true, session_id: s.id, payload, expires_in_ms: Math.max(0, winEnd - Date.now()) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi display token error:')
  }
})

// ---- Anggota: check-in via QR + password ----
r.post('/checkin', requireAttendanceOn, async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  const memberId = me.profile.id
  try {
    checkPwRate(memberId)
  } catch (e) {
    return sendStoreError(res, e, 'Absensi rate limit:')
  }
  try {
    const { qr, password } = req.body ?? {}
    if (!qr || typeof qr !== 'string') return res.status(422).json({ detail: 'Kode QR wajib diisi.' })
    if (!password || typeof password !== 'string') return res.status(422).json({ detail: 'Password wajib diisi.' })
    // 1. Validasi sandi akun (server-side, tak pernah disimpan/log).
    const ok = await loginWithPassword(me.profile.username, password, emailFor(me.profile.username))
    if (!ok) {
      recordPwFail(memberId)
      return res.status(401).json({ detail: 'Password salah.' })
    }
    // 2. Validasi token QR 10-detik.
    const { sessionId, win, hmac } = parseQrPayload(qr)
    const s = await getSession(sessionId)
    if (!s.is_active) return res.status(410).json({ detail: 'Sesi sudah ditutup.' })
    verifyQrToken(s.secret, win, hmac)
    // 3. Catat (idempotent per anggota per sesi; kuota 20 per QR).
    const rec = await recordCheckin(memberId, sessionId, 'hadir', win)
    resetPwRate(memberId)
    await auditAdmin('Check-in absensi', me.profile.username, { session_id: sessionId, already: !!rec.already })
    res.json({ ok: true, already: !!rec.already, remainingQuota: rec.remainingQuota ?? null, record: { id: rec.id, status: rec.status, scanned_at: rec.scanned_at } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi checkin error:')
  }
})

// ---- Anggota: daftar hadir sesi berjalan ----
r.get('/list', requireAttendanceOn, async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    const { session, limit } = req.query
    if (!session) return res.status(422).json({ detail: 'session required' })
    const id = String(session)
    // `total` = jumlah check-in sebenarnya, supaya label tidak mentok di limit.
    const { records, total } = await listRecordsPage(id, limit)
    res.json({ ok: true, records, total })
  } catch (e) {
    sendStoreError(res, e, 'Absensi list error:')
  }
})

// ---- Anggota: recent absensi milik sendiri ----
r.get('/mine', requireAttendanceOn, async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    res.json({ ok: true, records: await myRecords(me.profile.id) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi mine error:')
  }
})

r.get('/sessions/mine', requireAttendanceOn, async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    res.json({ ok: true, sessions: await sessionsForMember(me.profile.id) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi sessions error:')
  }
})

// ---- Anggota: gabungan sesi + aktif + daftar hadir sekali jalan ----
r.get('/overview', requireAttendanceOn, async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    const { sessions, active, list, total } = await getOverview(me.profile.id)
    res.json({ ok: true, sessions, active, list, total })
  } catch (e) {
    sendStoreError(res, e, 'Absensi overview error:')
  }
})

// ---- SO: koreksi status (hadir/izin/alpa) ----
r.get('/sessions/:id/roster', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const roster = await listSessionRoster(req.params.id)
    res.json({ ok: true, members: roster })
  } catch (e) {
    sendStoreError(res, e, 'Absensi roster error:')
  }
})

// ---- Statistik sesi untuk layar Display QR (overall + per kelompok) ----
// Read-only: superadmin + SO, sama seperti display-token.
r.get('/sessions/:id/stats', requireCanDisplay, async (req, res) => {
  try {
    const stats = await sessionStats(req.params.id)
    res.json({ ok: true, ...stats })
  } catch (e) {
    sendStoreError(res, e, 'Absensi stats error:')
  }
})

r.patch('/sessions/:id/roster/:memberId', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { status } = req.body ?? {}
    const rec = await upsertSessionMemberStatus(req.params.memberId, req.params.id, status)
    await auditAdmin('Koreksi roster absensi', req.admin?.username || 'admin', {
      session_id: req.params.id,
      member_id: req.params.memberId,
      status: rec.status,
    })
    res.json({ ok: true, record: rec })
  } catch (e) {
    sendStoreError(res, e, 'Absensi roster patch error:')
  }
})

r.patch('/records/:id', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { status } = req.body ?? {}
    if (!['hadir', 'izin', 'alpa'].includes(status)) {
      return res.status(422).json({ detail: 'status harus hadir/izin/alpa' })
    }
    const { getSupabase } = await import('../utils/supabase.js')
    const sb = getSupabase()
    const { data, error } = await sb.from('ec_attendance_records').update({ status }).eq('id', req.params.id).select('*').single()
    if (error) throw Object.assign(new Error('Database sibuk, silakan coba lagi'), { status: 503 })
    await auditAdmin('Koreksi absensi', req.admin?.username || 'admin', { record_id: req.params.id, status })
    res.json({ ok: true, record: data })
  } catch (e) {
    sendStoreError(res, e, 'Absensi patch error:')
  }
})

export default r
