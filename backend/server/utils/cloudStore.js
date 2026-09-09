import { kv } from '@vercel/kv'
import { google } from 'googleapis'

const KV_KEYS = { scores: 'leaderboard', stories: 'stories', proker: 'proker', failedMembers: 'failed_members_queue' }
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

async function readKvList(key) {
  const value = await kv.get(key)
  return Array.isArray(value) ? value : []
}

export async function cloudTopScores(limit = 10) {
  const rows = await readKvList(KV_KEYS.scores)
  return rows
    .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at))
    .slice(0, limit)
}

export async function cloudAddScore(name, score, words) {
  const row = { name: name.slice(0, 20), score, words, created_at: new Date().toISOString() }
  await kv.lpush(KV_KEYS.scores, row)
  await kv.ltrim(KV_KEYS.scores, 0, 9999)
  const rows = await readKvList(KV_KEYS.scores)
  return rows.filter((item) => item.score > score).length + 1
}

export async function cloudLatestStories(limit = 100) {
  return (await readKvList(KV_KEYS.stories)).slice(0, limit).map(({ name, batch, comment }) => ({ name, batch, comment }))
}

export async function cloudAddStory(name, batch, comment) {
  const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
  await kv.lpush(KV_KEYS.stories, row)
  await kv.ltrim(KV_KEYS.stories, 0, 9999)
  return row
}

export async function cloudGetProker() {
  return readKvList(KV_KEYS.proker)
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
