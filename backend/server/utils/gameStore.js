import { randomBytes } from 'crypto'
import { generate_grid, refill_cells, CELLS, NEIGHBORS } from './grid.js'
import { dictionary, LETTER_VALUES } from './dictionary.js'

export const BASE_TIME = 60.0
export const SESSION_TTL = 3 * 3600
export const COMBO_CAP = 10
const MIN_WORD_LEN = 3

const sessions = new Map()

function purge() {
  const now = Date.now() / 1000
  for (const [sid, s] of sessions) {
    if (now - s.touched > SESSION_TTL) sessions.delete(sid)
  }
}

export function create_session() {
  purge()
  const id = randomBytes(9).toString('base64url')
  const grid = generate_grid()
  const now = Date.now() / 1000
  const session = {
    id,
    grid,
    score: 0,
    combo: 1,
    best_combo: 1,
    found: {},
    words_found: 0,
    longest_word: '',
    ends_at: now + BASE_TIME,
    touched: now,
  }
  sessions.set(id, session)
  return session
}

export function get_session(sid) {
  const s = sessions.get(sid)
  if (s) s.touched = Date.now() / 1000
  return s || null
}

export function submit_word(session, path) {
  function fail(reason) {
    session.combo = 1
    return { ok: false, reason }
  }
  const now = Date.now() / 1000
  if (now > session.ends_at) return fail('expired')
  if (path.length < MIN_WORD_LEN) return fail('too_short')
  if (new Set(path).size !== path.length || path.some(i => i < 0 || i >= CELLS)) return fail('invalid_path')
  for (let i = 0; i < path.length - 1; i++) {
    if (!NEIGHBORS[path[i]].includes(path[i + 1])) return fail('invalid_path')
  }
  const word = path.map(i => session.grid[i]).join('')
  if (!dictionary.is_word(word)) return fail('not_a_word')
  if (word in session.found) return fail('already_found')

  const comboApplied = session.combo
  const letterSum = [...word].reduce((a, ch) => a + (LETTER_VALUES[ch] || 1), 0)
  const basePoints = letterSum * word.length * 2
  const feverBonus = comboApplied >= 3 ? (comboApplied - 2) * 50 : 0
  const points = basePoints * comboApplied + feverBonus

  const pre = [...session.grid]
  const changed = refill_cells(session.grid, [...new Set(path)].sort((a, b) => a - b))

  // evict stale found where grid changed
  const newFound = {}
  for (const [w, p] of Object.entries(session.found)) {
    if (p.every(idx => session.grid[idx] === pre[idx])) newFound[w] = p
  }
  session.found = newFound
  session.found[word] = [...path]

  session.combo = Math.min(session.combo + 1, COMBO_CAP)
  session.best_combo = Math.max(session.best_combo, comboApplied)
  session.score += points
  session.words_found += 1
  if (word.length > session.longest_word.length) session.longest_word = word

  return {
    ok: true,
    word,
    points,
    combo: comboApplied,
    combo_next: session.combo,
    fever: comboApplied >= 3,
    time_bonus: 0,
    score: session.score,
    cells: changed.sort((a, b) => a - b).map(i => ({ index: i, letter: session.grid[i] })),
    remaining: Math.round(Math.max(0, session.ends_at - Date.now() / 1000) * 100) / 100,
  }
}

export function stats(session) {
  return { score: session.score, words_found: session.words_found, longest_word: session.longest_word, best_combo: session.best_combo }
}
