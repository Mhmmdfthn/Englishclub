<script setup>
import PublicNavbar from './home/PublicNavbar.vue'
import HeroSection from './home/HeroSection.vue'
import HappeningSection from './home/HappeningSection.vue'
import AboutSection from './home/AboutSection.vue'
import StoriesSection from './home/StoriesSection.vue'
import SiteFooter from './home/SiteFooter.vue'


const props = defineProps({
  memberName: { type: String, default: '' },
})

const emit = defineEmits([
  'goPlay',
  'goBoard',
  'goLogin',
  'goSignup',
  'goDashboard',
  'memberLogout',
  'goArticle',
])

// Deploy flag, baked at build time: false hides the member auth entry points.
const MEMBER_AUTH_ON = import.meta.env.VITE_MEMBER_AUTH_ENABLED !== 'false'

function scrollToTop() {
  const top = document.getElementById('top')
  if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Action Dock routing.
 * `Absen` and `Materi` have no backend contract yet (FE-TASKS §2, FE-FLOW §4A), so they
 * land on the member dashboard — or on Login for guests. No endpoint is invented.
 */
function onDockAction(key) {
  if (key === 'home') return scrollToTop()
  if (key === 'word-hunt') return emit('goPlay')
  if (key === 'absen' || key === 'materi') {
    return props.memberName ? emit('goDashboard') : emit('goLogin')
  }
}
</script>

<template>
  <div class="ec-home-shell">
    <PublicNavbar
      :member-name="memberName"
      :auth-enabled="MEMBER_AUTH_ON"
      @go-login="emit('goLogin')"
      @go-dashboard="emit('goDashboard')"
      @member-logout="emit('memberLogout')"
    />

    <main class="landing__main">
      <HeroSection :authenticated="!!memberName" @action="onDockAction" />

      <AboutSection />

      <HappeningSection @open="emit('goArticle', $event)" />

      <StoriesSection />
    </main>

    <SiteFooter
      :member-name="memberName"
      :auth-enabled="MEMBER_AUTH_ON"
      @go-play="emit('goPlay')"
      @go-board="emit('goBoard')"
      @go-login="emit('goLogin')"
      @go-signup="emit('goSignup')"
    />
  </div>
</template>

<style scoped>
.ec-home-shell {
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--ec-surface, #ffffff);
  color: var(--ec-ink, #1f2937);
  user-select: text;
  -webkit-user-select: text;
  overflow-x: clip;
}

.landing__main {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 0 auto;
}
</style>
