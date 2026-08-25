<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { api } from './api.js'
import { sound } from './audio.js'
import GameBoard from './components/GameBoard.vue'
import GameOverScreen from './components/GameOverScreen.vue'
import HudBar from './components/HudBar.vue'
import StartScreen from './components/StartScreen.vue'
import FoundWords from './components/FoundWords.vue'

const screen = ref('menu')
const sessionId = ref('')
const cells = ref([])
const score = ref(0)
const combo = ref(1)
const bestCombo = ref(1)
const timeLeft = ref(0)
const activeWord = ref('')
const longestWord = ref('')
const foundWords = ref([])
const busy = ref(false)
const boardError = ref('')
const shakeStamp = ref(0)
const finalStats = ref(null)
const floatingToast = ref(null)
const isMuted = ref(sound.muted)

let timerId = null

const bestScore = computed(() => Number(localStorage.getItem('wh_best') || 0))
const isFever = computed(() => combo.value >= 3)

function toggleAudio() {
  isMuted.value = sound.toggleMute()
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null }
}

function tick() {
  timeLeft.value = Math.max(0, timeLeft.value - 0.1)
  if (timeLeft.value <= 0) endGame()
}

async function startGame() {
  boardError.value = ''
  floatingToast.value = null
  try {
    const data = await api.startGame()
    sessionId.value = data.session_id
    cells.value = data.grid.map((letter, i) => ({ i, letter, token: 0 }))
    score.value = 0
    combo.value = 1
    bestCombo.value = 1
    timeLeft.value = data.time_limit
    activeWord.value = ''
    longestWord.value = ''
    foundWords.value = []
    screen.value = 'play'
    stopTimer()
    timerId = setInterval(tick, 100)
  } catch {
    boardError.value = 'Tidak bisa menghubungi server'
    shakeStamp.value++
  }
}

function endGame() {
  if (screen.value !== 'play') return
  stopTimer()
  const prevBest = Number(localStorage.getItem('wh_best') || 0)
  const isRecord = score.value > prevBest
  if (isRecord) localStorage.setItem('wh_best', String(score.value))
  finalStats.value = {
    score: score.value,
    words: [...foundWords.value],
    longest: longestWord.value,
    bestCombo: bestCombo.value,
    isRecord,
    best: Math.max(prevBest, score.value),
  }
  screen.value = 'over'
}

function showToast(text, isBonus = false) {
  const key = Date.now()
  floatingToast.value = { text, isBonus, key }
  setTimeout(() => {
    if (floatingToast.value?.key === key) floatingToast.value = null
  }, 1200)
}

async function handleSubmit(path) {
  if (busy.value || !sessionId.value) return
  busy.value = true

  const attempt = path.map((i) => cells.value[i].letter).join('')
  try {
    const res = await api.submitWord(sessionId.value, path)
    if (res.ok) {
      // Update sel yang berubah setelah refill
      for (const c of res.cells) {
        const cell = cells.value[c.index]
        cell.letter = c.letter
        cell.token = (cell.token ?? 0) + 1
      }
      score.value = res.score
      const prevCombo = combo.value
      combo.value = res.combo_next
      bestCombo.value = Math.max(bestCombo.value, res.combo)
      timeLeft.value = Math.max(timeLeft.value, res.remaining)
      foundWords.value.push({ word: res.word, points: res.points })
      if (res.word.length > longestWord.value.length) longestWord.value = res.word
      boardError.value = ''

      if (res.combo >= 3 && prevCombo < 3) {
        sound.playFever()
      } else {
        sound.playSuccess(res.combo)
      }

      const comboText = res.combo > 1 ? ` (x${res.combo} 🔥)` : ''
      showToast(`+${res.points} PTS!${comboText}`, res.combo >= 3)
    } else {
      combo.value = 1
      shakeStamp.value++
      sound.playError()
      boardError.value = {
        too_short: 'Minimal 3 huruf!',
        invalid_path: 'Huruf harus tersambung!',
        not_a_word: `"${attempt.toUpperCase()}" bukan kata Inggris`,
        already_found: `"${attempt.toUpperCase()}" sudah ditemukan!`,
        expired: 'Waktu habis!',
      }[res.reason] || 'Ditolak!'
      if (res.reason === 'expired') endGame()
    }
  } catch {
    boardError.value = 'Koneksi ke server bermasalah'
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(stopTimer)
</script>

<template>
  <!-- Sound Toggle -->
  <button class="sound-btn" :title="isMuted ? 'Nyalakan Suara' : 'Matikan Suara'" @click="toggleAudio">
    <svg v-if="!isMuted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  </button>

  <!-- Floating Toast -->
  <transition name="float-toast">
    <div v-if="floatingToast" :key="floatingToast.key" class="float-toast" :class="{ 'fever-toast': floatingToast.isBonus }">
      {{ floatingToast.text }}
    </div>
  </transition>

  <StartScreen v-if="screen === 'menu'" :best="bestScore" :error="boardError" @play="startGame" />

  <section v-else-if="screen === 'play'" class="screen play">
    <HudBar :score="score" :time-left="timeLeft" :combo="combo" :word="activeWord" :fever="isFever" />
    <GameBoard
      :cells="cells"
      :disabled="busy"
      :shake-stamp="shakeStamp"
      :fever="isFever"
      @select="activeWord = $event"
      @submit="handleSubmit"
    />
    <p class="error">{{ boardError }}</p>
    <FoundWords :items="foundWords" />
  </section>

  <GameOverScreen
    v-else-if="screen === 'over' && finalStats"
    :stats="finalStats"
    :error="boardError"
    @replay="startGame"
  />
</template>

<style scoped>
.screen.play {
  justify-content: flex-start;
  padding-top: max(10px, env(safe-area-inset-top));
  gap: 8px;
}

.sound-btn {
  position: fixed;
  top: 12px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(29, 43, 58, 0.15);
  color: var(--dark-navy);
  display: grid;
  place-items: center;
  z-index: 100;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}
.sound-btn:hover {
  background: var(--royal-blue);
  color: var(--pure-white);
  border-color: var(--royal-blue);
}

.float-toast {
  position: fixed;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, var(--royal-blue), var(--royal-blue-light));
  color: var(--pure-white);
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  font-size: 17px;
  letter-spacing: 0.5px;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--vibrant-yellow);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255,230,0,0.4);
  z-index: 999;
  pointer-events: none;
  white-space: nowrap;
}
.float-toast.fever-toast {
  background: linear-gradient(135deg, #F97316, var(--vibrant-yellow));
  color: var(--dark-navy);
  font-size: 19px;
  box-shadow: 0 0 30px rgba(255,230,0,0.7);
}
.float-toast-enter-active { animation: floatUp 1s cubic-bezier(0.2,0.8,0.2,1); }
.float-toast-leave-active { transition: opacity 0.2s ease; }
.float-toast-leave-to { opacity: 0; }

@keyframes floatUp {
  0%   { opacity:0; transform:translate(-50%,20px) scale(0.7); }
  20%  { opacity:1; transform:translate(-50%,0) scale(1.1); }
  40%  { transform:translate(-50%,-5px) scale(1); }
  100% { opacity:0; transform:translate(-50%,-35px) scale(0.95); }
}
</style>
