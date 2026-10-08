<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, MessageSquareQuote, Send, Sparkles } from 'lucide-vue-next'
import { api } from '../../api.js'
import HorizontalRail from '../ui/HorizontalRail.vue'
import LuckySpinner from '../LuckySpinner.vue'

/**
 * StoriesSection — community voices and story submission.
 *
 * Displays testimonials in an interactive auto-drifting rail with visible
 * arrow navigation controls. Below is the submission card with lucky spinner hook.
 */
const batchOptions = [
  '2026 / S1 Manajemen',
  '2026 / S1 Akuntansi',
  '2026 / S1 Bisnis Digital',
  '2026 / S1 Ilmu Komputer',
  '2026 / S1 Sains Data',
  '2026 / S1 Agribisnis',
  '2025 / Mahasiswa UPB',
  'Alumni / Pengunjung Umum',
]

const railRef = ref(null)
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
    formError.value = 'Cerita belum dapat dikirim. Silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}

const initials = (value) => (value || '?').charAt(0).toUpperCase()

function scrollPrev() {
  railRef.value?.scrollPrev()
}

function scrollNext() {
  railRef.value?.scrollNext()
}

onMounted(async () => {
  await loadStories()
  pollTimer = setInterval(loadStories, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <section id="stories" class="stories">
    <div class="stories__inner">
      <div class="stories__header-row">
        <div class="ec-section-head" style="margin-bottom: 0;">
          <span class="ec-eyebrow">Suara Komunitas</span>
          <h2 class="ec-h2">Stories from English Club</h2>
          <p class="ec-lede">Kesan, pengalaman, dan cerita nyata dari teman-teman mahasiswa yang mampir ke stand kami.</p>
        </div>

        <!-- Visible Carousel Nav Controls -->
        <div v-if="!loading && stories.length > 0" class="stories__nav-buttons" aria-label="Navigasi cerita">
          <button
            class="stories__nav-btn"
            type="button"
            aria-label="Cerita sebelumnya"
            @click="scrollPrev"
          >
            <ChevronLeft :size="20" :stroke-width="2.2" />
          </button>
          <button
            class="stories__nav-btn"
            type="button"
            aria-label="Cerita berikutnya"
            @click="scrollNext"
          >
            <ChevronRight :size="20" :stroke-width="2.2" />
          </button>
        </div>
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
        <p class="ec-state__body">Jadilah yang pertama membagikan pengalamanmu berkunjung ke stand English Club!</p>
      </div>

      <!-- Stories Rail -->
      <div v-else class="stories__rail-wrap">
        <HorizontalRail
          ref="railRef"
          :label="`Cerita pengunjung, ${stories.length} cerita`"
          :autoplay-speed="48"
        >
          <div
            v-for="story in stories"
            :key="story.name + story.comment"
            class="ec-rail__item stories__item"
          >
            <figure class="stories__card">
              <div class="stories__card-top">
                <span class="stories__quote-icon" aria-hidden="true">
                  <MessageSquareQuote :size="24" :stroke-width="1.8" />
                </span>
                <span class="stories__tag">Pengunjung Stand</span>
              </div>

              <blockquote class="stories__quote">
                “{{ story.comment }}”
              </blockquote>

              <figcaption class="stories__author">
                <span class="stories__avatar" aria-hidden="true">
                  {{ initials(story.name) }}
                </span>
                <div class="stories__meta">
                  <cite class="stories__name">{{ story.name }}</cite>
                  <span class="stories__batch">{{ story.batch }}</span>
                </div>
              </figcaption>
            </figure>
          </div>
        </HorizontalRail>
      </div>

      <!-- Story Submission Form -->
      <div class="stories__form-wrapper">
        <div class="stories__form-card">
          <div class="stories__form-intro">
            <span class="stories__form-badge">
              <Sparkles :size="15" :stroke-width="2.2" />
              Ada Hadiah Menanti!
            </span>
            <h3 class="stories__form-title">Pernah mampir ke stand kami?</h3>
            <p class="stories__form-desc">
              Tuliskan kesan atau pengalaman serumu. Setelah kirim cerita, kamu berkesempatan memutar <b>Lucky Spinner</b> berhadiah stiker eksklusif atau snack!
            </p>
          </div>

          <form class="stories__form" @submit.prevent="submitStory">
            <div class="stories__fields">
              <div class="stories__field-group">
                <label class="stories__label" for="story-name">Nama Panggilan</label>
                <input
                  id="story-name"
                  v-model="name"
                  class="stories__input"
                  maxlength="40"
                  autocomplete="name"
                  placeholder="Misal: Fajri / Nabila"
                  :disabled="submitting"
                  required
                />
              </div>

              <div class="stories__field-group">
                <label class="stories__label" for="story-batch">Program Studi / Status</label>
                <select
                  id="story-batch"
                  v-model="batch"
                  class="stories__input stories__select"
                  :disabled="submitting"
                >
                  <option value="">Pilih Program Studi</option>
                  <option v-for="option in batchOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>

              <div class="stories__field-group stories__field-group--full">
                <div class="stories__label-row">
                  <label class="stories__label" for="story-comment">Ceritamu</label>
                  <span class="stories__counter">{{ comment.length }}/220</span>
                </div>
                <textarea
                  id="story-comment"
                  v-model="comment"
                  class="stories__input stories__textarea"
                  rows="3"
                  maxlength="220"
                  placeholder="Ceritakan apa yang paling berkesan saat kamu mampir ke stand kami..."
                  :disabled="submitting"
                  required
                ></textarea>
              </div>

              <div class="stories__actions">
                <button
                  class="ec-btn ec-btn--primary stories__submit-btn"
                  type="submit"
                  :disabled="submitting"
                >
                  <Sparkles v-if="!submitting" :size="16" :stroke-width="2" aria-hidden="true" />
                  {{ submitting ? 'Mengirim Cerita...' : 'Kirim Cerita & Putar Hadiah' }}
                  <Send v-if="!submitting" :size="16" :stroke-width="2" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p v-if="formError" class="stories__status-msg stories__status-msg--error" role="alert">
              {{ formError }}
            </p>
            <p v-else-if="sentTo" class="stories__status-msg stories__status-msg--success" role="status">
              Terima kasih, {{ sentTo }}! Ceritamu telah berhasil ditampilkan di atas.
            </p>
          </form>
        </div>
      </div>
    </div>

    <!-- Lucky Spinner Modal -->
    <LuckySpinner
      v-if="showSpinner"
      :story-id="prizeTarget"
      :story-name="lastStoryName"
      @close="showSpinner = false"
    />
  </section>
</template>

<style scoped>
.stories {
  width: 100%;
  padding: clamp(56px, 7vw, 92px) 0;
  background: var(--ec-surface, #ffffff);
  border-bottom: 1px solid var(--ec-line);
  scroll-margin-top: 84px;
}

.stories__inner {
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
}

.stories__header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: var(--ec-space-6);
  flex-wrap: wrap;
}

.stories__nav-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stories__nav-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  color: var(--ec-ink);
  cursor: pointer;
  box-shadow: var(--ec-shadow-sm);
  transition: all var(--ec-dur) var(--ec-ease);
}

.stories__nav-btn:hover {
  background: var(--ec-blue);
  color: #ffffff;
  border-color: var(--ec-blue);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(11, 86, 155, 0.2);
}

.stories__nav-btn:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

.stories__rail-wrap {
  margin-bottom: clamp(48px, 6vw, 72px);
}

.stories__item {
  width: min(480px, 84vw);
  height: 100%;
}

.stories__card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  margin: 0;
  padding: clamp(24px, 3.5vw, 32px);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  box-shadow: var(--ec-shadow-sm);
  transition: transform 0.24s var(--ec-ease), box-shadow 0.24s var(--ec-ease), border-color 0.2s ease;
}

.stories__card:hover {
  transform: translateY(-4px);
  border-color: rgba(11, 86, 155, 0.24);
  box-shadow: 0 16px 36px -12px rgba(15, 42, 68, 0.14);
}

.stories__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.stories__quote-icon {
  color: var(--ec-blue);
}

.stories__tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-blue-050);
  color: var(--ec-blue);
}

