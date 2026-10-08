<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

// Brankas admin: chunk terpisah, hanya diunduh saat tab Admin dibuka.
const AdminView = defineAsyncComponent(() => import('./AdminView.vue'))

const emit = defineEmits(['back', 'logout'])

const dashTab = ref('dashboard')
const menuOpen = ref(false)
const isDesktop = ref(false)
let menuTrigger = null
let dashMq = null

function openMenu(e) {
  menuTrigger = e?.currentTarget || null
  menuOpen.value = true
  checkAdminAccess()
}

// Pintu Menu Admin: hanya superadmin (UX saja; enforcement penuh
// tetap di backend saat login admin).
const isSuperAdmin = ref(false)
let adminChecked = false
async function checkAdminAccess() {
  if (adminChecked) return
  adminChecked = true
  let t = ''
  try { t = localStorage.getItem('member_token') || '' } catch { return }
  if (!t) return
  try {
    const r = await api.adminCheckMember(t)
    isSuperAdmin.value = r?.isAdmin === true && r?.role === 'superadmin'
  } catch { /* gagal = pintu disembunyikan */ }
}

function goAdmin() {
  dashTab.value = 'admin'
  closeMenu(false)
}

function closeMenu(returnFocus = true) {
  menuOpen.value = false
  if (returnFocus && !isDesktop.value && menuTrigger && document.contains(menuTrigger)) menuTrigger.focus()
}

function goTab(tab) {
  dashTab.value = tab
  closeMenu()
}

function goProfile() {
  dashTab.value = 'profil'
  closeMenu()
}

function goHome() {
  closeMenu(false)
  emit('back')
}

const tabTitle = computed(() => (
  { dashboard: 'Dashboard', absensi: 'Absensi', materi: 'Materi', profil: 'Profil Saya', admin: 'Admin' }[dashTab.value] || 'Dashboard'
))

function onMenuKey(e) {
  if (e.key === 'Escape' && menuOpen.value) closeMenu()
}

const loading = ref(true)
const error = ref('')
const unauthorized = ref(false)
const profile = ref({ username: '', fullname: '', group_name: '', created_at: '' })
const proker = ref([])
const prokerLoading = ref(true)

const GROUP_STYLES = {
  Zeus:   { color: '#1E3A8A', bg: '#EFF6FF' },
  Athena: { color: '#0E7490', bg: '#ECFEFF' },
  Hades:  { color: '#374151', bg: '#F3F4F6' },
  Apollo: { color: '#B45309', bg: '#FFFBEB' },
  Hermes: { color: '#15803D', bg: '#F0FDF4' },
}

const groupStyle = computed(() => GROUP_STYLES[profile.value.group_name] || { color: '#0B569B', bg: '#EFF6FF' })
const initial = computed(() => (profile.value.fullname || profile.value.username || '?').charAt(0).toUpperCase())
const memberSince = computed(() => profile.value.created_at ? formatWIB(profile.value.created_at) : '—')

const STATUS_MAP = {
  upcoming:  { label: 'Upcoming',  cls: 'badge--upcoming' },
  ongoing:   { label: 'Berlangsung', cls: 'badge--ongoing' },
  completed: { label: 'Selesai',   cls: 'badge--done' },
}

// highlight = max 4 proker, prioritas ongoing > upcoming > completed
const highlightProker = computed(() => {
  const sorted = [...proker.value].sort((a, b) => {
    const ord = { ongoing: 0, upcoming: 1, completed: 2 }
    return (ord[a.status] ?? 9) - (ord[b.status] ?? 9)
  })
  return sorted.slice(0, 4)
})

function clearSession() {
  localStorage.removeItem('member_token')
  localStorage.removeItem('member_username')
  localStorage.removeItem('member_fullname')
}

