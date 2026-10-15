<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import QRCode from 'qrcode'
import { api } from '../api.js'

const props = defineProps({
  token: { type: String, required: true },
  // Mode SO: hanya tampil QR + daftar hadir. Tanpa picker histori,
  // tanpa buat/tutup sesi, tanpa roster & koreksi status.
  readOnly: { type: Boolean, default: false },
})

// Satu sumber TTL QR (detik). Harus sama dengan BE + copy PresensiView.
// Refresh sengaja < TTL (6s < 7s) agar QR tidak sempat kedaluwarsa di layar.
const QR_ROTATE_SECONDS = 7
const QR_REFRESH_MS = 6000
const LIST_REFRESH_MS = 3000

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

let qrTimer = null
let listTimer = null
let countTimer = null

async function loadActive() {
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
        <img v-if="qrUrl" :src="qrUrl" alt="QR presensi" class="qr-display__qr" width="480" height="480" />
        <div v-else class="ec-skeleton" style="width:min(100%,420px);aspect-ratio:1;border-radius:14px"></div>
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
      <p v-if="readOnly" class="ec-state__body">Belum ada sesi aktif. Minta panitia membuka sesi dulu lalu tekan Refresh.</p>
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
.qr-display__qr { width: min(100%, 420px); height: auto; border-radius: 10px; background: #fff; }
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
