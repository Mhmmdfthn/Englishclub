// Presensi QR 7-detik: sesi/pertemuan + token HMAC window + record kehadiran.
// Token QR = HMAC(secret_sesi, window_7s); backend terima window berjalan + 1 sebelumnya.
// Anti-replay: UNIQUE(member_id, session_id) — satu check-in per anggota per sesi.
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { getSupabase } from './supabase.js'

export const QR_WINDOW_MS = 7000
export const QR_PREFIX = 'ECA1'

function fail(status, detail) {
  const e = new Error(detail)
  e.status = status
  return e
}

export function todayWIB() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function currentWindow(now = Date.now()) {
  return Math.floor(now / QR_WINDOW_MS)
}

export function makeToken(secret, win) {
  return createHmac('sha256', String(secret)).update(`presensi:${win}`).digest('hex').slice(0, 32)
}

export function buildQrPayload(sessionId, secret, now = Date.now()) {
  const win = currentWindow(now)
  return `${QR_PREFIX}:${sessionId}:${win}:${makeToken(secret, win)}`
}

export function parseQrPayload(raw) {
  const s = String(raw || '').trim()
  const parts = s.split(':')
  if (parts.length !== 4 || parts[0] !== QR_PREFIX) throw fail(422, 'Kode QR tidak dikenal.')
  const [, sessionId, winStr, hmac] = parts
  const win = Number(winStr)
  if (!sessionId || !Number.isInteger(win) || !/^[0-9a-f]{32}$/.test(hmac || '')) {
    throw fail(422, 'Kode QR tidak dikenal.')
  }
  return { sessionId, win, hmac }
}

export function verifyQrToken(secret, win, hmac, now = Date.now()) {
  const cur = currentWindow(now)
  // Terima window berjalan + 1 sebelumnya (toleransi latensi scan).
  for (const w of [cur, cur - 1]) {
    const expected = makeToken(secret, w)
    try {
      if (hmac.length === expected.length && timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return w
    } catch { /* lanjut */ }
  }
  throw fail(410, 'QR kedaluwarsa. Pindai ulang kode terbaru di layar.')
}

// ---- storage (Supabase primary, memory fallback ala pola repo) ----
const mem = { sessions: [], records: [] }

// ---- sesi manual: dibuka/ditutup panitia, maksimal 1 aktif ----
export async function getActiveSession() {
  const sb = getSupabase()
  if (!sb) {
    return mem.sessions.find((s) => s.is_active) || null
  }
  const { data, error } = await sb
    .from('ec_attendance_sessions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data || null
}

export async function createSession(title = '', createdBy = '') {
  const clean = String(title || '').trim().slice(0, 80) || `Pertemuan ${todayWIB()}`
  const sb = getSupabase()
  if (!sb) {
    // Satu aktif: tutup sesi lama dulu.
    for (const s of mem.sessions) s.is_active = false
    const s = { id: `mem-${Date.now()}`, title: clean, date: todayWIB(), secret: randomBytes(32).toString('hex'), is_active: true, created_by: createdBy, created_at: new Date().toISOString() }
    mem.sessions.push(s)
    return s
  }
  const { error: closeErr } = await sb.from('ec_attendance_sessions').update({ is_active: false }).eq('is_active', true)
  if (closeErr) throw fail(503, 'Database sibuk, silakan coba lagi')
  const row = { title: clean, date: todayWIB(), secret: randomBytes(32).toString('hex'), is_active: true, created_by: createdBy }
  const { data, error } = await sb.from('ec_attendance_sessions').insert(row).select('*').single()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

export async function getSession(id) {
  const sb = getSupabase()
  if (!sb) {
    const s = mem.sessions.find((x) => x.id === id) || null
    if (!s) throw fail(404, 'Sesi tidak ditemukan.')
    return s
  }
  const { data, error } = await sb.from('ec_attendance_sessions').select('*').eq('id', id).maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  if (!data) throw fail(404, 'Sesi tidak ditemukan.')
  return data
}

export async function closeSession(id) {
  const sb = getSupabase()
  if (!sb) {
    const s = mem.sessions.find((x) => x.id === id)
    if (!s) throw fail(404, 'Sesi tidak ditemukan.')
    s.is_active = false
    return s
  }
  const { data, error } = await sb.from('ec_attendance_sessions').update({ is_active: false }).eq('id', id).select('*').single()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

export async function recordCheckin(memberId, sessionId, status = 'hadir') {
  const sb = getSupabase()
  if (!sb) {
    const dup = mem.records.find((r) => r.member_id === memberId && r.session_id === sessionId)
    if (dup) return { ...dup, already: true }
    const rec = { id: mem.records.length + 1, member_id: memberId, session_id: sessionId, status, scanned_at: new Date().toISOString() }
    mem.records.push(rec)
    return { ...rec, already: false }
  }
  const { data, error } = await sb
    .from('ec_attendance_records')
    .insert({ member_id: memberId, session_id: sessionId, status })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      const { data: dup } = await sb.from('ec_attendance_records')
        .select('*').eq('member_id', memberId).eq('session_id', sessionId).maybeSingle()
      return { ...(dup || {}), already: true }
    }
    throw fail(503, 'Database sibuk, silakan coba lagi')
  }
  return { ...data, already: false }
}

export async function listRecords(sessionId, limit = 100) {
  const n = Math.max(1, Math.min(Number(limit) || 100, 200))
  const sb = getSupabase()
  if (!sb) {
    return mem.records
      .filter((r) => r.session_id === sessionId)
      .sort((a, b) => (a.scanned_at < b.scanned_at ? 1 : -1))
      .slice(0, n)
      .map((r) => ({ ...r, username: '', fullname: '' }))
  }
  const { data, error } = await sb
    .from('ec_attendance_records')
    .select('id, status, scanned_at, member:member_id(username, fullname)')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: false })
    .limit(n)
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return (data || []).map((r) => ({
    id: r.id, status: r.status, scanned_at: r.scanned_at,
    username: r.member?.username || '', fullname: r.member?.fullname || '',
  }))
}

