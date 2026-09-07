<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const authed = ref(false)
const authedUser = ref('')
const error = ref('')
const members = ref([])
const loading = ref(false)
const filter = ref('')
const activeTab = ref('members')
const proker = ref([])
const prokerLoading = ref(false)
const captionDraft = ref({})
const titleDraft = ref({})
const galleryUploading = ref({})

async function checkAuth() {
  const t = localStorage.getItem('admin_token') || ''
  if (!t) { authed.value = false; return }
  try {
    const r = await api.verifyAdmin(t)
    authed.value = true
    authedUser.value = r.username || 'admin'
  } catch {
    localStorage.removeItem('admin_token')
    authed.value = false
  }
}

async function login() {
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) { error.value = 'Username & password wajib'; return }
  loading.value = true
  error.value = ''
  try {
    const r = await api.loginAdmin(u, p)
    localStorage.setItem('admin_token', r.token)
    authed.value = true
    authedUser.value = r.username
    username.value = ''
    password.value = ''
    await Promise.all([fetchMembers(), loadProker()])
  } catch (e) {
    error.value = e?.message?.includes('401') ? 'Username atau password salah' : 'Gagal login'
  } finally { loading.value = false }
}

function logout() {
  const t = localStorage.getItem('admin_token')
  if (t) fetch('/api/admin/logout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: t }) }).catch(()=>{})
  localStorage.removeItem('admin_token')
  authed.value = false
  members.value = []
  proker.value = []
  error.value = ''
}

async function fetchMembers() {
  loading.value = true
  error.value = ''
  try {
    const t = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/members', { headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t } })
    if (res.status === 401) { error.value = 'Sesi habis — silakan login lagi'; authed.value = false; localStorage.removeItem('admin_token'); return }
    if (res.status === 500) { error.value = 'Server belum konfigurasi ADMIN_TOKEN'; return }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    members.value = data.members || []
  } catch (e) {
    error.value = e?.message || 'Gagal memuat data'
  } finally { loading.value = false }
}

function exportCsv() {
  const t = localStorage.getItem('admin_token') || ''
  fetch('/api/members/export', { headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t } }).then(async r => {
    if (r.status === 401) { error.value = 'Unauthorized — login lagi'; authed.value = false; return }
    if (!r.ok) { error.value = 'Export gagal'; return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pendaftaran_ec.csv'; a.click()
    URL.revokeObjectURL(url)
  }).catch(() => { error.value = 'Export gagal' })
}

async function loadProker() {
  prokerLoading.value = true
  try {
    const data = await api.proker()
    proker.value = data.proker || []
    proker.value.forEach(p => { captionDraft.value[p.id] = p.caption; titleDraft.value[p.id] = p.title })
  } catch (e) { error.value = 'Gagal muat proker' }
  finally { prokerLoading.value = false }
}

async function saveProker(p) {
  const t = localStorage.getItem('admin_token') || ''
  const cap = captionDraft.value[p.id] || ''
  const ttl = titleDraft.value[p.id] || ''
  if (ttl.trim().length < 3 || ttl.trim().length > 40) { error.value = 'Judul 3-40 karakter'; return }
  if (cap.trim().length < 5 || cap.length > 280) { error.value = 'Caption 5-280 karakter'; return }
  try {
    await api.updateProker(p.id, { title: ttl.trim(), caption: cap.trim() }, t)
    await loadProker()
    error.value = ''
  } catch (e) { error.value = e?.message || 'Gagal simpan proker' }
}

async function uploadGallery(p, event) {
  const files = event.target.files
  if (!files || !files.length) return
  if ((p.photos?.length || 0) + files.length > 3) { error.value = 'Maksimal 3 foto per proker'; return }
  const t = localStorage.getItem('admin_token') || ''
  const fd = new FormData()
  for (const f of files) fd.append('photos', f)
  galleryUploading.value[p.id] = true
  try {
    const res = await fetch(`/api/proker/${p.id}/photos`, { method:'POST', headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t }, body: fd })
    if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.detail || `HTTP ${res.status}`) }
    await loadProker()
  } catch (e) { error.value = e?.message || 'Gagal upload foto' }
  finally { galleryUploading.value[p.id] = false; event.target.value = '' }
}

