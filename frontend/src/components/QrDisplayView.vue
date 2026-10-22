<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { api } from '../api.js'
import DonutChart from './DonutChart.vue'

const props = defineProps({
  token: { type: String, required: true },
  // Mode SO: hanya tampil QR + daftar hadir. Tanpa picker histori,
  // tanpa buat/tutup sesi, tanpa roster & koreksi status.
  readOnly: { type: Boolean, default: false },
})

// Satu sumber TTL QR (detik). Harus sama dengan BE + copy PresensiView.
// Refresh sengaja < TTL (8s < 10) agar QR tidak sempat kedaluwarsa di layar.
const QR_ROTATE_SECONDS = 10
const QR_REFRESH_MS = 8000
const LIST_REFRESH_MS = 3000
const STATS_REFRESH_MS = 5000
// Resolusi QR: besar agar tetap tajam di proyektor saat dibuka layar penuh.
const QR_IMAGE_WIDTH = 1024
// Warna statistik: versi gelap agar terbaca di latar putih.
// Palet mengikuti design system English Club (--ec-blue / --ec-warning / --ec-danger / --ec-ink-soft).
const STAT_META = [
  { key: 'hadir', label: 'Hadir', color: '#0B569B' },
  { key: 'izin', label: 'Izin', color: '#B45309' },
  { key: 'alpa', label: 'Alpa', color: '#B91C1C' },
  { key: 'belum', label: 'Belum', color: '#6B7280' },
]

const session = ref(null)
const sessions = ref([])
const selectedSessionId = ref('')
const sessionSearch = ref('')
const sessionDropdown = ref(null)
const filteredSessions = computed(() => {
  const query = sessionSearch.value.trim().toLocaleLowerCase('id-ID')
  if (!query) return sessions.value
  return sessions.value.filter((item) =>
    `${item.title} ${item.date} ${item.is_active ? 'aktif berjalan' : 'selesai lampau'}`
      .toLocaleLowerCase('id-ID')
      .includes(query),
  )
})
const qrUrl = ref('')
const expiresIn = ref(0)
const loading = ref(true)
const loadError = ref('')
const list = ref([])
const roster = ref([])
const rosterSearch = ref('')
const rosterPage = ref(1)
const rosterPageSize = ref(10)
const filteredRoster = computed(() => {
  const query = rosterSearch.value.trim().toLocaleLowerCase('id-ID')
  if (!query) return roster.value
  return roster.value.filter((member) => {
    const status = member.status || 'belum'
    const statusLabel = status === 'belum' ? 'belum absen' : status
    return `${member.fullname || ''} ${member.username || ''} ${statusLabel}`
      .toLocaleLowerCase('id-ID')
      .includes(query)
  })
})
const rosterPageCount = computed(() => Math.max(1, Math.ceil(filteredRoster.value.length / rosterPageSize.value)))
const paginatedRoster = computed(() => {
  const page = Math.min(rosterPage.value, rosterPageCount.value)
  const start = (page - 1) * rosterPageSize.value
  return filteredRoster.value.slice(start, start + rosterPageSize.value)
})
const rosterRangeStart = computed(() => filteredRoster.value.length ? (rosterPage.value - 1) * rosterPageSize.value + 1 : 0)
const rosterRangeEnd = computed(() => Math.min(rosterPage.value * rosterPageSize.value, filteredRoster.value.length))
const rosterLoading = ref(false)
const closing = ref(false)
const correcting = ref({})
const rosterUpdating = ref({})
const newTitle = ref('')
const creating = ref(false)

// ---- layar penuh + statistik (hanya tampil saat overlay terbuka) ----
const zoomOpen = ref(false)
const zoomTriggerButton = ref(null)
const zoomPanel = ref(null)
const isNativeFs = ref(false)
const stats = ref(null)
const statsLoading = ref(false)
const statsUpdatedAt = ref(null)
let statsTimer = null
let prevBodyOverflow = null
// iOS Safari tidak mendukung Fullscreen API untuk elemen biasa.
const canNativeFullscreen = typeof document !== 'undefined' && !!document.documentElement?.requestFullscreen

