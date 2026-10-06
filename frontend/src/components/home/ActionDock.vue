<script setup>
import { computed } from 'vue'
import { BookOpen, CalendarCheck, Gamepad2, Home } from 'lucide-vue-next'
import HorizontalRail from '../ui/HorizontalRail.vue'

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
  <div class="dock">
    <HorizontalRail label="Aksi cepat English Club" :fade="false">
      <div v-for="item in items" :key="item.key" class="ec-rail__item">
        <button class="dock__item" type="button" @click="emit('action', item.key)">
          <component :is="item.icon" :size="20" :stroke-width="1.8" aria-hidden="true" />
          <span class="dock__label">{{ item.label }}</span>
          <span class="ec-sr-only">{{ item.hint }}</span>
        </button>
      </div>
    </HorizontalRail>
  </div>
</template>

<style scoped>
.dock {
  width: fit-content;
  max-width: 100%;
  padding: 10px 12px;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  box-shadow: var(--ec-shadow-md);
}

.dock :deep(.ec-rail__track) {
  justify-content: center;
}

.dock__item {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-2);
  min-height: 52px;
  padding: 12px 22px;
  border: 0;
  border-radius: var(--ec-radius-pill);
  background: transparent;
  color: var(--ec-ink);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--ec-dur) var(--ec-ease), color var(--ec-dur) var(--ec-ease);
}

.dock__item:hover {
  background: var(--ec-blue-050);
  color: var(--ec-blue);
}

.dock__item:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

.dock__item:active {
  background: var(--ec-blue-100);
}

@media (max-width: 720px) {
  .dock {
    padding: 6px;
    border-radius: var(--ec-radius-md);
  }

  .dock :deep(.ec-rail__track) {
    justify-content: flex-start;
  }

  .dock__item {
    min-height: 46px;
    padding: 9px 14px;
    font-size: 0.844rem;
  }
}
</style>
