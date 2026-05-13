<script setup lang="ts">
import type { CleanAudioOptions, CleanVideoOptions } from '@bamboo-editor/core'
import type { BambooColorOption, BambooDevice, UploadHandler } from '../composables/useBambooEditor'
import { EditorContent } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { useBambooEditor } from '../composables/useBambooEditor'
import { useEditorDialogs } from '../composables/useEditorDialogs'
import { useEditorDraft } from '../composables/useEditorDraft'
import { useEditorEvents } from '../composables/useEditorEvents'
import { useEditorFloatingToolbar } from '../composables/useEditorFloatingToolbar'
import { useEditorFullscreen } from '../composables/useEditorFullscreen'
import { useEditorWordCount } from '../composables/useEditorWordCount'
import EditorAudioDialog from './EditorAudioDialog.vue'
import EditorErrorDialog from './EditorErrorDialog.vue'
import EditorImageDialog from './EditorImageDialog.vue'
import EditorInfoDialog from './EditorInfoDialog.vue'
import EditorUrlDialog from './EditorUrlDialog.vue'
import EditorVideoDialog from './EditorVideoDialog.vue'
import FloatingToolbarPC from './FloatingToolbarPC.vue'
import ToolbarMobile from './ToolbarMobile.vue'
import ToolbarPC from './ToolbarPC.vue'

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

declare const window: Window & typeof globalThis

const WORD_COUNT_SCROLLBAR_GAP = 20
const DRAFT_DEFAULT_TTL = 3 * 24 * 60 * 60 * 1000

const props = withDefaults(
  defineProps<{
    modelValue: string
    device?: BambooDevice
    placeholder?: string
    disabled?: boolean
    uploadHandler?: UploadHandler
    height?: string
    colorPalette?: BambooColorOption[]
    maxLength?: number
    editorId?: string
    draftTtl?: number
    videoOptions?: CleanVideoOptions
    audioOptions?: CleanAudioOptions
  }>(),
  {
    device: 'auto',
    placeholder: '请输入内容',
    disabled: false,
    height: 'auto',
    draftTtl: DRAFT_DEFAULT_TTL,
  },
)

const DEFAULT_COLOR_PALETTE: BambooColorOption[] = [
  { token: 'cyan', label: '青色', value: '#0891b2' },
  { token: 'success', label: '绿色', value: '#16a34a' },
  { token: 'warning', label: '橙色', value: '#ea580c' },
  { token: 'danger', label: '红色', value: '#dc2626' },
  { token: 'muted', label: '灰色', value: '#71717a' },
  { token: 'purple', label: '紫色', value: '#7c3aed' },
  { token: 'pink', label: '粉色', value: '#db2777' },
  { token: 'yellow', label: '黄色', value: '#ca8a04' },
]

const editorScopeId = `bamboo-editor-${Math.random().toString(36).slice(2)}`
const surfaceRef = ref<HTMLElement | null>(null)
const surfaceWidth = ref(0)
let surfaceResizeObserver: ResizeObserver | null = null

const resolvedColorPalette = computed(() => (props.colorPalette?.length ? props.colorPalette : DEFAULT_COLOR_PALETTE))
const editorColorCss = computed(() => buildEditorColorCss(editorScopeId, resolvedColorPalette.value))

const {
  editor,
  resolvedDevice,
  currentLength,
  maxLength,
  usageRatio,
  isNearLimit,
  isAtLimit,
  maxLengthFeedback,
  setLink,
  unsetLink,
  insertVideo,
  insertRemoteVideo,
  undo,
  redo,
  insertHorizontalRule,
  clearFormatting,
} = useBambooEditor({
  modelValue: toRef(props, 'modelValue'),
  device: toRef(props, 'device'),
  placeholder: toRef(props, 'placeholder'),
  disabled: toRef(props, 'disabled'),
  uploadHandler: toRef(props, 'uploadHandler'),
  colorPalette: resolvedColorPalette,
  maxLength: toRef(props, 'maxLength'),
  video: toRef(props, 'videoOptions'),
  audio: toRef(props, 'audioOptions'),
  containerWidth: surfaceWidth,
  onUpdate: (html) => {
    emit('update:modelValue', html)
    draftComposable.scheduleDraftSave(html)
  },
  onUploadError: ({ message }) => {
    dialogs.errorDialogMessage.value = message
    dialogs.errorDialogVisible.value = true
  },
})