async function load() {
  loading.value = true
  error.value = ''
  unauthorized.value = false
  let t = ''
  try { t = localStorage.getItem('member_token') || '' } catch { /* storage diblokir */ }
  try {
    if (!t) { emit('back'); return }
    const r = await api.memberMe(t)
    profile.value = r
    try {
      localStorage.setItem('member_username', r.username)
      localStorage.setItem('member_fullname', r.fullname || '')
    } catch { /* storage diblokir: abaikan */ }
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

  // Load proker highlights (non-blocking)
  prokerLoading.value = true
  try {
    const data = await api.proker()
    proker.value = data?.proker ?? data ?? []
  } catch {
    proker.value = []
  } finally {
    prokerLoading.value = false
  }
}

function doLogout() { clearSession(); emit('logout') }
function loginAgain() { clearSession(); emit('logout') }
function retry() {
  const t = localStorage.getItem('member_token') || ''
  if (!t) { loginAgain(); return }
  load()
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onMenuKey)
  try {
    dashMq = window.matchMedia('(min-width: 1024px)')
    isDesktop.value = dashMq.matches
    dashMq.addEventListener('change', (e) => { isDesktop.value = e.matches })
  } catch { /* matchMedia tak tersedia: tetap pola mobile */ }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onMenuKey)
})
</script>

