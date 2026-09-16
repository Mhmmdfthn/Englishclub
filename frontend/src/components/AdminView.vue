<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'
import { displayTime, todayWIB, wibDay } from '../utils/time.js'
import RichTextEditor from './RichTextEditor.vue'
import ProkerMediaInput from './ProkerMediaInput.vue'

const props = defineProps({ isModal: Boolean })
const emit = defineEmits(['back'])
const router = useRouter()

function goBack() {
  if (props.isModal) emit('back')
  else router.push('/')
}
function textOnly(html) { return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
const MAX_DESC = 1000
const username = ref('')
const password = ref('')
const authed = ref(false)
const authedUser = ref('')
const error = ref('')
const success = ref('')
const confirmState = ref(null)
let successTimer = null
function showSuccess(msg) {
  success.value = msg
  clearTimeout(successTimer)
  successTimer = setTimeout(() => { success.value = '' }, 3500)
}
function handleError(e, fallback) {
  if (e?.status === 401) {
    error.value = 'Sesi habis. Login lagi.'
    logout()
    return
  }
  error.value = e?.message || fallback
}
const members = ref([])
const loading = ref(false)
const filter = ref('')
const activeTab = ref('members')
const proker = ref([])
const prokerLoading = ref(false)
const captionDraft = ref({})
const titleDraft = ref({})
const prokerDraft = ref({})
const galleryUploading = ref({})
const galleryAdding = ref({})
const galleryUrl = ref({})
const newProker = ref({ title: '', description: '', imageUrl: '', date: '', status: 'upcoming' })
const newCover = ref(null)
const mediaDraft = ref({})
const creating = ref(false)
const savingProker = ref({})

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
    error.value = e?.message?.includes('401') ? 'Username atau password salah.' : 'Login belum berhasil.'
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
    if (res.status === 401) { error.value = 'Sesi habis. Login lagi.'; authed.value = false; localStorage.removeItem('admin_token'); return }
    if (res.status === 500) { error.value = 'Server belum konfigurasi ADMIN_TOKEN'; return }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    members.value = data.members || []
  } catch (e) {
    error.value = e?.message || 'Data belum dapat dimuat.'
  } finally { loading.value = false }
}

function exportCsv() {
  const t = localStorage.getItem('admin_token') || ''
  fetch('/api/members/export', { headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t } }).then(async r => {
    if (r.status === 401) { error.value = 'Unauthorized — login lagi'; authed.value = false; return }
    if (!r.ok) { error.value = 'Export belum berhasil.'; return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pendaftaran_ec.csv'; a.click()
    URL.revokeObjectURL(url)
  }).catch(() => { error.value = 'Export belum berhasil.' })
}

async function loadProker() {
  prokerLoading.value = true
  try {
    const data = await api.proker()
    proker.value = data.proker || []
    proker.value.forEach(p => {
      captionDraft.value[p.id] = p.description || p.caption || ''
      titleDraft.value[p.id] = p.title
      prokerDraft.value[p.id] = { title: p.title, description: p.description || p.caption || '', imageUrl: p.imageUrl || p.photos?.[0] || '', date: p.date || '', status: p.status || 'upcoming' }
      mediaDraft.value[p.id] = null
      galleryUrl.value[p.id] = ''
    })
  } catch (e) { handleError(e, 'Proker belum dapat dimuat.') }
  finally { prokerLoading.value = false }
}

function prokerFields(draft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date || '',
    status: draft.status || 'upcoming',
  }
}

