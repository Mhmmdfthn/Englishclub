<script setup>
import { computed, nextTick, ref } from 'vue'
import { ChevronDown, ExternalLink, Pencil, Plus, Presentation, Trash2 } from 'lucide-vue-next'
import { api } from '../api.js'
import { formatWIB } from '../utils/time.js'

const props = defineProps({
  canManage: { type: Boolean, default: false },
})

function memberToken() {
  try { return localStorage.getItem('member_token') || '' } catch { return '' }
}

// Pertahanan berlapis: backend sudah validasi, frontend hanya render
// iframe bila src benar-benar URL embed Canva.
function safeCanvaUrl(url) {
  try {
    const u = new URL(String(url || ''))
    if (u.protocol === 'https:' && u.hostname.toLowerCase() === 'www.canva.com' && u.pathname.startsWith('/design/')) {
      return u.toString()
    }
  } catch { /* abaikan */ }
  return ''
}

const items = ref([])
const loading = ref(true)
const loadError = ref('')
const openedId = ref(null)
const opened = computed(() => items.value.find((m) => String(m.id) === String(openedId.value)) || null)
const openedSrc = computed(() => (opened.value ? safeCanvaUrl(opened.value.canva_url) : ''))
const viewerTitle = ref(null)

async function open(item) {
  openedId.value = String(openedId.value) === String(item.id) ? null : item.id
  if (!openedId.value) return
  await nextTick()
  viewerTitle.value?.focus?.()
}

function closeViewer() {
  openedId.value = null
}