<template>
  <section class="dash" aria-label="Member Dashboard">

    <!-- ── Nav ───────────────────────────────────────────── -->
    <nav class="dash__nav" aria-label="Navigasi dashboard">
      <div class="dash__nav-inner">
      <button class="dash__brand" type="button" @click="goHome" aria-label="English Club UPB, kembali ke beranda">
        <img src="/logo-ec.png" alt="" width="32" height="32" />
        <span>English Club <b>UPB</b></span>
      </button>
      <button class="dash__burger" type="button" @click="openMenu" aria-haspopup="dialog" :aria-expanded="menuOpen ? 'true' : 'false'" aria-controls="dash-menu" aria-label="Buka menu dashboard">
        <span class="dash__burger-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <span class="dash__nav-title">{{ tabTitle }}</span>
      <button class="dash__avatar-chip" type="button" @click="goProfile" :title="`Buka profil ${profile.fullname || profile.username || 'anggota'}`" aria-label="Buka profil saya">
        <span class="dash__avatar-circle" :style="{ background: groupStyle.color }">{{ initial }}</span>
        <span class="dash__avatar-name">{{ profile.fullname || profile.username }}</span>
      </button>
      </div>
    </nav>

    <div class="dash__layout">
    <!-- ── Drawer menu (mobile) / Sidebar (desktop ≥1024px) ─── -->
    <Transition name="dash-menu">
      <div v-if="menuOpen || isDesktop" class="dash__overlay" @click="closeMenu(false)">
        <div
          class="dash__menu"
          id="dash-menu"
          :role="isDesktop ? 'complementary' : 'dialog'"
          :aria-modal="isDesktop ? null : 'true'"
          aria-label="Menu dashboard"
          @click.stop
        >
          <div class="dash__menu-head">
            <div class="dash__menu-identity">
              <span class="dash__avatar-circle" :style="{ background: groupStyle.color }">{{ initial }}</span>
              <div class="dash__menu-id-text">
                <b>{{ profile.fullname || profile.username }}</b>
                <small>@{{ profile.username }}</small>
              </div>
            </div>
            <button class="dash__menu-close" type="button" @click="closeMenu()" aria-label="Tutup menu">×</button>
          </div>

          <nav class="dash__menu-nav" aria-label="Menu anggota">
            <button
              class="dash__menu-item"
              :class="{ active: dashTab === 'dashboard' }"
              type="button"
              :aria-current="dashTab === 'dashboard' ? 'page' : null"
              @click="goTab('dashboard')"
            >
              <img src="/logo-ec.png" alt="" width="22" height="22" class="dash__menu-logo" />
              <span>Dashboard</span>
            </button>
            <button
              class="dash__menu-item"
              :class="{ active: dashTab === 'absensi' }"
              type="button"
              :aria-current="dashTab === 'absensi' ? 'page' : null"
              @click="goTab('absensi')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 11 16 15 12"/></svg>
              <span>Absensi</span>
              <span class="dash__soon">Segera</span>
            </button>
            <button
              class="dash__menu-item"
              :class="{ active: dashTab === 'materi' }"
              type="button"
              :aria-current="dashTab === 'materi' ? 'page' : null"
              @click="goTab('materi')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Materi</span>
              <span class="dash__soon">Segera</span>
            </button>
            <button
              class="dash__menu-item"
              :class="{ active: dashTab === 'profil' }"
              type="button"
              :aria-current="dashTab === 'profil' ? 'page' : null"
              @click="goTab('profil')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Profil Saya</span>
            </button>
            <button
              v-if="isSuperAdmin"
              class="dash__menu-item"
              :class="{ active: dashTab === 'admin' }"
              type="button"
              :aria-current="dashTab === 'admin' ? 'page' : null"
              @click="goAdmin"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Menu Admin</span>
            </button>
          </nav>

          <button class="dash__logout dash__menu-logout" type="button" @click="doLogout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar dari akun
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Loading ───────────────────────────────────────── -->
    <div v-if="loading" class="dash__body">
      <div class="dash__skel-head">
        <div class="ec-skeleton" style="height:16px;width:80px;border-radius:6px"></div>
        <div class="ec-skeleton" style="height:32px;width:260px;border-radius:8px;margin-top:8px"></div>
        <div class="ec-skeleton" style="height:16px;width:180px;border-radius:6px;margin-top:6px"></div>
      </div>
      <div class="ec-card dash__profile-card">
        <div class="ec-skeleton" style="height:52px;width:52px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div class="ec-skeleton" style="height:18px;width:160px;border-radius:6px"></div>
          <div class="ec-skeleton" style="height:14px;width:100px;border-radius:6px"></div>
        </div>
      </div>
      <div class="dash__section-head">
        <div class="ec-skeleton" style="height:20px;width:160px;border-radius:6px"></div>
      </div>
      <div class="dash__grid">
        <div v-for="n in 4" :key="n" class="ec-skeleton" style="height:140px;border-radius:14px"></div>
      </div>
    </div>

    <!-- ── Error ─────────────────────────────────────────── -->
    <div v-else-if="error" class="dash__body">
      <div class="ec-state ec-state--error" role="alert">
        <span class="ec-state__title">{{ unauthorized ? 'Sesi berakhir' : 'Gagal memuat' }}</span>
        <p class="ec-state__body">{{ error }}</p>
        <div class="dash__row">
          <button v-if="!unauthorized" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="retry">Coba lagi</button>
          <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="loginAgain">Masuk lagi</button>
        </div>
      </div>
    </div>

    <!-- ── Main ───────────────────────────────────────────── -->
    <div v-else class="dash__body">
      <template v-if="dashTab === 'dashboard'">

      <!-- Greeting -->
      <div class="dash__head">
        <span class="dash__eyebrow">Dashboard</span>
        <h1 class="dash__greeting">
          Halo, {{ profile.fullname || profile.username || 'Anggota EC' }}!
          <span aria-hidden="true">👋</span>
        </h1>
        <p class="dash__sub">Selamat datang di English Club UPB.</p>
      </div>

      <!-- Kegiatan Sorotan (dashboard) -->
      <div class="dash__section-head">
        <h2 class="dash__section-title">Kegiatan Sorotan</h2>
        <button class="dash__see-all" type="button" @click="emit('back')">Lihat semua</button>
      </div>

      <!-- Proker loading -->
      <div v-if="prokerLoading" class="dash__grid">
        <div v-for="n in 4" :key="n" class="ec-skeleton" style="height:140px;border-radius:14px"></div>
      </div>

      <!-- Proker list -->
      <div v-else-if="highlightProker.length" class="dash__grid">
        <div
          v-for="item in highlightProker"
          :key="item.id"
          class="dash__proker-card"
        >
          <div class="dash__proker-img-wrap">
            <img
              v-if="item.imageUrl || item.image_url"
              :src="item.imageUrl || item.image_url"
              :alt="item.title"
              class="dash__proker-img"
              loading="lazy"
            />
            <div v-else class="dash__proker-img-fallback" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <span
              class="dash__proker-badge"
              :class="STATUS_MAP[item.status]?.cls || 'badge--upcoming'"
            >{{ STATUS_MAP[item.status]?.label || 'Upcoming' }}</span>
          </div>
          <div class="dash__proker-body">
            <span class="dash__proker-title">{{ item.title }}</span>
            <p v-if="item.description" class="dash__proker-desc">{{ item.description }}</p>
          </div>
        </div>
      </div>

      <!-- Empty proker -->
      <div v-else class="dash__empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>Belum ada kegiatan yang tersedia.</p>
      </div>

      <!-- Logout (pindah ke drawer menu) -->
      </template>

      <!-- Profil Saya: card netral + info lengkap (pindahan dashboard) -->
      <template v-else-if="dashTab === 'profil'">
        <div class="dash__head">
          <span class="dash__eyebrow">Profil Saya</span>
          <h1 class="dash__greeting">
            {{ profile.fullname || profile.username || 'Anggota EC' }}
          </h1>
          <p class="dash__sub">@{{ profile.username }}</p>
        </div>

        <div class="dash__profile-wrap">
          <div class="ec-card dash__profile-card">
            <div class="dash__avatar-lg" :style="{ background: groupStyle.color }">{{ initial }}</div>
            <div class="dash__profile-info">
              <span class="dash__profile-name">{{ profile.fullname || profile.username }}</span>
              <span class="dash__profile-meta">@{{ profile.username }}</span>
              <div class="dash__profile-tags">
                <span v-if="profile.group_name" class="dash__tag" :style="{ color: groupStyle.color, background: groupStyle.bg, borderColor: groupStyle.color + '40' }">
                  {{ profile.group_name }}
                </span>
                <span class="dash__tag dash__tag--muted">Anggota aktif</span>
              </div>
            </div>
          </div>

          <dl class="ec-card dash__info">
            <div class="dash__info-row">
              <dt class="dash__info-label">Username</dt>
              <dd class="dash__info-val">@{{ profile.username }}</dd>
            </div>
            <div class="dash__info-row">
              <dt class="dash__info-label">Nama lengkap</dt>
              <dd class="dash__info-val">{{ profile.fullname }}</dd>
            </div>
            <div class="dash__info-row">
              <dt class="dash__info-label">Kelompok</dt>
              <dd class="dash__info-val">{{ profile.group_name || '—' }}</dd>
            </div>
            <div class="dash__info-row">
              <dt class="dash__info-label">Status</dt>
              <dd class="dash__info-val">Anggota aktif</dd>
            </div>
            <div class="dash__info-row">
              <dt class="dash__info-label">Bergabung sejak</dt>
              <dd class="dash__info-val">{{ memberSince }}</dd>
            </div>
          </dl>
        </div>
      </template>

      <!-- Absensi / Materi: belum ada kontrak backend, tampilkan status -->
      <div v-else-if="dashTab === 'absensi' || dashTab === 'materi'" class="ec-state ec-state--notice dash__soon-card" role="status">
        <span class="ec-state__title">{{ dashTab === 'absensi' ? 'Absensi segera hadir' : 'Materi segera hadir' }}</span>
        <p class="ec-state__body">{{ dashTab === 'absensi' ? 'Fitur absensi kegiatan belum dibuka. Pantau pengumuman komunitas untuk jadwal berikutnya.' : 'Kumpulan materi pembelajaran belum tersedia. Pantau pengumuman komunitas.' }}</p>
        <div class="dash__soon-actions">
          <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="dashTab = 'dashboard'">Kembali ke Dashboard</button>
          <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="goHome">Ke Beranda</button>
        </div>
      </div>

      <!-- Brankas Admin tertanam (superadmin): login + fitur admin penuh di sini -->
      <div v-else-if="dashTab === 'admin'" class="dash__admin-tab">
        <AdminView v-if="isSuperAdmin" embedded @back="dashTab = 'dashboard'" />
        <div v-else class="ec-state ec-state--error" role="status">
          <span class="ec-state__title">Khusus superadmin</span>
          <p class="ec-state__body">Hubungi superadmin untuk meminta akses admin.</p>
          <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="dashTab = 'dashboard'">Kembali ke Dashboard</button>
        </div>
      </div>

    </div>

    </div>

    <!-- ── Footer: watermark EC + aksi ─────────────────────── -->
    <footer class="dash__footer" aria-label="Footer dashboard">
      <div class="dash__footer-inner">
        <img class="dash__footer-mark" src="/logo-ec.png" alt="" width="44" height="44" loading="lazy" />
        <div class="dash__footer-actions">
          <button class="dash__footer-btn" type="button" @click="goHome">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
            <span>Beranda</span>
          </button>
          <button class="dash__footer-btn" type="button" @click="goTab('profil')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Profil</span>
          </button>
        </div>
        <p class="dash__footer-copy">&copy; 2026 <b>English Club UPB</b> &bull; Practice Makes Progress</p>
      </div>
    </footer>
  </section>
