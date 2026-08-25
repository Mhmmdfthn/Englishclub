<script setup>
import { ref } from 'vue'
import { api } from '../api.js'
import Leaderboard from './Leaderboard.vue'

const props = defineProps({
  stats: { type: Object, required: true },
})

const emit = defineEmits(['replay'])

const name = ref(localStorage.getItem('wh_name') || '')
const savedRank = ref(null)
const saving = ref(false)
const saveError = ref('')
const entries = ref([])

async function save() {
  if (saving.value || savedRank.value) return
  saving.value = true
  saveError.value = ''
  try {
    const usedName = name.value.trim() || 'Anonim'
    const r = await api.saveScore(usedName, props.stats.score, props.stats.words.length)
    localStorage.setItem('wh_name', usedName)
    savedRank.value = r.rank
    entries.value = (await api.topScores()).entries
  } catch (e) {
    saveError.value = 'Gagal menyimpan skor. Coba lagi.'
  }
  saving.value = false
}

function replay() {
  emit('replay')
}
</script>

<template>
  <section class="screen over">
    <!-- Brand Badge -->
    <div class="brand-badge">
      <span class="pill-english">ENGLISH</span>
      <span class="text-club">CLUB</span>
    </div>

    <h1 class="title">WAKTU <span class="highlight">HABIS!</span></h1>

    <!-- Score & Results Card -->
    <div class="card center result-card">
      <span class="res-subtitle">TOTAL SKOR AKHIR</span>
      <p class="big-score">{{ stats.score }}</p>

      <div class="stats-grid">
        <div class="stat-col">
          <span class="stat-num">{{ stats.words.length }}</span>
          <span class="stat-text">Kata</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-col">
          <span class="stat-num">x{{ stats.bestCombo }}</span>
          <span class="stat-text">Max Combo</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-col">
          <span class="stat-num">{{ stats.longest ? stats.longest.length : 0 }}</span>
          <span class="stat-text">Huruf Terpanjang</span>
        </div>
      </div>

      <div v-if="stats.isRecord" class="new-record-pill">
        🎉 REKOR BARU TERCIPTA!
      </div>
      <p v-else class="muted small record-info">Rekor perangkat: <b>{{ stats.best }}</b> pts</p>

      <div v-if="stats.longest" class="longest-box">
        <span class="longest-label">Kata Terbaik:</span>
        <span class="longest-word">{{ stats.longest.toUpperCase() }}</span>
      </div>
    </div>

    <!-- Save Score Input -->
    <div v-if="!savedRank" class="card center save-card">
      <span class="save-title">Simpan Skor ke Leaderboard</span>
      <input
        v-model="name"
        class="field"
        maxlength="20"
        placeholder="Nama kamu..."
        @keyup.enter="save"
      />
      <button class="btn primary save-btn" :disabled="saving" @click="save">
        {{ saving ? 'Menyimpan...' : 'SIMPAN SKOR' }}
      </button>
      <p v-if="saveError" class="error">{{ saveError }}</p>
    </div>
    <div v-else class="card center saved-card">
      <span class="saved-icon">🏆</span>
      <p class="saved-text">
        Berhasil tersimpan di Peringkat <b>#{{ savedRank }}</b>!
      </p>
    </div>

    <!-- Leaderboard if saved -->
    <div v-if="savedRank" class="card lb-card">
      <div class="card-header">
        <svg class="header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
          <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
          <path d="M4 22h16"/>
          <path d="M6 2h12v7a6 6 0 0 1-12 0V2z"/>
        </svg>
        <h3>TOP 10 PEMAIN</h3>
      </div>
      <Leaderboard :entries="entries" />
    </div>

    <!-- Replay CTA -->
    <button class="btn replay-btn" @click="replay">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M23 4v6h-6"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>MAIN LAGI</span>
    </button>
  </section>
</template>

<style scoped>
.over {
  justify-content: flex-start;
  padding-top: max(4vh, 20px);
  padding-bottom: 30px;
}

.result-card {
  background: #FFFFFF;
  border: 1.5px solid var(--panel-border);
  gap: 8px;
}

.res-subtitle {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.big-score {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(52px, 15vw, 76px);
  font-weight: 900;
  color: var(--royal-blue);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  margin: 8px 0;
  padding: 10px 0;
  background: #F4F7FA;
  border-radius: var(--radius-md);
  border: 1px solid #E2E8F0;
}

.stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: var(--dark-navy);
}

.stat-text {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: #E2E8F0;
}

.new-record-pill {
  background: linear-gradient(135deg, var(--vibrant-yellow), #FFF04D);
  color: var(--dark-navy);
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 5px 14px;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 14px rgba(255, 230, 0, 0.4);
}

.record-info {
  margin: 2px 0;
}

.record-info b {
  color: var(--royal-blue);
}

.longest-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-top: 4px;
}

.longest-label {
  color: var(--text-muted);
}

.longest-word {
  font-weight: 800;
  color: var(--royal-blue-light);
  letter-spacing: 1px;
}

.save-card {
  gap: 10px;
}

.save-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.save-btn {
  width: 100%;
  max-width: 280px;
}

.saved-card {
  flex-direction: row !important;
  justify-content: center;
  align-items: center;
  gap: 10px;
  background: rgba(16, 185, 129, 0.15);
  border: 1.5px solid rgba(16, 185, 129, 0.4);
}

.saved-icon {
  font-size: 22px;
}

.saved-text {
  margin: 0;
  font-size: 14px;
  color: var(--dark-navy);
}

.saved-text b {
  color: var(--good);
  font-weight: 800;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #E2E8F0;
}

.header-icon {
  color: var(--vibrant-yellow);
}

.lb-card h3 {
  margin: 0;
  font-size: 13.5px;
  letter-spacing: 1.5px;
  font-weight: 800;
  color: var(--light-gray);
}

.replay-btn {
  width: 100%;
  max-width: 320px;
  margin-top: 6px;
}
</style>
