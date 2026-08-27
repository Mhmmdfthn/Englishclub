<script setup>
import { computed, onBeforeUnmount, watch, ref } from 'vue'
import { sound } from '../audio.js'
import TileCell from './TileCell.vue'

const props = defineProps({
  cells: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
  shakeStamp: { type: Number, default: 0 },
  fever: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'select'])

const SIZE = 5
const path = ref([])
let active = false

const rcOf = (i) => [Math.floor(i / SIZE), i % SIZE]

function adjacent(a, b) {
  const [r1, c1] = rcOf(a)
  const [r2, c2] = rcOf(b)
  return a !== b && Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1
}

function getClientPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  return { x: e.clientX, y: e.clientY }
}

function idxFromEvent(e) {
  const { x, y } = getClientPos(e)
  const el = document.elementFromPoint(x, y)
  const tile = el ? el.closest('.tile') : null
  return tile ? Number(tile.dataset.idx) : null
}

function pushSelect() {
  emit('select', path.value.map((i) => props.cells[i].letter).join(''))
}

function onMove(e) {
  if (!active) return
  if (e.cancelable) e.preventDefault()
  const idx = idxFromEvent(e)
  if (idx == null || path.value.includes(idx)) return
  if (!adjacent(path.value[path.value.length - 1], idx)) return
  path.value.push(idx)
  sound.playSelect()
  pushSelect()
}

function finish(e) {
  if (e && e.cancelable) e.preventDefault()
  detach()
  if (path.value.length >= 3) emit('submit', [...path.value])
  reset()
}

function cancel() {
  detach()
  reset()
}

function detach() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('pointerup', finish)
  window.removeEventListener('touchend', finish)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('touchcancel', cancel)
}

function reset() {
  active = false
  path.value = []
  pushSelect()
}

function begin(e) {
  if (props.disabled) return
  if (e.cancelable) e.preventDefault()
  const idx = idxFromEvent(e)
  if (idx == null) return
  active = true
  path.value = [idx]
  sound.playSelect()
  pushSelect()
  // Pointer events (desktop + modern mobile)
  window.addEventListener('pointermove', onMove, { passive: false })
  window.addEventListener('pointerup', finish, { once: true })
  window.addEventListener('pointercancel', cancel, { once: true })
  // Touch fallback (iOS Safari lama / WebView yang tidak fire pointermove dengan benar)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', finish, { once: true })
  window.addEventListener('touchcancel', cancel, { once: true })
  // Capture pointer agar tetap dapat move meski jari keluar tile
  try { e.target?.setPointerCapture?.(e.pointerId) } catch {}
}

onBeforeUnmount(detach)

const selectedSet = computed(() => new Set(path.value))

const shaking = ref(false)
watch(
  () => props.shakeStamp,
  () => {
    shaking.value = false
    requestAnimationFrame(() => {
      shaking.value = true
      setTimeout(() => (shaking.value = false), 400)
    })
  },
)
</script>

<template>
  <div class="board-wrapper">
    <div
      class="board"
      :class="{
        shake: shaking,
        'fever-board': fever,
        'board-disabled': disabled,
      }"
      role="grid"
      aria-label="Word Hunt letter board"
      :aria-disabled="disabled"
      @pointerdown="begin"
      @touchstart.prevent="begin"
    >
<TileCell
        v-for="cell in cells"
        :key="`${cell.i}-${cell.token}`"
        :data-idx="cell.i"
        :letter="cell.letter"
        :selected="selectedSet.has(cell.i)"
        :fresh="cell.token > 0"
        :disabled="disabled"
        :fever="fever && selectedSet.has(cell.i)"
      />
    </div>
  </div>
</template>

<style scoped>
.board-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2px 0 8px;
}

.board {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(5px, 1.5vw, 10px);
  width: min(94vw, 56dvh, 470px);
  aspect-ratio: 1;
  padding: clamp(8px, 2.2vw, 15px);
  background: #172B6B;
  border: clamp(3px, 0.8vw, 5px) solid #172B6B;
  border-radius: clamp(18px, 4vw, 28px);
  box-shadow: 7px 8px 0 #B8D96B, 0 12px 20px rgba(23, 43, 107, 0.18);
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  transition: box-shadow 0.16s ease, transform 0.16s ease, opacity 0.16s ease;
  position: relative;
  isolation: isolate;
}

.board::before {
  content: 'WORD HUNT';
  position: absolute;
  top: -13px;
  left: 50%;
  z-index: 3;
  padding: 3px 12px 4px;
  border: 3px solid #172B6B;
  border-radius: 8px;
  color: #172B6B;
  background: #F7F4DF;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(9px, 2.3vw, 12px);
  font-weight: 900;
  letter-spacing: 0.16em;
  line-height: 1;
  transform: translateX(-50%);
  pointer-events: none;
}

.board.fever-board {
  border-color: #527F25;
  box-shadow: 7px 8px 0 #B8D96B, 0 0 0 5px rgba(184, 217, 107, 0.55), 0 12px 20px rgba(23, 43, 107, 0.2);
}

.board.board-disabled {
  opacity: 0.68;
  cursor: not-allowed;
}

.board:not(.board-disabled):active {
  transform: translate(2px, 2px);
  box-shadow: 5px 6px 0 #B8D96B, 0 8px 16px rgba(23, 43, 107, 0.16);
}

@media (min-width: 700px) {
  .board-wrapper {
    padding-top: 8px;
  }
}

/* Shake animation saat kata salah */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
.board.shake { animation: shake 0.35s ease; }
</style>
