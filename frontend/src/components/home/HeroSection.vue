<script setup>
import { ArrowRight } from 'lucide-vue-next'
import ActionDock from './ActionDock.vue'

/**
 * HeroSection — orients the visitor and exposes the important actions.
 *
 * PRD_Homepage_Redesign §7.2, locked: headline "Learn. Connect. Grow.", supporting copy
 * "A place to practice English, discover new activities, and grow together.",
 * exactly ONE primary CTA, Eli as the mascot, Action Dock at the bottom.
 * The Frank Smith quote and the giant ENGLISH CLUB lockup are removed.
 *
 * Background behaviour required by the PRD: the most detail sits on the right where
 * Eli is, and softens toward the centre-left so the headline stays readable. No glow,
 * no floating shapes, no decorative noise. Height is fluid so the dock is discoverable
 * without a forced full-screen scroll.
 */
defineProps({
  authenticated: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])
</script>

<template>
  <section id="top" class="hero">
    <div class="hero__bg" aria-hidden="true"></div>

    <div class="hero__inner">
      <div class="hero__copy">
        <p class="hero__eyebrow">
          <span class="hero__rule" aria-hidden="true"></span>
          English Club UPB
        </p>

        <h1 class="hero__title">Learn. Connect. <span class="hero__title-accent">Grow.</span></h1>

        <p class="hero__lede">A place to practice English, discover new activities, and grow together.</p>

        <a class="ec-btn ec-btn--primary hero__cta" href="#happening">
          Explore English Club
          <ArrowRight :size="18" :stroke-width="2" aria-hidden="true" />
        </a>
      </div>

      <div class="hero__art">
        <img
          class="hero__mascot"
          src="/Eli.png"
          alt="Eli, maskot English Club UPB"
          width="539"
          height="760"
          fetchpriority="high"
          decoding="async"
        />
      </div>
    </div>

    <div class="hero__dock">
      <ActionDock :authenticated="authenticated" @action="emit('action', $event)" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  /* Reaching #top must not tuck the eyebrow under the sticky navbar. */
  scroll-margin-top: 84px;
  /* Full-bleed like AboutSection so background meets sections below edge-to-edge.
     Content stays in the shared 1180px container via .hero__inner. */
  margin-inline: calc(-1 * var(--ec-gutter));
  padding: clamp(42px, 5vw, 72px) var(--ec-gutter) clamp(16px, 2vw, 24px);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(245, 249, 252, 0.72) 36%, rgba(233, 242, 248, 0.82) 100%);
}

/* PRD §7.2 background: detail strongest at the right, fading to the centre-left. */
.hero__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(58% 82% at 86% 36%, rgba(170, 209, 240, 0.9) 0%, rgba(233, 242, 248, 0.85) 28%, rgba(255, 255, 255, 0) 72%),
    radial-gradient(44% 54% at 82% 82%, rgba(255, 230, 0, 0.14) 0%, rgba(255, 230, 0, 0) 76%);
  pointer-events: none;
}

.hero__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(11, 86, 155, 0.14) 1px, transparent 1px);
  background-size: 18px 18px;
  /* Strong right-side emphasis, but still keep the left text area clean and readable. */
  -webkit-mask-image: radial-gradient(72% 88% at 88% 40%, #000 0%, rgba(0, 0, 0, 0.9) 44%, rgba(0, 0, 0, 0) 72%);
  mask-image: radial-gradient(72% 88% at 88% 40%, #000 0%, rgba(0, 0, 0, 0.9) 44%, rgba(0, 0, 0, 0) 72%);
}

.hero__inner {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  align-items: center;
  gap: clamp(28px, 4vw, 56px);
  width: min(100%, var(--ec-container));
  margin: 0 auto;
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ec-space-4);
  max-width: none;
  padding-left: 0;
}

.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--ec-space-3);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ec-blue);
}

.hero__rule {
  width: 28px;
  height: 3px;
  border-radius: 3px;
  background: var(--ec-yellow);
}

.hero__title {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(3.8rem, 7vw, 7.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  /* 1.02 clipped the descender of "Grow." at large sizes. */
  line-height: 0.92;
  color: var(--ec-ink);
  text-wrap: balance;
}

.hero__title-accent {
  color: var(--ec-blue);
}

.hero__lede {
  font-size: clamp(1.05rem, 1.8vw, 1.45rem);
  line-height: 1.55;
  color: var(--ec-ink-soft);
  max-width: 60ch;
}

.hero__cta {
  margin-top: var(--ec-space-1);
}

.hero__art {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  min-width: 0;
  padding-right: 0;
}

.hero__mascot {
  width: auto;
  /* Stronger right-side anchor keeps the mascot composition crisp and deliberate. */
  height: clamp(390px, 54vh, 610px);
  max-width: min(100%, 560px);
  object-fit: contain;
  /* Neutral drop shadow — a brand-blue tint here reads as a glow. */
  filter: drop-shadow(0 18px 30px rgba(31, 41, 55, 0.14));
}

.hero__dock {
  display: flex;
  justify-content: center;
  width: min(100%, var(--ec-container));
  margin: clamp(18px, 2vw, 28px) auto 0;
}

@media (max-width: 860px) {
  .hero__inner {
    grid-template-columns: 1fr;
    gap: var(--ec-space-6);
  }

  .hero__copy {
    max-width: none;
  }

  .hero__art {
    justify-content: center;
  }

  .hero__mascot {
    height: clamp(200px, 34vh, 300px);
  }
}
</style>
