<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  program: { type: Object, default: null },
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const currentPhoto = ref(0)
const photos = computed(() => props.program?.photos || [])

function close() { emit('close') }
function next() { if (photos.value.length) currentPhoto.value = (currentPhoto.value + 1) % photos.value.length }
function prev() { if (photos.value.length) currentPhoto.value = (currentPhoto.value - 1 + photos.value.length) % photos.value.length }

function onKey(e) { if (e.key === 'Escape') close() }

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open && program" class="modal-overlay" @click.self="close">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="program.title">
          <button class="modal-close" aria-label="Tutup" @click="close">×</button>
          <div class="modal-photo-wrap" v-if="photos.length">
            <img :src="photos[currentPhoto]" :alt="program.title" class="modal-photo" />
            <div v-if="photos.length > 1" class="modal-gallery-nav">
              <button class="gallery-btn" @click="prev">‹</button>
              <span class="gallery-count">{{ currentPhoto + 1 }} / {{ photos.length }}</span>
              <button class="gallery-btn" @click="next">›</button>
            </div>
            <div v-if="photos.length > 1" class="modal-thumbs">
              <button v-for="(p,i) in photos" :key="i" class="thumb" :class="{active: i===currentPhoto}" @click="currentPhoto=i"><img :src="p" :alt="''" /></button>
            </div>
          </div>
          <div v-else class="modal-no-photo">
            <div class="program-icon large">{{ program.icon || '•' }}</div>
            <p class="tiny muted">Belum ada foto</p>
          </div>
          <div class="modal-body">
            <span class="panel-kicker">{{ program.id }}</span>
            <h3 class="modal-title">{{ program.title }}</h3>
            <p class="modal-caption">{{ program.caption }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn ghost" @click="close">Tutup</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(29,43,58,0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.modal-card {
  width: min(100%, 720px);
  max-height: 88dvh;
  overflow: auto;
  background: #fff;
  border: 3px solid var(--dark-navy);
  box-shadow: 8px 8px 0 var(--dark-navy);
  padding: 0;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid var(--dark-navy);
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  z-index: 2;
}
.modal-photo-wrap { position: relative; background: #f8fafc; border-bottom: 3px solid var(--dark-navy); }
.modal-photo { width: 100%; height: clamp(220px, 42vw, 380px); object-fit: cover; display: block; }
.modal-gallery-nav { position: absolute; inset: auto 12px 12px 12px; display: flex; align-items: center; justify-content: space-between; }
.gallery-btn { width: 36px; height: 36px; display: grid; place-items: center; background: rgba(255,255,255,0.92); border: 2px solid var(--dark-navy); font-size: 18px; font-weight: 900; cursor: pointer; }
.gallery-count { padding: 4px 10px; background: rgba(29,43,58,0.85); color: #fff; font-size: 11px; font-weight: 800; border-radius: 999px; }
.modal-thumbs { display: flex; gap: 8px; padding: 10px 12px; border-top: 2px solid var(--dark-navy); background: #fff; overflow: auto; }
.thumb { flex: 0 0 56px; width: 56px; height: 56px; padding: 0; border: 2px solid var(--dark-navy); cursor: pointer; overflow: hidden; opacity: 0.7; }
.thumb.active { opacity: 1; box-shadow: 3px 3px 0 var(--vibrant-yellow); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.modal-no-photo { padding: 42px 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; background: #f8fafc; border-bottom: 3px solid var(--dark-navy); }
.program-icon.large { width: 64px; height: 64px; display: grid; place-items: center; background: var(--dark-navy); color: #fff; border: 2px solid var(--dark-navy); font-weight: 900; font-size: 22px; }
.modal-body { padding: 22px 24px; text-align: left; }
.modal-body .panel-kicker { color: var(--royal-blue); font-size: 10px; font-weight: 900; letter-spacing: .16em; }
.modal-title { margin: 6px 0 10px; font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: -0.03em; color: var(--dark-navy); }
.modal-caption { margin: 0; font-size: 14px; line-height: 1.6; color: var(--dark-navy); white-space: pre-wrap; }
.modal-actions { padding: 0 24px 20px; display: flex; justify-content: flex-end; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.22s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