async function saveProker(p) {
  const t = localStorage.getItem('admin_token') || ''
  const draft = prokerDraft.value[p.id]
  if (!draft || typeof draft.title !== 'string' || typeof draft.description !== 'string') {
    error.value = 'Data Proker belum siap disimpan.'
    return
  }
  if (draft.title.trim().length < 3 || draft.title.trim().length > 80) { error.value = 'Judul 3-80 karakter'; return }
  const rawLen = (draft.description || '').trim().length
  if (textOnly(draft.description).length < 5) { error.value = 'Deskripsi wajib diisi'; return }
  if (rawLen > MAX_DESC) { error.value = `Deskripsi maksimal ${MAX_DESC} karakter (termasuk markup)`; return }
  const media = mediaDraft.value[p.id]
  const fields = prokerFields(draft)
  savingProker.value[p.id] = true
  try {
    if (media instanceof File) {
      await api.updateProkerMedia(p.id, fields, media, t)
    } else if (typeof media === 'string') {
      await api.updateProker(p.id, { ...fields, imageUrl: media }, t)
    } else {
      await api.updateProker(p.id, fields, t)
    }
    await loadProker()
    error.value = ''
    showSuccess('Proker berhasil disimpan.')
  } catch (e) { handleError(e, 'Proker belum tersimpan.') }
  finally { savingProker.value[p.id] = false }
}

async function createProker() {
  const draft = newProker.value
  const descLen = textOnly(draft.description).length
  if (draft.title.trim().length < 3 || descLen < 5) { error.value = 'Judul dan deskripsi wajib diisi'; return }
  const fields = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date || '',
    status: draft.status || 'upcoming',
  }
  const media = newCover.value
  creating.value = true
  try {
    if (media instanceof File) {
      await api.addProkerMedia(fields, media, localStorage.getItem('admin_token') || '')
    } else if (typeof media === 'string' && media.trim()) {
      await api.addProker({ ...fields, imageUrl: media.trim() }, localStorage.getItem('admin_token') || '')
    } else {
      await api.addProker(fields, localStorage.getItem('admin_token') || '')
    }
    newProker.value = { title: '', description: '', imageUrl: '', date: '', status: 'upcoming' }
    newCover.value = null
    await loadProker()
    error.value = ''
    showSuccess('Proker berhasil ditambahkan.')
  } catch (e) { handleError(e, 'Proker belum ditambahkan.') }
  finally { creating.value = false }
}

function confirmDeleteProker(p) { confirmState.value = { type: 'proker', id: p.id } }
function confirmDeletePhoto(p, idx) { confirmState.value = { type: 'photo', id: p.id, idx } }
function cancelConfirm() { confirmState.value = null }
async function doConfirmedDelete() {
  const c = confirmState.value
  if (!c) return
  confirmState.value = null
  const t = localStorage.getItem('admin_token') || ''
  try {
    if (c.type === 'proker') {
      await api.deleteProker(c.id, t)
    } else {
      const res = await fetch(`/api/proker/${c.id}/photos/${c.idx}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}`, 'x-admin-token': t } })
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw Object.assign(new Error(j.detail || `HTTP ${res.status}`), { status: res.status }) }
    }
    await loadProker()
    showSuccess(c.type === 'proker' ? 'Proker berhasil dihapus.' : 'Foto berhasil dihapus.')
  } catch (e) { handleError(e, 'Belum dapat dihapus.') }
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
  } catch (e) { handleError(e, 'Foto belum diunggah.') }
  finally { galleryUploading.value[p.id] = false; event.target.value = '' }
}

