import { dictionary } from './dictionary.js'

export const SIZE = 5
export const CELLS = SIZE * SIZE
export const MIN_WORD_LEN = 3
export const MAX_WORD_LEN = SIZE
export const TARGET_VOWELS = 10
export const MIN_FAMILIAR_WORDS = 5

export const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildNeighbors() {
  const neighbors = []
  for (let i = 0; i < CELLS; i++) {
    const r = Math.floor(i / SIZE), c = i % SIZE
    const cell = []
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) cell.push(nr * SIZE + nc)
    }
    neighbors.push(cell)
  }
  return neighbors
}

export const NEIGHBORS = buildNeighbors()

function tryPlantStraight(grid, word, { mustInclude = null, allowOverlap = true, maxCollateral = 0 } = {}) {
  const dirs = shuffle(DIRECTIONS)
  const starts = shuffle([...Array(CELLS).keys()])
  let best = null
  let bestCost = maxCollateral + 1
  for (const start of starts) {
    const r0 = Math.floor(start / SIZE), c0 = start % SIZE
    for (const [dr, dc] of dirs) {
      const path = []
      let cost = 0
      let ok = true
      for (let k = 0; k < word.length; k++) {
        const r = r0 + dr * k, c = c0 + dc * k
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) { ok = false; break }
        const idx = r * SIZE + c
        const ch = grid[idx]
        if (ch) {
          if (!allowOverlap) { ok = false; break }
          if (ch !== word[k]) {
            cost += 1
            if (cost >= bestCost) { ok = false; break }
          }
        }
        path.push(idx)
      }
      if (ok && path.length === word.length) {
        if (mustInclude && !path.some(i => mustInclude.has(i))) continue
        if (maxCollateral === 0) return path
        if (cost < bestCost) {
          best = path; bestCost = cost
          if (bestCost === 0) return best
        }
      }
    }
  }
  return best
}

function writePath(grid, path, word) {
  for (let i = 0; i < path.length; i++) grid[path[i]] = word[i]
}

function seedPool() {
  const pool = dictionary.seed_words.filter(w => w.length >= MIN_WORD_LEN && w.length <= MAX_WORD_LEN)
  return shuffle(pool)
}

function countStraightSeedWords(grid) {
  const found = new Set()
  const seedSet = dictionary.seed_set
  for (let start = 0; start < CELLS; start++) {
    const r0 = Math.floor(start / SIZE), c0 = start % SIZE
    for (const [dr, dc] of DIRECTIONS) {
      let word = ''
      for (let k = 0; k < MAX_WORD_LEN; k++) {
        const r = r0 + dr * k, c = c0 + dc * k
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) break
        word += grid[r * SIZE + c]
        if (word.length >= MIN_WORD_LEN && seedSet.has(word)) found.add(word)
      }
    }
  }
  return found.size
}

export function ensure_familiar_words(grid, minWords = MIN_FAMILIAR_WORDS, rounds = [[35, 0], [25, 1], [25, 2]]) {
  for (const [attempts, collateral] of rounds) {
    let used = 0
    while (used < attempts && countStraightSeedWords(grid) < minWords) {
      used++
      const word = dictionary.random_word(MIN_WORD_LEN, MAX_WORD_LEN)
      const path = tryPlantStraight(grid, word, { maxCollateral: collateral })
      if (!path) continue
      const before = countStraightSeedWords(grid)
      const backup = path.map(i => [i, grid[i]])
      writePath(grid, path, word)
      if (countStraightSeedWords(grid) < before) {
        for (const [i, ch] of backup) grid[i] = ch
      }
    }
  }
}

function fillRandom(grid) {
  const empties = []
  for (let i = 0; i < CELLS; i++) if (!grid[i]) empties.push(i)
  if (!empties.length) return
  const currentVowels = grid.filter(ch => ch && 'aeiou'.includes(ch)).length
  const needVowels = Math.max(0, Math.min(empties.length, TARGET_VOWELS - currentVowels))
  const vowelSlots = needVowels ? new Set(shuffle(empties).slice(0, needVowels)) : new Set()
  for (const i of empties) {
    grid[i] = vowelSlots.has(i) ? dictionary.random_vowel() : dictionary.random_consonant()
  }
}

