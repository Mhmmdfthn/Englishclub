import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import { isDbEnabled, getDb } from './pg.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercelAuth = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  __dirname.includes('task') ||
  __dirname.startsWith('/var')
)
const origDataDirAuth = join(__dirname, '../data')
let dataDir = isVercelAuth ? join('/tmp', 'data') : origDataDirAuth

try {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
} catch (e) {
  dataDir = join('/tmp', 'data')
  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }) } catch {}
}
const adminsPath = join(dataDir, 'admins.json')

if (isVercelAuth) {
  try {
    const origAdmins = join(origDataDirAuth, 'admins.json')
    if (!existsSync(adminsPath) && existsSync(origAdmins)) {
      writeFileSync(adminsPath, readFileSync(origAdmins, 'utf-8'), 'utf-8')
    }
  } catch (e) {
    console.error('Auth seed copy failed:', e.message)
  }
}

function loadAdmins() {
  if (!existsSync(adminsPath)) return []
  try { return JSON.parse(readFileSync(adminsPath, 'utf-8')) } catch { return [] }
}
function saveAdmins(arr) {
  writeFileSync(adminsPath, JSON.stringify(arr, null, 2), 'utf-8')
}

// persistent tokens: file + memory (fallback) or DB
const tokensPath = join(dataDir, 'tokens.json')
const TTL = 8 * 3600 * 1000

function loadTokens() {
  if (isDbEnabled()) return new Map() // DB will be used, not file
  if (!existsSync(tokensPath)) return new Map()
  try {
    const arr = JSON.parse(readFileSync(tokensPath, 'utf-8'))
    const m = new Map()
    for (const { token, username, exp } of arr) {
      if (Date.now() < exp) m.set(token, { username, exp })
    }
    return m
  } catch { return new Map() }
}
function saveTokens() {
  if (isDbEnabled()) return // DB handles
  const arr = [...tokens.entries()].map(([token, { username, exp }]) => ({ token, username, exp }))
  try { writeFileSync(tokensPath, JSON.stringify(arr, null, 2), 'utf-8') } catch (e) {
    console.error('Auth saveTokens failed:', e.message)
  }
}

const tokens = loadTokens()

export function getAdmin(username) {
  if (isDbEnabled()) {
    // sync fallback not possible, use async version getAdminAsync
    return loadAdmins().find(a => a.username === username) || null
  }
  return loadAdmins().find(a => a.username === username) || null
}

export async function getAdminAsync(username) {
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT username, password_hash, created_at FROM admins WHERE username=$1', [username])
    return rows[0] || null
  }
  return getAdmin(username)
}

export async function createAdmin(username, password) {
  const hash = await bcrypt.hash(password, 10)
  if (isDbEnabled()) {
    const pool = getDb()
    await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING', [username, hash])
    return { username }
  }
  const arr = loadAdmins()
  if (arr.find(a => a.username === username)) throw new Error('Username sudah ada')
  arr.push({ username, password_hash: hash, created_at: new Date().toISOString() })
  saveAdmins(arr)
  return { username }
}

export async function verifyPassword(username, password) {
  if (isDbEnabled()) {
    const adm = await getAdminAsync(username)
    if (!adm) return false
    return bcrypt.compare(password, adm.password_hash)
  }
  const adm = getAdmin(username)
  if (!adm) return false
  return bcrypt.compare(password, adm.password_hash)
}

export async function issueToken(username) {
  const token = randomBytes(24).toString('base64url')
  const exp = Date.now() + TTL
  if (isDbEnabled()) {
    const pool = getDb()
    await pool.query('INSERT INTO tokens (token, username, exp) VALUES ($1,$2,$3)', [token, username, new Date(exp)])
  } else {
    tokens.set(token, { username, exp })
    saveTokens()
  }
  return token
}

export async function verifyTokenAsync(token) {
  if (!token) return null
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT username, exp FROM tokens WHERE token=$1', [token])
    if (!rows.length) return null
    const exp = new Date(rows[0].exp).getTime()
    if (Date.now() > exp) {
      await pool.query('DELETE FROM tokens WHERE token=$1', [token])
      return null
    }
    return rows[0].username
  }
  return verifyToken(token)
}

export function verifyToken(token) {
  if (!token) return null
  const v = tokens.get(token)
  if (!v) return null
  if (Date.now() > v.exp) { tokens.delete(token); saveTokens(); return null }
  return v.username
}

export async function revokeToken(token) {
  if (isDbEnabled()) {
    const pool = getDb()
    await pool.query('DELETE FROM tokens WHERE token=$1', [token])
    return
  }
  tokens.delete(token)
  saveTokens()
}

export async function ensureSeed() {
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT COUNT(*) FROM admins')
    if (parseInt(rows[0].count, 10) === 0) {
      const hash = await bcrypt.hash('ec2026onlyblue', 10)
      await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1,$2)', ['admin', hash])
      console.log('Seeded admin in DB: admin / ec2026onlyblue')
    }
    return
  }
  const arr = loadAdmins()
  if (arr.length === 0) {
    await createAdmin('admin', 'ec2026onlyblue')
    console.log('Seeded admin: admin / ec2026onlyblue')
  }
}

export function listAdmins() {
  return loadAdmins().map(a => ({ username: a.username, created_at: a.created_at }))
}