.stories__quote {
  margin: 0 0 20px 0;
  font-size: clamp(0.96rem, 1.6vw, 1.1rem);
  line-height: 1.6;
  color: var(--ec-ink);
  font-style: italic;
  font-weight: 500;
}

.stories__author {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--ec-line);
}

.stories__avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: var(--ec-radius-pill);
  background: linear-gradient(135deg, var(--ec-blue) 0%, #1370C0 100%);
  color: #FFFFFF;
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(11, 86, 155, 0.2);
}

.stories__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stories__name {
  font-style: normal;
  font-size: 0.938rem;
  font-weight: 700;
  color: var(--ec-ink);
}

.stories__batch {
  font-size: 0.781rem;
  color: var(--ec-ink-soft);
}

/* ---------- Submission Card ---------- */
.stories__form-wrapper {
  width: 100%;
}

.stories__form-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(28px, 4vw, 56px);
  padding: clamp(28px, 4vw, 48px);
  background: linear-gradient(135deg, #F0F6FC 0%, #F8FAFD 100%);
  border: 1px solid #D2E4F7;
  border-radius: var(--ec-radius-lg);
  box-shadow: var(--ec-shadow-sm);
}

.stories__form-intro {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stories__form-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: 0.75rem;
  font-weight: 700;
  color: #B45309;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  padding: 4px 12px;
  border-radius: var(--ec-radius-pill);
}

