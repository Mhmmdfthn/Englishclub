<script setup>
defineProps({
  letter: { type: String, required: true },
  selected: { type: Boolean, default: false },
  fresh: { type: Boolean, default: false },
})
</script>

<template>
  <div class="tile" :class="{ sel: selected }">
    <span class="glyph" :class="{ pop: fresh }">{{ letter.toUpperCase() }}</span>
  </div>
</template>

<style scoped>
.tile {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #FFFFFF, #EDF3F9);
  border: 1.5px solid var(--tile-border);
  border-radius: clamp(8px, 2vw, 13px);
  box-shadow: 0 3px 8px rgba(29, 43, 58, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9);
  transition:
    transform 0.1s cubic-bezier(0.2, 0, 0, 1),
    background 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease;
  position: relative;
  overflow: hidden;
}

.tile:hover {
  border-color: rgba(11, 86, 155, 0.6);
  background: linear-gradient(145deg, #F4F9FE, #E3EEF9);
}

.glyph {
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  /* Font lebih kecil untuk 5x5 */
  font-size: clamp(18px, 5.5vw, 32px);
  color: var(--dark-navy);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* Selected state during swipe */
.tile.sel {
  background: linear-gradient(145deg, #FFF04D, var(--vibrant-yellow));
  border-color: #E6C200;
  transform: scale(1.09);
  box-shadow: 0 0 18px rgba(255, 230, 0, 0.75), 0 6px 14px rgba(29, 43, 58, 0.2);
  z-index: 2;
}

.tile.sel .glyph {
  color: var(--dark-navy);
  text-shadow: none;
  font-weight: 900;
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
