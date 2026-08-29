<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api.js'
import Leaderboard from './Leaderboard.vue'

const props = defineProps({
  stats: { type: Object, required: true },
})

const emit = defineEmits(['replay'])

const displayedScore = ref(0)
onMounted(() => {
  const target = props.stats.score
  if (!target) return
  const duration = 900
  const start = performance.now()
  const step = (now) => {
    const k = Math.min(1, (now - start) / duration)
    displayedScore.value = Math.round(target * (1 - Math.pow(1 - k, 3)))
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
})

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
    <div class="result-shell">
      <div class="brand-badge">
        <span class="pill-english">ENGLISH</span>
        <span class="text-club">CLUB</span>
      </div>

      <h1 class="title">WAKTU <span class="highlight">HABIS!</span></h1>

      <div class="card center result-card">
        <div class="score-meta">
          <span class="res-subtitle">TOTAL SKOR AKHIR</span>
          <div class="score-value-wrap">
            <span class="big-score" aria-label="Total skor akhir">{{ displayedScore }}</span>
          </div>
        </div>

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
          REKOR BARU TERCIPTA!
        </div>
        <p v-else class="record-info">Rekor perangkat: <b>{{ stats.best }}</b> pts</p>

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
      <span class="saved-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3h12v6a6 6 0 0 1-12 0V3Z" />
          <path d="M6 5H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5M18 5h2a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5M12 15v4M8 21h8" />
        </svg>
      </span>
      <p class="saved-text">
        Berhasil tersimpan di Peringkat <b>#{{ savedRank }}</b>!
      </p>
    </div>

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

    <button class="btn replay-btn" @click="replay">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M23 4v6h-6"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>MAIN LAGI</span>
    </button>
    </div>
  </section>
</template>

<style scoped>
.over {
  position: relative;
  justify-content: flex-start;
  padding-top: max(22px, env(safe-area-inset-top));
  padding-bottom: 32px;
  background-color: var(--pure-white);
  background-image: radial-gradient(rgba(29, 43, 58, 0.13) 1px, transparent 1px);
  background-size: 16px 16px;
}

.result-shell {
  width: min(100%, 720px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--pure-white);
  border: 2px solid var(--dark-navy);
  box-shadow: 4px 4px 0 var(--dark-navy);
  padding: 6px 12px;
  align-self: center;
}

.pill-english {
  background: var(--royal-blue);
  color: var(--pure-white);
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.12em;
  padding: 4px 8px;
  border: 2px solid var(--dark-navy);
}

.text-club {
  color: var(--dark-navy);
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.12em;
}

.title {
  margin: 0;
  font-size: clamp(38px, 7vw, 62px);
  line-height: 0.92;
  letter-spacing: -0.06em;
  text-align: center;
  color: var(--dark-navy);
}

.title .highlight {
  color: var(--royal-blue);
}

.result-card {
  width: 100%;
  background: var(--pure-white);
  border: 3px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 7px 7px 0 var(--royal-blue);
  gap: 12px;
  padding: 20px 18px 18px;
}

.score-meta {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.res-subtitle {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: var(--royal-blue);
  text-transform: uppercase;
}

.score-value-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--dark-navy);
  border: 3px solid var(--dark-navy);
  box-shadow: 5px 5px 0 var(--vibrant-yellow);
}

.big-score {
  margin: 0;
  padding: 14px 12px 10px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(54px, 12vw, 88px);
  font-weight: 900;
  color: var(--pure-white);
  line-height: 1;
  letter-spacing: -0.08em;
  font-variant-numeric: tabular-nums;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  margin: 6px 0 2px;
  background: #f8fafc;
  border: 3px solid var(--dark-navy);
  box-shadow: 6px 6px 0 var(--dark-navy);
  overflow: hidden;
}

.stat-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 122px;
  padding: 10px 8px 12px;
}

.stat-col:nth-child(2) {
  border-left: 3px solid var(--dark-navy);
  border-right: 3px solid var(--dark-navy);
}

.stat-num {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(32px, 6vw, 54px);
  font-weight: 900;
  line-height: 0.9;
  color: var(--dark-navy);
  letter-spacing: -0.06em;
}

.stat-text {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  letter-spacing: 0.02em;
}

.stat-divider {
  display: none;
}

.new-record-pill {
  background: var(--vibrant-yellow);
  color: var(--dark-navy);
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.12em;
  padding: 6px 16px;
  border: 2px solid var(--dark-navy);
  box-shadow: 3px 3px 0 var(--dark-navy);
}

.record-info {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.record-info b {
  color: var(--royal-blue);
}

.longest-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  margin-top: 2px;
}

.longest-label {
  color: var(--text-muted);
}

.longest-word {
  font-weight: 900;
  color: var(--royal-blue);
  letter-spacing: 0.14em;
}

.save-card {
  width: 100%;
  max-width: 620px;
  gap: 10px;
  background: var(--pure-white);
  border: 3px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 7px 7px 0 var(--royal-blue);
  padding: 18px 18px 20px;
}

.save-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-sub);
}

.save-btn {
  width: 100%;
  max-width: 420px;
  border-radius: 0;
  border: 2px solid var(--dark-navy);
  box-shadow: 4px 4px 0 var(--dark-navy);
  font-size: 14px;
  padding: 13px 20px;
}

.saved-card {
  width: 100%;
  max-width: 620px;
  flex-direction: row !important;
  justify-content: center;
  align-items: center;
  gap: 10px;
  background: rgba(16, 185, 129, 0.16);
  border: 3px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 7px 7px 0 var(--dark-navy);
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
  border-bottom: 2px solid var(--dark-navy);
}

.header-icon {
  color: var(--royal-blue);
}

.lb-card {
  width: 100%;
  max-width: 620px;
  background: var(--pure-white);
  border: 3px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 7px 7px 0 var(--royal-blue);
  padding: 18px;
}

.lb-card h3 {
  margin: 0;
  font-size: 13.5px;
  letter-spacing: 1.5px;
  font-weight: 800;
  color: var(--dark-navy);
}

.replay-btn {
  width: 100%;
  max-width: 320px;
  margin-top: 6px;
  border-radius: 0;
  border: 2px solid var(--dark-navy);
  box-shadow: 4px 4px 0 var(--dark-navy);
}

@media (max-width: 680px) {
  .result-shell {
    width: 100%;
  }

  .save-card,
  .saved-card,
  .lb-card,
  .result-card {
    width: 100%;
  }
}
</style>