</template>

<style scoped>
/* ── Shell ────────────────────────────────────────────────── */
.dash {
  width: 100%;
  max-width: 640px;
  min-height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  user-select: text;
  -webkit-user-select: text;
}

/* ── Nav (bar full-width, isi di .dash__nav-inner) ───────── */
.dash__nav {
  border-bottom: 1px solid var(--ec-line);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.dash__nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
}

.dash__nav-title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Chip profil di header: membuka drawer, bukan logout langsung. */
.dash__avatar-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 4px 12px 4px 4px;
  border: 1.5px solid var(--ec-line);
  border-radius: 99px;
  background: transparent;
  color: var(--ec-ink-soft);
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  transition: border-color 180ms, background 180ms;
}
.dash__avatar-chip:hover { border-color: #c7d2de; background: var(--ec-canvas); }
.dash__avatar-chip:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }

.dash__burger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 1.5px solid var(--ec-line);
  border-radius: 12px;
  background: var(--ec-surface);
  color: var(--ec-ink);
  cursor: pointer;
  transition: border-color 180ms, background 180ms;
}
.dash__burger:hover { border-color: #c7d2de; background: var(--ec-canvas); }
.dash__burger:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.dash__burger-bars {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 18px;
}
.dash__burger-bars i {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
}

.dash__avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dash__avatar-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ec-ink);
}

