<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api.js'
import Leaderboard from './Leaderboard.vue'

defineProps({
  best: { type: Number, default: 0 },
  error: { type: String, default: '' },
})

const emit = defineEmits(['play'])

const name = ref(localStorage.getItem('wh_name') || '')
const entries = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    entries.value = (await api.topScores()).entries
  } catch (e) {
    entries.value = []
  }
  loading.value = false
})

function play() {
  localStorage.setItem('wh_name', name.value.trim() || 'Anonim')
  emit('play')
}
</script>

<template>
  <section class="screen menu">
    <!-- Logo resmi English Club -->
    <img
      class="menu-logo"
      src="/Logo_ec.jpg"
      alt="Logo English Club Universitas Putra Bangsa"
    />

    <!-- Club Header Badge -->
    <div class="brand-badge">
      <span class="pill-english">ENGLISH</span>
      <span class="text-club">CLUB</span>
    </div>

    <!-- Title -->
    <h1 class="title">WORD <span class="highlight">HUNT</span></h1>
    
    <p class="subtitle">
      Tautkan huruf-huruf bahasa Inggris dalam grid 4&times;4.
      Huruf akan terisi ulang seketika saat kata ditemukan!
    </p>

    <!-- Main Card Action -->
    <div class="card center play-card">
      <input
        v-model="name"
        class="field"
        maxlength="20"
        placeholder="Ketik nama kamu..."
        @keyup.enter="play"
      />
      <div class="score-badge">
        <span class="score-label">Rekor di Perangkat Ini</span>
        <span class="score-val">{{ best }} <small>PTS</small></span>
      </div>
      <button class="btn play-btn" @click="play">
        <span>MULAI MAIN</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <!-- Leaderboard Card -->
    <div class="card lb-card">
      <div class="card-header">
        <svg class="header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
          <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/>
          <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"/>
          <path d="M6 2h12v7a6 6 0 0 1-12 0V2z"/>
        </svg>
        <h3>TOP 10 PEMAIN</h3>
      </div>
      <p v-if="loading" class="muted small center py-2">Memuat klasemen...</p>
      <Leaderboard v-else :entries="entries" />
    </div>

    <!-- How to play footer -->
    <div class="howto-box">
      <div class="howto-icon">💡</div>
      <p class="muted tiny howto">
        <b>Cara Bermain:</b> Geser jari atau mouse menyusuri huruf yang berdampingan (min. 3 huruf).
        Semakin panjang kata, semakin besar poin &amp; tambahan waktu!
      </p>
    </div>
  </section>
</template>

<style scoped>
.menu {
  justify-content: flex-start;
  padding-top: max(4vh, 20px);
  padding-bottom: 30px;
}

.menu-logo {
  width: clamp(120px, 32vw, 170px);
  height: auto;
  border-radius: 14px;
  box-shadow: 0 6px 22px rgba(11, 86, 155, 0.18);
  margin-bottom: 2px;
}

.play-card {
  gap: 14px;
  margin-top: 4px;
  background: #FFFFFF;
  border: 1.5px solid rgba(29, 43, 58, 0.12);
}

.score-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.score-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  font-weight: 600;
}

.score-val {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--royal-blue);
}

.score-val small {
  font-size: 12px;
  color: var(--text-muted);
}

.play-btn {
  width: 100%;
  max-width: 280px;
}

.lb-card {
  margin-top: 2px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.1);
}

.header-icon {
  color: var(--vibrant-yellow);
}

.lb-card h3 {
  margin: 0;
  font-size: 13.5px;
  letter-spacing: 1.5px;
  font-weight: 800;
  color: var(--text-sub);
}

.howto-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(11, 86, 155, 0.06);
  border: 1px dashed rgba(11, 86, 155, 0.35);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  width: 100%;
  margin-top: auto;
}

.howto-icon {
  font-size: 20px;
}

.howto {
  margin: 0;
  line-height: 1.45;
  text-align: left;
}

.howto b {
  color: var(--royal-blue);
}

.py-2 {
  padding: 12px 0;
}
</style>
