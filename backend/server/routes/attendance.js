import { Router } from 'express'
import { requireAdminOrSuperMember as requireAdmin } from '../utils/auth.js'
import { getSupabaseAuth, isSupabaseEnabled } from '../utils/supabase.js'
import { loginWithPassword } from '../utils/auth.js'
import { emailFor, findProfileById } from '../utils/memberAuthStore.js'
import { auditAdmin } from '../utils/audit.js'
import {
  getOrCreateToday, getSession, closeSession, recordCheckin, listRecords, myRecords,
  buildQrPayload, parseQrPayload, verifyQrToken,
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
    res.status(503).json({ error: 'Fitur absensi butuh database. Hubungi panitia.' })
    return false
  }
  return true
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

// ---- Anggota: sesi aktif hari ini (untuk list + judul) ----
r.get('/active', async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    const s = await getOrCreateToday()
    if (!s.is_active) return res.json({ ok: true, session: null })
    res.json({ ok: true, session: { id: s.id, title: s.title, date: s.date } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi active error:')
  }
})

// ---- Panitia: sesi hari ini (buat otomatis bila belum ada) ----
r.post('/sessions', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { title } = req.body ?? {}
    const s = await getOrCreateToday(String(title || '').slice(0, 80), req.admin?.username || 'admin')
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

// ---- Panitia: token QR saat ini (di-refresh tiap 7 detik oleh display) ----
r.get('/display-token', requireAdmin, async (req, res) => {
  try {
    if (!requireSupabaseDb(req, res)) return
    const { session } = req.query
    if (!session) return res.status(422).json({ detail: 'session required' })
    const s = await getSession(String(session))
    if (!s.is_active) return res.status(410).json({ detail: 'Sesi sudah ditutup.' })
    const payload = buildQrPayload(s.id, s.secret)
    const winEnd = (Math.floor(Date.now() / 7000) + 1) * 7000
    res.json({ ok: true, session_id: s.id, payload, expires_in_ms: Math.max(0, winEnd - Date.now()) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi display token error:')
  }
})

// ---- Anggota: check-in via QR + password ----
r.post('/checkin', async (req, res) => {
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
    // 2. Validasi token QR 7-detik.
    const { sessionId, win, hmac } = parseQrPayload(qr)
    const s = await getSession(sessionId)
    if (!s.is_active) return res.status(410).json({ detail: 'Sesi sudah ditutup.' })
    verifyQrToken(s.secret, win, hmac)
    // 3. Catat (idempotent per anggota per sesi).
    const rec = await recordCheckin(memberId, sessionId, 'hadir')
    resetPwRate(memberId)
    await auditAdmin('Check-in absensi', me.profile.username, { session_id: sessionId, already: !!rec.already })
    res.json({ ok: true, already: !!rec.already, record: { id: rec.id, status: rec.status, scanned_at: rec.scanned_at } })
  } catch (e) {
    sendStoreError(res, e, 'Absensi checkin error:')
  }
})

// ---- Anggota: daftar hadir sesi berjalan ----
r.get('/list', async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    const { session } = req.query
    if (!session) return res.status(422).json({ detail: 'session required' })
    res.json({ ok: true, records: await listRecords(String(session)) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi list error:')
  }
})

// ---- Anggota: recent absensi milik sendiri ----
r.get('/mine', async (req, res) => {
  const me = await requireMember(req, res)
  if (!me) return
  try {
    res.json({ ok: true, records: await myRecords(me.profile.id) })
  } catch (e) {
    sendStoreError(res, e, 'Absensi mine error:')
  }
})

// ---- Panitia: koreksi status (hadir/izin/alpa) ----
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
