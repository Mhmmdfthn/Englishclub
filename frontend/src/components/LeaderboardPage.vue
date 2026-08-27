<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api.js'
import Leaderboard from './Leaderboard.vue'

defineEmits(['back'])

const entries = ref([])
const loading = ref(true)

onMounted(async () => {
  try { entries.value = (await api.topScores()).entries } catch { entries.value = [] }
  loading.value = false
})
</script>

<template>
  <section class="screen board-page">
    <button class="back-link" @click="$emit('back')">← Kembali</button>

    <div class="section-title">
      <span class="section-badge">KLASEMEN</span>
      <h2>Top 10 Pemain</h2>
      <p class="muted small center">Skor tertinggi Word Hunt — mode santai tanpa waktu.</p>
    </div>

    <div class="card lb-card">
      <p v-if="loading" class="muted small center py-2">Memuat klasemen...</p>
      <Leaderboard v-else :entries="entries" />
    </div>

    <button class="btn ghost" @click="$emit('back')">Kembali ke Profil</button>
  </section>
</template>

<style scoped>
.board-page{ max-width:560px; gap:18px; padding-top:max(20px, env(safe-area-inset-top)); }
.back-link{ align-self:flex-start; background:none; border:none; color:var(--royal-blue); font-weight:800; font-size:13px; cursor:pointer; }
.section-title{ width:100%; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; }
.section-badge{ background:var(--royal-blue); color:#fff; font-size:10px; font-weight:800; letter-spacing:1.8px; padding:4px 10px; border-radius:9999px; }
.section-title h2{ font-size:clamp(22px,4vw,28px); font-weight:900; color:var(--dark-navy); }
.lb-card{ width:100%; }
@media (max-width:680px){ .board-page{ padding-left:14px; padding-right:14px; } }
</style>
