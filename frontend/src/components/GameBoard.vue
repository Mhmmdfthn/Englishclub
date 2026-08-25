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

function idxFromEvent(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const tile = el ? el.closest('.tile') : null
  return tile ? Number(tile.dataset.idx) : null
}

function pushSelect() {
  emit('select', path.value.map((i) => props.cells[i].letter).join(''))
}

function onMove(e) {
  if (!active) return
  const idx = idxFromEvent(e)
  if (idx == null || path.value.includes(idx)) return
  if (!adjacent(path.value[path.value.length - 1], idx)) return
  path.value.push(idx)
  sound.playSelect()
  pushSelect()
}

function finish() {
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
}

function reset() {
  active = false
  path.value = []
  pushSelect()
}

function begin(e) {
  if (props.disabled) return
  e.preventDefault()
  const idx = idxFromEvent(e)
  if (idx == null) return
  active = true
  path.value = [idx]
  sound.playSelect()
  pushSelect()
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', finish, { once: true })
  window.addEventListener('pointercancel', cancel, { once: true })
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
      }"
      @pointerdown="begin"
    >
      <TileCell
        v-for="cell in cells"
        :key="`${cell.i}-${cell.token}`"
        :data-idx="cell.i"
        :letter="cell.letter"
        :selected="selectedSet.has(cell.i)"
        :fresh="cell.token > 0"
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
}

.board {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(4px, 1.4vw, 10px);
  width: min(96vw, 52dvh, 460px);
  aspect-ratio: 1;
  padding: clamp(8px, 2vw, 14px);
  background: linear-gradient(180deg, #FFFFFF 0%, #F2F7FC 100%);
  border: 1.5px solid rgba(29, 43, 58, 0.12);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 36px rgba(29, 43, 58, 0.14), 0 0 24px rgba(11, 86, 155, 0.12);
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

.board.fever-board {
  border-color: var(--vibrant-yellow);
  box-shadow: 0 0 35px rgba(255, 230, 0, 0.5), 0 12px 36px rgba(29, 43, 58, 0.15);
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
