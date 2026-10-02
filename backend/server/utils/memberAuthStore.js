// Akun anggota EC (tasks/PRD SIgnup.md): kredensial di Supabase Auth,
// profil + whitelist di Postgres. Backend-only via SERVICE_ROLE.
// Email sintetis {username}@members.englishclub.local (user tak pernah lihat email).
import { parse as parseCsv } from 'csv-parse/sync'
import { getSupabase } from './supabase.js'

export const MEMBER_EMAIL_DOMAIN = 'members.englishclub.local'
export const GROUP_NAMES = ['Zeus', 'Athena', 'Hades', 'Apollo', 'Hermes']

export function normalizeGroupName(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  const hit = GROUP_NAMES.find(g => g.toLowerCase() === s.toLowerCase())
  return hit || null
}

export function assertGroupName(v, required = true) {
  const n = normalizeGroupName(v)
  if (n === '' && !required) return ''
  if (!n) throw fail(422, 'Kelompok harus salah satu: ' + GROUP_NAMES.join(', '))
  return n
}

export function emailFor(username) {
  return `${String(username).trim().toLowerCase()}@${MEMBER_EMAIL_DOMAIN}`
}

function fail(status, detail) {
  const e = new Error(detail)
  e.status = status
  return e
}

export function validateSignupInput(fullname, username, password) {
  if (!fullname || typeof fullname !== 'string' || !fullname.trim()) {
    throw fail(422, 'Nama lengkap wajib diisi')
  }
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
    throw fail(422, 'Username 3-20 karakter (huruf, angka, underscore)')
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw fail(422, 'Password minimal 6 karakter')
  }
  return { fullname: fullname.trim(), username: username.trim(), password }
}

export async function findValidation(fullname) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('ec_members_validation')
    .select('id, fullname, group_name, is_registered, created_at, registered_at')
    .eq('fullname', fullname.trim())
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

export async function listValidation(q = '', limit = 200) {
  const sb = getSupabase()
  let query = sb
    .from('ec_members_validation')
    .select('id, fullname, group_name, is_registered, created_at, registered_at')
    .order('fullname', { ascending: true })
    .limit(limit)
  if (q.trim()) query = query.ilike('fullname', `%${q.trim()}%`)
  const { data, error } = await query
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

export async function addValidationNames(names, groupName = '') {
  const group = assertGroupName(groupName, false)
  const clean = [...new Set(
    (Array.isArray(names) ? names : [names])
      .map(n => String(n || '').trim())
      .filter(n => n.length > 0 && n.length <= 100),
  )]
  if (!clean.length) throw fail(422, 'Minimal 1 nama yang valid')
  if (clean.length > 200) throw fail(422, 'Maksimal 200 nama sekaligus')
  const sb = getSupabase()
  const rows = clean.map(fullname => group ? { fullname, group_name: group } : { fullname })
  const { data, error } = await sb
    .from('ec_members_validation')
    .upsert(rows, { onConflict: 'fullname', ignoreDuplicates: true })
    .select('id, fullname, group_name, is_registered')
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return { added: data.length, requested: clean.length }
}

export async function updateValidationGroup(id, groupName) {
  const group = assertGroupName(groupName)
  const sb = getSupabase()
  const { data, error } = await sb
    .from('ec_members_validation')
    .update({ group_name: group })
    .eq('id', id)
    .select('id, fullname, group_name, is_registered')
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  if (!data) throw fail(404, 'Data tidak ditemukan')
  // Propagasi ke profil akun yang sudah terdaftar (grup live)
  await sb.from('member_profiles').update({ group_name: group }).eq('fullname', data.fullname)
  return data
}

// Import CSV whitelist + sync kelompok. Format header: fullname,group_name
// (toleran: nama kolom `nama`/`name`, `group`/`kelompok`/`grup`; tanpa header =
// kolom 1 nama, kolom 2 kelompok; baris kosong/BOM diabaikan).
// Baris invalid dikumpulkan di errors[] tanpa menggagalkan yang valid.
export async function importValidationCsv(buffer) {
  if (!buffer || buffer.length === 0) throw fail(422, 'File CSV kosong')
  if (buffer.length > 1024 * 1024) throw fail(422, 'Ukuran CSV maksimal 1MB')
  const text = buffer.toString('utf-8')
  let records
  try {
    records = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    })
  } catch (e) {
    throw fail(422, 'CSV tidak dapat dibaca: ' + (e.message || 'format salah'))
  }
  let rows = []
  let headerless = false
  if (!records.length || !hasKnownHeader(records[0])) {
    // Coba tanpa header: kolom 1 = nama, kolom 2 = kelompok
    try {
      const raw = parseCsv(text, { columns: false, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true })
      rows = raw.map((cols, i) => ({ __line: i + 1, fullname: cols[0], group: cols[1] }))
      headerless = true
    } catch (e) {
      throw fail(422, 'CSV tidak dapat dibaca: ' + (e.message || 'format salah'))
    }
  } else {
    rows = records.map((rec, i) => ({
      __line: i + 2,
      fullname: pickField(rec, ['fullname', 'nama_lengkap', 'nama', 'name']),
      group: pickField(rec, ['group_name', 'group', 'kelompok', 'grup']),
    }))
  }
  const valid = []
  const errors = []
  const seen = new Set()
  for (const r of rows) {
    const name = String(r.fullname || '').trim()
    if (!name) {
      if (!headerless) errors.push({ row: r.__line, message: 'Nama kosong' })
      continue
    }
    if (name.length > 100) { errors.push({ row: r.__line, message: 'Nama terlalu panjang (maks 100)' }); continue }
    const key = name.toLowerCase()
    if (seen.has(key)) { errors.push({ row: r.__line, message: 'Nama duplikat di file' }); continue }
    seen.add(key)
    const g = normalizeGroupName(r.group)
    if (!g) { errors.push({ row: r.__line, message: `Kelompok "${String(r.group || '').trim()}" tidak valid (harus: ${GROUP_NAMES.join(', ')})` }); continue }
    valid.push({ fullname: name, group_name: g })
  }
  if (!valid.length && !errors.length) throw fail(422, 'CSV tidak berisi data')
  let inserted = 0
  let updated = 0
  if (valid.length) {
    const sb = getSupabase()
    const { data: existing } = await sb
      .from('ec_members_validation')
      .select('fullname')
      .in('fullname', valid.map(v => v.fullname))
    const existingSet = new Set((existing || []).map(e => String(e.fullname).toLowerCase()))
    const { error } = await sb
      .from('ec_members_validation')
      .upsert(valid, { onConflict: 'fullname' })
    if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
    for (const v of valid) {
      if (existingSet.has(v.fullname.toLowerCase())) updated++
      else inserted++
    }
    // Propagasi grup ke profil akun yang sudah terdaftar (grup live)
    for (const v of valid) {
      await sb.from('member_profiles').update({ group_name: v.group_name }).eq('fullname', v.fullname)
    }
  }
  return { inserted, updated, errors }
}

