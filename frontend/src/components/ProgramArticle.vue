<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'

const route = useRoute()
const router = useRouter()

const program = ref(null)
const loading = ref(true)
const error = ref('')
const currentPhoto = ref(0)
const mobileOpen = ref(false)
const imageLoading = ref(true)
const lightboxOpen = ref(false)

const photos = computed(() => {
  const p = program.value
  if (!p) return []
  if (p.photos?.length) return p.photos
  if (p.imageUrl) return [p.imageUrl]
  return ['/Logo_ec.jpg']
})

function statusLabel() {
  const s = program.value?.status
  return s === 'completed' ? 'Selesai' : s === 'ongoing' ? 'Sedang berlangsung' : 'Akan datang'
}

function next() { if (photos.value.length) currentPhoto.value = (currentPhoto.value + 1) % photos.value.length }
function prev() { if (photos.value.length) currentPhoto.value = (currentPhoto.value - 1 + photos.value.length) % photos.value.length }

function toggleMobile() { mobileOpen.value = !mobileOpen.value }
function closeMobile() { mobileOpen.value = false }

function goBack() { closeMobile(); router.push('/') }
function goSection(id) {
  closeMobile()
  router.push('/#' + id)
}

function onImageLoad() { imageLoading.value = false }
function onImageError() { imageLoading.value = false }
function openLightbox() { if (photos.value.length) lightboxOpen.value = true }
function closeLightbox() { lightboxOpen.value = false }
function lightboxPrev(e) { e.stopPropagation(); prev(); }
function lightboxNext(e) { e.stopPropagation(); next(); }

