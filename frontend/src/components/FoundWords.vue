<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
})

const listRef = ref(null)

watch(
  () => props.items.length,
  (now, before) => {
    if (now > before && listRef.value) {
      nextTick(() => {
        listRef.value.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
      })
    }
  },
)
</script>

<template>
  <div v-if="items.length" class="found-container card">
    <div class="found-header">
      <span class="title-found">KATA DITEMUKAN ({{ items.length }})</span>
    </div>
    <div class="found-list" ref="listRef">
      <span
        v-for="(it, n) in items"
        :key="n"
        class="chip"
        :class="{ last: n === items.length - 1 }"
      >
        <span class="chip-word">{{ it.word.toUpperCase() }}</span>
        <span class="chip-pts">+{{ it.points }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.found-container {
  width: 100%;
  padding: 12px 14px;
  background: var(--pure-white);
  border: 2px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 4px 4px 0 var(--dark-navy);
}

.found-header {
  margin-bottom: 8px;
}

.title-found {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: var(--royal-blue);
  text-transform: uppercase;
}

.found-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 90px;
  overflow-y: auto;
  padding-right: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 0;
  background: rgba(11, 86, 155, 0.08);
  border: 2px solid var(--dark-navy);
  color: var(--royal-blue);
  transition: all 0.15s ease;
}

.chip-word {
  letter-spacing: 0.08em;
}

.chip-trans {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  font-style: italic;
  text-transform: lowercase;
}
.chip-pts {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  color: var(--dark-navy);
}

.chip.last {
  background: rgba(255, 230, 0, 0.4);
  border-color: var(--dark-navy);
  box-shadow: 3px 3px 0 var(--dark-navy);
  transform: scale(1.02);
  animation: chip-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes chip-in {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1.02); opacity: 1; }
}

.chip.last .chip-word {
  color: var(--dark-navy);
}

.chip.last .chip-pts {
  color: var(--dark-navy);
}
</style>
