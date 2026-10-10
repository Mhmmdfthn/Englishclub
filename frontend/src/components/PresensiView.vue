<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
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
const showPassword = ref(false)
const qrText = ref('')
// Username cache untuk autofill password manager (hidden field).
// Tidak dikirim ke API; API tetap pakai Bearer token + password seperti semula.
const cachedUsername = ref('')
try { cachedUsername.value = localStorage.getItem('member_username') || '' } catch { /* abaikan */ }
const scanning = ref(false)
const submitting = ref(false)
const result = ref(null) // { ok, message }
const list = ref([])
const listLoading = ref(false)
const mine = ref([])
const mineLoading = ref(false)
// Banner "sudah hadir" untuk sesi aktif saat ini (FE-only, dari data mine yang sudah ada).
const alreadyCheckedIn = computed(() => {
  if (!session.value || !Array.isArray(mine.value)) return false
  return mine.value.some((r) => String(r.session_id || r.sessionId || '') === String(session.value.id) || (r.session_title && session.value.title && r.session_title === session.value.title && r.session_date === session.value.date))
})
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
  // Alur: boleh pindai dulu, password diminta saat konfirmasi (submit).
  // Gate password di sini sengaja dilepas agar QR 7-detik tidak kedaluwarsa saat user mengetik.
  // Kamera web wajib konteks aman: localhost/HTTPS. Via IP HTTP selalu ditolak
  // browser apa pun isi izin HP-nya — arahkan ke kode manual.
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    result.value = { ok: false, message: 'Kamera web butuh koneksi aman (HTTPS/localhost). Karena dibuka via IP, salin kode dari layar panitia ke kolom manual di bawah.' }
    document.getElementById('presensi-manual')?.focus?.()
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
  } catch (e) {
    scanning.value = false
    result.value = { ok: false, message: cameraMessage(e) }
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
        <p class="ec-body">Pindai QR di layar panitia (berganti tiap {{ QR_ROTATE_SECONDS }} detik), lalu konfirmasi dengan password akunmu.</p>
        <form class="presensi__form" autocomplete="on" @submit.prevent="submit">
          <!-- Hidden username: syarat password manager agar mau autofill. Tidak dikirim ke API. -->
          <input
            type="text"
            name="username"
            autocomplete="username"
            :value="cachedUsername"
            readonly
            tabindex="-1"
            aria-hidden="true"
            class="ec-sr-only"
          />
          <div class="ec-field-group">
            <label class="ec-label" for="presensi-pw">Password akun</label>
            <div class="presensi__password">
              <input
                id="presensi-pw"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                class="ec-field"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <button
                class="presensi__toggle"
                type="button"
                :aria-pressed="showPassword ? 'true' : 'false'"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="showPassword = !showPassword"
              >{{ showPassword ? 'Sembunyi' : 'Lihat' }}</button>
            </div>
            <p class="ec-helper">Sama seperti password saat masuk. Bisa tersimpan otomatis di browser.</p>
          </div>
          <div class="presensi__actions">
            <button v-if="!scanning" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="startScan">
              Buka Kamera &amp; Scan QR
            </button>
            <button v-else class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="stopScan">
              Tutup Kamera
            </button>
          </div>
          <div v-show="scanning" id="presensi-qr-reader" class="presensi__reader"></div>
          <details class="presensi__manual">
            <summary>Kamera bermasalah? Pakai kode manual</summary>
            <label class="ec-label" for="presensi-manual">Kode manual</label>
            <input
              id="presensi-manual"
              v-model="qrText"
              class="ec-field ec-field--mono"
              placeholder="ECA1:... (salin dari layar panitia)"
              autocomplete="off"
              spellcheck="false"
            />
          </details>
          <button class="ec-btn ec-btn--secondary ec-btn--block" type="submit" :disabled="submitting || !qrText.trim()">
            {{ submitting ? 'Memproses...' : 'Catat Kehadiran' }}
          </button>
          <p v-if="result" class="presensi__result" :class="{ 'presensi__result--ok': result.ok, 'presensi__result--err': !result.ok }" role="status" aria-live="polite">
            {{ result.message }}
          </p>
        </form>
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
.presensi__row .ec-caption { overflow-wrap: anywhere; flex-shrink: 0; }
.presensi__card .presensi__sechead { padding-top: 0; }
.ec-field--mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
/* html5-qrcode menyuntik div/canvas/select/tombol ber-width fix: kekang
   semuanya agar tidak mendorong halaman di layar kecil. */
.presensi__reader { overflow: hidden; border-radius: var(--ec-radius-md); border: 1px solid var(--ec-line); margin-top: 10px; max-width: 100%; }
.presensi__reader, .presensi__reader * { max-width: 100%; }
.presensi__reader video { width: 100% !important; border-radius: var(--ec-radius-md); }
/* Scoped .ec-field--mono menang atas aturan 16px global (cascade): ulangi
   khusus mono agar Safari tidak auto-zoom di kolom kode manual. */
@media (pointer: coarse) {
  .ec-field--mono { font-size: max(16px, 0.8rem); }
}
@media (max-width: 400px) {
  .presensi__actions .ec-btn { flex: 1 1 100%; }
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
</style>

