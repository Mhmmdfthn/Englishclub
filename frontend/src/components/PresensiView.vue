<script setup>
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
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

const props = defineProps({
  canDisplay: { type: Boolean, default: false },
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

const session = ref(null)
const loading = ref(true)
const loadError = ref('')
const password = ref('')
const qrText = ref('')
const scanning = ref(false)
const submitting = ref(false)
const result = ref(null) // { ok, message }
const list = ref([])
const listLoading = ref(false)
const mine = ref([])
const mineLoading = ref(false)
let scanner = null
let pollTimer = null

async function loadAll() {
  loading.value = true
  loadError.value = ''
  // Pagar timeout: skeleton tak boleh selamanya bila jaringan macet total.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Koneksi lambat. Periksa jaringan lalu coba lagi.')), 20000),
  )
  try {
    await Promise.race([(async () => {
      const t = memberToken()
      if (!t) throw { status: 401, message: 'Sesi habis. Masuk lagi.' }
      const a = await api.attendanceActive(t)
      session.value = a.session || null
      await Promise.all([refreshList(false), refreshMine(false)])
    })(), timeout])
  } catch (e) {
    loadError.value = e?.message || 'Gagal memuat absensi.'
  } finally {
    loading.value = false
  }
}

async function refreshList(showSpin = true) {
  if (!session.value) return
  if (showSpin) listLoading.value = true
  try {
    const r = await api.attendanceList(session.value.id, memberToken())
    list.value = r.records || []
  } catch { /* polling diam-diam gagal: abaikan, coba lagi berikutnya */ }
  finally { listLoading.value = false }
}

async function refreshMine(showSpin = true) {
  if (showSpin) mineLoading.value = true
  try {
    const r = await api.attendanceMine(memberToken())
    mine.value = r.records || []
  } catch { /* abaikan */ }
  finally { mineLoading.value = false }
}

async function startScan() {
  result.value = null
  if (!password.value) {
    result.value = { ok: false, message: 'Isi password akun dulu sebelum scan.' }
    return
  }
  try {
    const Ctor = await getScannerCtor()
    if (!scanner) scanner = new Ctor('presensi-qr-reader')
    scanning.value = true
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decoded) => {
        await stopScan()
        qrText.value = String(decoded || '').trim()
        await submit()
      },
      () => { /* frame tanpa QR: abaikan */ },
    )
  } catch (e) {
    scanning.value = false
    result.value = { ok: false, message: e?.message || 'Kamera tidak dapat dibuka. Izinkan akses kamera atau pakai kode manual di bawah.' }
  }
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
    password.value = ''
    qrText.value = ''
    await Promise.all([refreshList(false), refreshMine(false)])
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
      <p class="presensi__sub" v-if="session">{{ session.title }} &middot; {{ session.date }}</p>
      <p class="presensi__sub" v-else>Belum ada sesi aktif hari ini.</p>
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
          @click="presensiMode = 'display'; stopScan()"
        >Display QR</button>
      </div>

      <!-- Display QR untuk layar/proyektor (superadmin) -->
      <div v-if="canDisplay && presensiMode === 'display'" class="ec-card presensi__card">
        <QrDisplayView :token="memberToken()" :key="'qr-absensi'" />
      </div>

      <!-- Check-in -->
      <div v-show="!canDisplay || presensiMode === 'scan'" class="ec-card presensi__card">
        <h2 class="presensi__sectitle">Check-in QR</h2>
        <p class="ec-body">Ketik password akunmu, lalu pindai QR yang tampil di layar panitia (berganti tiap 7 detik).</p>
        <label class="ec-label" for="presensi-pw">Password akun</label>
        <input
          id="presensi-pw"
          v-model="password"
          type="password"
          class="ec-field"
          placeholder="••••••••"
          autocomplete="current-password"
        />
        <div class="presensi__actions" style="margin-top:10px">
          <button v-if="!scanning" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="startScan">
            Buka Kamera &amp; Scan QR
          </button>
          <button v-else class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="stopScan">
            Tutup Kamera
          </button>
        </div>
        <div v-show="scanning" id="presensi-qr-reader" class="presensi__reader"></div>
        <label class="ec-label" for="presensi-manual" style="margin-top:10px">Atau tempel kode manual</label>
        <input
          id="presensi-manual"
          v-model="qrText"
          class="ec-field ec-field--mono"
          placeholder="ECA1:... (bila kamera bermasalah)"
        />
        <button class="ec-btn ec-btn--accent ec-btn--block" type="button" :disabled="submitting" style="margin-top:12px" @click="submit">
          {{ submitting ? 'Memproses...' : 'Catat Kehadiran' }}
        </button>
        <p v-if="result" class="presensi__result" :class="{ 'presensi__result--ok': result.ok, 'presensi__result--err': !result.ok }" role="status">
          {{ result.message }}
        </p>
      </div>

      <!-- List absensi sesi ini -->
      <div class="ec-card presensi__card">
        <div class="presensi__sechead">
          <h2 class="presensi__sectitle">Hadir ({{ list.length }})</h2>
          <button class="presensi__seeall" type="button" :disabled="listLoading" @click="refreshList(true)">
            {{ listLoading ? 'Memuat...' : 'Refresh' }}
          </button>
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

      <!-- Recent milik sendiri -->
      <div class="ec-card presensi__card">
        <div class="presensi__sechead">
          <h2 class="presensi__sectitle">Recent Absensi</h2>
          <button class="presensi__seeall" type="button" :disabled="mineLoading" @click="refreshMine(true)">
            {{ mineLoading ? 'Memuat...' : 'Refresh' }}
          </button>
        </div>
        <ul v-if="mine.length" class="presensi__list">
          <li v-for="r in mine" :key="r.id" class="presensi__row">
            <span class="ec-badge" :class="r.status === 'hadir' ? 'ec-badge--completed' : 'ec-badge--warning'">{{ r.status }}</span>
            <span class="presensi__name">{{ r.session_title || 'Sesi' }}<small>{{ r.session_date }}</small></span>
            <span class="ec-caption">{{ fmtTime(r.scanned_at) }}</span>
          </li>
        </ul>
        <p v-else class="ec-body">Belum ada riwayat kehadiran.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.presensi { display: flex; flex-direction: column; gap: 16px; }
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
.presensi__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.presensi__skel { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 400px) { .presensi__skel { grid-template-columns: 1fr; } }
.presensi__card { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.presensi__card .presensi__sechead { padding-top: 0; }
.ec-field--mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.presensi__reader { overflow: hidden; border-radius: var(--ec-radius-md); border: 1px solid var(--ec-line); margin-top: 10px; }
.presensi__reader video { width: 100% !important; border-radius: var(--ec-radius-md); }
.presensi__result { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: var(--ec-radius-md); }
.presensi__result--ok { background: var(--ec-success-bg); color: var(--ec-success); border: 1px solid var(--ec-success-line); }
.presensi__result--err { background: var(--ec-danger-bg); color: var(--ec-danger); border: 1px solid var(--ec-danger-line); }
.presensi__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.presensi__row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--ec-line); }
.presensi__row:last-child { border-bottom: 0; }
.presensi__avatar { width: 32px; height: 32px; font-size: 13px; flex-shrink: 0; border-radius: 50%; background: var(--ec-blue); color: #fff; font-family: 'Outfit', sans-serif; font-weight: 700; display: grid; place-items: center; }
.presensi__name { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); display: flex; flex-direction: column; }
.presensi__name small { font-weight: 500; color: var(--ec-ink-soft); }
</style>

