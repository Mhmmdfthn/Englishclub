<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back'])

const nama = ref('')
const no_hp = ref('')
const jurusan = ref('')
const jurusanOptions = ['Ilmu Komputer', 'Manajemen', 'Akuntansi', 'Bisnis Digital', 'Sains Data', 'Agribisnis', 'Lainnya']
const submitting = ref(false)
const error = ref('')
const success = ref('')
const highlight = ref([])
const total = ref(0)
const highlightLoading = ref(false)

function validate() {
  if (!nama.value.trim() || nama.value.trim().length < 2) return 'Nama minimal 2 huruf'
  const hp = no_hp.value.trim().replace(/\s|-/g, '')
  if (!/^08[0-9]{8,11}$/.test(hp)) return 'No HP harus 08xxxxxxxxxx (10-13 digit)'
  if (!jurusan.value) return 'Jurusan wajib dipilih'
  return ''
}

function formatTime(iso) {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'baru saja'
    if (m < 60) return `${m} menit lalu`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} jam lalu`
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

async function loadHighlight() {
  highlightLoading.value = true
  try {
    const data = await api.membersHighlight()
    highlight.value = data.highlight || []
    total.value = data.total || highlight.value.length
  } catch { /* silent */ }
  finally { highlightLoading.value = false }
}

  async function submit() {
  error.value = ''
  success.value = ''
  const v = validate()
  if (v) { error.value = v; return }
  submitting.value = true
  try {
    await api.registerMember(nama.value.trim(), no_hp.value.trim().replace(/\s|-/g, ''), jurusan.value)
    success.value = 'Terdaftar! Data tersimpan.'
    nama.value = ''
    no_hp.value = ''
    jurusan.value = ''
    await loadHighlight()
  } catch (e) {
    const msg = e?.message || ''
    if (msg.includes('422') || msg.includes('400')) {
      error.value = msg.includes('jurusan') ? 'Jurusan tidak valid' : msg.includes('08') ? 'No HP harus 08xxxxxxxxxx (10-13 digit)' : 'Data tidak valid, periksa kembali'
    } else if (e?.network) error.value = 'Tidak dapat terhubung ke server.'
    else error.value = 'Data belum tersimpan. Coba lagi.'
  } finally {
    submitting.value = false
  }
}

onMounted(loadHighlight)
</script>

<template>
  <section class="screen form-page">
    <nav class="page-nav" aria-label="Navigasi pendaftaran">
      <button class="page-brand" type="button" @click="emit('back')" aria-label="Kembali"><img src="/Logo_ec.jpg" alt="Logo EC UPB" /></button>
      <span class="page-nav-title">PENDAFTARAN ANGGOTA</span>
      <button class="page-back" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="play-layout">
      <aside class="mode-panel">
        <span class="panel-kicker">PENDAFTARAN</span>
        <h1>Daftar anggota baru.</h1>
        <p class="mode-intro">Data Pendaftar Member.</p>
        <div class="mode-note">
          <span class="note-mark">i</span>
          <p>Pendaftaran diproses server. Hanya Pihak Human Resource English Club yang dapat mengelola data.</p>
        </div>
      </aside>

      <div class="card form-card">
        <div class="form-heading">
          <span class="panel-kicker">FORM PENDAFTARAN</span>
          <h2>Form Pendaftaran</h2>
          <p>Hanya nama, no HP, dan jurusan.</p>
        </div>

        <label class="name-label" for="reg-nama">Nama</label>
        <input id="reg-nama" v-model="nama" class="field" maxlength="40" placeholder="Nama lengkap..." :disabled="submitting" @input="error=''" />

        <label class="name-label" for="reg-hp">No HP</label>
        <input id="reg-hp" v-model="no_hp" class="field" maxlength="15" placeholder="08xxxxxxxxxx" inputmode="numeric" :disabled="submitting" @input="error=''" />

        <label class="name-label" for="reg-jurusan">Jurusan</label>
        <select id="reg-jurusan" v-model="jurusan" class="field" style="text-align:left; text-align-last:center;" :disabled="submitting" @change="error=''">
          <option value="">Pilih jurusan...</option>
          <option v-for="o in jurusanOptions" :key="o" :value="o">{{ o }}</option>
        </select>

        <button class="btn play-btn" :disabled="submitting" @click="submit">
          <span>{{ submitting ? 'Menyimpan...' : 'DAFTAR' }}</span>
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success-msg">{{ success }}</p>
      </div>
    </div>

    <!-- Highlight: siapa yang sudah daftar -->
    <div class="highlight-panel">
      <div class="highlight-head">
        <div>
          <span class="panel-kicker">TERDAFTAR</span>
          <h3>Yang sudah daftar — {{ total }} anggota</h3>
          <p class="tiny muted">Update otomatis setelah mendaftar. No HP disembunyikan.</p>
        </div>
        <button class="btn ghost highlight-refresh" :disabled="highlightLoading" @click="loadHighlight">{{ highlightLoading ? 'Memuat...' : 'Refresh' }}</button>
      </div>

      <div v-if="!highlight.length && !highlightLoading" class="highlight-empty">
        <p>Belum ada pendaftar — <b>jadi yang pertama!</b></p>
      </div>
      <div v-else class="highlight-grid">
        <article v-for="(h, i) in highlight" :key="i" class="highlight-card" :class="i===0 ? 'is-new' : ''">
          <div class="hl-avatar">{{ (h.nama||'?').trim().charAt(0).toUpperCase() }}</div>
          <div class="hl-main">
            <b class="hl-name">{{ h.nama }}</b>
            <span class="hl-meta">{{ h.jurusan }} · {{ formatTime(h.timestamp) }}</span>
          </div>
          <span v-if="i===0" class="hl-badge">BARU</span>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.form-page { --page-ink:var(--dark-navy); --page-paper:var(--pure-white); --page-lime:var(--vibrant-yellow); position:relative; isolation:isolate; max-width:1200px; min-height:100dvh; gap:18px; padding:0 clamp(18px,4vw,52px) 52px; color:var(--page-ink); background-color:var(--page-paper); background-image:radial-gradient(rgba(29,43,58,.13) 1px, transparent 1px); background-size:16px 16px; }
.form-page::before { content:''; position:fixed; inset:0; z-index:-1; background:var(--page-paper); background-image:radial-gradient(rgba(29,43,58,.13) 1px, transparent 1px); background-size:16px 16px; }
.page-nav { position:sticky; top:0; z-index:10; width:100%; min-height:64px; display:flex; align-items:center; gap:16px; padding:10px 14px; margin-bottom:24px; background:var(--pure-white); border-bottom:3px solid var(--page-ink); box-shadow:0 0 0 100vmax var(--pure-white), 0 4px 0 var(--page-lime); clip-path:inset(0 -100vmax); }
.page-brand { display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; background:transparent; border:0; cursor:pointer; }
.page-brand img { width:36px; height:36px; object-fit:contain; mix-blend-mode:multiply; }
.page-nav-title { color:var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:13px; font-weight:800; letter-spacing:.08em; }
.page-back { margin-left:auto; padding:9px 13px; color:var(--page-ink); background:transparent; border:2px solid var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:800; cursor:pointer; }
.page-back:hover { color:var(--dark-navy); background:var(--page-lime); }
.play-layout { width:100%; display:grid; grid-template-columns:minmax(0, 1fr) minmax(380px, .95fr); gap:24px; align-items:stretch; }
.mode-panel { display:flex; flex-direction:column; justify-content:center; gap:16px; padding:clamp(24px, 5vw, 58px); color:var(--dark-navy); background:var(--page-lime); border:3px solid var(--ink, var(--dark-navy)); box-shadow:7px 7px 0 var(--ink, var(--dark-navy)); }
.panel-kicker { color:var(--royal-blue); font-size:10px; font-weight:900; letter-spacing:.16em; }
.mode-panel h1 { max-width:460px; font-size:clamp(34px, 5vw, 68px); line-height:.92; letter-spacing:-.06em; }
.mode-intro { max-width:410px; font-size:14px; line-height:1.6; }
.mode-note { display:flex; align-items:flex-start; gap:10px; margin-top:8px; padding-top:16px; border-top:2px solid var(--ink, var(--dark-navy)); }
.note-mark { display:grid; flex:0 0 22px; place-items:center; width:22px; height:22px; border:2px solid var(--ink, var(--dark-navy)); font-weight:900; }
.mode-note p { max-width:340px; font-size:11px; line-height:1.5; }
.form-card { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:clamp(28px, 5vw, 58px); text-align:center; background:var(--pure-white); border:3px solid var(--dark-navy); border-radius:0; box-shadow:7px 7px 0 var(--royal-blue); }
.form-heading { display:flex; flex-direction:column; align-items:center; gap:9px; }
.form-card h2{ font-size:clamp(28px, 4vw, 42px); line-height:1; font-weight:900; color:var(--dark-navy); }
.form-heading p { max-width:330px; color:var(--text-muted); font-size:13px; line-height:1.5; }
.name-label { align-self:stretch; max-width:420px; color:var(--dark-navy); font-size:12px; font-weight:800; text-align:left; }
.field{ width:100%; max-width:420px; border-radius:0; border:2px solid var(--dark-navy); }
.success-msg { color: var(--good); font-size:13px; font-weight:700; }
.play-btn{ width:100%; max-width:420px; border-radius:0; border:2px solid var(--dark-navy); box-shadow:4px 4px 0 var(--dark-navy); }
.highlight-panel { width:100%; margin-top:18px; padding:18px clamp(18px,3vw,28px); background:#fff; border:3px solid var(--dark-navy); box-shadow:7px 7px 0 var(--dark-navy); }
.highlight-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px; border-bottom:2px solid var(--dark-navy); padding-bottom:14px; margin-bottom:14px; }
.highlight-head h3 { font-size:18px; font-weight:900; line-height:1; margin-top:4px; }
.highlight-refresh { padding:9px 14px; font-size:12px; }
.highlight-empty { padding:18px; text-align:center; background:#f8fafc; border:2px dashed var(--dark-navy); font-size:14px; }
.highlight-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; }
.highlight-card { display:flex; align-items:center; gap:10px; padding:12px 14px; border:2px solid var(--dark-navy); background:var(--pure-white); box-shadow:3px 3px 0 var(--dark-navy); transition: transform 0.18s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.18s ease; }
.highlight-card:hover { transform: translateY(-1px); box-shadow: 4px 4px 0 var(--dark-navy); }
.highlight-card.is-new { background:var(--vibrant-yellow); }
.hl-avatar { flex:0 0 36px; width:36px; height:36px; display:grid; place-items:center; background:var(--dark-navy); color:#fff; font-weight:900; border-radius:50%; box-shadow: 0 1px 2px rgba(29,43,58,0.15); }
.hl-main { display:flex; flex-direction:column; gap:2px; min-width:0; }
.hl-name { font-size:14px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hl-meta { font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hl-badge { margin-left:auto; padding:3px 7px; background:var(--royal-blue); color:#fff; font-size:9px; font-weight:900; letter-spacing:.08em; border: 1px solid rgba(255,255,255,0.25); }
/* polish */
.page-nav { backdrop-filter: blur(8px) saturate(1.1); -webkit-backdrop-filter: blur(8px) saturate(1.1); }
.form-card { transition: transform 0.22s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.22s ease; }
.form-card:focus-within { transform: translateY(-1px); box-shadow: 8px 8px 0 var(--royal-blue); }
.field:focus { box-shadow: 4px 4px 0 var(--vibrant-yellow); border-color: var(--dark-navy); }
.highlight-panel { position: relative; overflow: hidden; }
.highlight-panel::after { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 60% 40% at 95% 0%, rgba(255,230,0,0.06), transparent 60%); pointer-events:none; }
@media (max-width:760px){
  .form-page{ padding-left:14px; padding-right:14px; }
  .play-layout{ grid-template-columns:1fr; gap:18px; }
  .mode-panel{ padding:28px 22px; }
  .form-card{ padding:30px 20px; }
  .highlight-grid{ grid-template-columns:1fr; }
}
</style>