const showForm = ref(false)
const editingId = ref(null)
const formTitle = ref('')
const formLink = ref('')
const formSaving = ref(false)
const formError = ref('')
const deletingId = ref(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const r = await api.materials(memberToken())
    items.value = r.materials || []
  } catch (e) {
    loadError.value = e?.message || 'Gagal memuat materi.'
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingId.value = null
  formTitle.value = ''
  formLink.value = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(item) {
  editingId.value = item.id
  formTitle.value = item.title || ''
  formLink.value = item.canva_url || ''
  formError.value = ''
  showForm.value = true
}

async function submit() {
  formError.value = ''
  if (formTitle.value.trim().length < 3 || formTitle.value.trim().length > 80) {
    formError.value = 'Judul 3-80 karakter.'
    return
  }
  if (!formLink.value.trim()) {
    formError.value = 'Link Canva wajib diisi (Bagikan > Sematkan).'
    return
  }
  formSaving.value = true
  try {
    const payload = { title: formTitle.value.trim(), canva_url: formLink.value.trim() }
    if (editingId.value) {
      await api.updateMaterial(editingId.value, payload, memberToken())
    } else {
      await api.createMaterial(payload, memberToken())
    }
    showForm.value = false
    await load()
  } catch (e) {
    formError.value = e?.message || 'Gagal menyimpan materi.'
  } finally {
    formSaving.value = false
  }
}

async function removeItem(item) {
  if (deletingId.value) return
  if (!confirm(`Hapus materi "${item.title}"?`)) return
  deletingId.value = item.id
  try {
    await api.deleteMaterial(item.id, memberToken())
    if (String(openedId.value) === String(item.id)) closeViewer()
    await load()
  } catch (e) {
    alert(e?.message || 'Gagal menghapus materi.')
  } finally {
    deletingId.value = null
  }
}

load()
</script>

<template>
  <div class="materi">
    <div class="materi__head">
      <div>
        <span class="materi__eyebrow">Materi</span>
        <h1 class="materi__title">Materi Pembelajaran</h1>
        <p class="materi__sub"> </p>
      </div>
    </div>

    <div v-if="loading" class="materi__skel">
      <div v-for="n in 3" :key="n" class="ec-skeleton" style="height:72px;border-radius:14px"></div>
    </div>

    <div v-else-if="loadError" class="ec-state ec-state--error" role="alert">
      <span class="ec-state__title">Gagal memuat</span>
      <p class="ec-state__body">{{ loadError }}</p>
      <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="load">Coba lagi</button>
    </div>

    <template v-else>
      <!-- Tambah & kelola dalam satu section summary (khusus SO ke atas) -->
      <details v-if="canManage" class="materi__section" open>
        <summary class="materi__section-summary">
          <span class="materi__section-chevron" aria-hidden="true"><ChevronDown :size="20" /></span>
          <span class="materi__section-title">Kelola pertemuan</span>
          <span class="materi__count">{{ items.length }}</span>
        </summary>
        <div class="materi__section-body materi__manage-body">
          <button v-if="!showForm" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="openAdd">
            <Plus :size="16" aria-hidden="true" /> Tambah
          </button>
          <div v-if="showForm" class="materi__form">
            <h3 class="materi__formtitle">{{ editingId ? 'Ubah subjudul pertemuan' : 'Tambah pertemuan' }}</h3>
            <label class="ec-label" for="materi-title">Subjudul pertemuan</label>
            <input id="materi-title" v-model="formTitle" class="ec-field" maxlength="80" placeholder="cth. Pertemuan 1 - Phonics & Pronunciation" />
            <label class="ec-label" for="materi-link" style="margin-top:10px">Link / embed Canva</label>
            <input
              id="materi-link"
              v-model="formLink"
              class="ec-field ec-field--mono"
              placeholder="https://www.canva.com/design/... atau tempel kode <iframe>"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="ec-helper">Dari Canva: Bagikan &gt; Sematkan &gt; salin link atau kode embed.</p>
            <p v-if="formError" class="materi__result materi__result--err" role="alert">{{ formError }}</p>
            <div class="materi__actions">
              <button class="ec-btn ec-btn--primary ec-btn--sm" type="button" :disabled="formSaving" @click="submit">
                {{ formSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="showForm = false">Batal</button>
            </div>
          </div>
          <ul v-if="items.length" class="materi__manage">
            <li v-for="m in items" :key="'kelola-' + m.id" class="materi__row">
              <span class="materi__name">{{ m.title }}</span>
              <button
                class="materi__icon-btn"
                type="button"
                :aria-label="'Sunting ' + m.title"
                title="Sunting"
                @click="openEdit(m)"
              ><Pencil :size="17" aria-hidden="true" /></button>
              <button
                class="materi__icon-btn materi__icon-btn--danger"
                type="button"
                :disabled="deletingId === m.id"
                :aria-label="'Hapus ' + m.title"
                title="Hapus"
                @click="removeItem(m)"
              ><Trash2 :size="17" aria-hidden="true" /></button>
            </li>
          </ul>
          <p v-else-if="!showForm" class="ec-body">Belum ada materi. Ketuk Tambah untuk materi pertama.</p>
        </div>
      </details>

      <div v-if="items.length" class="ec-card materi__card">
        <div class="materi__list">
          <details
            v-for="m in items"
            :key="m.id"
            class="materi__section"
            open
          >
            <summary class="materi__section-summary">
              <span class="materi__section-chevron" aria-hidden="true"><ChevronDown :size="20" /></span>
              <span class="materi__section-title">{{ m.title }}</span>
            </summary>
            <div class="materi__section-body">
              <button
                class="materi__resource"
                type="button"
                :aria-expanded="String(openedId) === String(m.id)"
                @click="open(m)"
              >
                <span class="materi__resource-icon" aria-hidden="true"><Presentation :size="22" :stroke-width="1.8" /></span>
                <span class="materi__resource-meta">
                  <b>Presentasi Canva</b>
                  <small>Ditambahkan {{ formatWIB(m.created_at) }}</small>
                </span>
                <ExternalLink class="materi__resource-link" :size="18" aria-hidden="true" />
              </button>
              <div v-if="String(openedId) === String(m.id)" class="materi__preview">
                <div class="materi__viewer-head">
                  <h3 ref="viewerTitle" class="materi__sectitle" tabindex="-1">Pratinjau materi</h3>
                  <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="closeViewer">Tutup</button>
                </div>
                <div v-if="openedSrc" class="materi__frame-wrap">
                  <iframe
                    :src="openedSrc"
                    class="materi__frame"
                    loading="lazy"
                    allowfullscreen
                    allow="fullscreen"
                    :title="'Pratinjau ' + m.title"
                  ></iframe>
                </div>
                <p v-else class="materi__result materi__result--err" role="alert">Link materi ini tidak valid.</p>
                <a v-if="openedSrc" class="ec-btn ec-btn--secondary ec-btn--sm" :href="openedSrc" target="_blank" rel="noopener">
                  Buka di Canva <ExternalLink :size="16" aria-hidden="true" />
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
      <div v-else class="ec-state" role="status">
        <span class="ec-state__title">Belum ada materi</span>
        <p class="ec-state__body">Pantau pengumuman komunitas.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.materi { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.materi__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.materi__eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ec-blue); }
.materi__title { font-family: 'Outfit', sans-serif; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -0.025em; color: var(--ec-ink); line-height: 1.15; margin: 0; }
.materi__sub { font-size: 14px; color: var(--ec-ink-soft); margin: 2px 0 0; }
.materi__skel { display: flex; flex-direction: column; gap: 10px; }
.materi__card { padding: 18px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.materi__form { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--ec-line); border-radius: var(--ec-radius-md); background: var(--ec-canvas); }
.materi__formtitle { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--ec-ink); }
.materi__sectitle { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: var(--ec-ink); margin: 0; }
.materi__sectitle:focus { outline: none; }
.materi__sectitle:focus-visible { box-shadow: var(--ec-focus-ring); border-radius: 6px; }
.materi__list { display: flex; flex-direction: column; gap: 14px; }
.materi__section { overflow: hidden; border: 1px solid #D9E0E8; border-radius: 12px; background: var(--ec-surface); }
.materi__section-summary { display: flex; align-items: center; gap: 14px; min-height: 72px; padding: 12px 18px; cursor: pointer; list-style: none; }
.materi__section-summary::-webkit-details-marker { display: none; }
.materi__section-summary:focus-visible { outline: none; box-shadow: inset var(--ec-focus-ring); }
.materi__section-chevron { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border-radius: 9px; background: var(--ec-blue-050); color: var(--ec-blue); transition: transform 180ms var(--ec-ease); }
.materi__section[open] .materi__section-chevron { transform: rotate(180deg); }
.materi__section-title { min-width: 0; color: var(--ec-ink); font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
.materi__section-body { padding: 0 18px 10px; border-top: 1px solid var(--ec-line); }
.materi__resource { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; padding: 14px 4px; border: 0; border-bottom: 1px solid var(--ec-line); background: transparent; color: inherit; cursor: pointer; text-align: left; font: inherit; }
.materi__resource:hover .materi__resource-meta b { color: var(--ec-blue); }
.materi__resource:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); border-radius: 6px; }
.materi__resource-icon { display: grid; place-items: center; flex: 0 0 32px; color: #0891B2; }
.materi__resource-meta { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
.materi__resource-meta b { color: var(--ec-blue); font-size: 0.9375rem; font-weight: 600; overflow-wrap: anywhere; }
.materi__resource-meta small { color: var(--ec-ink-soft); font-size: 0.75rem; line-height: 1.45; }
.materi__resource-link { flex: 0 0 auto; color: var(--ec-ink-soft); }
.materi__preview { display: flex; flex-direction: column; gap: 12px; padding: 14px 0 8px; }
.materi__viewer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.materi__frame-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--ec-line); border-radius: var(--ec-radius-md); background: var(--ec-canvas); }
.materi__frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.materi__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.materi__result { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: var(--ec-radius-md); }
.materi__result--err { background: var(--ec-danger-bg); color: var(--ec-danger); border: 1px solid var(--ec-danger-line); }
.materi__manage { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.materi__row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--ec-line); }
.materi__row:last-child { border-bottom: 0; }
.materi__name { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 700; color: var(--ec-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.materi__count { flex: 0 0 auto; min-width: 28px; height: 28px; padding: 0 8px; display: grid; place-items: center; border-radius: 999px; background: var(--ec-blue-050); color: var(--ec-blue); font-size: 0.78rem; font-weight: 800; }
.materi__manage-body { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; padding-bottom: 14px; }
.materi__manage-body .ec-btn--primary svg { vertical-align: -3px; }
.materi__icon-btn { display: grid; place-items: center; flex: 0 0 auto; width: 40px; height: 40px; border: 1px solid var(--ec-line); border-radius: 10px; background: var(--ec-surface); color: var(--ec-ink-soft); cursor: pointer; transition: color 160ms var(--ec-ease), border-color 160ms var(--ec-ease), background 160ms var(--ec-ease); }
.materi__icon-btn:hover { color: var(--ec-blue); border-color: var(--ec-info-line); background: var(--ec-blue-050); }
.materi__icon-btn:focus-visible { outline: none; box-shadow: var(--ec-focus-ring); }
.materi__icon-btn--danger:hover { color: var(--ec-danger); border-color: var(--ec-danger-line); background: var(--ec-danger-bg); }
.materi__icon-btn:disabled { opacity: 0.5; cursor: default; }
.materi__danger { color: var(--ec-danger); }
.ec-field--mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
@media (max-width: 520px) {
  .materi__card { padding: 14px; }
  .materi__section-summary { gap: 10px; min-height: 64px; padding: 10px 12px; }
  .materi__section-title { font-size: 1rem; }
  .materi__section-body { padding-inline: 12px; }
  .materi__resource { gap: 8px; }
  .materi__resource-meta small { overflow-wrap: anywhere; }
}
@media (pointer: coarse) {
  .ec-field--mono { font-size: max(16px, 0.8rem); }
}
</style>
