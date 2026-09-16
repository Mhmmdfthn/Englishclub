<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

// modelValue: null = belum diubah, '' = hapus, File = file dipilih, string = URL eksternal
const props = defineProps({
  modelValue: { type: [String, Object], default: null },
  initial: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const fileEl = ref(null)
const urlText = ref('')
const objectUrl = ref('')

function revokeObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

watch(
  () => props.modelValue,
  (v) => {
    revokeObjectUrl()
    if (v instanceof File) {
      objectUrl.value = URL.createObjectURL(v)
      urlText.value = ''
    } else if (typeof v === 'string') {
      urlText.value = v
    } else {
      urlText.value = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(revokeObjectUrl)

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  urlText.value = ''
  emit('update:modelValue', f)
}

function onUrlInput() {
  const v = urlText.value
  if (v.trim()) {
    if (fileEl.value) fileEl.value.value = ''
    if (props.modelValue instanceof File) revokeObjectUrl()
    emit('update:modelValue', v)
  } else {
    emit('update:modelValue', '')
  }
}

function onClear() {
  urlText.value = ''
  if (fileEl.value) fileEl.value.value = ''
  emit('update:modelValue', '')
}

const preview = computed(() => {
  const v = props.modelValue
  if (v instanceof File) return objectUrl.value || ''
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (v === '') return ''
  if ((v === null || v === undefined) && props.initial) return props.initial
  return ''
})

const activeMode = computed(() => {
  const v = props.modelValue
  if (v instanceof File) return 'File dipilih'
  if (typeof v === 'string' && v.trim()) return 'URL eksternal'
  return ''
})
</script>

<template>
  <div class="media-field">
    <div class="media-preview" :class="{ empty: !preview }">
      <img v-if="preview" :src="preview" alt="Preview gambar cover proker" />
      <span v-else class="media-hint">Belum ada gambar cover</span>
    </div>
    <div class="media-rows">
      <label class="media-file">
        <input ref="fileEl" type="file" accept="image/*" :disabled="disabled" @change="onFileChange" />
        <span>Pilih file gambar</span>
      </label>
      <span class="media-or">atau tempel URL gambar</span>
      <input v-model="urlText" class="field" type="url" :disabled="disabled" @input="onUrlInput" placeholder="https://.../contoh.jpg" />
      <p class="media-helper">Pastikan link berakhiran .jpg atau .png (Direct Image Link).</p>
      <div class="media-actions">
        <span v-if="activeMode" class="media-tag">{{ activeMode }}</span>
        <button v-if="preview" type="button" class="btn sm ghost" :disabled="disabled" @click="onClear">Hapus gambar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-field { display: flex; gap: 12px; align-items: flex-start; }
.media-preview { flex: 0 0 128px; width: 128px; height: 96px; display: grid; place-items: center; overflow: hidden; background: #f8fafc; border: 2px dashed var(--dark-navy); }
.media-preview img { width: 100%; height: 100%; object-fit: cover; }
.media-preview.empty { border-style: dashed; }
.media-hint { font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-align: center; padding: 8px; }
.media-rows { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.media-file { display: inline-flex; align-self: flex-start; padding: 8px 12px; background: var(--vibrant-yellow); border: 2px solid var(--dark-navy); font-size: 12px; font-weight: 800; cursor: pointer; }
.media-file input { display: none; }
.media-file:has(input:disabled) { opacity: 0.5; cursor: not-allowed; }
.media-or { font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); }
.media-helper { font-size: 11px; color: var(--text-muted, #64748b); margin: 0; }
.media-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.media-tag { padding: 3px 8px; background: var(--royal-blue); color: #fff; font-size: 10px; font-weight: 800; }
.media-actions .btn { padding: 6px 10px; font-size: 11px; min-height: 0; }
@media (max-width: 680px) {
  .media-field { flex-direction: column; gap: 10px; }
  .media-preview { flex: 0 0 auto; width: 100%; height: 150px; }
  .media-file { width: 100%; justify-content: center; min-height: 42px; }
}
</style>