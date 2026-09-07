<script setup>
defineProps({
  entries: { type: Array, required: true },
})
</script>

<template>
  <ol class="lb">
    <li v-for="(e, i) in entries" :key="i" :class="`rank-row top-${i + 1}`">
      <span class="rank" :class="`rank-${i + 1}`">
        <template v-if="i === 0">👑</template>
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span class="name">{{ e.name }}</span>
      <span class="words-count muted tiny" v-if="e.words">{{ e.words }} kata</span>
      <span class="pts">{{ e.score }} <small>pts</small></span>
    </li>
    <li v-if="!entries.length" class="empty">
      Belum ada skor tercatat. Jadilah yang pertama!
    </li>
  </ol>
</template>

<style scoped>
.lb {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(29, 43, 58, 0.2);
  transition: all 0.15s ease;
}

li:hover {
  background: rgba(29, 43, 58, 0.08);
}

li:last-child {
  border-bottom: none;
}

.top-1 {
  background: transparent;
  border-bottom: 2px solid rgba(29, 43, 58, 0.2);
}

.rank {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 900;
  border-radius: 50%;
  background: rgba(29, 43, 58, 0.15);
  color: var(--dark-navy);
  flex-shrink: 0;
  border: 2px solid var(--dark-navy);
}

.rank-1 {
  background: var(--dark-navy);
  color: var(--vibrant-yellow);
  font-size: 14px;
  box-shadow: none;
  border: 2px solid var(--dark-navy);
}

.rank-2 {
  background: rgba(29, 43, 58, 0.2);
  color: var(--dark-navy);
  font-weight: 900;
  border: 2px solid rgba(29, 43, 58, 0.4);
}

.rank-3 {
  background: rgba(29, 43, 58, 0.2);
  color: var(--dark-navy);
  font-weight: 900;
  border: 2px solid rgba(29, 43, 58, 0.4);
}

.name {
  flex: 1;
  font-weight: 700;
  font-size: 15px;
  color: var(--dark-navy);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row .muted {
  color: var(--dark-navy);
  opacity: 0.65;
}

.words-count {
  margin-right: 4px;
}

.pts {
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  font-size: 16px;
  color: var(--dark-navy);
  font-variant-numeric: tabular-nums;
}

.pts small {
  font-size: 11px;
  color: var(--dark-navy);
  font-weight: 600;
  opacity: 0.7;
}

.empty {
  justify-content: center;
  color: var(--dark-navy);
  font-size: 13px;
  padding: 16px;
  background: transparent;
  border: none;
  opacity: 0.65;
}
</style>
