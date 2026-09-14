<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Deskripsi...' },
  maxLength: { type: Number, default: 4000 }
})

const emit = defineEmits(['update:modelValue'])

const editorTrack = ref({ len: (props.modelValue || '').trim().length })

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ codeBlock: false, horizontalRule: false, blockquote: { HTMLAttributes: { class: 'rte-quote' } } }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder })
  ],
  editorProps: {
    attributes: {
      class: 'rte-content'
    }
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
    editorTrack.value = { len: html.trim().length }
  }
})

watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '', false)
  }
})

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="rte">
    <div class="rte-toolbar">
      <button type="button" title="Tebal" :class="{ on: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()"><span class="ms">format_bold</span></button>
      <button type="button" title="Miring" :class="{ on: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()"><span class="ms">format_italic</span></button>
      <button type="button" title="Garis bawah" :class="{ on: editor?.isActive('underline') }" @click="editor?.chain().focus().toggleUnderline().run()"><span class="ms">format_underlined</span></button>
      <span class="rte-sep"></span>
      <button type="button" title="Daftar poin" :class="{ on: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()"><span class="ms">format_list_bulleted</span></button>
      <button type="button" title="Daftar angka" :class="{ on: editor?.isActive('orderedList') }" @click="editor?.chain().focus().toggleOrderedList().run()"><span class="ms">format_list_numbered</span></button>
      <span class="rte-sep"></span>
      <button type="button" title="Judul (H2)" :class="{ on: editor?.isActive('heading', { level: 2 }) }" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" title="Judul (H3)" :class="{ on: editor?.isActive('heading', { level: 3 }) }" @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <span class="rte-sep"></span>
      <button type="button" title="Rata kiri" :class="{ on: editor?.isActive({ textAlign: 'left' }) }" @click="editor?.chain().focus().setTextAlign('left').run()"><span class="ms">format_align_left</span></button>
      <button type="button" title="Rata tengah" :class="{ on: editor?.isActive({ textAlign: 'center' }) }" @click="editor?.chain().focus().setTextAlign('center').run()"><span class="ms">format_align_center</span></button>
      <button type="button" title="Rata kanan" :class="{ on: editor?.isActive({ textAlign: 'right' }) }" @click="editor?.chain().focus().setTextAlign('right').run()"><span class="ms">format_align_right</span></button>
      <button type="button" title="Rata penuh" :class="{ on: editor?.isActive({ textAlign: 'justify' }) }" @click="editor?.chain().focus().setTextAlign('justify').run()"><span class="ms">format_align_justify</span></button>
    </div>
    <div class="rte-editor">
      <EditorContent :editor="editor" />
    </div>
    <div class="rte-foot">
      <span class="tiny muted">{{ Math.max(0, maxLength - editorTrack.len) }} karakter tersisa</span>
    </div>
  </div>
</template>

<style scoped>
.rte { width: 100%; display: flex; flex-direction: column; background: #fff; border: 3px solid var(--dark-navy); box-shadow: 4px 4px 0 var(--dark-navy); }
.rte-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px 8px; background: #f0f4f8; border-bottom: 2px solid var(--dark-navy); }
.rte-toolbar button { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; padding: 0 8px; color: var(--dark-navy); background: #fff; border: 2px solid var(--dark-navy); font-size: 11px; font-weight: 800; cursor: pointer; }
.rte-toolbar button:hover { background: rgba(33,76,122,0.12); }
.rte-toolbar button.on { color: #fff; background: var(--royal-blue); border-color: var(--royal-blue); }
.rte-toolbar .ms { font-size: 17px; line-height: 1; }
.rte-sep { width: 2px; height: 22px; margin: 0 2px; background: rgba(29,43,58,0.2); }
.rte-editor { min-height: 120px; }
.rte-editor :deep(.ProseMirror) { min-height: 120px; padding: 10px 12px; outline: none; font-size: 14px; line-height: 1.7; color: var(--dark-navy); }
.rte-editor :deep(.ProseMirror p) { margin: 0 0 8px; }
.rte-editor :deep(.ProseMirror h2) { margin: 10px 0 6px; font-size: 18px; font-weight: 900; }
.rte-editor :deep(.ProseMirror h3) { margin: 8px 0 4px; font-size: 15px; font-weight: 900; }
.rte-editor :deep(.ProseMirror ul, .ProseMirror ol) { margin: 0 0 8px; padding-left: 22px; }
.rte-editor :deep(.ProseMirror ul) { list-style: disc; }
.rte-editor :deep(.ProseMirror ol) { list-style: decimal; }
.rte-editor :deep(.ProseMirror strong) { font-weight: 800; }
.rte-editor :deep(.ProseMirror em) { font-style: italic; }
.rte-editor :deep(.ProseMirror u) { text-decoration: underline; }
.rte-editor :deep(.ProseMirror a) { color: var(--royal-blue); }
.rte-editor :deep(.ProseMirror blockquote) { margin: 6px 0; padding-left: 10px; border-left: 3px solid var(--royal-blue); color: rgba(29,43,58,0.8); font-style: italic; }
.rte-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) { content: attr(data-placeholder); color: rgba(29,43,58,0.4); float: left; height: 0; pointer-events: none; }
.rte-foot { display: flex; justify-content: flex-end; padding: 4px 8px; background: #f0f4f8; border-top: 2px solid var(--dark-navy); }
</style>