/* ── Brand header (desktop saja) ──────────────────────────── */
.dash__brand { display: none; }

/* ── Profil wrap: stack di mobile, 2 kolom di desktop ─────── */
.dash__profile-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ── Soon-state actions ───────────────────────────────────── */
.dash__soon-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ── Tab admin tertanam ───────────────────────────────────── */
.dash__admin-tab { min-width: 0; }

/* ── Body ─────────────────────────────────────────────────── */
.dash__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px 56px;
}

/* ── Head / greeting ──────────────────────────────────────── */
.dash__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 4px;
}

.dash__eyebrow {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ec-blue);
}

.dash__greeting {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(22px, 5.5vw, 30px);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--ec-ink);
  line-height: 1.15;
}

.dash__sub {
  font-size: 14px;
  color: var(--ec-ink-soft);
  margin-top: 2px;
}

/* ── Profile card (netral, tanpa aksen setrip warna) ───────── */
.dash__profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
}

.dash__avatar-lg {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 22px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dash__profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dash__profile-name {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash__profile-meta {
  font-size: 12.5px;
  color: var(--ec-ink-soft);
}

.dash__profile-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.dash__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border: 1px solid var(--ec-line);
  border-radius: 99px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.dash__tag--muted { color: var(--ec-ink-soft); background: var(--ec-canvas); }

/* ── Section head ─────────────────────────────────────────── */
.dash__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}

.dash__section-title {
  font-family: 'Outfit', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--ec-ink);
  letter-spacing: -0.01em;
}

.dash__see-all {
  background: transparent;
  border: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--ec-blue);
  cursor: pointer;
  padding: 0;
  opacity: 0.75;
  transition: opacity 160ms;
}
.dash__see-all:hover { opacity: 1; }

