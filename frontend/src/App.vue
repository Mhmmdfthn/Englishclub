<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from './api.js'
import { loadDictionary } from './dictionary.js'
import { sound } from './audio.js'
import GameBoard from './components/GameBoard.vue'
import GameOverScreen from './components/GameOverScreen.vue'
import HudBar from './components/HudBar.vue'
import LandingView from './components/LandingView.vue'
import PlayFormView from './components/PlayFormView.vue'
import LeaderboardPage from './components/LeaderboardPage.vue'
import MemberRegisterMini from './components/MemberRegisterMini.vue'
import AdminView from './components/AdminView.vue'
import FoundWords from './components/FoundWords.vue'

const route = useRoute()
const router = useRouter()
const screen = ref('landing')
const loading = ref(true)
const isHiddenAdminRoute = computed(() => route.path === '/ec-admin-2026')
const showAdminModal = ref(false)
function openAdminModal() { showAdminModal.value = true; document.body.style.overflow = 'hidden' }
function closeAdminModal() { showAdminModal.value = false; document.body.style.overflow = '' }

const routeToScreen = { '/': 'landing', '/daftar': 'register', '/board': 'board', '/main': 'form' }
const screenToRoute = { landing: '/', register: '/daftar', board: '/board', form: '/main' }

function syncScreenFromRoute() {
  if (isHiddenAdminRoute.value) return
  const mapped = routeToScreen[route.path]
  if (mapped && mapped !== screen.value && screen.value !== 'play' && screen.value !== 'over') {
    screen.value = mapped
  }
}

watch(() => route.path, syncScreenFromRoute)

function navigate(screenName) {
  screen.value = screenName
  const path = screenToRoute[screenName]
  if (path && route.path !== path) router.push(path)
}
const greetingIndex = ref(0)
const greetings = ['Hello!', 'Welcome!', 'Good to see you!', 'Learn with us!']
const swipeProgress = ref(0)
let swipeStartY = 0
let greetingTimer = null
let loadingTimer = null
const sessionId = ref('')
const cells = ref([])
const score = ref(0)
const combo = ref(1)
const bestCombo = ref(1)
const timeLeft = ref(0)
const timeLimit = ref(60)
const activeWord = ref('')
const longestWord = ref('')
const foundWords = ref([])
const busy = ref(false)
const boardError = ref('')
const connectError = ref(false)
const dictionaryReady = ref(false)
const dictionaryError = ref('')
const wordSet = ref(new Set())
const shakeStamp = ref(0)
const finalStats = ref(null)
const floatingToast = ref(null)
const isMuted = ref(sound.muted)

let timerId = null
const bestScore = computed(() => Number(localStorage.getItem('wh_best') || 0))
const isFever = computed(() => combo.value >= 3)
const showSoundBtn = computed(() => false)
const LETTER_VALUES = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 }
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null }
}
function tick() {
  timeLeft.value = Math.max(0, timeLeft.value - 0.1)
  if (timeLeft.value <= 0) endGame()
}
function handleAdminKey(e) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    openAdminModal()
  }
  if (e.key === 'Escape' && showAdminModal.value) closeAdminModal()
}
onMounted(() => {
  syncScreenFromRoute()
  loadDictionary(api.dictionary)
    .then((words) => { wordSet.value = words; dictionaryReady.value = true })
    .catch(() => { dictionaryError.value = 'Kamus belum dapat dimuat. Periksa koneksi lalu coba lagi.' })
  window.addEventListener('keydown', handleAdminKey)
  greetingTimer = setInterval(() => {
    greetingIndex.value = (greetingIndex.value + 1) % greetings.length
  }, 2000)
  loadingTimer = setTimeout(() => {
    loading.value = false
    clearInterval(greetingTimer)
  }, 2800)
})

onBeforeUnmount(() => {
  clearInterval(greetingTimer)
  clearTimeout(loadingTimer)
  stopTimer()
  window.removeEventListener('keydown', handleAdminKey)
})

function beginSwipe(event) {
  swipeStartY = event.clientY
  swipeProgress.value = 0
}

