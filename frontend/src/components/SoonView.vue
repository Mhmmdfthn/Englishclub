<script setup>
const emit = defineEmits(['back'])
</script>

<template>
  <section class="screen form-page">
    <nav class="page-nav" aria-label="Navigasi">
      <span class="page-nav-title">SEGERA HADIR</span>
      <button class="page-back" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="play-layout">
      <div class="card form-card soon-card">
        <span class="panel-kicker">INFO</span>
        <h2>Segera Hadir</h2>
        <p>Fitur akun anggota English Club sedang disiapkan dan akan segera dibuka.</p>
        <button class="btn play-btn" type="button" @click="emit('back')">
          <span>KEMBALI</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.soon-card { text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.soon-card p { margin: 0 0 8px; }
</style>