async function load(id) {
  loading.value = true
  error.value = ''
  program.value = null
  currentPhoto.value = 0
  try {
    const data = await api.prokerDetail(id)
    program.value = data.proker
  } catch (e) {
    error.value = e && e.status === 404 ? 'Program tidak ditemukan.' : 'Program belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (route.params.id) load(route.params.id) })
watch(() => route.params.id, (id) => { if (id) load(id) })
watch(currentPhoto, () => { imageLoading.value = true })
</script>

<template>
  <section class="program-screen">
    <nav class="article-nav" aria-label="Navigasi utama">
      <a class="nav-brand" href="#top" aria-label="Kembali ke beranda" @click.prevent="goBack"><img src="/Logo_ec.jpg" alt="Logo English Club UPB" /></a>
      <a class="nav-link" href="#profil" @click.prevent="goSection('profil')">Profil</a>
      <a class="nav-link" href="#program" @click.prevent="goSection('program')">Program</a>
      <a class="nav-link" href="#cerita" @click.prevent="goSection('cerita')">Kesan Pengunjung</a>
      <div class="nav-actions">
        <button class="nav-button" type="button" @click="goBack">Kembali</button>
      </div>
      <button class="hamburger" type="button" aria-label="Buka menu" :aria-expanded="mobileOpen" @click="toggleMobile">
        <span class="ham-line" :class="{ open: mobileOpen }"></span>
        <span class="ham-line" :class="{ open: mobileOpen }"></span>
        <span class="ham-line" :class="{ open: mobileOpen }"></span>
      </button>
      <button class="nav-close" type="button" aria-label="Kembali" @click="goBack"><span class="material-symbols-outlined">close</span></button>
    </nav>

    <Transition name="mobile-drawer">
      <div v-if="mobileOpen" class="mobile-drawer" @click.self="closeMobile">
        <div class="mobile-panel">
          <a href="#profil" @click.prevent="goSection('profil')">Profil</a>
          <a href="#program" @click.prevent="goSection('program')">Program</a>
          <a href="#cerita" @click.prevent="goSection('cerita')">Kesan Pengunjung</a>
          <button class="btn" type="button" @click="goBack">Kembali</button>
        </div>
      </div>
    </Transition>

    <div class="article-body-wrap">
      <div v-if="loading" class="article-state">
        <p>Memuat program...</p>
      </div>

      <div v-else-if="error" class="article-state">
        <p>{{ error }}</p>
        <button class="btn ghost" type="button" @click="goBack">Kembali ke Beranda</button>
      </div>

      <article v-else-if="program" class="article-content">
        <header class="article-head">
          <span class="article-kicker">{{ program.id }}</span>
          <h1 class="article-title">{{ program.title }}</h1>
          <div class="article-meta">
            <span class="meta-item"><span class="material-symbols-outlined loc-icon">calendar_month</span>{{ program.date || 'Tanggal Menyusul' }} ({{ statusLabel() }})</span>
            <span class="meta-item"><span class="material-symbols-outlined loc-icon">location_on</span>Universitas Putra Bangsa</span>
          </div>
        </header>

        <div class="article-hero">
          <div v-if="imageLoading" class="article-cover-skeleton" aria-hidden="true"></div>
          <img :src="photos[currentPhoto]" :alt="program.title" class="article-cover" :class="{ 'img-loaded': !imageLoading }" width="820" height="461" loading="eager" @load="onImageLoad" @error="onImageError" @click="openLightbox" />
          <div v-if="photos.length > 1" class="article-gallery-nav">
            <button class="gallery-btn" type="button" @click="prev" aria-label="Foto sebelumnya">‹</button>
            <span class="gallery-count">{{ currentPhoto + 1 }} / {{ photos.length }}</span>
            <button class="gallery-btn" type="button" @click="next" aria-label="Foto berikutnya">›</button>
          </div>
          <span v-if="photos.length > 1" class="article-zoom-hint">Klik foto untuk perbesar</span>
        </div>

        <div class="article-body">
          <div class="article-desc" v-html="program.description || program.caption || ''"></div>
          <div v-if="photos.length > 1" class="article-thumbs">
            <button v-for="(ph, i) in photos" :key="i" class="thumb" :class="{ active: i === currentPhoto }" type="button" @click="currentPhoto = i"><img :src="ph" :alt="'Foto ' + (i + 1) + ' ' + program.title" width="80" height="80" loading="lazy" /></button>
          </div>
        </div>
      </article>
    </div>

    <Transition name="lightbox-fade">
      <div v-if="lightboxOpen" class="lightbox" role="dialog" aria-modal="true" aria-label="Pratinjau foto" @click.self="closeLightbox">
        <button class="lightbox-close" type="button" aria-label="Tutup pratinjau" @click="closeLightbox">✕</button>
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Foto sebelumnya" @click="lightboxPrev">‹</button>
        <img :src="photos[currentPhoto]" :alt="program.title" class="lightbox-img" @click.stop />
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Foto berikutnya" @click="lightboxNext">›</button>
        <span class="lightbox-count">{{ currentPhoto + 1 }} / {{ photos.length }}</span>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.program-screen {
  --ink: var(--dark-navy);
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--ink);
  background: var(--pure-white);
}
.article-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 64px;
  padding: 10px max(14px, calc((100vw - 1100px) / 2));
  background: var(--pure-white);
  border-bottom: 3px solid var(--ink);
  box-shadow: 0 4px 0 var(--royal-blue);
  z-index: 20;
}
.nav-brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  width: 42px;
  height: 42px;
  margin-right: 6px;
}
.nav-brand img {
  display: block;
  width: 36px;
  height: 36px;
  object-fit: contain;
  mix-blend-mode: multiply;
}
.article-nav > a,
.mobile-panel a {
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.article-nav > a:hover { color: var(--royal-blue); }
.nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.nav-button {
  padding: 9px 16px;
  color: var(--pure-white);
  background: var(--royal-blue);
  border: 2px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  min-height: 44px;
}
.nav-button:hover { background: var(--royal-blue-light); }
.nav-close {
  display: none;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--ink);
  background: #fff;
  border: 2px solid var(--ink);
  cursor: pointer;
}
.nav-close .material-symbols-outlined { font-size: 24px; }
.nav-close:hover { color: var(--pure-white); background: var(--royal-blue); }
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 8px;
  background: #fff;
  border: 2px solid var(--ink);
  cursor: pointer;
}
.ham-line { display: block; width: 100%; height: 3px; background: var(--ink); transition: transform 0.2s ease, opacity 0.2s ease; }
.ham-line.open:nth-child(1) { transform: translateY(8px) rotate(45deg); }
.ham-line.open:nth-child(2) { opacity: 0; }
.ham-line.open:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
.mobile-drawer { position: fixed; inset: 0; z-index: 19; background: rgba(29,43,58,0.45); backdrop-filter: blur(4px); display: grid; place-items: start center; padding-top: 76px; }
.mobile-panel { width: min(92%, 360px); display: flex; flex-direction: column; gap: 10px; padding: 18px; background: #fff; border: 3px solid var(--ink); box-shadow: 8px 8px 0 var(--ink); }
.mobile-panel a { display: block; padding: 14px 12px; font-weight: 800; font-size: 15px; text-align: center; border: 2px solid var(--ink); background: #fff; }
.mobile-panel .btn { width: 100%; justify-content: center; min-height: 48px; }
.mobile-drawer-enter-active, .mobile-drawer-leave-active { transition: opacity 0.22s ease; }
.mobile-drawer-enter-from, .mobile-drawer-leave-to { opacity: 0; }

.article-body-wrap {
  width: 100%;
  max-width: 820px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 92px clamp(18px, 4vw, 40px) 52px;
}
.article-state {
  width: 100%;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  color: var(--ink);
  font-weight: 700;
}
.article-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.article-head { text-align: left; margin-bottom: 26px; }
.article-kicker { color: var(--royal-blue); font-size: 11px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
.article-title {
  margin: 10px 0 16px;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(30px, 5vw, 48px);
  font-weight: 900;
  line-height: 1.06;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.article-meta { display: flex; flex-wrap: wrap; gap: 0; }
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--royal-blue);
  font-size: 13px;
  font-weight: 800;
}
.meta-item + .meta-item { margin-left: 12px; }
.meta-item + .meta-item::before {
  content: "";
  width: 3px;
  height: 3px;
  margin-right: 12px;
  border-radius: 50%;
  background: rgba(29,43,58,0.35);
}
.loc-icon {
  font-size: 17px;
  vertical-align: middle;
}
.article-hero {
  position: relative;
  width: 100%;
  max-width: 820px;
  aspect-ratio: 16 / 9;
  margin-bottom: 28px;
  overflow: hidden;
  background: var(--light-gray);
}
.article-cover { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; cursor: zoom-in; }
.article-cover-skeleton {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(100deg, #eef1f4 30%, #f7f9fb 50%, #eef1f4 70%);
  background-size: 200% 100%;
  animation: article-skeleton-shimmer 1.4s ease-in-out infinite;
}
.img-loaded { opacity: 1; transition: opacity 0.3s ease; }
.article-cover:not(.img-loaded) { opacity: 0; }
@keyframes article-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.article-gallery-nav { position: absolute; top: 12px; right: 12px; left: 12px; display: flex; align-items: center; justify-content: space-between; }
.article-zoom-hint {
  position: absolute;
  inset: auto 12px 12px auto;
  padding: 4px 10px;
  background: rgba(29, 43, 58, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  pointer-events: none;
}
.gallery-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(29,43,58,0.18);
  border-radius: 50%;
  font-size: 19px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(29,43,58,0.15);
  backdrop-filter: blur(4px);
  transition: background 0.15s ease, transform 0.15s ease;
}
.gallery-btn:hover { background: #fff; transform: scale(1.06); }
.gallery-count { padding: 4px 10px; background: rgba(29, 43, 58, 0.72); color: #fff; font-size: 11px; font-weight: 800; border-radius: 999px; }
.article-body { width: 100%; text-align: left; }
.article-desc {
  margin: 0;
  font-size: clamp(16px, 2vw, 18px);
  line-height: 1.8;
  color: var(--ink);
  word-wrap: break-word;
}
.article-desc :deep(p) { margin: 0 0 14px; }
.article-desc :deep(h2) { margin: 26px 0 10px; font-size: clamp(20px, 3vw, 26px); font-weight: 900; line-height: 1.3; }
.article-desc :deep(h3) { margin: 20px 0 8px; font-size: clamp(17px, 2.5vw, 21px); font-weight: 900; line-height: 1.35; }
.article-desc :deep(ul),
.article-desc :deep(ol) { margin: 0 0 14px; padding-left: 26px; }
.article-desc :deep(ul) { list-style: disc; }
.article-desc :deep(ol) { list-style: decimal; }
.article-desc :deep(li) { margin: 4px 0; }
.article-desc :deep(li > ul),
.article-desc :deep(li > ol) { margin-bottom: 0; }
.article-desc :deep(strong) { font-weight: 800; }
.article-desc :deep(em) { font-style: italic; }
.article-desc :deep(u) { text-decoration: underline; }
.article-desc :deep(blockquote) { margin: 14px 0; padding-left: 14px; border-left: 3px solid var(--royal-blue); color: rgba(29,43,58,0.85); font-style: italic; }
.article-desc :deep(a) { color: var(--royal-blue); text-decoration: underline; }
.article-thumbs { display: flex; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; overflow-x: auto; scrollbar-width: thin; }
.thumb { flex: 0 0 80px; width: 80px; height: 80px; padding: 0; border: 2px solid transparent; border-radius: 10px; cursor: pointer; overflow: hidden; opacity: 0.6; transition: opacity 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
.thumb:hover { opacity: 0.9; }
.thumb.active { opacity: 1; border-color: var(--royal-blue); box-shadow: 0 0 0 2px var(--royal-blue); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lightbox { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(13, 20, 28, 0.92); backdrop-filter: blur(6px); padding: 24px; }
.lightbox-img { max-width: min(92vw, 1100px); max-height: 84vh; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.lightbox-close { position: absolute; top: 18px; right: 18px; width: 44px; height: 44px; display: grid; place-items: center; border: none; border-radius: 50%; background: rgba(255,255,255,0.12); color: #fff; font-size: 18px; cursor: pointer; transition: background 0.15s ease; }
.lightbox-close:hover { background: rgba(255,255,255,0.25); }
.lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; display: grid; place-items: center; border: none; border-radius: 50%; background: rgba(255,255,255,0.12); color: #fff; font-size: 26px; font-weight: 900; cursor: pointer; transition: background 0.15s ease; }
.lightbox-nav:hover { background: rgba(255,255,255,0.25); }
.lightbox-prev { left: 18px; }
.lightbox-next { right: 18px; }
.lightbox-count { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); padding: 5px 12px; background: rgba(255,255,255,0.12); color: #fff; font-size: 12px; font-weight: 800; border-radius: 999px; }
.lightbox-fade-enter-active, .lightbox-fade-leave-active { transition: opacity 0.22s ease; }
.lightbox-fade-enter-from, .lightbox-fade-leave-to { opacity: 0; }
@media (max-width: 680px) {
  .article-nav { gap: 12px; min-height: 56px; padding: 8px 12px; }
  .nav-brand { width: 38px; height: 38px; margin-right: auto; }
  .nav-brand img { width: 30px; height: 30px; }
  .nav-link, .nav-actions { display: none !important; }
  .hamburger { display: flex !important; }
  .nav-close { display: flex !important; }
  .article-body-wrap { padding-top: 76px; }
  .article-head { margin-bottom: 18px; }
  .article-meta { flex-direction: column; align-items: flex-start; gap: 6px; }
  .meta-item + .meta-item { margin-left: 0; }
  .meta-item + .meta-item::before { display: none; }
  .article-hero { aspect-ratio: 16 / 9; margin-bottom: 20px; }
  .gallery-btn { width: 36px; height: 36px; }
  .lightbox { padding: 12px; }
  .lightbox-nav { width: 40px; height: 40px; font-size: 22px; }
  .lightbox-prev { left: 8px; }
  .lightbox-next { right: 8px; }
}
</style>