function moveSwipe(event) {
  if (!swipeStartY) return
  const distance = Math.max(0, swipeStartY - event.clientY)
  swipeProgress.value = Math.min(1, distance / 180)
}

function finishSwipe() {
  if (!swipeStartY) return
  if (swipeProgress.value >= 0.72) {
    loading.value = false
    clearInterval(greetingTimer)
    clearTimeout(loadingTimer)
  }
  swipeStartY = 0
  swipeProgress.value = 0
}

function skipLoading() {
  loading.value = false
  clearInterval(greetingTimer)
  clearTimeout(loadingTimer)
}

function toggleAudio() {
  isMuted.value = sound.toggleMute()
}

function goLanding() {
  navigate('landing')
}

async function startGame() {
  boardError.value = ''
  connectError.value = false
  floatingToast.value = null
  sound.init()
  if (!dictionaryReady.value) {
    boardError.value = dictionaryError.value || 'Kamus sedang dimuat, tunggu sebentar.'
    return
  }
  try {
    const data = await api.startGame()
    sessionId.value = data.session_id
    cells.value = data.grid.map((letter, i) => ({ i, letter, token: 0 }))
    score.value = 0
    combo.value = 1
    bestCombo.value = 1
    timeLeft.value = data.time_limit || 60
    timeLimit.value = data.time_limit || 60
    activeWord.value = ''
    longestWord.value = ''
    foundWords.value = []
    screen.value = 'play'
    stopTimer()
    timerId = setInterval(tick, 100)
  } catch (e) {
    boardError.value = e && e.network ? 'Server tidak merespons. Coba lagi.' : 'Permainan belum dapat dimulai.'
    connectError.value = true
    shakeStamp.value++
    if (screen.value === 'over') screen.value = 'form'
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
  }, 1800)
}

async function handleSubmit(path) {
  if (busy.value || !sessionId.value) return
  busy.value = true

  const attempt = path.map((i) => cells.value[i].letter).join('')
  try {
    const fail = (reason) => ({ ok: false, reason })
    let res = { ok: false }
    if (timeLeft.value <= 0) res = fail('expired')
    else if (path.length < 3) res = fail('too_short')
    else if (new Set(path).size !== path.length || path.some((i) => i < 0 || i >= cells.value.length)) res = fail('invalid_path')
    else if (path.some((i, n) => n > 0 && !areAdjacent(path[n - 1], i))) res = fail('invalid_path')
    else if (!wordSet.value.has(attempt)) res = fail('not_a_word')
    else if (foundWords.value.some((item) => item.word === attempt)) res = fail('already_found')
    else {
      const comboApplied = combo.value
      const letterSum = [...attempt].reduce((sum, letter) => sum + (LETTER_VALUES[letter] || 1), 0)
      const points = letterSum * attempt.length * 2 * comboApplied + (comboApplied >= 3 ? (comboApplied - 2) * 50 : 0)
      for (const index of [...new Set(path)].sort((a, b) => a - b)) {
        cells.value[index].letter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
        cells.value[index].token = (cells.value[index].token ?? 0) + 1
      }
      res = { ok: true, word: attempt, points, combo: comboApplied, combo_next: Math.min(comboApplied + 1, 10), score: score.value + points }
    }
    if (res.ok) {
      score.value = res.score
      const prevCombo = combo.value
      combo.value = res.combo_next
      bestCombo.value = Math.max(bestCombo.value, res.combo)
      foundWords.value.push({ word: res.word, points: res.points })
      if (res.word.length > longestWord.value.length) longestWord.value = res.word
      boardError.value = ''
      if (res.combo >= 3 && prevCombo < 3) sound.playFever()
      else sound.playSuccess(res.combo)
      sound.vibrate(res.combo >= 3 ? [15, 30, 40, 60] : [15])
      const comboTxt = res.combo > 1 ? ` x${res.combo}` : ''
      showToast(`+${res.points} PTS${comboTxt}`, res.combo >= 3)
    } else {
      combo.value = 1
      shakeStamp.value++
      sound.playError()
      sound.vibrate(60)
      boardError.value = {
        too_short: 'Pilih minimal 3 huruf.',
        invalid_path: 'Pilih huruf yang berdekatan.',
        not_a_word: `"${attempt.toUpperCase()}" tidak ada di kamus.`,
        already_found: `"${attempt.toUpperCase()}" sudah dipakai.`,
        expired: 'Waktu habis.',
      }[res.reason] || 'Kata ditolak.'
      if (res.reason === 'expired') endGame()
    }
  } catch (e) {
    boardError.value = e && e.network ? e.message : 'Kata tidak dapat diproses'
  } finally {
    busy.value = false
  }
}