// Composables
const { isFullscreen, surfaceStyle, toggleFullscreen, exitFullscreen } = useEditorFullscreen(resolvedDevice)

const {
  floatingToolbarVisible,
  floatingToolbarPosition,
  hideFloatingToolbar,
  updateFloatingToolbar,
  clamp,
} = useEditorFloatingToolbar({
  editor,
  resolvedDevice,
  disabled: props.disabled,
  editorScopeId,
})

const {
  wordCountState,
  isWordCountTooltipVisible,
  isCompactWordCount,
  wordCountAriaLabel,
  maxLengthStatus,
  updateSurfaceWidth,
  handleWordCountMouseEnter,
  handleWordCountMouseLeave,
  resetWordCountState,
  scheduleWordCountRefresh,
  formatFullWordCount,
  formatVisibleWordCount,
  cleanup: cleanupWordCount,
} = useEditorWordCount({
  editor,
  resolvedDevice,
  maxLength,
  currentLength,
  usageRatio,
  surfaceRef,
})

const draftComposable = useEditorDraft({
  editorId: props.editorId,
  draftTtl: props.draftTtl,
  modelValue: props.modelValue,
  editor,
  emit,
})

useEditorEvents({
  editor,
  resolvedDevice,
  disabled: props.disabled,
  editorScopeId,
  updateFloatingToolbar,
  scheduleWordCountRefresh,
  resetWordCountState,
  hideFloatingToolbar,
  updateSurfaceWidth,
})

const dialogs = useEditorDialogs({
  editor,
  disabled: props.disabled,
  setLink,
  unsetLink,
  insertVideo,
  insertRemoteVideo,
})

// Watchers
watch(
  editor,
  (instance) => {
    if (instance) {
      instance.on('open-image-dialog' as any, dialogs.handleOpenImageDialog)
      instance.on('open-video-dialog' as any, dialogs.handleOpenVideoDialog)
      instance.on('open-audio-dialog' as any, dialogs.handleOpenAudioDialog)
    }
  },
  { immediate: true },
)

watch(resolvedDevice, (value) => {
  if (value !== 'mobile') {
    hideFloatingToolbar()
  }

  if (value !== 'pc') {
    resetWordCountState()
    return
  }

  updateSurfaceWidth()
  scheduleWordCountRefresh(true)
})

watch(
  surfaceRef,
  (element, _, onCleanup) => {
    updateSurfaceWidth()

    if (typeof window === 'undefined' || !element) {
      return
    }

    if (typeof ResizeObserver !== 'undefined') {
      surfaceResizeObserver = new ResizeObserver(() => updateSurfaceWidth())
      surfaceResizeObserver.observe(element)

      onCleanup(() => {
        surfaceResizeObserver?.disconnect()
        surfaceResizeObserver = null
      })

      return
    }

    window.addEventListener('resize', updateSurfaceWidth)
    onCleanup(() => window.removeEventListener('resize', updateSurfaceWidth))
  },
  { immediate: true },
)

watch(
  editor,
  (instance) => {
    if (!instance) {
      return
    }

    const handleOpenVideoDialogEvent = ({ pos, node, data }: { pos: number; node: any; data?: any }) => {
      if (props.disabled) {
        return
      }

      dialogs.handleOpenVideoDialogEvent({ pos, node, data })
    }

    instance.on('open-video-dialog' as any, handleOpenVideoDialogEvent)
  },
  { immediate: true },
)

watch([maxLengthFeedback, resolvedDevice], ([feedback, device]) => {
  if (!feedback || device !== 'mobile') {
    return
  }

  dialogs.showMobileToast(feedback.message)
})

watch(editorColorCss, (value) => {
  applyEditorColorStyle(editorScopeId, value)
}, { immediate: true })

// Event handlers
function handleTextColorSelect(token: string | null) {
  if (!editor.value) {
    return false
  }

  const chain = editor.value.chain().focus()
  return (token ? chain.setTextColor(token) : chain.unsetTextColor()).run()
}