.stories__form-title {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.4rem, 2.4vw, 1.85rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--ec-ink);
  margin: 0;
}

.stories__form-desc {
  font-size: 0.906rem;
  line-height: 1.6;
  color: var(--ec-ink-soft);
  margin: 0;
}

.stories__form-desc b {
  color: var(--ec-blue);
}

.stories__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stories__field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stories__field-group--full {
  grid-column: 1 / -1;
}

.stories__label {
  font-size: 0.813rem;
  font-weight: 700;
  color: var(--ec-ink);
}

.stories__label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stories__counter {
  font-size: 0.75rem;
  color: var(--ec-ink-soft);
}

.stories__input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid #CBD5E1;
  border-radius: var(--ec-radius-md);
  background: #FFFFFF;
  color: var(--ec-ink);
  font: inherit;
  font-size: 0.875rem;
  transition: all var(--ec-dur) var(--ec-ease);
}

.stories__input:focus {
  outline: none;
  border-color: var(--ec-blue);
  box-shadow: var(--ec-focus-ring);
}

.stories__select {
  cursor: pointer;
}

.stories__textarea {
  resize: vertical;
  min-height: 84px;
}

.stories__actions {
  grid-column: 1 / -1;
  margin-top: 4px;
}

.stories__submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.938rem;
  font-weight: 700;
  border-radius: var(--ec-radius-pill);
  box-shadow: 0 4px 14px rgba(11, 86, 155, 0.22);
  transition: all var(--ec-dur) var(--ec-ease);
}

.stories__submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(11, 86, 155, 0.32);
}

.stories__status-msg {
  grid-column: 1 / -1;
  margin-top: 12px;
  font-size: 0.844rem;
  font-weight: 600;
}

.stories__status-msg--error {
  color: var(--ec-danger);
}

.stories__status-msg--success {
  color: var(--ec-success);
}

.stories__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ec-space-4);
  margin-bottom: 40px;
}

.stories__skeleton {
  height: 190px;
  border-radius: var(--ec-radius-lg);
}

@media (max-width: 880px) {
  .stories__form-card {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .stories__fields {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .stories {
    padding: 44px 0;
    scroll-margin-top: 120px;
  }

  .stories__header-row {
    gap: 12px;
    margin-bottom: var(--ec-space-4);
  }

  .stories__item {
    width: min(300px, 84vw);
  }

  .stories__card {
    padding: 20px 16px;
  }

  .stories__quote {
    font-size: 0.938rem;
  }

  .stories__form-card {
    padding: 20px 16px;
  }

  .stories__form-title {
    font-size: 1.25rem;
  }

  .stories__form-desc {
    font-size: 0.844rem;
  }

  .stories__submit-btn {
    width: 100%;
    min-height: 52px;
    justify-content: center;
    font-size: 0.875rem;
  }

  .stories__tag {
    font-size: 0.688rem;
  }

  .stories__grid {
    grid-template-columns: 1fr;
  }
}
</style>
