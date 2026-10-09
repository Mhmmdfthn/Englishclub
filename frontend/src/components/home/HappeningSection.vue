<script setup>
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import { api } from '../../api.js'

/**
 * HappeningSection — "What's Happening at English Club?"
 *
 * Displays active & past programs in a responsive 3-column grid.
 * Program cards stay scannable with cover photo, status badge, date, title,
 * and a clear detail affordance. Status chips filter locally without fake endpoints.
 */
const emit = defineEmits(['open'])

const proker = ref([])
const loading = ref(true)
const error = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: 'All Programs' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
]

const STATUS = {
  upcoming: { label: 'Akan Datang', badge: 'happening__badge--upcoming' },
  ongoing: { label: 'Berlangsung', badge: 'happening__badge--ongoing' },
  completed: { label: 'Selesai', badge: 'happening__badge--completed' },
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

function teaser(value, limit = 110) {
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

function formatDate(value) {
  if (!value) return ''
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? String(value) : dateFormatter.format(d)
}

const cardCount = computed(() => proker.value.length)
const visibleProker = computed(() =>
  activeFilter.value === 'all'
    ? proker.value
    : proker.value.filter((item) => statusKey(item) === activeFilter.value)
)
const activeFilterLabel = computed(
  () => filters.find((f) => f.key === activeFilter.value)?.label || 'selected'
)

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
  <section id="happening" class="happening">
    <div class="happening__inner">
      <div class="ec-section-head">
        <span class="ec-eyebrow">Aktivitas & Agenda</span>
        <h2 class="ec-h2">What's Happening at English Club?</h2>
        <p class="ec-lede">Program kerja, agenda rutin, dan aktivitas komunitas mahasiswa English Club UPB.</p>
      </div>

      <!-- Status Filters -->
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

      <!-- Loading Skeletons -->
      <div v-if="loading" class="happening__grid" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="happening__skeleton">
          <div class="ec-skeleton happening__skeleton-media"></div>
          <div class="happening__skeleton-body">
            <div class="ec-skeleton happening__skeleton-badge"></div>
            <div class="ec-skeleton happening__skeleton-title"></div>
            <div class="ec-skeleton happening__skeleton-line"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="ec-state ec-state--error" role="alert">
        <p class="ec-state__title">Program belum dapat dimuat</p>
        <p class="ec-state__body">{{ error }}</p>
        <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="load">Coba lagi</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="cardCount === 0" class="ec-state">
        <p class="ec-state__title">Belum ada program</p>
        <p class="ec-state__body">Belum ada program yang dipublikasikan. Agenda kegiatan baru akan segera hadir.</p>
      </div>

      <!-- Programs Grid -->
      <template v-else>
        <div v-if="visibleProker.length === 0" class="ec-state happening__filtered-empty">
          <p class="ec-state__title">Tidak ada program {{ activeFilterLabel.toLowerCase() }}</p>
          <p class="ec-state__body">Coba lihat semua program untuk melihat agenda lainnya.</p>
          <button class="ec-btn ec-btn--secondary ec-btn--sm" type="button" @click="activeFilter = 'all'">Lihat Semua Program</button>
        </div>

        <div v-else class="happening__grid">
          <article
            v-for="p in visibleProker"
            :key="p.id"
            class="happening__card"
            @click="emit('open', p)"
          >
            <div class="happening__media">
              <img
                class="happening__image"
                :src="coverOf(p)"
                :alt="`Foto kegiatan ${p.title}`"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              <span class="happening__badge" :class="statusOf(p).badge">
                <span class="happening__badge-dot" aria-hidden="true"></span>
                {{ statusOf(p).label }}
              </span>
            </div>

            <div class="happening__body">
              <div v-if="formatDate(p.date)" class="happening__meta">
                <CalendarDays :size="14" :stroke-width="2" aria-hidden="true" />
                <span>{{ formatDate(p.date) }}</span>
              </div>

              <h3 class="happening__title">{{ p.title }}</h3>

              <p v-if="teaser(p.description || p.caption)" class="happening__desc">
                {{ teaser(p.description || p.caption) }}
              </p>

              <div class="happening__footer">
                <span class="happening__cta">
                  Detail Program
                  <ArrowRight :size="15" :stroke-width="2.2" aria-hidden="true" />
                </span>
              </div>
            </div>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.happening {
  width: 100%;
  padding: clamp(56px, 7vw, 92px) 0;
  background: var(--ec-surface, #ffffff);
  border-bottom: 1px solid var(--ec-line);
  scroll-margin-top: 84px;
}

.happening__inner {
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
}

.happening__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -12px;
  margin-bottom: var(--ec-space-6);
}

.happening__filter {
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  background: var(--ec-surface);
  color: var(--ec-ink);
  font: inherit;
  font-size: 0.813rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
  transition: all var(--ec-dur) var(--ec-ease);
}

.happening__filter:hover:not(.happening__filter--active) {
  border-color: var(--ec-blue);
  color: var(--ec-blue);
  background: var(--ec-blue-050);
}

.happening__filter--active {
  border-color: var(--ec-blue);
  background: var(--ec-blue);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(11, 86, 155, 0.2);
}

.happening__filter:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

.happening__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(20px, 3vw, 32px);
  align-items: stretch;
}

.happening__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--ec-shadow-sm);
  transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1),
              box-shadow 0.24s cubic-bezier(0.2, 0.8, 0.2, 1),
              border-color 0.2s ease;
}

