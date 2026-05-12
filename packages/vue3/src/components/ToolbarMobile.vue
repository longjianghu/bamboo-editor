<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { BambooColorOption } from '../composables/useBambooEditor'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolbarIcon from './ToolbarIcon.vue'

const props = defineProps<{
  editor: Editor | null
  disabled?: boolean
  colorPalette?: readonly BambooColorOption[]
  stats: {
    totalCharacters: number
    chineseCharacters: number
    paragraphCount: number
    lineCount: number
    currentLength?: number
    maxLength?: number
    isNearLimit?: boolean
    isAtLimit?: boolean
  }
}>()

const emit = defineEmits<{
  openImageDialog: []
  openVideoDialog: []
  openAudioDialog: []
  openLinkDialog: [payload?: { initialValue?: string; mode?: 'create' | 'edit'; allowRemove?: boolean }]
  textColorSelect: [token: string | null]
  clearFormatting: []
  insertHorizontalRule: []
}>()

declare const window: Window & typeof globalThis

interface ListOption {
  label: string
  command: 'toggleBulletList' | 'toggleOrderedList'
  active: 'bulletList' | 'orderedList'
  icon: 'bullet-list' | 'ordered-list'
}

interface MediaOption {
  label: string
  icon: 'image' | 'remote-video' | 'audio'
  action: 'open-image-dialog' | 'open-video-dialog' | 'open-audio-dialog'
}

interface DropdownPlacement {
  horizontal: 'left' | 'right'
  vertical: 'up'
}

type MenuKind = 'list' | 'media'

const OPEN_DELAY_MS = 100
const CLOSE_ANIMATION_MS = 200

function _emitAndClosePanel(event: 'openImageDialog' | 'openVideoDialog' | 'openAudioDialog') {
  emit(event as any)
  closePlusPanel()
}

const listOptions = [
  { label: '无序列表', command: 'toggleBulletList', active: 'bulletList', icon: 'bullet-list' },
  { label: '有序列表', command: 'toggleOrderedList', active: 'orderedList', icon: 'ordered-list' },
] as const satisfies readonly ListOption[]

const mediaOptions = [
  { label: '图片', icon: 'image', action: 'open-image-dialog' },
  { label: '视频', icon: 'remote-video', action: 'open-video-dialog' },
  { label: '音频', icon: 'audio', action: 'open-audio-dialog' },
] as const satisfies readonly MediaOption[]

const isListMenuOpen = ref(false)
const isMediaMenuOpen = ref(false)
const isPlusPanelVisible = ref(false)
const isPlusPanelOpen = ref(false)

const listMenuRef = ref<HTMLElement | null>(null)
const listTriggerRef = ref<HTMLElement | null>(null)
const mediaMenuRef = ref<HTMLElement | null>(null)
const mediaTriggerRef = ref<HTMLElement | null>(null)
const plusMenuRef = ref<HTMLElement | null>(null)
const plusTriggerRef = ref<HTMLElement | null>(null)
const shellRef = ref<HTMLElement | null>(null)

const panelWrapStyle = ref<Record<string, string>>({})
const listDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'up' })
const listDropdownMenuStyle = ref<Record<string, string>>({})
const mediaDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'up' })
const mediaDropdownMenuStyle = ref<Record<string, string>>({})

let openTimer: number | null = null
let closeTimer: number | null = null

const currentListOption = computed(() => (props.editor?.isActive('orderedList') ? listOptions[1] : listOptions[0]))
const currentListLabel = computed(() => currentListOption.value.label)
const currentListIcon = computed(() => currentListOption.value.icon)
const isListMenuActive = computed(() =>
  Boolean(props.editor?.isActive('bulletList') || props.editor?.isActive('orderedList')),
)
const statsStatusClass = computed(() => ({
  'is-warning': Boolean(props.stats.maxLength != null && props.stats.isNearLimit && !props.stats.isAtLimit),
  'is-danger': Boolean(props.stats.maxLength != null && props.stats.isAtLimit),
}))

function formatCount(value: number) {
  return value.toLocaleString('zh-CN')
}

function clearPanelTimers() {
  if (openTimer !== null) {
    window.clearTimeout(openTimer)
    openTimer = null
  }
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
}