async function addGalleryUrl(p) {
  const u = (galleryUrl.value[p.id] || '').trim()
  if (!u) return
  const t = localStorage.getItem('admin_token') || ''
  galleryAdding.value[p.id] = true
  try {
    const res = await fetch(`/api/proker/${p.id}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, 'x-admin-token': t }, body: JSON.stringify({ url: u }) })
    if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.detail || `HTTP ${res.status}`) }
    galleryUrl.value[p.id] = ''
    await loadProker()
  } catch (e) { handleError(e, 'Foto belum ditambahkan.') }
  finally { galleryAdding.value[p.id] = false }
}

const filtered = computed(() => {
  if (!filter.value) return members.value
  const q = filter.value.toLowerCase()
  return members.value.filter(m => `${m.nama} ${m.jurusan} ${m.no_hp}`.toLowerCase().includes(q))
})

const stats = computed(() => ({
  total: members.value.length,
  byJurusan: [...new Set(members.value.map(m=>m.jurusan))].length,
  today: members.value.filter(m => wibDay(m.timestamp) === todayWIB()).length
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
      <button class="page-back" type="button" @click="goBack">← Kembali</button>
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
                    <td class="tiny muted">{{ displayTime(m) }}</td>
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
              <span class="tiny muted">{{ displayTime(m) }}</span>
            </article>
            <p v-if="!filtered.length" class="empty">Belum ada data</p>
          </div>
        </div>

        <!-- Proker -->
        <div v-else>
          <div class="toolbar">
            <h2 class="tab-title">Kelola Proker</h2>
            <span class="tiny muted">Data tersimpan di KV saat env cloud aktif</span>
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <p v-if="success" class="success">{{ success }}</p>
          <form class="proker-create" @submit.prevent="createProker">
            <strong class="form-heading">Tambah Proker</strong>
            <label class="field-label">Judul</label>
            <input v-model="newProker.title" class="field" maxlength="80" placeholder="Contoh: English Debate Competition" required />
            <label class="field-label">Deskripsi</label>
            <RichTextEditor v-model="newProker.description" :max-length="MAX_DESC" placeholder="Deskripsi kegiatan..." />
            <label class="field-label">Gambar Cover (opsional)</label>
            <ProkerMediaInput v-model="newCover" :initial="''" :disabled="creating" />
            <div class="proker-form-row">
              <div class="form-field"><label class="field-label">Tanggal</label><input v-model="newProker.date" class="field" type="date" /></div>
              <div class="form-field"><label class="field-label">Status</label><select v-model="newProker.status" class="field"><option value="upcoming">Akan datang</option><option value="ongoing">Sedang berlangsung</option><option value="completed">Selesai</option></select></div>
            </div>
            <button class="btn create-submit" type="submit" :disabled="creating">{{ creating ? 'Menyimpan...' : '+ Tambah Proker' }}</button>
          </form>
          <div v-if="prokerLoading" class="proker-state">Memuat proker...</div>
          <div v-else-if="!proker.length" class="proker-state">Belum ada proker. Tambahkan lewat form di atas.</div>
          <div class="proker-grid">
            <article v-for="p in proker" :key="p.id" class="proker-card">
              <div class="proker-card-head">
                <span class="id-badge">{{ p.id }}</span>
                <span class="order-badge">#{{ p.order }}</span>
              </div>
              <label class="field-label">Judul</label>
              <input v-model="prokerDraft[p.id].title" class="field" maxlength="80" placeholder="Judul proker..." />
              <label class="field-label">Foto Kegiatan</label>
              <div class="gallery">
                <div v-for="(ph,idx) in p.photos" :key="idx" class="gallery-item">
                  <img :src="ph" :alt="p.title" />
                  <button class="del" @click="confirmDeletePhoto(p, idx)" title="Hapus foto">×</button>
                </div>
                <label v-if="(p.photos?.length||0) < 3" class="gallery-add">
                  <input type="file" accept="image/*" multiple @change="uploadGallery(p, $event)" :disabled="galleryUploading[p.id]" hidden />
                  <span>{{ galleryUploading[p.id] ? '...' : '+' }}</span>
                </label>
              </div>
              <div v-if="(p.photos?.length||0) < 3" class="gallery-url">
                <input v-model="galleryUrl[p.id]" class="field" type="url" placeholder="Atau tempel URL foto (.jpg/.png)..." :disabled="galleryAdding[p.id]" @keyup.enter="addGalleryUrl(p)" />
                <button class="btn sm" :disabled="galleryAdding[p.id] || !galleryUrl[p.id].trim()" @click="addGalleryUrl(p)">{{ galleryAdding[p.id] ? '...' : 'Tambah URL' }}</button>
              </div>
              <label class="field-label">Deskripsi</label>
              <RichTextEditor v-model="prokerDraft[p.id].description" :max-length="MAX_DESC" placeholder="Deskripsi proker..." />
              <label class="field-label">Gambar Cover (opsional)</label>
              <ProkerMediaInput v-model="mediaDraft[p.id]" :initial="p.imageUrl" :disabled="savingProker[p.id]" />
              <div class="proker-form-row">
                <div class="form-field"><label class="field-label">Tanggal</label><input v-model="prokerDraft[p.id].date" class="field" type="date" /></div>
                <div class="form-field"><label class="field-label">Status</label><select v-model="prokerDraft[p.id].status" class="field"><option value="upcoming">Akan datang</option><option value="ongoing">Sedang berlangsung</option><option value="completed">Selesai</option></select></div>
              </div>
              <div class="card-actions">
                <div class="action-group"><button class="btn sm" @click="saveProker(p)" :disabled="savingProker[p.id]">{{ savingProker[p.id] ? 'Menyimpan...' : 'Simpan' }}</button><button class="btn sm danger" @click="confirmDeleteProker(p)">Hapus</button></div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>

    <Transition name="confirm-fade">
      <div v-if="confirmState" class="confirm-overlay" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus" @click.self="cancelConfirm">
        <div class="confirm-card">
          <strong>{{ confirmState.type === 'proker' ? 'Hapus proker ini?' : 'Hapus foto ini?' }}</strong>
          <p>{{ confirmState.type === 'proker' ? 'Proker akan dihapus permanen dari daftar.' : 'Foto akan dihapus dari galeri proker.' }}</p>
          <div class="confirm-actions">
            <button class="btn sm ghost" type="button" @click="cancelConfirm">Batal</button>
            <button class="btn sm danger" type="button" @click="doConfirmedDelete">Ya, hapus</button>
          </div>
        </div>
      </div>
    </Transition>
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
.proker-create { display: grid; gap: 4px; margin: 14px 0 18px; padding: 16px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 6px 6px 0 var(--dark-navy); }
.form-heading { font-size: 18px; font-weight: 900; margin-bottom: 6px; }
.tab-title { font-size: 18px; font-weight: 900; margin: 0; }
.proker-form-row { display: flex; align-items: stretch; gap: 10px; }
.form-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.proker-form-row .field, .form-field .field { width: 100%; flex: 1; min-width: 0; }
.proker-form-row .field { text-align: left; }
.create-submit { width: 100%; justify-content: center; min-height: 44px; padding: 11px 14px; font-size: 13px; margin-top: 6px; }
.success { margin: 0 0 14px; padding: 8px 12px; background: #ecfdf5; border: 1px solid #86efac; font-size: 13px; font-weight: 700; color: #166534; text-align: center; }
.proker-state { margin: 10px 0 16px; padding: 22px; background: #fff; border: 2px solid var(--dark-navy); font-size: 13px; font-weight: 700; text-align: center; color: var(--text-muted); }
.proker-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.id-badge { padding: 3px 8px; background: var(--royal-blue); color: #fff; font-size: 11px; font-weight: 800; }
.order-badge { padding: 3px 8px; background: var(--vibrant-yellow); border: 1px solid var(--dark-navy); font-size: 11px; font-weight: 800; }
.danger { color: #fff; background: #b42318; }
.proker-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 6px 6px 0 var(--dark-navy); }
.gallery { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0; }
.gallery-url { display: flex; gap: 8px; align-items: stretch; margin: 2px 0 6px; }
.gallery-url .field { flex: 1; min-width: 0; padding: 9px 12px; font-size: 13px; }
.gallery-url .btn { flex: 0 0 auto; padding: 9px 12px; font-size: 12px; white-space: nowrap; }
.gallery-item { position: relative; width: 80px; height: 80px; border: 2px solid var(--dark-navy); overflow: hidden; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.gallery-item .del { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; display: grid; place-items: center; background: #fff; border: 1px solid var(--dark-navy); font-weight: 900; cursor: pointer; }
.gallery-add { width: 80px; height: 80px; display: grid; place-items: center; border: 2px dashed var(--dark-navy); background: #f8fafc; font-size: 22px; font-weight: 900; cursor: pointer; position: relative; }
.gallery-add input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.field.textarea { resize: vertical; min-height: 72px; }
.card-actions { display: flex; align-items: center; justify-content: flex-end; margin-top: 6px; }
.action-group { display: flex; gap: 8px; }
.confirm-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(13,20,28,0.55); backdrop-filter: blur(4px); padding: 20px; }
.confirm-card { width: min(100%, 380px); padding: 22px; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 6px 6px 0 var(--dark-navy); }
.confirm-card strong { font-size: 17px; font-weight: 900; }
.confirm-card p { margin: 8px 0 18px; font-size: 13.5px; color: var(--text-muted); }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
.confirm-fade-enter-active, .confirm-fade-leave-active { transition: opacity 0.18s ease; }
.confirm-fade-enter-from, .confirm-fade-leave-to { opacity: 0; }
@media (max-width: 860px) {
  .dashboard { grid-template-columns: 1fr; }
  .sidebar { flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 3px solid var(--dark-navy); gap: 8px; padding: 10px 12px; background: #fff; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .sidebar::-webkit-scrollbar { display: none; }
  .side-item { flex: 0 0 auto; min-width: 132px; min-height: 46px; white-space: nowrap; padding: 10px 14px; justify-content: center; }
  .side-item.logout { margin-top: 0; flex: 0 0 auto; }
  .side-spacer { display: none; }
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-value { font-size: 22px; }
  .proker-grid { grid-template-columns: 1fr; gap: 12px; }
  .proker-form-row { flex-direction: column; align-items: stretch; gap: 0; }
  .proker-create { gap: 2px; }
}
@media (max-width: 680px) {
  .admin-shell { overflow-x: hidden; }
  .admin-topbar { gap: 6px; padding: 8px 12px; }
  .topbar-left { flex: 1; min-width: 0; gap: 8px; }
  .topbar-title { font-size: 12px; }
  .user-chip { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
  .page-back { padding: 8px 10px; font-size: 11px; min-height: 40px; flex-shrink: 0; }
  .main { padding: 14px 12px 40px; }
  .stats-row { grid-template-columns: 1fr; gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-value { font-size: 22px; }
  .toolbar { flex-direction: column; align-items: stretch; gap: 8px; }
  .search-wrap { min-width: 100%; width: 100%; }
  .toolbar .btn { width: 100%; min-height: 44px; font-size: 13px; }
  .table-card { display: none; }
  .members-cards { display: grid; gap: 10px; margin-top: 12px; }
  .member-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; min-height: 54px; background: #fff; border: 2px solid var(--dark-navy); box-shadow: 3px 3px 0 var(--dark-navy); }
  .member-top { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .member-name { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
  .proker-card { padding: 14px; box-shadow: 4px 4px 0 var(--dark-navy); }
  .proker-create { padding: 14px; box-shadow: 4px 4px 0 var(--dark-navy); }
  .form-heading { font-size: 16px; }
  .gallery { gap: 10px; }
  .gallery-url { flex-direction: column; gap: 8px; }
  .gallery-url .btn { width: 100%; justify-content: center; min-height: 44px; }
  .gallery-item .del { width: 28px; height: 28px; font-size: 16px; top: 4px; right: 4px; }
  .card-actions { justify-content: stretch; }
  .action-group { width: 100%; gap: 10px; }
  .action-group .btn { flex: 1; justify-content: center; min-height: 44px; }
  .btn.sm { min-height: 44px; padding: 10px 14px; font-size: 13px; }
  .confirm-card { padding: 18px 16px; }
  .confirm-actions .btn { min-height: 44px; }
  .login-card { padding: 20px 16px; box-shadow: 6px 6px 0 var(--dark-navy); }
}
</style>
