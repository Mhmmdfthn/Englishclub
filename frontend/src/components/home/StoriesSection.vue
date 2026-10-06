<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Send } from 'lucide-vue-next'
import { api } from '../../api.js'
import HorizontalRail from '../ui/HorizontalRail.vue'
import LuckySpinner from '../LuckySpinner.vue'

/**
 * StoriesSection — community voices, kept on the homepage.
 *
 * PRD_Homepage_Redesign §7.6: title "Stories from English Club", presented as a community
 * editorial moment with one to two stories in view, explored horizontally — not a dense
 * wall of testimonials and not a review panel.
 *
 * This component also owns the existing story submission flow and its prize spinner,
 * because the spinner is triggered by that submission. Data still comes from the live
 * `/api/stories` endpoint with the same 30 second refresh as before.
 */
const batchOptions = [
  '2026 / Ilmu Komputer',
  '2026 / Manajemen',
  '2026 / Akuntansi',
  '2026 / Bisnis Digital',
  '2026 / Sains Data',
  '2026 / Agribisnis',
]

const stories = ref([])
const loading = ref(true)
const loadError = ref('')

const name = ref('')
const batch = ref('')
const comment = ref('')
const submitting = ref(false)
const formError = ref('')
const sentTo = ref('')

const showSpinner = ref(false)
/**
 * `LuckySpinner` calls `api.claimPrize(storyId, prize)` -> `PATCH /api/stories/:id/prize`,
 * but the backend matches that row **by author name**, not by the numeric id
 * (backend/server/utils/db.js `updateStoryPrize`, kept for backwards compatibility).
 * So the value handed to the spinner is the story's `name`.
 */
const prizeTarget = ref('')
const lastStoryName = ref('')

let pollTimer = null

