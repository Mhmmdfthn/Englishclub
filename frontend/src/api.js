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

async function reqText(url, timeout = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  startGame: () => req('/api/game', { method: 'POST' }),

  dictionary: async () => (await reqText('/api/game/dictionary')).split(/\s+/).filter(Boolean),

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

  registerMember: (nama, no_hp, jurusan) =>
    req('/api/members', {
      method: 'POST',
      body: JSON.stringify({ nama, no_hp, jurusan }),
    }),

  members: (token) =>
    req('/api/members', {
      headers: token ? { 'Content-Type': 'application/json', 'x-admin-token': token } : { 'Content-Type': 'application/json' },
    }),

  verifyAdmin: (token) =>
    req('/api/admin/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  loginAdmin: (username, password) =>
    req('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  membersHighlight: () => req('/api/members/highlight'),

  proker: () => req('/api/proker'),
  prokerDetail: (id) => req(`/api/proker/${id}`),
  addProker: (data, token) =>
    req('/api/proker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
  deleteProker: (id, token) =>
    req(`/api/proker/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),
  updateProkerCaption: (id, caption, token) =>
    req(`/api/proker/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ caption }),
    }),
  updateProker: (id, data, token) =>
    req(`/api/proker/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
}
