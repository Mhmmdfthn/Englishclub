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
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: #F8FAFC;
  border: 1px solid #EEF2F6;
  transition: all 0.15s ease;
}

li:hover {
  background: rgba(11, 86, 155, 0.06);
  border-color: rgba(11, 86, 155, 0.25);
}

.top-1 {
  background: rgba(255, 230, 0, 0.14);
  border-color: rgba(230, 194, 0, 0.45);
}

.rank {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 900;
  border-radius: 50%;
  background: #E8EEF4;
  color: var(--text-sub);
  flex-shrink: 0;
}

.rank-1 {
  background: var(--vibrant-yellow);
  color: var(--dark-navy);
  font-size: 13px;
  box-shadow: 0 0 10px rgba(255, 230, 0, 0.5);
}

.rank-2 {
  background: var(--light-gray);
  color: var(--dark-navy);
  font-weight: 900;
}

.rank-3 {
  background: var(--royal-blue-light);
  color: var(--pure-white);
  font-weight: 900;
}

.name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: var(--dark-navy);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.words-count {
  margin-right: 4px;
}

.pts {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 15px;
  color: var(--royal-blue);
  font-variant-numeric: tabular-nums;
}

.pts small {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.empty {
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 16px;
  background: transparent;
  border: 1px dashed #CBD5E1;
}
</style>
