<script setup>
import { onMounted, ref } from 'vue'
import { Instagram, Send } from 'lucide-vue-next'
import { api } from '../api.js'
import Testimonials from './Testimonials.vue'
import ProgramModal from './ProgramModal.vue'

const emit = defineEmits(['goPlay', 'goBoard', 'goRegister', 'openAdmin'])
const storyName = ref('')
const storyBatch = ref('')
const storyComment = ref('')
const stories = ref([])
const storyError = ref('')
const storySubmitting = ref(false)
const batchOptions = ['2026 / Ilmu Komputer', '2026 / Manajemen', '2026 / Akuntansi', '2026 / Bisnis Digital', '2026 / Sains Data', '2026 / Agribisnis']

const proker = ref([])
const selectedProker = ref(null)
function openProker(p) { selectedProker.value = p; document.body.style.overflow = 'hidden' }
function closeProker() { selectedProker.value = null; document.body.style.overflow = '' }

const mobileOpen = ref(false)
function toggleMobile() { mobileOpen.value = !mobileOpen.value }
function closeMobile() { mobileOpen.value = false }

const logoClicks = ref(0)
let logoTimer = null
function handleLogoClick() {
  closeMobile()
  logoClicks.value++
  clearTimeout(logoTimer)
  logoTimer = setTimeout(() => { logoClicks.value = 0 }, 800)
  if (logoClicks.value >= 5) {
    logoClicks.value = 0
    emit('openAdmin')
  }
}
let pressTimer = null
function logoPressStart() { pressTimer = setTimeout(() => emit('openAdmin'), 800) }
function logoPressEnd() { clearTimeout(pressTimer) }

onMounted(async () => {
  try { stories.value = (await api.stories()).stories } catch { storyError.value = 'Cerita anggota belum dapat dimuat.' }
  try { proker.value = (await api.proker()).proker } catch {}
})

async function submitStory() {
  const name = storyName.value.trim()
  const comment = storyComment.value.trim()
  if (!name || !comment || storySubmitting.value) return
  storySubmitting.value = true
  storyError.value = ''
  try {
    const response = await api.addStory(name, storyBatch.value || 'Anggota EC UPB', comment)
    stories.value.unshift(response.story)
    storyName.value = ''
    storyBatch.value = ''
    storyComment.value = ''
  } catch { storyError.value = 'Cerita belum dapat dikirim. Coba lagi.' }
  finally { storySubmitting.value = false }
}

function goPlay() {
  emit('goPlay')
}

function goBoard() {
  emit('goBoard')
}

function goRegister() {
  emit('goRegister')
}
</script>