function hasKnownHeader(rec) {
  const keys = Object.keys(rec).map(k => k.toLowerCase().trim())
  return keys.some(k => ['fullname', 'nama_lengkap', 'nama', 'name'].includes(k))
}

function pickField(rec, candidates) {
  const lower = {}
  for (const [k, v] of Object.entries(rec)) lower[k.toLowerCase().trim()] = v
  for (const c of candidates) {
    if (lower[c] !== undefined && lower[c] !== null && String(lower[c]).trim() !== '') return lower[c]
  }
  return ''
}

export function csvTemplate() {
  return 'fullname,group_name\nBudi Santoso,Zeus\nSiti Aminah,Athena\n'
}

export async function deleteValidation(id) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('ec_members_validation')
    .delete()
    .eq('id', id)
    .select('id, fullname')
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  if (!data) throw fail(404, 'Data tidak ditemukan')
  return data
}

export async function findProfileByUsername(username) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('member_profiles')
    .select('id, username, fullname, group_name, created_at')
    .eq('username', username.trim())
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

export async function findProfileById(id) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('member_profiles')
    .select('id, username, fullname, group_name, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}

// Grup live: selalu baca dari whitelist agar perubahan admin langsung tercermin.
export async function resolveLiveGroup(fullname) {
  const v = await findValidation(fullname)
  return v?.group_name || ''
}

export async function registerMemberAccount(fullname, username, password) {
  const input = validateSignupInput(fullname, username, password)
  const sb = getSupabase()

  const valid = await findValidation(input.fullname)
  if (!valid) throw fail(422, 'Nama tidak terdaftar sebagai anggota EC')
  if (valid.is_registered) throw fail(409, 'Nama ini sudah terdaftar')

  const existing = await findProfileByUsername(input.username)
  if (existing) throw fail(409, 'Username sudah digunakan')

  // Buat kredensial di Supabase Auth (hash otomatis oleh Supabase)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: emailFor(input.username),
    password: input.password,
    email_confirm: true,
    user_metadata: { username: input.username, fullname: input.fullname },
  })
  if (createErr || !created?.user) {
    if (String(createErr?.message || '').toLowerCase().includes('already')) {
      throw fail(409, 'Username sudah digunakan')
    }
    throw fail(503, 'Database sibuk, silakan coba lagi')
  }
  const userId = created.user.id

  // Profil + tandai whitelist (rollback auth user jika gagal)
  const { error: profileErr } = await sb.from('member_profiles').insert({
    id: userId,
    username: input.username,
    fullname: input.fullname,
    group_name: valid.group_name || '',
  })
  if (profileErr) {
    try { await sb.auth.admin.deleteUser(userId) } catch {}
    if (String(profileErr.message || '').toLowerCase().includes('duplicate')) {
      throw fail(409, 'Username sudah digunakan')
    }
    throw fail(503, 'Database sibuk, silakan coba lagi')
  }
  const { error: flagErr } = await sb
    .from('ec_members_validation')
    .update({ is_registered: true, registered_at: new Date().toISOString() })
    .eq('id', valid.id)
  if (flagErr) {
    // Akun sudah jadi; flag gagal bukan fatal (admin bisa perbaiki), jangan rollback akun.
    console.error('Gagal menandai is_registered:', flagErr.message)
  }
  return { id: userId, username: input.username, fullname: input.fullname, group_name: valid.group_name || '' }
}

export async function resetMemberPassword(profileId, newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw fail(422, 'Password minimal 6 karakter')
  }
  const profile = await findProfileById(profileId)
  if (!profile) throw fail(404, 'Anggota tidak ditemukan')
  const sb = getSupabase()
  const { error } = await sb.auth.admin.updateUserById(profile.id, { password: newPassword })
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return profile
}

export async function listMemberProfiles(q = '', limit = 200) {
  const sb = getSupabase()
  let query = sb
    .from('member_profiles')
    .select('id, username, fullname, group_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (q.trim()) query = query.ilike('username', `%${q.trim()}%`)
  const { data, error } = await query
  if (error) throw fail(503, 'Database sibuk, silakan coba lagi')
  return data
}
