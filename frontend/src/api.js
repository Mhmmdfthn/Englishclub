async function req(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
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
}