<template>
  <section id="top" class="screen landing">
    <div class="landing-hero">
      <nav class="landing-nav" aria-label="Navigasi utama">
        <a class="nav-brand" href="#top" aria-label="Kembali ke bagian atas" @click="handleLogoClick" @pointerdown="logoPressStart" @pointerup="logoPressEnd" @pointerleave="logoPressEnd"><img src="/Logo_ec.jpg" alt="Logo English Club UPB" /></a>
        <a href="#profil" class="nav-link" @click="closeMobile">Profil</a>
        <a href="#program" class="nav-link" @click="closeMobile">Program</a>
        <a href="#cerita" class="nav-link" @click="closeMobile">Cerita Anggota</a>
        <div class="nav-actions">
          <button class="nav-button nav-board" type="button" @click="goRegister">Daftar</button>
          <button class="nav-button nav-play" type="button" @click="goPlay">Main Word Hunt</button>
        </div>
        <button class="hamburger" type="button" aria-label="Buka menu" :aria-expanded="mobileOpen" @click="toggleMobile">
          <span class="ham-line" :class="{open: mobileOpen}"></span>
          <span class="ham-line" :class="{open: mobileOpen}"></span>
          <span class="ham-line" :class="{open: mobileOpen}"></span>
        </button>
      </nav>
      <Transition name="mobile-drawer">
        <div v-if="mobileOpen" class="mobile-drawer" @click.self="closeMobile">
          <div class="mobile-panel">
            <a href="#profil" @click="closeMobile">Profil</a>
            <a href="#program" @click="closeMobile">Program</a>
            <a href="#cerita" @click="closeMobile">Cerita Anggota</a>
            <button class="btn" type="button" @click="closeMobile(); goRegister()">Daftar Anggota</button>
            <button class="btn primary" type="button" @click="closeMobile(); goPlay()">Main Word Hunt</button>
          </div>
        </div>
      </Transition>
      <p class="eyebrow">UNIT KEGIATAN MAHASISWA, UNIVERSITAS PUTRA BANGSA KEBUMEN</p>
      <h1 class="title">ENGLISH <span class="highlight">CLUB</span></h1>
      <div class="subtitle">
        <span class="quote-mark">“</span>
        <p>One language sets you in a corridor for life. Two languages open every door along the way.</p>
        <span class="quote-author">— Frank Smith</span>
        <span class="quote-meaning">Satu bahasa membatasi kamu dalam satu jalur seumur hidup. Dua bahasa membuka setiap pintu di sepanjang perjalanan.</span>
      </div>
    </div>

    <div id="profil" class="section-title"><span class="section-badge">TENTANG KAMI</span><h2>Profil UKM</h2><p>Bagian dari <b>BEM — Departemen Keilmuan</b> Universitas Putra Bangsa Kebumen.</p></div>
    <div class="card about-card"><div class="about-grid"><div class="about-text"><h3>Siapa Kami?</h3><p><b>English Club UPB</b> adalah UKM di bawah <b>BEM Departemen Keilmuan</b>. Kegiatan kami berfokus pada latihan bahasa Inggris dan kegiatan kampus.</p><p>Terbuka untuk mahasiswa yang ingin berlatih speaking, listening, dan public speaking.</p><ul class="check-list"><li>Bagian dari BEM — Departemen Keilmuan</li><li>Terbuka untuk semua prodi</li></ul></div><div class="about-visual"><div class="mini-stats"><div class="mini-stat"><b>2019</b><span>Berdiri</span></div><div class="mini-stat"><b>150+</b><span>Alumni</span></div><div class="mini-stat"><b>4</b><span>Divisi</span></div></div><div class="quote-box">From Kebumen to the World, Speak Confidently, Lead Globally.</div></div></div></div>

    <div id="program" class="overview-heading"><div><span class="section-badge">PROGRAM</span><h2>Apa yang Kami Lakukan?</h2></div><p>Latihan bahasa Inggris, kegiatan rutin, dan agenda kampus untuk anggota.</p></div>
    <div class="overview-grid vision-mission-grid"><article class="overview-card"><div class="ov-icon">01</div><h3>Visi</h3><ul><li>Membuat latihan bahasa Inggris mudah diikuti mahasiswa.</li><li>Membantu anggota lebih percaya diri saat berbicara di kelas dan tempat kerja.</li></ul></article><article class="overview-card"><div class="ov-icon">02</div><h3>Misi</h3><ul><li>Mengadakan latihan speaking dan listening secara rutin.</li><li>Membuka kesempatan untuk praktik public speaking.</li><li>Mengadakan kegiatan dan kompetisi berbahasa Inggris.</li><li>Mendukung anggota mengikuti kegiatan akademik dan organisasi.</li></ul></article></div>

    <div class="program-section"><h2>Program Kerja</h2><p class="tiny muted" style="margin-bottom:14px;">Pilih program untuk melihat agenda dan detail kegiatan.</p><div class="program-grid"><article v-for="p in proker" :key="p.id" class="program-card clickable" role="button" tabindex="0" @click="openProker(p)" @keydown.enter="openProker(p)"><div class="program-thumb"><img :src="p.imageUrl || p.photos?.[0] || '/Logo_ec.jpg'" :alt="p.title" loading="lazy" /></div><div class="program-status" :class="`status-${p.status || 'upcoming'}`">{{ p.status === 'completed' ? 'Selesai' : p.status === 'ongoing' ? 'Sedang berlangsung' : 'Akan datang' }}</div><h3>{{ p.title }}</h3><p>{{ p.description || p.caption }}</p><span v-if="p.date" class="tiny">{{ p.date }}</span><span class="tiny" style="margin-top:6px; font-weight:800; color:var(--royal-blue);">Buka detail →</span></article></div></div>
    <ProgramModal :program="selectedProker" :open="!!selectedProker" @close="closeProker" />

  <div class="teaser-card"><div class="teaser-mark">5x5</div><div class="teaser-copy"><span class="teaser-kicker">GAME ENGLISH CLUB</span><h2>Main <span>Word Hunt</span></h2><p>Susun kata dari huruf yang berdekatan. Kumpulkan poin dalam 60 detik.</p></div><div class="teaser-actions"><button class="btn" type="button" @click="goPlay">Mulai</button><button class="btn ghost" type="button" @click="goBoard">Papan Skor</button></div></div>

    <div class="join-cta">
      <div class="join-cta-copy">
        <span class="section-badge">JOIN EC</span>
        <p>Berminat gabung EC? <strong>Ayo gabung.</strong></p>
      </div>
      <button class="btn hero-register" type="button" @click="goRegister">Gabung EC</button>
    </div>

    <section id="cerita" class="story-section">
      <Testimonials :entries="stories" />

      <form class="story-form" @submit.prevent="submitStory"><div class="story-form-heading"><h3>Cerita tentang English Club</h3><p>Tulis kesan singkat setelah datang ke kegiatan kami.</p></div><div class="story-form-fields"><input v-model="storyName" class="story-input" maxlength="40" placeholder="Nama" required /><select v-model="storyBatch" class="story-input"><option value="">Pilih angkatan / prodi</option><option v-for="option in batchOptions" :key="option" :value="option">{{ option }}</option></select><textarea v-model="storyComment" class="story-input story-textarea" maxlength="220" placeholder="Tulis kesanmu..." required></textarea><button class="btn story-submit" type="submit" :disabled="storySubmitting" :aria-label="storySubmitting ? 'Mengirim cerita' : 'Kirim cerita'" title="Kirim cerita"><Send :size="18" :stroke-width="2.5" aria-hidden="true" /><span class="sr-only">{{ storySubmitting ? 'Mengirim...' : 'Kirim' }}</span></button></div><p v-if="storyError" class="story-error">{{ storyError }}</p></form>
    </section>

    <footer class="site-footer"><div><b>English Club UPB</b><span>Universitas Putra Bangsa Kebumen</span></div><div class="social-links"><a href="https://www.instagram.com/englishclubupb/" target="_blank" rel="noreferrer" aria-label="Instagram English Club UPB" title="Instagram"><Instagram :size="21" :stroke-width="2.2" aria-hidden="true" /></a><a href="https://www.tiktok.com/@englishclubupb" target="_blank" rel="noreferrer" aria-label="TikTok English Club UPB" title="TikTok"><svg class="tiktok-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.95-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.5.18-1.9 1.12-3.72 2.57-4.96 1.55-1.34 3.74-1.93 5.78-1.56.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.6.24 1.65 1.82 3.05 3.5 3.01 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.88.06-3.76.07-5.64.01-4.24-.01-8.47.02-12.7z" fill="currentColor" /></svg></a></div><p>© 2026 English Club, Universitas Putra Bangsa Kebumen</p></footer>
  </section>
