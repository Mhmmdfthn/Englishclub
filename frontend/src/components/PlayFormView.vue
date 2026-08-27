<script setup>
import { ref } from 'vue'

defineProps({
  best: { type: Number, default: 0 },
  error: { type: String, default: '' },
  retriable: { type: Boolean, default: false },
})

const emit = defineEmits(['play', 'back'])
const name = ref(localStorage.getItem('wh_name') || '')
const selectedMode = ref('santai')
const showSystemInfo = ref(false)

function submit() {
  localStorage.setItem('wh_name', name.value.trim() || 'Anonim')
  emit('play')
}
</script>

<template>
  <section class="screen form-page">
    <nav class="page-nav" aria-label="Navigasi halaman bermain">
      <button class="page-brand" type="button" @click="emit('back')" aria-label="Kembali ke profil">
        <img src="/Logo_ec.jpg" alt="Logo English Club UPB" />
      </button>
      <span class="page-nav-title">WORD HUNT</span>
      <button class="page-back" type="button" @click="emit('back')">Kembali ke Profil</button>
    </nav>

    <div class="play-layout">
      <aside class="mode-panel">
        <span class="panel-kicker">PILIH MODE</span>
        <h1>Temukan kata dengan caramu.</h1>
        <p class="mode-intro">Pilih pengalaman bermain yang ingin kamu coba hari ini.</p>

        <button class="mode-option mode-active" :class="{ selected: selectedMode === 'santai' }" @click="selectedMode = 'santai'">
          <span class="mode-icon">01</span>
          <span class="mode-copy"><b>Santai</b><small>Main bebas untuk melatih vocabulary.</small></span>
          <span class="mode-check">✓</span>
        </button>
        <button class="mode-option mode-disabled" disabled>
          <span class="mode-icon">02</span>
          <span class="mode-copy"><b>Hard</b><small>Segera hadir untuk tantangan berikutnya.</small></span>
          <span class="mode-soon">SOON</span>
        </button>

        <div class="mode-note">
          <span class="note-mark">i</span>
          <p>Susun minimal tiga huruf yang saling terhubung untuk membentuk kata Inggris.</p>
        </div>
      </aside>

      <div class="card form-card">
        <div class="form-heading">
          <span class="panel-kicker">WORD HUNT</span>
          <h2>Siap untuk bermain?</h2>
          <p>Masukkan nama kamu untuk mencatat skor di klasemen.</p>
        </div>

        <label class="name-label" for="player-name">Nama pemain</label>
        <input
          id="player-name"
          v-model="name"
          class="field"
          maxlength="20"
          placeholder="Ketik nama kamu..."
          @keyup.enter="submit"
        />

        <div class="score-badge">
          <span class="score-label">Rekor perangkat</span>
          <span class="score-val">{{ best }} <small>PTS</small></span>
        </div>

        <button class="btn play-btn" @click="submit">
          <span>MULAI WORD HUNT</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <button v-if="retriable && error" class="btn retry-btn" type="button" @click="emit('play')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M23 4v6h-6"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          <span>Coba Lagi</span>
        </button>
        <button class="system-info-button" type="button" @click="showSystemInfo = !showSystemInfo">
          {{ showSystemInfo ? 'Sembunyikan info sistem' : 'Lihat info sistem' }}
          <span>{{ showSystemInfo ? '↑' : '↓' }}</span>
        </button>
        <div v-if="showSystemInfo" class="system-info">
          <div><b>Grid</b><span>5 × 5 huruf</span></div>
          <div><b>Waktu</b><span>60 detik</span></div>
          <div><b>Skor</b><span>Nilai huruf × panjang × 2</span></div>
          <div><b>Combo</b><span>Bonus hingga ×10</span></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.form-page { --page-ink:#172B6B; --page-paper:#F7F4DF; --page-lime:#B8D96B; position:relative; isolation:isolate; max-width:1200px; min-height:100dvh; gap:18px; padding:0 clamp(18px,4vw,52px) 52px; color:var(--page-ink); background-color:var(--page-paper); background-image:radial-gradient(rgba(23,43,107,.13) 1px, transparent 1px); background-size:16px 16px; }
.form-page::before { content:''; position:fixed; inset:0; z-index:-1; background:var(--page-paper); background-image:radial-gradient(rgba(23,43,107,.13) 1px, transparent 1px); background-size:16px 16px; }
.page-nav { position:sticky; top:0; z-index:10; width:100%; min-height:64px; display:flex; align-items:center; gap:16px; padding:10px 14px; margin-bottom:24px; background:#FFFDF5; border-bottom:3px solid var(--page-ink); box-shadow:0 0 0 100vmax #FFFDF5, 0 4px 0 var(--page-lime); clip-path:inset(0 -100vmax); }
.page-brand { display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; background:transparent; border:0; cursor:pointer; }
.page-brand img { width:36px; height:36px; object-fit:contain; mix-blend-mode:multiply; }
.page-nav-title { color:var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:13px; font-weight:800; letter-spacing:.08em; }
.page-back { margin-left:auto; padding:9px 13px; color:var(--page-ink); background:transparent; border:2px solid var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:800; cursor:pointer; }
.page-back:hover { background:var(--page-lime); }
.play-layout { width:100%; display:grid; grid-template-columns:minmax(0, 1fr) minmax(380px, .95fr); gap:24px; align-items:stretch; }
.mode-panel { display:flex; flex-direction:column; justify-content:center; gap:16px; padding:clamp(24px, 5vw, 58px); color:var(--ink, var(--dark-navy)); background:var(--lime, #B8D96B); border:3px solid var(--ink, var(--dark-navy)); box-shadow:7px 7px 0 var(--ink, var(--dark-navy)); }
.panel-kicker { color:var(--green, var(--royal-blue)); font-size:10px; font-weight:900; letter-spacing:.16em; }
.mode-panel h1 { max-width:460px; font-size:clamp(34px, 5vw, 68px); line-height:.92; letter-spacing:-.06em; }
.mode-intro { max-width:410px; font-size:14px; line-height:1.6; }
.mode-option { width:100%; display:flex; align-items:center; gap:12px; padding:14px; text-align:left; color:var(--ink, var(--dark-navy)); background:#fff; border:2px solid var(--ink, var(--dark-navy)); box-shadow:4px 4px 0 var(--ink, var(--dark-navy)); }
.mode-option:not(:disabled) { cursor:pointer; }
.mode-option.selected { background:var(--paper, #F7F4DF); }
.mode-disabled { opacity:.58; box-shadow:2px 2px 0 var(--ink, var(--dark-navy)); }
.mode-icon { display:grid; flex:0 0 38px; place-items:center; width:38px; height:38px; border:2px solid currentColor; font-family:'Outfit', sans-serif; font-weight:900; }
.mode-copy { display:flex; flex:1; flex-direction:column; gap:3px; }
.mode-copy b { font-size:16px; }
.mode-copy small { font-size:11px; line-height:1.4; }
.mode-check { font-size:20px; font-weight:900; color:var(--green, var(--royal-blue)); }
.mode-soon { font-size:9px; font-weight:900; letter-spacing:.1em; }
.mode-note { display:flex; align-items:flex-start; gap:10px; margin-top:8px; padding-top:16px; border-top:2px solid var(--ink, var(--dark-navy)); }
.note-mark { display:grid; flex:0 0 22px; place-items:center; width:22px; height:22px; border:2px solid var(--ink, var(--dark-navy)); font-weight:900; }
.mode-note p { max-width:340px; font-size:11px; line-height:1.5; }
.form-card { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:clamp(28px, 5vw, 58px); text-align:center; border:3px solid var(--ink, var(--dark-navy)); border-radius:0; box-shadow:7px 7px 0 var(--green, var(--royal-blue)); }
.form-heading { display:flex; flex-direction:column; align-items:center; gap:9px; }
.form-card h2{ font-size:clamp(28px, 4vw, 42px); line-height:1; font-weight:900; color:var(--dark-navy); }
.form-heading p { max-width:330px; color:var(--text-muted); font-size:13px; line-height:1.5; }
.name-label { align-self:stretch; max-width:420px; color:var(--dark-navy); font-size:12px; font-weight:800; text-align:left; }
.score-badge{ display:flex; flex-direction:column; align-items:center; gap:2px; border-top:1px solid var(--light-gray); padding-top:10px; width:100%; max-width:320px; }
.score-label{ font-size:10.5px; letter-spacing:.8px; text-transform:uppercase; color:var(--text-muted); font-weight:600; }
.score-val{ font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:var(--royal-blue); }
.play-btn{ width:100%; max-width:420px; }
.retry-btn{ width:100%; max-width:420px; font-size:14px; padding:12px 26px; }
.field{ width:100%; max-width:420px; }
.system-info-button { display:inline-flex; align-items:center; gap:8px; margin-top:2px; padding:5px 0; color:var(--royal-blue); background:transparent; font-size:12px; font-weight:800; border-bottom:1px solid currentColor; }
.system-info-button span { font-size:15px; }
.system-info { width:100%; max-width:420px; display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:14px; text-align:left; background:#F4F8FC; border:1px solid var(--light-gray); }
.system-info div { display:flex; flex-direction:column; gap:3px; }
.system-info b { color:var(--dark-navy); font-size:11px; }
.system-info span { color:var(--text-muted); font-size:11px; line-height:1.35; }
@media (max-width:760px){
  .form-page{ padding-left:14px; padding-right:14px; }
  .page-nav { margin-bottom:18px; padding:8px 10px; }
  .page-nav-title { font-size:11px; }
  .page-back { padding:7px 8px; font-size:10px; }
  .play-layout{ grid-template-columns:1fr; gap:18px; }
  .mode-panel{ padding:28px 22px; }
  .mode-panel h1{ font-size:clamp(36px, 12vw, 58px); }
  .form-card{ padding:30px 20px; }
}
</style>
