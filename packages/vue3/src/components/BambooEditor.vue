<template>
  <div class="bamboo-editor" :class="{ 'is-fullscreen': isFullscreen }" :data-editor-scope="editorScopeId">
    <div class="bamboo-editor__main" :class="{ 'is-mobile': resolvedDevice === 'mobile' }">
      <ToolbarPC
        v-if="resolvedDevice === 'pc'"
        :editor="editor"
        :disabled="disabled"
        :fullscreen="isFullscreen"
        :color-palette="resolvedColorPalette"
        @image-select="handleImageSelect"
        @open-link-dialog="handleOpenLinkDialog"
        @open-remote-image-dialog="handleOpenRemoteImageDialog"
        @text-color-select="handleTextColorSelect"
        @undo="handleUndo"
        @redo="handleRedo"
        @clear-formatting="handleClearFormatting"
        @insert-horizontal-rule="handleInsertHorizontalRule"
        @toggle-fullscreen="toggleFullscreen"
        @show-info="infoDialogVisible = true"
      />

      <div ref="surfaceRef" class="bamboo-editor__surface" :class="{ 'is-mobile': resolvedDevice === 'mobile' }" :style="surfaceStyle">
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
                  <span class="bamboo-editor__word-count-value">{{ formatVisibleWordCount(currentLength - maxLength) }}</span>
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
                <span class="bamboo-editor__word-count-value is-selected">{{ formatVisibleWordCount(wordCountState.selectedChineseCharacters) }}</span>
                <span class="bamboo-editor__word-count-separator">/</span>
                <span v-if="!isCompactWordCount">共 </span>
                <span class="bamboo-editor__word-count-value">{{ formatVisibleWordCount(wordCountState.totalCharacters) }}</span>
                <span v-if="!isCompactWordCount"> 字符</span>
              </template>
              <template v-else>
                <span v-if="!isCompactWordCount">共 </span>
                <span class="bamboo-editor__word-count-value">{{ formatVisibleWordCount(wordCountState.totalCharacters) }}</span>
                <span v-if="!isCompactWordCount"> 字符</span>
              </template>
            </div>

            <div v-if="isWordCountTooltipVisible" class="bamboo-editor__word-count-tooltip" role="tooltip">
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>字符数（含空格）</span>
                <span class="bamboo-editor__word-count-value">{{ formatFullWordCount(wordCountState.totalCharacters) }}</span>
              </div>
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>中文字数</span>
                <span class="bamboo-editor__word-count-value">{{ formatFullWordCount(wordCountState.chineseCharacters) }}</span>
              </div>
              <div class="bamboo-editor__word-count-tooltip-row">
                <span>段落数</span>
                <span class="bamboo-editor__word-count-value">{{ formatFullWordCount(wordCountState.paragraphCount) }}</span>
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
        @open-link-dialog="handleOpenLinkDialog"
        @text-color-select="handleTextColorSelect"
        @clear-formatting="handleClearFormatting"
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
        @image-select="handleImageSelect"
        @open-remote-image-dialog="handleOpenRemoteImageDialog"
        @text-color-select="handleTextColorSelect"
        @clear-formatting="handleClearFormatting"
        @insert-horizontal-rule="handleInsertHorizontalRule"
      />

      <transition name="bamboo-editor-toast">
        <div v-if="resolvedDevice === 'mobile' && mobileToastVisible" class="bamboo-editor__toast" role="status" aria-live="polite">
          {{ mobileToastMessage }}
        </div>
      </transition>

      <EditorUrlDialog
        :visible="urlDialogVisible"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        :type="urlDialogState.type"
        :mode="urlDialogState.mode"
        :initial-value="urlDialogState.initialValue"
        :allow-remove="urlDialogState.allowRemove"
        @confirm="handleUrlDialogConfirm"
        @remove="handleUrlDialogRemove"
        @cancel="closeUrlDialog"
      />

      <EditorInfoDialog
        :visible="infoDialogVisible"
        :device="resolvedDevice === 'mobile' ? 'mobile' : 'pc'"
        @close="infoDialogVisible = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { EditorContent } from '@tiptap/vue-3'
import ToolbarPC from './ToolbarPC.vue'
import ToolbarMobile from './ToolbarMobile.vue'
import FloatingToolbarPC from './FloatingToolbarPC.vue'
import EditorUrlDialog from './EditorUrlDialog.vue'
import EditorInfoDialog from './EditorInfoDialog.vue'
import { useBambooEditor } from '../composables/useBambooEditor'
import type { BambooColorOption, BambooDevice, UploadHandler } from '../composables/useBambooEditor'

