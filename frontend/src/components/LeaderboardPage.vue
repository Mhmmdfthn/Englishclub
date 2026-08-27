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
    <nav class="page-nav" aria-label="Navigasi halaman klasemen">
      <button class="page-brand" type="button" @click="$emit('back')" aria-label="Kembali ke profil">
        <img src="/Logo_ec.jpg" alt="Logo English Club UPB" />
      </button>
      <span class="page-nav-title">ENGLISH CLUB UPB</span>
      <button class="page-back" type="button" @click="$emit('back')">Kembali ke Profil</button>
    </nav>

    <div class="section-title">
      <span class="section-badge">KLASEMEN</span>
      <h2>Top 10 Pemain</h2>
      <p class="muted small center">Skor tertinggi Word Hunt, mode santai tanpa waktu.</p>
    </div>

    <div class="card lb-card">
      <p v-if="loading" class="muted small center py-2">Memuat klasemen...</p>
      <Leaderboard v-else :entries="entries" />
    </div>

    <button class="btn ghost" @click="$emit('back')">Kembali ke Profil</button>
  </section>
</template>

<style scoped>
.board-page{ --page-ink:#172B6B; --page-paper:#F7F4DF; --page-lime:#B8D96B; position:relative; isolation:isolate; max-width:1200px; min-height:100dvh; gap:18px; padding:0 clamp(18px,4vw,52px) 52px; color:var(--page-ink); background-color:var(--page-paper); background-image:radial-gradient(rgba(23,43,107,.13) 1px, transparent 1px); background-size:16px 16px; }
.board-page::before{ content:''; position:fixed; inset:0; z-index:-1; background:var(--page-paper); background-image:radial-gradient(rgba(23,43,107,.13) 1px, transparent 1px); background-size:16px 16px; }
.page-nav{ position:sticky; top:0; z-index:10; width:100%; min-height:64px; display:flex; align-items:center; gap:16px; padding:10px 14px; margin-bottom:24px; background:#FFFDF5; border-bottom:3px solid var(--page-ink); box-shadow:0 0 0 100vmax #FFFDF5, 0 4px 0 var(--page-lime); clip-path:inset(0 -100vmax); }
.page-brand{ display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; background:transparent; border:0; cursor:pointer; }
.page-brand img{ width:36px; height:36px; object-fit:contain; mix-blend-mode:multiply; }
.page-nav-title{ color:var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:13px; font-weight:800; letter-spacing:.08em; }
.page-back{ margin-left:auto; padding:9px 13px; color:var(--page-ink); background:transparent; border:2px solid var(--page-ink); font-family:'Plus Jakarta Sans', sans-serif; font-size:12px; font-weight:800; cursor:pointer; }
.page-back:hover{ background:var(--page-lime); }
.section-title{ width:100%; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; }
.section-badge{ background:var(--royal-blue); color:#fff; font-size:10px; font-weight:800; letter-spacing:1.8px; padding:4px 10px; border-radius:9999px; }
.section-title h2{ font-size:clamp(22px,4vw,28px); font-weight:900; color:var(--dark-navy); }
.lb-card{ width:100%; }
@media (max-width:680px){ .board-page{ padding-left:14px; padding-right:14px; }.page-nav{ margin-bottom:18px; padding:8px 10px; }.page-nav-title{ font-size:11px; }.page-back{ padding:7px 8px; font-size:10px; } }
</style>