function blurEditor() {
  props.editor?.commands.blur()
}

function focusEditor() {
  nextTick(() => props.editor?.commands.focus())
}

function run(command: string, attrs?: Record<string, unknown>) {
  const chain = props.editor?.chain().focus()
  if (!chain) return
  const target = attrs ? (chain as any)[command](attrs) : (chain as any)[command]()
  target?.run?.()
}

function runAndClosePanel(command: string, attrs?: Record<string, unknown>) {
  run(command, attrs)
  closePlusPanel()
}

function isDisabled(command: string, attrs?: Record<string, unknown>) {
  if (props.disabled) return true
  const chain = props.editor?.can().chain().focus()
  if (!chain) return true
  const target = attrs ? (chain as any)[command](attrs) : (chain as any)[command]()
  return !target?.run?.()
}

function buttonClass(name: string, attrs?: Record<string, unknown>) {
  const active = attrs ? props.editor?.isActive(name, attrs) : props.editor?.isActive(name)
  return { 'is-active': Boolean(active) }
}

function selectList(option: ListOption) {
  run(option.command)
  closeMenus()
}

function selectMedia(option: MediaOption) {
  if (option.action === 'open-image-dialog') {
    emit('openImageDialog')
  } else if (option.action === 'open-video-dialog') {
    emit('openVideoDialog')
  } else if (option.action === 'open-audio-dialog') {
    emit('openAudioDialog')
  }
  closeMenus()
}

function _emitActionAndClosePanel(action: 'clearFormatting' | 'insertHorizontalRule') {
  if (props.disabled) return
  if (action === 'clearFormatting') {
    emit('clearFormatting')
  } else {
    emit('insertHorizontalRule')
  }
  closePlusPanel()
}

function updatePanelPosition() {
  const shell = shellRef.value
  if (!shell || typeof window === 'undefined') return

  const toolbar = shell.querySelector('.toolbar-mobile') as HTMLElement | null
  const toolbarRect = toolbar?.getBoundingClientRect()
  if (!toolbarRect) return

  panelWrapStyle.value = {
    left: `${toolbarRect.left + toolbarRect.width / 2}px`,
    bottom: `${Math.max(0, window.innerHeight - toolbarRect.top)}px`,
    width: `${toolbarRect.width}px`,
    maxWidth: `${toolbarRect.width}px`,
  }
}

function getMenuState(kind: MenuKind) {
  if (kind === 'media') {
    return isMediaMenuOpen
  }
  return isListMenuOpen
}

function getMenuElements(kind: MenuKind) {
  if (kind === 'media') {
    return {
      menuRef: mediaMenuRef,
      triggerRef: mediaTriggerRef,
      placementRef: mediaDropdownPlacement,
      styleRef: mediaDropdownMenuStyle,
      width: 120,
    }
  }
  return {
    menuRef: listMenuRef,
    triggerRef: listTriggerRef,
    placementRef: listDropdownPlacement,
    styleRef: listDropdownMenuStyle,
    width: 160,
  }
}

function closeMenus() {
  isListMenuOpen.value = false
  isMediaMenuOpen.value = false
}

function openPlusPanel() {
  if (props.disabled) return
  closeMenus()
  clearPanelTimers()
  blurEditor()
  updatePanelPosition()
  isPlusPanelVisible.value = true
  openTimer = window.setTimeout(() => {
    updatePanelPosition()
    isPlusPanelOpen.value = true
    openTimer = null
  }, OPEN_DELAY_MS)
}

function closePlusPanel() {
  clearPanelTimers()
  isPlusPanelOpen.value = false
  closeTimer = window.setTimeout(() => {
    isPlusPanelVisible.value = false
    closeTimer = null
    focusEditor()
  }, CLOSE_ANIMATION_MS)
}

function togglePlusPanel() {
  if (isPlusPanelVisible.value || isPlusPanelOpen.value) {
    closePlusPanel()
    return
  }
  openPlusPanel()
}

function toggleMenu(kind: MenuKind) {
  if (props.disabled) return
  const state = getMenuState(kind)
  const nextState = !state.value
  closePlusPanelIfNeeded(false)
  closeMenus()
  state.value = nextState
  if (!nextState) return
  nextTick(() => updateDropdownPosition(kind))
}

