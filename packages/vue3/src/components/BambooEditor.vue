<template>
  <div class="bamboo-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="bamboo-editor__main" :class="{ 'is-mobile': resolvedDevice === 'mobile' }">
      <ToolbarPC
        v-if="resolvedDevice === 'pc'"
        :editor="editor"
        :disabled="disabled"
        :fullscreen="isFullscreen"
        @image-select="handleImageSelect"
        @link-select="handleLinkSelect"
        @remote-image-select="handleRemoteImageSelect"
        @toggle-fullscreen="toggleFullscreen"
      />

      <div class="bamboo-editor__surface" :class="{ 'is-mobile': resolvedDevice === 'mobile' }" :style="surfaceStyle">
        <EditorContent v-if="editor" :editor="editor" class="bamboo-editor__content" />
        <div v-else class="bamboo-editor__placeholder">Loading editor...</div>
      </div>
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
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import ToolbarPC from './ToolbarPC.vue'
import ToolbarMobile from './ToolbarMobile.vue'
import { useBambooEditor, type BambooDevice, type UploadHandler } from '../composables/useBambooEditor'

declare const window: Window & typeof globalThis

const props = withDefaults(defineProps<{
  modelValue: string
  device?: BambooDevice
  placeholder?: string
  disabled?: boolean
  uploadHandler?: UploadHandler
  height?: string
}>(), {
  device: 'auto',
  placeholder: '请输入内容',
  disabled: false,
  height: '50vh',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isFullscreen = ref(false)

const surfaceStyle = computed(() => {
  if (isFullscreen.value) {
    return undefined
  }

  return {
    height: props.height,
  }
})

const { editor, resolvedDevice, insertImage, setLink, unsetLink, insertRemoteImage } = useBambooEditor({
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

function handleLinkSelect(url: string | null) {
  if (url === null) {
    return unsetLink()
  }

  return setLink(url)
}

function handleRemoteImageSelect(url: string) {
  return insertRemoteImage(url)
}

function toggleFullscreen() {
  if (resolvedDevice.value !== 'pc') {
    return
  }

  isFullscreen.value = !isFullscreen.value
}

function exitFullscreen() {
  isFullscreen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFullscreen.value) {
    exitFullscreen()
  }
}

watch(isFullscreen, (value) => {
  if (typeof document === 'undefined') {
    return
  }

  document.body.style.overflow = value ? 'hidden' : ''

  if (value) {
    window.addEventListener('keydown', onKeydown)
    return
  }

  window.removeEventListener('keydown', onKeydown)
})

watch(resolvedDevice, (value) => {
  if (value !== 'pc' && isFullscreen.value) {
    exitFullscreen()
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }

  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.bamboo-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.bamboo-editor__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.bamboo-editor.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999;
  gap: 0;
  background: #f5f7fb;
}

.bamboo-editor.is-fullscreen .bamboo-editor__main {
  gap: 0;
  min-height: 0;
  margin: 18px 24px 0;
  border: 1px solid #dcdfe6;
  border-radius: 12px 12px 0 0;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.bamboo-editor__surface {
  height: 50vh;
  min-height: 320px;
  border: 0;
  border-radius: 0;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
  box-shadow: none;
  overflow: hidden;
}

.bamboo-editor.is-fullscreen .bamboo-editor__surface {
  flex: 1;
  min-height: 0;
  height: auto;
  border: 0;
  border-radius: 0;
  background: #fff;
  box-shadow: none;
}

.bamboo-editor__surface.is-mobile {
  border-radius: 0;
  background: #fff;
}

.bamboo-editor__content {
  height: 100%;
  min-height: 0;
}

.bamboo-editor__content :deep(.ProseMirror) {
  box-sizing: border-box;
  height: 100%;
  min-height: 100%;
  padding: 10px 12px;
  color: #18181b;
  font-size: 16px;
  line-height: 1.75;
  outline: none;
  overflow-y: auto;
}

.bamboo-editor__content :deep(.ProseMirror[data-align='center']) {
  text-align: center;
}

.bamboo-editor__content :deep(.ProseMirror[data-align='right']) {
  text-align: right;
}

.bamboo-editor__content :deep(.ProseMirror h1[data-align='center']),
.bamboo-editor__content :deep(.ProseMirror h2[data-align='center']),
.bamboo-editor__content :deep(.ProseMirror h3[data-align='center']),
.bamboo-editor__content :deep(.ProseMirror p[data-align='center']),
.bamboo-editor__content :deep(.ProseMirror blockquote[data-align='center']) {
  text-align: center;
}

.bamboo-editor__content :deep(.ProseMirror h1[data-align='right']),
.bamboo-editor__content :deep(.ProseMirror h2[data-align='right']),
.bamboo-editor__content :deep(.ProseMirror h3[data-align='right']),
.bamboo-editor__content :deep(.ProseMirror p[data-align='right']),
.bamboo-editor__content :deep(.ProseMirror blockquote[data-align='right']) {
  text-align: right;
}

.bamboo-editor__surface.is-mobile .bamboo-editor__content :deep(.ProseMirror) {
  padding: 14px 14px 18px;
}

.bamboo-editor.is-fullscreen .bamboo-editor__content {
  height: 100%;
}

.bamboo-editor.is-fullscreen .bamboo-editor__content :deep(.ProseMirror) {
  box-sizing: border-box;
  min-height: 100%;
  height: 100%;
  padding: 28px 40px 48px;
  max-width: 920px;
  margin: 0 auto;
  overflow-y: auto;
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

.bamboo-editor__content :deep(.ProseMirror img[data-align='center']) {
  margin-left: auto;
  margin-right: auto;
}

.bamboo-editor__content :deep(.ProseMirror img[data-align='right']) {
  margin-left: auto;
  margin-right: 0;
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
  height: 100%;
  display: grid;
  place-items: center;
  color: #71717a;
}
</style>
