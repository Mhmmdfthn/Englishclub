<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

// Scanner kamera dimuat malas (dynamic import) agar chunk tab tetap ringan
// dan gagal unduh tampil sebagai pesan ramah, bukan blank.
let Html5QrcodeCtor = null
async function getScannerCtor() {
  if (!Html5QrcodeCtor) {
    try {
      const mod = await import('html5-qrcode')
      Html5QrcodeCtor = mod.Html5Qrcode
    } catch {
      throw new Error('Pustaka scanner gagal dimuat. Periksa koneksi lalu coba lagi, atau pakai kode manual.')
    }
  }
  return Html5QrcodeCtor
}

// Display QR: chunk terpisah, hanya diunduh saat mode display dibuka.
const QrDisplayView = defineAsyncComponent(() => import('./QrDisplayView.vue'))

// Masa berlaku QR dari BE (sinkron dengan copy + polling display).
// Satu sumber agar copy tidak basi bila BE ubah TTL.
const QR_ROTATE_SECONDS = 7

const props = defineProps({
  canDisplay: { type: Boolean, default: false },
  displayReadOnly: { type: Boolean, default: false },
})

const presensiMode = ref('scan') // 'scan' | 'display'

function memberToken() {
  try { return localStorage.getItem('member_token') || '' } catch { return '' }
}

function fmtTime(iso) {
  try {
    const s = formatWIB(iso)
    if (s && s !== '—') return s
  } catch { /* fallback */ }
  try {
    const d = new Date(iso)
    return isNaN(d) ? '—' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

// Cache overview terakhir: tab tampil instan, refresh jalan di background.
const OVERVIEW_CACHE_KEY = 'presensi_overview_cache'

const session = ref(null)
const loading = ref(true)
const loadError = ref('')
const password = ref('')
const showPassword = ref(false)
const qrText = ref('')
// Username cache untuk autofill password manager (hidden field).
// Tidak dikirim ke API; API tetap pakai Bearer token + password seperti semula.
const cachedUsername = ref('')
try { cachedUsername.value = localStorage.getItem('member_username') || '' } catch { /* abaikan */ }
const scanning = ref(false)
const cameraOpen = ref(false)
const successNotice = ref(null)
const cameraTriggerButton = ref(null)
const cameraCloseButton = ref(null)
const successCloseButton = ref(null)
const submitting = ref(false)
const result = ref(null) // { ok, message }
const list = ref([])
const listLoading = ref(false)
const attendanceSessions = ref([])
const sessionsLoading = ref(false)
const sessionsError = ref('')
const expandedSessionIds = ref(new Set())
let drawerStateInitialized = false
const alreadyCheckedIn = computed(() => {
  if (!session.value) return false
  return attendanceSessions.value.some((item) => String(item.id) === String(session.value.id) && item.attendance?.status === 'hadir')
})
let scanner = null
let pollTimer = null
let scanAttempt = 0
// Scanner layar penuh: kunci scroll halaman agar konten di belakang tidak
// ikut bergeser saat kamera aktif. Nilai lama dipulihkan saat kamera tutup.
let prevBodyOverflow = null
function lockBodyScroll(lock) {
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
watch(cameraOpen, (open) => lockBodyScroll(open))

async function loadAll() {
  loadError.value = ''
  // Cache dulu: tab tampil instan (<50ms), data segar menyusul di background.
  // Skeleton full-tab hanya bila belum pernah ada cache.
  const cached = readOverviewCache()
  if (cached) {
    applyOverview(cached)
    loading.value = false
  } else {
    loading.value = true
  }
  // Pagar timeout: refresh background tak boleh gantung selamanya.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Koneksi lambat. Periksa jaringan lalu coba lagi.')), 20000),
  )
  try {
    await Promise.race([(async () => {
      const token = memberToken()
      if (!token) throw { status: 401, message: 'Sesi habis. Masuk lagi.' }
      try {
        const data = await api.attendanceOverview(token)
        applyOverview(data)
        saveOverviewCache(data)
      } catch (e) {
        // Backend lama (belum ada /overview): pakai jalur 3-request.
        if (e?.status === 404) { await loadLegacy(token); return }
        // Ada cache tampil: kegagalan refresh diam-diam, coba lagi berikutnya.
        if (cached) return
        throw e
      }
    })(), timeout])
  } catch (e) {
    loadError.value = e?.message || 'Gagal memuat absensi.'
  } finally {
    loading.value = false
  }
}

async function loadLegacy(token) {
  const active = await api.attendanceActive(token)
  session.value = active.session || null
  await Promise.all([refreshList(false), refreshSessions(false)])
  saveOverviewCache({ sessions: attendanceSessions.value, active: session.value, list: list.value })
}

function readOverviewCache() {
  try {
    const raw = localStorage.getItem(OVERVIEW_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.sessions)) return null
    return data
  } catch { return null }
}

function saveOverviewCache(data) {
  try {
    localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify({
      sessions: data.sessions || [],
      active: data.active || null,
      list: data.list || [],
      cached_at: Date.now(),
    }))
  } catch { /* storage diblokir: abaikan */ }
}