function closePlusPanelIfNeeded(refocus = true) {
  if (!isPlusPanelVisible.value && !isPlusPanelOpen.value) return
  clearPanelTimers()
  isPlusPanelOpen.value = false
  closeTimer = window.setTimeout(() => {
    isPlusPanelVisible.value = false
    closeTimer = null
    if (refocus) {
      focusEditor()
    }
  }, CLOSE_ANIMATION_MS)
}

function updateDropdownPosition(kind: MenuKind) {
  const { menuRef, triggerRef, placementRef, styleRef, width: menuWidth } = getMenuElements(kind)
  const trigger = triggerRef.value
  const container = menuRef.value
  if (!trigger || !container || typeof window === 'undefined') return

  const viewportPadding = 12
  const triggerRect = trigger.getBoundingClientRect()
  const toolbarRect = container.closest('.toolbar-mobile')?.getBoundingClientRect() ?? null
  const boundaryLeft = toolbarRect ? Math.max(viewportPadding, toolbarRect.left) : viewportPadding
  const boundaryRight = toolbarRect
    ? Math.min(window.innerWidth - viewportPadding, toolbarRect.right)
    : window.innerWidth - viewportPadding
  const availableRight = Math.max(0, boundaryRight - triggerRect.left)
  const availableLeft = Math.max(0, triggerRect.right - boundaryLeft)
  const width = Math.max(148, Math.min(menuWidth, Math.max(availableRight, availableLeft, 148)))
  const wouldOverflowToolbarRight = triggerRect.left + width > boundaryRight
  const alignRight = wouldOverflowToolbarRight && availableLeft >= width

  placementRef.value = { horizontal: alignRight ? 'right' : 'left', vertical: 'up' }
  styleRef.value = {
    width: `${Math.floor(width)}px`,
    maxWidth: `${Math.max(148, Math.floor(boundaryRight - boundaryLeft))}px`,
  }
}

function menuPlacementClass(placement: DropdownPlacement) {
  return { 'is-align-right': placement.horizontal === 'right', 'is-drop-up': placement.vertical === 'up' }
}

function onClickOutside(event: MouseEvent) {
  const targets = [listMenuRef.value, mediaMenuRef.value].filter(Boolean)
  if (!targets.length) return
  const eventTarget = event.target
  if (eventTarget instanceof Node && !targets.some((target) => target?.contains(eventTarget))) closeMenus()
}

function onViewportChange() {
  if (isListMenuOpen.value) updateDropdownPosition('list')
  if (isMediaMenuOpen.value) updateDropdownPosition('media')
  if (isPlusPanelVisible.value || isPlusPanelOpen.value) updatePanelPosition()
}

