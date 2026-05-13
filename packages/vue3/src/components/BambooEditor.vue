<script setup lang="ts">
import type { CleanAudioOptions, CleanVideoOptions } from '@bamboo-editor/core'
import type { BambooColorOption, BambooDevice, UploadHandler } from '../composables/useBambooEditor'
import { EditorContent } from '@tiptap/vue-3'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { useBambooEditor } from '../composables/useBambooEditor'
import { useEditorDialogs } from '../composables/useEditorDialogs'
import { useEditorDraft } from '../composables/useEditorDraft'
import { useEditorEvents } from '../composables/useEditorEvents'
import { useEditorFloatingToolbar } from '../composables/useEditorFloatingToolbar'
import { useEditorFullscreen } from '../composables/useEditorFullscreen'
import { useEditorWordCount } from '../composables/useEditorWordCount'
import { useEditorMode } from '../composables/useEditorMode'
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
const {
  isFullscreen,
  surfaceStyle,
  toggleFullscreen,
  exitFullscreen,
} = useEditorFullscreen(resolvedDevice)

// 字数统计需要先定义，供 useEditorMode 使用
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
  clearWordCountTimer,
  refreshWordCountNow,
  formatFullWordCount,
  formatVisibleWordCount,
  countFromPlainText,
  cleanup: cleanupWordCount,
} = useEditorWordCount({
  editor,
  resolvedDevice,
  maxLength,
  currentLength,
  usageRatio,
  surfaceRef,
})

// tooltip 位置计算 - 使用 Teleport 渲染到 body 上避免 overflow: hidden 裁剪
// 显示在PC状态栏（统计信息区域）上方，与浮动工具栏右对齐
const statsTooltipPosition = ref({ bottom: '0px', right: '0px' })

function updateStatsTooltipPosition() {
  nextTick(() => {
    // 优先使用浮动工具栏作为参考位置（更靠上）
    const floatingToolbar = document.querySelector('.floating-toolbar-pc')
    if (floatingToolbar) {
      const toolbarRect = floatingToolbar.getBoundingClientRect()
      statsTooltipPosition.value = {
        bottom: `${window.innerHeight - toolbarRect.top + 12}px`, // 在浮动工具栏上方 12px
        right: `${window.innerWidth - toolbarRect.right}px`, // 与浮动工具栏右对齐
      }
      return
    }
    // 回退到统计区域位置
    const statsArea = document.querySelector('.bamboo-editor__stats-area')
    if (!statsArea) return
    const rect = statsArea.getBoundingClientRect()
    statsTooltipPosition.value = {
      bottom: `${window.innerHeight - rect.top + 12}px`,
      right: `${window.innerWidth - rect.right}px`,
    }
  })
}

// 包装处理器，在触发时更新位置
function _handleWordCountMouseEnter() {
  updateStatsTooltipPosition()
  handleWordCountMouseEnter()
}