async function deletePhoto(p, idx) {
  const t = localStorage.getItem('admin_token') || ''
  try {
    const res = await fetch(`/api/proker/${p.id}/photos/${idx}`, { method:'DELETE', headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await loadProker()
  } catch (e) { error.value = 'Gagal hapus foto' }
}

const filtered = computed(() => {
  if (!filter.value) return members.value
  const q = filter.value.toLowerCase()
  return members.value.filter(m => `${m.nama} ${m.jurusan} ${m.no_hp}`.toLowerCase().includes(q))
})

const stats = computed(() => ({
  total: members.value.length,
  byJurusan: [...new Set(members.value.map(m=>m.jurusan))].length,
  today: members.value.filter(m=> m.timestamp?.startsWith(new Date().toISOString().slice(0,10))).length
}))

onMounted(async () => {
  await checkAuth()
  if (authed.value) { await Promise.all([fetchMembers(), loadProker()]) }
})
</script>

<template>
  <section class="admin-shell">
    <!-- Top nav -->
    <nav class="admin-topbar">
      <div class="topbar-left">
        <img src="/Logo_ec.jpg" alt="EC" class="topbar-logo" />
        <span class="topbar-title">ADMIN <b>EC UPB</b></span>
        <span v-if="authed" class="user-chip">{{ authedUser }}</span>
      </div>
      <button class="page-back" type="button" @click="router.push('/')">← Kembali</button>
    </nav>

    <!-- Login -->
    <div v-if="!authed" class="login-wrap">
      <div class="card login-card">
        <div class="login-head">
          <div class="login-icon">EC</div>
          <h2>Masuk Admin</h2>
          <p class="tiny muted">Halaman tersembunyi — hanya akun resmi.</p>
        </div>
        <label class="field-label">Username</label>
        <input v-model="username" class="field" placeholder="admin" :disabled="loading" />
        <label class="field-label">Password</label>
        <input v-model="password" type="password" class="field" placeholder="••••••••" :disabled="loading" @keyup.enter="login" />
        <button class="btn login-btn" :disabled="loading" @click="login">{{ loading ? 'Memeriksa...' : 'Masuk' }}</button>
        <p v-if="error" class="error" style="margin-top:12px;">{{ error }}</p>
        <p class="tiny muted" style="margin-top:10px; text-align:center;">Default: <code>admin / ec2026onlyblue</code></p>
      </div>
    </div>

    <!-- Dashboard -->
    <div v-else class="dashboard">
      <aside class="sidebar">
        <button class="side-item" :class="{active: activeTab==='members'}" @click="activeTab='members'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Pendaftar</span><b class="count">{{ filtered.length }}</b>
        </button>
        <button class="side-item" :class="{active: activeTab==='proker'}" @click="activeTab='proker'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span>Proker</span><b class="count">{{ proker.length }}</b>
        </button>
        <div class="side-spacer"></div>
        <button class="side-item logout" @click="logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Keluar</span>
        </button>
      </aside>

      <main class="main">
        <!-- Members -->
        <div v-if="activeTab==='members'">
          <div class="stats-row">
            <div class="stat-card"><span class="stat-label">Total Pendaftar</span><b class="stat-value">{{ stats.total }}</b><span class="stat-sub">{{ stats.byJurusan }} jurusan</span></div>
            <div class="stat-card accent"><span class="stat-label">Hari Ini</span><b class="stat-value">{{ stats.today }}</b><span class="stat-sub">baru daftar</span></div>
            <div class="stat-card dark"><span class="stat-label">Akses</span><b class="stat-value">{{ authedUser }}</b><span class="stat-sub">admin aktif</span></div>
          </div>

          <div class="toolbar">
            <div class="search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
              <input v-model="filter" class="search" placeholder="Cari nama, jurusan, HP..." />
            </div>
            <button class="btn ghost sm" @click="fetchMembers" :disabled="loading">{{ loading ? 'Memuat...' : 'Refresh' }}</button>
            <button class="btn sm" @click="exportCsv">Download CSV</button>
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <div class="table-card">
            <div class="table-head">
              <span>{{ filtered.length }} entri</span>
              <span class="tiny muted">Diupdate otomatis</span>
            </div>
            <div class="table-wrap">
              <table class="admin-table">
                <thead><tr><th>#</th><th>Nama</th><th>Jurusan</th><th>No HP</th><th>Waktu</th></tr></thead>
                <tbody>
                  <tr v-for="(m,i) in filtered" :key="i">
                    <td class="muted tiny">{{ i+1 }}</td>
                    <td><div class="name-cell"><span class="avatar">{{ m.nama.charAt(0).toUpperCase() }}</span><b>{{ m.nama }}</b></div></td>
                    <td><span class="jurusan-badge">{{ m.jurusan }}</span></td>
                    <td class="tiny">{{ m.no_hp }}</td>
                    <td class="tiny muted">{{ m.timestamp?.slice(0,16).replace('T',' ') }}</td>
                  </tr>
                  <tr v-if="!filtered.length"><td colspan="5" class="empty">Belum ada data / tidak ada hasil filter</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Mobile simple cards -->
          <div class="members-cards">
            <article v-for="(m,i) in filtered" :key="'m-'+i" class="member-card">
              <div class="member-top">
                <span class="avatar sm">{{ m.nama.charAt(0).toUpperCase() }}</span>
                <b class="member-name">{{ m.nama }}</b>
                <span class="jurusan-badge sm">{{ m.jurusan }}</span>
              </div>
              <span class="tiny muted">{{ m.timestamp?.slice(0,16).replace('T',' ') }}</span>
            </article>
            <p v-if="!filtered.length" class="empty">Belum ada data</p>
          </div>
        </div>

        <!-- Proker -->
        <div v-else>
          <div class="toolbar">
            <h2 style="font-size:18px; font-weight:900;">Kelola Proker</h2>
            <span class="tiny muted">Judul 3-40 • Caption 5-280 • Gallery 3 foto • 5MB/foto</span>
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <div v-if="prokerLoading" class="tiny muted">Memuat proker...</div>
          <div class="proker-grid">
            <article v-for="p in proker" :key="p.id" class="proker-card">
              <div class="proker-card-head">
                <span class="id-badge">{{ p.id }}</span>
                <span class="order-badge">#{{ p.order }}</span>
              </div>
              <label class="field-label">Judul</label>
              <input v-model="titleDraft[p.id]" class="field sm" maxlength="40" placeholder="Judul proker..." />
              <div class="gallery">
                <div v-for="(ph,idx) in p.photos" :key="idx" class="gallery-item">
                  <img :src="ph" :alt="p.title" />
                  <button class="del" @click="deletePhoto(p, idx)" title="Hapus">×</button>
                </div>
                <label v-if="(p.photos?.length||0) < 3" class="gallery-add">
                  <input type="file" accept="image/*" multiple @change="uploadGallery(p, $event)" :disabled="galleryUploading[p.id]" hidden />
                  <span>{{ galleryUploading[p.id] ? '...' : '+' }}</span>
                </label>
              </div>
              <label class="field-label">Caption</label>
              <textarea v-model="captionDraft[p.id]" class="field textarea" rows="3" maxlength="280" placeholder="Caption..."></textarea>
              <div class="card-actions">
                <span class="tiny muted">{{ (captionDraft[p.id]||'').length }}/280</span>
                <button class="btn sm" @click="saveProker(p)">Simpan</button>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.admin-shell { width: 100%; min-height: 100dvh; background: var(--bg-secondary, #F1F5F9); }
.admin-topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: #fff; border-bottom: 3px solid var(--dark-navy); box-shadow: 0 2px 0 var(--vibrant-yellow); }
.topbar-left { display: flex; align-items: center; gap: 10px; }
.topbar-logo { width: 32px; height: 32px; object-fit: contain; mix-blend-mode: multiply; }
.topbar-title { font-weight: 900; letter-spacing: 0.06em; font-size: 13px; }
.topbar-title b { color: var(--royal-blue); }
.user-chip { padding: 4px 10px; background: var(--dark-navy); color: #fff; font-size: 11px; font-weight: 800; border-radius: 999px; }
.page-back { padding: 8px 12px; border: 2px solid var(--dark-navy); background: transparent; font-weight: 800; font-size: 12px; cursor: pointer; }
.login-wrap { min-height: calc(100dvh - 64px); display: grid; place-items: center; padding: 24px; }
.login-card { width: min(100%, 420px); padding: 28px 24px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 8px 8px 0 var(--dark-navy); text-align: center; }
.login-head { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 14px; }
.login-icon { width: 48px; height: 48px; display: grid; place-items: center; background: var(--vibrant-yellow); border: 2px solid var(--dark-navy); font-weight: 900; }
.field-label { display: block; text-align: left; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; margin: 8px 0 4px; color: var(--dark-navy); }
.field { width: 100%; padding: 10px 12px; border: 2px solid var(--dark-navy); background: #fff; font: inherit; font-size: 14px; }
.field:focus { outline: none; box-shadow: 3px 3px 0 var(--vibrant-yellow); }
.login-btn { width: 100%; margin-top: 14px; padding: 10px 14px; font-size: 14px; line-height: normal; }
.dashboard { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100dvh - 58px); }
.sidebar { display: flex; flex-direction: column; gap: 6px; padding: 16px 12px; background: #fff; border-right: 3px solid var(--dark-navy); }
.side-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 12px; background: #fff; border: 2px solid var(--dark-navy); font-weight: 800; font-size: 13px; cursor: pointer; text-align: left; }
.side-item.active { background: var(--dark-navy); color: #fff; box-shadow: 3px 3px 0 var(--vibrant-yellow); }
.side-item .count { margin-left: auto; padding: 2px 7px; background: var(--vibrant-yellow); color: var(--dark-navy); font-size: 11px; border-radius: 999px; }
.side-item.active .count { background: #fff; }
.side-item.logout { margin-top: auto; background: #fff5f5; }
.side-spacer { flex: 1; }
.main { padding: 20px clamp(16px, 2vw, 24px); overflow: auto; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { padding: 16px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 5px 5px 0 var(--dark-navy); }
.stat-card.accent { background: var(--vibrant-yellow); }
.stat-card.dark { background: var(--dark-navy); color: #fff; }
.stat-label { display: block; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; opacity: 0.7; }
.stat-value { display: block; font-size: 26px; font-weight: 900; line-height: 1; margin-top: 4px; }
.stat-sub { display: block; font-size: 11px; font-weight: 600; margin-top: 2px; opacity: 0.7; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 0 10px; background: #fff; border: 2px solid var(--dark-navy); }
.search-wrap svg { opacity: 0.5; }
.search { flex: 1; border: none; padding: 10px 0; font: inherit; font-size: 14px; outline: none; background: transparent; }
.btn.sm { padding: 9px 14px; font-size: 12px; }
.table-card { background: #fff; border: 3px solid var(--dark-navy); box-shadow: 6px 6px 0 var(--dark-navy); overflow: hidden; }
.table-head { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-bottom: 2px solid var(--dark-navy); font-size: 12px; font-weight: 800; }
.table-wrap { overflow: auto; max-height: 60vh; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.admin-table th { position: sticky; top: 0; background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; letter-spacing: 0.06em; border-bottom: 2px solid var(--dark-navy); z-index: 1; }
.admin-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.admin-table tbody tr:hover { background: rgba(11,86,155,0.04); }
.name-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; display: grid; place-items: center; background: var(--dark-navy); color: #fff; font-weight: 900; font-size: 12px; border-radius: 50%; flex-shrink: 0; }
.avatar.sm { width: 32px; height: 32px; font-size: 13px; }
.jurusan-badge { padding: 3px 8px; background: var(--vibrant-yellow); border: 1px solid var(--dark-navy); font-size: 11px; font-weight: 800; }
.jurusan-badge.sm { font-size: 10px; padding: 2px 6px; }
.empty { text-align: center; padding: 18px; color: var(--text-muted); }
.members-cards { display: none; }
.proker-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.proker-card { padding: 16px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 6px 6px 0 var(--dark-navy); }
.gallery { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.gallery-item { position: relative; width: 80px; height: 80px; border: 2px solid var(--dark-navy); overflow: hidden; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.gallery-item .del { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; display: grid; place-items: center; background: #fff; border: 1px solid var(--dark-navy); font-weight: 900; cursor: pointer; }
.gallery-add { width: 80px; height: 80px; display: grid; place-items: center; border: 2px dashed var(--dark-navy); background: #f8fafc; font-size: 22px; font-weight: 900; cursor: pointer; position: relative; }
.gallery-add input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.field.textarea { resize: vertical; min-height: 72px; }
.card-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
@media (max-width: 860px) {
  .dashboard { grid-template-columns: 1fr; }
  .sidebar { flex-direction: row; overflow: auto; border-right: none; border-bottom: 3px solid var(--dark-navy); gap: 8px; padding: 10px; -webkit-overflow-scrolling: touch; }
  .side-item { flex: 0 0 auto; min-width: 130px; white-space: nowrap; }
  .side-spacer { display: none; }
  .stats-row { grid-template-columns: 1fr; }
  .proker-grid { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .admin-shell { overflow-x: hidden; }
  .admin-topbar { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .topbar-left { flex: 1; min-width: 0; }
  .topbar-title { font-size: 12px; }
  .page-back { padding: 7px 10px; font-size: 11px; }
  .main { padding: 14px 12px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search-wrap { min-width: 100%; width: 100%; }
  .table-card { display: none; }
  .members-cards { display: grid; gap: 10px; margin-top: 12px; }
  .member-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; background: #fff; border: 2px solid var(--dark-navy); box-shadow: 3px 3px 0 var(--dark-navy); }
  .member-top { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .member-name { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
  .proker-card { padding: 12px; box-shadow: 4px 4px 0 var(--dark-navy); }
  .login-card { padding: 20px 16px; box-shadow: 6px 6px 0 var(--dark-navy); }
}
</style>