// Helper functions
function buildEditorColorCss(scopeId: string, colorPalette: readonly BambooColorOption[]) {
  return colorPalette
    .map(
      (item) =>
        `[data-editor-scope='${escapeCssValue(scopeId)}'] .bamboo-editor__content .ProseMirror span[data-color='${escapeCssValue(item.token)}']{color:${item.value};}`,
    )
    .join('\n')
}

function applyEditorColorStyle(scopeId: string, cssText: string) {
  if (typeof document === 'undefined') {
    return
  }

  let styleElement = document.getElementById(scopeId) as HTMLStyleElement | null
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = scopeId
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = cssText
}

function removeEditorColorStyle(scopeId: string) {
  if (typeof document === 'undefined') {
    return
  }

  document.getElementById(scopeId)?.remove()
}

function escapeCssValue(value: string) {
  return value.replace(/['\\]/g, '\\$&')
}

// Cleanup
onBeforeUnmount(() => {
  hideFloatingToolbar()
  cleanupWordCount()
  draftComposable.cleanup()
  dialogs.cleanup()
  surfaceResizeObserver?.disconnect()

  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    removeEditorColorStyle(editorScopeId)
  }
})

// Expose
defineExpose({ clearDraft: draftComposable.clearDraft })
</script>

<template>
  <div class="bamboo-editor" :class="{ 'is-fullscreen': isFullscreen }" :data-editor-scope="editorScopeId">
    <div class="bamboo-editor__main" :class="{ 'is-mobile': resolvedDevice === 'mobile' }">
      <ToolbarPC
        v-if="resolvedDevice === 'pc'"
        :editor="editor"
        :disabled="disabled"
        :fullscreen="isFullscreen"
        :color-palette="resolvedColorPalette"
        @open-image-dialog="dialogs.handleOpenImageDialog"
        @open-video-dialog="dialogs.handleOpenVideoDialog"
        @open-audio-dialog="dialogs.handleOpenAudioDialog"
        @open-link-dialog="dialogs.handleOpenLinkDialog"
        @text-color-select="handleTextColorSelect"
        @undo="undo"
        @redo="redo"
        @clear-formatting="clearFormatting"
        @insert-horizontal-rule="insertHorizontalRule"
        @toggle-fullscreen="toggleFullscreen"
        @show-info="dialogs.infoDialogVisible.value = true"
      />

      <div
        ref="surfaceRef"
        class="bamboo-editor__surface"
        :class="{ 'is-mobile': resolvedDevice === 'mobile' }"
        :style="surfaceStyle"
      >
        <template v-if="editor">
          <EditorContent :editor="editor" class="bamboo-editor__content" />
          <div
            v-if="resolvedDevice === 'pc'"
            class="bamboo-editor__word-count"
            :class="[
              { 'is-compact': isCompactWordCount },
              maxLengthStatus === 'warning' ? 'is-warning' : '',
              maxLengthStatus === 'danger' ? 'is-danger' : '',
            ]"
            :aria-label="wordCountAriaLabel"
            @mouseenter="handleWordCountMouseEnter"
            @mouseleave="handleWordCountMouseLeave"
          >
            <div class="bamboo-editor__word-count-summary">
              <template v-if="maxLength != null">
                <template v-if="currentLength > maxLength">
                  <span>已超出 </span>
                  <span class="bamboo-editor__word-count-value">{{
                    formatVisibleWordCount(currentLength - maxLength)
                  }}</span>
                  <span> 字符</span>
                </template>
                <template v-else>
                  <span class="bamboo-editor__word-count-value">{{ formatVisibleWordCount(currentLength) }}</span>
                  <span class="bamboo-editor__word-count-separator">/</span>
                  <span class="bamboo-editor__word-count-value">{{ formatVisibleWordCount(maxLength) }}</span>
                </template>
              </template>
              <template v-else-if="wordCountState.hasSelectedText">
                <span v-if="!isCompactWordCount">已选 </span>
                <span class="bamboo-editor__word-count-value is-selected">{{
                  formatVisibleWordCount(wordCountState.selectedChineseCharacters)
                }}</span>
                <span class="bamboo-editor__word-count-separator">/</span>
                <span v-if="!isCompactWordCount">共 </span>
                <span class="bamboo-editor__word-count-value">{{
                  formatVisibleWordCount(wordCountState.totalCharacters)
                }}</span>
                <span v-if="!isCompactWordCount"> 字符</span>
              </template>
              <template v-else>
                <span v-if="!isCompactWordCount">共 </span>
                <span class="bamboo-editor__word-count-value">{{
                  formatVisibleWordCount(wordCountState.totalCharacters)
                }}</span>
                <span v-if="!isCompactWordCount"> 字符</span>
              </template>
            </div>

            <div v-if="isWordCountTooltipVisible" class="bamboo-editor__word-count-tooltip" role="tooltip">
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>字符数（含空格）</span>
                <span class="bamboo-editor__word-count-value">{{
                  formatFullWordCount(wordCountState.totalCharacters)
                }}</span>
              </div>
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>中文字数</span>
                <span class="bamboo-editor__word-count-value">{{
                  formatFullWordCount(wordCountState.chineseCharacters)
                }}</span>
              </div>
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>段落数</span>
                <span class="bamboo-editor__word-count-value">{{
                  formatFullWordCount(wordCountState.paragraphCount)
                }}</span>
              </div>
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>行数</span>
                <span class="bamboo-editor__word-count-value">{{ formatFullWordCount(wordCountState.lineCount) }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="bamboo-editor__placeholder">Loading editor...</div>
      </div>

      <FloatingToolbarPC
        v-if="resolvedDevice === 'mobile'"
        :editor="editor"
        :disabled="disabled"
        :visible="floatingToolbarVisible"
        :position="floatingToolbarPosition"
        :color-palette="resolvedColorPalette"
        @open-link-dialog="dialogs.handleOpenLinkDialog"
        @text-color-select="handleTextColorSelect"
        @clear-formatting="clearFormatting"
      />

      <ToolbarMobile
        v-if="resolvedDevice === 'mobile'"
        :editor="editor"
        :disabled="disabled"
        :color-palette="resolvedColorPalette"
        :stats="{
          totalCharacters: wordCountState.totalCharacters,
          chineseCharacters: wordCountState.chineseCharacters,
          paragraphCount: wordCountState.paragraphCount,
          lineCount: wordCountState.lineCount,
          currentLength,
          maxLength,
          isNearLimit,
          isAtLimit,
        }"
        @open-image-dialog="dialogs.handleOpenImageDialog"
        @open-video-dialog="dialogs.handleOpenVideoDialog"
        @open-audio-dialog="dialogs.handleOpenAudioDialog"
        @text-color-select="handleTextColorSelect"
        @clear-formatting="clearFormatting"
        @insert-horizontal-rule="insertHorizontalRule"
      />

      <transition name="bamboo-editor-toast">
        <div
          v-if="resolvedDevice === 'mobile' && dialogs.mobileToastVisible.value"
          class="bamboo-editor__toast"
          role="status"
          aria-live="polite"
        >
          {{ dialogs.mobileToastMessage.value }}
        </div>
      </transition>

      <EditorUrlDialog
        :visible="dialogs.urlDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :type="dialogs.urlDialogState.value.type"
        :mode="dialogs.urlDialogState.value.mode"
        :initial-value="dialogs.urlDialogState.value.initialValue"
        :allow-remove="dialogs.urlDialogState.value.allowRemove"
        @confirm="dialogs.handleUrlDialogConfirm"
        @remove="dialogs.handleUrlDialogRemove"
        @cancel="dialogs.closeUrlDialog"
      />

      <EditorVideoDialog
        :visible="dialogs.videoDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :mode="dialogs.videoDialogState.value.mode"
        :initial-data="dialogs.videoDialogState.value.initialData"
        :upload-handler="props.uploadHandler"
        @confirm="dialogs.handleVideoDialogConfirm"
        @remove="dialogs.handleVideoDialogRemove"
        @cancel="dialogs.closeVideoDialog"
      />

      <EditorImageDialog
        :visible="dialogs.imageDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :mode="dialogs.imageDialogState.value.mode"
        :initial-data="dialogs.imageDialogState.value.initialData"
        :upload-handler="props.uploadHandler"
        @confirm="dialogs.handleImageDialogConfirm"
        @remove="dialogs.handleImageDialogRemove"
        @cancel="dialogs.closeImageDialog"
      />

      <EditorAudioDialog
        :visible="dialogs.audioDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :mode="dialogs.audioDialogState.value.mode"
        :initial-data="dialogs.audioDialogState.value.initialData"
        :upload-handler="props.uploadHandler"
        @confirm="dialogs.handleAudioDialogConfirm"
        @remove="dialogs.handleAudioDialogRemove"
        @cancel="dialogs.closeAudioDialog"
      />

      <EditorInfoDialog
        :visible="dialogs.infoDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        @close="dialogs.infoDialogVisible.value = false"
      />

      <EditorErrorDialog
        :visible="dialogs.errorDialogVisible.value"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :message="dialogs.errorDialogMessage.value"
        @close="dialogs.errorDialogVisible.value = false"
      />
    </div>
  </div>