const {
  mode,
  sourceContent,
  currentHtml,
  switchMode,
  onSourceChange,
  applySourceChanges,
} = useEditorMode({
  editor,
  modelValue: toRef(props, 'modelValue'),
  resolvedDevice,
  emitUpdate: (html) => emit('update:modelValue', html),
  updateWordCountFromHtml: (html) => {
    // 从 HTML 提取纯文本
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const text = doc.body.textContent || ''
    const state = countFromPlainText(text, html)
    // 更新 wordCountState
    wordCountState.value = state
  },
})

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
        :mode="mode"
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
        @switch-mode="switchMode"
      />

      <div
        ref="surfaceRef"
        class="bamboo-editor__surface"
        :class="{ 'is-mobile': resolvedDevice === 'mobile' }"
        :style="surfaceStyle"
      >
        <!-- 编辑模式 -->
        <div v-show="mode === 'edit'" class="bamboo-editor__mode-content">
          <template v-if="editor">
            <EditorContent :editor="editor" class="bamboo-editor__content" />
          </template>
          <div v-else class="bamboo-editor__placeholder">Loading editor...</div>
        </div>

        <!-- 预览模式 -->
        <div v-show="mode === 'preview'" class="bamboo-editor__mode-content bamboo-editor__preview">
          <div class="bamboo-content" v-html="currentHtml" />
        </div>

        <!-- 源码模式 -->
        <div v-show="mode === 'source'" class="bamboo-editor__mode-content bamboo-editor__source">
          <textarea
            :value="sourceContent"
            @input="onSourceChange(($event.target as HTMLTextAreaElement).value)"
            class="bamboo-editor__source-textarea"
          />
        </div>

        <!-- 状态栏（所有模式共用） -->
        <div
          v-if="resolvedDevice === 'pc'"
          class="bamboo-editor__status-bar"
          :class="[
            { 'is-compact': isCompactWordCount },
            maxLengthStatus === 'warning' ? 'is-warning' : '',
            maxLengthStatus === 'danger' ? 'is-danger' : '',
          ]"
          :aria-label="wordCountAriaLabel"
        >
          <!-- 模式切换图标（始终可见，不触发展开） -->
          <div class="bamboo-editor__mode-switch">
            <button
              class="bamboo-editor__mode-btn"
              :class="{ 'is-active': mode === 'edit' }"
              title="编辑"
              @click="switchMode('edit')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
            </button>
            <button
              class="bamboo-editor__mode-btn"
              :class="{ 'is-active': mode === 'preview' }"
              title="预览"
              @click="switchMode('preview')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button
              class="bamboo-editor__mode-btn"
              :class="{ 'is-active': mode === 'source' }"
              title="源码"
              @click="switchMode('source')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </button>
          </div>

          <!-- 统计信息（hover 展开 tooltip） -->
          <div
            class="bamboo-editor__stats-area"
            @mouseenter="_handleWordCountMouseEnter"
            @mouseleave="handleWordCountMouseLeave"
          >
            <div class="bamboo-editor__stats-text">
              <template v-if="maxLength != null">
                <template v-if="currentLength > maxLength">
                  <span class="bamboo-editor__stats-value is-danger">+{{ formatVisibleWordCount(currentLength - maxLength) }}</span>
                  <span class="bamboo-editor__stats-label"> 超出</span>
                </template>
                <template v-else>
                  <span class="bamboo-editor__stats-value">{{ formatVisibleWordCount(currentLength) }}</span>
                  <span class="bamboo-editor__stats-sep">/</span>
                  <span class="bamboo-editor__stats-value">{{ formatVisibleWordCount(maxLength) }}</span>
                </template>
              </template>
              <template v-else-if="wordCountState.hasSelectedText">
                <span class="bamboo-editor__stats-value is-selected">{{ formatVisibleWordCount(wordCountState.selectedChineseCharacters) }}</span>
                <span class="bamboo-editor__stats-sep">/</span>
                <span class="bamboo-editor__stats-value">{{ formatVisibleWordCount(wordCountState.totalCharacters) }}</span>
                <span class="bamboo-editor__stats-label"> 字符</span>
              </template>
              <template v-else>
                <span class="bamboo-editor__stats-value">{{ formatVisibleWordCount(wordCountState.totalCharacters) }}</span>
                <span class="bamboo-editor__stats-label"> 字符</span>
              </template>
            </div>

          </div>
        </div>

      </div>

      <!-- 详细统计 tooltip - 用 Teleport 渲染到 body 上避免 overflow: hidden 裁剪 -->
      <Teleport to="body">
        <div
          v-if="resolvedDevice === 'pc'"
          v-show="isWordCountTooltipVisible"
          :style="statsTooltipPosition"
          class="bamboo-editor__stats-tooltip"
          role="tooltip"
        >
          <div class="bamboo-editor__word-count-tooltip-row">
            <span>字符数（含空格）</span>
            <span class="bamboo-editor__word-count-value">{{ wordCountState.totalCharacters }}</span>
          </div>
          <div class="bamboo-editor__word-count-tooltip-row">
            <span>中文字数</span>
            <span class="bamboo-editor__word-count-value">{{ wordCountState.chineseCharacters }}</span>
          </div>
          <div class="bamboo-editor__word-count-tooltip-row">
            <span>段落数</span>
            <span class="bamboo-editor__word-count-value">{{ wordCountState.paragraphCount }}</span>
          </div>
          <div class="bamboo-editor__word-count-tooltip-row">
            <span>行数</span>
            <span class="bamboo-editor__word-count-value">{{ wordCountState.lineCount }}</span>
          </div>
        </div>
      </Teleport>

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
  position: relative;
  padding: 0.75em 1em 0.75em 1.5em;
  margin: 1.25em 0;
  color: #4b5563;
  border-left: 3px solid #d1d5db;
  background: #fff;
  border-radius: 0 8px 8px 0;
}

/* 引用内容的颜色渐变 */
.bamboo-editor__content :deep(.ProseMirror blockquote p) {
  color: #52525b;
  margin: 0.5em 0;
}

.bamboo-editor__content :deep(.ProseMirror blockquote p:first-child) {
  margin-top: 0;
}

.bamboo-editor__content :deep(.ProseMirror blockquote p:last-child) {
  margin-bottom: 0;
}

.bamboo-editor__content :deep(.ProseMirror code) {
  padding: 0.125em 0.35em;
  border-radius: 6px;
  background: #f4f4f5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
}

.bamboo-editor__content :deep(.ProseMirror pre) {
  position: relative;
  padding: 1.25em 3.5em 1.25em 1.25em;
  margin: 1.5em 0;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  overflow-x: auto;
}