function applyOverview(data) {
  session.value = data.active || null
  list.value = data.list || []
  applySessions(data.sessions || [])
}

function applySessions(nextSessions) {
  const currentExpanded = new Set(expandedSessionIds.value)
  const activeUnattended = nextSessions.find((item) => item.is_active && !item.attendance)
  if (activeUnattended && !drawerStateInitialized) currentExpanded.add(String(activeUnattended.id))
  attendanceSessions.value = nextSessions
  expandedSessionIds.value = currentExpanded
  drawerStateInitialized = true
}

async function refreshList(showSpin = true) {
  if (!session.value) return
  if (showSpin) listLoading.value = true
  try {
    const response = await api.attendanceList(session.value.id, memberToken())
    list.value = response.records || []
  } catch { /* polling diam-diam gagal: abaikan, coba lagi berikutnya */ }
  finally { listLoading.value = false }
}

async function refreshSessions(showSpin = true) {
  if (showSpin) sessionsLoading.value = true
  sessionsError.value = ''
  try {
    const response = await api.attendanceSessionsMine(memberToken())
    applySessions(response.sessions || [])
  } catch (e) {
    sessionsError.value = e?.message || 'Gagal memuat riwayat absensi.'
  } finally {
    sessionsLoading.value = false
  }
}

function isExpanded(item) {
  return expandedSessionIds.value.has(String(item.id))
}

function syncExpandedState(item, event) {
  const next = new Set(expandedSessionIds.value)
  const key = String(item.id)
  if (event.target.open) next.add(key)
  else {
    next.delete(key)
    if (String(session.value?.id) === key) closeCamera()
  }
  expandedSessionIds.value = next
}

function fmtSessionDate(date) {
  if (!date) return 'Tanggal tidak tersedia'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function badgeClass(status) {
  if (!status || status === 'izin') return 'ec-badge--warning'
  return status === 'hadir' ? 'ec-badge--completed' : 'ec-badge--danger'
}

async function startScan() {
  result.value = null
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    result.value = { ok: false, message: 'Kamera web butuh koneksi aman (HTTPS/localhost). Karena dibuka via IP, salin kode dari layar SO ke kolom manual di bawah.' }
    document.getElementById('presensi-manual')?.focus?.()
    return
  }
  const attempt = ++scanAttempt
  cameraOpen.value = true
  await nextTick()
  cameraCloseButton.value?.focus?.()
  try {
    const Ctor = await getScannerCtor()
    if (attempt !== scanAttempt || !cameraOpen.value) return
    if (!scanner) scanner = new Ctor('presensi-qr-reader')
    scanning.value = true
    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        // Samakan area scan dengan bingkai bidik (.presensi__reticle):
        // min(68vmin, 260px), dengan batas aman untuk jendela sangat kecil.
        qrbox: (vw, vh) => {
          const max = Math.min(vw, vh)
          const side = Math.max(120, Math.min(260, Math.round(max * 0.68)))
          return { width: Math.min(side, max), height: Math.min(side, max) }
        },
      },
      async (decoded) => {
        if (attempt !== scanAttempt || !cameraOpen.value) return
        await closeCamera()
        qrText.value = String(decoded || '').trim()
        if (!qrText.value) return
        if (!password.value) {
          result.value = { ok: false, message: 'QR terbaca. Isi password akun lalu tekan Catat Kehadiran.' }
          document.getElementById('presensi-pw')?.focus?.()
          return
        }
        await submit()
      },
      () => { /* frame tanpa QR: abaikan */ },
    )
    if (attempt !== scanAttempt || !cameraOpen.value) await stopScan()
  } catch (e) {
    if (attempt === scanAttempt) {
      await stopScan()
      cameraOpen.value = false
      result.value = { ok: false, message: cameraMessage(e) }
      await nextTick()
      cameraTriggerButton.value?.focus?.()
    }
  }
}

