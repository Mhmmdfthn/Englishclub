<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ListChecks, Telescope } from 'lucide-vue-next'

/**
 * AboutSection — who English Club is + sortable photo deck + visi & misi.
 *
 * Layout (permintaan user):
 *   atas: [Who we are | deck foto interaktif]
 *   bawah: [kotak Visi | kotak Misi] berjejer 2 kolom.
 *
 * Deck foto: tumpukan kartu, klik kartu paling depan -> animasi swap
 * seperti memilah foto, kartu yang sudah dilihat pindah ke belakang lagi
 * (rotasi FIFO melingkar, bukan keluar dari deck).
 */
const vision = [
  'Latihan bahasa Inggris yang mudah diikuti mahasiswa.',
  'Anggota yang lebih percaya diri saat berbicara di kelas dan di tempat kerja.',
]

const mission = [
  'Latihan speaking dan listening secara rutin.',
  'Kesempatan untuk mempraktikkan public speaking.',
  'Kegiatan dan kompetisi berbahasa Inggris.',
  'Dukungan untuk anggota yang mengikuti kegiatan akademik dan organisasi.',
]

const photos = [
  { src: '/Eli_mascout.jpg', alt: 'Maskot Eli English Club', caption: 'Eli — maskot English Club' },
  { src: '/Tom_mascout.jpg', alt: 'Maskot Tom English Club', caption: 'Tom — maskot English Club' },
  { src: '/Eli.png', alt: 'Ilustrasi Eli', caption: 'Eli dalam versi ilustrasi' },
  { src: '/logo-ec.png', alt: 'Logo English Club UPB', caption: 'Logo English Club UPB' },
]

// Urutan deck: order[0] = kartu paling depan.
const order = ref(photos.map((_, i) => i))
const leaving = ref(false)
const leavingId = ref(-1)
let leaveTimer = null

const topPhoto = computed(() => photos[order.value[0]])

function nextPhoto() {
  if (leaving.value || order.value.length < 2) return
  leaving.value = true
  leavingId.value = order.value[0]
  clearTimeout(leaveTimer)
  // Tunggu animasi swap selesai, lalu pindah kartu depan ke belakang.
  leaveTimer = setTimeout(() => {
    const first = order.value.shift()
    order.value.push(first)
    leaving.value = false
    leavingId.value = -1
  }, 380)
}

function positionOf(id) {
  return order.value.indexOf(id)
}

onBeforeUnmount(() => clearTimeout(leaveTimer))
</script>

<template>
  <section id="about" class="about">
    <div class="ec-section about__inner">
      <div class="ec-section-head about__eyebrow">
        <span class="ec-eyebrow">About English Club</span>
      </div>

      <!-- Atas: teks + deck foto -->
      <div class="about__grid">
        <div class="about__left">
          <h2 class="ec-h2 about__title">Belajar bahasa Inggris bareng mahasiswa UPB.</h2>
          <div class="about__who">
            <h3 class="ec-h3">Who we are</h3>
            <p class="ec-body">
              <b>English Club UPB</b> adalah UKM di bawah <b>BEM — Departemen Keilmuan</b> Universitas Putra Bangsa
              Kebumen. Kegiatan kami berfokus pada latihan bahasa Inggris dan kegiatan kampus.
            </p>
            <p class="ec-body">
              Terbuka untuk seluruh mahasiswa yang ingin berlatih speaking, listening, dan public speaking.
            </p>
            <p class="ec-caption about__hint">Klik foto di samping untuk memilah dan melihat dokumentasi berikutnya.</p>
          </div>
        </div>

        <div class="deck" aria-label="Dokumentasi English Club">
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
                :aria-label="`Foto: ${photo.caption}. Klik untuk pindah ke belakang.`"
                @click="nextPhoto"
              >
                <img :src="photo.src" :alt="photo.alt" loading="lazy" />
                <figcaption class="deck__caption">
                  <span>{{ photo.caption }}</span>
                  <span class="deck__next" aria-hidden="true">Lihat berikutnya &#8594;</span>
                </figcaption>
              </button>
              <template v-else>
                <img :src="photo.src" :alt="photo.alt" loading="lazy" aria-hidden="true" tabindex="-1" />
                <figcaption class="deck__caption" aria-hidden="true">
                  <span>{{ photo.caption }}</span>
                </figcaption>
              </template>
            </figure>
          </div>

          <div class="deck__meta">
            <div class="deck__dots" aria-hidden="true">
              <span
                v-for="(id, i) in order"
                :key="id"
                class="deck__dot"
                :class="{ 'is-active': i === 0 }"
              ></span>
            </div>
            <p class="ec-caption">
              Foto {{ 1 }} dari {{ photos.length }} — <b>{{ topPhoto.caption }}</b>
            </p>
            <button type="button" class="ec-btn ec-btn--secondary ec-btn--sm deck__btn" @click="nextPhoto">
              Pilah foto berikutnya
            </button>
          </div>
        </div>
      </div>

      <!-- Bawah: 2 kotak berjejer -->
      <div class="vm">
        <article class="vm__card vm__card--visi" aria-labelledby="visi-title">
          <div class="vm__head">
            <span class="vm__icon" aria-hidden="true"><Telescope :size="18" :stroke-width="1.9" /></span>
            <h3 id="visi-title" class="ec-h3">Visi</h3>
          </div>
          <ul class="about__list about__list--visi">
            <li v-for="item in vision" :key="item">{{ item }}</li>
          </ul>
        </article>

        <article class="vm__card vm__card--misi" aria-labelledby="misi-title">
          <div class="vm__head">
            <span class="vm__icon" aria-hidden="true"><ListChecks :size="18" :stroke-width="1.9" /></span>
            <h3 id="misi-title" class="ec-h3">Misi</h3>
          </div>
          <ol class="about__list about__list--misi">
            <li v-for="item in mission" :key="item">{{ item }}</li>
          </ol>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  margin-inline: calc(-1 * var(--ec-gutter));
  padding-inline: var(--ec-gutter);
  background: var(--ec-canvas);
  scroll-margin-top: 84px;
}

