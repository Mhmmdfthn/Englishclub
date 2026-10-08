<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ArrowRight, CheckCircle2, ListChecks, Telescope } from 'lucide-vue-next'

/**
 * AboutSection — who English Club is + interactive photo deck + visi & misi.
 *
 * Layout:
 *   top: [Who we are | interactive photo deck]
 *   bottom: [Visi card | Misi card] 2 equal columns.
 *
 * Deck foto: 3D-styled card stack, click to swap FIFO with smooth swipe animation.
 */
const vision = [
  'Mewujudkan wadah latihan bahasa Inggris yang inklusif, ramah, dan aplikatif bagi seluruh mahasiswa.',
  'Membentuk anggota yang percaya diri, kompeten, dan siap berkomunikasi di kancah akademik maupun profesional.',
]

const mission = [
  'Menyelenggarakan sesi latihan speaking dan listening secara rutin dan interaktif.',
  'Memberikan ruang eksplorasi public speaking, diskusi kritis, dan presentasi berbahasa Inggris.',
  'Mengadakan kompetisi, workshop, dan kegiatan kreatif penunjang kemampuan bahasa Inggris.',
  'Mendukung anggota dalam pengembangan soft skill dan keikutsertaan kegiatan keilmuan kampus.',
]

const photos = [
  { src: '/Eli_mascout.jpg', alt: 'Maskot Eli English Club', caption: 'Eli — Maskot Resmi English Club UPB' },
  { src: '/Eli.png', alt: 'Ilustrasi Maskot Eli', caption: 'Eli The Mascot — Siap Menemanimu Belajar' },
  { src: '/logo-ec.png', alt: 'Logo English Club UPB', caption: 'Logo Resmi English Club UPB Kebumen' },
]

// Urutan deck: order[0] = kartu teratas
const order = ref(photos.map((_, i) => i))
const leaving = ref(false)
const leavingId = ref(-1)
let leaveTimer = null

const topPhoto = computed(() => photos[order.value[0]])
const currentIndex = computed(() => order.value[0])

function nextPhoto() {
  if (leaving.value || order.value.length < 2) return
  leaving.value = true
  leavingId.value = order.value[0]
  clearTimeout(leaveTimer)
  leaveTimer = setTimeout(() => {
    const first = order.value.shift()
    order.value.push(first)
    leaving.value = false
    leavingId.value = -1
  }, 360)
}

function positionOf(id) {
  return order.value.indexOf(id)
}

onBeforeUnmount(() => clearTimeout(leaveTimer))
</script>