</template>

<style scoped>
.landing-hero { display:flex; width:100%; flex-direction:column; align-items:flex-start; }
.landing-nav { font-family:'Plus Jakarta Sans', sans-serif; }
.nav-button { font-family:'Plus Jakarta Sans', sans-serif; }
.landing { --ink:var(--dark-navy); --paper:var(--pure-white); --lime:var(--royal-blue); --green:var(--vibrant-yellow); max-width:1200px; gap:0; padding:0 clamp(18px,4vw,52px) 52px; color:var(--ink); }
.landing::before { content:''; position:fixed; inset:0; z-index:-1; background-color:var(--paper); background-image:radial-gradient(rgba(29,43,58,.13) 1px, transparent 1px); background-size:16px 16px; }
.landing-hero { position:relative; display:flex; width:100%; align-items:flex-start; min-height:min(560px,68vh); padding:96px 0 56px; text-align:left; border-bottom:4px solid var(--ink); row-gap:18px; }
.landing-nav { position:fixed; top:0; left:0; right:0; width:100%; margin:0; display:flex; align-items:center; gap:24px; min-height:64px; padding:10px max(14px, calc((100vw - 1100px) / 2)); background:var(--pure-white); border-bottom:3px solid var(--ink); box-shadow:0 4px 0 var(--lime); z-index:20; font-family:'Plus Jakarta Sans', sans-serif; }
.nav-brand { display:flex; flex:0 0 auto; align-items:center; width:42px; height:42px; margin-right:6px; }.nav-brand img { display:block; width:36px; height:36px; object-fit:contain; mix-blend-mode:multiply; }.landing-nav > a { color:var(--ink); font-size:13px; font-weight:700; text-decoration:none; }.landing-nav > a:hover { color:var(--royal-blue); }.nav-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }.nav-button { padding:9px 13px; color:var(--ink); background:transparent; border:2px solid var(--ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:800; cursor:pointer; min-height:44px; }.nav-button:hover { transform:translateY(-1px); }.nav-play { color:var(--pure-white); background:var(--lime); box-shadow:3px 3px 0 var(--ink); }
.hamburger { display:none; flex-direction:column; justify-content:center; gap:5px; width:44px; height:44px; padding:8px; background:#fff; border:2px solid var(--ink); cursor:pointer; }
.ham-line { display:block; width:100%; height:3px; background:var(--ink); transition: transform 0.2s ease, opacity 0.2s ease; }
.mobile-drawer { position:fixed; inset:0; z-index:19; background:rgba(29,43,58,0.45); backdrop-filter:blur(4px); display:grid; place-items:start center; padding-top:72px; }
.mobile-panel { width:min(92%, 360px); display:flex; flex-direction:column; gap:10px; padding:18px; background:#fff; border:3px solid var(--ink); box-shadow:8px 8px 0 var(--ink); }
.mobile-panel a { display:block; padding:14px 12px; color:var(--ink); font-weight:800; font-size:15px; text-decoration:none; border:2px solid var(--ink); background:#fff; text-align:center; }
.mobile-panel .btn { width:100%; justify-content:center; min-height:48px; }
.mobile-drawer-enter-active, .mobile-drawer-leave-active { transition: opacity 0.22s ease; }
.mobile-drawer-enter-from, .mobile-drawer-leave-to { opacity:0; }
.eyebrow,.section-badge,.teaser-kicker,.overview-number { font-family:'Outfit', sans-serif; font-weight:900; letter-spacing:.14em; }.eyebrow { width:fit-content; margin-bottom:8px; padding:7px 12px; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-size:11px; }.landing-hero .title { max-width:860px; font-size:clamp(52px,10vw,96px); line-height:.88; letter-spacing:-.06em; text-align:left; color:var(--ink); }.title .highlight { color:var(--royal-blue); }.landing-hero .subtitle { max-width:590px; margin-top:18px; color:var(--ink); font-size:clamp(16px,2vw,21px); line-height:1.5; }
.subtitle { display:flex; flex-direction:column; gap:8px; margin:18px 0 0; padding:16px 18px 16px 20px; max-width:700px; border-left:4px solid var(--royal-blue); background:rgba(33, 76, 122, 0.04); border-top:2px solid transparent; border-right:2px solid transparent; border-bottom:2px solid transparent; text-align:left; }
.subtitle .quote-mark { display:block; font-size:42px; line-height:1; color:var(--royal-blue); font-weight:900; }
.subtitle p { margin:0; color:var(--ink); font-size:clamp(18px,2vw,24px); line-height:1.45; font-weight:800; letter-spacing:-0.03em; }
.subtitle .quote-author { display:block; margin-top:2px; color:var(--ink); font-size:12px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; }
.subtitle .quote-meaning { display:block; margin-top:4px; color:var(--ink); font-size:clamp(13px,1.5vw,16px); line-height:1.55; font-weight:600; }
.join-cta { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:18px; width:100%; margin-top:42px; padding:24px 28px; background:#F6F1E7; border:3px solid #132238; box-shadow:6px 6px 0 #214C7A; }.join-cta-copy { display:flex; flex-direction:column; align-items:flex-start; gap:10px; }.join-cta p { margin:0; color:#132238; font-size:clamp(18px,2vw,26px); font-weight:800; line-height:1.2; }.join-cta strong { color:#214C7A; }.hero-register { padding:14px 24px; border:3px solid #132238; border-radius:0; background:#F4C542; box-shadow:5px 5px 0 #132238; color:#132238; font-size:13px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }.hero-register:hover { transform:translate(-2px, -2px); box-shadow:7px 7px 0 #132238; }.hero-stats { display:flex; margin-top:36px; border:2px solid var(--ink); background:#fff; box-shadow:5px 5px 0 var(--ink); }.hero-stats span { min-width:116px; padding:10px 16px; border-right:2px solid var(--ink); font-size:10px; font-weight:800; }.hero-stats span:last-child { border-right:0; }.hero-stats b { display:block; font-size:24px; }
.section-title { width:100%; display:flex; flex-direction:column; align-items:flex-start; gap:8px; padding:64px 0 24px; text-align:left; }.section-badge { padding:6px 11px; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); box-shadow:3px 3px 0 var(--ink); font-size:10px; }.section-title h2,.overview-heading h2,.values-heading h2 { color:var(--ink); }.section-title p { max-width:680px; }.about-card { width:100%; padding:0; overflow:visible; background:#fff; border:3px solid var(--ink); border-radius:0; box-shadow:6px 6px 0 var(--ink); }.about-grid { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(300px,.85fr); }.about-text { padding:32px; }.about-text h3 { font-size:22px; }.about-text p,.check-list li { font-size:15px; line-height:1.6; }.check-list { padding-left:18px; }.about-visual { padding:28px; border-left:3px solid var(--ink); background:var(--paper); }.mini-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.mini-stat { padding:12px 6px; text-align:center; border:2px solid var(--ink); background:#fff; }.mini-stat b,.mini-stat span { display:block; }.quote-box { margin-top:28px; padding:16px; background:var(--royal-blue); color:var(--pure-white); border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-weight:700; text-align:center; }
.teaser-card { width:100%; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:20px; margin:64px 0 0; padding:32px; color:#fff; background:var(--ink); border:3px solid var(--ink); box-shadow:7px 7px 0 var(--green); }.teaser-mark { display:grid; place-items:center; width:76px; aspect-ratio:1; color:var(--vibrant-yellow); border:2px solid var(--vibrant-yellow); font-size:20px; font-weight:900; }.teaser-kicker,.teaser-copy h2 span { color:var(--vibrant-yellow); }.teaser-copy h2 { color:#fff; }.teaser-copy p { max-width:480px; font-size:13.5px; line-height:1.5; }.teaser-actions { display:flex; flex-direction:column; gap:8px; }.teaser-actions .btn { white-space:nowrap; padding:11px 18px; border:2px solid #fff; border-radius:0; box-shadow:3px 3px 0 #000; font-size:13px; }.teaser-actions .btn.ghost { background:transparent; color:#fff; border-color:#fff; box-shadow:3px 3px 0 rgba(0,0,0,0.6); }.teaser-actions .btn.ghost:hover { background:#fff; color:var(--dark-navy); border-color:#fff; }
.overview-heading { width:100%; display:flex; align-items:end; justify-content:space-between; gap:28px; margin-top:64px; padding-bottom:20px; border-bottom:3px solid var(--ink); }.overview-heading p { max-width:340px; text-align:right; line-height:1.55; }.overview-grid { width:100%; display:grid; grid-template-columns:repeat(3,1fr); border-bottom:3px solid var(--ink); }.vision-mission-grid { width:100%; display:grid; grid-template-columns:repeat(2,1fr); border-bottom:3px solid var(--ink); gap:0; }.overview-card { min-height:240px; padding:24px; }.overview-card + .overview-card { border-left:2px solid var(--ink); }.ov-icon { display:grid; place-items:center; width:42px; height:42px; margin:12px 0; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); font-weight:900; }.overview-card p,.overview-card li { line-height:1.6; }.overview-card ul { padding-left:18px; }
.program-section { width:100%; margin-top:64px; padding-bottom:24px; border-bottom:3px solid var(--ink); }.program-section h2 { font-size:clamp(22px,4vw,28px); font-weight:900; color:var(--ink); margin-bottom:8px; }.program-grid { width:100%; display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }.program-card { display:flex; flex-direction:column; align-items:flex-start; gap:12px; padding:24px; background:#fff; border:2px solid var(--ink); cursor: pointer; }.program-card.clickable:hover { border-color: var(--royal-blue); } .program-thumb { width:100%; aspect-ratio: 16/9; border:2px solid var(--ink); overflow:hidden; background:#f8fafc; } .program-thumb img { width:100%; height:100%; object-fit:cover; display:block; } .program-icon { display:grid; place-items:center; width:48px; height:48px; color:var(--pure-white); background:var(--ink); border:2px solid var(--ink); font-weight:900; font-size:16px; }.program-card h3 { margin:0; font-size:16px; font-weight:900; color:var(--ink); }.program-card p { margin:0; font-size:14px; line-height:1.6; color:var(--ink); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.values-section { width:100%; display:grid; grid-template-columns:minmax(250px,.7fr) minmax(0,1.7fr); gap:28px; padding:64px 0 0; }.values-heading { display:flex; flex-direction:column; gap:10px; }.values-mosaic { display:grid; grid-template-columns:1.15fr .85fr; grid-auto-rows:minmax(140px,auto); gap:14px; }.value-panel { display:flex; flex-direction:column; justify-content:space-between; min-height:140px; padding:18px; border:3px solid var(--ink); box-shadow:4px 4px 0 var(--ink); }.value-panel-main { grid-row:span 2; color:#fff; background:var(--ink); }.value-panel-yellow { background:var(--lime); }.value-panel-light { background:#fff; }.value-panel-outline { grid-column:2; background:var(--paper); }.value-word { font-size:clamp(18px,2.5vw,30px); font-weight:900; line-height:1.05; }.story-author { font-size:11px; font-weight:800; }.story-form { grid-column:1 / -1; display:grid; grid-template-columns:minmax(250px,.7fr) minmax(0,1.7fr); gap:28px; margin-top:30px; padding:30px 0 0; border-top:3px solid var(--ink); }.story-form-heading h3 { font-size:18px; }.story-form-heading p { font-size:12.5px; }.story-form-fields { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.story-input { width:100%; padding:10px 12px; color:var(--ink); background:#fff; border:2px solid var(--ink); font:inherit; font-size:14px; }.story-textarea { grid-column:1 / -1; min-height:120px; resize:vertical; }.story-submit { grid-column:1 / -1; width:fit-content; padding:12px 22px; border:2px solid var(--ink); border-radius:0; background:var(--lime); box-shadow:4px 4px 0 var(--ink); font-size:12px; }.story-error { grid-column:1 / -1; color:var(--bad); font-size:12px; }.site-footer { width:100%; display:grid; grid-template-columns:1fr auto; gap:14px 28px; margin-top:70px; padding:20px 0 0; border-top:2px solid var(--ink); }.site-footer > div:first-child { display:flex; flex-direction:column; gap:4px; }.site-footer b { font-size:16px; }.site-footer span,.site-footer p { font-size:11px; }.social-links { display:flex; gap:10px; }.social-links a { padding:8px 11px; color:var(--ink); background:var(--lime); border:2px solid var(--ink); box-shadow:3px 3px 0 var(--ink); font-size:10px; font-weight:900; text-decoration:none; }.site-footer p { grid-column:1 / -1; }
.landing-hero { padding-top:98px; }
.story-section { width:100%; padding:64px 0 0; }
#daftar { scroll-margin-top:86px; }
.section-title, .overview-heading, .story-section { scroll-margin-top:86px; }
@media (max-width:680px) {
  .landing { padding:0 14px 24px; overflow-x:hidden; }
  .landing-nav { gap:8px; min-height:56px; padding:8px 12px; }
  .nav-brand { width:38px; height:38px; margin-right:auto; }
  .nav-brand img { width:30px; height:30px; }
  .nav-link, .nav-actions { display:none !important; }
  .hamburger { display:flex !important; }
  .landing-hero { min-height:auto; padding:88px 0 28px; gap:14px; }
  .landing-hero .title { font-size:clamp(38px, 11vw, 56px); line-height:0.92; }
  .eyebrow { font-size:8px; padding:5px 8px; }
  .subtitle { padding:14px 14px 14px 16px; }
  .subtitle p { font-size:16px; }
  .section-title { padding:36px 0 16px; }
  .section-title h2 { font-size:20px; }
  .about-grid,.overview-grid,.vision-mission-grid,.values-section,.story-form,.story-section { grid-template-columns:1fr; gap:14px; }
  .about-text { padding:18px 14px; }
  .about-text h3 { font-size:18px; }
  .about-text p, .check-list li { font-size:14px; }
  .about-visual { border-top:3px solid var(--ink); border-left:0; padding:16px 14px; }
  .mini-stats { gap:6px; }
  .mini-stat { padding:10px 4px; }
  .mini-stat b { font-size:18px; }
  .program-grid { grid-template-columns:1fr; gap:12px; }
  .program-card { padding:16px 14px; min-height:auto; }
  .program-card h3 { font-size:15px; }
  .program-card p { font-size:13px; }
  .teaser-card { grid-template-columns:1fr; text-align:center; justify-items:center; margin-top:32px; padding:20px 16px; gap:14px; }
  .teaser-mark { width:60px; font-size:16px; }
  .teaser-copy h2 { font-size:22px; }
  .teaser-actions { width:100%; gap:8px; }
  .teaser-actions .btn { width:100%; min-height:48px; font-size:13px; }
  .join-cta { display:flex; flex-direction:column; align-items:stretch; gap:12px; margin-top:28px; padding:18px 16px; }
  .join-cta p { font-size:20px; text-align:center; }
  .join-cta .hero-register { width:100%; min-height:48px; }
  .overview-heading { flex-direction:column; align-items:stretch; margin-top:32px; padding-bottom:14px; gap:12px; }
  .overview-heading p { text-align:left; max-width:100%; }
  .overview-card { min-height:auto; padding:18px 14px; }
  .overview-card h3 { font-size:16px; }
  .story-section { padding-top:36px; }
  .story-form { gap:12px; padding-top:18px; }
  .story-form-fields { grid-template-columns:1fr; gap:10px; }
  .story-input, .story-textarea { font-size:16px; min-height:48px; }
  .story-textarea { min-height:110px; }
  .story-submit { width:100% !important; min-height:48px !important; }
  .site-footer { grid-template-columns:1fr; gap:12px; margin-top:32px; font-size:13px; }
  .site-footer .social-links a { width:44px; height:44px; }
  .site-footer p { grid-column:auto; }
}

.landing-hero { display:flex; width:100%; align-items:flex-start; }
.landing-nav, .nav-button { font-family:'Plus Jakarta Sans', sans-serif; }
.overview-heading > div { display:flex; flex-direction:column; gap:14px; }

/* mobile hamburger open state */
.ham-line.open:nth-child(1) { transform: translateY(8px) rotate(45deg); }
.ham-line.open:nth-child(2) { opacity: 0; }
.ham-line.open:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }

/* Polish overrides — frontend developer */
.landing-nav { backdrop-filter: blur(10px) saturate(1.15); -webkit-backdrop-filter: blur(10px) saturate(1.15); }
.nav-button { transition: transform 0.16s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease; }
.nav-button:active { transform: translateY(0) scale(0.98); }
.landing-hero .title { text-shadow: 0 1px 0 rgba(29,43,58,0.06); }
.subtitle { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 1px 0 rgba(29,43,58,0.04); }
.about-card, .overview-card, .program-card, .value-panel { transition: transform 0.22s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.22s ease; }
.about-card:hover, .overview-card:hover, .program-card:hover { transform: translateY(-2px); box-shadow: 8px 8px 0 var(--ink); }
.teaser-card { position: relative; overflow: hidden; }
.teaser-card::after { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 60% at 85% 15%, rgba(255,230,0,0.08), transparent 60%); pointer-events:none; }
.join-cta { position:relative; overflow:hidden; }
.join-cta::before { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: translateX(-100%); transition: transform 0.9s ease; }
.join-cta:hover::before { transform: translateX(100%); }
.story-input:focus { box-shadow: 4px 4px 0 var(--lime); }
.value-panel:hover { transform: translateY(-1px); }
.story-submit { width:44px; min-width:44px; height:44px; padding:0; }
.story-form { align-items:start; }
.story-form-fields { align-items:start; }
.story-submit,
.story-submit:hover,
.story-submit:active,
.story-submit:focus,
.story-submit:focus-visible { width:44px; min-width:44px; height:44px; padding:0; color:var(--pure-white); background:var(--royal-blue); border-color:var(--royal-blue); box-shadow:4px 4px 0 var(--royal-blue); transform:none; transition:none; }
.social-links { display:flex; align-items:center; gap:10px; }
.social-links a { display:grid; place-items:center; width:40px; height:40px; color:var(--ink); border:2px solid var(--ink); background:#fff; transition:transform 0.16s ease, color 0.16s ease, background 0.16s ease; }
.social-links a:hover { color:var(--pure-white); background:var(--royal-blue); transform:translateY(-2px); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.program-status { padding:4px 7px; border:1px solid currentColor; font-size:10px; font-weight:800; }
.status-upcoming { color:#8a5a00; background:#fff4c2; }
.status-ongoing { color:#075985; background:#dff4ff; }
.status-completed { color:#166534; background:#dcfce7; }

</style>
