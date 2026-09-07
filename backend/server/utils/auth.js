import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const adminsPath = join(dataDir, 'admins.json')

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

function loadAdmins() {
  if (!existsSync(adminsPath)) return []
  try { return JSON.parse(readFileSync(adminsPath, 'utf-8')) } catch { return [] }
}
function saveAdmins(arr) {
  writeFileSync(adminsPath, JSON.stringify(arr, null, 2), 'utf-8')
}

// persistent tokens: file + memory
const tokensPath = join(dataDir, 'tokens.json')
const TTL = 8 * 3600 * 1000

function loadTokens() {
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
  const arr = [...tokens.entries()].map(([token, { username, exp }]) => ({ token, username, exp }))
  writeFileSync(tokensPath, JSON.stringify(arr, null, 2), 'utf-8')
}

const tokens = loadTokens()

export function getAdmin(username) {
  return loadAdmins().find(a => a.username === username) || null
}

export async function createAdmin(username, password) {
  const hash = await bcrypt.hash(password, 10)
  const arr = loadAdmins()
  if (arr.find(a => a.username === username)) throw new Error('Username sudah ada')
  arr.push({ username, password_hash: hash, created_at: new Date().toISOString() })
  saveAdmins(arr)
  return { username }
}

export async function verifyPassword(username, password) {
  const adm = getAdmin(username)
  if (!adm) return false
  return bcrypt.compare(password, adm.password_hash)
}

export function issueToken(username) {
  const token = randomBytes(24).toString('base64url')
  tokens.set(token, { username, exp: Date.now() + TTL })
  saveTokens()
  return token
}

export function verifyToken(token) {
  if (!token) return null
  const v = tokens.get(token)
  if (!v) return null
  if (Date.now() > v.exp) { tokens.delete(token); saveTokens(); return null }
  return v.username
}

export function revokeToken(token) {
  tokens.delete(token)
  saveTokens()
}

// seed 1 akun jika belum ada — panggil di server start
export async function ensureSeed() {
  const arr = loadAdmins()
  if (arr.length === 0) {
    // default 1 akun: admin / ec2026onlyblue
    await createAdmin('admin', 'ec2026onlyblue')
    console.log('Seeded admin: admin / ec2026onlyblue')
  }
}

export function listAdmins() {
  return loadAdmins().map(a => ({ username: a.username, created_at: a.created_at }))
}
