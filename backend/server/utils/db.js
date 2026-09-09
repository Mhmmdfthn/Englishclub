import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isDbEnabled, getDb } from './pg.js'
import { cloudAddScore, cloudAddStory, cloudLatestStories, cloudTopScores, isKvEnabled } from './cloudStore.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const origDataDir = join(__dirname, '../data')
const dataDir = isVercel ? join('/tmp', 'data') : origDataDir

try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }) } catch {}
if (isVercel) {
  for (const f of ['scores.json','stories.json']) {
    try {
      const orig = join(origDataDir, f)
      const dest = join(dataDir, f)
      if (!existsSync(dest) && existsSync(orig)) {
        writeFileSync(dest, readFileSync(orig, 'utf-8'), 'utf-8')
      }
    } catch {}
  }
}

function loadJson(file, fallback) {
  const p = join(dataDir, file)
  if (!existsSync(p)) return fallback
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return fallback }
}
function saveJson(file, data) {
  writeFileSync(join(dataDir, file), JSON.stringify(data, null, 2), 'utf-8')
}

export const db = {
  getScores() { return loadJson('scores.json', []) },
  async addScore(name, score, words) {
    if (isKvEnabled()) return cloudAddScore(name, score, words)
    if (isDbEnabled()) {
      const pool = getDb()
      await pool.query('INSERT INTO scores (name, score, words) VALUES ($1,$2,$3)', [name.slice(0,20), score, words])
      const { rows } = await pool.query('SELECT COUNT(*) FROM scores WHERE score > $1', [score])
      return parseInt(rows[0].count, 10) + 1
    }
    const arr = loadJson('scores.json', [])
    arr.push({ name: name.slice(0, 20), score, words, created_at: new Date().toISOString() })
    saveJson('scores.json', arr)
    const better = arr.filter(s => s.score > score).length
    return better + 1
  },
  async top(limit = 10) {
    if (isKvEnabled()) return cloudTopScores(limit)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('SELECT name, score, words, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT $1', [limit])
      return rows
    }
    const arr = loadJson('scores.json', [])
    return [...arr].sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at)).slice(0, limit)
  },
  getStories() { return loadJson('stories.json', []) },
  async addStory(name, batch, comment) {
    if (isKvEnabled()) return cloudAddStory(name, batch, comment)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('INSERT INTO stories (name, batch, comment) VALUES ($1,$2,$3) RETURNING name, batch, comment', [name.slice(0,40), batch.slice(0,30), comment.slice(0,220)])
      return rows[0]
    }
    const arr = loadJson('stories.json', [])
    const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
    arr.push(row)
    saveJson('stories.json', arr)
    return row
  },
  async latest(limit = 100) {
    if (isKvEnabled()) return cloudLatestStories(limit)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('SELECT name, batch, comment FROM stories ORDER BY id DESC LIMIT $1', [limit])
      return rows
    }
    const arr = loadJson('stories.json', [])
    return [...arr].reverse().slice(0, limit).map(r => ({ name: r.name, batch: r.batch, comment: r.comment }))
  },
}
