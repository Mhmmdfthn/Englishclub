<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api.js'

const emit = defineEmits(['back'])
const route = useRoute()

const program = ref(null)
const loading = ref(true)
const error = ref('')
const currentPhoto = ref(0)

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
</script>

<template>
  <section class="article-screen">
    <header class="article-nav">
      <span class="article-brand">ENGLISH CLUB · PROGRAM</span>
      <button class="back-btn" type="button" @click="emit('back')">← Kembali</button>
    </header>

    <div v-if="loading" class="article-state">
      <p>Memuat program...</p>
    </div>

    <div v-else-if="error" class="article-state">
      <p>{{ error }}</p>
      <button class="btn ghost" type="button" @click="emit('back')">Kembali ke Beranda</button>
    </div>

    <article v-else-if="program" class="article-card">
      <div class="article-hero">
        <img :src="photos[currentPhoto]" :alt="program.title" class="article-cover" />
        <span class="article-status" :class="`status-${program.status || 'upcoming'}`">{{ statusLabel() }}</span>
        <div v-if="photos.length > 1" class="article-gallery-nav">
          <button class="gallery-btn" type="button" @click="prev">‹</button>
          <span class="gallery-count">{{ currentPhoto + 1 }} / {{ photos.length }}</span>
          <button class="gallery-btn" type="button" @click="next">›</button>
        </div>
      </div>

      <div class="article-body">
        <span class="article-kicker">{{ program.id }}</span>
        <h1 class="article-title">{{ program.title }}</h1>
        <div class="article-meta">
          <span class="meta-item"><span class="material-symbols-outlined loc-icon">calendar_month</span>{{ program.date || 'Tanggal menyusul' }}</span>
          <span class="meta-item"><span class="material-symbols-outlined loc-icon">location_on</span>Universitas Putra Bangsa</span>
        </div>
        <p class="article-desc">{{ program.description || program.caption }}</p>
        <div v-if="photos.length > 1" class="article-thumbs">
          <button v-for="(ph, i) in photos" :key="i" class="thumb" :class="{ active: i === currentPhoto }" type="button" @click="currentPhoto = i"><img :src="ph" alt="" /></button>
        </div>
      </div>
    </article>

    <button v-if="program" class="btn ghost article-back" type="button" @click="emit('back')">Kembali ke Beranda</button>
  </section>
</template>

<style scoped>
.article-screen {
  --ink: var(--dark-navy);
  width: 100%;
  max-width: 860px;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(16px, 3vh, 28px) clamp(18px, 4vw, 52px) 52px;
  gap: 20px;
  color: var(--ink);
}
.article-screen::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--pure-white);
  background-image: radial-gradient(rgba(29, 43, 58, 0.13) 1px, transparent 1px);
  background-size: 16px 16px;
}
.article-nav {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--ink);
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  color: var(--ink);
  background: #fff;
  border: 2px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.back-btn:hover { background: var(--vibrant-yellow); }
.article-brand {
  color: var(--royal-blue);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
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
.article-card {
  width: 100%;
  background: #fff;
  border: 3px solid var(--ink);
  box-shadow: 7px 7px 0 var(--ink);
}
.article-hero { position: relative; border-bottom: 3px solid var(--ink); background: #f8fafc; }
.article-cover { width: 100%; height: clamp(240px, 46vw, 420px); object-fit: cover; display: block; }
.article-status {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 6px 12px;
  border: 1px solid currentColor;
  font-size: 12px;
  font-weight: 800;
}
.status-upcoming { color: #8a5a00; background: #fff4c2; }
.status-ongoing { color: #075985; background: #dff4ff; }
.status-completed { color: #166534; background: #dcfce7; }
.article-gallery-nav { position: absolute; inset: auto 14px 14px 14px; display: flex; align-items: center; justify-content: space-between; }
.gallery-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid var(--ink);
  font-size: 19px;
  font-weight: 900;
  cursor: pointer;
}
.gallery-count { padding: 4px 10px; background: rgba(29, 43, 58, 0.85); color: #fff; font-size: 11px; font-weight: 800; border-radius: 999px; }
.article-body { padding: 26px 28px 30px; text-align: left; }
.article-kicker { color: var(--royal-blue); font-size: 10px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
.article-title {
  margin: 8px 0 12px;
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--ink);
}
.article-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; }
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  color: var(--royal-blue);
  border: 2px solid var(--ink);
  background: #fff;
  font-size: 12px;
  font-weight: 800;
}
.loc-icon {
  font-size: 15px;
  vertical-align: middle;
}
.article-desc {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--ink);
  white-space: pre-wrap;
}
.article-thumbs { display: flex; gap: 8px; margin-top: 22px; padding-top: 16px; border-top: 2px solid #e5e7eb; overflow-x: auto; }
.thumb { flex: 0 0 64px; width: 64px; height: 64px; padding: 0; border: 2px solid var(--ink); cursor: pointer; overflow: hidden; opacity: 0.7; }
.thumb.active { opacity: 1; box-shadow: 3px 3px 0 var(--vibrant-yellow); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.article-back { margin-top: 6px; }
</style>