function areAdjacent(a, b) {
  const rowA = Math.floor(a / 5), colA = a % 5
  const rowB = Math.floor(b / 5), colB = b % 5
  return a !== b && Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1
}
</script>

<template>
  <transition name="loading-fade">
    <div v-if="loading" class="loading-screen" @pointerdown="beginSwipe" @pointermove="moveSwipe" @pointerup="finishSwipe" @pointercancel="finishSwipe">
      <div class="loading-content" :style="{ transform: `translateY(${-swipeProgress * 120}px)` }">
        <img class="loading-logo" src="/logo-ec.png" alt="Logo English Club UPB" />
        <div class="loading-text">
          <p class="loading-kicker">ENGLISH CLUB UPB</p>
          <Transition name="greeting-fade" mode="out-in">
            <p class="loading-greeting" :key="greetingIndex">{{ greetings[greetingIndex] }}</p>
          </Transition>
          <div class="loading-dots" aria-label="Loading"><span></span><span></span><span></span></div>
          <p class="loading-hint">Informasi komunitas sedang dimuat</p>
          <button class="loading-skip" type="button" @click="skipLoading">Lewati</button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Sound Toggle -->
  <button v-if="showSoundBtn" class="sound-btn" :title="isMuted ? 'Nyalakan Suara' : 'Matikan Suara'" aria-label="Atur suara" @click="toggleAudio">
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

  <router-view v-if="isHiddenAdminRoute" />
  <template v-else>
    <LandingView v-if="screen === 'landing'" @goPlay="navigate('form')" @goBoard="navigate('board')" @goRegister="navigate('register')" @openAdmin="openAdminModal" />
    <PlayFormView v-else-if="screen === 'form'" :best="bestScore" :error="boardError || dictionaryError" :retriable="connectError" :dictionary-ready="dictionaryReady" @play="startGame" @back="goLanding" />
    <LeaderboardPage v-else-if="screen === 'board'" @back="goLanding" />
    <MemberRegisterMini v-else-if="screen === 'register'" @back="goLanding" />
    <section v-else-if="screen === 'play'" class="screen play">
      <HudBar :score="score" :time-left="timeLeft" :time-total="timeLimit" :combo="combo" :word="activeWord" :fever="isFever" />
      <GameBoard
        :cells="cells"
        :disabled="busy"
        :shake-stamp="shakeStamp"
        :fever="isFever"
        @select="activeWord = $event"
        @submit="handleSubmit"
      />
      <p class="error" role="status" aria-live="polite">{{ boardError }}</p>
      <FoundWords :items="foundWords" />
      <button class="btn ghost" style="margin-top:8px" @click="endGame">Selesai & Simpan Skor</button>
    </section>
    <GameOverScreen
      v-else-if="screen === 'over' && finalStats"
      :stats="finalStats"
      :error="boardError"
      @replay="startGame"
      @back="goLanding"
    />
  </template>
  <Transition name="admin-modal">
    <div v-if="showAdminModal" class="admin-modal-overlay" @click.self="closeAdminModal">
      <div class="admin-modal-card">
        <button class="modal-close" aria-label="Tutup" @click="closeAdminModal">×</button>
        <AdminView is-modal @back="closeAdminModal" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.screen.play {
  position: relative;
  justify-content: flex-start;
  padding-top: max(18px, env(safe-area-inset-top));
  gap: 12px;
  background-color: var(--pure-white);
  background-image: radial-gradient(rgba(29, 43, 58, 0.13) 1px, transparent 1px);
  background-size: 16px 16px;
}
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--dark-navy);
  background: #fff;
  touch-action: none;
  user-select: none;
}
.loading-content {
  position: relative;
  width: min(100%, 420px);
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: loading-rise .7s ease both;
  transition: transform .18s ease-out;
}
.loading-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  mix-blend-mode: multiply;
  filter: drop-shadow(0 6px 14px rgba(11, 86, 155, 0.25));
  animation: loading-logo-in .7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 14px;
  animation: load-text-in .6s ease .5s both;
}
@keyframes loading-logo-in {
  from { opacity: 0; transform: scale(0.6) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes load-text-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.loading-kicker {
  color: var(--royal-blue);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2.4px;
}
@keyframes loading-logo-in {
  from { opacity: 0; transform: scale(0.6) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.loading-greeting {
  width: 100%;
  max-width: calc(100vw - 48px);
  min-height: 44px;
  margin-top: 10px;
  font-family: 'Outfit', sans-serif;
  color: transparent;
  background: linear-gradient(180deg, var(--royal-blue-light), var(--royal-blue-dark));
  -webkit-background-clip: text;
  background-clip: text;
  font-size: clamp(34px, 8vw, 52px);
  font-weight: 800;
  letter-spacing: -.5px;
  line-height: 1.05;
  text-align: center;
  overflow-wrap: break-word;
  text-shadow: 0 4px 18px rgba(0,0,0,.2);
}
.greeting-fade-enter-active, .greeting-fade-leave-active { transition: opacity 1.2s ease, transform 1.2s ease; }
.greeting-fade-enter-from { opacity: 0; transform: scale(.96); }
.greeting-fade-leave-to { opacity: 0; transform: scale(1.04); }
.loading-dots { display: flex; gap: 6px; margin-top: 24px; }
.loading-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--royal-blue); animation: loading-dot .8s infinite alternate; }
.loading-dots span:nth-child(2) { animation-delay: .15s; }
.loading-dots span:nth-child(3) { animation-delay: .3s; }
.loading-hint {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 600;
}
.loading-skip {
  margin-top: 10px;
  padding: 7px 22px;
  border-radius: 0;
  background: rgba(11, 86, 155, 0.08);
  border: 2px solid var(--dark-navy);
  color: var(--royal-blue);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--dark-navy);
}
.loading-skip:hover {
  background: var(--royal-blue);
  color: var(--pure-white);
  border-color: var(--royal-blue);
}
.loading-fade-leave-active { transition: opacity .45s ease; }
.loading-fade-leave-to { opacity: 0; }
@keyframes loading-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes loading-dot { from { opacity: .3; transform: translateY(0); } to { opacity: 1; transform: translateY(-4px); } }
@media (max-width:680px) {
  .loading-greeting {
    min-height: 58px;
    margin-top: 16px;
    font-size: clamp(36px, 10vw, 54px);
    line-height: .98;
    text-shadow: 0 5px 24px rgba(0,0,0,.24);
  }
  .loading-kicker { font-size: 10px; letter-spacing: 2px; }
}
.sound-btn {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(14px + env(safe-area-inset-right));
  width: 38px;
  height: 38px;
  border-radius: 0;
  background: var(--pure-white);
  border: 2px solid var(--dark-navy);
  color: var(--dark-navy);
  display: grid;
  place-items: center;
  z-index: 100;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--dark-navy);
}
.sound-btn:hover {
  background: var(--vibrant-yellow);
  color: var(--dark-navy);
  border-color: var(--dark-navy);
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
.admin-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: start center;
  padding: 18px;
  background: rgba(29,43,58,0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  overflow: auto;
}
.admin-modal-card {
  position: relative;
  width: min(100%, 1100px);
  max-height: 90dvh;
  overflow: auto;
  background: var(--bg-secondary, #F1F5F9);
  border: 3px solid var(--dark-navy);
  box-shadow: 8px 8px 0 var(--dark-navy);
  padding: 0;
}
.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid var(--dark-navy);
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  z-index: 2;
}
.admin-modal-enter-active, .admin-modal-leave-active { transition: opacity 0.22s ease; }
.admin-modal-enter-from, .admin-modal-leave-to { opacity: 0; }
</style>