onMounted(() => {
  updatePanelPosition()
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  clearPanelTimers()
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <div
    ref="shellRef"
    class="toolbar-mobile-shell"
    :class="{ 'is-panel-visible': isPlusPanelVisible, 'is-panel-open': isPlusPanelOpen }"
  >
    <div
      class="toolbar-mobile__panel-wrap"
      :class="{ 'is-visible': isPlusPanelVisible, 'is-open': isPlusPanelOpen }"
      :style="panelWrapStyle"
    >
      <div class="toolbar-mobile__panel">
        <div class="toolbar-mobile__panel-grid">
          <button
            type="button"
            class="toolbar-mobile__panel-button"
            :class="buttonClass('blockquote')"
            :disabled="isDisabled('toggleBlockquote')"
            @click="runAndClosePanel('toggleBlockquote')"
          >
            <ToolbarIcon name="quote" />
            <span>引用</span>
          </button>

          <button
            type="button"
            class="toolbar-mobile__panel-button"
            :class="buttonClass('codeBlock')"
            :disabled="isDisabled('toggleCodeBlock')"
            @click="runAndClosePanel('toggleCodeBlock')"
          >
            <ToolbarIcon name="code-block" />
            <span>代码块</span>
          </button>

          <button
            type="button"
            class="toolbar-mobile__panel-button"
            :disabled="isDisabled('redo')"
            @click="runAndClosePanel('redo')"
          >
            <ToolbarIcon name="redo" />
            <span>重做</span>
          </button>

          <button type="button" class="toolbar-mobile__panel-button" @click="closePlusPanel()">
            <ToolbarIcon name="chevron-down" />
            <span>收起</span>
          </button>
        </div>

        <div class="toolbar-mobile__panel-divider"></div>

        <div class="toolbar-mobile__stats" :class="statsStatusClass">
          <span class="toolbar-mobile__stats-summary">
            <template v-if="stats.maxLength != null">
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.currentLength ?? 0) }}</span>
              <span>/</span>
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.maxLength) }}</span>
            </template>
            <template v-else>
              <span>字符数（含空格）</span>
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.totalCharacters) }}</span>
              <span class="toolbar-mobile__stats-dot">·</span>
              <span>中文字数</span>
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.chineseCharacters) }}</span>
              <span class="toolbar-mobile__stats-dot">·</span>
              <span>段落数</span>
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.paragraphCount) }}</span>
              <span class="toolbar-mobile__stats-dot">·</span>
              <span>行数</span>
              <span class="toolbar-mobile__stats-value">{{ formatCount(stats.lineCount) }}</span>
            </template>
          </span>
        </div>
      </div>
    </div>

    <div class="toolbar-mobile" role="toolbar" aria-label="Mobile editor toolbar">
      <button
        type="button"
        class="toolbar-mobile__button"
        :disabled="isDisabled('undo')"
        title="撤销"
        aria-label="撤销"
        @click="run('undo')"
      >
        <ToolbarIcon name="undo" />
      </button>

      <button
        type="button"
        class="toolbar-mobile__button"
        :disabled="disabled"
        title="分割线"
        aria-label="分割线"
        @click="emit('insertHorizontalRule')"
      >
        <ToolbarIcon name="horizontal-rule" />
      </button>

      <div ref="listMenuRef" class="toolbar-mobile__dropdown" :class="{ 'is-open': isListMenuOpen }">
        <button
          ref="listTriggerRef"
          type="button"
          class="toolbar-mobile__button toolbar-mobile__dropdown-trigger"
          :class="{ 'is-active': isListMenuOpen || isListMenuActive }"
          :disabled="disabled"
          :title="currentListLabel"
          :aria-label="currentListLabel"
          @click="toggleMenu('list')"
        >
          <ToolbarIcon :name="currentListIcon" />
          <ToolbarIcon name="chevron-down" />
        </button>

        <div
          v-if="isListMenuOpen"
          class="toolbar-mobile__dropdown-menu toolbar-mobile__option-list"
          :class="menuPlacementClass(listDropdownPlacement)"
          :style="listDropdownMenuStyle"
        >
          <button
            v-for="option in listOptions"
            :key="option.label"
            type="button"
            class="toolbar-mobile__option-button toolbar-mobile__option-button--icon"
            :class="buttonClass(option.active)"
            :disabled="isDisabled(option.command)"
            @click="selectList(option)"
          >
            <ToolbarIcon :name="option.icon" />
            <span class="toolbar-mobile__option-label">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <div ref="mediaMenuRef" class="toolbar-mobile__dropdown" :class="{ 'is-open': isMediaMenuOpen }">
        <button
          ref="mediaTriggerRef"
          type="button"
          class="toolbar-mobile__button toolbar-mobile__dropdown-trigger"
          :disabled="disabled"
          title="插入媒体"
          aria-label="插入媒体"
          @click="toggleMenu('media')"
        >
          <ToolbarIcon name="media" />
          <ToolbarIcon name="chevron-down" />
        </button>

        <div
          v-if="isMediaMenuOpen"
          class="toolbar-mobile__dropdown-menu toolbar-mobile__option-list"
          :class="menuPlacementClass(mediaDropdownPlacement)"
          :style="mediaDropdownMenuStyle"
        >
          <button
            v-for="option in mediaOptions"
            :key="option.label"
            type="button"
            class="toolbar-mobile__option-button toolbar-mobile__option-button--icon"
            :disabled="disabled"
            @click="selectMedia(option)"
          >
            <ToolbarIcon :name="option.icon" />
            <span class="toolbar-mobile__option-label">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <div ref="plusMenuRef" class="toolbar-mobile__dropdown">
        <button
          ref="plusTriggerRef"
          type="button"
          class="toolbar-mobile__button toolbar-mobile__dropdown-trigger toolbar-mobile__button--plus"
          :disabled="disabled"
          title="更多"
          aria-label="更多"
          @click="togglePlusPanel"
        >
          <ToolbarIcon name="plus" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar-mobile-shell {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.toolbar-mobile__panel-wrap {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 4;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  box-sizing: border-box;
  transform: translateX(-50%);
  transition:
    opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1),
    visibility 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.toolbar-mobile__panel-wrap.is-visible {
  visibility: visible;
  pointer-events: auto;
}

.toolbar-mobile__panel-wrap.is-open {
  opacity: 1;
}

.toolbar-mobile {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  min-height: calc(48px + env(safe-area-inset-bottom, 0px));
  padding: 4px 10px calc(4px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(220, 223, 230, 0.8);
  border-radius: 0 0 12px 12px;
  background: rgba(255, 255, 255, 0.98);
}

.toolbar-mobile :deep(.toolbar-icon) {
  width: 20px;
  height: 20px;
}

.toolbar-mobile__button {
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #3f3f46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.toolbar-mobile__button.is-active,
.toolbar-mobile__option-button.is-active,
.toolbar-mobile__panel-button.is-active,
.toolbar-mobile__button:active,
.toolbar-mobile__option-button:active,
.toolbar-mobile__panel-button:active {
  border-color: rgba(59, 130, 246, 0.18);
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.toolbar-mobile__button:disabled,
.toolbar-mobile__panel-button:disabled,
.toolbar-mobile__option-button:disabled {
  opacity: 0.45;
}

.toolbar-mobile__dropdown {
  position: relative;
}

.toolbar-mobile__dropdown-trigger {
  width: 100%;
  min-width: 0;
  padding: 0 4px;
}

.toolbar-mobile__dropdown-trigger--text {
  gap: 2px;
  flex-wrap: nowrap;
}

.toolbar-mobile__trigger-text {
  min-width: 0;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.toolbar-mobile__dropdown-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  padding: 8px;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 3;
}

.toolbar-mobile__dropdown-menu.is-align-right {
  left: auto;
  right: 0;
}

.toolbar-mobile__option-list {
  padding: 6px;
}

.toolbar-mobile__option-button {
  width: 100%;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #3f3f46;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.toolbar-mobile__option-button--icon {
  justify-content: flex-start;
}

.toolbar-mobile__option-label {
  font-size: 13px;
  line-height: 1.4;
}

.toolbar-mobile__dropdown--plus {
  position: static;
}

.toolbar-mobile__button--plus.is-active,
.toolbar-mobile__button--plus:active {
  border-color: transparent;
  background: transparent;
  color: #3f3f46;
}

.toolbar-mobile__panel {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  border: 1px solid rgba(220, 223, 230, 0.9);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: #f7f7f7;
  box-shadow: none;
  transform: translateY(100%);
  opacity: 0;
  transition:
    transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1),
    opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.toolbar-mobile__panel-wrap.is-open .toolbar-mobile__panel {
  transform: translateY(0);
  opacity: 1;
}

.toolbar-mobile__panel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.toolbar-mobile__panel-divider {
  height: 1px;
  margin: 10px 4px;
  background: rgba(212, 215, 222, 0.9);
}

.toolbar-mobile__stats {
  display: flex;
  justify-content: center;
  padding: 2px 4px 0;
  color: #71717a;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.toolbar-mobile__stats.is-warning {
  color: #ea580c;
}

.toolbar-mobile__stats.is-danger {
  color: #ff4d4f;
}

.toolbar-mobile__stats-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  max-width: 100%;
  gap: 4px;
  white-space: nowrap;
}

.toolbar-mobile__stats-dot {
  color: #a1a1aa;
}

.toolbar-mobile__stats-value {
  color: #18181b;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.toolbar-mobile__panel-grid > * {
  min-width: 0;
}

.toolbar-mobile__panel-button {
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 6px 2px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
  color: #3f3f46;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
  line-height: 1.15;
  text-align: center;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.toolbar-mobile__panel-button :deep(.toolbar-icon) {
  flex: none;
  width: 18px;
  height: 18px;
}

.toolbar-mobile__panel-button span {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.toolbar-mobile__file {
  display: none;
}
</style>
