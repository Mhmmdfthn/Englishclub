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

onMounted(async () => {
  try {
    stories.value = (await api.stories()).stories
  } catch {
    storyError.value = 'Cerita anggota belum dapat dimuat.'
  }
})

async function submitStory() {
  const name = storyName.value.trim()
  const comment = storyComment.value.trim()
  if (!name || !comment || storySubmitting.value) return

  storySubmitting.value = true
  storyError.value = ''
  try {
    const response = await api.addStory(name, storyBatch.value.trim() || 'Anggota EC UPB', comment)
    stories.value.unshift(response.story)
    storyName.value = ''
    storyBatch.value = ''
    storyComment.value = ''
  } catch {
    storyError.value = 'Cerita belum dapat dikirim. Coba lagi.'
  } finally {
    storySubmitting.value = false
  }
}
</script>

<template>
  <section class="screen landing">
    <!-- HERO UKM -->
    <div class="landing-hero">
      <img class="landing-logo" src="/Logo_ec.jpg" alt="Logo English Club UPB" />
      <p class="eyebrow">UNIT KEGIATAN MAHASISWA — UNIVERSITAS PUTRA BANGSA KEBUMEN</p>
      <h1 class="title">ENGLISH <span class="highlight">CLUB</span></h1>
      <p class="subtitle">Rumah belajar bahasa Inggris yang aktif, menyenangkan, dan aplikatif — terbuka untuk semua prodi & angkatan.</p>
      <div class="hero-stats" aria-label="Info UKM">
        <span><b>2019</b> BERDIRI</span>
        <span><b>150+</b> ANGGOTA</span>
        <span><b>4</b> DIVISI</span>
      </div>
    </div>

    <!-- TENTANG KAMI -->
    <div class="section-title">
      <span class="section-badge">TENTANG KAMI</span>
      <h2>Profil UKM</h2>
      <p class="muted small center">Komunitas mahasiswa yang percaya bahasa Inggris adalah jembatan beasiswa, karir, dan pergaulan global.</p>
    </div>

    <div class="card about-card">
      <div class="about-grid">
        <div class="about-text">
          <h3>Siapa Kami?</h3>
          <p><b>English Club UPB (EC UPB)</b> adalah UKM yang berfokus pada pengembangan bahasa Inggris secara <b>aktif & fun</b>. Dari <i>daily conversation</i> sampai <i>debate & public speaking</i>, semua dibina dengan mentor sebaya + dosen pembina.</p>
          <p>Tidak perlu jago dulu — di sini kita belajar bareng dengan suasana santai, anti kaku, dan penuh games.</p>
          <ul class="check-list">
            <li>Terbuka semua prodi & angkatan</li>
            <li>2× Speaking Corner / minggu</li>
            <li>Pembinaan lomba Speech, Debate, Story Telling</li>
          </ul>
        </div>
        <div class="about-visual">
          <div class="mini-stats">
            <div class="mini-stat"><b>2019</b><span>Berdiri</span></div>
            <div class="mini-stat"><b>150+</b><span>Alumni</span></div>
            <div class="mini-stat"><b>4</b><span>Divisi</span></div>
          </div>
          <div class="quote-box">“From Kebumen to the World — Speak Confidently, Lead Globally.”</div>
        </div>
      </div>
    </div>

    <!-- FEATURED ACTIVITY -->
    <div class="teaser-card">
      <div class="teaser-mark" aria-hidden="true">5×5</div>
      <div class="teaser-copy">
        <span class="teaser-kicker">AKTIVITAS UNGGULAN EC UPB</span>
        <h2>Ayo Main <span>Word Hunt</span></h2>
        <p>Latih vocabulary dengan game swipe buatan EC UPB. Susun kata bahasa Inggris, kumpulkan poin, dan tantang temanmu.</p>
      </div>
      <div class="teaser-actions">
        <button class="btn" @click="emit('goPlay')">Mulai Bermain →</button>
        <button class="btn ghost teaser-secondary" @click="emit('goBoard')">Lihat Klasemen</button>
      </div>
    </div>

    <!-- OVERVIEW -->
    <div class="overview-heading">
      <div>
        <span class="section-badge">OVERVIEW</span>
        <h2>Apa yang Kami Lakukan?</h2>
      </div>
      <p>Belajar tidak berhenti di ruang kelas. Kami menciptakan ruang untuk berlatih, tampil, dan berkembang bersama.</p>
    </div>

    <div class="overview-grid">
      <article class="overview-card">
        <span class="overview-number">01</span>
        <div class="ov-icon">🎯</div>
        <h3>Visi</h3>
        <p>Menjadi UKM bahasa Inggris yang unggul, inklusif, dan berdaya saing nasional.</p>
      </article>
      <article class="overview-card">
        <span class="overview-number">02</span>
        <div class="ov-icon">🚀</div>
        <h3>Misi</h3>
        <ul>
          <li>Tingkatkan speaking & listening</li>
          <li>Bina prestasi lomba</li>
          <li>Ruang praktik harian yang fun</li>
          <li>Jejaring antar kampus</li>
        </ul>
      </article>
      <article class="overview-card">
        <span class="overview-number">03</span>
        <div class="ov-icon">📚</div>
        <h3>Program</h3>
        <ul>
          <li><b>English Fun Day</b> — Word Hunt & vocab battle</li>
          <li><b>Speaking Corner</b></li>
          <li><b>Debate Clinic</b></li>
          <li><b>TOEFL Prep</b></li>
        </ul>
      </article>
    </div>

    <section class="values-section">
      <div class="values-heading">
        <span class="section-badge">CERITA ANGGOTA</span>
        <h2>Suara dari keluarga EC UPB.</h2>
        <p>Bagian ini siap diisi cerita singkat dari anggota komunitas.</p>
      </div>
      <div class="values-mosaic">
        <article v-for="(story, index) in stories" :key="`${story.name}-${index}`" class="value-panel" :class="`value-panel-${['main', 'yellow', 'light', 'outline'][index % 4]}`"><span class="value-index">{{ String(index + 1).padStart(2, '0') }}</span><div><span class="value-word">“{{ story.comment }}”</span></div><span class="story-author">{{ story.name }} · {{ story.batch }}</span></article>
      </div>
      <form class="story-form" @submit.prevent="submitStory">
        <div class="story-form-heading">
          <h3>Bagikan pengalamanmu</h3>
          <p>Ceritamu bisa menginspirasi anggota lain.</p>
        </div>
        <div class="story-form-fields">
          <input v-model="storyName" class="story-input" maxlength="40" placeholder="Nama kamu" aria-label="Nama kamu" required />
          <input v-model="storyBatch" class="story-input" maxlength="30" placeholder="Angkatan / prodi" aria-label="Angkatan atau prodi" />
          <textarea v-model="storyComment" class="story-input story-textarea" maxlength="220" placeholder="Tulis komentarmu tentang English Club..." aria-label="Komentar" required></textarea>
          <button class="btn story-submit" type="submit" :disabled="storySubmitting">{{ storySubmitting ? 'Mengirim...' : 'Kirim Cerita →' }}</button>
        </div>
        <p v-if="storyError" class="story-error">{{ storyError }}</p>
      </form>
    </section>

    <p class="footer-note">© 2026 English Club — Universitas Putra Bangsa Kebumen</p>
  </section>
