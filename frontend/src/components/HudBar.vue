<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 0 },
  timeTotal: { type: Number, default: 60 },
  combo: { type: Number, default: 1 },
  word: { type: String, default: '' },
  fever: { type: Boolean, default: false },
})

const pct = computed(() =>
  Math.max(0, Math.min(100, (props.timeLeft / Math.max(props.timeTotal, 1)) * 100)),
)

const display = computed(() => props.word || 'GESER HURUF')
</script>

<template>
  <header class="hud card" :class="{ 'fever-mode': fever }">
    <div class="row">
      <div class="stat score-box">
        <span class="label">SKOR</span>
        <span class="val">{{ score }}</span>
      </div>
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
      <div class="stat combo-box">
        <div class="combo-header">
          <span v-if="combo >= 3" class="fever-tag">RUSH</span>
          <span class="label">COMBO</span>
        </div>
        <span class="val combo-val" :class="{ 'combo-high': combo >= 3 }">
          x{{ combo }}
        </span>
      </div>
    </div>
    <div class="bar-track">
      <div
        class="bar-fill"
        :class="{ low: timeLeft <= 10, fever: fever }"
        :style="{ width: pct + '%' }"
      />
    </div>
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
  padding: 12px 16px 14px;
  background: var(--pure-white);
  border: 3px solid var(--dark-navy);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--dark-navy);
  transition: all 0.3s ease;
}
.hud.fever-mode {
  border-color: var(--dark-navy);
  box-shadow: 6px 6px 0 var(--dark-navy), 0 0 0 5px rgba(255, 230, 0, 0.4);
  background: var(--vibrant-yellow);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stat {
  display: flex;
  flex-direction: column;
  min-width: 70px;
}
.stat .label {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.stat .val {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(22px, 4vw, 28px);
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
  justify-content: flex-end;
  gap: 4px;
}
.fever-tag {
  background: var(--royal-blue);
  color: var(--pure-white);
  font-weight: 900;
  font-size: 8px;
  padding: 2px 6px;
  border: 2px solid var(--dark-navy);
  letter-spacing: 0.14em;
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
  font-size: clamp(24px, 4.5vw, 30px);
  color: var(--royal-blue) !important;
  text-shadow: none;
  animation: pulse-combo 0.6s infinite alternate;
}
@keyframes pulse-combo {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}
.time-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.time-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(11, 86, 155, 0.1);
  border: 2px solid var(--dark-navy);
  padding: 4px 14px;
  color: var(--royal-blue);
  box-shadow: 3px 3px 0 var(--dark-navy);
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
  background: rgba(220, 38, 38, 0.12);
  border-color: var(--bad);
  color: var(--bad);
  box-shadow: 3px 3px 0 var(--bad);
  animation: pulse 0.8s infinite alternate;
}
.time-container.low .time-unit {
  color: var(--bad);
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.04); opacity: 0.7; }
}
.bar-track {
  height: 10px;
  margin-top: 12px;
  border-radius: 0;
  background: #edf2f7;
  border: 2px solid var(--dark-navy);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 0;
  background: linear-gradient(90deg, var(--royal-blue) 0%, var(--vibrant-yellow) 100%);
  transition: width 0.1s linear;
}
.bar-fill.fever {
  background: linear-gradient(90deg, #f97316 0%, var(--vibrant-yellow) 100%);
}
.bar-fill.low {
  background: linear-gradient(90deg, #f97316 0%, var(--bad) 100%);
}
.word-container {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.word-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  min-height: 42px;
  border-radius: 0;
  background: #f8fafc;
  border: 2px dashed var(--dark-navy);
  color: var(--text-muted);
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: all 0.15s ease;
}
.word-pill.active {
  border-style: solid;
  border-color: var(--dark-navy);
  background: rgba(11, 86, 155, 0.08);
  color: var(--dark-navy);
}
.word-pill.ready {
  border-color: var(--dark-navy);
  background: rgba(255, 230, 0, 0.35);
  color: var(--dark-navy);
  box-shadow: 3px 3px 0 var(--dark-navy);
}
.word-pill.ready.fever {
  background: rgba(255, 230, 0, 0.6);
  box-shadow: 3px 3px 0 var(--dark-navy);
}
.len-badge {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  background: var(--vibrant-yellow);
  color: var(--dark-navy);
  padding: 3px 8px;
  border: 2px solid var(--dark-navy);
  border-radius: 0;
}
</style>
