<script setup>
import { computed } from 'vue'

const props = defineProps({
  targets: { type: Array, required: true },    // ['cat', 'dog', 'tree', ...]
  found: { type: Array, default: () => [] },    // kata yang sudah ditemukan sesi ini
  newWord: { type: String, default: null },     // kata yang baru saja masuk
})

const items = computed(() =>
  props.targets.map((w) => ({
    word: w,
    done: props.found.includes(w),
    isNew: w === props.newWord,
  }))
)
</script>

<template>
  <div class="word-list">
    <div class="wl-header">
      <span class="wl-icon">ðŸŽ¯</span>
      <span class="wl-title">CARI KATA</span>
    </div>
    <ul class="wl-items">
      <li
        v-for="item in items"
        :key="item.word"
        class="wl-item"
        :class="{ done: item.done, 'is-new': item.isNew }"
      >
        <span class="wl-check">{{ item.done ? 'âœ“' : 'â—‹' }}</span>
        <span class="wl-word">{{ item.word.toUpperCase() }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.word-list {
  background: #FFFFFF;
  border: 1.5px solid rgba(11, 86, 155, 0.4);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  min-width: 130px;
  backdrop-filter: blur(8px);
}

.wl-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #E2E8F0;
}

.wl-icon {
  font-size: 14px;
}

.wl-title {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--royal-blue);
  text-transform: uppercase;
}

.wl-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 8px;
  background: #F8FAFC;
  border: 1px solid #EEF2F6;
  transition: all 0.25s ease;
}

.wl-item.is-new {
  animation: slide-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border-color: rgba(11, 86, 155, 0.5);
  background: rgba(11, 86, 155, 0.15);
}

.wl-item.done {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.wl-check {
  font-size: 11px;
  width: 14px;
  text-align: center;
  color: var(--text-muted);
  transition: color 0.2s;
}

.wl-item.done .wl-check {
  color: #22c55e;
  font-size: 13px;
}

.wl-word {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: var(--dark-navy);
  letter-spacing: 1px;
  transition: all 0.25s ease;
}

.wl-item.done .wl-word {
  color: #16a34a;
  text-decoration: line-through;
  opacity: 0.7;
}

@keyframes slide-in {
  0% { transform: translateX(20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
</style>

