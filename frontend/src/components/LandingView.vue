<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['goPlay', 'goBoard'])
const storyName = ref('')
const storyBatch = ref('')
const storyComment = ref('')
const stories = ref([])
const storyError = ref('')
const storySubmitting = ref(false)
const batchOptions = ['2026 / Ilmu Komputer', '2026 / Manajemen', '2026 / Akuntansi', '2026 / Bisnis Digital', '2026 / Sains Data', '2026 / Agribisnis']

onMounted(async () => {
  try { stories.value = (await api.stories()).stories } catch { storyError.value = 'Cerita anggota belum dapat dimuat.' }
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
</script>

<template>
  <section id="top" class="screen landing">
    <div class="landing-hero">
      <nav class="landing-nav" aria-label="Navigasi utama">
        <a class="nav-brand" href="#top" aria-label="Kembali ke bagian atas"><img src="/Logo_ec.jpg" alt="Logo English Club UPB" /></a>
        <a href="#profil">Profil</a>
        <a href="#program">Program</a>
        <a href="#cerita">Cerita Anggota</a>
        <div class="nav-actions">
          <button class="nav-button nav-board" type="button" @click="goBoard">Klasemen</button>
          <button class="nav-button nav-play" type="button" @click="goPlay">Main Word Hunt</button>
        </div>
      </nav>
      <p class="eyebrow">UNIT KEGIATAN MAHASISWA, UNIVERSITAS PUTRA BANGSA KEBUMEN</p>
      <h1 class="title">ENGLISH <span class="highlight">CLUB</span></h1>
      <p class="subtitle">Rumah belajar bahasa Inggris yang aktif, menyenangkan, dan aplikatif serta terbuka untuk semua prodi dan angkatan.</p>
      <div class="hero-stats"><span><b>2019</b> BERDIRI</span><span><b>150+</b> ANGGOTA</span><span><b>4</b> DIVISI</span><span><b>2x</b> MINGGUAN</span><span><b>5x5</b> WORD HUNT</span></div>
    </div>

    <div id="profil" class="section-title"><span class="section-badge">TENTANG KAMI</span><h2>Profil UKM</h2><p>Komunitas mahasiswa yang percaya bahasa Inggris adalah jembatan beasiswa, karir, dan pergaulan global.</p></div>
    <div class="card about-card"><div class="about-grid"><div class="about-text"><h3>Siapa Kami?</h3><p><b>English Club UPB</b> adalah UKM yang berfokus pada pengembangan bahasa Inggris secara aktif dan menyenangkan. Dari <i>daily conversation</i> sampai <i>debate</i> dan <i>public speaking</i>, semua dibina dengan mentor sebaya dan dosen pembina.</p><p>Tidak perlu jago dulu, di sini kita belajar bareng dengan suasana santai, anti kaku, dan penuh games.</p><ul class="check-list"><li>Terbuka semua prodi dan angkatan</li><li>2x Speaking Corner per minggu</li><li>Pembinaan lomba Speech, Debate, Story Telling</li></ul></div><div class="about-visual"><div class="mini-stats"><div class="mini-stat"><b>2019</b><span>Berdiri</span></div><div class="mini-stat"><b>150+</b><span>Alumni</span></div><div class="mini-stat"><b>4</b><span>Divisi</span></div></div><div class="quote-box">From Kebumen to the World, Speak Confidently, Lead Globally.</div></div></div></div>

    <div class="teaser-card"><div class="teaser-mark">5x5</div><div class="teaser-copy"><span class="teaser-kicker">AKTIVITAS UNGGULAN EC UPB</span><h2>Ayo Main <span>Word Hunt</span></h2><p>Latih vocabulary dengan game swipe buatan EC UPB. Susun kata bahasa Inggris, kumpulkan poin, dan tantang temanmu.</p></div><div class="teaser-actions"><button class="btn" type="button" @click="goPlay">Mulai Bermain</button><button class="btn ghost" type="button" @click="goBoard">Lihat Klasemen</button></div></div>

    <div id="program" class="overview-heading"><div><span class="section-badge">OVERVIEW</span><h2>Apa yang Kami Lakukan?</h2></div><p>Belajar tidak berhenti di ruang kelas. Kami menciptakan ruang untuk berlatih, tampil, dan berkembang bersama.</p></div>
    <div class="overview-grid"><article class="overview-card"><div class="ov-icon">01</div><h3>Visi</h3><p>Menjadi UKM bahasa Inggris yang unggul, inklusif, dan berdaya saing nasional.</p></article><article class="overview-card"><div class="ov-icon">02</div><h3>Misi</h3><ul><li>Tingkatkan speaking dan listening</li><li>Bina prestasi lomba</li><li>Ruang praktik harian yang fun</li><li>Jejaring antar kampus</li></ul></article><article class="overview-card"><div class="ov-icon">03</div><h3>Program</h3><ul><li><b>English Fun Day</b>, Word Hunt dan vocab battle</li><li><b>Speaking Corner</b></li><li><b>Debate Clinic</b></li><li><b>TOEFL Prep</b></li></ul></article></div>

    <section id="cerita" class="values-section"><div class="values-heading"><span class="section-badge">CERITA ANGGOTA</span><h2>Suara dari Peserta Prospek.</h2><p>Bagian ini siap diisi cerita singkat dari anggota komunitas.</p></div><div class="values-mosaic"><article v-for="(story, index) in stories" :key="`${story.name}-${index}`" class="value-panel" :class="`value-panel-${['main', 'yellow', 'light', 'outline'][index % 4]}`"><span class="value-index">{{ String(index + 1).padStart(2, '0') }}</span><span class="value-word">{{ story.comment }}</span><span class="story-author">{{ story.name }} · {{ story.batch }}</span></article></div><form class="story-form" @submit.prevent="submitStory"><div class="story-form-heading"><h3>Bagikan pengalamanmu</h3><p>Ceritamu bisa menginspirasi anggota lain.</p></div><div class="story-form-fields"><input v-model="storyName" class="story-input" maxlength="40" placeholder="Nama kamu" required /><select v-model="storyBatch" class="story-input"><option value="">Pilih angkatan / prodi</option><option v-for="option in batchOptions" :key="option" :value="option">{{ option }}</option></select><textarea v-model="storyComment" class="story-input story-textarea" maxlength="220" placeholder="Tulis komentarmu tentang English Club..." required></textarea><button class="btn story-submit" type="submit" :disabled="storySubmitting">{{ storySubmitting ? 'Mengirim...' : 'Kirim Cerita' }}</button></div><p v-if="storyError" class="story-error">{{ storyError }}</p></form></section>

    <footer class="site-footer"><div><b>English Club UPB</b><span>Universitas Putra Bangsa Kebumen</span></div><div class="social-links"><a href="https://www.instagram.com/englishclubupb/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.tiktok.com/@englishclubupb" target="_blank" rel="noreferrer">TikTok</a></div><p>© 2026 English Club, Universitas Putra Bangsa Kebumen</p></footer>
  </section>
</template>

<style scoped>
.hero-stats { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); width:100%; max-width:840px; }
.hero-stats span { min-width:0; }
.landing-hero { display:flex; width:100%; flex-direction:column; align-items:flex-start; }
.landing-nav { font-family:'Plus Jakarta Sans', sans-serif; }
.nav-button { font-family:'Plus Jakarta Sans', sans-serif; }
.landing { --ink:var(--dark-navy); --paper:var(--pure-white); --lime:var(--royal-blue); --green:var(--vibrant-yellow); max-width:1200px; gap:0; padding:0 clamp(18px,4vw,52px) 52px; color:var(--ink); }
.landing::before { content:''; position:fixed; inset:0; z-index:-1; background-color:var(--paper); background-image:radial-gradient(rgba(29,43,58,.13) 1px, transparent 1px); background-size:16px 16px; }
.landing-hero { position:relative; display:flex; width:100%; align-items:flex-start; min-height:min(620px,72vh); padding:0 0 clamp(52px,7vw,94px); text-align:left; border-bottom:4px solid var(--ink); row-gap:24px; }
.landing-nav { position:fixed; top:0; left:0; right:0; width:100%; margin:0; display:flex; align-items:center; gap:24px; min-height:64px; padding:10px max(14px, calc((100vw - 1100px) / 2)); background:var(--pure-white); border-bottom:3px solid var(--ink); box-shadow:0 4px 0 var(--lime); z-index:20; font-family:'Plus Jakarta Sans', sans-serif; }
.nav-brand { display:flex; flex:0 0 auto; align-items:center; width:42px; height:42px; margin-right:6px; }.nav-brand img { display:block; width:36px; height:36px; object-fit:contain; mix-blend-mode:multiply; }.landing-nav > a { color:var(--ink); font-size:13px; font-weight:700; text-decoration:none; }.landing-nav > a:hover { color:var(--royal-blue); }.nav-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }.nav-button { padding:9px 13px; color:var(--ink); background:transparent; border:2px solid var(--ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:800; cursor:pointer; }.nav-button:hover { transform:translateY(-1px); }.nav-play { color:var(--pure-white); background:var(--lime); box-shadow:3px 3px 0 var(--ink); }
.eyebrow,.section-badge,.teaser-kicker,.overview-number { font-family:'Outfit', sans-serif; font-weight:900; letter-spacing:.14em; }.eyebrow { width:fit-content; margin-bottom:8px; padding:7px 12px; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-size:11px; }.landing-hero .title { max-width:900px; font-size:clamp(52px,10vw,132px); line-height:.84; letter-spacing:-.075em; text-align:left; color:var(--ink); }.title .highlight { color:var(--royal-blue); }.landing-hero .subtitle { max-width:590px; margin-top:18px; color:var(--ink); font-size:clamp(16px,2vw,21px); line-height:1.5; }.hero-stats { display:flex; margin-top:36px; border:2px solid var(--ink); background:#fff; box-shadow:5px 5px 0 var(--ink); }.hero-stats span { min-width:116px; padding:10px 16px; border-right:2px solid var(--ink); font-size:10px; font-weight:800; }.hero-stats span:last-child { border-right:0; }.hero-stats b { display:block; font-size:24px; }
.section-title { width:100%; display:flex; flex-direction:column; align-items:flex-start; gap:8px; padding:72px 0 28px; text-align:left; }.section-badge { padding:6px 11px; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); box-shadow:3px 3px 0 var(--ink); font-size:10px; }.section-title h2,.overview-heading h2,.values-heading h2 { color:var(--ink); }.section-title p { max-width:680px; }.about-card { width:100%; padding:0; overflow:visible; background:#fff; border:3px solid var(--ink); border-radius:0; box-shadow:7px 7px 0 var(--ink); }.about-grid { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(300px,.85fr); }.about-text { padding:clamp(22px,4vw,42px); }.about-text h3 { font-size:22px; }.about-text p,.check-list li { font-size:15px; line-height:1.6; }.check-list { padding-left:18px; }.about-visual { padding:clamp(22px,3vw,36px); border-left:3px solid var(--ink); background:var(--paper); }.mini-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.mini-stat { padding:12px 6px; text-align:center; border:2px solid var(--ink); background:#fff; }.mini-stat b,.mini-stat span { display:block; }.quote-box { margin-top:28px; padding:16px; background:var(--royal-blue); color:var(--pure-white); border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-weight:700; text-align:center; }
.teaser-card { width:100%; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:22px; margin:74px 0 0; padding:clamp(22px,4vw,38px); color:#fff; background:var(--ink); border:3px solid var(--ink); box-shadow:7px 7px 0 var(--green); }.teaser-mark { display:grid; place-items:center; width:76px; aspect-ratio:1; color:var(--vibrant-yellow); border:2px solid var(--vibrant-yellow); font-size:20px; font-weight:900; }.teaser-kicker,.teaser-copy h2 span { color:var(--vibrant-yellow); }.teaser-copy h2 { color:#fff; }.teaser-copy p { max-width:480px; font-size:13.5px; line-height:1.5; }.teaser-actions { display:flex; flex-direction:column; gap:8px; }.teaser-actions .btn { white-space:nowrap; padding:11px 18px; border:2px solid #fff; border-radius:0; box-shadow:3px 3px 0 #000; font-size:13px; }.teaser-actions .btn.ghost { color:#fff; }
.overview-heading { width:100%; display:flex; align-items:end; justify-content:space-between; gap:28px; margin-top:86px; padding-bottom:20px; border-bottom:3px solid var(--ink); }.overview-heading p { max-width:340px; text-align:right; line-height:1.55; }.overview-grid { width:100%; display:grid; grid-template-columns:repeat(3,1fr); border-bottom:3px solid var(--ink); }.overview-card { min-height:260px; padding:28px; }.overview-card + .overview-card { border-left:2px solid var(--ink); }.ov-icon { display:grid; place-items:center; width:42px; height:42px; margin:12px 0; color:var(--pure-white); background:var(--lime); border:2px solid var(--ink); font-weight:900; }.overview-card p,.overview-card li { line-height:1.6; }.overview-card ul { padding-left:18px; }
.values-section { width:100%; display:grid; grid-template-columns:minmax(250px,.7fr) minmax(0,1.7fr); gap:28px; padding:86px 0 0; }.values-heading { display:flex; flex-direction:column; gap:10px; }.values-mosaic { display:grid; grid-template-columns:1.15fr .85fr; grid-auto-rows:minmax(140px,auto); gap:14px; }.value-panel { display:flex; flex-direction:column; justify-content:space-between; min-height:140px; padding:18px; border:3px solid var(--ink); box-shadow:4px 4px 0 var(--ink); }.value-panel-main { grid-row:span 2; color:#fff; background:var(--ink); }.value-panel-yellow { background:var(--lime); }.value-panel-light { background:#fff; }.value-panel-outline { grid-column:2; background:var(--paper); }.value-word { font-size:clamp(18px,2.5vw,30px); font-weight:900; line-height:1.05; }.story-author { font-size:11px; font-weight:800; }.story-form { grid-column:1 / -1; display:grid; grid-template-columns:minmax(250px,.7fr) minmax(0,1.7fr); gap:28px; margin-top:30px; padding:30px 0 0; border-top:3px solid var(--ink); }.story-form-heading h3 { font-size:18px; }.story-form-heading p { font-size:12.5px; }.story-form-fields { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.story-input { width:100%; padding:10px 12px; color:var(--ink); background:#fff; border:2px solid var(--ink); font:inherit; font-size:14px; }.story-textarea { grid-column:1 / -1; min-height:120px; resize:vertical; }.story-submit { grid-column:1 / -1; width:fit-content; padding:12px 22px; border:2px solid var(--ink); border-radius:0; background:var(--lime); box-shadow:4px 4px 0 var(--ink); font-size:12px; }.story-error { grid-column:1 / -1; color:var(--bad); font-size:12px; }.site-footer { width:100%; display:grid; grid-template-columns:1fr auto; gap:14px 28px; margin-top:70px; padding:20px 0 0; border-top:2px solid var(--ink); }.site-footer > div:first-child { display:flex; flex-direction:column; gap:4px; }.site-footer b { font-size:16px; }.site-footer span,.site-footer p { font-size:11px; }.social-links { display:flex; gap:10px; }.social-links a { padding:8px 11px; color:var(--ink); background:var(--lime); border:2px solid var(--ink); box-shadow:3px 3px 0 var(--ink); font-size:10px; font-weight:900; text-decoration:none; }.site-footer p { grid-column:1 / -1; }
.landing-hero { padding-top:98px; }
.section-title, .overview-heading, .values-section { scroll-margin-top:86px; }
@media (max-width:680px) { .landing { padding:0 18px 32px; }.landing-nav { gap:10px; min-height:58px; padding:8px 10px; }.nav-brand { width:38px; height:38px; margin-right:auto; }.nav-brand img { width:31px; height:31px; }.landing-nav > a:not(.nav-brand) { display:none; }.nav-button { padding:7px 8px; font-size:12px; }.landing-hero { min-height:520px; padding-top:82px; }.landing-hero .title { font-size:clamp(54px,17vw,82px); }.hero-stats { width:100%; }.hero-stats span { min-width:0; flex:1; padding:9px 6px; }.about-grid,.overview-grid,.values-section,.story-form { grid-template-columns:1fr; }.about-visual { border-top:3px solid var(--ink); border-left:0; }.teaser-card { grid-template-columns:1fr; text-align:center; justify-items:center; margin-top:56px; }.teaser-actions { width:100%; }.teaser-actions .btn { width:100%; }.overview-heading { align-items:center; flex-direction:column; margin-top:60px; text-align:center; }.overview-heading p { text-align:center; }.overview-card + .overview-card { border-top:2px solid var(--ink); border-left:0; }.values-section { padding-top:60px; }.story-form-fields { grid-template-columns:1fr; }.story-textarea,.story-submit { grid-column:1; }.story-submit { width:100%; }.site-footer { grid-template-columns:1fr; margin-top:48px; }.site-footer p { grid-column:auto; } }
.hero-stats { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); width:100%; max-width:840px; }
.hero-stats span { flex:1; min-width:0; }
.landing-hero { display:flex; width:100%; align-items:flex-start; }
.landing-nav, .nav-button { font-family:'Plus Jakarta Sans', sans-serif; }
.overview-heading > div { display:flex; flex-direction:column; gap:14px; }
@media (max-width:680px) {
  .hero-stats { grid-template-columns:repeat(2, minmax(0, 1fr)); }
}
</style>
