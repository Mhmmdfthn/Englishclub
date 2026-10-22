<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

// Brankas admin: chunk terpisah, hanya diunduh saat tab Admin dibuka.
const AdminView = defineAsyncComponent(() => import('./AdminView.vue'))
// Presensi QR: chunk terpisah, hanya diunduh saat tab Absensi dibuka.
const PresensiView = defineAsyncComponent(() => import('./PresensiView.vue'))
// Materi Canva: chunk terpisah, hanya diunduh saat tab Materi dibuka.
const MateriView = defineAsyncComponent(() => import('./MateriView.vue'))

// Flag deploy: VITE_ATTENDANCE_ENABLED=false -> tab Absensi jadi "Segera Hadir".
// Dibake saat build; perlu rebuild + redeploy setelah ubah (mirror MEMBER_AUTH).
const ATTENDANCE_ON = import.meta.env.VITE_ATTENDANCE_ENABLED !== 'false'

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
// Display QR: superadmin + SO. SO tidak dapat Menu Admin.
const isSuperAdmin = ref(false)
const memberRole = ref('biasa')
const canDisplayQr = computed(() => isSuperAdmin.value || memberRole.value === 'so')
// Kelola materi (tombol +/ubah/hapus): SO ke atas.
const canManageMateri = computed(() => isSuperAdmin.value || memberRole.value === 'so')
let adminChecked = false
async function checkAdminAccess() {
  if (adminChecked) return
  adminChecked = true
  let t = ''
  try { t = localStorage.getItem('member_token') || '' } catch { return }
  if (!t) return
  try {
    const r = await api.adminCheckMember(t)
    const role = String(r?.role || '').toLowerCase()
    memberRole.value = r?.isAdmin === true ? role : 'biasa'
    isSuperAdmin.value = r?.isAdmin === true && role === 'superadmin'
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
  loadProfileActivity()
}

function goHome() {
  closeMenu(false)
  emit('back')
}

const tabTitle = computed(() => (
  { dashboard: 'Dashboard', absensi: 'Absensi', materi: 'Materi', utilitas: 'Utilitas', profil: 'Profil Saya', admin: 'Admin' }[dashTab.value] || 'Dashboard'
))

function onMenuKey(e) {
  if (e.key === 'Escape' && menuOpen.value) closeMenu()
}

const loading = ref(true)
const error = ref('')
const unauthorized = ref(false)
const profile = ref({ username: '', fullname: '', group_name: '', created_at: '' })
const announcements = ref([])
const announcementsLoading = ref(true)
const announcementsError = ref('')

const GROUP_STYLES = {
  Zeus:   { color: '#1E3A8A', bg: '#EFF6FF', banner: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 58%, #60A5FA 100%)' },
  Athena: { color: '#0E7490', bg: '#ECFEFF', banner: 'linear-gradient(135deg, #0E7490 0%, #0891B2 58%, #67E8F9 100%)' },
  Hades:  { color: '#374151', bg: '#F3F4F6', banner: 'linear-gradient(135deg, #312E81 0%, #4C1D95 58%, #7C3AED 100%)' },
  Apollo: { color: '#B45309', bg: '#FFFBEB', banner: 'linear-gradient(135deg, #B45309 0%, #D97706 58%, #FBBF24 100%)' },
  Hermes: { color: '#15803D', bg: '#F0FDF4', banner: 'linear-gradient(135deg, #15803D 0%, #16A34A 58%, #4ADE80 100%)' },
}

const FALLBACK_GROUP_STYLE = { color: '#0B569B', bg: '#EFF6FF', banner: 'linear-gradient(135deg, #0B569B 0%, #1D4ED8 58%, #38BDF8 100%)' }

const groupStyle = computed(() => GROUP_STYLES[profile.value.group_name] || FALLBACK_GROUP_STYLE)
const initial = computed(() => (profile.value.fullname || profile.value.username || '?').charAt(0).toUpperCase())
const memberSince = computed(() => profile.value.created_at ? formatWIB(profile.value.created_at) : '—')
const memberSinceShort = computed(() => {
  if (!profile.value.created_at) return '—'
  try {
    const d = new Date(profile.value.created_at)
    if (isNaN(d)) return memberSince.value
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  } catch { return memberSince.value }
})

// ── Aktivitas absensi (mengisi profil ala timeline X) ────────
const activity = ref(null) // null = belum dimuat
const activityLoading = ref(false)
const activityError = ref(false)
const attendanceCounts = ref(null) // { hadir, izin, alpa }
const showAttendanceStats = computed(() => ATTENDANCE_ON && !activityError.value)

async function loadProfileActivity() {
  if (!ATTENDANCE_ON || activityLoading.value || activity.value !== null) return
  let t = ''
  try { t = localStorage.getItem('member_token') || '' } catch { return }
  if (!t) return
  activityLoading.value = true
  activityError.value = false
  try {
    const r = await api.attendanceSessionsMine(t)
    const attended = (r.sessions || []).filter((s) => s.attendance?.status)
    const counts = { hadir: 0, izin: 0, alpa: 0 }
    for (const s of attended) {
      const status = s.attendance.status
      if (counts[status] != null) counts[status] += 1
    }
    attendanceCounts.value = counts
    activity.value = attended.slice(0, 5)
  } catch {
    activityError.value = true
    activity.value = []
  } finally {
    activityLoading.value = false
  }
}

function attendanceStatusLabel(status) {
  if (status === 'hadir') return 'Hadir'
  if (status === 'izin') return 'Izin'
  if (status === 'alpa') return 'Alpa'
  return 'Belum absen'
}

function fmtSessionDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(`${value}T00:00:00`)
    if (isNaN(d)) return value
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return value }
}

