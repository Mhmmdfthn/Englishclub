<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 0 },
  combo: { type: Number, default: 1 },
  word: { type: String, default: '' },
  fever: { type: Boolean, default: false },
})

const pct = computed(() =>
  Math.max(0, Math.min(100, (props.timeLeft / 60) * 100)),
)

const display = computed(() => props.word || 'GESER HURUF')
</script>

<template>
  <header class="hud card" :class="{ 'fever-mode': fever }">
    <div class="row">
      <!-- Score -->
      <div class="stat score-box">
        <span class="label">SKOR</span>
        <span class="val">{{ score }}</span>
      </div>

      <!-- Timer Centerpiece -->
      <div class="time-container" :class="{ low: timeLeft <= 10 }">
        <div class="time-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="time-num">{{ Math.ceil(timeLeft) }}</span>
          <span class="time-unit">s</span>
        </div>
      </div>

      <!-- Combo & Rush Badge -->
      <div class="stat combo-box">
        <div class="combo-header">
          <span v-if="combo >= 3" class="fever-tag">🔥 RUSH</span>
          <span class="label">COMBO</span>
        </div>
        <span class="val combo-val" :class="{ 'combo-high': combo >= 3 }">
          x{{ combo }}
        </span>
      </div>
    </div>

    <!-- Time Progress Bar -->
    <div class="bar-track">
      <div
        class="bar-fill"
        :class="{ low: timeLeft <= 10, fever: fever }"
        :style="{ width: pct + '%' }"
      />
    </div>

    <!-- Active Word Pill -->
    <div class="word-container">
      <div
        class="word-pill"
        :class="{
          active: word.length > 0,
          ready: word.length >= 3,
          fever: fever && word.length >= 3,
        }"
      >
        <span class="word-text">{{ display }}</span>
        <span v-if="word.length >= 3" class="len-badge">{{ word.length }} huruf</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.hud {
  width: 100%;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 1.5px solid var(--panel-border);
  transition: all 0.3s ease;
}

.hud.fever-mode {
  border-color: var(--vibrant-yellow);
  box-shadow: 0 0 25px rgba(255, 230, 0, 0.45), var(--shadow-md);
  background: #FFFDEB;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat {
  display: flex;
  flex-direction: column;
  min-width: 65px;
}

.stat .label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.stat .val {
  font-family: 'Outfit', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: var(--dark-navy);
  line-height: 1.1;
}

.combo-box {
  align-items: flex-end;
  text-align: right;
}

.combo-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fever-tag {
  background: linear-gradient(90deg, #F97316, var(--vibrant-yellow));
  color: var(--dark-navy);
  font-weight: 900;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  animation: bounce 0.6s infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-2px); }
}

.combo-val {
  color: var(--royal-blue) !important;
  transition: transform 0.15s ease;
}

.combo-val.combo-high {
  font-size: 25px;
  color: #C79000 !important;
  text-shadow: none;
  animation: pulse-combo 0.6s infinite alternate;
}

@keyframes pulse-combo {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

/* Time Indicator */
.time-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(11, 86, 155, 0.10);
  border: 1px solid rgba(11, 86, 155, 0.35);
  padding: 4px 14px;
  border-radius: var(--radius-full);
  color: var(--royal-blue);
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  transition: all 0.2s ease;
}

.time-num {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.time-unit {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 700;
}

.time-container.low .time-badge {
  background: rgba(239, 68, 68, 0.25);
  border-color: var(--bad);
  color: var(--bad);
  animation: pulse 0.8s infinite alternate;
}

.time-container.low .time-unit {
  color: var(--bad);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.06); opacity: 0.7; }
}

/* Progress bar */
.bar-track {
  height: 6px;
  margin-top: 10px;
  border-radius: var(--radius-full);
  background: #EDF2F7;
  border: 1px solid rgba(29, 43, 58, 0.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--royal-blue-light) 0%, var(--vibrant-yellow) 100%);
  transition: width 0.1s linear;
}

.bar-fill.fever {
  background: linear-gradient(90deg, #F97316 0%, var(--vibrant-yellow) 100%);
  box-shadow: 0 0 10px rgba(255, 230, 0, 0.6);
}

.bar-fill.low {
  background: linear-gradient(90deg, #F97316 0%, var(--bad) 100%);
}

/* Word Pill */
.word-container {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.word-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  min-height: 38px;
  border-radius: var(--radius-full);
  background: #F4F7FA;
  border: 1.5px dashed #CBD5E1;
  color: var(--text-muted);
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: all 0.15s ease;
}

.word-pill.active {
  border-style: solid;
  border-color: var(--royal-blue-light);
  background: rgba(11, 86, 155, 0.08);
  color: var(--dark-navy);
}

.word-pill.ready {
  border-color: var(--vibrant-yellow);
  background: rgba(255, 230, 0, 0.22);
  color: var(--dark-navy);
  box-shadow: 0 0 16px rgba(255, 230, 0, 0.4);
  transform: scale(1.02);
}

.word-pill.ready.fever {
  background: rgba(255, 230, 0, 0.32);
  box-shadow: 0 0 20px rgba(255, 230, 0, 0.6);
  border-color: #E6C200;
}

.len-badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: var(--vibrant-yellow);
  color: var(--dark-navy);
  padding: 2px 7px;
  border-radius: var(--radius-full);
}
</style>
