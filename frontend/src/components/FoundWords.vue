<script setup>
defineProps({
  items: { type: Array, required: true },
})
</script>

<template>
  <div v-if="items.length" class="found-container card">
    <div class="found-header">
      <span class="title-found">KATA DITEMUKAN ({{ items.length }})</span>
    </div>
    <div class="found-list">
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
  padding: 10px 14px;
  background: #FFFFFF;
  border: 1px solid var(--panel-border);
}

.found-header {
  margin-bottom: 6px;
}

.title-found {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.found-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 80px;
  overflow-y: auto;
  padding-right: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: rgba(11, 86, 155, 0.08);
  border: 1px solid rgba(11, 86, 155, 0.35);
  color: var(--royal-blue);
  transition: all 0.15s ease;
}

.chip-word {
  letter-spacing: 0.5px;
}

.chip-pts {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  color: var(--royal-blue-light);
}

.chip.last {
  background: rgba(255, 230, 0, 0.28);
  border-color: var(--vibrant-yellow);
  box-shadow: 0 0 10px rgba(255, 230, 0, 0.4);
  transform: scale(1.04);
}

.chip.last .chip-word {
  color: var(--dark-navy);
}

.chip.last .chip-pts {
  color: var(--dark-navy);
}
</style>