.happening__card:hover {
  transform: translateY(-5px);
  border-color: rgba(11, 86, 155, 0.3);
  box-shadow: 0 16px 36px -12px rgba(11, 86, 155, 0.16), 0 4px 12px rgba(0, 0, 0, 0.04);
}

.happening__card:hover .happening__image {
  transform: scale(1.04);
}

.happening__card:hover .happening__cta {
  color: var(--ec-blue-strong);
}

.happening__card:hover .happening__cta svg {
  transform: translateX(4px);
}

.happening__media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--ec-blue-050);
}

.happening__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.happening__badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--ec-radius-pill);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.happening__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.happening__badge--upcoming {
  background: rgba(255, 251, 235, 0.94);
  color: #B45309;
  border: 1px solid rgba(253, 230, 138, 0.8);
}

.happening__badge--ongoing {
  background: rgba(236, 253, 245, 0.94);
  color: #047857;
  border: 1px solid rgba(167, 243, 208, 0.8);
}

.happening__badge--completed {
  background: rgba(241, 245, 249, 0.94);
  color: #475569;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.happening__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  padding: 20px 22px 22px;
  text-align: left;
}

.happening__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.781rem;
  font-weight: 600;
  color: var(--ec-ink-soft);
  margin-bottom: 8px;
}

.happening__title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ec-ink);
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.happening__desc {
  font-size: 0.844rem;
  line-height: 1.55;
  color: var(--ec-ink-soft);
  margin: 0 0 16px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.happening__footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(229, 231, 235, 0.6);
}

.happening__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.813rem;
  font-weight: 700;
  color: var(--ec-blue);
  transition: color var(--ec-dur) var(--ec-ease);
}

.happening__cta svg {
  transition: transform var(--ec-dur) var(--ec-ease);
}

/* Skeleton loader */
.happening__skeleton {
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  overflow: hidden;
  background: var(--ec-surface);
}

.happening__skeleton-media {
  aspect-ratio: 16 / 10;
  border-radius: 0;
}

.happening__skeleton-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.happening__skeleton-badge {
  width: 80px;
  height: 20px;
  border-radius: var(--ec-radius-pill);
}

.happening__skeleton-title {
  height: 22px;
  width: 85%;
  border-radius: var(--ec-radius-sm);
}

.happening__skeleton-line {
  height: 16px;
  width: 65%;
  border-radius: var(--ec-radius-sm);
}

@media (max-width: 980px) {
  .happening__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .happening {
    padding: 44px 0;
    scroll-margin-top: 120px;
  }

  .happening__filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    /* Tahan rambatan swipe diagonal ke halaman (Safari iPhone). */
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    margin-bottom: var(--ec-space-4);
    padding-bottom: 4px;
    margin-inline: calc(-1 * var(--ec-gutter));
    padding-inline: var(--ec-gutter);
    max-width: calc(100% + var(--ec-gutter) * 2);
  }

  .happening__filters::-webkit-scrollbar {
    display: none;
  }

  .happening__grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .happening__body {
    padding: 16px 16px 18px;
  }

  .happening__title {
    font-size: 1.05rem;
  }

  .happening__desc {
    font-size: 0.813rem;
    margin-bottom: 12px;
  }
}
</style>
