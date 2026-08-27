<script setup>
defineProps({
  letter: { type: String, required: true },
  selected: { type: Boolean, default: false },
  fresh: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  fever: { type: Boolean, default: false },
})
</script>

<template>
  <div class="tile" :class="{ sel: selected, fever, disabled }" role="gridcell">
    <span class="glyph" :class="{ pop: fresh }">{{ letter.toUpperCase() }}</span>
  </div>
</template>

<style scoped>
.tile {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background: #FFFFFF;
  border: clamp(2px, 0.45vw, 3px) solid #172B6B;
  border-radius: clamp(9px, 2.2vw, 15px);
  box-shadow: 0 3px 0 rgba(23, 43, 107, 0.88);
  transition:
    transform 0.1s cubic-bezier(0.2, 0, 0, 1),
    background 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease;
  position: relative;
  overflow: hidden;
}

.tile:hover {
  background: #F7F4DF;
  transform: translateY(-2px);
  box-shadow: 0 5px 0 rgba(23, 43, 107, 0.88);
}

.tile:active {
  transform: translateY(2px) scale(0.98);
  box-shadow: 0 1px 0 rgba(23, 43, 107, 0.88);
}

.glyph {
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  /* Font lebih kecil untuk 5x5 */
  font-size: clamp(18px, 5.5vw, 32px);
  color: #172B6B;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* Selected state during swipe */
.tile.sel {
  background: #B8D96B;
  border-color: #172B6B;
  transform: translateY(-3px) scale(1.035);
  box-shadow: 0 6px 0 #527F25;
  z-index: 2;
}

.tile.sel .glyph {
  color: var(--dark-navy);
  text-shadow: none;
  font-weight: 900;
}

.tile.sel.fever {
  background: var(--vibrant-yellow);
  border-color: #C79000;
  box-shadow: 0 6px 0 #C79000, 0 0 20px rgba(255, 230, 0, 0.75);
  animation: fever-glow 0.5s infinite alternate;
}

@keyframes fever-glow {
  from { transform: translateY(-3px) scale(1.035); filter: brightness(1); }
  to { transform: translateY(-3px) scale(1.06); filter: brightness(1.12); }
}

.tile.disabled {
  background: #E9E7D8;
  color: #6B7596;
  transform: none;
  box-shadow: none;
}

.tile.disabled .glyph {
  color: #6B7596;
}

.tile.disabled:hover,
.tile.disabled:active {
  transform: none;
  box-shadow: none;
}

/* Fresh tile drop-in animation */
.pop {
  animation: popin 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popin {
  0% { transform: scale(0.25); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
