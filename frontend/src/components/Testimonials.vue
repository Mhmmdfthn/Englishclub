<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  entries: { type: Array, required: true },
})

// Organize testimonials into 3 columns
const testimonialColumns = computed(() => {
  const items = props.entries || []
  const firstColumn = items.slice(0, Math.ceil(items.length / 3))
  const secondColumn = items.slice(Math.ceil(items.length / 3), Math.ceil(items.length * 2 / 3))
  const thirdColumn = items.slice(Math.ceil(items.length * 2 / 3))
  return [firstColumn, secondColumn, thirdColumn]
})

const durations = [15, 19, 17]
</script>

<template>
  <section 
    aria-labelledby="testimonials-heading"
    class="testimonials-section"
  >
    <div class="testimonials-header">
      <div class="testimonials-badge">
        Cerita Anggota
      </div>

      <h2 id="testimonials-heading" class="testimonials-title">
        Cerita Anggota English Club
      </h2>
      <p class="testimonials-subtitle">
        Kesan mahasiswa setelah mengenal kegiatan English Club UPB.
      </p>
    </div>

    <div class="testimonials-container">
      <div
        v-for="(column, idx) in testimonialColumns"
        :key="idx"
        class="testimonials-column"
        :class="{ 'hidden-on-mobile': idx > 0 }"
        :style="{ '--duration': durations[idx] + 's' }"
      >
        <ul class="testimonials-list">
          <template v-for="iteration in 2" :key="iteration">
            <li
              v-for="(item, i) in column"
              :key="`${iteration}-${i}`"
              class="testimonial-card"
            >
              <blockquote class="testimonial-quote">
                <p class="testimonial-text">
                  {{ item.comment }}
                </p>
                <footer class="testimonial-footer">
                  <div class="testimonial-avatar">
                    {{ item.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="testimonial-info">
                    <cite class="testimonial-name">
                      {{ item.name }}
                    </cite>
                    <span class="testimonial-batch">
                      {{ item.batch }}
                    </span>
                  </div>
                </footer>
              </blockquote>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testimonials-section {
  background: transparent;
  padding: 96px 0;
  position: relative;
  overflow: hidden;
}

.testimonials-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 540px;
  margin: 0 auto 64px;
  text-align: center;
}

.testimonials-badge {
  display: inline-block;
  border: 2px solid var(--dark-navy);
  padding: 6px 14px;
  border-radius: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--dark-navy);
  background: var(--pure-white);
  box-shadow: 3px 3px 0 var(--dark-navy);
}

.testimonials-title {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 24px 0 20px;
  color: var(--dark-navy);
}

.testimonials-subtitle {
  font-size: 18px;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 400px;
}

.testimonials-container {
  display: flex;
  justify-content: center;
  gap: 24px;
  max-height: 740px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
}

.testimonials-column {
  width: 288px;
}

.hidden-on-mobile {
  display: none;
}

@media (min-width: 768px) {
  .hidden-on-mobile:nth-child(2) {
    display: block;
  }
}

@media (min-width: 1024px) {
  .hidden-on-mobile {
    display: block;
  }
}

.testimonials-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: scroll var(--duration, 15s) linear infinite;
}

@keyframes scroll {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}

.testimonial-card {
  padding: 24px;
  border-radius: 0;
  border: 2px solid var(--dark-navy);
  background: var(--pure-white);
  box-shadow: 4px 4px 0 var(--dark-navy);
  min-width: 288px;
  transition: all 0.3s ease;
}

.testimonial-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--dark-navy);
}

.testimonial-quote {
  margin: 0;
  padding: 0;
}

.testimonial-text {
  color: var(--dark-navy);
  line-height: 1.6;
  font-size: 14px;
  margin: 0 0 20px;
  font-weight: 500;
}

.testimonial-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.testimonial-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0;
  background: var(--dark-navy);
  color: white;
  font-weight: 900;
  font-size: 16px;
  flex-shrink: 0;
  border: 2px solid var(--dark-navy);
}

.testimonial-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.testimonial-name {
  font-weight: 800;
  font-size: 14px;
  color: var(--dark-navy);
  font-style: normal;
  letter-spacing: 0.3px;
}

.testimonial-batch {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

@media (max-width: 680px) {
  .testimonials-section {
    padding: 60px 0;
  }

  .testimonials-header {
    margin-bottom: 48px;
  }

  .testimonials-title {
    font-size: clamp(24px, 4vw, 32px);
  }

  .testimonials-subtitle {
    font-size: 14px;
  }

  .testimonials-container {
    max-height: 500px;
  }

  .testimonials-column {
    width: 256px;
  }

  .testimonial-card {
    padding: 20px;
    min-width: 256px;
  }

  .testimonial-text {
    font-size: 13px;
  }
}
</style>
