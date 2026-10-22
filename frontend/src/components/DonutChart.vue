<script setup>
// Donut chart SVG murni (tanpa dependency). Dipakai untuk statistik
// kehadiran overall dan per kelompok di layar Display QR.
import { computed } from 'vue'

const props = defineProps({
  // [{ key, label, value, color }]
  segments: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  size: { type: Number, default: 200 },
  thickness: { type: Number, default: 22 },
  gap: { type: Number, default: 2 },
  centerValue: { type: [String, Number], default: '' },
  centerLabel: { type: String, default: '' },
  trackColor: { type: String, default: '#E5E7EB' },
})

const radius = computed(() => Math.max(1, (props.size - props.thickness) / 2))
const circumference = computed(() => 2 * Math.PI * radius.value)
const activeSegments = computed(() =>
  props.segments.filter((segment) => Number(segment.value) > 0),
)
const ringTotal = computed(() =>
  activeSegments.value.reduce((sum, segment) => sum + Number(segment.value), 0),
)
const arcs = computed(() => {
  if (!ringTotal.value) return []
  let offset = 0
  return activeSegments.value.map((segment) => {
    const value = Number(segment.value)
    const length = (value / ringTotal.value) * circumference.value
    const arc = {
      key: segment.key || segment.label,
      label: segment.label,
      color: segment.color,
      value,
      dash: Math.max(0, length - props.gap),
      offset,
    }
    offset += length
    return arc
  })
})
const ariaLabel = computed(() => {
  if (!props.total) return 'Belum ada data kehadiran.'
  const parts = props.segments
    .filter((segment) => Number(segment.value) > 0)
    .map((segment) => `${segment.label} ${segment.value}`)
  return `Total ${props.total}. ${parts.join(', ')}.`
})
</script>

<template>
  <div
    class="donut"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="ariaLabel"
  >
    <svg
      class="donut__svg"
      :viewBox="`0 0 ${size} ${size}`"
      :width="size"
      :height="size"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="trackColor"
        :stroke-width="thickness"
      />
      <circle
        v-for="arc in arcs"
        :key="arc.key"
        class="donut__seg"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        :stroke-width="thickness"
        stroke-linecap="butt"
        :stroke-dasharray="`${arc.dash} ${Math.max(0, circumference - arc.dash)}`"
        :stroke-dashoffset="-arc.offset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      >
        <title>{{ arc.label }}: {{ arc.value }}</title>
      </circle>
    </svg>
    <div v-if="centerValue !== '' || centerLabel" class="donut__center">
      <strong v-if="centerValue !== ''" :style="{ fontSize: `${Math.round(size * 0.19)}px` }">{{ centerValue }}</strong>
      <small v-if="centerLabel" :style="{ fontSize: `${Math.max(10, Math.round(size * 0.072))}px` }">{{ centerLabel }}</small>
    </div>
  </div>
</template>

<style scoped>
.donut { position: relative; display: grid; place-items: center; flex: 0 0 auto; max-width: 100%; }
.donut__svg { display: block; width: 100%; height: 100%; }
.donut__seg { transition: stroke-dasharray 220ms ease; }
.donut__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; text-align: center; line-height: 1.1; color: inherit; pointer-events: none; }
.donut__center strong { font-family: 'Outfit', sans-serif; font-weight: 800; }
.donut__center small { opacity: 0.7; font-weight: 600; letter-spacing: 0.02em; }
@media (prefers-reduced-motion: reduce) {
  .donut__seg { transition: none; }
}
</style>