</template>

<style scoped>
.bamboo-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  height: 100%;
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

.bamboo-editor__main.is-mobile {
  overflow: visible;
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
  width: min(1280px, calc(100vw - 48px));
  margin: 18px auto 0;
  border: 1px solid #dcdfe6;
  border-radius: 12px 12px 0 0;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.bamboo-editor__surface {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.bamboo-editor__content :deep(.ProseMirror) {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  padding: 10px 12px 56px;
  color: #18181b;
  font-size: 16px;
  line-height: 1.75;
  text-align: left;
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

.bamboo-editor__content :deep(.ProseMirror span[data-color='cyan']) {
  color: var(--bamboo-editor-color-cyan, #0891b2);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='success']) {
  color: var(--bamboo-editor-color-success, #16a34a);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='warning']) {
  color: var(--bamboo-editor-color-warning, #ea580c);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='danger']) {
  color: var(--bamboo-editor-color-danger, #dc2626);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='muted']) {
  color: var(--bamboo-editor-color-muted, #71717a);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='purple']) {
  color: var(--bamboo-editor-color-purple, #7c3aed);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='pink']) {
  color: var(--bamboo-editor-color-pink, #db2777);
}

.bamboo-editor__content :deep(.ProseMirror span[data-color='yellow']) {
  color: var(--bamboo-editor-color-yellow, #ca8a04);
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
  padding: 10px 16px 56px;
  width: 100%;
  max-width: none;
  margin: 0;
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

.bamboo-editor__content :deep(.ProseMirror img.ProseMirror-selectednode) {
  outline: 2px solid rgba(20, 184, 166, 0.92);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.16);
}

.bamboo-editor__content :deep(.ProseMirror ::selection) {
  background: rgba(20, 184, 166, 0.25);
}

.bamboo-editor__content :deep(.ProseMirror::-moz-selection) {
  background: rgba(20, 184, 166, 0.25);
}

.bamboo-editor__content :deep(.ProseMirror:has(.ProseMirror-selectednode)) ::selection {
  background: transparent;
}

.bamboo-editor__content :deep(.ProseMirror:has(.ProseMirror-selectednode)) ::-moz-selection {
  background: transparent;
}

.bamboo-editor__content :deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1em 0;
  border-radius: 12px;
  transition:
    outline 0.2s,
    box-shadow 0.2s;
}

.bamboo-editor__content :deep(.ProseMirror .clean-image-wrapper.ProseMirror-selectednode img) {
  outline: 3px solid #14b8a6;
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.1);
}

.bamboo-editor__content :deep(.ProseMirror img.is-uploading) {
  opacity: 0.6;
}

.bamboo-editor__content :deep(.clean-image-wrapper) {
  position: relative;
  margin: 1em 0;
  line-height: 0;
}

.bamboo-editor__content :deep(.clean-image-loading) {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  pointer-events: none;
}

.bamboo-editor__content :deep(.clean-image-loading span) {
  padding: 8px 16px;
  background: #14b8a6;
  color: #fff;
  font-size: 14px;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.bamboo-editor__content :deep(.clean-image-edit-button) {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #52525b;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s,
    background 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bamboo-editor__content :deep(.clean-image-wrapper:hover .clean-image-edit-button) {
  opacity: 1;
}

.bamboo-editor__content :deep(.clean-image-edit-button:hover) {
  background: #fff;
  color: #14b8a6;
  border-color: #14b8a6;
}

/* Video styles */
.bamboo-editor__content :deep(.ProseMirror video) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1em 0;
  border-radius: 12px;
  transition:
    outline 0.2s,
    box-shadow 0.2s;
}

.bamboo-editor__content :deep(.ProseMirror .clean-video-wrapper.ProseMirror-selectednode video) {
  outline: 3px solid #14b8a6;
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.1);
}

.bamboo-editor__content :deep(.ProseMirror video.is-uploading) {
  opacity: 0.6;
}

.bamboo-editor__content :deep(.clean-video-wrapper) {
  position: relative;
  margin: 1em 0;
}

.bamboo-editor__content :deep(.clean-video-loading) {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  pointer-events: none;
}

.bamboo-editor__content :deep(.clean-video-loading span) {
  padding: 8px 16px;
  background: #14b8a6;
  color: #fff;
  font-size: 14px;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.bamboo-editor__content :deep(.clean-video-edit-button) {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #52525b;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s,
    background 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bamboo-editor__content :deep(.clean-video-wrapper:hover .clean-video-edit-button) {
  opacity: 1;
}

.bamboo-editor__content :deep(.clean-video-edit-button:hover) {
  background: #fff;
  color: #14b8a6;
  border-color: #14b8a6;
}

/* Audio styles */
.bamboo-editor__content :deep(.ProseMirror audio) {
  transition:
    outline 0.2s,
    box-shadow 0.2s;
}

.bamboo-editor__content :deep(.ProseMirror .clean-audio-wrapper.ProseMirror-selectednode .clean-audio-inner audio) {
  outline: 3px solid #14b8a6;
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.1);
  border-radius: 999px;
}

.bamboo-editor__content :deep(.clean-audio-wrapper) {
  position: relative;
  margin: 1em 0;
}

.bamboo-editor__content :deep(.clean-audio-inner) {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.bamboo-editor__content :deep(.clean-audio-edit-button) {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #52525b;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s,
    background 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bamboo-editor__content :deep(.clean-audio-wrapper:hover .clean-audio-edit-button) {
  opacity: 1;
}

.bamboo-editor__content :deep(.clean-audio-edit-button:hover) {
  background: #fff;
  color: #14b8a6;
  border-color: #14b8a6;
}

.bamboo-editor__content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #a1a1aa;
  pointer-events: none;
  float: left;
  height: 0;
}

.bamboo-editor__word-count {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: auto;
}

.bamboo-editor.is-fullscreen .bamboo-editor__word-count {
  right: 16px;
}

.bamboo-editor.is-fullscreen .bamboo-editor__word-count.is-compact {
  right: 12px;
}

.bamboo-editor__word-count.is-compact {
  right: 12px;
  bottom: 12px;
}

.bamboo-editor__word-count-summary {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid rgba(228, 231, 236, 0.92);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #71717a;
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transition:
    opacity 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.bamboo-editor__word-count:hover .bamboo-editor__word-count-summary {
  color: #52525b;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.bamboo-editor__word-count.is-warning .bamboo-editor__word-count-summary {
  color: #ea580c;
  border-color: rgba(234, 88, 12, 0.18);
  background: rgba(255, 247, 237, 0.96);
}

.bamboo-editor__word-count.is-danger .bamboo-editor__word-count-summary {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.22);
  background: rgba(255, 241, 240, 0.96);
}

.bamboo-editor__word-count.is-compact .bamboo-editor__word-count-summary {
  padding: 5px 8px;
}

.bamboo-editor__word-count-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.bamboo-editor__word-count-value.is-selected {
  color: #1890ff;
}

.bamboo-editor__word-count-separator {
  color: #a1a1aa;
}

.bamboo-editor__word-count-tooltip {
  min-width: 188px;
  max-width: min(260px, calc(100vw - 32px));
  padding: 10px 12px;
  border: 1px solid rgba(228, 231, 236, 0.96);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  color: #52525b;
  font-size: 12px;
  line-height: 1.5;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
}

.bamboo-editor__word-count-tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bamboo-editor__word-count-tooltip-row + .bamboo-editor__word-count-tooltip-row {
  margin-top: 6px;
}

.bamboo-editor__toast {
  position: fixed;
  left: 50%;
  bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  max-width: min(280px, calc(100vw - 32px));
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.9);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  transform: translateX(-50%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.bamboo-editor-toast-enter-active,
.bamboo-editor-toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.bamboo-editor-toast-enter-from,
.bamboo-editor-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.bamboo-editor__placeholder {
  min-height: 320px;
  height: 100%;
  display: grid;
  place-items: center;
  color: #71717a;
}
</style>
