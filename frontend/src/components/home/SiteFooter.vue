<script setup>
import { Instagram, Music2 } from 'lucide-vue-next'

/**
 * SiteFooter — full-bleed closing section with rich navigation and brand identity.
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
        <a href="#top" class="footer__brand-link" aria-label="Kembali ke atas">
          <img class="footer__logo" src="/logo-ec.png" alt="Logo English Club UPB" width="44" height="44" loading="lazy" />
          <div class="footer__brand-text">
            <span class="footer__name">English Club <span class="footer__name-sub">UPB</span></span>
            <span class="footer__badge">UKM BEM Keilmuan</span>
          </div>
        </a>
        <p class="footer__tagline">
          Wadah pengembangan kemampuan berbahasa Inggris, public speaking, dan keakraban mahasiswa di lingkungan Universitas Putra Bangsa Kebumen.
        </p>
      </div>

      <nav class="footer__cols" aria-label="Navigasi footer">
        <div class="footer__col">
          <h2 class="footer__title">Jelajahi</h2>
          <a class="footer__link" href="#top">Beranda</a>
          <a class="footer__link" href="#about">Tentang Kami</a>
          <a class="footer__link" href="#happening">What's Happening</a>
          <a class="footer__link" href="#stories">Cerita Komunitas</a>
        </div>

        <div class="footer__col">
          <h2 class="footer__title">Aktivitas</h2>
          <button class="footer__link" type="button" @click="emit('goPlay')">Word Hunt Game</button>
          <button class="footer__link" type="button" @click="emit('goBoard')">Papan Skor</button>
        </div>

        <div v-if="memberName || authEnabled" class="footer__col">
          <h2 class="footer__title">Keanggotaan</h2>
          <template v-if="memberName">
            <button class="footer__link" type="button" @click="emit('goDashboard')">Dashboard Anggota</button>
          </template>
          <template v-else>
            <button class="footer__link" type="button" @click="emit('goLogin')">Masuk Akun</button>
            <button class="footer__link" type="button" @click="emit('goSignup')">Daftar Akun</button>
          </template>
        </div>

        <div class="footer__col">
          <h2 class="footer__title">Terhubung</h2>
          <div class="footer__socials">
            <a
              class="footer__social-btn"
              href="https://www.instagram.com/ukmenglishclub_upb/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram English Club UPB"
            >
              <Instagram :size="18" :stroke-width="2" aria-hidden="true" />
              <span>Instagram</span>
            </a>
            <a
              class="footer__social-btn"
              href="https://www.tiktok.com/@englishclub.upb_ofc"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok English Club UPB"
            >
              <Music2 :size="18" :stroke-width="2" aria-hidden="true" />
              <span>TikTok</span>
            </a>
          </div>
        </div>
      </nav>
    </div>

    <div class="footer__bar">
      <div class="footer__bar-inner">
        <p class="footer__copy">
          &copy; 2026 <b>English Club UPB</b> &bull; Universitas Putra Bangsa Kebumen
        </p>
        <p class="footer__credits">
          Practice Makes Progress 🚀
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  width: 100%;
  background: #0B2239;
  color: #FFFFFF;
  padding: clamp(52px, 7vw, 76px) 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(32px, 5vw, 64px);
  justify-content: space-between;
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
}

.footer__brand {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 360px;
}

.footer__brand-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #FFFFFF;
}

.footer__logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.footer__brand-text {
  display: flex;
  flex-direction: column;
}

.footer__name {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.footer__name-sub {
  color: var(--ec-yellow);
}

.footer__badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.04em;
}

.footer__tagline {
  margin: 0;
  font-size: 0.844rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.footer__cols {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, max-content));
  gap: clamp(24px, 4vw, 48px);
}

.footer__col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ec-yellow);
  margin: 0 0 4px 0;
}

.footer__link {
  padding: 4px 0;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.78);
  font-family: inherit;
  font-size: 0.875rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--ec-dur) var(--ec-ease);
}

.footer__link:hover {
  color: #FFFFFF;
  transform: translateX(2px);
}

.footer__link:focus-visible {
  outline: none;
  border-radius: var(--ec-radius-sm);
  box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.7);
}

.footer__socials {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer__social-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--ec-radius-pill);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.813rem;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--ec-dur) var(--ec-ease);
}

.footer__social-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  color: #FFFFFF;
  transform: translateY(-1px);
}

.footer__social-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.7);
}

.footer__bar {
  margin-top: clamp(40px, 5vw, 64px);
  padding: 24px 0 calc(24px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.15);
}

.footer__bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
  font-size: 0.813rem;
  color: rgba(255, 255, 255, 0.65);
  flex-wrap: wrap;
}

.footer__copy b {
  color: rgba(255, 255, 255, 0.9);
}

.footer__credits {
  font-weight: 600;
  color: var(--ec-yellow);
}

@media (max-width: 900px) {
  .footer__cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .footer__brand {
    max-width: 100%;
  }
}

@media (max-width: 540px) {
  .footer {
    padding-top: 28px;
  }

  .footer__brand {
    gap: 0;
  }

  .footer__logo {
    width: 36px;
    height: 36px;
  }

  /* Minimalis: tagline + kolom link disembunyikan di HP.
     Navigasi tetap tersedia via hamburger navbar + halaman terkait. */
  .footer__tagline {
    display: none;
  }

  .footer__cols {
    display: block;
  }

  .footer__col:not(:last-child) {
    display: none;
  }

  .footer__col:last-child .footer__title {
    display: none;
  }

  .footer__socials {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .footer__bar {
    margin-top: 20px;
    padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .footer__bar-inner {
    gap: 4px 16px;
  }
}
</style>