function cameraMessage(e) {
  const name = e?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Akses kamera ditolak browser. Izinkan kamera untuk situs ini di pengaturan browser (bukan pengaturan HP), atau pakai kode manual di bawah.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Tidak ada kamera yang bisa dipakai di perangkat ini. Pakai kode manual di bawah.'
  }
  if (name === 'NotReadableError') {
    return 'Kamera sedang dipakai aplikasi lain. Tutup dulu lalu coba lagi, atau pakai kode manual.'
  }
  return e?.message || 'Kamera tidak dapat dibuka. Izinkan akses kamera atau pakai kode manual di bawah.'
}

async function stopScan() {
  try {
    if (scanner) {
      const st = scanner.getState()
      // 2 = scanning (Html5QrcodeScannerState.SCANNING)
      if (st === 2) await scanner.stop()
      scanner.clear()
    }
  } catch { /* abaikan */ }
  finally { scanning.value = false }
}

async function closeCamera() {
  scanAttempt += 1
  await stopScan()
  cameraOpen.value = false
  await nextTick()
  cameraTriggerButton.value?.focus?.()
}

async function submit() {
  result.value = null
  if (!password.value) {
    result.value = { ok: false, message: 'Isi password akun dulu.' }
    return
  }
  if (!qrText.value.trim()) {
    result.value = { ok: false, message: 'Scan QR dulu atau tempel kode manual.' }
    return
  }
  submitting.value = true
  try {
    const r = await api.attendanceCheckin(qrText.value.trim(), password.value, memberToken())
    result.value = r.already
      ? { ok: true, message: 'Kamu sudah tercatat hadir di sesi ini.' }
      : { ok: true, message: 'Hadir tercatat. Terima kasih!' }
    successNotice.value = {
      title: session.value?.title || 'Sesi absensi',
      date: fmtSessionDate(session.value?.date),
    }
    await nextTick()
    successCloseButton.value?.focus?.()
    password.value = ''
    qrText.value = ''
    await Promise.all([refreshList(false), refreshSessions(false)])
  } catch (e) {
    if (e?.status === 410) result.value = { ok: false, message: 'QR kedaluwarsa. Pindai ulang kode terbaru di layar.' }
    else if (e?.status === 401) result.value = { ok: false, message: e?.message === 'Password salah.' ? 'Password salah.' : 'Sesi habis. Masuk lagi.' }
    else if (e?.status === 429) result.value = { ok: false, message: e?.message || 'Terlalu banyak percobaan.' }
    else result.value = { ok: false, message: e?.message || 'Check-in gagal. Coba lagi.' }
  } finally {
    submitting.value = false
  }
}

loadAll()
pollTimer = setInterval(() => {
  if (!document.hidden && session.value) refreshList(false)
}, 5000)

onBeforeUnmount(async () => {
  scanAttempt += 1
  cameraOpen.value = false
  lockBodyScroll(false)
  if (pollTimer) clearInterval(pollTimer)
  await stopScan()
  try { if (scanner) await scanner.clear() } catch { /* abaikan */ }
})
</script>