.bamboo-editor__content :deep(.ProseMirror pre code) {
  padding: 0;
  background: transparent;
  color: #374151;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', Roboto Mono, Consolas, 'Courier New', monospace;
  font-size: 1em;
  line-height: 1.7;
  letter-spacing: -0.01em;
}

/* 代码块复制按钮 - 浅色风格 */
.bamboo-editor__content :deep(.code-copy-button) {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.bamboo-editor__content :deep(.code-copy-button:hover) {
  background: #ffffff;
  border-color: #d1d5db;
  color: #6b7280;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.bamboo-editor__content :deep(.code-copy-button:active) {
  transform: translateY(0) scale(0.96);
  transition: all 0.1s ease;
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
  display: inline-block;
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

/* 状态栏（编辑/预览/源码模式共用）- 底部右侧固定位置 */
.bamboo-editor__status-bar {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  font-size: 12px;
  color: #64748b;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.bamboo-editor__status-bar:hover {
  border-color: #cbd5e1;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 6px 16px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.bamboo-editor__status-bar.is-warning {
  border-color: rgba(251, 191, 36, 0.5);
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.bamboo-editor__status-bar.is-danger {
  border-color: rgba(248, 113, 113, 0.5);
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

/* 模式切换按钮 - 左侧左对齐 */
.bamboo-editor__mode-switch {
  display: flex;
  gap: 2px;
}

.bamboo-editor__mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.bamboo-editor__mode-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: -1;
}

.bamboo-editor__mode-btn:hover {
  color: #475569;
}

.bamboo-editor__mode-btn:hover::before {
  opacity: 1;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.04);
}

.bamboo-editor__mode-btn.is-active {
  color: #0f172a;
}

.bamboo-editor__mode-btn.is-active::before {
  opacity: 1;
  background: #ffffff;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 统计信息区域 - hover 展开 tooltip */
.bamboo-editor__stats-area {
  position: relative;
  cursor: help;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.bamboo-editor__stats-area:hover {
  background: rgba(0, 0, 0, 0.02);
}

.bamboo-editor__stats-text {
  display: flex;
  align-items: center;
  gap: 3px;
  font-weight: 500;
  line-height: 1;
}

.bamboo-editor__stats-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  color: #475569;
}

.bamboo-editor__stats-value.is-danger {
  color: #dc2626;
}

.bamboo-editor__stats-value.is-selected {
  color: #0891b2;
}

.bamboo-editor__stats-sep {
  color: #cbd5e1;
}

.bamboo-editor__stats-label {
  color: #94a3b8;
  font-size: 11px;
  margin-left: 2px;
}

/* 详细统计 tooltip - 使用 Teleport 固定定位 */
.bamboo-editor__stats-tooltip {
  position: fixed;
  z-index: 1000;
  min-width: 188px;
  max-width: min(260px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
  backdrop-filter: blur(12px);
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.02),
    0 10px 20px rgba(0, 0, 0, 0.08);
  pointer-events: none;
}

/* 小箭头 - 指向下方，右对齐 */
.bamboo-editor__stats-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 16px;
  border: 5px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.98);
}

.bamboo-editor__word-count-tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.bamboo-editor__word-count-tooltip-row + .bamboo-editor__word-count-tooltip-row {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.bamboo-editor__word-count-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  color: #334155;
  font-weight: 500;
}

/* 字数统计工具提示的标题 */
.bamboo-editor__word-count-tooltip-row:first-child {
  font-weight: 500;
  color: #0f172a;
}

/* 全屏时状态栏调整 */
.bamboo-editor.is-fullscreen .bamboo-editor__status-bar {
  left: 16px;
  bottom: 16px;
}

.bamboo-editor.is-fullscreen .bamboo-editor__status-bar.is-compact {
  left: 12px;
  bottom: 12px;
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

/* 模式切换按钮（字数统计栏内） */
.bamboo-editor__mode-switch {
  display: flex;
  gap: 2px;
}

.bamboo-editor__mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bamboo-editor__mode-btn:hover {
  color: #6b7280;
  background: rgba(255, 255, 255, 0.6);
}

.bamboo-editor__mode-btn.is-active {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* 模式内容容器 */
.bamboo-editor__mode-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 预览模式 */
.bamboo-editor__preview {
  padding: 10px 12px 56px;
  overflow-y: auto;
}

.bamboo-editor__preview .bamboo-content > :first-child {
  margin-top: 0;
}

.bamboo-editor__preview .bamboo-content {
  max-width: 100%;
}

/* 源码模式 */
.bamboo-editor__source {
  display: flex;
  flex-direction: column;
}

.bamboo-editor__source-textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  background: #fafafa;
  tab-size: 2;
}
</style>
