<script setup>
import { computed } from 'vue'
import { BookOpen, CalendarCheck, Gamepad2, Home } from 'lucide-vue-next'

/**
 * ActionDock — direct access to the actions that matter, attached to the hero.
 *
 * PRD_Homepage_Redesign §7.3: items are locked as Home | Absen | Materi | Word Hunt,
 * and the dock must NOT read as a second navbar. So: no section heading, no icon
 * containers, no page links — just actions.
 *
 * `Absen` and `Materi` have no backend contract yet (FE-TASKS §2, FE-FLOW §4A), so
 * they route to the member dashboard, or to Login for guests. No endpoint is invented.
 */
const props = defineProps({
  authenticated: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])

const items = computed(() => [
  { key: 'home', label: 'Home', icon: Home, hint: 'Kembali ke bagian atas' },
  {
    key: 'absen',
    label: 'Absen',
    icon: CalendarCheck,
    hint: props.authenticated ? 'Buka dashboard untuk absen' : 'Masuk dulu untuk absen',
  },
  {
    key: 'materi',
    label: 'Materi',
    icon: BookOpen,
    hint: props.authenticated ? 'Buka dashboard untuk materi' : 'Masuk dulu untuk materi',
  },
  { key: 'word-hunt', label: 'Word Hunt', icon: Gamepad2, hint: 'Susun kata dari huruf yang berdekatan' },
])
</script>

<template>
  <nav class="dock" aria-label="Aksi cepat English Club">
    <div class="dock__track">
      <button
        v-for="item in items"
        :key="item.key"
        class="dock__item"
        :class="{ 'dock__item--special': item.key === 'word-hunt' }"
        type="button"
        @click="emit('action', item.key)"
      >
        <span class="dock__icon" aria-hidden="true">
          <component :is="item.icon" :size="18" :stroke-width="2.2" />
        </span>
        <span class="dock__label">{{ item.label }}</span>
        <span class="ec-sr-only">{{ item.hint }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.dock {
  width: fit-content;
  max-width: 100%;
  padding: 6px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(11, 86, 155, 0.14);
  border-radius: var(--ec-radius-pill);
  box-shadow: 0 10px 30px -10px rgba(11, 86, 155, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04);
}

.dock__track {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 2px;
}

.dock__track::-webkit-scrollbar {
  display: none;
}

.dock__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: var(--ec-radius-pill);
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--ec-dur) var(--ec-ease);
}

.dock__icon {
  display: grid;
  place-items: center;
  color: var(--ec-blue);
  transition: transform var(--ec-dur) var(--ec-ease), color var(--ec-dur) var(--ec-ease);
}

.dock__item:hover {
  background: var(--ec-blue-050);
  color: var(--ec-blue);
  border-color: rgba(11, 86, 155, 0.1);
  transform: translateY(-1px);
}

.dock__item:hover .dock__icon {
  transform: scale(1.12);
}

.dock__item:active {
  background: var(--ec-blue-100);
  transform: translateY(0);
}

.dock__item--special {
  background: rgba(255, 230, 0, 0.14);
  border-color: rgba(255, 230, 0, 0.4);
}

.dock__item--special:hover {
  background: rgba(255, 230, 0, 0.26);
  border-color: rgba(255, 230, 0, 0.7);
  color: var(--ec-ink);
}

.dock__item--special .dock__icon {
  color: #B45309;
}

.dock__item:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

@media (max-width: 640px) {
  .dock {
    width: 100%;
    max-width: 100%;
    border-radius: var(--ec-radius-lg);
    overflow: hidden;
  }

  .dock__track {
    justify-content: flex-start;
    padding-inline: 4px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .dock__item {
    min-height: 44px;
    padding: 10px 14px;
    font-size: 0.813rem;
    scroll-snap-align: start;
    flex: 0 0 auto;
  }
}
</style>
