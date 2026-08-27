<script setup>
import { ref } from 'vue'

defineProps({
  best: { type: Number, default: 0 },
  error: { type: String, default: '' },
})

const emit = defineEmits(['play', 'back'])
const name = ref(localStorage.getItem('wh_name') || '')

function submit() {
  localStorage.setItem('wh_name', name.value.trim() || 'Anonim')
  emit('play')
}
</script>

<template>
  <section class="screen form-page">
    <button class="back-link" @click="emit('back')">← Kembali ke Profil UKM</button>

    <div class="card form-card">
      <h2>Isi Nama untuk Bermain</h2>
      <p class="muted small center">Nama akan dipakai untuk leaderboard. Bisa diubah kapan saja.</p>

      <input
        v-model="name"
        class="field"
        maxlength="20"
        placeholder="Ketik nama kamu..."
        @keyup.enter="submit"
      />

      <div class="score-badge">
        <span class="score-label">Rekor perangkat</span>
        <span class="score-val">{{ best }} <small>PTS</small></span>
      </div>

      <button class="btn play-btn" @click="submit">
        <span>MULAI WORD HUNT</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>

      <p v-if="error" class="error">{{ error }}</p>
      <p class="muted tiny center">Mode santai — tanpa waktu & tanpa combo. Skor = nilai huruf × panjang × 2.</p>
    </div>
  </section>
</template>

<style scoped>
.form-page { max-width: 560px; gap: 18px; padding-top: max(20px, env(safe-area-inset-top)); }
.back-link { align-self: flex-start; background:none; border:none; color:var(--royal-blue); font-weight:800; font-size:13px; cursor:pointer; }
.form-card { width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; padding:22px 20px; text-align:center; }
.form-card h2{ font-size:22px; font-weight:900; color:var(--dark-navy); }
.score-badge{ display:flex; flex-direction:column; align-items:center; gap:2px; border-top:1px solid var(--light-gray); padding-top:10px; width:100%; max-width:320px; }
.score-label{ font-size:10.5px; letter-spacing:.8px; text-transform:uppercase; color:var(--text-muted); font-weight:600; }
.score-val{ font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:var(--royal-blue); }
.play-btn{ width:100%; max-width:320px; }
.field{ width:100%; max-width:320px; }
@media (max-width:680px){ .form-page{ padding-left:14px; padding-right:14px; } }
</style>
