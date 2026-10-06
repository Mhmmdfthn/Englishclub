<script setup>
const emit = defineEmits(['back'])
</script>

<template>
  <section class="soon">
    <nav class="soon__nav" aria-label="Navigasi">
      <button class="soon__brand" type="button" @click="emit('back')" aria-label="Kembali ke beranda">
        <img src="/logo-ec.png" alt="Logo English Club UPB" width="36" height="36" />
        <span>English Club <b>UPB</b></span>
      </button>
      <button class="ec-btn ec-btn--ghost ec-btn--sm" type="button" @click="emit('back')">Kembali</button>
    </nav>

    <div class="ec-card soon__card">
      <span class="ec-eyebrow">Info</span>
      <h1 class="ec-h2">Segera hadir.</h1>
      <p class="ec-lede">Fitur akun anggota English Club sedang disiapkan dan akan segera dibuka.</p>
      <button class="ec-btn ec-btn--primary" type="button" @click="emit('back')">Kembali ke beranda</button>
    </div>
  </section>
</template>

<style scoped>
.soon {
  width: 100%;
  max-width: 480px;
  min-height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-5);
  padding: clamp(16px, 3vh, 28px) 16px 48px;
  user-select: text;
  -webkit-user-select: text;
}

.soon__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ec-space-3);
  min-height: 64px;
}

.soon__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-3);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.soon__brand img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  padding: 3px;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
}

.soon__brand b {
  color: var(--ec-blue);
  font-weight: 700;
}

.soon__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ec-space-3);
  padding: clamp(24px, 5vw, 36px);
}
</style>
