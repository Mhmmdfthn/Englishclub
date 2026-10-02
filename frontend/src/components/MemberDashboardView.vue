<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

const emit = defineEmits(['back', 'logout'])

const loading = ref(true)
const error = ref('')
const profile = ref({ username: '', fullname: '', group_name: '', created_at: '' })

const GROUP_STYLES = {
  Zeus: { color: '#1E3A8A', mark: 'Z' },
  Athena: { color: '#0E7490', mark: 'A' },
  Hades: { color: '#1F2937', mark: 'H' },
  Apollo: { color: '#B45309', mark: 'Ap' },
  Hermes: { color: '#15803D', mark: 'He' },
}

const groupStyle = computed(() => GROUP_STYLES[profile.value.group_name] || { color: '#214C7A', mark: 'EC' })
const memberSince = computed(() => (profile.value.created_at ? formatWIB(profile.value.created_at) : '—'))
const initial = computed(() => (profile.value.fullname || profile.value.username || '?').charAt(0).toUpperCase())

async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = localStorage.getItem('member_token') || ''
    if (!t) { emit('back'); return }
    const r = await api.memberMe(t)
    profile.value = r
    localStorage.setItem('member_username', r.username)
    localStorage.setItem('member_fullname', r.fullname || '')
  } catch {
    error.value = 'Sesi habis. Masuk lagi.'
  } finally {
    loading.value = false
  }
}

function doLogout() {
  localStorage.removeItem('member_token')
  localStorage.removeItem('member_username')
  localStorage.removeItem('member_fullname')
  emit('logout')
}

function retry() {
  const t = localStorage.getItem('member_token') || ''
  if (!t) { emit('back'); return }
  load()
}

onMounted(load)
</script>

<template>
  <section class="screen dash-page">
    <nav class="page-nav dash-nav" aria-label="Navigasi dashboard">
      <span class="page-nav-title">DASHBOARD</span>
      <button class="page-back" type="button" @click="doLogout">Keluar</button>
    </nav>

    <!-- Loading: skeleton -->
    <div v-if="loading" class="dash-wrap" aria-hidden="true">
      <div class="skel skel-profile"></div>
      <div class="skel skel-card"></div>
      <div class="skel skel-row"></div>
      <div class="skel skel-row"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="dash-wrap">
      <div class="card error-card" role="alert" aria-live="polite">
        <b>{{ error }}</b>
        <button class="btn sm" type="button" @click="retry">Coba Lagi</button>
      </div>
    </div>

    <div v-else class="dash-wrap">
      <!-- Blok profil ala header profil GH -->
      <div class="profile-block">
        <span class="profile-avatar" aria-hidden="true">{{ initial }}</span>
        <div class="profile-id">
          <h1>{{ profile.fullname }}</h1>
          <span class="profile-username">@{{ profile.username }}</span>
        </div>
        <span v-if="profile.group_name" class="group-chip" :style="{ borderColor: groupStyle.color, color: groupStyle.color }">{{ profile.group_name }}</span>
      </div>

      <!-- Kartu grup pinned -->
      <div class="card group-card" :style="{ borderLeftColor: groupStyle.color }">
        <span class="group-mark" :style="{ background: groupStyle.color }" aria-hidden="true">{{ groupStyle.mark }}</span>
        <div class="group-info">
          <span class="panel-kicker">KELOMPOK KAMU</span>
          <template v-if="profile.group_name">
            <h2>{{ profile.group_name }}</h2>
          </template>
          <template v-else>
            <h2>Belum ada kelompok</h2>
            <p class="tiny muted">Hubungi Admin EC untuk penetapan kelompok.</p>
          </template>
        </div>
      </div>

      <!-- List info ala baris GH -->
      <div class="card info-list">
        <div class="info-row"><span class="tiny muted">Username</span><b>@{{ profile.username }}</b></div>
        <div class="info-row"><span class="tiny muted">Nama lengkap</span><b>{{ profile.fullname }}</b></div>
        <div class="info-row"><span class="tiny muted">Kelompok</span><b>{{ profile.group_name || '—' }}</b></div>
        <div class="info-row"><span class="tiny muted">Status</span><b>Anggota aktif</b></div>
        <div class="info-row"><span class="tiny muted">Anggota sejak</span><b>{{ memberSince }}</b></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash-page { padding-bottom: 40px; }
.dash-nav { position: sticky; top: 0; z-index: 10; }
.dash-wrap { display: flex; flex-direction: column; gap: 14px; max-width: 640px; margin: 20px auto 0; width: 100%; padding: 0 clamp(14px, 3vw, 24px); }
.profile-block { display: flex; align-items: center; gap: 14px; padding: 4px 2px; }
.profile-avatar { flex: 0 0 auto; width: 56px; height: 56px; display: grid; place-items: center; font-size: 24px; font-weight: 900; color: var(--pure-white); background: var(--royal-blue); border: 3px solid #132238; box-shadow: 4px 4px 0 #132238; }
.profile-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.profile-id h1 { margin: 0; font-size: clamp(20px, 4.5vw, 26px); font-weight: 900; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-username { font-size: 14px; font-weight: 600; color: #57606a; }
.group-chip { flex: 0 0 auto; padding: 6px 12px; font-size: 12px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; border: 3px solid; background: #fff; }
.group-card { display: flex; gap: 16px; align-items: center; padding: 20px; border-left-width: 10px; }
.group-mark { flex: 0 0 auto; width: 56px; height: 56px; display: grid; place-items: center; font-size: 20px; font-weight: 900; color: #fff; border: 3px solid #132238; }
.group-info h2 { margin: 6px 0 0; font-size: clamp(26px, 6vw, 36px); font-weight: 900; letter-spacing: -0.02em; }
.info-list { padding: 4px 18px; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 2px solid #e8edf2; min-height: 44px; }
.info-row:last-child { border-bottom: 0; }
.info-row b { text-align: right; overflow: hidden; text-overflow: ellipsis; }
.error-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.skel { border: 3px solid #e8edf2; background: linear-gradient(90deg, #eef1f4 25%, #f7f9fb 50%, #eef1f4 75%); background-size: 200% 100%; animation: skel 1.2s infinite; }
.skel-profile { height: 64px; }
.skel-card { height: 120px; }
.skel-row { height: 48px; }
@keyframes skel { 100% { background-position: -200% 0; } }
@media (max-width: 680px) {
  .dash-nav .page-nav-title { font-size: 13px; }
  .profile-avatar { width: 48px; height: 48px; font-size: 20px; }
  .group-card { padding: 16px; gap: 12px; }
  .group-mark { width: 48px; height: 48px; font-size: 17px; }
}
</style>