function fmtTimeWIB(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d)) return ''
    const time = d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
    return `${time} WIB`
  } catch { return '' }
}

// Pengumuman: pin di atas lalu terbaru, tampil max 5 di dashboard.
const visibleAnnouncements = computed(() => (announcements.value || []).slice(0, 5))

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

  // Load pengumuman (non-blocking, publik)
  announcementsLoading.value = true
  announcementsError.value = ''
  try {
    const data = await api.announcements()
    announcements.value = data?.announcements ?? []
  } catch {
    announcements.value = []
    announcementsError.value = 'Pengumuman belum dapat dimuat.'
  } finally {
    announcementsLoading.value = false
  }
}

function retryAnnouncements() {
  announcementsLoading.value = true
  announcementsError.value = ''
  api.announcements()
    .then((data) => { announcements.value = data?.announcements ?? [] })
    .catch(() => { announcements.value = []; announcementsError.value = 'Pengumuman belum dapat dimuat.' })
    .finally(() => { announcementsLoading.value = false })
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
  // Sidebar desktop permanen tanpa klik hamburger, jadi cek akses jalan di sini juga.
  checkAdminAccess()
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
            <button class="dash__menu-close" type="button" @click="closeMenu()" aria-label="Tutup menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
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
              <span v-if="!ATTENDANCE_ON" class="dash__soon">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Segera
              </span>
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
            </button>
            <button
              class="dash__menu-item"
              :class="{ active: dashTab === 'utilitas' }"
              type="button"
              :aria-current="dashTab === 'utilitas' ? 'page' : null"
              @click="goTab('utilitas')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>Utilitas</span>
              <span class="dash__soon">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Segera
              </span>
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

          <div class="dash__menu-sep" aria-hidden="true"></div>
          <button
            class="dash__menu-item dash__menu-home"
            type="button"
            @click="goHome"
            aria-label="Kembali ke beranda"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
            <span>Beranda</span>
          </button>

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

      <!-- Quick Access -->
      <div class="dash__section-head">
        <h2 class="dash__section-title">Akses Cepat</h2>
      </div>
      <div class="dash__quick-grid">
        <button class="dash__quick" type="button" aria-label="Buka absensi" @click="goTab('absensi')">
          <span class="dash__quick-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 11 16 15 12"/></svg>
          </span>
          <span class="dash__quick-text"><b>Absensi</b><small>{{ ATTENDANCE_ON ? 'Scan QR kehadiran' : 'Segera hadir' }}</small></span>
          <span v-if="!ATTENDANCE_ON" class="dash__quick-badge">Segera</span>
        </button>
        <button class="dash__quick" type="button" aria-label="Buka materi" @click="goTab('materi')">
          <span class="dash__quick-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </span>
          <span class="dash__quick-text"><b>Materi</b><small>Modul pembelajaran</small></span>
        </button>
        <button class="dash__quick" type="button" aria-label="Buka profil saya" @click="goTab('profil')">
          <span class="dash__quick-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span class="dash__quick-text"><b>Profil Saya</b><small>@{{ profile.username || 'anggota' }}</small></span>
        </button>
      </div>

      <!-- Pengumuman -->
      <div class="dash__section-head">
        <h2 class="dash__section-title">Pengumuman</h2>
        <span class="tiny muted">{{ announcements.length }} info</span>
      </div>

      <!-- Pengumuman loading -->
      <div v-if="announcementsLoading" class="dash__announce-list">
        <div v-for="n in 3" :key="n" class="ec-skeleton" style="height:96px;border-radius:14px"></div>
      </div>

      <!-- Pengumuman error -->
      <div v-else-if="announcementsError && !visibleAnnouncements.length" class="ec-state ec-state--error" role="alert">
        <span class="ec-state__title">Pengumuman belum dapat dimuat</span>
        <p class="ec-state__body">{{ announcementsError }}</p>
        <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="retryAnnouncements">Coba lagi</button>
      </div>

      <!-- Pengumuman list -->
      <div v-else-if="visibleAnnouncements.length" class="dash__announce-list">
        <article
          v-for="item in visibleAnnouncements"
          :key="item.id"
          class="dash__announce-card"
          :class="{ 'is-pinned': item.pinned }"
        >
          <div class="dash__announce-meta">
            <span v-if="item.pinned" class="dash__pin">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
              </svg>
              Disematkan
            </span>
            <span class="dash__announce-date">{{ formatWIB(item.created_at) }}</span>
          </div>
          <span class="dash__announce-title">{{ item.title }}</span>
          <p class="dash__announce-body">{{ item.body }}</p>
        </article>
      </div>

      <!-- Empty pengumuman -->
      <div v-else class="dash__empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        <p>Belum ada pengumuman.</p>
      </div>

      <!-- Logout (pindah ke drawer menu) -->
      </template>

      <!-- Profil Saya: layout ala X (banner + avatar overlap) -->
      <template v-else-if="dashTab === 'profil'">
        <div class="dash__profile-wrap">
          <article class="ec-card dash__profile-hero">
            <div class="dash__profile-banner" :style="{ background: groupStyle.banner }" aria-hidden="true">
              <span class="dash__profile-banner-mark">EC</span>
            </div>

            <div class="dash__profile-body">
              <div class="dash__profile-topline">
                <div class="dash__avatar-xl" :style="{ background: groupStyle.color }" aria-hidden="true">{{ initial }}</div>
              </div>

              <h1 class="dash__profile-displayname">{{ profile.fullname || profile.username || 'Anggota EC' }}</h1>
              <p class="dash__profile-handle">@{{ profile.username }}</p>

              <p class="dash__profile-bio">
                Anggota English Club UPB<span v-if="profile.group_name"> · Kelompok {{ profile.group_name }}</span>.
              </p>

              <div class="dash__profile-tags">
                <span v-if="profile.group_name" class="dash__tag" :style="{ color: groupStyle.color, background: groupStyle.bg }">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" />
                  </svg>
                  {{ profile.group_name }}
                </span>
                <span class="dash__tag dash__tag--active">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" />
                  </svg>
                  Anggota aktif
                </span>
              </div>
            </div>

            <dl class="dash__profile-stats">
              <template v-if="showAttendanceStats">
                <div class="dash__profile-stat">
                  <dt>Hadir</dt>
                  <dd>{{ attendanceCounts?.hadir ?? '—' }}</dd>
                </div>
                <div class="dash__profile-stat">
                  <dt>Izin</dt>
                  <dd>{{ attendanceCounts?.izin ?? '—' }}</dd>
                </div>
                <div class="dash__profile-stat">
                  <dt>Alpa</dt>
                  <dd>{{ attendanceCounts?.alpa ?? '—' }}</dd>
                </div>
              </template>
              <template v-else>
                <div class="dash__profile-stat">
                  <dt>Kelompok</dt>
                  <dd>{{ profile.group_name || '—' }}</dd>
                </div>
                <div class="dash__profile-stat">
                  <dt>Status</dt>
                  <dd>Aktif</dd>
                </div>
                <div class="dash__profile-stat">
                  <dt>Bergabung</dt>
                  <dd>{{ memberSinceShort }}</dd>
                </div>
              </template>
            </dl>
          </article>

          <!-- Timeline aktivitas: meniru feed profil X -->
          <section class="ec-card dash__activity" aria-label="Aktivitas absensi terbaru">
            <div class="dash__activity-head">
              <div>
                <h2 class="dash__activity-title">Aktivitas terbaru</h2>
                <p class="dash__activity-sub">Riwayat kehadiranmu di sesi absensi.</p>
              </div>
              <button v-if="ATTENDANCE_ON" class="dash__activity-link" type="button" @click="goTab('absensi')">Lihat semua</button>
            </div>

            <div v-if="!ATTENDANCE_ON" class="dash__activity-empty">
              <p>Fitur absensi belum dibuka.</p>
            </div>

            <div v-else-if="activityLoading" class="dash__activity-skel" aria-hidden="true">
              <div v-for="n in 3" :key="n" class="ec-skeleton" style="height:48px;border-radius:12px"></div>
            </div>

            <div v-else-if="activityError" class="dash__activity-empty">
              <p>Gagal memuat aktivitas. Coba buka tab Absensi.</p>
            </div>

            <ul v-else-if="activity?.length" class="dash__activity-list">
              <li v-for="item in activity" :key="item.id" class="dash__activity-row">
                <span class="dash__activity-icon" :class="`is-${item.attendance.status}`" aria-hidden="true">
                  <svg v-if="item.attendance.status === 'hadir'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" />
                  </svg>
                  <svg v-else-if="item.attendance.status === 'izin'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                  </svg>
                  <svg v-else-if="item.attendance.status === 'alpa'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
                  </svg>
                </span>
                <span class="dash__activity-main">
                  <b>{{ item.title || 'Sesi absensi' }}</b>
                  <small>{{ fmtSessionDate(item.date) }}{{ item.attendance.scanned_at ? ` · ${fmtTimeWIB(item.attendance.scanned_at)}` : '' }}</small>
                </span>
                <span class="dash__activity-status" :class="`is-${item.attendance.status}`">{{ attendanceStatusLabel(item.attendance.status) }}</span>
              </li>
            </ul>

            <div v-else class="dash__activity-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /><path d="m9 16 2 2 4-4" />
              </svg>
              <p>Belum ada aktivitas absensi.</p>
              <button v-if="ATTENDANCE_ON" class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="goTab('absensi')">Buka Absensi</button>
            </div>
          </section>
        </div>
      </template>

      <!-- Absensi: presensi QR + password + list + recent -->
      <div v-else-if="dashTab === 'absensi'">
        <PresensiView v-if="ATTENDANCE_ON" :can-display="canDisplayQr" :display-read-only="memberRole === 'so'" />
        <div v-else class="ec-state ec-state--notice dash__soon-card" role="status">
          <span class="ec-state__title">Absensi segera hadir</span>
          <p class="ec-state__body">Fitur presensi QR belum dibuka. Pantau pengumuman komunitas.</p>
          <div class="dash__soon-actions">
            <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="dashTab = 'dashboard'">Kembali ke Dashboard</button>
            <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="goHome">Ke Beranda</button>
          </div>
        </div>
      </div>

      <!-- Materi: daftar embed Canva + viewer (tombol + untuk SO ke atas) -->
      <div v-else-if="dashTab === 'materi'">
        <MateriView :can-manage="canManageMateri" />
      </div>

      <!-- Utilitas: berkas administrasi anggota (tampilan awal / segera hadir) -->
      <div v-else-if="dashTab === 'utilitas'">
        <div class="dash__head">
          <span class="dash__eyebrow">Administrasi</span>
          <h1 class="dash__greeting">Utilitas</h1>
          <p class="dash__sub">Berkas administrasi keanggotaan yang siap dicetak.</p>
        </div>

        <div class="dash__section-head">
          <h2 class="dash__section-title">Berkas Administrasi</h2>
        </div>

        <div class="dash__util-grid">
          <article class="ec-card dash__util-card">
            <div class="dash__util-top">
              <span class="dash__util-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <circle cx="8" cy="11" r="2" />
                  <path d="M5 16c.6-1.5 1.7-2 3-2s2.4.5 3 2" />
                  <path d="M14 10h5M14 14h5" />
                </svg>
              </span>
              <span class="dash__util-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Segera
              </span>
            </div>
            <div class="dash__util-copy">
              <h3 class="dash__util-title">Kartu Anggota</h3>
              <p class="dash__util-desc">Cetak kartu identitas resmi anggota English Club UPB.</p>
            </div>
            <button class="ec-btn ec-btn--secondary ec-btn--sm dash__util-btn" type="button" disabled>Cetak kartu</button>
          </article>

          <article class="ec-card dash__util-card">
            <div class="dash__util-top">
              <span class="dash__util-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="m9 15 2 2 4-4" />
                </svg>
              </span>
              <span class="dash__util-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Segera
              </span>
            </div>
            <div class="dash__util-copy">
              <h3 class="dash__util-title">Surat Keaktifan</h3>
              <p class="dash__util-desc">Unduh surat keterangan aktif sebagai anggota English Club UPB.</p>
            </div>
            <button class="ec-btn ec-btn--secondary ec-btn--sm dash__util-btn" type="button" disabled>Cetak surat</button>
          </article>
        </div>

        <div class="dash__util-note" role="status">
          <span class="dash__util-note-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
              <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
            </svg>
          </span>
          <div class="dash__util-note-copy">
            <b>Sedang disiapkan</b>
            <p>Berkas administrasi akan bisa dicetak setelah data keanggotaan selesai diverifikasi pengurus.</p>
          </div>
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

/* ── Profil ala X: satu kolom terpusat ────────────────────── */
.dash__profile-wrap {
  display: block;
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  min-width: 0;
}

/* ── Soon-state actions ───────────────────────────────────── */
.dash__soon-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ── Utilitas: berkas administrasi ────────────────────────── */
.dash__util-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}
.dash__util-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border-radius: 16px;
}
.dash__util-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dash__util-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--ec-blue-050, #F1F6FC);
  color: var(--ec-blue);
}
.dash__util-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px 4px 7px;
  border-radius: 99px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%);
  color: #92400E;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.dash__util-badge svg { flex-shrink: 0; opacity: 0.85; }