.about__eyebrow {
  margin-bottom: var(--ec-space-4);
}

.about__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 380px);
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
}

.about__left {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-4);
  min-width: 0;
}

.about__title {
  margin: 0;
}

.about__who {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
}

.about__hint {
  margin-top: var(--ec-space-2);
}

/* ---------- Deck foto ---------- */
.deck {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
  width: 100%;
  max-width: 380px;
  justify-self: end;
}

.deck__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3.2;
  min-height: 240px;
}

.deck__card {
  position: absolute;
  inset: 0;
  margin: 0;
  overflow: hidden;
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  box-shadow: var(--ec-shadow-md);
  /* Tumpukan: tiap lapisan sedikit mengecil + turun + miring. */
  transform:
    translateY(calc(var(--pos) * 12px))
    scale(calc(1 - var(--pos) * 0.035))
    rotate(calc(var(--pos) * 1.6deg));
  transform-origin: 50% 88%;
  transition: transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 380ms ease;
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
  aspect-ratio: 4 / 3.2;
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
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  font-size: 0.813rem;
  font-weight: 600;
  color: var(--ec-ink);
}

.deck__next {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ec-blue);
}

/* Animasi swap: kartu depan terlempar ke kanan seperti dipilah, lalu ke belakang. */
.deck__card.is-leaving {
  transform: translateX(110%) translateY(-14px) rotate(16deg);
  opacity: 0;
}

.deck__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.deck__dots {
  display: flex;
  gap: 6px;
}

.deck__dot {
  width: 22px;
  height: 6px;
  border-radius: 999px;
  background: var(--ec-line);
  transition: background 180ms ease;
}

.deck__dot.is-active {
  background: var(--ec-blue);
}

.deck__meta .ec-caption {
  flex: 1 1 auto;
  min-width: 160px;
}

.deck__btn {
  flex-shrink: 0;
}

/* ---------- Visi Misi bawah ---------- */
.vm {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(16px, 2.5vw, 28px);
  margin-top: clamp(24px, 4vw, 44px);
}

.vm__card {
  padding: var(--ec-space-5);
  background: var(--ec-surface);
  border: 1px solid var(--ec-line);
  border-radius: var(--ec-radius-lg);
  box-shadow: none;
}

.vm__card--visi {
  background: var(--ec-blue-050);
  border-color: #C9DFF5;
}

.vm__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--ec-space-3);
}

.vm__icon {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--ec-surface);
  border: 1px solid #C9DFF5;
  color: var(--ec-blue);
}

.vm__card--misi .vm__icon {
  background: var(--ec-yellow-soft);
  color: #7a5b00;
}

.about__list {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.about__list li {
  position: relative;
  padding-left: 22px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ec-ink-soft);
}

.about__list--visi li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 14px;
  height: 3px;
  border-radius: 3px;
  background: var(--ec-yellow);
}

.about__list--misi {
  counter-reset: misi;
}

.about__list--misi li {
  counter-increment: misi;
  padding-left: 34px;
}

.about__list--misi li::before {
  content: '0' counter(misi);
  position: absolute;
  left: 0;
  top: 0.28em;
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ec-ink-soft);
}

@media (max-width: 860px) {
  .about__grid {
    grid-template-columns: 1fr;
  }

  .deck {
    max-width: 420px;
    justify-self: start;
  }

  .deck__stage {
    aspect-ratio: 4 / 3;
    min-height: 220px;
  }

  .vm {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .deck__card {
    transition: none;
  }
}
</style>
