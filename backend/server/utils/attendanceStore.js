// Presensi QR 10-detik: sesi/pertemuan + token HMAC window + record kehadiran.
// Token QR = HMAC(secret_sesi, window_10s); backend terima window berjalan + 1 sebelumnya.
// Anti-replay: UNIQUE(member_id, session_id) — satu check-in per anggota per sesi.
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { getSupabase } from './supabase.js'
import { listAllowed } from './adminAllowlist.js'
import { GROUP_NAMES } from './memberAuthStore.js'

export const QR_WINDOW_MS = 10000
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

// ---- sesi manual: dibuka/ditutup SO, maksimal 1 aktif ----
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

export async function recordCheckin(memberId, sessionId, status = 'hadir', win = null) {
  const QUOTA_PER_QR = 20
  const sb = getSupabase()
  if (!sb) {
    const inWin = mem.records.filter((r) => r.session_id === sessionId && r.token_win === win)
    if (win !== null && inWin.length >= QUOTA_PER_QR) {
      throw fail(429, 'Kuota 20 absen untuk QR ini habis. Pindai QR berikutnya.')
    }
    const dup = mem.records.find((r) => r.member_id === memberId && r.session_id === sessionId)
    if (dup) return { ...dup, already: true, remainingQuota: Math.max(0, QUOTA_PER_QR - inWin.length) }
    const rec = { id: mem.records.length + 1, member_id: memberId, session_id: sessionId, status, token_win: win, scanned_at: new Date().toISOString() }
    mem.records.push(rec)
    return { ...rec, already: false, remainingQuota: Math.max(0, QUOTA_PER_QR - inWin.length - 1) }
  }
  if (win !== null) {
    const { count, error: countErr } = await sb
      .from('ec_attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('token_win', win)
    if (countErr) throw fail(503, 'Database sibuk, silakan coba lagi')
    if ((count ?? 0) >= QUOTA_PER_QR) {
      throw fail(429, 'Kuota 20 absen untuk QR ini habis. Pindai QR berikutnya.')
    }
  }
  const { data, error } = await sb
    .from('ec_attendance_records')
    .insert({ member_id: memberId, session_id: sessionId, status, token_win: win })
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

// ---- gabungan sekali jalan untuk tab Presensi (hemat RTT di jaringan lambat) ----
export async function getOverview(memberId) {
  const sessions = await sessionsForMember(memberId)
  const hit = sessions.find((s) => s.is_active) || null
  const active = hit ? { id: hit.id, title: hit.title, date: hit.date, is_active: true } : null
  const list = active ? await listRecords(active.id) : []
  return { sessions, active, list }
}

export async function sessionsForMember(memberId) {
  const sb = getSupabase()
  if (!sb) {
    const recordsBySession = new Map(
      mem.records
        .filter((record) => record.member_id === memberId)
        .map((record) => [record.session_id, record]),
    )
    return mem.sessions
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''))
      .map((session) => {
        const record = recordsBySession.get(session.id)
        return {
          id: session.id,
          title: session.title,
          date: session.date,
          is_active: session.is_active,
          attendance: record ? { status: record.status, scanned_at: record.scanned_at } : null,
        }
      })
  }

  const [{ data: sessions, error: sessionsError }, { data: records, error: recordsError }] = await Promise.all([
    sb.from('ec_attendance_sessions')
      .select('id, title, date, is_active, created_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    sb.from('ec_attendance_records')
      .select('session_id, status, scanned_at')
      .eq('member_id', memberId),
  ])
  if (sessionsError || recordsError) throw fail(503, 'Database sibuk, silakan coba lagi')

  const recordsBySession = new Map((records || []).map((record) => [record.session_id, record]))
  return (sessions || []).map((session) => {
    const record = recordsBySession.get(session.id)
    return {
      id: session.id,
      title: session.title,
      date: session.date,
      is_active: session.is_active,
      attendance: record ? { status: record.status, scanned_at: record.scanned_at } : null,
    }
  })
}

export async function listSessionRoster(sessionId) {
  const sb = getSupabase()
  if (!sb) {
    const recordMap = new Map(
      mem.records
        .filter((record) => record.session_id === sessionId)
        .map((record) => [record.member_id, { status: record.status, scanned_at: record.scanned_at }]),
    )
    return [{ id: 'mem-demo', username: 'demo', fullname: 'Demo member', status: recordMap.get('mem-demo')?.status || 'belum', scanned_at: recordMap.get('mem-demo')?.scanned_at || null }]
  }

  const [{ data: session, error: sessionError }, { data: members, error: membersError }, { data: records, error: recordsError }] = await Promise.all([
    sb.from('ec_attendance_sessions').select('id').eq('id', sessionId).maybeSingle(),
    sb.from('member_profiles').select('id, username, fullname').order('fullname', { ascending: true }),
    sb.from('ec_attendance_records').select('member_id, status, scanned_at').eq('session_id', sessionId),
  ])

  if (sessionError || membersError || recordsError) throw fail(503, 'Database sibuk, silakan coba lagi')
  if (!session) throw fail(404, 'Sesi tidak ditemukan.')

  const recordMap = new Map((records || []).map((record) => [record.member_id, record]))
  return (members || []).map((member) => {
    const record = recordMap.get(member.id)
    return {
      id: member.id,
      username: member.username || '',
      fullname: member.fullname || member.username || '',
      status: record ? record.status : 'belum',
      scanned_at: record ? record.scanned_at : null,
    }
  })
}

// ---- statistik sesi (layar Display QR) ----
const STATS_STATUSES = ['hadir', 'izin', 'alpa', 'belum']
// Akun panitia tidak ikut statistik anggota; dihitung terpisah sebagai `staff`.
const STAFF_ROLES = new Set(['so', 'superadmin', 'operator'])

function emptyCounts() {
  return { total: 0, hadir: 0, izin: 0, alpa: 0, belum: 0 }
}

function addStatus(bucket, status) {
  bucket.total += 1
  bucket[STATS_STATUSES.includes(status) ? status : 'belum'] += 1
}

// Overall + per kelompok untuk sesi tertentu. Hanya akun terdaftar
// (member_profiles) yang dihitung. Akun ber-role SO/superadmin/operator
// dipisah ke `staff` agar tidak mengotori donut kehadiran anggota.
export async function sessionStats(sessionId) {
  const sb = getSupabase()
  if (!sb) {
    const overall = emptyCounts()
    const demo = mem.records.filter((r) => r.session_id === sessionId)
    addStatus(overall, demo[0]?.status || 'belum')
    return { ...overall, groups: [], staff: emptyCounts() }
  }

  const [
    { data: session, error: sessionError },
    { data: members, error: membersError },
    { data: records, error: recordsError },
  ] = await Promise.all([
    sb.from('ec_attendance_sessions').select('id').eq('id', sessionId).maybeSingle(),
    sb.from('member_profiles').select('id, username, fullname, group_name'),
    sb.from('ec_attendance_records').select('member_id, status').eq('session_id', sessionId),
  ])
  if (sessionError || membersError || recordsError) throw fail(503, 'Database sibuk, silakan coba lagi')
  if (!session) throw fail(404, 'Sesi tidak ditemukan.')

  const statusByMember = new Map((records || []).map((record) => [record.member_id, record.status]))

  let staffUsernames = new Set()
  try {
    const allow = await listAllowed()
    staffUsernames = new Set(
      allow
        .filter((a) => STAFF_ROLES.has(String(a.role || '').toLowerCase()))
        .map((a) => String(a.username || '').toLowerCase()),
    )
  } catch { /* allowlist tak terbaca: anggap tak ada staf */ }

  const overall = emptyCounts()
  const staff = emptyCounts()
  const groupMap = new Map(GROUP_NAMES.map((name) => [name, emptyCounts()]))
  let noGroup = null

  for (const member of members || []) {
    const status = statusByMember.get(member.id)
    const username = String(member.username || '').toLowerCase()
    if (staffUsernames.has(username)) {
      addStatus(staff, status)
      continue
    }
    addStatus(overall, status)
    const group = String(member.group_name || '').trim()
    const bucket = groupMap.get(group)
    if (bucket) {
      addStatus(bucket, status)
    } else {
      if (!noGroup) noGroup = emptyCounts()
      addStatus(noGroup, status)
    }
  }

  const groups = GROUP_NAMES.map((name) => ({ name, ...groupMap.get(name) }))
  if (noGroup) groups.push({ name: 'Tanpa kelompok', ...noGroup })

  return { ...overall, groups, staff }
}

export async function upsertSessionMemberStatus(memberId, sessionId, status = 'hadir') {
  const allowed = new Set(['hadir', 'izin', 'alpa', 'belum'])
  if (!allowed.has(status)) throw fail(422, 'status harus hadir/izin/alpa/belum')

  const sb = getSupabase()
  if (!sb) {
    const idx = mem.records.findIndex((record) => record.member_id === memberId && record.session_id === sessionId)
    if (status === 'belum') {
      if (idx >= 0) mem.records.splice(idx, 1)
      return { deleted: idx >= 0, member_id: memberId, session_id: sessionId, status }
    }
    const next = {
      id: idx >= 0 ? mem.records[idx].id : mem.records.length + 1,
      member_id: memberId,
      session_id: sessionId,
      status,
      scanned_at: new Date().toISOString(),
      token_win: null,
    }
    if (idx >= 0) mem.records[idx] = next
    else mem.records.push(next)
    return { ...next, member_id: memberId, session_id: sessionId, status }
  }

  const { data: existing, error: existingError } = await sb
    .from('ec_attendance_records')
    .select('*')
    .eq('member_id', memberId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (existingError) throw fail(503, 'Database sibuk, silakan coba lagi')

  if (status === 'belum') {
    if (existing) {
      const { error: deleteError } = await sb.from('ec_attendance_records').delete().eq('id', existing.id)
      if (deleteError) throw fail(503, 'Database sibuk, silakan coba lagi')
    }
    return { deleted: !!existing, member_id: memberId, session_id: sessionId, status }
  }

  const payload = { member_id: memberId, session_id: sessionId, status, scanned_at: new Date().toISOString(), token_win: null }
  if (existing) {
    const { data, error } = await sb.from('ec_attendance_records').update({ status, scanned_at: payload.scanned_at, token_win: null }).eq('id', existing.id).select('*').single()
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    return { ...data, member_id: memberId, session_id: sessionId, status }
  }

  const { data, error } = await sb.from('ec_attendance_records').insert(payload).select('*').single()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return { ...data, member_id: memberId, session_id: sessionId, status }
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
