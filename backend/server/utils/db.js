import { getSupabase, isSupabaseEnabled } from './supabase.js'
import { withWIB } from './time.js'

let memoryScores = []
let memoryStories = []

export const db = {
  getScores() {
    return memoryScores
  },
  async addScore(name, score, words) {
    if (isSupabaseEnabled()) {
      const sb = getSupabase()
      const { error } = await sb.from('scores').insert({
        name: name.slice(0, 20),
        score,
        words,
      })
      if (error) throw new Error('Database sibuk, silakan coba lagi')
      const { count } = await sb.from('scores').select('id', { count: 'exact', head: true }).gt('score', score)
      return (count ?? 0) + 1
    }
    const row = { name: name.slice(0, 20), score, words, created_at: new Date().toISOString() }
    memoryScores.push(row)
    const better = memoryScores.filter(s => s.score > score).length
    return better + 1
  },
  async top(limit = 10) {
    if (isSupabaseEnabled()) {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('scores')
        .select('name, score, words, created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit)
      if (error) throw new Error('Database sibuk, silakan coba lagi')
      return withWIB(data)
    }
    return withWIB([...memoryScores].sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at)).slice(0, limit))
  },
  getStories() {
    return memoryStories
  },
  async addStory(name, batch, comment) {
    if (isSupabaseEnabled()) {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('stories')
        .insert({ name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220) })
        .select('name, batch, comment, created_at')
        .single()
      if (error) throw new Error('Database sibuk, silakan coba lagi')
      return data
    }
    const row = { name: name.slice(0, 40), batch: batch.slice(0, 30), comment: comment.slice(0, 220), created_at: new Date().toISOString() }
    memoryStories.push(row)
    return row
  },
  async latest(limit = 100) {
    if (isSupabaseEnabled()) {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('stories')
        .select('name, batch, comment, prize_won, created_at')
        .order('id', { ascending: false })
        .limit(limit)
      if (error) throw new Error('Database sibuk, silakan coba lagi')
      return withWIB(data.map(({ name, batch, comment, created_at }) => ({ name, batch, comment, created_at })))
    }
    return withWIB([...memoryStories].reverse().slice(0, limit).map(r => ({ name: r.name, batch: r.batch, comment: r.comment, created_at: r.created_at })))
  },
  async updateStoryPrize(id, prize_won) {
    // Tetap match by `name` (kompatibel perilaku lama + Testimonials.vue).
    if (isSupabaseEnabled()) {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('stories')
        .update({ prize_won })
        .eq('name', id)
        .select('name, batch, comment, prize_won, created_at')
      if (error) throw new Error('Database sibuk, silakan coba lagi')
      return data?.[0] || null
    }
    const idx = memoryStories.findIndex(r => r.name === id)
    if (idx === -1) return null
    memoryStories[idx].prize_won = prize_won
    return { name: memoryStories[idx].name, batch: memoryStories[idx].batch, comment: memoryStories[idx].comment, prize_won, created_at: memoryStories[idx].created_at }
  },
}
