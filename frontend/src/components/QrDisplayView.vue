<script setup>
import { onBeforeUnmount, ref } from 'vue'
import QRCode from 'qrcode'
import { api } from '../api.js'

const props = defineProps({
  token: { type: String, required: true },
})

const session = ref(null)
const qrUrl = ref('')
const expiresIn = ref(0)
const loading = ref(true)
const loadError = ref('')
const list = ref([])
const closing = ref(false)
const correcting = ref({})
const newTitle = ref('')
const creating = ref(false)

let qrTimer = null
let listTimer = null
let countTimer = null

async function loadActive() {
  const r = await api.attendanceActive(props.token)
  session.value = r.session || null
  list.value = []
  qrUrl.value = ''
}

async function createSession() {
  if (!newTitle.value.trim() || creating.value) return
  creating.value = true
  loadError.value = ''
  try {
    const r = await api.attendanceSession(newTitle.value.trim(), props.token)
    session.value = { id: r.session.id, title: r.session.title, date: r.session.date, is_active: true }
    newTitle.value = ''
    await Promise.all([refreshQr(), refreshList()])
    stopTimers()
    qrTimer = setInterval(refreshQr, 2500)
    listTimer = setInterval(refreshList, 3000)
    countTimer = setInterval(() => { expiresIn.value = Math.max(0, expiresIn.value - 1) }, 1000)
  } catch (e) {
    loadError.value = e?.message || 'Gagal membuat sesi.'
  } finally {
    creating.value = false
  }
}

async function refreshQr() {
  if (!session.value) return
  try {
    const r = await api.attendanceDisplayToken(session.value.id, props.token)
    qrUrl.value = await QRCode.toDataURL(r.payload, { width: 480, margin: 2 })
    expiresIn.value = Math.max(0, Math.round((r.expires_in_ms || 7000) / 1000))
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

function stopTimers() {
  ;[qrTimer, listTimer, countTimer].forEach((t) => t && clearInterval(t))
  qrTimer = listTimer = countTimer = null
}

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
      await Promise.all([refreshQr(), refreshList()])
    })(), timeout])
    if (!session.value) return
    stopTimers()
    qrTimer = setInterval(refreshQr, 2500)
    listTimer = setInterval(refreshList, 3000)
    countTimer = setInterval(() => { expiresIn.value = Math.max(0, expiresIn.value - 1) }, 1000)
  } catch (e) {
    loadError.value = e?.message || 'Gagal memuat display absensi.'
  } finally {
    loading.value = false
  }
}

async function closeSession() {
  if (!session.value || closing.value) return
  if (!confirm(`Tutup sesi "${session.value.title}"? QR berhenti berlaku.`)) return
  closing.value = true
  try {
    const r = await api.attendanceClose(session.value.id, props.token)
    session.value = { ...session.value, is_active: r.session.is_active }
    stopTimers()
  } catch (e) {
    alert(e?.message || 'Gagal menutup sesi.')
  } finally {
    closing.value = false
  }
}

async function correct(id, status) {
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

onBeforeUnmount(() => stopTimers())
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
      <div class="qr-display__head">
        <div>
          <h3 class="qr-display__title">{{ session.title }}</h3>
          <p class="ec-caption">{{ session.date }} &middot; {{ session.is_active ? `QR baru tiap 7 detik (ganti dalam ${expiresIn}s)` : 'Sesi ditutup' }}</p>
        </div>
        <button v-if="session.is_active" class="ec-btn ec-btn--danger ec-btn--sm" type="button" :disabled="closing" @click="closeSession">
          {{ closing ? 'Menutup...' : 'Tutup Sesi' }}
        </button>
      </div>
      <div v-if="session.is_active" class="qr-display__qrwrap">
        <img v-if="qrUrl" :src="qrUrl" alt="QR presensi" class="qr-display__qr" width="480" height="480" />
        <div v-else class="ec-skeleton" style="width:min(100%,420px);aspect-ratio:1;border-radius:14px"></div>
      </div>
      <div class="qr-display__listhead">
        <h3 class="qr-display__title">Baru check-in ({{ list.length }})</h3>
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="refreshList">Refresh</button>
      </div>
      <ul v-if="list.length" class="qr-display__list">
        <li v-for="r in list" :key="r.id" class="qr-display__row">
          <span class="qr-display__avatar">{{ (r.fullname || r.username || '?').charAt(0).toUpperCase() }}</span>
          <span class="qr-display__name">{{ r.fullname || r.username }}<small>@{{ r.username }} &middot; {{ fmtTime(r.scanned_at) }}</small></span>
          <select
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
    </template>
    <div v-else class="ec-state" role="status">
      <span class="ec-state__title">Tidak ada sesi aktif</span>
      <p class="ec-state__body">Buat sesi baru untuk membuka presensi. Membuat sesi baru otomatis menutup sesi lama.</p>
      <label class="ec-label" for="qr-new-title">Judul sesi</label>
      <input
        id="qr-new-title"
        v-model="newTitle"
        class="ec-field"
        maxlength="80"
        placeholder="cth. Pertemuan Rutin 12 Okt"
        @keyup.enter="createSession"
      />
      <div class="qr-display__actions" style="margin-top:10px">
        <button class="ec-btn ec-btn--primary ec-btn--sm" type="button" :disabled="creating || !newTitle.trim()" @click="createSession">
          {{ creating ? 'Membuat...' : 'Buka Sesi Baru' }}
        </button>
        <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="start">Refresh</button>
      </div>
      <p v-if="loadError" class="qr-display__err" role="alert">{{ loadError }}</p>
    </div>
  </div>
</template>

<style scoped>
.qr-display { display: flex; flex-direction: column; gap: 14px; }
.qr-display__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.qr-display__title { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--ec-ink); margin: 0 0 2px; }
.qr-display__qrwrap { display: grid; place-items: center; padding: 12px; background: var(--ec-canvas); border: 1px solid var(--ec-line); border-radius: var(--ec-radius-lg); }
.qr-display__qr { width: min(100%, 420px); height: auto; border-radius: 10px; background: #fff; }
.qr-display__listhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.qr-display__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
.qr-display__row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--ec-line); }
.qr-display__row:last-child { border-bottom: 0; }
.qr-display__avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--ec-blue); color: #fff; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; display: grid; place-items: center; flex-shrink: 0; }
.qr-display__name { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); display: flex; flex-direction: column; }
.qr-display__name small { font-weight: 500; color: var(--ec-ink-soft); }
.qr-display__status { width: auto; min-height: 44px; }
.qr-display__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.qr-display__err { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: var(--ec-radius-md); background: var(--ec-danger-bg); color: var(--ec-danger); border: 1px solid var(--ec-danger-line); }
</style>
