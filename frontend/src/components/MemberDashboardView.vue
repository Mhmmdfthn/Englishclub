<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

const emit = defineEmits(['back', 'logout'])

const loading = ref(true)
const error = ref('')
const unauthorized = ref(false)
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

function clearSession() {
  localStorage.removeItem('member_token')
  localStorage.removeItem('member_username')
  localStorage.removeItem('member_fullname')
}

async function load() {
  loading.value = true
  error.value = ''
  unauthorized.value = false
  try {
    const t = localStorage.getItem('member_token') || ''
    if (!t) { emit('back'); return }
    const r = await api.memberMe(t)
    profile.value = r
    localStorage.setItem('member_username', r.username)
    localStorage.setItem('member_fullname', r.fullname || '')
  } catch (e) {
    if (e?.status === 401) {
      clearSession()
      unauthorized.value = true
      error.value = 'Sesi habis. Masuk lagi untuk lanjut.'
    } else {
      error.value = 'Gagal memuat profil. Periksa koneksi lalu coba lagi.'
    }
  } finally {
    loading.value = false
  }
}

function doLogout() {
  clearSession()
  emit('logout')
}

function loginAgain() {
  clearSession()
  emit('logout')
}

function retry() {
  const t = localStorage.getItem('member_token') || ''
  if (!t) { loginAgain(); return }
  load()
}

onMounted(load)
</script>

<template>
  <section class="dash">
    <nav class="dash__nav" aria-label="Navigasi dashboard">
      <button class="auth__brand" type="button" @click="emit('back')" aria-label="Kembali ke beranda">
        <img src="/logo-ec.png" alt="Logo English Club UPB" width="36" height="36" />
        <span>English Club <b>UPB</b></span>
      </button>
      <div class="dash__actions">
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="emit('back')">Beranda</button>
        <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="doLogout">Keluar</button>
      </div>
    </nav>

    <div class="dash__head">
      <span class="ec-eyebrow">Dashboard</span>
      <h1 class="ec-h2">Halo, {{ profile.fullname || profile.username || 'Anggota EC' }}.</h1>
      <p class="ec-lede">Ini ringkasan akun anggota English Club kamu.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="dash__stack" aria-hidden="true">
      <div class="ec-skeleton dash__skel dash__skel--profile"></div>
      <div class="ec-skeleton dash__skel dash__skel--card"></div>
      <div class="ec-skeleton dash__skel dash__skel--row"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="ec-state ec-state--error" role="alert">
      <span class="ec-state__title">{{ unauthorized ? 'Sesi berakhir' : 'Gagal memuat' }}</span>
      <p class="ec-state__body">{{ error }}</p>
      <div class="dash__row">
        <button v-if="!unauthorized" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="retry">Coba lagi</button>
        <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="loginAgain">Masuk lagi</button>
      </div>
    </div>

    <div v-else class="dash__stack">
      <!-- Profil -->
      <div class="ec-card dash__profile">
        <span class="dash__avatar" aria-hidden="true">{{ initial }}</span>
        <div class="dash__identity">
          <h2 class="ec-h3">{{ profile.fullname }}</h2>
          <span class="ec-caption">@{{ profile.username }}</span>
        </div>
        <span v-if="profile.group_name" class="ec-badge" :style="{ borderColor: groupStyle.color, color: groupStyle.color }">{{ profile.group_name }}</span>
      </div>

      <!-- Kelompok -->
      <div class="ec-card dash__group" :style="{ borderLeftColor: groupStyle.color }">
        <span class="dash__mark" :style="{ background: groupStyle.color }" aria-hidden="true">{{ groupStyle.mark }}</span>
        <div>
          <span class="ec-eyebrow">Kelompok kamu</span>
          <template v-if="profile.group_name">
            <h3 class="ec-h3 dash__group-name">{{ profile.group_name }}</h3>
          </template>
          <template v-else>
            <h3 class="ec-h3 dash__group-name">Belum ada kelompok</h3>
            <p class="ec-caption">Hubungi Admin EC untuk penetapan kelompok.</p>
          </template>
        </div>
      </div>

      <!-- Info -->
      <dl class="ec-card dash__info">
        <div class="dash__info-row"><dt class="ec-caption">Username</dt><dd>@{{ profile.username }}</dd></div>
        <div class="dash__info-row"><dt class="ec-caption">Nama lengkap</dt><dd>{{ profile.fullname }}</dd></div>
        <div class="dash__info-row"><dt class="ec-caption">Kelompok</dt><dd>{{ profile.group_name || '—' }}</dd></div>
        <div class="dash__info-row"><dt class="ec-caption">Status</dt><dd>Anggota aktif</dd></div>
        <div class="dash__info-row"><dt class="ec-caption">Anggota sejak</dt><dd>{{ memberSince }}</dd></div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.dash {
  width: 100%;
  max-width: 720px;
  min-height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-5);
  padding: clamp(16px, 3vh, 28px) 16px 48px;
  user-select: text;
  -webkit-user-select: text;
}

.dash__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ec-space-3);
  min-height: 64px;
  flex-wrap: wrap;
}

.auth__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-3);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.auth__brand img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  padding: 3px;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
}

.auth__brand b {
  color: var(--ec-blue);
  font-weight: 700;
}

.dash__actions {
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
}

.dash__head {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
}

.dash__stack {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-4);
}

.dash__skel {
  min-height: 64px;
}

.dash__skel--card {
  min-height: 120px;
}

.dash__skel--row {
  min-height: 180px;
}

.dash__row {
  display: flex;
  gap: var(--ec-space-2);
  flex-wrap: wrap;
  margin-top: var(--ec-space-1);
}

.dash__profile {
  display: flex;
  align-items: center;
  gap: var(--ec-space-4);
  padding: var(--ec-space-5);
  box-shadow: none;
}

.dash__avatar {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: var(--ec-radius-md);
  background: var(--ec-blue);
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.dash__identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dash__identity .ec-h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash__group {
  display: flex;
  align-items: center;
  gap: var(--ec-space-4);
  padding: var(--ec-space-5);
  border-left-width: 8px;
  box-shadow: none;
}

.dash__mark {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: var(--ec-radius-md);
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.dash__group-name {
  margin-top: 4px;
  font-size: clamp(22px, 5vw, 30px);
}

.dash__info {
  margin: 0;
  padding: var(--ec-space-2) var(--ec-space-5);
  box-shadow: none;
}

.dash__info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ec-space-3);
  padding: 13px 0;
  border-bottom: 1px solid var(--ec-line);
}

.dash__info-row:last-child {
  border-bottom: 0;
}

.dash__info-row dd {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ec-ink);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 560px) {
  .dash__profile,
  .dash__group {
    padding: var(--ec-space-4);
    gap: var(--ec-space-3);
  }

  .dash__avatar,
  .dash__mark {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
}
</style>
