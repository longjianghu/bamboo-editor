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
      />

      <div class="bamboo-editor__surface" :class="{ 'is-mobile': resolvedDevice === 'mobile' }" :style="surfaceStyle">
        <EditorContent v-if="editor" :editor="editor" class="bamboo-editor__content" />
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
        @image-select="handleImageSelect"
        @open-remote-image-dialog="handleOpenRemoteImageDialog"
        @text-color-select="handleTextColorSelect"
        @clear-formatting="handleClearFormatting"
        @insert-horizontal-rule="handleInsertHorizontalRule"
      />

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import ToolbarPC from './ToolbarPC.vue'
import ToolbarMobile from './ToolbarMobile.vue'
import FloatingToolbarPC from './FloatingToolbarPC.vue'
import EditorUrlDialog from './EditorUrlDialog.vue'
import { useBambooEditor, type BambooColorOption, type BambooDevice, type UploadHandler } from '../composables/useBambooEditor'

declare const window: Window & typeof globalThis

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
const floatingToolbarVisible = ref(false)
const floatingToolbarPosition = ref({ top: 0, left: 0 })
const urlDialogVisible = ref(false)
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

const surfaceStyle = computed(() => {
  if (isFullscreen.value) {
    return undefined
  }

  return {
    height: props.height,
  }
})

const { editor, resolvedDevice, insertImage, setLink, unsetLink, insertRemoteImage, undo, redo, insertHorizontalRule, clearFormatting } = useBambooEditor({
  modelValue: toRef(props, 'modelValue'),
  device: toRef(props, 'device'),
  placeholder: toRef(props, 'placeholder'),
  disabled: toRef(props, 'disabled'),
  uploadHandler: toRef(props, 'uploadHandler'),
  colorPalette: resolvedColorPalette,
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

watch(resolvedDevice, (value) => {
  if (value !== 'pc' && isFullscreen.value) {
    exitFullscreen()
  }

  if (value !== 'mobile') {
    hideFloatingToolbar()
  }
})

watch([editor, resolvedDevice, () => props.disabled], (_, __, onCleanup) => {
  const instance = editor.value
  if (!instance) {
    hideFloatingToolbar()
    return
  }

  const handleSelectionChange = () => updateFloatingToolbar()
  const handleBlur = ({ event }: { event?: FocusEvent }) => {
    const relatedTarget = event?.relatedTarget
    if (relatedTarget instanceof Node && relatedTarget.closest('.floating-toolbar-pc')) {
      return
    }

    window.setTimeout(() => updateFloatingToolbar(), 0)
  }

  const handleFocus = () => updateFloatingToolbar()

  instance.on('selectionUpdate', handleSelectionChange)
  instance.on('transaction', handleSelectionChange)
  instance.on('focus', handleFocus)
  instance.on('blur', handleBlur)
  window.addEventListener('resize', handleSelectionChange)
  window.addEventListener('scroll', handleSelectionChange, true)
  updateFloatingToolbar()

  onCleanup(() => {
    instance.off('selectionUpdate', handleSelectionChange)
    instance.off('transaction', handleSelectionChange)
    instance.off('focus', handleFocus)
    instance.off('blur', handleBlur)
    window.removeEventListener('resize', handleSelectionChange)
    window.removeEventListener('scroll', handleSelectionChange, true)
  })
}, { immediate: true })

onBeforeUnmount(() => {
  hideFloatingToolbar()

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
  padding: 10px 12px;
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
