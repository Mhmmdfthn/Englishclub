import { isDbEnabled, getDb } from './pg.js'
import { cloudAddScore, cloudAddStory, cloudLatestStories, cloudTopScores, isKvEnabled } from './cloudStore.js'

let memoryScores = []
let memoryStories = []

export const db = {
  getScores() {
    return memoryScores
  },
  async addScore(name, score, words) {
    if (isKvEnabled()) return cloudAddScore(name, score, words)
    if (isDbEnabled()) {
      const pool = getDb()
      await pool.query('INSERT INTO scores (name, score, words) VALUES ($1,$2,$3)', [name.slice(0, 20), score, words])
      const { rows } = await pool.query('SELECT COUNT(*) FROM scores WHERE score > $1', [score])
      return parseInt(rows[0].count, 10) + 1
    }
    const row = { name: name.slice(0, 20), score, words, created_at: new Date().toISOString() }
    memoryScores.push(row)
    const better = memoryScores.filter(s => s.score > score).length
    return better + 1
  },
  async top(limit = 10) {
    if (isKvEnabled()) return cloudTopScores(limit)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('SELECT name, score, words, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT $1', [limit])
      return rows
    }
    return [...memoryScores].sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at)).slice(0, limit)
  },
  getStories() {
    return memoryStories
  },
  async addStory(name, batch, comment) {
    if (isKvEnabled()) return cloudAddStory(name, batch, comment)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('INSERT INTO stories (name, batch, comment) VALUES ($1,$2,$3) RETURNING name, batch, comment', [name.slice(0, 40), batch.slice(0, 30), comment.slice(0, 220)])
      return rows[0]
    }
    const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
    memoryStories.push(row)
    return row
  },
  async latest(limit = 100) {
    if (isKvEnabled()) return cloudLatestStories(limit)
    if (isDbEnabled()) {
      const pool = getDb()
      const { rows } = await pool.query('SELECT name, batch, comment FROM stories ORDER BY id DESC LIMIT $1', [limit])
      return rows
    }
    return [...memoryStories].reverse().slice(0, limit).map(r => ({ name: r.name, batch: r.batch, comment: r.comment }))
  },
}