function segmentsFrom(source) {
  return STAT_META.map((meta) => ({
    key: meta.key,
    label: meta.label,
    color: meta.color,
    value: Number(source?.[meta.key] || 0),
  }))
}
const overallSegments = computed(() => segmentsFrom(stats.value))
const overallPercent = computed(() => {
  const total = Number(stats.value?.total || 0)
  if (!total) return 0
  return Math.round((Number(stats.value?.hadir || 0) / total) * 100)
})
const groupCards = computed(() => (stats.value?.groups || []).map((group) => ({
  name: group.name,
  total: Number(group.total || 0),
  hadir: Number(group.hadir || 0),
  percent: group.total ? Math.round((Number(group.hadir || 0) / group.total) * 100) : 0,
  segments: segmentsFrom(group),
})))
const staffSegments = computed(() => segmentsFrom(stats.value?.staff))
const staffTotal = computed(() => Number(stats.value?.staff?.total || 0))
function barWidth(value) {
  if (!staffTotal.value) return '0%'
  return `${Math.round((Number(value || 0) / staffTotal.value) * 100)}%`
}
const statsUpdatedLabel = computed(() => {
  if (!statsUpdatedAt.value) return ''
  const d = statsUpdatedAt.value
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`
})

let qrTimer = null
let listTimer = null
let countTimer = null

async function loadActive() {
  stats.value = null
  statsUpdatedAt.value = null
  if (props.readOnly) {
    const activeResult = await api.attendanceActive(props.token)
    sessions.value = []
    session.value = activeResult.session || null
    selectedSessionId.value = session.value?.id || ''
    list.value = []
    roster.value = []
    qrUrl.value = ''
    return
  }
  const [activeResult, sessionsResult] = await Promise.all([
    api.attendanceActive(props.token),
    api.attendanceSessions(props.token),
  ])
  sessions.value = sessionsResult.sessions || []
  session.value = activeResult.session || null
  selectedSessionId.value = session.value?.id || ''
  list.value = []
  roster.value = []
  qrUrl.value = ''
}

async function selectSession(sessionId) {
  if (props.readOnly) return
  if (sessionDropdown.value) sessionDropdown.value.open = false
  sessionSearch.value = ''
  const selected = sessions.value.find((item) => String(item.id) === String(sessionId))
  if (!selected || String(session.value?.id) === String(selected.id)) return
  stopTimers()
  stats.value = null
  statsUpdatedAt.value = null
  session.value = selected
  selectedSessionId.value = String(selected.id)
  qrUrl.value = ''
  list.value = []
  roster.value = []
  await Promise.all([refreshList(), refreshRoster(), ...(selected.is_active ? [refreshQr()] : [])])
  if (selected.is_active) startTimers()
}

function startTimers() {
  stopTimers()
  qrTimer = setInterval(refreshQr, QR_REFRESH_MS)
  listTimer = setInterval(refreshList, LIST_REFRESH_MS)
  countTimer = setInterval(() => { expiresIn.value = Math.max(0, expiresIn.value - 1) }, 1000)
}

async function createSession() {
  if (props.readOnly) return
  if (!newTitle.value.trim() || creating.value) return
  creating.value = true
  loadError.value = ''
  try {
    const r = await api.attendanceSession(newTitle.value.trim(), props.token)
    session.value = { id: r.session.id, title: r.session.title, date: r.session.date, is_active: true }
    await loadSessions()
    selectedSessionId.value = String(session.value.id)
    newTitle.value = ''
    await Promise.all([refreshQr(), refreshList(), refreshRoster()])
    startTimers()
  } catch (e) {
    loadError.value = e?.message || 'Gagal membuat sesi.'
  } finally {
    creating.value = false
  }
}

async function loadSessions() {
  if (props.readOnly) return
  const r = await api.attendanceSessions(props.token)
  sessions.value = r.sessions || []
}

async function refreshQr() {
  if (!session.value) return
  try {
    const r = await api.attendanceDisplayToken(session.value.id, props.token)
    qrUrl.value = await QRCode.toDataURL(r.payload, { width: QR_IMAGE_WIDTH, margin: 2 })
    expiresIn.value = Math.max(0, Math.round((r.expires_in_ms || QR_ROTATE_SECONDS * 1000) / 1000))
  } catch (e) {
    if (e?.status === 410) {
      stopTimers()
      session.value = { ...session.value, is_active: false }
    }
  }
}

async function refreshList() {
  if (!session.value) return
  try {
    const r = await api.attendanceList(session.value.id, props.token)
    list.value = r.records || []
  } catch { /* polling diam: abaikan */ }
}

async function refreshRoster() {
  if (props.readOnly) return
  if (!session.value) return
  rosterLoading.value = true
  try {
    const r = await api.attendanceSessionRoster(session.value.id, props.token)
    roster.value = r.members || []
  } catch (e) {
    console.warn('Roster absensi gagal dimuat:', e)
    roster.value = []
  } finally {
    rosterLoading.value = false
  }
}

function resetRosterPage() {
  rosterPage.value = 1
}

function setRosterPageSize(value) {
  const size = Number.parseInt(value, 10)
  rosterPageSize.value = Number.isFinite(size) ? Math.max(1, size) : 10
  rosterPage.value = 1
}

async function updateMemberStatus(memberId, status) {
  if (props.readOnly) return
  if (!session.value || rosterUpdating.value[memberId]) return
  rosterUpdating.value[memberId] = true
  try {
    await api.attendanceSessionSetStatus(session.value.id, memberId, status, props.token)
    await Promise.all([refreshRoster(), refreshList()])
  } catch (e) {
    alert(e?.message || 'Gagal mengubah status anggota.')
  } finally {
    rosterUpdating.value[memberId] = false
  }
}

function stopTimers() {
  ;[qrTimer, listTimer, countTimer].forEach((t) => t && clearInterval(t))
  qrTimer = listTimer = countTimer = null
}

// ---- statistik & layar penuh ----
function stopStatsTimer() {
  if (statsTimer) clearInterval(statsTimer)
  statsTimer = null
}

async function refreshStats() {
  if (!session.value) return
  if (stats.value === null) statsLoading.value = true
  try {
    const r = await api.attendanceSessionStats(session.value.id, props.token)
    stats.value = r
    statsUpdatedAt.value = new Date()
  } catch {
    // Diam saja: polling berikutnya mencoba lagi (overlay tetap menampilkan data terakhir).
  } finally {
    statsLoading.value = false
  }
}

// Polling berhenti saat tab tidak aktif; begitu kembali terlihat, tarik data
// langsung supaya angka tidak tertinggal sampai interval berikutnya.
function onVisibilityChange() {
  if (document.visibilityState === 'visible' && zoomOpen.value) refreshStats()
}

function lockScroll(lock) {
  if (typeof document === 'undefined') return
  if (lock) {
    if (prevBodyOverflow === null) prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  if (prevBodyOverflow !== null) {
    document.body.style.overflow = prevBodyOverflow
    prevBodyOverflow = null
  }
}

async function requestNativeFullscreen() {
  try {
    const el = document.documentElement
    if (!document.fullscreenElement && el?.requestFullscreen) await el.requestFullscreen()
  } catch { /* overlay tetap jalan walau native fullscreen ditolak */ }
}

async function exitNativeFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen()
  } catch { /* abaikan */ }
}

async function toggleNativeFullscreen() {
  if (document.fullscreenElement) await exitNativeFullscreen()
  else await requestNativeFullscreen()
}

function onFullscreenChange() {
  isNativeFs.value = !!document.fullscreenElement
  // Keluar dari fullscreen native (ESC / tombol browser) = tutup overlay juga.
  if (!isNativeFs.value && zoomOpen.value) closeZoom()
}

function openZoom() {
  if (zoomOpen.value) return
  zoomOpen.value = true
  lockScroll(true)
  stats.value = null
  statsUpdatedAt.value = null
  refreshStats()
  stopStatsTimer()
  statsTimer = setInterval(refreshStats, STATS_REFRESH_MS)
  requestNativeFullscreen()
  nextTick(() => zoomPanel.value?.focus?.())
}

// Tap/klik di area kosong (di luar QR, header, dan kartu statistik) = tutup.
function onZoomTap(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.qr-zoom__head, .qr-zoom__stats, .qr-zoom__qr, .qr-zoom__qr-skel, .qr-zoom__hint')) return
  closeZoom()
}

function closeZoom() {
  if (!zoomOpen.value) return
  zoomOpen.value = false
  stopStatsTimer()
  lockScroll(false)
  exitNativeFullscreen()
  nextTick(() => zoomTriggerButton.value?.focus?.())
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

async function start() {
  loading.value = true
  loadError.value = ''
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Koneksi lambat. Periksa jaringan lalu coba lagi.')), 20000),
  )
  try {
    await Promise.race([(async () => {
      await loadActive()
      if (!session.value) return
      await Promise.all([refreshQr(), refreshList(), ...(props.readOnly ? [] : [refreshRoster()])])
    })(), timeout])
    if (!session.value) return
    startTimers()
  } catch (e) {
    loadError.value = e?.message || 'Gagal memuat display absensi.'
  } finally {
    loading.value = false
  }
}

async function closeSession() {
  if (props.readOnly) return
  if (!session.value || closing.value) return
  if (!confirm(`Tutup sesi "${session.value.title}"? QR berhenti berlaku.`)) return
  closing.value = true
  try {
    const r = await api.attendanceClose(session.value.id, props.token)
    session.value = { ...session.value, is_active: r.session.is_active }
    await loadSessions()
    await refreshRoster()
    stopTimers()
    stopStatsTimer()
    if (zoomOpen.value) closeZoom()
  } catch (e) {
    alert(e?.message || 'Gagal menutup sesi.')
  } finally {
    closing.value = false
  }
}

async function correct(id, status) {
  if (props.readOnly) return
  if (correcting.value[id]) return
  correcting.value[id] = true
  try {
    await api.attendanceCorrect(id, status, props.token)
    await refreshList()
  } catch (e) {
    alert(e?.message || 'Gagal mengubah status.')
  } finally {
    correcting.value[id] = false
  }
}

function fmtTime(iso) {
  try {
    const d = new Date(iso)
    return isNaN(d) ? '—' : d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return '—' }
}

start()

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopTimers()
  stopStatsTimer()
  lockScroll(false)
  zoomOpen.value = false
  try {
    const p = document.exitFullscreen?.()
    if (p?.catch) p.catch(() => {})
  } catch { /* abaikan */ }
})
</script>

<template>
  <div class="qr-display">
    <div v-if="loading" class="ec-state" role="status">
      <span class="ec-state__title">Menyiapkan display...</span>
    </div>
    <div v-else-if="loadError" class="ec-state ec-state--error" role="alert">
      <span class="ec-state__title">Gagal memuat</span>
      <p class="ec-state__body">{{ loadError }}</p>
      <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="start">Coba lagi</button>
    </div>
    <template v-else-if="session">
      <details v-if="!readOnly && sessions.length" ref="sessionDropdown" class="qr-display__session-picker">
        <summary class="qr-display__session-trigger">
          <span class="qr-display__session-preview">
            <strong>{{ session.title }}</strong>
            <small>{{ session.date }} · {{ session.is_active ? 'Sesi aktif' : 'Sesi selesai' }}</small>
          </span>
          <span class="qr-display__session-chevron" aria-hidden="true"></span>
        </summary>
        <div class="qr-display__session-menu">
          <input v-model="sessionSearch" class="ec-field" type="search" aria-label="Cari sesi absensi" placeholder="Cari judul, tanggal, atau status..." />
          <div v-if="filteredSessions.length" class="qr-display__session-options" role="listbox" aria-label="Daftar sesi absensi">
            <button
              v-for="item in filteredSessions"
              :key="item.id"
              class="qr-display__session-option"
              :class="{ 'is-selected': String(item.id) === String(selectedSessionId) }"
              type="button"
              role="option"
              :aria-selected="String(item.id) === String(selectedSessionId)"
              @click="selectSession(item.id)"
            >
              <span class="qr-display__session-preview">
                <strong>{{ item.title }}</strong>
                <small>{{ item.date }}</small>
              </span>
              <span class="qr-display__session-badge" :class="item.is_active ? 'is-active' : 'is-closed'">
                {{ item.is_active ? 'Aktif' : 'Selesai' }}
              </span>
            </button>
          </div>
          <p v-else class="qr-display__session-empty">Tidak ada sesi yang cocok.</p>
        </div>
      </details>
      <div class="qr-display__head">
        <div>
          <h3 class="qr-display__title">{{ session.title }}</h3>
          <p class="ec-caption">{{ session.date }} &middot; {{ session.is_active ? `QR baru tiap ${QR_ROTATE_SECONDS} detik (ganti dalam ${expiresIn}s)` : 'Sesi ditutup' }}</p>
        </div>
        <button v-if="!readOnly && session.is_active" class="ec-btn ec-btn--danger ec-btn--sm" type="button" :disabled="closing" @click="closeSession">
          {{ closing ? 'Menutup...' : 'Tutup Sesi' }}
        </button>
      </div>
      <div v-if="session.is_active" class="qr-display__qrwrap">
        <button
          ref="zoomTriggerButton"
          class="qr-display__zoom"
          type="button"
          aria-label="Perbesar QR ke layar penuh"
          @click="openZoom"
        >
          <img v-if="qrUrl" :src="qrUrl" alt="QR presensi" class="qr-display__qr" width="1024" height="1024" />
          <div v-else class="ec-skeleton qr-display__qr-skel"></div>
          <span class="qr-display__zoom-hint" aria-hidden="true">Perbesar &amp; layar penuh</span>
        </button>
      </div>
      <div class="qr-display__listhead">
        <h3 class="qr-display__title">{{ session.is_active ? 'Baru check-in' : 'Riwayat check-in' }} ({{ list.length }})</h3>
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="refreshList">Refresh</button>
      </div>
      <ul v-if="list.length" class="qr-display__list">
        <li v-for="r in list" :key="r.id" class="qr-display__row">
          <span class="qr-display__avatar">{{ (r.fullname || r.username || '?').charAt(0).toUpperCase() }}</span>
          <span class="qr-display__name">{{ r.fullname || r.username }}<small>@{{ r.username }} &middot; {{ fmtTime(r.scanned_at) }}</small></span>
          <span v-if="readOnly" class="qr-display__session-badge is-active">{{ r.status || 'hadir' }}</span>
          <select
            v-else
            :value="r.status"
            class="ec-field ec-field--sm qr-display__status"
            :disabled="!!correcting[r.id]"
            :aria-label="'Status ' + (r.fullname || r.username)"
            @change="correct(r.id, $event.target.value)"
          >
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="alpa">Alpa</option>
          </select>
        </li>
      </ul>
      <p v-else class="ec-body">Belum ada yang check-in. QR siap dipindai.</p>

      <template v-if="!readOnly">
      <div class="qr-display__divider"></div>

      <div class="qr-display__listhead">
        <h3 class="qr-display__title">Atur status per anggota ({{ roster.length }})</h3>
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="refreshRoster" :disabled="rosterLoading">
          {{ rosterLoading ? 'Memuat...' : 'Refresh' }}
        </button>
      </div>
      <div class="qr-display__roster-tools">
        <label class="qr-display__roster-search">
          <span class="ec-label">Cari anggota</span>
          <input
            v-model="rosterSearch"
            class="ec-field"
            type="search"
            placeholder="Nama, username, atau status..."
            @input="resetRosterPage"
          />
        </label>
        <label class="qr-display__page-size">
          <span class="ec-label">Anggota per halaman</span>
          <input
            class="ec-field"
            type="number"
            min="1"
            step="1"
            :value="rosterPageSize"
            @change="setRosterPageSize($event.target.value)"
          />
        </label>
        <p class="ec-caption qr-display__roster-range">
          Menampilkan {{ rosterRangeStart }}–{{ rosterRangeEnd }} dari {{ filteredRoster.length }} anggota
        </p>
      </div>
      <div v-if="rosterLoading" class="ec-skeleton" style="height:120px;border-radius:14px"></div>
      <ul v-else-if="paginatedRoster.length" class="qr-display__list qr-display__roster-list">
        <li v-for="member in paginatedRoster" :key="member.id" class="qr-display__row qr-display__row--card">
          <div class="qr-display__member">
            <span class="qr-display__avatar">{{ (member.fullname || member.username || '?').charAt(0).toUpperCase() }}</span>
            <span class="qr-display__name">
              <span>{{ member.fullname || member.username }}</span>
              <small>@{{ member.username }}{{ member.scanned_at ? ' &middot; ' + fmtTime(member.scanned_at) : '' }}</small>
            </span>
          </div>
          <select
            :value="member.status || 'belum'"
            class="ec-field ec-field--sm qr-display__status qr-display__status--compact"
            :disabled="!!rosterUpdating[member.id]"
            :aria-label="'Status manual ' + (member.fullname || member.username)"
            @change="updateMemberStatus(member.id, $event.target.value)"
          >
            <option value="belum">Belum absen</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="alpa">Alpa</option>
          </select>
        </li>
      </ul>
      <p v-else-if="roster.length" class="ec-body">Tidak ada anggota yang cocok dengan pencarian.</p>
      <p v-else class="ec-body">Belum ada data anggota untuk sesi ini.</p>
      <nav v-if="filteredRoster.length" class="qr-display__pagination" aria-label="Halaman daftar anggota">
        <button
          class="ec-btn ec-btn--ghost ec-btn--sm"
          type="button"
          :disabled="rosterPage <= 1"
          aria-label="Halaman sebelumnya"
          @click="rosterPage--"
        >Sebelumnya</button>
        <div class="qr-display__page-numbers">
          <button
            v-for="page in rosterPageCount"
            :key="page"
            class="qr-display__page-number"
            :class="{ 'is-current': page === rosterPage }"
            type="button"
            :aria-label="'Halaman ' + page"
            :aria-current="page === rosterPage ? 'page' : undefined"
            @click="rosterPage = page"
          >{{ page }}</button>
        </div>
        <button
          class="ec-btn ec-btn--ghost ec-btn--sm"
          type="button"
          :disabled="rosterPage >= rosterPageCount"
          aria-label="Halaman berikutnya"
          @click="rosterPage++"
        >Berikutnya</button>
      </nav>
      </template>
    </template>
    <div v-else class="ec-state" role="status">
      <details v-if="!readOnly && sessions.length" ref="sessionDropdown" class="qr-display__session-picker">
        <summary class="qr-display__session-trigger">
          <span class="qr-display__session-preview">
            <strong>Pilih sesi lampau</strong>
            <small>Cari sesi untuk melihat atau mengedit presensi</small>
          </span>
          <span class="qr-display__session-chevron" aria-hidden="true"></span>
        </summary>
        <div class="qr-display__session-menu">
          <input v-model="sessionSearch" class="ec-field" type="search" aria-label="Cari sesi absensi" placeholder="Cari judul, tanggal, atau status..." />
          <div v-if="filteredSessions.length" class="qr-display__session-options" role="listbox" aria-label="Daftar sesi absensi">
            <button
              v-for="item in filteredSessions"
              :key="item.id"
              class="qr-display__session-option"
              type="button"
              role="option"
              :aria-selected="false"
              @click="selectSession(item.id)"
            >
              <span class="qr-display__session-preview">
                <strong>{{ item.title }}</strong>
                <small>{{ item.date }}</small>
              </span>
              <span class="qr-display__session-badge" :class="item.is_active ? 'is-active' : 'is-closed'">
                {{ item.is_active ? 'Aktif' : 'Selesai' }}
              </span>
            </button>
          </div>
          <p v-else class="qr-display__session-empty">Tidak ada sesi yang cocok.</p>
        </div>
      </details>
      <span class="ec-state__title">Tidak ada sesi aktif</span>
      <p v-if="readOnly" class="ec-state__body">Belum ada sesi aktif. Minta SO membuka sesi dulu lalu tekan Refresh.</p>
      <p v-else class="ec-state__body">Buat sesi baru untuk membuka presensi. Membuat sesi baru otomatis menutup sesi lama.</p>
      <template v-if="!readOnly">
      <label class="ec-label" for="qr-new-title">Judul sesi</label>
      <input
        id="qr-new-title"
        v-model="newTitle"
        class="ec-field"
        maxlength="80"
        placeholder="cth. Pertemuan Rutin 12 Okt"
        @keyup.enter="createSession"
      />
      <div v-if="!readOnly" class="qr-display__actions" style="margin-top:10px">
        <button class="ec-btn ec-btn--primary ec-btn--sm" type="button" :disabled="creating || !newTitle.trim()" @click="createSession">
          {{ creating ? 'Membuat...' : 'Buka Sesi Baru' }}
        </button>
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="start">Refresh</button>
      </div>
      <div v-else class="qr-display__actions" style="margin-top:10px">
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="start">Refresh</button>
      </div>
      </template>
      <p v-if="loadError" class="qr-display__err" role="alert">{{ loadError }}</p>
    </div>

    <!-- Tampilan besar: QR + statistik donut (khusus layar penuh) -->
    <Teleport to="body">
      <div
        v-if="zoomOpen && session"
        ref="zoomPanel"
        class="qr-zoom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-zoom-title"
        tabindex="-1"
        @click="onZoomTap"
        @keydown.esc.stop.prevent="closeZoom"
      >
        <header class="qr-zoom__head">
          <div class="qr-zoom__titles">
            <p class="qr-zoom__eyebrow">Display QR</p>
            <h2 id="qr-zoom-title" class="qr-zoom__title">{{ session.title }}</h2>
            <p class="qr-zoom__sub">
              {{ session.date }} &middot;
              {{ session.is_active ? `QR baru dalam ${expiresIn}s` : 'Sesi ditutup' }}
            </p>
          </div>
          <div class="qr-zoom__actions">
            <button v-if="canNativeFullscreen" class="qr-zoom__btn" type="button" @click="toggleNativeFullscreen">
              {{ isNativeFs ? 'Keluar layar penuh' : 'Layar penuh' }}
            </button>
          </div>
        </header>

        <div class="qr-zoom__body">
          <section class="qr-zoom__qr-panel" aria-label="Kode QR presensi">
            <img v-if="qrUrl" :src="qrUrl" alt="QR presensi" class="qr-zoom__qr" width="1024" height="1024" />
            <div v-else class="ec-skeleton qr-zoom__qr-skel"></div>
            <p class="qr-zoom__hint">Pindai dengan kamera HP &middot; QR berganti tiap {{ QR_ROTATE_SECONDS }} detik</p>
          </section>

          <aside class="qr-zoom__stats" aria-label="Statistik kehadiran">
            <div class="qr-zoom__card">
              <div class="qr-zoom__card-head">
                <h3 class="qr-zoom__card-title">Kehadiran anggota</h3>
                <span class="qr-zoom__card-meta">{{ statsLoading ? 'Memuat…' : `${stats?.total || 0} anggota` }}</span>
              </div>
              <div class="qr-zoom__overall">
                <DonutChart
                  :segments="overallSegments"
                  :total="stats?.total || 0"
                  :size="196"
                  :thickness="22"
                  :center-value="`${overallPercent}%`"
                  center-label="hadir"
                />
                <ul class="qr-zoom__legend">
                  <li v-for="item in overallSegments" :key="item.key">
                    <span class="qr-zoom__dot" :style="{ background: item.color }" aria-hidden="true"></span>
                    <span class="qr-zoom__legend-label">{{ item.label }}</span>
                    <span class="qr-zoom__legend-value">{{ item.value }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="qr-zoom__card">
              <div class="qr-zoom__card-head">
                <h3 class="qr-zoom__card-title">Per kelompok</h3>
                <span class="qr-zoom__card-meta">% hadir</span>
              </div>
              <div v-if="groupCards.length" class="qr-zoom__groups">
                <div v-for="group in groupCards" :key="group.name" class="qr-zoom__group">
                  <DonutChart
                    :segments="group.segments"
                    :total="group.total"
                    :size="84"
                    :thickness="10"
                    :gap="1.5"
                    :center-value="`${group.percent}%`"
                  />
                  <span class="qr-zoom__group-name">{{ group.name }}</span>
                  <span class="qr-zoom__group-meta">{{ group.hadir }}/{{ group.total }}</span>
                </div>
              </div>
              <p v-else class="qr-zoom__empty">Belum ada data kelompok.</p>
            </div>

            <div v-if="staffTotal" class="qr-zoom__card">
              <div class="qr-zoom__card-head">
                <h3 class="qr-zoom__card-title">SO / Panitia</h3>
                <span class="qr-zoom__card-meta">{{ stats.staff.hadir }}/{{ staffTotal }} hadir</span>
              </div>
              <ul class="qr-zoom__bars">
                <li v-for="item in staffSegments" :key="item.key" class="qr-zoom__bar-row">
                  <span class="qr-zoom__bar-label">{{ item.label }}</span>
                  <span class="qr-zoom__bar-track">
                    <span class="qr-zoom__bar-fill" :style="{ width: barWidth(item.value), background: item.color }"></span>
                  </span>
                  <span class="qr-zoom__bar-value">{{ item.value }}</span>
                </li>
              </ul>
            </div>
            <p v-if="statsUpdatedLabel" class="qr-zoom__updated">
              Diperbarui {{ statsUpdatedLabel }} &middot; otomatis tiap 5 detik
            </p>
          </aside>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.qr-display { display: flex; flex-direction: column; gap: 14px; }
.qr-display__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.qr-display__session-picker { position: relative; }
.qr-display__session-trigger { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--ec-line); border-radius: var(--ec-radius-md); background: var(--ec-canvas); cursor: pointer; list-style: none; }
.qr-display__session-trigger::-webkit-details-marker { display: none; }
.qr-display__session-preview { display: flex; flex-direction: column; min-width: 0; }
.qr-display__session-preview strong { overflow: hidden; color: var(--ec-ink); font-size: 0.9rem; text-overflow: ellipsis; white-space: nowrap; }
.qr-display__session-preview small { overflow: hidden; color: var(--ec-ink-soft); font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
.qr-display__session-chevron { width: 9px; height: 9px; flex: 0 0 auto; border-right: 2px solid var(--ec-ink-soft); border-bottom: 2px solid var(--ec-ink-soft); transform: rotate(45deg) translateY(-2px); transition: transform 160ms ease; }
.qr-display__session-picker[open] .qr-display__session-chevron { transform: rotate(225deg) translate(-2px, -1px); }
.qr-display__session-menu { position: absolute; z-index: 5; top: calc(100% + 6px); left: 0; right: 0; display: grid; gap: 8px; padding: 10px; border: 1px solid var(--ec-line); border-radius: var(--ec-radius-md); background: var(--ec-canvas); box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14); }
.qr-display__session-options { display: grid; gap: 4px; max-height: 280px; overflow-y: auto; }
.qr-display__session-option { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 9px 8px; border: 0; border-radius: 6px; background: transparent; text-align: left; cursor: pointer; }
.qr-display__session-option:hover, .qr-display__session-option:focus-visible, .qr-display__session-option.is-selected { background: var(--ec-canvas-soft, rgba(15, 23, 42, 0.06)); }
.qr-display__session-badge { flex: 0 0 auto; padding: 3px 7px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
.qr-display__session-badge.is-active { background: var(--ec-success-bg); color: var(--ec-success); }
.qr-display__session-badge.is-closed { background: var(--ec-canvas); color: var(--ec-ink-soft); }
.qr-display__session-empty { margin: 0; padding: 10px 8px; color: var(--ec-ink-soft); font-size: 0.85rem; }
.qr-display__title { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--ec-ink); margin: 0 0 2px; }
.qr-display__qrwrap { display: grid; place-items: center; padding: 12px; background: var(--ec-canvas); border: 1px solid var(--ec-line); border-radius: var(--ec-radius-lg); }
.qr-display__zoom { position: relative; display: grid; place-items: center; gap: 8px; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; border-radius: var(--ec-radius-md); }
.qr-display__zoom:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.qr-display__qr { width: min(100%, 420px); height: auto; border-radius: 10px; background: #fff; }
.qr-display__qr-skel { width: min(100%, 420px); aspect-ratio: 1; border-radius: 14px; }
/* Petunjuk sengaja di luar gambar QR agar tidak menutupi modul QR. */
.qr-display__zoom-hint { padding: 6px 11px; border-radius: 999px; background: rgba(15, 23, 42, 0.06); color: var(--ec-ink-soft); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.01em; pointer-events: none; }
.qr-display__zoom:hover .qr-display__zoom-hint { background: rgba(15, 23, 42, 0.1); color: var(--ec-ink); }

/* ---- Overlay layar penuh: QR besar + statistik ---- */
.qr-zoom { position: fixed; inset: 0; z-index: 120; display: flex; flex-direction: column; gap: 12px; height: 100vh; height: 100dvh; overflow-y: auto; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); background: #fff; color: var(--ec-ink, #1F2937); overscroll-behavior: contain; }
.qr-zoom:focus { outline: none; }
.qr-zoom__head { display: flex; flex: 0 0 auto; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.qr-zoom__titles { min-width: 0; }
.qr-zoom__eyebrow { margin: 0 0 3px; color: var(--ec-blue, #0B569B); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.qr-zoom__title { margin: 0; color: var(--ec-ink, #1F2937); font-family: 'Outfit', sans-serif; font-size: clamp(1.05rem, 2.2vw, 1.5rem); font-weight: 800; line-height: 1.2; }
.qr-zoom__sub { margin: 3px 0 0; color: var(--ec-ink-soft, #6B7280); font-size: 0.82rem; }
.qr-zoom__actions { display: flex; align-items: center; gap: 8px; }
.qr-zoom__btn { min-height: 40px; padding: 8px 14px; border: 1px solid var(--ec-line, #E5E7EB); border-radius: 999px; background: var(--ec-canvas, #F5F7FA); color: var(--ec-ink, #1F2937); font: inherit; font-size: 0.8rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
.qr-zoom__btn:hover { border-color: var(--ec-blue, #0B569B); color: var(--ec-blue, #0B569B); background: #fff; }
.qr-zoom__btn:focus-visible { outline: none; box-shadow: var(--ec-focus-ring, 0 0 0 3px rgba(11, 86, 155, 0.35)); }
.qr-zoom__body { display: grid; grid-template-columns: minmax(0, 1fr) clamp(280px, 25vw, 350px); align-items: stretch; justify-content: center; gap: 14px; width: 100%; max-width: calc(100dvh + 240px); margin: 0 auto; flex: 1; min-height: 0; }
.qr-zoom__qr-panel { display: grid; grid-template-rows: minmax(0, 1fr) auto; align-items: center; justify-items: center; gap: 8px; min-width: 0; min-height: 0; }
/* Tanpa stroke: QR tampil polos, hanya dibatasi bidang putihnya sendiri. */
.qr-zoom__qr { display: block; width: auto; height: auto; max-width: 100%; max-height: 100%; min-height: 0; object-fit: contain; border: 0; border-radius: 12px; background: #fff; }
.qr-zoom__qr-skel { width: 100%; height: 100%; border-radius: 14px; }
.qr-zoom__hint { margin: 0; color: var(--ec-ink-soft, #6B7280); font-size: 0.76rem; text-align: center; }
.qr-zoom__stats { display: flex; flex-direction: column; justify-content: safe center; gap: 10px; min-width: 0; max-height: 100%; overflow-y: auto; padding-right: 2px; }
.qr-zoom__card { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border: 1px solid var(--ec-line, #E5E7EB); border-radius: 14px; background: var(--ec-canvas, #F7F9FC); }
.qr-zoom__card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.qr-zoom__card-title { margin: 0; color: var(--ec-ink, #1F2937); font-family: 'Outfit', sans-serif; font-size: 0.88rem; font-weight: 700; }
.qr-zoom__card-meta { color: var(--ec-ink-soft, #6B7280); font-size: 0.7rem; font-weight: 600; }
.qr-zoom__overall { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.qr-zoom__legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; width: 100%; max-width: 250px; }
.qr-zoom__legend li { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
.qr-zoom__dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; }
.qr-zoom__legend-label { flex: 1; color: var(--ec-ink-soft, #6B7280); }
.qr-zoom__legend-value { color: var(--ec-ink, #1F2937); font-weight: 700; font-variant-numeric: tabular-nums; }
.qr-zoom__groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); justify-items: center; gap: 10px 8px; }
.qr-zoom__group { display: grid; justify-items: center; gap: 3px; text-align: center; }
.qr-zoom__group-name { color: var(--ec-ink, #1F2937); font-size: 0.72rem; font-weight: 700; }
.qr-zoom__group-meta { color: var(--ec-ink-soft, #6B7280); font-size: 0.68rem; font-variant-numeric: tabular-nums; }
.qr-zoom__empty { margin: 0; color: var(--ec-ink-soft, #6B7280); font-size: 0.8rem; }
.qr-zoom__updated { margin: 0; text-align: center; color: var(--ec-ink-soft, #6B7280); font-size: 0.68rem; }
/* Grafik batang horizontal untuk SO / panitia (di luar statistik anggota) */
.qr-zoom__bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.qr-zoom__bar-row { display: grid; grid-template-columns: 52px minmax(0, 1fr) 26px; align-items: center; gap: 8px; font-size: 0.74rem; }
.qr-zoom__bar-label { color: var(--ec-ink-soft, #6B7280); font-weight: 600; }
.qr-zoom__bar-track { display: block; height: 8px; overflow: hidden; border-radius: 999px; background: var(--ec-line, #E5E7EB); }
.qr-zoom__bar-fill { display: block; height: 100%; border-radius: 999px; transition: width 220ms ease; }
.qr-zoom__bar-value { color: var(--ec-ink, #1F2937); font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }

@media (max-width: 900px) {
  .qr-zoom__body { grid-template-columns: 1fr; align-items: start; }
  .qr-zoom__qr-panel { grid-template-rows: auto auto; }
  .qr-zoom__qr { width: min(86vmin, 460px); height: auto; aspect-ratio: 1; justify-self: center; }
  .qr-zoom__qr-skel { width: min(86vmin, 460px); height: auto; aspect-ratio: 1; }
  .qr-zoom__stats { max-height: none; overflow: visible; }
  .qr-zoom__overall { gap: 14px; }
}
@media (max-height: 520px) and (orientation: landscape) {
  .qr-zoom__qr { width: min(56vmin, 300px); height: auto; aspect-ratio: 1; justify-self: center; }
  .qr-zoom__hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .qr-zoom__bar-fill { transition: none; }
}
.qr-display__listhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.qr-display__divider { height: 1px; background: var(--ec-line); margin: 8px 0; }
.qr-display__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.qr-display__row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--ec-line); }
.qr-display__row:last-child { border-bottom: 0; }
.qr-display__row--card {
  background: rgba(15, 23, 42, 0.02);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-md);
  padding: 10px 12px;
}
.qr-display__member {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.qr-display__avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--ec-blue); color: #fff; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; display: grid; place-items: center; flex-shrink: 0; }
.qr-display__name { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); display: flex; flex-direction: column; }
.qr-display__name > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qr-display__name small { font-weight: 500; color: var(--ec-ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qr-display__status { width: auto; min-height: 44px; }
.qr-display__status--compact { min-width: 150px; }
.qr-display__roster-list { max-height: none; overflow: visible; }
.qr-display__roster-tools { display: grid; grid-template-columns: minmax(0, 1fr) minmax(120px, 180px); align-items: end; gap: 10px; }
.qr-display__roster-search, .qr-display__page-size { display: grid; gap: 5px; }
.qr-display__roster-range { grid-column: 1 / -1; margin: -3px 0 0; }
.qr-display__pagination { display: flex; align-items: center; justify-content: center; gap: 8px; }
.qr-display__page-numbers { display: flex; gap: 4px; max-width: 100%; overflow-x: auto; padding: 2px; }
.qr-display__page-number { min-width: 36px; height: 36px; border: 1px solid var(--ec-line); border-radius: 6px; background: var(--ec-canvas); color: var(--ec-ink); font: inherit; font-weight: 700; cursor: pointer; }
.qr-display__page-number.is-current { border-color: var(--ec-blue); background: var(--ec-blue); color: #fff; }
.qr-display__page-number:focus-visible { outline: 2px solid var(--ec-blue); outline-offset: 2px; }
.qr-display__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.qr-display__err { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: var(--ec-radius-md); background: var(--ec-danger-bg); color: var(--ec-danger); border: 1px solid var(--ec-danger-line); }
@media (max-width: 520px) {
  .qr-display__roster-tools { grid-template-columns: minmax(0, 1fr) 110px; }
  .qr-display__pagination { gap: 4px; }
  .qr-display__pagination > .ec-btn { padding-inline: 8px; }
}
</style>
