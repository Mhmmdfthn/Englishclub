import { kv } from '@vercel/kv'
import { google } from 'googleapis'

const KV_KEYS = { scores: 'leaderboard', stories: 'stories', proker: 'prokers', members: 'members', failedMembers: 'failed_members_queue' }
const CACHE_TTL = 2 * 60 * 1000
let membersCache = { expiresAt: 0, rows: null }
let sheetsClient = null

export function isKvEnabled() {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.VERCEL_KV_REST_API_URL) &&
    (process.env.KV_REST_API_TOKEN || process.env.VERCEL_KV_REST_API_TOKEN),
  )
}

export function isSheetsEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_ID)
}

function getSheets() {
  if (sheetsClient) return sheetsClient
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

function sheetRange() {
  return process.env.GOOGLE_SHEETS_RANGE || 'Members!A:D'
}

async function appendKvList(key, item) {
  try {
    await kv.rpush(key, item)
  } catch (err) {
    if (String(err?.message || err).includes('WRONGTYPE')) {
      // Legacy string/array key exists from previous kv.set. Delete it so that Redis List is clean.
      await kv.del(key)
      await kv.rpush(key, item)
    } else {
      throw err
    }
  }
}

async function readKvList(key) {
  try {
    const list = await kv.lrange(key, 0, -1)
    if (Array.isArray(list)) {
      return list.map(item => {
        if (typeof item === 'string') {
          try { return JSON.parse(item) } catch { return item }
        }
        return item
      })
    }
    return []
  } catch (err) {
    if (String(err?.message || err).includes('WRONGTYPE')) {
      try {
        const legacy = await kv.get(key)
        return Array.isArray(legacy) ? legacy : []
      } catch {}
    }
    throw err
  }
}

export async function cloudAddMember(row) {
  await appendKvList(KV_KEYS.members, row)
  return { ...row, queued: false }
}

export async function cloudAllMembers(limit = 1000) {
  const rows = await readKvList(KV_KEYS.members)
  return [...rows].reverse().slice(0, limit)
}

export async function cloudTopScores(limit = 10) {
  const rows = await readKvList(KV_KEYS.scores)
  return rows
    .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at))
    .slice(0, limit)
}

export async function cloudAddScore(name, score, words) {
  const row = { name: name.slice(0, 20), score, words, created_at: new Date().toISOString() }
  await appendKvList(KV_KEYS.scores, row)
  const rows = await readKvList(KV_KEYS.scores)
  return rows.filter((item) => item.score > score).length + 1
}

export async function cloudLatestStories(limit = 100) {
  const rows = await readKvList(KV_KEYS.stories)
  return [...rows].reverse().slice(0, limit).map(({ name, batch, comment }) => ({ name, batch, comment }))
}

export async function cloudAddStory(name, batch, comment) {
  const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
  await appendKvList(KV_KEYS.stories, row)
  return row
}

export async function cloudGetProker() {
  try {
    const prokers = await kv.get(KV_KEYS.proker)
    if (Array.isArray(prokers)) return prokers
    const legacy = await kv.get('proker')
    if (Array.isArray(legacy)) return legacy
  } catch (err) {
    if (String(err?.message || err).includes('WRONGTYPE')) {
      const list = await kv.lrange(KV_KEYS.proker, 0, -1)
      if (Array.isArray(list) && list.length > 0) return list
    }
    throw err
  }
  return []
}

export async function cloudSaveProker(rows) {
  await kv.set(KV_KEYS.proker, rows)
  return rows
}

async function appendToSheets(row) {
  await getSheets().spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetRange(),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[row.timestamp, row.nama, row.no_hp, row.jurusan]] },
  })
}

async function queueFailedMember(row) {
  await kv.rpush(KV_KEYS.failedMembers, row)
}

export async function retryFailedMembers() {
  if (!isKvEnabled() || !isSheetsEnabled()) return 0
  let retried = 0
  for (let attempt = 0; attempt < 10; attempt++) {
    const row = await kv.lpop(KV_KEYS.failedMembers)
    if (!row) break
    try {
      await appendToSheets(row)
      retried++
    } catch {
      await kv.rpush(KV_KEYS.failedMembers, row)
      break
    }
  }
  return retried
}

export async function addMemberToSheets(row) {
  if (!isSheetsEnabled()) return null
  await retryFailedMembers()
  try {
    await appendToSheets(row)
    membersCache = { expiresAt: 0, rows: null }
    return { ...row, queued: false }
  } catch (error) {
    if (!isKvEnabled()) throw error
    await queueFailedMember(row)
    return { ...row, queued: true }
  }
}

export async function cloudMembers(limit = 100) {
  if (!isSheetsEnabled()) return null
  if (membersCache.rows && Date.now() < membersCache.expiresAt) return membersCache.rows.slice(0, limit)
  const response = await getSheets().spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: sheetRange(),
  })
  const values = response.data.values || []
  const rows = values.slice(1).filter((parts) => parts.length >= 4).map(([timestamp, nama, no_hp, jurusan]) => ({ timestamp, nama, no_hp, jurusan })).reverse()
  membersCache = { expiresAt: Date.now() + CACHE_TTL, rows }
  return rows.slice(0, limit)
}