</template>

<style scoped>
.landing { max-width: 980px; gap: 22px; padding: max(28px,5vh) 24px 40px; }
.landing-hero { width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding: 12px 0 8px; }
.landing-logo { width: 96px; height:auto; border-radius:0; mix-blend-mode:multiply; }
.eyebrow { color: var(--royal-blue); font-size:10.5px; font-weight:800; letter-spacing:2px; }
.title { font-size: clamp(48px,8vw,72px); line-height:.92; letter-spacing:-1px; }
.subtitle { max-width:560px; font-size:15.5px; line-height:1.5; color: var(--text-sub); }
.hero-stats { display:flex; gap:18px; margin-top:8px; color:var(--text-muted); font-size:10px; font-weight:800; letter-spacing:1px; }
.hero-stats span{ display:flex; flex-direction:column; gap:3px; }
.hero-stats b{ color: var(--dark-navy); font-family:'Outfit',sans-serif; font-size:20px; }
.section-title{ width:100%; display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:6px; text-align:center; }
.section-badge{ background:var(--royal-blue); color:#fff; font-size:10px; font-weight:800; letter-spacing:1.8px; padding:4px 10px; border-radius:9999px; }
.section-title h2{ font-size:clamp(22px,4vw,28px); font-weight:900; color:var(--dark-navy); margin:0; }
.section-title p{ max-width:560px; line-height:1.5; }
.about-card{ width:100%; padding:16px 20px; }
.about-grid{ display:grid; grid-template-columns:1.35fr 0.75fr; gap:22px; align-items:start; }
.about-text h3{ font-size:16px; font-weight:900; color:var(--royal-blue); margin-bottom:8px; }
.about-text p{ font-size:14px; line-height:1.65; color:var(--text-sub); margin-bottom:10px; }
.check-list{ list-style:none; padding:0; display:flex; flex-direction:column; gap:6px; }
.check-list li{ font-size:13px; font-weight:600; padding-left:22px; position:relative; color:var(--dark-navy); }
.check-list li::before{ content:'✓'; position:absolute; left:0; color:var(--royal-blue); font-weight:900; }
.about-visual{ display:flex; flex-direction:column; gap:14px; }
.mini-stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.mini-stat{ background:#F4F8FC; border:1px solid rgba(29,43,58,.08); border-radius:12px; padding:12px 6px; display:flex; flex-direction:column; align-items:center; text-align:center; }
.mini-stat b{ font-family:'Outfit',sans-serif; font-size:18px; font-weight:900; color:var(--royal-blue); }
.mini-stat span{ font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; }
.quote-box{ background:linear-gradient(135deg,var(--royal-blue),var(--royal-blue-light)); color:#fff; border-radius:14px; padding:14px 16px; font-size:13px; font-weight:700; font-style:italic; text-align:center; }
.overview-heading{ width:100%; display:flex; align-items:end; justify-content:space-between; gap:28px; padding-bottom:18px; border-bottom:1px solid rgba(11,86,155,.2); }
.overview-heading h2{ font-size:clamp(24px,4vw,34px); font-weight:900; color:var(--dark-navy); margin-top:10px; }
.overview-heading p{ max-width:340px; color:var(--text-muted); font-size:13.5px; line-height:1.55; text-align:right; }
.overview-grid{ width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:0; border-bottom:1px solid rgba(11,86,155,.2); }
.overview-card{ position:relative; min-height:230px; padding:24px 20px; display:flex; flex-direction:column; gap:10px; }
.overview-card + .overview-card{ border-left:1px solid rgba(11,86,155,.16); }
.overview-number{ color:var(--royal-blue); font-family:'Outfit',sans-serif; font-size:12px; font-weight:900; letter-spacing:1px; }
.ov-icon{ width:38px; height:38px; display:grid; place-items:center; background:rgba(255,230,0,.5); border-radius:10px; font-size:18px; }
.overview-card h3{ font-size:15px; font-weight:900; color:var(--dark-navy); }
.overview-card p, .overview-card li{ font-size:13.5px; line-height:1.6; color:var(--text-sub); }
.overview-card ul{ padding-left:16px; display:flex; flex-direction:column; gap:4px; }
.values-section{ width:100%; display:grid; grid-template-columns:minmax(190px,.7fr) minmax(0,1.7fr); gap:28px; align-items:stretch; padding:10px 0 4px; }
.values-heading{ display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:10px; }
.values-heading h2{ font-size:clamp(24px,4vw,34px); line-height:1.05; font-weight:900; color:var(--dark-navy); }
.values-heading p{ color:var(--text-muted); font-size:13.5px; line-height:1.55; max-width:220px; }
.values-mosaic{ display:grid; grid-template-columns:1.15fr .85fr; grid-auto-rows:minmax(140px,auto); gap:10px; min-height:300px; }
.value-panel{ position:relative; display:flex; flex-direction:column; justify-content:space-between; gap:22px; min-height:140px; padding:18px; overflow:hidden; border-radius:14px; }
.value-panel::after{ content:''; position:absolute; inset:0; opacity:.18; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px); background-size:28px 28px; mask-image:linear-gradient(to bottom,black,transparent 80%); }
.value-panel > *{ position:relative; z-index:1; }
.value-panel-main{ grid-row:span 2; background:var(--dark-navy); color:#fff; }
.value-panel-yellow{ background:var(--vibrant-yellow); color:var(--dark-navy); }
.value-panel-yellow::after{ background-image:linear-gradient(rgba(29,43,58,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(29,43,58,.35) 1px,transparent 1px); }
.value-panel-light{ background:#E9F2F9; color:var(--dark-navy); }
.value-panel-outline{ grid-column:2; background:transparent; color:var(--dark-navy); border:1px solid rgba(11,86,155,.3); }
.value-index{ font-family:'Outfit',sans-serif; font-size:11px; font-weight:900; letter-spacing:1.2px; opacity:.7; }
.value-word{ display:block; font-family:'Outfit',sans-serif; font-size:clamp(22px,3vw,32px); font-weight:900; line-height:1; }
.value-panel p{ max-width:250px; margin-top:8px; font-size:12.5px; line-height:1.5; opacity:.8; }
.story-placeholder{ font-style:italic; }
.story-author{ position:relative; z-index:1; font-size:11px; font-weight:800; opacity:.65; }
.story-form{ display:grid; grid-template-columns:minmax(190px,.7fr) minmax(0,1.7fr); gap:28px; align-items:center; padding-top:20px; border-top:1px solid rgba(11,86,155,.18); }
.story-form-heading h3{ color:var(--dark-navy); font-size:18px; font-weight:900; }
.story-form-heading p{ color:var(--text-muted); font-size:12.5px; line-height:1.5; margin-top:5px; }
.story-form-fields{ display:grid; grid-template-columns:1fr 1fr auto; gap:8px; }
.story-input{ width:100%; border:1px solid rgba(29,43,58,.16); border-radius:8px; padding:10px 12px; background:rgba(255,255,255,.72); color:var(--dark-navy); font:inherit; font-size:12px; outline:none; }
.story-input:focus{ border-color:var(--royal-blue); box-shadow:0 0 0 3px rgba(11,86,155,.1); }
.story-textarea{ grid-column:1 / 3; min-height:58px; resize:vertical; }
.story-submit{ padding:10px 16px; font-size:12px; align-self:stretch; }
.story-error{ grid-column:1 / -1; color:var(--bad); font-size:12px; font-weight:700; }
.teaser-card{ width:100%; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:22px; padding:24px 28px; margin:8px 0; background:linear-gradient(105deg,var(--dark-navy),var(--royal-blue)); color:#fff; border-radius:18px; box-shadow:0 16px 32px rgba(11,86,155,.2); }
.teaser-mark{ display:grid; place-items:center; width:76px; aspect-ratio:1; border:2px solid var(--vibrant-yellow); border-radius:14px; color:var(--vibrant-yellow); font-family:'Outfit',sans-serif; font-size:20px; font-weight:900; transform:rotate(-6deg); }
.teaser-copy{ min-width:0; }
.teaser-kicker{ color:var(--vibrant-yellow); font-size:10px; font-weight:800; letter-spacing:1.5px; }
.teaser-copy h2{ font-size:clamp(22px,4vw,30px); font-weight:900; margin:4px 0 5px; color:#fff; }
.teaser-copy h2 span{ color:var(--vibrant-yellow); }
.teaser-copy p{ max-width:480px; color:rgba(255,255,255,.78); font-size:13.5px; line-height:1.5; }
.teaser-actions{ display:flex; flex-direction:column; gap:8px; flex-shrink:0; }
.teaser-actions .btn{ white-space:nowrap; padding:11px 18px; font-size:13px; }
.teaser-actions .btn.ghost{ color:#fff; border-color:rgba(255,255,255,.35); }
.teaser-actions .btn.ghost:hover{ background:rgba(255,255,255,.12); border-color:#fff; color:#fff; }
.footer-note{ font-size:11px; color:var(--text-muted); text-align:center; }
@media (max-width:680px){
  .landing{ padding: max(24px, env(safe-area-inset-top)) 18px 32px; gap:20px; }
  .landing-hero{ gap:12px; padding:18px 0 12px; }
  .landing-logo{ width:112px; }
  .eyebrow{ max-width:330px; font-size:9.5px; line-height:1.45; }
  .landing-hero .title{ font-size:clamp(52px,14vw,64px); }
  .landing-hero .subtitle{ max-width:330px; font-size:16px; line-height:1.55; }
  .hero-stats{ gap:20px; margin-top:10px; }
  .hero-stats b{ font-size:22px; }
  .about-grid{ grid-template-columns:1fr; gap:16px; }
  .about-text h3, .about-text p{ text-align:center; }
  .overview-grid{
    display:flex;
    gap:0;
    overflow-x:auto;
    scroll-snap-type:x mandatory;
    overscroll-behavior-x:contain;
    padding:0 0 10px;
    margin:0;
  }
  .overview-heading{ align-items:center; flex-direction:column; gap:10px; text-align:center; }
  .overview-heading p{ text-align:center; max-width:320px; }
  .overview-card{
    flex:0 0 100%;
    min-height:0;
    text-align:center;
    align-items:center;
    padding:20px 18px;
    scroll-snap-align:center;
  }
  .overview-card ul{ text-align:left; align-self:stretch; }
  .overview-card + .overview-card{ border-left:0; border-top:1px solid rgba(11,86,155,.16); }
  .values-section{ grid-template-columns:1fr; gap:18px; }
  .values-heading{ align-items:center; text-align:center; }
  .values-heading p{ max-width:310px; }
  .values-mosaic{ min-height:420px; }
  .value-panel{ padding:16px 14px; }
  .story-form{ grid-template-columns:1fr; gap:12px; text-align:center; }
  .story-form-fields{ grid-template-columns:1fr 1fr; }
  .story-textarea{ grid-column:1 / -1; }
  .story-submit{ grid-column:1 / -1; min-height:44px; }
  .teaser-card{ grid-template-columns:1fr; text-align:center; justify-items:center; padding:24px 18px; gap:14px; }
  .teaser-copy p{ max-width:320px; }
  .teaser-actions{ width:100%; }
  .teaser-actions .btn{ width:100%; justify-content:center; }
}
</style>
