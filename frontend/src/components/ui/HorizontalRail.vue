<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * HorizontalRail — shared scroll-rail behaviour for the homepage.
 *
 * Why this exists (PRD_Homepage_Redesign §7.3 / §7.4, FE-DESIGN-SYSTEM §2B):
 * the Action Dock, the program list and Stories are all explored horizontally.
 * Native scrollbar styling is hidden app-wide, so the rail has to stay usable
 * without a visible bar: mouse/trackpad drag, touch swipe, arrow keys and a
 * visible focus ring.
 *
 * The component owns scrolling only. Items come from the default slot; wrap each
 * item in `.ec-rail__item` so scroll snapping works.
 */
const props = defineProps({
  label: { type: String, default: 'Scrollable content' },
  fade: { type: Boolean, default: true },
  /**
   * Auto-drift speed in px/second. 0 (the default) leaves the rail manual.
   * Opt-in per rail: Stories drifts, the program list stays put.
   */
  autoplaySpeed: { type: Number, default: 0 },
})

const track = ref(null)
const canScrollBack = ref(false)
const canScrollForward = ref(false)
const drifting = ref(false)
const autoplayEnabled = ref(true)
let dragState = null
let suppressNextClick = false
let resizeObserver = null
let measureQueued = false

function measure() {
  const el = track.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  canScrollBack.value = el.scrollLeft > 4
  canScrollForward.value = el.scrollLeft < maxScroll - 4
}

// A drifting rail fires `scroll` every frame. Coalescing the read keeps layout
// thrashing down without the fades visibly lagging behind the content.
function requestMeasure() {
  if (measureQueued) return
  measureQueued = true
  requestAnimationFrame(() => {
    measureQueued = false
    measure()
  })
}

function scrollByStep(dir) {
  const el = track.value
  if (!el) return
  // Step by one visible item so keyboard paging matches what a person sees.
  const first = el.querySelector('.ec-rail__item')
  const styles = getComputedStyle(el)
  const gap = parseFloat(styles.columnGap) || 0
  const width = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.8
  el.scrollBy({ left: dir * width, behavior: 'smooth' })
}

function onKeydown(event) {
  if (event.key === 'ArrowRight') { event.preventDefault(); scrollByStep(1) }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); scrollByStep(-1) }
  else if (event.key === 'Home') { event.preventDefault(); track.value?.scrollTo({ left: 0, behavior: 'smooth' }) }
  else if (event.key === 'End') {
    event.preventDefault()
    const el = track.value
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
  }
}

function onPointerDown(event) {
  // Pointer menempel = drift ditahan sesaat supaya drag manual tidak dilawan.
  // Dilepas (pointerup/cancel) langsung jalan lagi tanpa jeda.
  pointerContact = true
  syncDrift()
  // Touch keeps native scrolling; only mouse/pen get drag-to-scroll.
  if (event.pointerType === 'touch') return
  if (event.button !== 0) return
  const el = track.value
  if (!el) return
  // Every new gesture starts able to activate things again. Without this a drag
  // that never produced a click (e.g. released outside the rail) would leave the
  // flag set and silently swallow the visitor's next real click.
  suppressNextClick = false
  dragState = { startX: event.clientX, startScroll: el.scrollLeft }
  el.setPointerCapture(event.pointerId)
  el.style.userSelect = 'none'
}

function onPointerMove(event) {
  const el = track.value
  if (!dragState || !el) return
  const delta = event.clientX - dragState.startX
  if (Math.abs(delta) > 6) {
    suppressNextClick = true
    event.preventDefault()
  }
  el.scrollLeft = dragState.startScroll - delta
}

function endDrag(event) {
  const el = track.value
  if (dragState && el && el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId)
  if (el) el.style.userSelect = ''
  dragState = null
  // Jari/mouse diangkat: drift langsung lanjut lagi.
  if (pointerContact) {
    pointerContact = false
    syncDrift()
  }
}

function onTrackClick(event) {
  if (!suppressNextClick) return
  // Swallow the click that ends a drag so it never opens a card by accident.
  event.preventDefault()
  event.stopPropagation()
  suppressNextClick = false
}

const fadeStart = computed(() => props.fade && canScrollBack.value)
const fadeEnd = computed(() => props.fade && canScrollForward.value)