declare const window: Window & typeof globalThis

type FloatingPosition = {
  top: number
  left: number
  editorTop?: number
  editorBottom?: number
  editorLeft?: number
  editorRight?: number
}

const WORD_COUNT_DEBOUNCE_MS = 300
const WORD_COUNT_TOOLTIP_DELAY_MS = 200
const WORD_COUNT_COMPACT_WIDTH = 400
const WORD_COUNT_SCROLLBAR_GAP = 20

type WordCountState = {
  totalCharacters: number
  chineseCharacters: number
  selectedChineseCharacters: number
  paragraphCount: number
  lineCount: number
  hasSelectedText: boolean
}

const DEFAULT_WORD_COUNT_STATE: WordCountState = {
  totalCharacters: 0,
  chineseCharacters: 0,
  selectedChineseCharacters: 0,
  paragraphCount: 0,
  lineCount: 0,
  hasSelectedText: false,
}

const DEFAULT_COLOR_PALETTE: BambooColorOption[] = [
  { token: 'primary', label: '主色', value: '#18181b' },
  { token: 'success', label: '绿色', value: '#16a34a' },
  { token: 'warning', label: '橙色', value: '#ea580c' },
  { token: 'danger', label: '红色', value: '#dc2626' },
  { token: 'muted', label: '灰色', value: '#71717a' },
  { token: 'purple', label: '紫色', value: '#7c3aed' },
]

