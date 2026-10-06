<script setup>
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { api } from '../../api.js'

/**
 * HappeningSection — "What's Happening at English Club?"
 *
 * PRD_Homepage_Redesign §7.4: shows real proker data so visitors can discover programs
 * without opening a separate page first. Cards stay scannable (cover, title, status,
 * short caption, one clear detail affordance) in a wrapping 3-2-1 grid.
 * The requested status chips filter this already-loaded dataset locally;
 * no filter endpoint or invented backend capability is introduced.
 *
 * Data, loading, error and empty states all come from the existing `/api/proker`.
 * Nothing here is invented.
 */
const emit = defineEmits(['open'])

const proker = ref([])
const loading = ref(true)
const error = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
]

const STATUS = {
  upcoming: { label: 'Akan datang', badge: 'ec-badge--upcoming' },
  ongoing: { label: 'Berlangsung', badge: 'ec-badge--ongoing' },
  completed: { label: 'Selesai', badge: 'ec-badge--completed' },
}

function statusOf(item) {
  return STATUS[statusKey(item)]
}

function statusKey(item) {
  return STATUS[item.status] ? item.status : 'upcoming'
}

function coverOf(item) {
  return item.imageUrl || item.image_url || item.photos?.[0] || '/Logo_ec.jpg'
}

function plainText(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Trim on a word boundary so the clamped caption never ends mid-word.
function teaser(value, limit = 130) {
  const text = plainText(value)
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// Proker dates arrive as plain YYYY-MM-DD, so they are read as calendar dates
// rather than as the UTC stamps formatWIB() in utils/time.js is built for.
function formatDate(value) {
  if (!value) return ''
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? String(value) : dateFormatter.format(d)
}

const cardCount = computed(() => proker.value.length)
const visibleProker = computed(() => activeFilter.value === 'all'
  ? proker.value
  : proker.value.filter((item) => statusKey(item) === activeFilter.value))
const activeFilterLabel = computed(() => filters.find((filter) => filter.key === activeFilter.value)?.label || 'selected')

async function load() {
  loading.value = true
  error.value = ''
  try {
    proker.value = (await api.proker()).proker || []
  } catch {
    error.value = 'Program English Club belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section id="happening" class="ec-section happening">
    <div class="ec-section-head">
      <span class="ec-eyebrow">Program</span>
      <h2 class="ec-h2">What's Happening at English Club?</h2>
      <p class="ec-lede">Program kerja dan aktivitas English Club—yang akan datang, sedang berlangsung, maupun selesai.</p>
    </div>

    <div v-if="!loading && !error && cardCount > 0" class="happening__filters" role="group" aria-label="Filter program berdasarkan status">
      <button
        v-for="filter in filters"
        :key="filter.key"
        class="happening__filter"
        :class="{ 'happening__filter--active': activeFilter === filter.key }"
        type="button"
        :aria-pressed="activeFilter === filter.key"
        @click="activeFilter = filter.key"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="happening__grid" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="happening__skeleton">
        <div class="ec-skeleton happening__skeleton-media"></div>
        <div class="ec-skeleton happening__skeleton-line"></div>
        <div class="ec-skeleton happening__skeleton-line"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="ec-state ec-state--error" role="alert">
      <p class="ec-state__title">Program belum dapat dimuat</p>
      <p class="ec-state__body">{{ error }}</p>
      <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="load">Coba lagi</button>
    </div>

    <!-- Empty -->
    <div v-else-if="cardCount === 0" class="ec-state">
      <p class="ec-state__title">Belum ada program</p>
      <p class="ec-state__body">Belum ada program yang dipublikasikan. Program English Club akan muncul di sini begitu tersedia.</p>
    </div>

    <!-- Programs -->
    <template v-else>
      <div v-if="visibleProker.length === 0" class="ec-state happening__filtered-empty">
        <p class="ec-state__title">No {{ activeFilterLabel.toLowerCase() }} programs yet</p>
        <p class="ec-state__body">Coba lihat semua program atau pilih status lainnya.</p>
        <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="activeFilter = 'all'">View all programs</button>
      </div>

      <template v-else>
      <div class="happening__list">
        <div
          v-for="(p, index) in visibleProker"
          :key="p.id"
          class="happening__item"
        >
          <button class="ec-card ec-card--interactive happening__card" type="button" @click="emit('open', p)">
            <span class="happening__heading" :class="`happening__heading--${statusKey(p)}`">
              <img class="happening__image" :src="coverOf(p)" :alt="`Foto program ${p.title}`" loading="lazy" decoding="async" draggable="false" />
            </span>

            <span class="happening__body">
              <span class="ec-h3 happening__title">{{ p.title }}</span>
              <span class="ec-badge happening__status" :class="statusOf(p).badge">{{ statusOf(p).label }}</span>
              <span class="happening__details">
                <span v-if="formatDate(p.date)" class="happening__meta">
                  <CalendarDays :size="13" :stroke-width="1.9" aria-hidden="true" />
                  {{ formatDate(p.date) }}
                </span>
                <span v-if="teaser(p.description || p.caption, 72)" class="happening__desc">
                  {{ teaser(p.description || p.caption, 72) }}
                </span>
              </span>

              <span class="happening__cta">
                View
                <ArrowRight :size="15" :stroke-width="2" aria-hidden="true" />
              </span>
            </span>
          </button>
        </div>
      </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.happening {
  /* Keep the section clear of the sticky navbar when reached via anchor. */
  scroll-margin-top: 84px;
}

.happening__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ec-space-4);
  align-items: stretch;
}

.happening__item {
  width: 100%;
  min-width: 0;
  min-height: 220px;
}

.happening__card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.happening__heading {
  position: relative;
  flex: 0 0 auto;
  display: block;
  height: 190px;
  overflow: hidden;
  background: var(--happening-tone);
  --happening-tone: #FFF9E5;
}

.happening__heading--ongoing {
  --happening-tone: #EAF8F2;
}

.happening__heading--completed {
  --happening-tone: #EAF4FD;
}

.happening__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.happening__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.28;
}

.happening__body {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 14px;
  text-align: left;
}

.happening__status {
  justify-self: start;
  padding: 4px 10px;
  border: 0;
  border-radius: var(--ec-radius-pill);
  font-size: 0.65rem;
  letter-spacing: 0;
  text-transform: none;
}

.happening__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.happening__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  line-height: 1.35;
  font-weight: 600;
  color: var(--ec-ink-soft);
}

