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
  width: 100%;
  padding: clamp(48px, 6vw, 84px) 0 clamp(24px, 3vw, 40px);
  background: linear-gradient(180deg, #FFFFFF 0%, #F5F9FD 55%, #EAF3FB 100%);
  border-bottom: 1px solid var(--ec-line);
  overflow: hidden;
}

/* PRD §7.2 background: detail strongest at the right, fading to the centre-left. */
.hero__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(56% 75% at 84% 42%, rgba(175, 215, 248, 0.65) 0%, rgba(234, 243, 251, 0.4) 42%, rgba(255, 255, 255, 0) 74%),
    radial-gradient(40% 50% at 76% 82%, rgba(255, 230, 0, 0.08) 0%, rgba(255, 230, 0, 0) 70%);
  pointer-events: none;
}

.hero__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(11, 86, 155, 0.12) 1.2px, transparent 1.2px);
  background-size: 20px 20px;
  -webkit-mask-image: radial-gradient(72% 88% at 88% 40%, #000 0%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0) 70%);
  mask-image: radial-gradient(72% 88% at 88% 40%, #000 0%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0) 70%);
}

.hero__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  gap: clamp(32px, 5vw, 64px);
  width: min(100%, var(--ec-container));
  margin: 0 auto;
  padding-inline: var(--ec-gutter);
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
  font-size: 0.813rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ec-blue);
  background: rgba(11, 86, 155, 0.06);
  padding: 6px 14px;
  border-radius: var(--ec-radius-pill);
  border: 1px solid rgba(11, 86, 155, 0.12);
}

.hero__rule {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ec-yellow);
  box-shadow: 0 0 0 2px var(--ec-blue);
}

.hero__title {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(3.2rem, 6.2vw, 6.4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.96;
  color: var(--ec-ink);
  text-wrap: balance;
}

.hero__title-accent {
  color: var(--ec-blue);
  position: relative;
}

.hero__lede {
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  line-height: 1.6;
  color: var(--ec-ink-soft);
  max-width: 54ch;
}

.hero__cta {
  margin-top: var(--ec-space-2);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 28px;
  font-size: 0.98rem;
  font-weight: 700;
  border-radius: var(--ec-radius-pill);
  box-shadow: 0 6px 20px rgba(11, 86, 155, 0.22);
  transition: transform var(--ec-dur) var(--ec-ease), box-shadow var(--ec-dur) var(--ec-ease);
}

.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(11, 86, 155, 0.32);
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
  height: clamp(360px, 50vh, 560px);
  max-width: min(100%, 520px);
  object-fit: contain;
  filter: drop-shadow(0 20px 36px rgba(15, 42, 68, 0.16));
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.hero__mascot:hover {
  transform: translateY(-4px) scale(1.015);
}

.hero__dock {
  display: flex;
  justify-content: center;
  width: min(100%, var(--ec-container));
  margin: clamp(24px, 3.5vw, 42px) auto 0;
  padding-inline: var(--ec-gutter);
}

@media (max-width: 860px) {
  .hero {
    padding: 36px 0 20px;
    scroll-margin-top: 120px;
  }

  .hero__inner {
    grid-template-columns: 1fr;
    gap: var(--ec-space-5);
  }

  .hero__copy {
    max-width: none;
    align-items: stretch;
    text-align: left;
  }

  .hero__title {
    font-size: clamp(2rem, 10vw, 2.75rem);
    line-height: 1.02;
  }

  .hero__lede {
    font-size: 0.95rem;
    max-width: 38ch;
  }

  .hero__cta {
    width: 100%;
    max-width: 340px;
    min-height: 52px;
    justify-content: center;
  }

  .hero__art {
    justify-content: center;
    order: 2;
  }

  .hero__mascot {
    height: clamp(180px, 52vw, 260px);
    width: 100%;
    max-width: 300px;
  }

  .hero__dock {
    padding-inline: 0;
    margin-top: 20px;
  }
}
</style>