.dash__util-copy { min-width: 0; }
.dash__util-title {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ec-ink);
}
.dash__util-desc {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ec-ink-soft);
}
.dash__util-btn { margin-top: auto; align-self: flex-start; }

.dash__util-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.09) 0%, rgba(180, 83, 9, 0.03) 100%);
}
.dash__util-note-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(180, 83, 9, 0.12);
  color: #B45309;
}
.dash__util-note-copy { min-width: 0; }
.dash__util-note-copy b {
  display: block;
  font-family: 'Outfit', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: #92400E;
}
.dash__util-note-copy p {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ec-ink-soft);
}

@media (max-width: 520px) {
  .dash__util-grid { grid-template-columns: 1fr; }
}

/* ── Tab admin tertanam ───────────────────────────────────── */
.dash__admin-tab { min-width: 0; }

/* ── Body ─────────────────────────────────────────────────── */
.dash__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px 56px;
  /* Rantai min-width putus di sini = anak lebar (kartu absensi, nama panjang)
     mendorong halaman di Safari iPhone. */
  min-width: 0;
  overflow-x: clip;
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

/* Skeleton loading dashboard masih memakai kartu ringkas ini. */
.dash__profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
}

/* ── Hero profil ala X ────────────────────────────────────── */
.dash__profile-hero {
  overflow: hidden;
  padding: 0;
  border-radius: 16px;
  box-shadow: none;
}

