import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const origDataDir = join(__dirname, '../data')
const dataDir = isVercel ? join('/tmp', 'data') : origDataDir

try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }) } catch {}
// copy seed files to /tmp on Vercel if missing
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

// simple JSON file DB for backup (no native sqlite needed)
// Keep compatible with Python sqlite schema but using JSON files
import { readFileSync, writeFileSync } from 'fs'

function loadJson(file, fallback) {
  const p = join(dataDir, file)
  if (!existsSync(p)) return fallback
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return fallback }
}
function saveJson(file, data) {
  writeFileSync(join(dataDir, file), JSON.stringify(data, null, 2), 'utf-8')
}

export const db = {
  // scores: [{name,score,words,created_at}]
  getScores() { return loadJson('scores.json', []) },
  addScore(name, score, words) {
    const arr = loadJson('scores.json', [])
    arr.push({ name: name.slice(0, 20), score, words, created_at: new Date().toISOString() })
    saveJson('scores.json', arr)
    const better = arr.filter(s => s.score > score).length
    return better + 1
  },
  top(limit = 10) {
    const arr = loadJson('scores.json', [])
    return [...arr].sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at)).slice(0, limit)
  },
  getStories() { return loadJson('stories.json', []) },
  addStory(name, batch, comment) {
    const arr = loadJson('stories.json', [])
    const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
    arr.push(row)
    saveJson('stories.json', arr)
    return row
  },
  latest(limit = 100) {
    const arr = loadJson('stories.json', [])
    return [...arr].reverse().slice(0, limit).map(r => ({ name: r.name, batch: r.batch, comment: r.comment }))
  },
}
