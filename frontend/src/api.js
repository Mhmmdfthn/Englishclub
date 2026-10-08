async function req(url, options, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let res
  try {
    res = await fetch(url, {
      headers: options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
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
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const error = new Error(payload?.error || payload?.detail || `HTTP ${res.status}`)
    error.status = res.status
    throw error
  }
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
    }, 20000),
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
    }, 20000),
  addProkerMedia: (data, file, token) =>
    req('/api/proker', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: buildForm(data, file),
    }, 30000),
  updateProkerMedia: (id, data, file, token) =>
    req(`/api/proker/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: buildForm(data, file),
    }, 30000),
  spinner: () => req('/api/spinner'),
  updateSpinner: (prizes, token) =>
    req('/api/spinner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prizes }),
    }, 10000),
  claimPrize: (storyId, prize_won) =>
    req(`/api/stories/${storyId}/prize`, {
      method: 'PATCH',
      body: JSON.stringify({ prize_won }),
    }),

  memberRegister: (fullname, username, password) =>
    req('/api/members-auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullname, username, password }),
    }),

  memberLogin: (username, password) =>
    req('/api/members-auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  memberMe: (token) =>
    req('/api/members-auth/me', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  whitelist: (token, q = '') =>
    req(`/api/members-auth/whitelist${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  whitelistAdd: (names, token, group_name = '') =>
    req('/api/members-auth/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ names, group_name }),
    }),

  whitelistUpdateGroup: (id, group_name, token) =>
    req(`/api/members-auth/whitelist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ group_name }),
    }),

  whitelistImport: (file, token) => {
    const fd = new FormData()
    fd.append('file', file)
    return req('/api/members-auth/whitelist/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }, 30000)
  },

  whitelistTemplate: (token) =>
    fetch('/api/members-auth/whitelist/template', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_whitelist_ec.csv'
      a.click()
      URL.revokeObjectURL(url)
    }),

  memberGroups: () => req('/api/members-auth/groups'),

  whitelistDelete: (id, token) =>
    req(`/api/members-auth/whitelist/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  memberAccounts: (token, q = '') =>
    req(`/api/members-auth/accounts${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  memberResetPassword: (id, newPassword, token) =>
    req(`/api/members-auth/accounts/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newPassword }),
    }),

  // True/false apakah username member ini terdaftar di allowlist admin.
  adminCheckMember: (token) =>
    req('/api/admin/check-member', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),
}

function buildForm(data, file) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) fd.append(k, v ?? '')
  if (file) fd.append('image', file)
  return fd
}