.dash__profile-banner {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, #0B569B 0%, #1D4ED8 58%, #38BDF8 100%);
}
.dash__profile-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 150% at 12% 0%, rgba(255, 255, 255, 0.22), transparent 58%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.35));
}
.dash__profile-banner-mark {
  position: absolute;
  right: 16px;
  bottom: -14px;
  z-index: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 104px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.08em;
  color: rgba(255, 255, 255, 0.16);
  user-select: none;
}

.dash__profile-body { padding: 0 20px 18px; }

.dash__profile-topline {
  display: flex;
  margin-top: -46px;
}

.dash__avatar-xl {
  position: relative;
  z-index: 1;
  width: 104px;
  height: 104px;
  border: 4px solid var(--ec-surface);
  border-radius: 50%;
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 40px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: var(--ec-shadow-sm);
}

.dash__profile-displayname {
  margin: 14px 0 0;
  font-family: 'Outfit', sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--ec-ink);
  overflow-wrap: anywhere;
}

.dash__profile-handle {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--ec-ink-soft);
}

.dash__profile-bio {
  margin: 10px 0 0;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ec-ink);
}

.dash__profile-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.dash__profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--ec-line);
  background: var(--ec-canvas);
}
.dash__profile-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dash__profile-stat dt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ec-ink-soft);
}
.dash__profile-stat dd {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .dash__profile-banner { height: 120px; }
  .dash__profile-banner-mark { font-size: 84px; right: 12px; }
  .dash__profile-body { padding: 0 16px 16px; }
  .dash__profile-topline { margin-top: -38px; }
  .dash__avatar-xl { width: 84px; height: 84px; border-width: 3px; font-size: 32px; }
  .dash__profile-displayname { margin-top: 12px; font-size: 20px; }
  .dash__profile-stats { padding: 12px 16px 16px; gap: 8px; }
  .dash__profile-stat dd { font-size: 13px; }
}