async function loadStories() {
  try {
    stories.value = (await api.stories()).stories || []
    loadError.value = ''
  } catch {
    loadError.value = 'Cerita pengunjung belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

async function submitStory() {
  const author = name.value.trim()
  const message = comment.value.trim()
  if (!author || !message || submitting.value) return

  submitting.value = true
  formError.value = ''
  // Clear the previous confirmation so a failed retry cannot fall back to the
  // thank-you message of an earlier submission.
  sentTo.value = ''
  try {
    const response = await api.addStory(author, batch.value || 'Pengunjung Stand', message)
    stories.value.unshift(response.story)
    prizeTarget.value = response.story.name
    lastStoryName.value = author
    sentTo.value = author
    showSpinner.value = true
    name.value = ''
    batch.value = ''
    comment.value = ''
  } catch {
    formError.value = 'Cerita belum dapat dikirim. Coba lagi.'
  } finally {
    submitting.value = false
  }
}

const initials = (value) => (value || '?').charAt(0).toUpperCase()

// Only rendered when stories exist, so the zero case cannot occur here.
const storyCountLabel = computed(() => `${stories.value.length} cerita`)

onMounted(async () => {
  await loadStories()
  pollTimer = setInterval(loadStories, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <section id="stories" class="ec-section stories">
    <div class="ec-section-head">
      <span class="ec-eyebrow">Stories</span>
      <h2 class="ec-h2">Stories from English Club</h2>
      <p class="ec-lede">Kata-kata mahasiswa yang mampir ke stand kami.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="stories__grid" aria-hidden="true">
      <div class="ec-skeleton stories__skeleton"></div>
      <div class="ec-skeleton stories__skeleton"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError && stories.length === 0" class="ec-state ec-state--error" role="alert">
      <p class="ec-state__title">Cerita belum dapat dimuat</p>
      <p class="ec-state__body">{{ loadError }}</p>
      <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="loadStories">Coba lagi</button>
    </div>

    <!-- Empty -->
    <div v-else-if="stories.length === 0" class="ec-state">
      <p class="ec-state__title">Belum ada cerita</p>
      <p class="ec-state__body">Belum ada cerita yang dikirim. Kalau kamu baru mampir, tulis pengalamanmu di bawah.</p>
    </div>

    <!-- Stories -->
    <template v-else>
      <!-- 64px/s ≈ one 520px card every 8.4s: slow enough to read a testimonial
           before it slides away. Still fully draggable — the drift stops the
           moment a pointer or the keyboard touches the rail. -->
      <HorizontalRail :label="`Cerita pengunjung, ${stories.length} cerita`" :autoplay-speed="64">
        <div v-for="story in stories" :key="story.name + story.comment" class="ec-rail__item stories__item">
          <figure class="stories__card">
            <blockquote class="stories__quote">{{ story.comment }}</blockquote>
            <figcaption class="stories__author">
              <span class="stories__avatar" aria-hidden="true">{{ initials(story.name) }}</span>
              <span class="stories__meta">
                <cite class="stories__name">{{ story.name }}</cite>
                <span class="stories__batch">{{ story.batch }}</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </HorizontalRail>
      <p class="stories__hint ec-caption">{{ storyCountLabel }} — bergeser sendiri, dan bisa digeser atau diarahkan dengan panah kiri/kanan.</p>
    </template>

    <!-- Existing submission flow, unchanged in behaviour -->
    <form class="stories__form" @submit.prevent="submitStory">
      <div class="stories__form-intro">
        <h3 class="ec-h3">Mampir ke stand kami?</h3>
        <p class="ec-body">Ceritakan kesanmu setelah berkunjung ke stand English Club.</p>
      </div>

      <div class="stories__fields">
        <div class="ec-field-group">
          <label class="ec-label" for="story-name">Nama</label>
          <input
            id="story-name"
            v-model="name"
            class="ec-field"
            maxlength="40"
            autocomplete="name"
            :disabled="submitting"
            required
          />
        </div>

        <div class="ec-field-group">
          <label class="ec-label" for="story-batch">Prodi / angkatan</label>
          <select id="story-batch" v-model="batch" class="ec-field" :disabled="submitting">
            <option value="">Kamu dari prodi mana?</option>
            <option v-for="option in batchOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="ec-field-group stories__comment">
          <label class="ec-label" for="story-comment">Cerita kamu</label>
          <textarea
            id="story-comment"
            v-model="comment"
            class="ec-field"
            rows="3"
            maxlength="220"
            placeholder="Contoh: Standnya seru, games-nya bikin nagih."
            :disabled="submitting"
            required
          ></textarea>
          <p class="ec-helper">{{ comment.length }}/220</p>
        </div>

        <button class="ec-btn ec-btn--primary stories__submit" type="submit" :disabled="submitting">
          {{ submitting ? 'Mengirim...' : 'Kirim cerita' }}
          <Send :size="17" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>

      <p v-if="formError" class="stories__error" role="alert">{{ formError }}</p>
      <p v-else-if="sentTo" class="stories__sent" role="status">Terima kasih, {{ sentTo }}! Ceritamu sudah tampil di atas.</p>
    </form>

    <LuckySpinner v-if="showSpinner" :story-id="prizeTarget" :story-name="lastStoryName" @close="showSpinner = false" />
  </section>
</template>

<style scoped>
.stories {
  scroll-margin-top: 84px;
}

.stories__item {
  /* PRD §7.6: one to two stories in view, not a dense wall. */
  width: min(520px, 82vw);
}

.stories__card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--ec-space-5);
  height: 100%;
  margin: 0;
  padding: clamp(20px, 3vw, 30px);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  box-shadow: var(--ec-shadow-md);
}

.stories__quote {
  margin: 0;
  font-size: clamp(1rem, 1.9vw, 1.188rem);
  line-height: 1.55;
  color: var(--ec-ink);
  font-weight: 500;
}

.stories__quote::before {
  content: '\201C';
  display: block;
  margin-bottom: 2px;
  font-family: 'Outfit', sans-serif;
  font-size: 2.5rem;
  line-height: 0.6;
  color: var(--ec-yellow);
}

.stories__author {
  display: flex;
  align-items: center;
  gap: var(--ec-space-3);
  padding-top: var(--ec-space-4);
  border-top: 1px solid var(--ec-line);
}

.stories__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-blue);
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
  font-size: 1.062rem;
  font-weight: 700;
}

.stories__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stories__name {
  font-style: normal;
  font-size: 0.906rem;
  font-weight: 700;
  color: var(--ec-ink);
}

.stories__batch {
  font-size: 0.781rem;
  color: var(--ec-ink-soft);
}

.stories__hint {
  margin-top: var(--ec-space-4);
}

.stories__form {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(20px, 3vw, 40px);
  margin-top: clamp(40px, 5vw, 64px);
  padding-top: clamp(28px, 4vw, 40px);
  border-top: 1px solid var(--ec-line);
}

.stories__form-intro {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-2);
}

.stories__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ec-space-4);
  align-content: start;
}

.stories__comment {
  grid-column: 1 / -1;
}

.stories__submit {
  grid-column: 1 / -1;
  justify-self: start;
}

.stories__error,
.stories__sent {
  grid-column: 1 / -1;
  margin: var(--ec-space-3) 0 0;
  font-size: 0.844rem;
  font-weight: 600;
}

.stories__error {
  color: var(--ec-danger);
}

.stories__sent {
  color: var(--ec-success);
}

.stories__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ec-space-4);
}

.stories__skeleton {
  height: 190px;
  border-radius: var(--ec-radius-lg);
}

@media (max-width: 860px) {
  .stories__form,
  .stories__grid {
    grid-template-columns: 1fr;
  }

  .stories__fields {
    grid-template-columns: 1fr;
  }

  .stories__hint {
    display: none;
  }
}
</style>
