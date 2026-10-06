<script setup>
import PublicNavbar from './home/PublicNavbar.vue'
import HeroSection from './home/HeroSection.vue'
import HappeningSection from './home/HappeningSection.vue'
import AboutSection from './home/AboutSection.vue'
import StoriesSection from './home/StoriesSection.vue'
import SiteFooter from './home/SiteFooter.vue'

/**
 * LandingView — the public homepage.
 *
 * Structure follows PRD_Homepage_Redesign §6 (locked):
 *   Sticky Navbar → Hero (+ Action Dock) → What's Happening → About → Stories → Footer
 *
 * This file is now only the composition shell. Every section owns its own data and its
 * own loading / empty / error states, and all events still bubble up to App.vue, which
 * keeps owning routing, member session and the Word Hunt logic. No route, API call or
 * existing behaviour was changed here.
 */
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
  'openAdmin',
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
  <div class="screen ec-home">
    <PublicNavbar
      :member-name="memberName"
      :auth-enabled="MEMBER_AUTH_ON"
      @go-login="emit('goLogin')"
      @go-dashboard="emit('goDashboard')"
      @member-logout="emit('memberLogout')"
      @open-admin="emit('openAdmin')"
    />

    <main class="landing__main">
      <HeroSection :authenticated="!!memberName" @action="onDockAction" />

      <HappeningSection @open="emit('goArticle', $event)" />

      <AboutSection />

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
.landing__main {
  /* The header and footer are siblings of main, not children, so the page has a
     real content landmark for assistive tech. */
  display: block;
  width: 100%;
}
</style>