/* ── Proker grid ──────────────────────────────────────────── */
.dash__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.dash__proker-card {
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--ec-shadow-sm);
  transition: transform 180ms var(--ec-ease), box-shadow 180ms var(--ec-ease), border-color 180ms;
}
.dash__proker-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--ec-shadow-md);
  border-color: #c9dff5;
}

.dash__proker-img-wrap {
  position: relative;
  aspect-ratio: 16/9;
  background: var(--ec-canvas);
  overflow: hidden;
}

.dash__proker-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dash__proker-img-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--ec-ink-soft);
  opacity: 0.4;
}

.dash__proker-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 3px 9px;
  border-radius: 99px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
}

.badge--upcoming  { background: rgba(235,248,255,0.9); color: #0B569B; border: 1px solid #C9DFF5; }
.badge--ongoing   { background: rgba(255,251,235,0.9); color: #92400E; border: 1px solid #FDE68A; }
.badge--done      { background: rgba(236,253,245,0.9); color: #047857; border: 1px solid #A7F3D0; }

.dash__proker-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dash__proker-title {
  font-family: 'Outfit', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ec-ink);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dash__proker-desc {
  font-size: 11.5px;
  color: var(--ec-ink-soft);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Empty ────────────────────────────────────────────────── */
.dash__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  color: var(--ec-ink-soft);
  text-align: center;
  font-size: 14px;
}

/* ── Info table ───────────────────────────────────────────── */
.dash__info {
  margin: 0;
  padding: 4px 18px;
  border-radius: 14px;
  box-shadow: none;
}

.dash__info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--ec-line);
}
.dash__info-row:last-child { border-bottom: 0; }

.dash__info-label {
  font-size: 13px;
  color: var(--ec-ink-soft);
  font-weight: 500;
}

.dash__info-val {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ec-ink);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Logout ───────────────────────────────────────────────── */
.dash__logout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  border: 1px solid var(--ec-line);
  border-radius: 12px;
  background: transparent;
  color: var(--ec-ink-soft);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms, color 180ms, border-color 180ms;
}
.dash__logout:hover {
  background: #FEF2F2;
  color: #B91C1C;
  border-color: #FECACA;
}

/* ── Row (error) ──────────────────────────────────────────── */
.dash__row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ── Drawer menu ──────────────────────────────────────────── */
.dash__overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(13, 20, 28, 0.5);
  display: flex;
  justify-content: flex-start;
}

