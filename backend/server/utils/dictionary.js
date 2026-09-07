import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VALID_DATA = join(__dirname, '../data/words.txt') // will resolve correctly via server/data
// correct paths: server/utils -> ../data
const _validPath = join(__dirname, '../data/valid_words.txt')
const _seedPath = join(__dirname, '../data/words.txt')

export const LETTER_VALUES = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4,
  i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3,
  q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8,
  y: 4, z: 10,
}

function weightedChoice(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

class Dictionary {
  constructor() {
    let validList = []
    if (existsSync(_validPath)) {
      validList = readFileSync(_validPath, 'utf-8').split(/\s+/).filter(Boolean)
    }
    let seedList = []
    if (existsSync(_seedPath)) {
      seedList = readFileSync(_seedPath, 'utf-8').split(/\s+/).filter(Boolean)
    }
    const allWords = new Set([...validList, ...seedList])
    this.words = new Set(allWords)
    this.seed_words = seedList.length ? seedList : validList
    this.seed_set = new Set(this.seed_words)

    const prefixes = new Set()
    for (const w of this.words) {
      for (let n = 1; n <= w.length; n++) prefixes.add(w.slice(0, n))
    }
    this.prefixes = prefixes

    const freq = {}
    for (const w of this.seed_words) for (const ch of w) freq[ch] = (freq[ch] || 0) + 1
    this._freq = freq
    this._letters = Object.keys(freq).sort()
    this._weights = this._letters.map(c => freq[c])
    this._vowelLetters = this._letters.filter(c => 'aeiou'.includes(c))
    this._vowelWeights = this._vowelLetters.map(c => freq[c])
    this._consLetters = this._letters.filter(c => !'aeiou'.includes(c))
    this._consWeights = this._consLetters.map(c => freq[c])

    this.by_length = {}
    for (const w of this.seed_words) {
      const l = w.length
      if (!this.by_length[l]) this.by_length[l] = []
      this.by_length[l].push(w)
    }
  }

  is_word(word) {
    return this.words.has(word.toLowerCase())
  }

  random_word(min_len = 3, max_len = 6) {
    let pool = []
    for (let n = min_len; n <= max_len; n++) {
      if (this.by_length[n]) pool.push(...this.by_length[n])
    }
    if (!pool.length) pool = [...this.seed_words]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  random_letter() {
    return weightedChoice(this._letters, this._weights)
  }

  random_vowel() {
    if (!this._vowelLetters.length) return this.random_letter()
    return weightedChoice(this._vowelLetters, this._vowelWeights)
  }

  random_consonant() {
    if (!this._consLetters.length) return this.random_letter()
    return weightedChoice(this._consLetters, this._consWeights)
  }
}

export const dictionary = new Dictionary()