const props = withDefaults(defineProps<{
  modelValue: string
  device?: BambooDevice
  placeholder?: string
  disabled?: boolean
  uploadHandler?: UploadHandler
  height?: string
  colorPalette?: BambooColorOption[]
  maxLength?: number
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
const editorScopeId = `bamboo-editor-${Math.random().toString(36).slice(2)}`
const surfaceRef = ref<HTMLElement | null>(null)
const floatingToolbarVisible = ref(false)
const floatingToolbarPosition = ref<FloatingPosition>({ top: 0, left: 0 })
const wordCountState = ref<WordCountState>({ ...DEFAULT_WORD_COUNT_STATE })
const surfaceWidth = ref(0)
const isWordCountTooltipVisible = ref(false)
const urlDialogVisible = ref(false)
const infoDialogVisible = ref(false)
const mobileToastVisible = ref(false)
const mobileToastMessage = ref('')
const urlDialogState = ref<{
  type: 'link' | 'remote-image'
  mode: 'create' | 'edit'
  initialValue: string
  allowRemove: boolean
}>({
  type: 'link',
  mode: 'create',
  initialValue: '',
  allowRemove: false,
})

const resolvedColorPalette = computed(() => props.colorPalette?.length ? props.colorPalette : DEFAULT_COLOR_PALETTE)
const editorColorCss = computed(() => buildEditorColorCss(editorScopeId, resolvedColorPalette.value))
const isCompactWordCount = computed(() => surfaceWidth.value > 0 && surfaceWidth.value < WORD_COUNT_COMPACT_WIDTH)
const wordCountAriaLabel = computed(() => {
  if (maxLength.value != null) {
    if (currentLength.value > maxLength.value) {
      return `已超出 ${formatFullWordCount(currentLength.value - maxLength.value)} 字符`
    }

    return `${formatFullWordCount(currentLength.value)}/${formatFullWordCount(maxLength.value)} 字符`
  }

  if (wordCountState.value.hasSelectedText) {
    return `已选 ${formatFullWordCount(wordCountState.value.selectedChineseCharacters)} 字，共 ${formatFullWordCount(wordCountState.value.totalCharacters)} 字符`
  }

  return `共 ${formatFullWordCount(wordCountState.value.totalCharacters)} 字符`
})

const maxLengthStatus = computed(() => {
  if (maxLength.value == null) {
    return 'default'
  }

  if (currentLength.value >= maxLength.value) {
    return 'danger'
  }

  if (usageRatio.value >= 0.9) {
    return 'warning'
  }

  return 'default'
})

const surfaceStyle = computed(() => {
  if (isFullscreen.value) {
    return undefined
  }

  return {
    height: props.height,
  }
})

const { editor, resolvedDevice, currentLength, maxLength, remainingLength, usageRatio, isNearLimit, isAtLimit, maxLengthFeedback, insertImage, setLink, unsetLink, insertRemoteImage, undo, redo, insertHorizontalRule, clearFormatting } = useBambooEditor({
  modelValue: toRef(props, 'modelValue'),
  device: toRef(props, 'device'),
  placeholder: toRef(props, 'placeholder'),
  disabled: toRef(props, 'disabled'),
  uploadHandler: toRef(props, 'uploadHandler'),
  colorPalette: resolvedColorPalette,
  maxLength: toRef(props, 'maxLength'),
  onUpdate: (html) => emit('update:modelValue', html),
})

let wordCountTimer: number | null = null
let wordCountTooltipTimer: number | null = null
let mobileToastTimer: number | null = null
let surfaceResizeObserver: ResizeObserver | null = null

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

function handleOpenLinkDialog(payload?: { initialValue?: string, mode?: 'create' | 'edit', allowRemove?: boolean }) {
  if (props.disabled) {
    return
  }

  urlDialogState.value = {
    type: 'link',
    mode: payload?.mode ?? 'create',
    initialValue: payload?.initialValue ?? '',
    allowRemove: payload?.allowRemove ?? false,
  }
  urlDialogVisible.value = true
}

function handleOpenRemoteImageDialog(payload?: { initialValue?: string }) {
  if (props.disabled) {
    return
  }

  urlDialogState.value = {
    type: 'remote-image',
    mode: 'create',
    initialValue: payload?.initialValue ?? '',
    allowRemove: false,
  }
  urlDialogVisible.value = true
}

function closeUrlDialog() {
  urlDialogVisible.value = false
  window.setTimeout(() => editor.value?.commands.focus(), 0)
}

function handleUrlDialogConfirm(url: string) {
  if (urlDialogState.value.type === 'remote-image') {
    handleRemoteImageSelect(url)
  }
  else {
    handleLinkSelect(url)
  }

  closeUrlDialog()
}

function handleUrlDialogRemove() {
  if (urlDialogState.value.type === 'link') {
    handleLinkSelect(null)
  }

  closeUrlDialog()
}

function handleTextColorSelect(token: string | null) {
  if (!editor.value) {
    return false
  }

  const chain = editor.value.chain().focus()
  return (token ? chain.setTextColor(token) : chain.unsetTextColor()).run()
}

function handleUndo() {
  return undo()
}

function handleRedo() {
  return redo()
}

function handleClearFormatting() {
  return clearFormatting()
}

function handleInsertHorizontalRule() {
  return insertHorizontalRule()
}

function showMobileToast(message: string) {
  if (typeof window === 'undefined' || !message) {
    return
  }

  mobileToastMessage.value = message
  mobileToastVisible.value = true

  if (mobileToastTimer !== null) {
    window.clearTimeout(mobileToastTimer)
  }

  mobileToastTimer = window.setTimeout(() => {
    mobileToastVisible.value = false
    mobileToastTimer = null
  }, 1800)
}

function clearWordCountTimers() {
  clearWordCountTimer()

  if (wordCountTooltipTimer !== null) {
    window.clearTimeout(wordCountTooltipTimer)
    wordCountTooltipTimer = null
  }

  if (mobileToastTimer !== null) {
    window.clearTimeout(mobileToastTimer)
    mobileToastTimer = null
  }
}

function handleWordCountMouseEnter() {
  if (typeof window === 'undefined') {
    return
  }

  if (wordCountTooltipTimer !== null) {
    window.clearTimeout(wordCountTooltipTimer)
  }

  wordCountTooltipTimer = window.setTimeout(() => {
    isWordCountTooltipVisible.value = true
    wordCountTooltipTimer = null
  }, WORD_COUNT_TOOLTIP_DELAY_MS)
}

function handleWordCountMouseLeave() {
  if (typeof window === 'undefined') {
    return
  }

  if (wordCountTooltipTimer !== null) {
    window.clearTimeout(wordCountTooltipTimer)
    wordCountTooltipTimer = null
  }

  isWordCountTooltipVisible.value = false
}

function updateSurfaceWidth() {
  const surfaceElement = surfaceRef.value
  if (!surfaceElement) {
    surfaceWidth.value = 0
    return
  }

  const scrollbarGap = resolvedDevice.value === 'pc' ? WORD_COUNT_SCROLLBAR_GAP : 0
  surfaceWidth.value = Math.max(surfaceElement.clientWidth - scrollbarGap, 0)
}

function resetWordCountState() {
  clearWordCountTimer()
  wordCountState.value = { ...DEFAULT_WORD_COUNT_STATE }
  handleWordCountMouseLeave()
}

function scheduleWordCountRefresh(immediate = false) {
  if (typeof window === 'undefined') {
    return
  }

  clearWordCountTimer()

  if (immediate) {
    refreshWordCountNow()
    return
  }

  wordCountTimer = window.setTimeout(() => {
    refreshWordCountNow()
    wordCountTimer = null
  }, WORD_COUNT_DEBOUNCE_MS)
}

function clearWordCountTimer() {
  if (typeof window === 'undefined') {
    wordCountTimer = null
    return
  }

  if (wordCountTimer !== null) {
    window.clearTimeout(wordCountTimer)
    wordCountTimer = null
  }
}

function refreshWordCountNow() {
  const instance = editor.value
  if (!instance) {
    resetWordCountState()
    return
  }

  if (resolvedDevice.value === 'pc') {
    updateSurfaceWidth()
  }
  const plainText = getEditorPlainText(instance)
  const selectionText = getSelectionText(instance)
  const chineseCharacters = countChineseCharacters(plainText)
  const selectedChineseCharacters = countChineseCharacters(selectionText)

  wordCountState.value = {
    totalCharacters: getTotalCharacterCount(instance),
    chineseCharacters,
    selectedChineseCharacters,
    paragraphCount: countParagraphs(instance),
    lineCount: countLogicalLines(plainText),
    hasSelectedText: selectedChineseCharacters > 0,
  }
}

function getTotalCharacterCount(instance: Editor) {
  return instance.storage.characterCount?.characters?.() ?? instance.getText().length
}

function getEditorPlainText(instance: Editor) {
  return instance.state.doc.textBetween(0, instance.state.doc.content.size, '\n', '\n')
}

function getSelectionText(instance: Editor) {
  const { from, to, empty } = instance.state.selection
  if (empty || from === to) {
    return ''
  }

  return instance.state.doc.textBetween(from, to, '\n', '\n')
}

function countChineseCharacters(value: string) {
  try {
    return value.match(/\p{Unified_Ideograph}/gu)?.length ?? 0
  }
  catch {
    return value.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0
  }
}

function countParagraphs(instance: Editor) {
  let count = 0

  instance.state.doc.descendants((node) => {
    if (node.isTextblock && node.textContent.trim()) {
      count += 1
    }
  })

  return count
}

function countLogicalLines(value: string) {
  if (!value.trim()) {
    return 0
  }

  return value
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .length
}

function formatFullWordCount(value: number) {
  return value.toLocaleString('zh-CN')
}

function formatVisibleWordCount(value: number) {
  if (!isCompactWordCount.value) {
    return formatFullWordCount(value)
  }

  if (maxLength.value != null) {
    return `${value}`
  }

  if (value >= 1000) {
    const compactValue = value / 1000
    const displayValue = Number.isInteger(compactValue) ? compactValue.toFixed(0) : compactValue.toFixed(1)
    return `${displayValue.replace(/\.0$/, '')}k`
  }

  return `${value}`
}

function hideFloatingToolbar() {
  floatingToolbarVisible.value = false
}

function updateFloatingToolbar() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    hideFloatingToolbar()
    return
  }

  const instance = editor.value
  if (!instance || resolvedDevice.value !== 'mobile' || props.disabled) {
    hideFloatingToolbar()
    return
  }

  const selection = instance.state.selection as typeof instance.state.selection & { node?: { type?: { name?: string } } }
  const isImageSelection = selection.node?.type?.name === 'image'
  const editorElement = document.querySelector(`[data-editor-scope='${editorScopeId}'] .bamboo-editor__content .ProseMirror`) as HTMLElement | null
  if (!editorElement) {
    hideFloatingToolbar()
    return
  }

  let rect: DOMRect | null = null

  if (isImageSelection) {
    const imageNode = instance.view.nodeDOM(selection.from) as HTMLElement | null
    if (!imageNode || !editorElement.contains(imageNode)) {
      hideFloatingToolbar()
      return
    }

    const imageRect = imageNode.getBoundingClientRect()
    if (!imageRect.width && !imageRect.height) {
      hideFloatingToolbar()
      return
    }

    rect = imageRect
  }
  else {
    const { from, to, empty } = selection
    if (empty || from === to) {
      hideFloatingToolbar()
      return
    }

    if (!selection.$from.parent.isTextblock) {
      hideFloatingToolbar()
      return
    }

    const domSelection = window.getSelection()
    if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
      hideFloatingToolbar()
      return
    }

    const range = domSelection.getRangeAt(0)
    if (!editorElement.contains(range.commonAncestorContainer)) {
      hideFloatingToolbar()
      return
    }

    const rangeRect = range.getBoundingClientRect()
    if (!rangeRect.width && !rangeRect.height) {
      hideFloatingToolbar()
      return
    }

    rect = rangeRect
  }

  const editorRect = editorElement.getBoundingClientRect()
  const toolbarWidth = 420
  const toolbarHeight = 52
  const gap = 10
  const minLeft = editorRect.left + toolbarWidth / 2
  const maxLeft = editorRect.right - toolbarWidth / 2
  const centeredLeft = rect.left + rect.width / 2
  const left = clamp(centeredLeft, minLeft, maxLeft)
  const placeAboveTop = rect.top - gap
  const top = placeAboveTop - toolbarHeight >= editorRect.top
    ? placeAboveTop
    : Math.min(editorRect.bottom - gap, rect.bottom + toolbarHeight + gap)

  floatingToolbarPosition.value = {
    top,
    left,
    editorTop: editorRect.top,
    editorBottom: editorRect.bottom,
    editorLeft: editorRect.left,
    editorRight: editorRect.right,
  }
  floatingToolbarVisible.value = true
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

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return value
  }

  return Math.min(Math.max(value, min), max)
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