.dash__menu {
  width: min(320px, 84vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background: var(--ec-surface);
  border-right: 1px solid var(--ec-line);
  box-shadow: 16px 0 40px -20px rgba(31, 41, 55, 0.35);
  overflow-y: auto;
}

.dash-menu-enter-active .dash__menu { animation: dash-menu-in 220ms var(--ec-ease); }
.dash-menu-enter-active .dash__overlay,
.dash-menu-leave-active { transition: opacity 180ms ease; }
.dash-menu-enter-from, .dash-menu-leave-to { opacity: 0; }
@keyframes dash-menu-in {
  from { transform: translateX(-32px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.dash__menu-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.dash__menu-profile,
.dash__menu-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dash__menu-id-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dash__menu-id-text b {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash__menu-id-text small {
  font-size: 12px;
  color: var(--ec-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash__menu-close {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--ec-line);
  border-radius: 12px;
  background: transparent;
  color: var(--ec-ink);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.dash__menu-close:hover { background: var(--ec-canvas); }
.dash__menu-close:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }

.dash__menu-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dash__menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 160ms, border-color 160ms;
}
.dash__menu-item svg { color: var(--ec-ink-soft); flex-shrink: 0; }
.dash__menu-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}
.dash__menu-item:hover { background: var(--ec-canvas); }
.dash__menu-item:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.dash__menu-item.active {
  background: var(--ec-blue-050, #F1F6FC);
  border-color: var(--ec-info-line, #C9DFF5);
  color: var(--ec-blue);
}
.dash__menu-item.active svg { color: var(--ec-blue); }

.dash__soon {
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 99px;
  background: var(--ec-warning-bg, #FFFBEB);
  border: 1px solid var(--ec-warning-line, #FDE68A);
  color: var(--ec-warning, #B45309);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.dash__menu-logout { margin-top: auto; }

@media (prefers-reduced-motion: reduce) {
  .dash-menu-enter-active .dash__menu { animation: none; }
  .dash-menu-enter-active .dash__overlay,
  .dash-menu-leave-active { transition: none; }
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 400px) {
  .dash__grid { grid-template-columns: 1fr; }
  .dash__nav-inner { padding: 12px 14px; }
  .dash__body { padding: 16px 12px 48px; }
  .dash__avatar-name { display: none; }
}

/* ── Footer: watermark EC saja ──────────────────────────── */
.dash__footer {
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--ec-line);
  background: var(--ec-surface);
}

/* Watermark logo raksasa di kanan, dekoratif saja. */
.dash__footer::after {
  content: '';
  position: absolute;
  right: -32px;
  top: 50%;
  width: 180px;
  height: 180px;
  transform: translateY(-50%);
  background: url('/logo-ec.png') no-repeat center / contain;
  opacity: 0.06;
  pointer-events: none;
}

.dash__footer-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
}

.dash__footer-mark {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.dash__footer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.dash__footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid var(--ec-line);
  border-radius: 999px;
  background: var(--ec-surface);
  color: var(--ec-ink);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 160ms, background 160ms, color 160ms;
}
.dash__footer-btn:hover { border-color: var(--ec-info-line); background: var(--ec-blue-050); color: var(--ec-blue); }
.dash__footer-btn:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }

.dash__footer-copy {
  margin: 0;
  font-size: 12px;
  color: var(--ec-ink-soft);
}
.dash__footer-copy b { color: var(--ec-ink); }

/* ── Desktop ≥1024px: sidebar permanen + konten fluid ─────────
 * Mobile (<1024px) tidak berubah: burger + overlay drawer. */
@media (min-width: 1024px) {
  /* Shell full-width; yang 1180px hanya isi (inner/layout). */
  .dash {
    max-width: none;
  }

  .dash__nav-inner,
  .dash__layout,
  .dash__footer-inner {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding-inline: var(--ec-gutter);
  }

  .dash__nav-inner {
    padding-block: 14px;
  }

  .dash__brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ec-ink);
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
    cursor: pointer;
  }
  .dash__brand img { width: 32px; height: 32px; object-fit: contain; border-radius: 8px; }
  .dash__brand b { color: var(--ec-blue); }
  .dash__brand:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); border-radius: 8px; }

  .dash__burger { display: none; }

  /* Judul tab redundan dengan brand + item aktif sidebar: sembunyikan. */
  .dash__nav-title { display: none; }

  .dash__avatar-name { max-width: 180px; }

  /* Samakan ukuran header landing: bar 72px, logo 36px. */
  .dash__nav { min-height: 72px; }
  .dash__layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    column-gap: 24px;
    align-items: start;
    flex: 1 0 auto;
  }

  .dash__brand img { width: 36px; height: 36px; }

  /* Overlay lenyap sebagai box: menu menjadi item grid (sidebar). */
  .dash__overlay { display: contents; }
  .dash-menu-enter-active .dash__menu { animation: none; }

  .dash__menu {
    position: sticky;
    top: 96px;
    width: auto;
    height: auto;
    max-height: calc(100dvh - 112px);
    border: 1px solid var(--ec-line);
    border-radius: 16px;
    box-shadow: var(--ec-shadow-sm);
  }

  .dash__menu-close { display: none; }

  .dash__body {
    padding: 24px 0 64px;
    gap: 20px;
    min-width: 0;
  }

  .dash__greeting { font-size: clamp(28px, 3vw, 36px); }

  /* 4 sorotan = grid 2x2 penuh tanpa lubang; kartu lebih besar. */
  .dash__grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }

  .dash__proker-title { font-size: 15px; }

  .dash__profile-wrap {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  .dash__soon-card { max-width: 640px; }
}
</style>
