<template>
  <div class="bamboo-editor">
    <ToolbarPC
      v-if="resolvedDevice === 'pc'"
      :editor="editor"
      :disabled="disabled"
      @image-select="handleImageSelect"
    />

    <div class="bamboo-editor__surface" :class="{ 'is-mobile': resolvedDevice === 'mobile' }">
      <EditorContent v-if="editor" :editor="editor" class="bamboo-editor__content" />
      <div v-else class="bamboo-editor__placeholder">Loading editor...</div>
    </div>

    <ToolbarMobile
      v-if="resolvedDevice === 'mobile'"
      :editor="editor"
      :disabled="disabled"
      @image-select="handleImageSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import ToolbarPC from './ToolbarPC.vue'
import ToolbarMobile from './ToolbarMobile.vue'
import { useBambooEditor, type BambooDevice, type UploadHandler } from '../composables/useBambooEditor'

const props = withDefaults(defineProps<{
  modelValue: string
  device?: BambooDevice
  placeholder?: string
  disabled?: boolean
  uploadHandler?: UploadHandler
}>(), {
  device: 'auto',
  placeholder: '请输入内容',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { editor, resolvedDevice, insertImage } = useBambooEditor({
  modelValue: toRef(props, 'modelValue'),
  device: toRef(props, 'device'),
  placeholder: toRef(props, 'placeholder'),
  disabled: toRef(props, 'disabled'),
  uploadHandler: toRef(props, 'uploadHandler'),
  onUpdate: (html) => emit('update:modelValue', html),
})

function handleImageSelect(file: File) {
  return insertImage(file)
}
</script>

<style scoped>
.bamboo-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.bamboo-editor__surface {
  min-height: 320px;
  border: 1px solid #d4d4d8;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.bamboo-editor__surface.is-mobile {
  border-radius: 12px;
}

.bamboo-editor__content :deep(.ProseMirror) {
  min-height: 320px;
  padding: 10px 12px;
  color: #18181b;
  font-size: 16px;
  line-height: 1.75;
  outline: none;
}

.bamboo-editor__content :deep(.ProseMirror:focus) {
  box-shadow: inset 0 0 0 2px rgba(20, 184, 166, 0.16);
}

.bamboo-editor__content :deep(.ProseMirror > :first-child) {
  margin-top: 0;
}

.bamboo-editor__content :deep(.ProseMirror h1),
.bamboo-editor__content :deep(.ProseMirror h2),
.bamboo-editor__content :deep(.ProseMirror h3) {
  margin: 1.2em 0 0.45em;
  color: #09090b;
  line-height: 1.25;
  font-weight: 700;
}

.bamboo-editor__content :deep(.ProseMirror h1) {
  font-size: 2rem;
}

.bamboo-editor__content :deep(.ProseMirror h2) {
  font-size: 1.5rem;
}

.bamboo-editor__content :deep(.ProseMirror h3) {
  font-size: 1.25rem;
}

.bamboo-editor__content :deep(.ProseMirror p),
.bamboo-editor__content :deep(.ProseMirror ul),
.bamboo-editor__content :deep(.ProseMirror ol),
.bamboo-editor__content :deep(.ProseMirror blockquote),
.bamboo-editor__content :deep(.ProseMirror pre) {
  margin: 0.85em 0;
}

.bamboo-editor__content :deep(.ProseMirror ul),
.bamboo-editor__content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
}

.bamboo-editor__content :deep(.ProseMirror blockquote) {
  padding-left: 1em;
  border-left: 4px solid #14b8a6;
  color: #52525b;
}

.bamboo-editor__content :deep(.ProseMirror code) {
  padding: 0.125em 0.35em;
  border-radius: 6px;
  background: #f4f4f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
}

.bamboo-editor__content :deep(.ProseMirror pre) {
  padding: 1em;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #fafafa;
  overflow-x: auto;
}

.bamboo-editor__content :deep(.ProseMirror pre code) {
  padding: 0;
  background: transparent;
}

.bamboo-editor__content :deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  max-inline-size: 100%;
  width: auto;
  height: auto;
  box-sizing: border-box;
  margin: 1em 0;
  border-radius: 12px;
}

.bamboo-editor__content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #a1a1aa;
  pointer-events: none;
  float: left;
  height: 0;
}

.bamboo-editor__placeholder {
  min-height: 320px;
  display: grid;
  place-items: center;
  color: #71717a;
}
</style>