watch([maxLengthFeedback, resolvedDevice], ([feedback, device]) => {
  if (!feedback || device !== 'mobile') {
    return
  }

  showMobileToast(feedback.message)
})

watch(resolvedDevice, (value) => {
  if (value !== 'pc' && isFullscreen.value) {
    exitFullscreen()
  }

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

watch(surfaceRef, (element, _, onCleanup) => {
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
}, { immediate: true })

watch([editor, resolvedDevice, () => props.disabled], (_, __, onCleanup) => {
  const instance = editor.value
  if (!instance) {
    hideFloatingToolbar()
    resetWordCountState()
    return
  }

  const handleSelectionChange = () => updateFloatingToolbar()
  const handleWordCountChange = () => scheduleWordCountRefresh()
  const handleBlur = ({ event }: { event?: FocusEvent }) => {
    const relatedTarget = event?.relatedTarget
    if (relatedTarget instanceof Element && relatedTarget.closest('.floating-toolbar-pc')) {
      return
    }

    window.setTimeout(() => updateFloatingToolbar(), 0)
  }

  const handleFocus = () => updateFloatingToolbar()

  instance.on('selectionUpdate', handleSelectionChange)
  instance.on('transaction', handleSelectionChange)
  instance.on('selectionUpdate', handleWordCountChange)
  instance.on('transaction', handleWordCountChange)
  instance.on('focus', handleFocus)
  instance.on('blur', handleBlur)
  window.addEventListener('resize', handleSelectionChange)
  window.addEventListener('scroll', handleSelectionChange, true)
  updateFloatingToolbar()
  scheduleWordCountRefresh(true)

  onCleanup(() => {
    clearWordCountTimer()
    instance.off('selectionUpdate', handleSelectionChange)
    instance.off('transaction', handleSelectionChange)
    instance.off('selectionUpdate', handleWordCountChange)
    instance.off('transaction', handleWordCountChange)
    instance.off('focus', handleFocus)
    instance.off('blur', handleBlur)
    window.removeEventListener('resize', handleSelectionChange)
    window.removeEventListener('scroll', handleSelectionChange, true)
  })
}, { immediate: true })

onBeforeUnmount(() => {
  hideFloatingToolbar()
  clearWordCountTimers()
  surfaceResizeObserver?.disconnect()

  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    removeEditorColorStyle(editorScopeId)
  }

  window.removeEventListener('keydown', onKeydown)
})

watch(editorColorCss, (value) => {
  applyEditorColorStyle(editorScopeId, value)
}, { immediate: true })

function buildEditorColorCss(scopeId: string, colorPalette: readonly BambooColorOption[]) {
  return colorPalette
    .map((item) => `[data-editor-scope='${escapeCssValue(scopeId)}'] .bamboo-editor__content .ProseMirror span[data-color='${escapeCssValue(item.token)}']{color:${item.value};}`)
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

.bamboo-editor__content :deep(.ProseMirror span[data-color='primary']) {
  color: var(--bamboo-editor-color-primary, #18181b);
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
  transition: opacity 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
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
  transition: opacity 0.18s ease, transform 0.18s ease;
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