function rebalanceVowels(grid) {
  const vowels = grid.filter(ch => ch && 'aeiou'.includes(ch)).length
  let need = TARGET_VOWELS - 1 - vowels
  if (need <= 0) return
  const consonantCells = []
  for (let i = 0; i < CELLS; i++) if (grid[i] && !'aeiou'.includes(grid[i])) consonantCells.push(i)
  const shuffled = shuffle(consonantCells)
  for (const idx of shuffled) {
    if (need <= 0) break
    const old = grid[idx]
    const before = countStraightSeedWords(grid)
    grid[idx] = dictionary.random_vowel()
    if (countStraightSeedWords(grid) < before) grid[idx] = old
    else need--
  }
}

export function generate_grid() {
  let bestGrid = []
  let bestPlanted = 0
  for (let t = 0; t < 15; t++) {
    const grid = Array(CELLS).fill('')
    let planted = 0
    const pool = seedPool()
    const candidates = shuffle(pool).slice(0, Math.min(pool.length, 14))
    // need random.sample(pool,14) — we did shuffle slice
    for (const word of candidates) {
      if (planted >= 8) break
      const path = tryPlantStraight(grid, word, { allowOverlap: false })
      if (path) { writePath(grid, path, word); planted++ }
    }
    fillRandom(grid)
    if (planted > bestPlanted) {
      bestPlanted = planted
      bestGrid = [...grid]
      if (planted >= 7) break
    }
  }
  if (!bestGrid.length) bestGrid = Array.from({ length: CELLS }, () => dictionary.random_letter())
  ensure_familiar_words(bestGrid)
  fillRandom(bestGrid)
  rebalanceVowels(bestGrid)
  return bestGrid
}

export function refill_cells(grid, indices) {
  if (!indices.length) return []
  const snapshot = grid.join('')
  const freed = new Set(indices)
  for (const idx of indices) grid[idx] = ''
  let pool = seedPool()
  let pos = 0
  function nextWord() {
    if (pos < pool.length) return pool[pos++]
    return null
  }
  const tiers = [[60, 0], [60, 1], [80, 2]]
  let planted = 0
  for (const [maxTries, collateral] of tiers) {
    let tries = 0
    while (planted < 2 && tries < maxTries && pos < pool.length) {
      tries++
      const word = nextWord()
      if (!word) break
      const path = tryPlantStraight(grid, word, { mustInclude: freed, maxCollateral: collateral })
      if (path) { writePath(grid, path, word); planted++ }
    }
    if (planted >= 2) break
  }
  if (planted === 0) {
    for (let i = pos; i < pool.length; i++) {
      const word = pool[i]
      const path = tryPlantStraight(grid, word, { maxCollateral: 2 })
      if (path) { writePath(grid, path, word); break }
    }
  }
  ensure_familiar_words(grid)
  fillRandom(grid)
  rebalanceVowels(grid)
  const changed = []
  for (let i = 0; i < CELLS; i++) if (snapshot[i] !== grid[i]) changed.push(i)
  return changed
}

export function find_word_paths(grid, limit = 50, maxLen = 6, budget = 80000) {
  const results = []
  const seen = new Set()
  let remaining = budget
  function dfs(idx, prefix, path, visited) {
    if (remaining <= 0) return true
    remaining--
    const word = prefix + grid[idx]
    if (!dictionary.prefixes.has(word)) return false
    path.push(idx)
    if (word.length >= MIN_WORD_LEN && dictionary.words.has(word) && !seen.has(word)) {
      seen.add(word)
      results.push([word, [...path]])
      if (results.length >= limit) return true
    }
    if (word.length < maxLen) {
      const nxtList = shuffle([...NEIGHBORS[idx]])
      for (const nxt of nxtList) {
        if (visited.has(nxt)) continue
        visited.add(nxt)
        if (dfs(nxt, word, path, visited)) return true
        visited.delete(nxt)
      }
    }
    path.pop()
    return false
  }
  const order = shuffle([...Array(CELLS).keys()])
  for (const start of order) {
    if (dfs(start, '', [], new Set([start]))) break
  }
  return results
}