.happening__desc {
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--ec-ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.happening__cta {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ec-blue);
}

.happening__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: calc(var(--ec-space-6) * -1 + var(--ec-space-2));
  margin-bottom: var(--ec-space-5);
}

.happening__filter {
  min-height: 36px;
  padding: 8px 16px;
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  color: var(--ec-ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background var(--ec-dur) var(--ec-ease), color var(--ec-dur) var(--ec-ease), border-color var(--ec-dur) var(--ec-ease);
}

.happening__filter:hover:not(.happening__filter--active) {
  border-color: var(--ec-blue);
  color: var(--ec-blue);
}

.happening__filter--active {
  border-color: var(--ec-ink);
  background: var(--ec-ink);
  color: var(--ec-surface);
}

.happening__filter:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

.happening__filtered-empty {
  text-align: left;
}

.happening__card:hover .happening__cta svg {
  transform: translateX(3px);
}

.happening__cta svg {
  transition: transform var(--ec-dur) var(--ec-ease);
}

.happening__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ec-space-4);
}

.happening__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
  padding: var(--ec-space-4);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  background: var(--ec-surface);
}

.happening__skeleton-media {
  aspect-ratio: 4 / 3;
  border-radius: var(--ec-radius-md);
}

.happening__skeleton-line {
  height: 14px;
  border-radius: var(--ec-radius-sm);
}

@media (max-width: 1020px) {
  .happening__list,
  .happening__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .happening__list,
  .happening__grid {
    grid-template-columns: 1fr;
  }
}
</style>

