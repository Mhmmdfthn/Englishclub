<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LogOut } from 'lucide-vue-next'

/**
 * PublicNavbar — sticky navigation for the public site.
 *
 * PRD_Homepage_Redesign §7.1: [English Club UPB] Home What's Happening About Stories [Login].
 * Locked decisions honoured here:
 *  - sticky while scrolling
 *  - no hamburger icon, no sidebar
 *  - Login stays the primary account action for guests
 *  - visually merges with the hero (transparent over the hero, solid once scrolled)
 *
 * Mobile has no hamburger, so the section links collapse and the footer carries
 * secondary navigation (PRD §7.7). Nothing is removed on small screens: every
 * navbar destination stays reachable from the footer.
 */
defineProps({
  memberName: { type: String, default: '' },
  authEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['goLogin', 'goDashboard', 'memberLogout', 'openAdmin'])

const scrolled = ref(false)

// Hidden admin entry, preserved from the previous navbar: repeated clicks or a
// long press on the brand mark open the admin panel.
const logoClicks = ref(0)
let logoTimer = null
let pressTimer = null

function onScroll() {
  scrolled.value = window.scrollY > 12
}

function onLogoClick() {
  logoClicks.value++
  clearTimeout(logoTimer)
  logoTimer = setTimeout(() => { logoClicks.value = 0 }, 800)
  if (logoClicks.value >= 5) {
    logoClicks.value = 0
    emit('openAdmin')
  }
}

function onPressStart() {
  pressTimer = setTimeout(() => emit('openAdmin'), 800)
}

function onPressEnd() {
  clearTimeout(pressTimer)
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

// The gesture timers must not survive navigation, otherwise a long press fires
// `openAdmin` after the component that owns it is already gone.
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  clearTimeout(logoTimer)
  clearTimeout(pressTimer)
})
</script>

<template>
  <header class="ec-nav" :class="{ 'ec-nav--solid': scrolled }">
    <div class="ec-nav__inner">
      <a
        class="ec-nav__brand"
        href="#top"
        aria-label="English Club UPB, kembali ke atas"
        @click="onLogoClick"
        @pointerdown="onPressStart"
        @pointerup="onPressEnd"
        @pointerleave="onPressEnd"
      >
        <img class="ec-nav__logo" src="/logo-ec.png" alt="" width="36" height="36" />
        <span class="ec-nav__brand-text">
          English Club
          <span class="ec-nav__brand-sub">UPB</span>
        </span>
      </a>

      <nav class="ec-nav__links" aria-label="Navigasi utama">
        <a class="ec-nav__link ec-nav__link--home" href="#top">Home</a>
        <a class="ec-nav__link" href="#happening">What's Happening</a>
        <a class="ec-nav__link" href="#about">About</a>
        <a class="ec-nav__link" href="#stories">Stories</a>
      </nav>

      <div class="ec-nav__account">
        <template v-if="memberName">
          <button class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="emit('goDashboard')">
            Dashboard
          </button>
          <button class="ec-nav__logout" type="button" @click="emit('memberLogout')">
            <LogOut :size="16" :stroke-width="1.9" aria-hidden="true" />
            <span class="ec-sr-only">Keluar dari akun {{ memberName }}</span>
          </button>
        </template>
        <button v-else-if="authEnabled" class="ec-btn ec-btn--primary ec-btn--sm" type="button" @click="emit('goLogin')">
          Masuk
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ec-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  background: transparent;
  transition: background var(--ec-dur) var(--ec-ease), border-color var(--ec-dur) var(--ec-ease);
  border-bottom: 1px solid transparent;
}

.ec-nav--solid {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(1.1) blur(8px);
  -webkit-backdrop-filter: saturate(1.1) blur(8px);
  border-bottom-color: var(--ec-line);
}

.ec-nav__inner {
  display: flex;
  align-items: center;
  gap: var(--ec-space-5);
  width: 100%;
  max-width: var(--ec-container);
  margin: 0 auto;
  min-height: 72px;
  padding-inline: var(--ec-gutter);
}

.ec-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-3);
  color: var(--ec-ink);
  text-decoration: none;
  flex: 0 0 auto;
  touch-action: manipulation;
}

.ec-nav__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  /* logo-ec.png already has a transparent background (alpha 0 at every edge),
     so it needs neither a masking disc nor mix-blend-mode. */
}

.ec-nav__brand-text {
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.ec-nav__brand-sub {
  color: var(--ec-blue);
  font-weight: 700;
}

.ec-nav__links {
  display: flex;
  align-items: center;
  gap: var(--ec-space-5);
  margin-left: auto;
}

.ec-nav__link {
  position: relative;
  padding: 6px 2px;
  color: var(--ec-ink);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--ec-dur) var(--ec-ease);
}

.ec-nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--ec-blue);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--ec-dur) var(--ec-ease);
}

.ec-nav__link:hover {
  color: var(--ec-blue);
}

.ec-nav__link:hover::after {
  transform: scaleX(1);
}

.ec-nav__link:focus-visible {
  outline: none;
  border-radius: var(--ec-radius-sm);
  box-shadow: var(--ec-focus-ring);
}

.ec-nav__account {
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
  flex: 0 0 auto;
  margin-left: auto;
}

.ec-nav__links + .ec-nav__account {
  margin-left: 0;
}

.ec-nav__logout {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  color: var(--ec-ink-soft);
  cursor: pointer;
  transition: color var(--ec-dur) var(--ec-ease), border-color var(--ec-dur) var(--ec-ease);
}

.ec-nav__logout:hover {
  color: var(--ec-blue);
  border-color: #C9DFF5;
}

.ec-nav__logout:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

@media (max-width: 720px) {
  .ec-nav__inner {
    min-height: 64px;
    gap: var(--ec-space-2) var(--ec-space-3);
    flex-wrap: wrap;
    padding-block: 8px;
  }

  .ec-nav__links {
    order: 3;
    flex: 0 0 100%;
    justify-content: center;
    gap: clamp(10px, 4vw, 20px);
    margin-left: 0;
  }

  .ec-nav__link {
    font-size: clamp(0.688rem, 3.2vw, 0.812rem);
  }

  .ec-nav__account {
    margin-left: auto;
  }

  .ec-nav__brand-text {
    font-size: 0.938rem;
  }
}
</style>