/* ----------------------------------------------------------------------- *
 * Auto-drift
 *
 * Frame-time driven rather than setInterval: the speed stays constant when
 * frames drop, so a busy main thread slows the animation down smoothly instead
 * of stuttering it.
 *
 * Drift jalan terus: tidak ada jeda di ujung (langsung sambung ke awal) dan
 * hover, fokus keyboard, maupun scroll manual tidak menghentikannya. Satu-satunya
 * jeda adalah selama pointer menempel (jari/mouse ditekan) supaya drag manual
 * tidak dilawan, plus tombol pause di pojok rail (WCAG 2.2.2).
 * `prefers-reduced-motion` mematikan drift sepenuhnya, dan tab yang
 * disembunyikan tidak ikut dianimasikan.
 * ------------------------------------------------------------------------ */
let rafId = null
let lastFrame = 0
let pointerContact = false

const motionQuery =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

// Reduced motion means no drift at all, so the stop control would be dead
// weight. Hide it instead of shipping a button that does nothing.
const motionOk = ref(!motionQuery?.matches)

function scheduleFrame() {
  if (rafId == null) rafId = requestAnimationFrame(driftTick)
}

function driftTick(now) {
  rafId = null
  const el = track.value
  if (!el) return
  // Clamp the step so returning to a backgrounded tab does not jump the rail
  // a whole screen in one frame.
  const dt = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now

  const maxScroll = el.scrollWidth - el.clientWidth
  if (maxScroll <= 1) return // nothing to drift across

  // Langsung sambung ke awal tanpa jeda; sisa langkah dibawa serta supaya
  // kecepatannya konstan persis di titik sambungan.
  const next = el.scrollLeft + props.autoplaySpeed * dt
  el.scrollLeft = next >= maxScroll ? next - maxScroll : next
  scheduleFrame()
}

function shouldDrift() {
  return props.autoplaySpeed > 0
    && autoplayEnabled.value
    && !motionQuery?.matches
    && !pointerContact
    && !document.hidden
}

function syncDrift() {
  const run = shouldDrift()
  drifting.value = run
  if (run) {
    if (rafId == null) {
      lastFrame = performance.now()
      scheduleFrame()
    }
  } else if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function toggleAutoplay() {
  autoplayEnabled.value = !autoplayEnabled.value
  syncDrift()
}

function onMotionChange() {
  motionOk.value = !motionQuery?.matches
  syncDrift()
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && track.value) {
    resizeObserver = new ResizeObserver(requestMeasure)
    resizeObserver.observe(track.value)
  }
  window.addEventListener('resize', requestMeasure)
  // Covers are lazy-loaded, so the rail is often measured before its content has
  // a width. Re-measure once the page has settled, otherwise the end fade stays
  // hidden (or shows) incorrectly.
  window.addEventListener('load', measure)
  window.addEventListener('visibilitychange', syncDrift)
  motionQuery?.addEventListener?.('change', onMotionChange)
  syncDrift()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', requestMeasure)
  window.removeEventListener('load', measure)
  window.removeEventListener('visibilitychange', syncDrift)
  motionQuery?.removeEventListener?.('change', onMotionChange)
  if (rafId != null) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
})

defineExpose({
  scrollPrev: () => scrollByStep(-1),
  scrollNext: () => scrollByStep(1),
  toggleAutoplay,
  canScrollBack,
  canScrollForward,
  autoplayEnabled,
})
</script>

<template>
  <div class="ec-rail">
    <span v-if="fadeStart" class="ec-rail__fade ec-rail__fade--start" aria-hidden="true"></span>
    <span v-if="fadeEnd" class="ec-rail__fade ec-rail__fade--end" aria-hidden="true"></span>

    <div
      ref="track"
      class="ec-rail__track"
      :class="{ 'ec-rail__track--drifting': drifting }"
      role="group"
      :aria-label="label"
      tabindex="0"
      @keydown="onKeydown"
      @scroll.passive="requestMeasure"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @click.capture="onTrackClick"
    >
      <slot />
    </div>

    <button
      v-if="autoplaySpeed > 0 && motionOk"
      class="ec-rail__autoplay"
      type="button"
      :aria-pressed="autoplayEnabled"
      :aria-label="autoplayEnabled ? 'Hentikan geser otomatis' : 'Jalankan geser otomatis'"
      @click="toggleAutoplay"
    >
      <svg
        v-if="autoplayEnabled"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor" />
        <rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor" />
      </svg>
      <svg v-else width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path
          d="M2.9 1.9v8.2a.6.6 0 0 0 .93.5l6.4-4.1a.6.6 0 0 0 0-1L3.83 1.4a.6.6 0 0 0-.93.5Z"
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
</template>
