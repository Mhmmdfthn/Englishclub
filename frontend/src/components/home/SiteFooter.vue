<script setup>
import { Instagram } from 'lucide-vue-next'

/**
 * SiteFooter — closes the page and carries secondary navigation.
 *
 * PRD_Homepage_Redesign §7.7: because the homepage has no hamburger and no sidebar, the
 * footer keeps the section links reachable on small screens. It does not duplicate every
 * navbar item — it adds the destinations the navbar cannot show (Word Hunt, leaderboard)
 * plus the social and organisation details that already existed.
 */
defineProps({
  memberName: { type: String, default: '' },
  authEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['goPlay', 'goBoard', 'goLogin', 'goDashboard', 'goSignup'])
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <img class="footer__logo" src="/logo-ec.png" alt="" width="40" height="40" loading="lazy" />
        <div>
          <p class="footer__name">English Club UPB</p>
          <p class="footer__tagline">Unit Kegiatan Mahasiswa — BEM Departemen Keilmuan, Universitas Putra Bangsa Kebumen.</p>
        </div>
      </div>

      <nav class="footer__cols" aria-label="Navigasi tambahan">
        <div class="footer__col">
          <h2 class="footer__title">Halaman</h2>
          <a class="footer__link" href="#top">Home</a>
          <a class="footer__link" href="#happening">What's Happening</a>
          <a class="footer__link" href="#about">About</a>
          <a class="footer__link" href="#stories">Stories</a>
        </div>

        <div class="footer__col">
          <h2 class="footer__title">Bermain</h2>
          <button class="footer__link" type="button" @click="emit('goPlay')">Word Hunt</button>
          <button class="footer__link" type="button" @click="emit('goBoard')">Papan Skor</button>
        </div>

        <div v-if="memberName || authEnabled" class="footer__col">
          <h2 class="footer__title">Anggota</h2>
          <template v-if="memberName">
            <button class="footer__link" type="button" @click="emit('goDashboard')">Dashboard</button>
          </template>
          <template v-else>
            <button class="footer__link" type="button" @click="emit('goLogin')">Masuk</button>
            <button class="footer__link" type="button" @click="emit('goSignup')">Buat akun</button>
          </template>
        </div>

        <div class="footer__col">
          <h2 class="footer__title">Terhubung</h2>
          <a class="footer__link" href="https://www.instagram.com/ukmenglishclub_upb/" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a class="footer__link" href="https://www.tiktok.com/@englishclub.upb_ofc" target="_blank" rel="noreferrer">
            TikTok
          </a>
        </div>
      </nav>
    </div>

    <div class="footer__bar">
      <p>© 2026 English Club, Universitas Putra Bangsa Kebumen</p>
      <a class="footer__social" href="https://www.instagram.com/ukmenglishclub_upb/" target="_blank" rel="noreferrer" aria-label="Instagram English Club UPB">
        <Instagram :size="19" :stroke-width="1.9" aria-hidden="true" />
      </a>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  /* Full-bleed dark surface to close the page with a clear brand moment. */
  margin-top: clamp(40px, 6vw, 72px);
  margin-inline: calc(-1 * clamp(16px, 4vw, 40px));
  padding: clamp(36px, 5vw, 56px) clamp(16px, 4vw, 40px) clamp(20px, 3vw, 28px);
  background: var(--ec-blue-strong);
  color: #FFFFFF;
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(28px, 5vw, 64px);
  justify-content: space-between;
  max-width: 1180px;
  margin: 0 auto;
}

.footer__brand {
  display: flex;
  gap: var(--ec-space-3);
  max-width: 320px;
}

.footer__logo {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  object-fit: contain;
  /* Already transparent in the source — no masking disc needed. */
}

.footer__name {
  font-family: 'Outfit', sans-serif;
  font-size: 1.062rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.footer__tagline {
  margin-top: 4px;
  font-size: 0.812rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.76);
}

.footer__cols {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, max-content));
  gap: clamp(20px, 4vw, 48px);
}

.footer__col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.688rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ec-yellow);
}

.footer__link {
  padding: 2px 0;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.86);
  font-family: inherit;
  font-size: 0.875rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: color var(--ec-dur) var(--ec-ease);
}

.footer__link:hover {
  color: #FFFFFF;
  text-decoration: underline;
}

.footer__link:focus-visible {
  outline: none;
  border-radius: var(--ec-radius-sm);
  box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.7);
}

.footer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ec-space-4);
  max-width: 1180px;
  margin: clamp(28px, 4vw, 44px) auto 0;
  padding-top: var(--ec-space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 0.781rem;
  color: rgba(255, 255, 255, 0.7);
}

.footer__social {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--ec-radius-pill);
  color: #FFFFFF;
  transition: background var(--ec-dur) var(--ec-ease), border-color var(--ec-dur) var(--ec-ease);
}

.footer__social:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.5);
}

.footer__social:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.7);
}

@media (max-width: 860px) {
  .footer__cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }
}
</style>