<template>
  <div class="presensi">
    <div class="presensi__head">
      <span class="presensi__eyebrow">Absensi</span>
      <h1 class="presensi__title">Presensi Kehadiran</h1>
      <p class="presensi__sub" v-if="session">
        <span v-if="session.is_active !== false" class="ec-badge ec-badge--completed presensi__live"><span class="presensi__dot" aria-hidden="true"></span>Live</span>
        {{ session.title }} &middot; {{ session.date }}
      </p>
      <p class="presensi__sub" v-else>Belum ada sesi aktif hari ini.</p>
      <p v-if="alreadyCheckedIn" class="presensi__result presensi__result--ok" role="status">Kamu sudah tercatat hadir di sesi ini.</p>
    </div>

    <div v-if="loading" class="presensi__skel">
      <div v-for="n in 3" :key="n" class="ec-skeleton" style="height:120px;border-radius:14px"></div>
    </div>

    <div v-else-if="loadError" class="ec-state ec-state--error" role="alert">
      <span class="ec-state__title">Gagal memuat</span>
      <p class="ec-state__body">{{ loadError }}</p>
      <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="loadAll">Coba lagi</button>
    </div>

    <template v-else>
      <!-- Mode: pindai vs display (display khusus superadmin) -->
      <div v-if="canDisplay" class="presensi__modes" role="tablist" aria-label="Mode absensi">
        <button
          type="button" role="tab" :aria-selected="presensiMode === 'scan'"
          class="presensi__mode" :class="{ active: presensiMode === 'scan' }"
          @click="presensiMode = 'scan'"
        >Pindai</button>
        <button
          type="button" role="tab" :aria-selected="presensiMode === 'display'"
          class="presensi__mode" :class="{ active: presensiMode === 'display' }"
          @click="presensiMode = 'display'; closeCamera()"
        >Display QR</button>
      </div>

      <!-- Display QR untuk layar/proyektor (superadmin penuh, SO read-only) -->
      <div v-if="canDisplay && presensiMode === 'display'" class="ec-card presensi__card">
        <QrDisplayView :token="memberToken()" :read-only="displayReadOnly" :key="'qr-absensi'" />
      </div>

      <div class="ec-card presensi__card">
        <div class="presensi__sechead">
          <h2 class="presensi__sectitle">Riwayat &amp; sesi absensi</h2>
          <button class="presensi__seeall" type="button" :disabled="sessionsLoading" @click="refreshSessions(true)">
            {{ sessionsLoading ? 'Memuat...' : 'Refresh' }}
          </button>
        </div>
        <p v-if="sessionsError" class="presensi__result presensi__result--err" role="alert">{{ sessionsError }}</p>
        <div v-else-if="attendanceSessions.length" class="presensi__session-cards">
          <details
            v-for="item in attendanceSessions"
            :key="item.id"
            class="presensi__session-card"
            :class="{ 'presensi__session-card--open': isExpanded(item), 'presensi__session-card--active': item.is_active }"
            :open="isExpanded(item)"
            @toggle="syncExpandedState(item, $event)"
          >
            <summary class="presensi__session-summary">
              <span class="presensi__session-date">
                <span class="presensi__session-date-label">{{ item.is_active ? 'Sesi aktif' : 'Tanggal' }}</span>
                <time>{{ fmtSessionDate(item.date) }}</time>
              </span>
              <span class="presensi__session-summary-main">
                <span class="presensi__session-title">{{ item.title || 'Sesi absensi' }}</span>
                <span class="presensi__session-preview">
                  <span v-if="item.is_active" class="ec-badge ec-badge--completed">Berlangsung</span>
                  <span class="ec-badge" :class="badgeClass(item.attendance?.status)">{{ item.attendance?.status || 'Belum absen' }}</span>
                </span>
              </span>
              <svg class="presensi__chevron" :class="{ 'presensi__chevron--open': isExpanded(item) }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </summary>
            <div class="presensi__session-body">
              <div class="presensi__session-details">
                <h3 class="presensi__session-title">{{ item.title || 'Sesi absensi' }}</h3>
                <p v-if="item.attendance?.scanned_at" class="presensi__session-time">Check-in {{ fmtTime(item.attendance.scanned_at) }}</p>
                <p v-else-if="item.attendance" class="presensi__session-time">Status kehadiran: {{ item.attendance.status }}</p>
                <p v-else-if="item.is_active" class="ec-body">Kamu belum absen di sesi ini. Pindai QR SO untuk mencatat kehadiran.</p>
                <p v-else class="ec-body">Sesi sudah ditutup dan kamu belum tercatat hadir.</p>
              </div>

              <form
                v-if="item.is_active && !item.attendance && (!canDisplay || presensiMode === 'scan')"
                class="presensi__form"
                autocomplete="on"
                @submit.prevent="submit"
              >
                <input type="text" name="username" autocomplete="username" :value="cachedUsername" readonly tabindex="-1" aria-hidden="true" class="ec-sr-only" />
                <div class="ec-field-group">
                  <label class="ec-label" for="presensi-pw">Password akun</label>
                  <div class="presensi__password">
                    <input id="presensi-pw" v-model="password" :type="showPassword ? 'text' : 'password'" name="password" class="ec-field" placeholder="••••••••" autocomplete="current-password" />
                    <button class="presensi__toggle" type="button" :aria-pressed="showPassword ? 'true' : 'false'" :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'" @click="showPassword = !showPassword">{{ showPassword ? 'Sembunyi' : 'Lihat' }}</button>
                  </div>
                  <p class="ec-helper">Konfirmasi dengan password akunmu.</p>
                </div>
                <div class="presensi__actions">
                  <button v-if="!cameraOpen" ref="cameraTriggerButton" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="startScan">Buka Kamera &amp; Scan QR</button>
                </div>
                <details class="presensi__manual">
                  <summary>Kamera bermasalah? Pakai kode manual</summary>
                  <label class="ec-label" for="presensi-manual">Kode manual</label>
                  <input id="presensi-manual" v-model="qrText" class="ec-field ec-field--mono" placeholder="ECA1:... (salin dari layar SO)" autocomplete="off" spellcheck="false" />
                </details>
                <button class="ec-btn ec-btn--secondary ec-btn--block" type="submit" :disabled="submitting || !qrText.trim()">
                  {{ submitting ? 'Memproses...' : 'Catat Kehadiran' }}
                </button>
                <p v-if="result" class="presensi__result" :class="{ 'presensi__result--ok': result.ok, 'presensi__result--err': !result.ok }" role="status" aria-live="polite">{{ result.message }}</p>
              </form>

              <div v-if="item.is_active" class="presensi__attendees">
                <div class="presensi__sechead">
                  <h4 class="presensi__attendees-title">Hadir ({{ list.length }})</h4>
                  <button class="presensi__seeall" type="button" :disabled="listLoading" @click="refreshList(true)">{{ listLoading ? 'Memuat...' : 'Refresh' }}</button>
                </div>
                <ul v-if="list.length" class="presensi__list">
                  <li v-for="r in list" :key="r.id" class="presensi__row">
                    <span class="presensi__avatar">{{ (r.fullname || r.username || '?').charAt(0).toUpperCase() }}</span>
                    <span class="presensi__name">{{ r.fullname || r.username }}<small>@{{ r.username }}</small></span>
                    <span class="ec-caption">{{ fmtTime(r.scanned_at) }}</span>
                  </li>
                </ul>
                <p v-else class="ec-body">Belum ada yang check-in di sesi ini.</p>
              </div>
            </div>
          </details>
        </div>
        <p v-else class="ec-body">Belum ada sesi absensi.</p>
      </div>
    </template>
    <!-- Scanner kamera layar penuh: keluar lewat tombol × atau ESC saja -->
    <div
      v-if="cameraOpen"
      class="presensi__scanner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="presensi-camera-title"
      @keydown.esc.stop.prevent="closeCamera"
    >
      <header class="presensi__scanner-head">
        <div class="presensi__scanner-copy">
          <h2 id="presensi-camera-title" class="presensi__scanner-title">Pindai QR presensi</h2>
          <p class="presensi__scanner-cap">Arahkan kamera ke QR di layar SO.</p>
        </div>
        <button ref="cameraCloseButton" class="presensi__scanner-close" type="button" aria-label="Tutup kamera" @click="closeCamera">×</button>
      </header>
      <div class="presensi__scanner-stage">
        <div id="presensi-qr-reader" class="presensi__reader presensi__reader--full"></div>
        <div class="presensi__reticle" aria-hidden="true"><span class="presensi__reticle-corner presensi__reticle-corner--tl"></span><span class="presensi__reticle-corner presensi__reticle-corner--tr"></span><span class="presensi__reticle-corner presensi__reticle-corner--bl"></span><span class="presensi__reticle-corner presensi__reticle-corner--br"></span></div>
      </div>
      <p class="presensi__scanner-foot">Pastikan QR terlihat jelas di dalam bingkai kamera.</p>
    </div>
    <div
      v-if="successNotice"
      class="presensi__popup-backdrop"
      @click.self="successNotice = null"
      @keydown.esc.stop.prevent="successNotice = null"
    >
      <section class="presensi__popup presensi__popup--success" role="dialog" aria-modal="true" aria-labelledby="presensi-success-title">
        <span class="presensi__success-mark" aria-hidden="true">✓</span>
        <h2 id="presensi-success-title" class="presensi__popup-title">Presensi berhasil</h2>
        <p class="presensi__success-session">{{ successNotice.title }}</p>
        <p class="ec-caption">{{ successNotice.date }}</p>
        <button ref="successCloseButton" class="ec-btn ec-btn--primary" type="button" @click="successNotice = null">Tutup</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.presensi { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* Tombol global nowrap: di layar 320-375px label panjang ("Buka Kamera &
   Scan QR") bisa lebih lebar dari kartu dan mendorong halaman. Di sini saja
   boleh wrap, tanpa ubah .ec-btn global. */
.presensi .ec-btn { white-space: normal; max-width: 100%; text-align: center; }
.presensi__modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; background: var(--ec-canvas); border: 1px solid var(--ec-line); border-radius: var(--ec-radius-pill); }
.presensi__mode { min-height: 44px; border: 0; border-radius: var(--ec-radius-pill); background: transparent; color: var(--ec-ink-soft); font-family: inherit; font-size: 0.875rem; font-weight: 700; cursor: pointer; }
.presensi__mode.active { background: var(--ec-surface); color: var(--ec-ink); box-shadow: var(--ec-shadow-sm); }
.presensi__mode:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.presensi__head { display: flex; flex-direction: column; gap: 3px; padding-bottom: 4px; }
.presensi__eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ec-blue); }
.presensi__title { font-family: 'Outfit', sans-serif; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -0.025em; color: var(--ec-ink); line-height: 1.15; margin: 0; }
.presensi__sub { font-size: 14px; color: var(--ec-ink-soft); margin: 2px 0 0; }
.presensi__sechead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.presensi__sectitle { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: var(--ec-ink); margin: 0; }
.presensi__seeall { background: none; border: 0; color: var(--ec-blue); font-size: 13px; font-weight: 700; cursor: pointer; opacity: 0.75; min-height: 44px; padding: 8px 4px; }
.presensi__seeall:hover { opacity: 1; }
.presensi__form { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.presensi__password { position: relative; }
.presensi__password .ec-field { padding-right: 92px; }
.presensi__toggle { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); min-height: 36px; padding: 6px 12px; border: 0; border-radius: var(--ec-radius-pill); background: transparent; color: var(--ec-blue); font-size: 13px; font-weight: 700; cursor: pointer; }
.presensi__toggle:hover { background: var(--ec-blue-050); }
.presensi__toggle:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.presensi__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
.presensi__manual { border: 1px solid var(--ec-line); border-radius: var(--ec-radius-md); padding: 10px 14px; background: var(--ec-canvas); }
.presensi__manual summary { font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); cursor: pointer; min-height: 44px; display: flex; align-items: center; }
.presensi__manual summary:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); border-radius: 8px; }
.presensi__manual .ec-label { margin-top: 8px; display: block; }
.presensi__live { gap: 6px; margin-right: 6px; }
.presensi__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block; animation: presensi-pulse 1.6s ease-in-out infinite; }
@keyframes presensi-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.presensi__skel { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 400px) { .presensi__skel { grid-template-columns: 1fr; } }
.presensi__card { padding: 18px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.presensi__row .ec-caption { min-width: 0; overflow-wrap: anywhere; flex-shrink: 0; }
.presensi__card .presensi__sechead { padding-top: 0; }
.ec-field--mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
/* html5-qrcode menyuntik div/canvas/select/tombol ber-width fix: kekang
   semuanya agar tidak mendorong halaman di layar kecil. */
.presensi__reader { overflow: hidden; border-radius: var(--ec-radius-md); border: 1px solid var(--ec-line); margin-top: 10px; max-width: 100%; }
.presensi__reader, .presensi__reader * { max-width: 100%; }
.presensi__reader video { width: 100% !important; border-radius: var(--ec-radius-md); }

/* ---- Scanner kamera layar penuh ---- */
.presensi__scanner { position: fixed; inset: 0; z-index: 90; height: 100vh; height: 100dvh; background: #000; overscroll-behavior: contain; }
.presensi__scanner-stage { position: absolute; inset: 0; overflow: hidden; background: #000; }
.presensi__scanner-head { position: absolute; z-index: 2; top: 0; right: 0; left: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 28px max(16px, env(safe-area-inset-left)); background: linear-gradient(180deg, rgba(11, 18, 32, 0.92) 0%, rgba(11, 18, 32, 0.55) 55%, rgba(11, 18, 32, 0) 100%); }
.presensi__scanner-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.presensi__scanner-title { margin: 0; color: #fff; font-family: 'Outfit', sans-serif; font-size: 1.05rem; font-weight: 800; line-height: 1.25; }
.presensi__scanner-cap { margin: 0; color: rgba(255, 255, 255, 0.78); font-size: 0.8125rem; line-height: 1.4; }
.presensi__scanner-close { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 50%; background: rgba(255, 255, 255, 0.14); color: #fff; font: inherit; font-size: 1.5rem; line-height: 1; cursor: pointer; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.presensi__scanner-close:hover { background: rgba(255, 255, 255, 0.24); }
.presensi__scanner-close:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6); }
.presensi__scanner-foot { position: absolute; z-index: 2; right: 0; bottom: 0; left: 0; margin: 0; padding: 28px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); background: linear-gradient(0deg, rgba(11, 18, 32, 0.92) 0%, rgba(11, 18, 32, 0.45) 55%, rgba(11, 18, 32, 0) 100%); color: rgba(255, 255, 255, 0.8); font-size: 0.8125rem; text-align: center; }
/* Video memenuhi layar (cover). Bingkai bidik digambar sendiri agar tetap
   di tengah, ukurannya disamakan dengan qrbox scanner (lihat startScan).
   html5-qrcode membuat elemen video/canvas saat runtime tanpa atribut scoped
   Vue, jadi wajib lewat :deep(). */
.presensi__reader--full { position: absolute; inset: 0; width: 100% !important; height: 100% !important; max-width: none; margin: 0; border: 0; border-radius: 0; background: #000; }
.presensi__reader--full :deep(video) { display: block; width: 100% !important; height: 100% !important; max-width: none !important; border-radius: 0; object-fit: cover; }
.presensi__reader--full :deep(#qr-canvas) { display: none !important; }
/* Masker gelap di luar area scan milik pustaka: pertahankan, tapi sudut
   bawaannya disembunyikan karena sudah diganti bingkai bidik sendiri. */
.presensi__reader--full :deep(#qr-shaded-region > div) { display: none; }
.presensi__reticle { position: absolute; top: 50%; left: 50%; width: min(68vmin, 260px); aspect-ratio: 1; transform: translate(-50%, -50%); pointer-events: none; }
.presensi__reticle-corner { position: absolute; width: 34px; height: 34px; border: 0 solid rgba(255, 255, 255, 0.92); }
.presensi__reticle-corner--tl { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 12px; }
.presensi__reticle-corner--tr { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 12px; }
.presensi__reticle-corner--bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 12px; }
.presensi__reticle-corner--br { right: 0; bottom: 0; border-right-width: 4px; border-bottom-width: 4px; border-bottom-right-radius: 12px; }

.presensi__popup-backdrop { position: fixed; z-index: 80; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); background: rgba(15, 23, 42, 0.68); }
.presensi__popup { display: flex; flex-direction: column; gap: 14px; width: min(100%, 520px); max-height: calc(100vh - 24px); max-height: min(calc(100dvh - 24px), 760px); overflow-y: auto; padding: 18px; border: 1px solid var(--ec-line); border-radius: var(--ec-radius-lg); background: var(--ec-surface); box-shadow: var(--ec-shadow-lg); overscroll-behavior: contain; }
.presensi__popup-title { margin: 0; color: var(--ec-ink); font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; }
.presensi__popup--success { align-items: center; width: min(100%, 380px); text-align: center; padding: 26px 22px; }
.presensi__success-mark { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; background: var(--ec-success-bg); color: var(--ec-success); font-size: 1.8rem; font-weight: 800; }
.presensi__success-session { margin: 0; color: var(--ec-ink); font-weight: 700; }
/* Scoped .ec-field--mono menang atas aturan 16px global (cascade): ulangi
   khusus mono agar Safari tidak auto-zoom di kolom kode manual. */
@media (pointer: coarse) {
  .ec-field--mono { font-size: max(16px, 0.8rem); }
}
@media (max-width: 400px) {
  .presensi__actions .ec-btn { flex: 1 1 100%; }
}
@media (max-width: 420px) {
  .presensi__popup-backdrop { padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); }
  .presensi__popup { gap: 12px; padding: 14px; border-radius: var(--ec-radius-md); max-height: calc(100vh - 16px); max-height: min(calc(100dvh - 16px), 760px); }
  .presensi__popup--success { padding: 22px 16px; }
  .presensi__popup--success .ec-btn { width: 100%; }
  .presensi__row { align-items: flex-start; flex-wrap: wrap; column-gap: 8px; row-gap: 4px; }
  .presensi__row .presensi__name { flex: 1 1 calc(100% - 48px); }
  .presensi__row .ec-caption { margin-left: 40px; }
  .presensi__session-summary { flex-wrap: wrap; }
  .presensi__session-date { flex-basis: 88px; }
  .presensi__session-summary-main { flex-basis: calc(100% - 126px); }
}
@media (max-height: 520px) and (orientation: landscape) {
  .presensi__popup-backdrop { place-items: start center; }
  .presensi__popup { max-height: calc(100vh - 16px); max-height: calc(100dvh - 16px); }
  .presensi__popup--success { align-self: center; }
  .presensi__scanner-head { padding-top: max(10px, env(safe-area-inset-top)); padding-bottom: 20px; }
  .presensi__scanner-cap { display: none; }
  .presensi__scanner-foot { padding-top: 20px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .presensi__reticle-corner { width: 26px; height: 26px; }
}
.presensi__result { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: var(--ec-radius-md); }
.presensi__result--ok { background: var(--ec-success-bg); color: var(--ec-success); border: 1px solid var(--ec-success-line); }
.presensi__result--err { background: var(--ec-danger-bg); color: var(--ec-danger); border: 1px solid var(--ec-danger-line); }
.presensi__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
@media (prefers-reduced-motion: reduce) { .presensi__dot { animation: none; } }
.presensi__row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--ec-line); }
.presensi__row:last-child { border-bottom: 0; }
.presensi__avatar { width: 32px; height: 32px; font-size: 13px; flex-shrink: 0; border-radius: 50%; background: var(--ec-blue); color: #fff; font-family: 'Outfit', sans-serif; font-weight: 700; display: grid; place-items: center; }
.presensi__name { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); display: flex; flex-direction: column; }
.presensi__name small { font-weight: 500; color: var(--ec-ink-soft); }

/* Drawer sesi: ringkasan dan detail tetap berada dalam satu kartu */
.presensi__session-cards { display: flex; flex-direction: column; gap: 10px; }
.presensi__session-card {
  display: block;
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-sm);
  background: var(--ec-surface);
  overflow: hidden;
}
.presensi__session-card--active { border-color: var(--ec-info-line); }
.presensi__session-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 76px;
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;
}
.presensi__session-summary::-webkit-details-marker { display: none; }
.presensi__session-summary:focus-visible { outline: none; box-shadow: inset var(--ec-focus-ring); }
.presensi__session-date { display: flex; flex: 0 0 180px; flex-direction: column; justify-content: center; gap: 4px; min-width: 0; padding-right: 16px; border-right: 1px solid var(--ec-line); }
.presensi__session-date-label { font-size: 0.688rem; font-weight: 700; text-transform: uppercase; color: var(--ec-ink-soft); }
.presensi__session-date time { font-size: 0.875rem; font-weight: 700; line-height: 1.45; color: var(--ec-ink); }
.presensi__session-summary-main { display: flex; flex: 1; min-width: 0; flex-direction: column; justify-content: center; gap: 8px; }
.presensi__session-title { margin: 0; font-family: 'Outfit', sans-serif; font-size: 0.9375rem; font-weight: 700; line-height: 1.4; color: var(--ec-ink); overflow-wrap: anywhere; }
.presensi__session-preview { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.presensi__chevron { flex: 0 0 auto; color: var(--ec-ink-soft); transition: transform 180ms var(--ec-ease); }
.presensi__chevron--open { transform: rotate(180deg); }
.presensi__session-body { display: flex; flex-direction: column; gap: 14px; padding: 14px; border-top: 1px solid var(--ec-line); background: var(--ec-canvas); }
.presensi__session-details { display: flex; flex-direction: column; gap: 6px; }
.presensi__session-time { font-size: 0.8125rem; color: var(--ec-ink-soft); }
.presensi__session-details .ec-body { margin: 0; }
.presensi__attendees { padding-top: 12px; border-top: 1px solid var(--ec-line); }
.presensi__attendees-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); }
@media (max-width: 520px) {
  .presensi__session-summary { align-items: flex-start; gap: 10px; padding: 12px; }
  .presensi__session-date { flex: 0 0 104px; padding-right: 10px; }
  .presensi__session-date time { font-size: 0.8125rem; }
  .presensi__session-body { padding: 12px; }
}
@media (prefers-reduced-motion: reduce) { .presensi__chevron { transition: none; } }
</style>

