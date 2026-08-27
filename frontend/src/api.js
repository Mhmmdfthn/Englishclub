async function req(url, options, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let res
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    })
  } catch (err) {
    const e = new Error(
      err && err.name === 'AbortError'
        ? 'Server tidak merespons (terlalu lama).'
        : 'Tidak dapat terhubung ke server.',
    )
    e.network = true
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  startGame: () => req('/api/game', { method: 'POST' }),

  submitWord: (sessionId, path) =>
    req(`/api/game/${sessionId}/word`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  topScores: () => req('/api/leaderboard'),

  saveScore: (name, score, words) =>
    req('/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ name, score, words }),
    }),

  stories: () => req('/api/stories'),

  addStory: (name, batch, comment) =>
    req('/api/stories', {
      method: 'POST',
      body: JSON.stringify({ name, batch, comment }),
    }),
}