export async function myRecords(memberId, limit = 20) {
  const n = Math.max(1, Math.min(Number(limit) || 20, 50))
  const sb = getSupabase()
  if (!sb) {
    return mem.records
      .filter((r) => r.member_id === memberId)
      .sort((a, b) => (a.scanned_at < b.scanned_at ? 1 : -1))
      .slice(0, n)
  }
  const { data, error } = await sb
    .from('ec_attendance_records')
    .select('id, status, scanned_at, session:session_id(id, title, date)')
    .eq('member_id', memberId)
    .order('scanned_at', { ascending: false })
    .limit(n)
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return (data || []).map((r) => ({
    id: r.id, status: r.status, scanned_at: r.scanned_at,
    session_title: r.session?.title || '', session_date: r.session?.date || '',
  }))
}

// ---- rate limit password (memory; catat batasan multi-instance di PRD) ----
const pwFails = new Map() // key memberId -> { fails, firstTs, blockedUntil }
const PW_MAX_FAILS = 3
const PW_WINDOW_MS = 5 * 60 * 1000
const PW_BLOCK_MS = 60 * 1000

export function checkPwRate(memberId, now = Date.now()) {
  const st = pwFails.get(memberId)
  if (st && st.blockedUntil > now) {
    const sisa = Math.ceil((st.blockedUntil - now) / 1000)
    throw fail(429, `Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`)
  }
  if (st && now - st.firstTs > PW_WINDOW_MS) pwFails.delete(memberId)
}

export function recordPwFail(memberId, now = Date.now()) {
  const st = pwFails.get(memberId)
  if (!st || now - st.firstTs > PW_WINDOW_MS) {
    pwFails.set(memberId, { fails: 1, firstTs: now, blockedUntil: 0 })
    return
  }
  st.fails += 1
  if (st.fails >= PW_MAX_FAILS) st.blockedUntil = now + PW_BLOCK_MS
}

export function resetPwRate(memberId) {
  pwFails.delete(memberId)
}
