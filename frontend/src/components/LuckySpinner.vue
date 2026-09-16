<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api.js'

const props = defineProps({
  storyId: { type: String, required: true },
  storyName: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const prizes = ref([])
const spinning = ref(false)
const rotation = ref(0)
const wonPrize = ref('')
const showResult = ref(false)
const loading = ref(true)

const SPIN_DURATION = 4000

const wheelSegments = computed(() => {
  const result = []
  for (const p of prizes.value) {
    for (let i = 0; i < (p.count || 1); i++) {
      result.push(p.name)
    }
  }
  return result
})

const segmentAngle = computed(() => 360 / wheelSegments.value.length)

const COLORS = ['#0B569E', '#FFD700', '#128C7E', '#E74C3C', '#8E44AD', '#2ECC71', '#F39C12', '#3498DB']

function segmentColor(i) { return COLORS[i % COLORS.length] }

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: spinning.value ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
}))

function segmentPath(angle, index) {
  const start = (index * angle) - 90
  const end = start + angle
  const r = 150
  const rad = (deg) => (deg * Math.PI) / 180
  const x1 = 150 + r * Math.cos(rad(start))
  const y1 = 150 + r * Math.sin(rad(start))
  const x2 = 150 + r * Math.cos(rad(end))
  const y2 = 150 + r * Math.sin(rad(end))
  const large = angle > 180 ? 1 : 0
  return `M150,150 L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`
}

function textTransform(angle, index) {
  const mid = (index * angle + angle / 2) - 90
  const rad = (deg) => (deg * Math.PI) / 180
  const r = 95
  const x = 150 + r * Math.cos(rad(mid))
  const y = 150 + r * Math.sin(rad(mid))
  const rotate = mid + 90
  return `translate(${x}, ${y}) rotate(${rotate})`
}

async function spin() {
  if (spinning.value || wheelSegments.value.length === 0) return
  spinning.value = true
  showResult.value = false
  wonPrize.value = ''
  const winIndex = Math.floor(Math.random() * wheelSegments.value.length)
  const anglePerSegment = 360 / wheelSegments.value.length
  const fullSpins = 5 + Math.floor(Math.random() * 3)
  const targetAngle = 360 - (winIndex * anglePerSegment + anglePerSegment / 2)
  rotation.value += fullSpins * 360 + targetAngle
  await new Promise(resolve => setTimeout(resolve, SPIN_DURATION + 100))
  spinning.value = false
  wonPrize.value = wheelSegments.value[winIndex]
  showResult.value = true
  try {
    await api.claimPrize(props.storyId, wonPrize.value)
  } catch { /* silent */ }
}

function closeResult() {
  showResult.value = false
  emit('close')
}

onMounted(async () => {
  try {
    const data = await api.spinner()
    prizes.value = data.prizes || []
  } catch { prizes.value = [] }
  finally { loading.value = false }
})
</script>

<template>
  <div class="spinner-overlay" @click.self="closeResult">
    <div class="spinner-card">
      <button class="spinner-close" @click="closeResult" title="Tutup">&times;</button>

      <div v-if="loading" class="spinner-loading">Memuat hadiah...</div>

      <template v-else-if="wheelSegments.length > 0 && !showResult">
        <div class="spinner-header">
          <h3>Lucky Spinner</h3>
          <p>Selamat datang, <b>{{ storyName }}</b>! Putar roda untuk mendapatkan hadiah.</p>
        </div>
        <div class="spinner-wheel-wrap">
          <div class="spinner-pointer"></div>
          <svg class="spinner-wheel" :style="wheelStyle" viewBox="0 0 300 300">
            <g v-for="(item, i) in wheelSegments" :key="i">
              <path :d="segmentPath(segmentAngle, i)" :fill="segmentColor(i)" stroke="#fff" stroke-width="2" />
              <text :transform="textTransform(segmentAngle, i)" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="13" font-weight="800">{{ item }}</text>
            </g>
            <circle cx="150" cy="150" r="18" fill="#fff" stroke="#0B569E" stroke-width="3" />
            <circle cx="150" cy="150" r="10" fill="#FFD700" stroke="#0B569E" stroke-width="2" />
          </svg>
        </div>
        <button class="btn spinner-btn" :disabled="spinning" @click="spin">
          {{ spinning ? 'Berputar...' : 'PUTAR!' }}
        </button>
      </template>

      <template v-else-if="showResult">
        <div class="result-box">
          <div class="result-icon">🎉</div>
          <h3>Selamat!</h3>
          <p>Kamu mendapatkan:</p>
          <div class="result-prize">{{ wonPrize }}</div>
          <p class="result-note">Tunjukkan layar ini ke panitia untuk klaim hadiahmu.</p>
          <button class="btn spinner-btn" @click="closeResult">Tutup</button>
        </div>
      </template>

      <div v-else class="spinner-empty">
        <p>Belum ada item hadiah yang dikonfigurasi.</p>
        <button class="btn spinner-btn" @click="closeResult">Tutup</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner-overlay { position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:rgba(13,20,28,0.7); backdrop-filter:blur(6px); padding:20px; }
.spinner-card { position:relative; width:min(100%, 380px); background:#fff; border:3px solid var(--dark-navy); box-shadow:8px 8px 0 var(--dark-navy); padding:28px 24px; text-align:center; }
.spinner-close { position:absolute; top:10px; right:14px; background:none; border:none; font-size:28px; font-weight:900; cursor:pointer; color:var(--dark-navy); line-height:1; }
.spinner-close:hover { color:#E74C3C; }
.spinner-loading { padding:40px; font-size:14px; font-weight:700; color:var(--text-muted); }
.spinner-header { margin-bottom:16px; }
.spinner-header h3 { font-size:22px; font-weight:900; margin:0 0 6px; color:var(--dark-navy); }
.spinner-header p { font-size:13px; color:var(--text-muted); margin:0; }
.spinner-wheel-wrap { position:relative; width:280px; height:280px; margin:0 auto 18px; }
.spinner-pointer { position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:12px solid transparent; border-right:12px solid transparent; border-top:22px solid var(--dark-navy); z-index:2; }
.spinner-wheel { width:100%; height:100%; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.15)); }
.spinner-btn { width:100%; max-width:240px; margin:0 auto; padding:14px 28px; background:var(--dark-navy); color:#fff; border:3px solid var(--dark-navy); font-size:16px; font-weight:900; letter-spacing:.08em; cursor:pointer; box-shadow:4px 4px 0 var(--vibrant-yellow); }
.spinner-btn:hover { background:var(--royal-blue); border-color:var(--royal-blue); }
.spinner-btn:disabled { opacity:.6; cursor:not-allowed; }
.result-box { padding:10px 0; }
.result-icon { font-size:48px; margin-bottom:8px; }
.result-box h3 { font-size:24px; font-weight:900; margin:0 0 4px; color:var(--dark-navy); }
.result-box > p { font-size:13px; color:var(--text-muted); margin:4px 0; }
.result-prize { display:inline-block; margin:12px 0; padding:10px 28px; background:var(--vibrant-yellow); border:3px solid var(--dark-navy); font-size:20px; font-weight:900; color:var(--dark-navy); }
.result-note { font-size:12px; color:var(--text-muted); margin-bottom:14px; }
.spinner-empty { padding:30px 0; }
.spinner-empty p { font-size:13px; color:var(--text-muted); margin-bottom:14px; }
</style>