/* ── Aktivitas terbaru (timeline profil ala X) ────────────── */
.dash__activity {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.dash__activity-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.dash__activity-title {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--ec-ink);
}
.dash__activity-sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--ec-ink-soft);
}
.dash__activity-link {
  flex-shrink: 0;
  min-height: 36px;
  padding: 6px 4px;
  border: 0;
  background: none;
  color: var(--ec-blue);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.dash__activity-link:hover { text-decoration: underline; }
.dash__activity-link:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); border-radius: 8px; }
.dash__activity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.dash__activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 11px 0;
  border-bottom: 1px solid var(--ec-line);
}
.dash__activity-row:last-child { padding-bottom: 0; border-bottom: 0; }
.dash__activity-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ec-canvas);
  color: var(--ec-ink-soft);
}
.dash__activity-icon.is-hadir { background: var(--ec-success-bg); color: var(--ec-success); }
.dash__activity-icon.is-izin { background: var(--ec-warning-bg); color: var(--ec-warning); }
.dash__activity-icon.is-alpa { background: var(--ec-danger-bg); color: var(--ec-danger); }
.dash__activity-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dash__activity-main b {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dash__activity-main small {
  font-size: 12px;
  color: var(--ec-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dash__activity-status { flex-shrink: 0; font-size: 12px; font-weight: 700; }
.dash__activity-status.is-hadir { color: var(--ec-success); }
.dash__activity-status.is-izin { color: var(--ec-warning); }
.dash__activity-status.is-alpa { color: var(--ec-danger); }
.dash__activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  text-align: center;
  color: var(--ec-ink-soft);
  font-size: 13px;
}
.dash__activity-empty p { margin: 0; }
.dash__activity-empty svg { opacity: 0.55; }
.dash__activity-skel { display: flex; flex-direction: column; gap: 10px; }

@media (max-width: 520px) {
  .dash__activity { padding: 14px; }
  .dash__activity-link { font-size: 12.5px; }
}

.dash__tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 0;
  border-radius: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: nowrap;
}
.dash__tag svg { flex-shrink: 0; opacity: 0.9; }
.dash__tag--active { color: var(--ec-success); background: var(--ec-success-bg); }

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

/* ── Quick Access ───────────────────────────────────────── */
.dash__quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  min-width: 0;
}
.dash__quick {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 112px;
  padding: 14px 8px 12px;
  text-align: center;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: 14px;
  box-shadow: var(--ec-shadow-sm);
  cursor: pointer;
  transition: transform 160ms var(--ec-ease), border-color 160ms, box-shadow 160ms;
  font-family: inherit;
  color: var(--ec-ink);
}
.dash__quick:hover { transform: translateY(-1px); border-color: #c9dff5; box-shadow: 0 20px 48px -30px rgba(31, 41, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.94); }
.dash__quick:active { transform: scale(0.97); }
.dash__quick:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.dash__quick-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--ec-blue-050, #F1F6FC);
  color: var(--ec-blue);
}
.dash__quick-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; width: 100%; align-items: center; }
.dash__quick-text b { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; }
.dash__quick-text small {
  font-size: 11px;
  color: var(--ec-ink-soft);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.dash__quick-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 7px;
  border-radius: 99px;
  background: var(--ec-warning-bg, #FFFBEB);
  border: 1px solid var(--ec-warning-line, #FDE68A);
  color: var(--ec-warning, #B45309);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
@media (prefers-reduced-motion: reduce) {
  .dash__quick, .dash__quick:hover, .dash__quick:active { transform: none; }
}

/* ── Pengumuman ───────────────────────────────────────────── */
.dash__announce-list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dash__announce-card {
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: 14px;
  box-shadow: var(--ec-shadow-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dash__announce-card.is-pinned { border-color: rgba(255, 255, 255, 0.86); }
.dash__announce-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dash__pin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 0;
  border-radius: 6px;
  background: var(--ec-blue-050, #F1F6FC);
  color: var(--ec-blue);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.5;
  text-transform: uppercase;
}
.dash__pin svg { flex-shrink: 0; }
.dash__announce-date { font-size: 11.5px; color: var(--ec-ink-soft); }
.dash__announce-title {
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ec-ink);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.dash__announce-body {
  margin: 0;
  font-size: 13.5px;
  color: var(--ec-ink);
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

/* Liquid-glass surfaces for the member dashboard cards. */
.dash .ec-card,
.dash__quick,
.dash__announce-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.46) 48%, rgba(227, 237, 248, 0.62));
  border-color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 44px -28px rgba(31, 41, 55, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  backdrop-filter: blur(22px) saturate(160%);
}

.dash__announce-card.is-pinned {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.46) 48%, rgba(227, 237, 248, 0.62));
  border-color: rgba(255, 255, 255, 0.92);
}

@media (min-width: 1024px) {
  .dash .ec-card,
  .dash__quick,
  .dash__announce-card {
    box-shadow: 0 32px 88px -52px rgba(31, 41, 55, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.82);
  }

  .dash__quick:hover {
    box-shadow: 0 38px 100px -54px rgba(31, 41, 55, 0.27), inset 0 1px 0 rgba(255, 255, 255, 0.88);
  }
}

/* ── Proker grid (loading skeleton generik) ───────────────── */
.dash__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
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
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ec-ink-soft);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 160ms, color 160ms;
}
.dash__menu-close:hover { background: var(--ec-canvas); color: var(--ec-ink); }
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 3px 7px 3px 5px;
  border-radius: 99px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%);
  color: #92400E;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.dash__soon svg { flex-shrink: 0; opacity: 0.85; }