<template>
  <section id="about" class="about">
    <div class="about__inner">
      <div class="ec-section-head">
        <span class="ec-eyebrow">Tentang Kami</span>
        <h2 class="ec-h2">Mengenal Lebih Dekat English Club</h2>
        <p class="ec-lede">Wadah mahasiswa Universitas Putra Bangsa untuk mengeksplorasi potensi dan bahasa Inggris bersama.</p>
      </div>

      <!-- Top Row: Who we are + Photo Deck -->
      <div class="about__top">
        <div class="about__who">
          <div class="about__badge-org">
            <span class="about__badge-dot"></span>
            UKM BEM — Departemen Keilmuan UPB Kebumen
          </div>

          <h3 class="about__headline">
            Belajar bahasa Inggris tanpa rasa takut salah, tumbuh bersama komunitas.
          </h3>

          <p class="about__body-text">
            <b>English Club UPB</b> adalah Unit Kegiatan Mahasiswa di bawah naungan BEM Departemen Keilmuan
            Universitas Putra Bangsa Kebumen. Kami berkomitmen menciptakan lingkungan yang suportif untuk mengasah kemampuan bahasa Inggris praktis.
          </p>

          <p class="about__body-text">
            Mulai dari percakapan santai sehari-hari, debat, storytelling, hingga persiapan TOEFL dan public speaking—semua dikemas dalam suasana yang hangat dan menyenangkan.
          </p>

          <div class="about__features">
            <div class="about__feature-item">
              <span class="about__feature-icon">✨</span>
              <span>Terbuka untuk semua jurusan & angkatan</span>
            </div>
            <div class="about__feature-item">
              <span class="about__feature-icon">🗣️</span>
              <span>Fokus pada praktik langsung & kepercayaan diri</span>
            </div>
          </div>
        </div>

        <!-- Photo Deck -->
        <div class="deck" aria-label="Dokumentasi dan Maskot English Club">
          <div class="deck__stage">
            <figure
              v-for="(photo, id) in photos"
              :key="photo.src"
              class="deck__card"
              :class="{
                'is-top': positionOf(id) === 0,
                'is-leaving': leaving && leavingId === id,
              }"
              :style="{
                '--pos': positionOf(id),
                'z-index': photos.length - positionOf(id),
              }"
              :aria-hidden="positionOf(id) !== 0"
            >
              <button
                v-if="positionOf(id) === 0"
                type="button"
                class="deck__tap"
                :aria-label="`Foto: ${photo.caption}. Klik untuk foto berikutnya.`"
                @click="nextPhoto"
              >
                <img :src="photo.src" :alt="photo.alt" loading="lazy" />
                <div class="deck__caption">
                  <span class="deck__caption-title">{{ photo.caption }}</span>
                  <span class="deck__caption-action">Klik foto &rarr;</span>
                </div>
              </button>
              <template v-else>
                <img :src="photo.src" alt="" loading="lazy" aria-hidden="true" />
                <figcaption class="deck__caption" aria-hidden="true">
                  <span class="deck__caption-title">{{ photo.caption }}</span>
                </figcaption>
              </template>
            </figure>
          </div>

          <!-- Deck Navigation Controls -->
          <div class="deck__controls">
            <div class="deck__dots" aria-hidden="true">
              <span
                v-for="(_, i) in photos"
                :key="i"
                class="deck__dot"
                :class="{ 'is-active': i === currentIndex }"
              ></span>
            </div>

            <span class="deck__counter" role="status">
              Foto {{ currentIndex + 1 }} dari {{ photos.length }}
            </span>

            <button type="button" class="deck__btn" @click="nextPhoto" aria-label="Lihat foto berikutnya">
              Foto Berikutnya
              <ArrowRight :size="15" :stroke-width="2.2" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Visi & Misi Cards -->
      <div class="vm">
        <article class="vm__card vm__card--visi" aria-labelledby="visi-title">
          <div class="vm__head">
            <span class="vm__icon vm__icon--visi" aria-hidden="true">
              <Telescope :size="20" :stroke-width="2.2" />
            </span>
            <div>
              <span class="vm__label">Arah & Tujuan</span>
              <h3 id="visi-title" class="vm__title">Visi Kami</h3>
            </div>
          </div>
          <ul class="vm__list">
            <li v-for="(item, i) in vision" :key="i" class="vm__item">
              <CheckCircle2 :size="18" :stroke-width="2" class="vm__bullet vm__bullet--visi" aria-hidden="true" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </article>

        <article class="vm__card vm__card--misi" aria-labelledby="misi-title">
          <div class="vm__head">
            <span class="vm__icon vm__icon--misi" aria-hidden="true">
              <ListChecks :size="20" :stroke-width="2.2" />
            </span>
            <div>
              <span class="vm__label">Langkah Strategis</span>
              <h3 id="misi-title" class="vm__title">Misi Kami</h3>
            </div>
          </div>
          <ol class="vm__list">
            <li v-for="(item, i) in mission" :key="i" class="vm__item">
              <span class="vm__num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <span>{{ item }}</span>
            </li>
          </ol>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  width: 100%;
  padding: clamp(56px, 7vw, 92px) 0;
  background: var(--ec-canvas, #F8FAFC);
  border-bottom: 1px solid var(--ec-line);
  scroll-margin-top: 84px;
}

.about__inner {
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
}

.about__top {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: center;
  margin-bottom: clamp(48px, 6vw, 72px);
}

.about__who {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-4);
}

.about__badge-org {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  font-size: 0.781rem;
  font-weight: 700;
  color: var(--ec-blue);
  background: var(--ec-blue-050);
  border: 1px solid rgba(11, 86, 155, 0.14);
  padding: 5px 14px;
  border-radius: var(--ec-radius-pill);
}

.about__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ec-blue);
}

.about__headline {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.6rem, 2.8vw, 2.2rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--ec-ink);
  margin: 0;
}

.about__body-text {
  font-size: 0.94rem;
  line-height: 1.65;
  color: var(--ec-ink-soft);
  margin: 0;
}

.about__body-text b {
  color: var(--ec-ink);
}

.about__features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.about__feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ec-ink);
}

.about__feature-icon {
  font-size: 1.1rem;
}

/* ---------- Deck Foto ---------- */
.deck {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 440px;
  justify-self: center;
}

.deck__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3.2;
  min-height: 260px;
}