.dash__menu-sep { height: 1px; background: var(--ec-line); margin: 6px 2px; }
.dash__menu-home { margin-top: auto; }
.dash__menu-logout { margin-top: 0; }

@media (prefers-reduced-motion: reduce) {
  .dash-menu-enter-active .dash__menu { animation: none; }
  .dash-menu-enter-active .dash__overlay,
  .dash-menu-leave-active { transition: none; }
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .dash__quick-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
}
@media (max-width: 400px) {
  .dash__grid { grid-template-columns: 1fr; }
  .dash__nav-inner { padding: 12px 14px; }
  .dash__body { padding: 16px 12px 48px; }
  .dash__avatar-name { display: none; }
}

/* ── Tablet 641–1023px: bar & isi melebar, bukan kolom 640px ──
 * <1024px masih memakai burger + drawer, tapi layar tablet cukup lebar
 * sehingga nav/konten tidak perlu dikunci selebar ponsel. */
@media (min-width: 641px) and (max-width: 1023.98px) {
  .dash { max-width: none; }

  .dash__nav-inner,
  .dash__body {
    width: 100%;
    max-width: 920px;
    margin-inline: auto;
    padding-inline: 24px;
  }
}

/* ── Desktop ≥1024px: sidebar permanen + konten fluid ─────────
 * Mobile (<1024px) tidak berubah: burger + overlay drawer. */
@media (min-width: 1024px) {
  /* Shell full-width; yang 1180px hanya isi (inner/layout). */
  .dash {
    max-width: none;
  }

  .dash__nav-inner,
  .dash__layout {
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

  /* Quick access 3 kolom penuh di desktop; skeleton tetap 2 kolom. */
  .dash__grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .dash__quick-grid { gap: 16px; }

  .dash__announce-title { font-size: 16px; }

  .dash__soon-card { max-width: 640px; }
}
</style>