.deck__card {
  position: absolute;
  inset: 0;
  margin: 0;
  overflow: hidden;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  box-shadow: 0 10px 28px -8px rgba(15, 42, 68, 0.16);
  transform:
    translateY(calc(var(--pos) * 12px))
    scale(calc(1 - var(--pos) * 0.04))
    rotate(calc(var(--pos) * 1.8deg));
  transform-origin: 50% 90%;
  transition: transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease;
  pointer-events: none;
}

.deck__card.is-top {
  pointer-events: auto;
}

.deck__card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--ec-blue-050);
}

.deck__tap {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.deck__tap:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
  border-radius: var(--ec-radius-lg);
}

.deck__caption {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--ec-radius-md);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.deck__caption-title {
  font-size: 0.813rem;
  font-weight: 700;
  color: var(--ec-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck__caption-action {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ec-blue);
  flex-shrink: 0;
}

.deck__card.is-leaving {
  transform: translateX(115%) translateY(-20px) rotate(18deg);
  opacity: 0;
}

.deck__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 6px;
}

.deck__dots {
  display: flex;
  gap: 6px;
}

.deck__dot {
  width: 18px;
  height: 6px;
  border-radius: var(--ec-radius-pill);
  background: var(--ec-line);
  transition: all 200ms ease;
}

.deck__dot.is-active {
  width: 28px;
  background: var(--ec-blue);
}

.deck__counter {
  font-size: 0.781rem;
  font-weight: 600;
  color: var(--ec-ink-soft);
}

.deck__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-pill);
  color: var(--ec-blue);
  font: inherit;
  font-size: 0.781rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--ec-shadow-sm);
  transition: all var(--ec-dur) var(--ec-ease);
}

.deck__btn:hover {
  background: var(--ec-blue-050);
  border-color: var(--ec-blue);
  transform: translateX(2px);
}

.deck__btn:focus-visible {
  outline: none;
  box-shadow: var(--ec-focus-ring);
}

/* ---------- Visi & Misi Cards ---------- */
.vm {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(20px, 3vw, 32px);
}

.vm__card {
  display: flex;
  flex-direction: column;
  padding: clamp(24px, 4vw, 36px);
  border-radius: var(--ec-radius-lg);
  border: 1px solid var(--ec-line);
  background: var(--ec-surface);
  box-shadow: var(--ec-shadow-sm);
  transition: transform 0.24s var(--ec-ease), box-shadow 0.24s var(--ec-ease);
}

.vm__card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 32px -10px rgba(15, 42, 68, 0.12);
}

.vm__card--visi {
  background: linear-gradient(135deg, #F0F6FC 0%, #FFFFFF 100%);
  border-color: #D2E4F7;
}

.vm__head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.vm__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--ec-radius-md);
  box-shadow: var(--ec-shadow-sm);
}

.vm__icon--visi {
  background: var(--ec-blue);
  color: #ffffff;
}

.vm__icon--misi {
  background: #FEF3C7;
  color: #B45309;
  border: 1px solid #FDE68A;
}

.vm__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ec-ink-soft);
}

.vm__title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ec-ink);
  margin: 2px 0 0;
}

.vm__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vm__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ec-ink);
}

.vm__bullet--visi {
  flex-shrink: 0;
  color: var(--ec-blue);
  margin-top: 3px;
}

.vm__num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--ec-radius-sm);
  background: #FFFBEB;
  color: #B45309;
  border: 1px solid #FDE68A;
  font-size: 0.72rem;
  font-weight: 800;
  margin-top: 2px;
}

@media (max-width: 920px) {
  .about__top {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .deck {
    max-width: 100%;
  }

  .vm {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .about {
    padding: 44px 0;
    scroll-margin-top: 120px;
  }

  .about__top {
    margin-bottom: 36px;
  }

  .about__headline {
    font-size: 1.45rem;
    line-height: 1.3;
  }

  .about__body-text {
    font-size: 0.875rem;
  }

  .deck__stage {
    min-height: 220px;
  }

  .deck__caption {
    padding: 8px 10px;
    left: 8px;
    right: 8px;
    bottom: 8px;
  }

  .deck__caption-title {
    font-size: 0.75rem;
  }

  .deck__controls {
    flex-wrap: wrap;
    gap: 10px;
  }

  .deck__btn {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }

  .vm__card {
    padding: 20px 16px;
  }

  .vm__head {
    gap: 10px;
    margin-bottom: 14px;
  }

  .vm__title {
    font-size: 1.15rem;
  }

  .vm__item {
    font-size: 0.813rem;
  }
}
</style>
