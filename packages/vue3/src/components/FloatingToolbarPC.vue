<template>
  <div
    v-if="visible"
    ref="toolbarRef"
    class="floating-toolbar-pc"
    :style="toolbarStyle"
    role="toolbar"
    aria-label="Floating editor toolbar"
    @mousedown.prevent
  >
    <div class="floating-toolbar-pc__dropdown" :class="{ 'is-open': isHeadingMenuOpen }" ref="headingMenuRef">
      <button
        type="button"
        class="floating-toolbar-pc__button floating-toolbar-pc__dropdown-trigger floating-toolbar-pc__dropdown-trigger--text"
        :class="{ 'is-active': isHeadingMenuOpen || !isParagraphActive() }"
        :disabled="disabled"
        :title="currentHeadingLabel"
        :aria-label="currentHeadingLabel"
        @click="toggleMenu('heading')"
      >
        <span class="floating-toolbar-pc__trigger-text">{{ currentHeadingShortLabel }}</span>
        <ToolbarIcon name="chevron-down" />
      </button>

      <div v-if="isHeadingMenuOpen" class="floating-toolbar-pc__dropdown-menu floating-toolbar-pc__option-list" :class="headingMenuClass" :style="headingMenuStyle">
        <button
          v-for="option in headingOptions"
          :key="option.label"
          type="button"
          class="floating-toolbar-pc__option-button"
          :class="{ 'is-active': isHeadingOptionActive(option) }"
          :disabled="option.command ? isDisabled(option.command, option.attrs) : disabled"
          @click="selectHeading(option)"
        >
          <span class="floating-toolbar-pc__option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <button
      type="button"
      class="floating-toolbar-pc__button"
      :class="buttonClass('bold')"
      :disabled="isDisabled('toggleBold')"
      title="加粗"
      aria-label="加粗"
      @click="run('toggleBold')"
    >
      <ToolbarIcon name="bold" />
    </button>

    <div class="floating-toolbar-pc__dropdown" :class="{ 'is-open': isAlignMenuOpen }" ref="alignMenuRef">
      <button
        type="button"
        class="floating-toolbar-pc__button floating-toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': isAlignMenuOpen || !isTextAlignActive('left') }"
        :disabled="disabled"
        :title="currentAlignLabel"
        :aria-label="currentAlignLabel"
        @click="toggleMenu('align')"
      >
        <ToolbarIcon :name="currentAlignIcon" />
        <ToolbarIcon name="chevron-down" />
      </button>

      <div v-if="isAlignMenuOpen" class="floating-toolbar-pc__dropdown-menu floating-toolbar-pc__option-list" :class="alignMenuClass" :style="alignMenuStyle">
        <button
          v-for="option in alignOptions"
          :key="option.label"
          type="button"
          class="floating-toolbar-pc__option-button floating-toolbar-pc__option-button--icon"
          :class="{ 'is-active': isTextAlignActive(option.value) }"
          :disabled="disabled"
          @click="selectAlign(option.value)"
        >
          <ToolbarIcon :name="option.icon" />
          <span class="floating-toolbar-pc__option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div class="floating-toolbar-pc__dropdown" :class="{ 'is-open': isColorMenuOpen }" ref="colorMenuRef">
      <button
        type="button"
        class="floating-toolbar-pc__button floating-toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': !isColorCleared() || isColorMenuOpen }"
        :disabled="disabled"
        :title="currentColorLabel"
        :aria-label="currentColorLabel"
        @click="toggleMenu('color')"
      >
        <span class="floating-toolbar-pc__color-chip" :style="{ backgroundColor: currentColorValue }"></span>
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isColorMenuOpen"
        class="floating-toolbar-pc__dropdown-menu floating-toolbar-pc__dropdown-menu--palette"
        :class="colorMenuClass"
        :style="colorMenuStyle"
      >
        <div class="floating-toolbar-pc__palette-grid">
          <button
            type="button"
            class="floating-toolbar-pc__palette-swatch"
            :class="{ 'is-active': isColorCleared() }"
            title="默认颜色"
            aria-label="默认颜色"
            @click="selectTextColor(null)"
          >
            <span class="floating-toolbar-pc__palette-swatch-color" :style="{ backgroundColor: '#18181b' }"></span>
          </button>

          <button
            v-for="item in colorPalette"
            :key="item.token"
            type="button"
            class="floating-toolbar-pc__palette-swatch"
            :class="{ 'is-active': isTextColorActive(item.token) }"
            :title="item.label"
            :aria-label="item.label"
            @click="selectTextColor(item.token)"
          >
            <span class="floating-toolbar-pc__palette-swatch-color" :style="{ backgroundColor: item.value }"></span>
          </button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="floating-toolbar-pc__button"
      :class="buttonClass('link')"
      :disabled="disabled"
      title="链接"
      aria-label="链接"
      @click="onLinkClick"
    >
      <ToolbarIcon name="link" />
    </button>

    <button
      type="button"
      class="floating-toolbar-pc__button"
      :disabled="disabled"
      title="清除格式"
      aria-label="清除格式"
      @click="emit('clear-formatting')"
    >
      <ToolbarIcon name="clear-format" />
    </button>

    <button
      v-for="item in extraInlineStyleItems"
      :key="item.label"
      type="button"
      class="floating-toolbar-pc__button"
      :class="buttonClass(item.active)"
      :disabled="isDisabled(item.command)"
      :title="item.label"
      :aria-label="item.label"
      @click="run(item.command)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { NodeSelection, Editor } from '@tiptap/vue-3'
import type { BambooColorOption } from '../composables/useBambooEditor'
import ToolbarIcon from './ToolbarIcon.vue'

declare const window: Window & typeof globalThis

type FloatingPosition = {
  top: number
  left: number
  editorTop?: number
  editorBottom?: number
  editorLeft?: number
  editorRight?: number
}

type DropdownPlacement = {
  horizontal: 'left' | 'right'
  vertical: 'up' | 'down'
}

type ToolbarButtonItem = {
  label: string
  icon: 'bold' | 'italic' | 'strike' | 'code'
  command: 'toggleBold' | 'toggleItalic' | 'toggleStrike' | 'toggleCode'
  active: 'bold' | 'italic' | 'strike' | 'code'
}

type HeadingOption = {
  label: string
  shortLabel: string
  command: string
  attrs?: Record<string, unknown>
}

type AlignOption = {
  label: string
  value: 'left' | 'center' | 'right'
  icon: 'align-left' | 'align-center' | 'align-right'
}

type MenuKind = 'heading' | 'align' | 'color'

const props = defineProps<{
  editor: Editor | null
  disabled?: boolean
  visible: boolean
  position: FloatingPosition
  colorPalette?: readonly BambooColorOption[]
}>()

const emit = defineEmits<{
  'open-link-dialog': [payload?: { initialValue?: string, mode?: 'create' | 'edit', allowRemove?: boolean }]
  'text-color-select': [token: string | null]
  'clear-formatting': []
}>()

const headingOptions = [
  { label: '正文', shortLabel: '正文', command: 'setParagraph' },
  { label: '标题 1', shortLabel: 'H1', command: 'toggleHeading', attrs: { level: 1 } },
  { label: '标题 2', shortLabel: 'H2', command: 'toggleHeading', attrs: { level: 2 } },
  { label: '标题 3', shortLabel: 'H3', command: 'toggleHeading', attrs: { level: 3 } },
] as const satisfies readonly HeadingOption[]

const alignOptions = [
  { label: '左对齐', value: 'left', icon: 'align-left' },
  { label: '居中对齐', value: 'center', icon: 'align-center' },
  { label: '右对齐', value: 'right', icon: 'align-right' },
] as const satisfies readonly AlignOption[]

const extraInlineStyleItems = [
  { label: '斜体', icon: 'italic', command: 'toggleItalic', active: 'italic' },
  { label: '删除线', icon: 'strike', command: 'toggleStrike', active: 'strike' },
  { label: '行内代码', icon: 'code', command: 'toggleCode', active: 'code' },
] as const satisfies readonly ToolbarButtonItem[]

const headingMenuRef = ref<HTMLElement | null>(null)
const alignMenuRef = ref<HTMLElement | null>(null)
const colorMenuRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const isHeadingMenuOpen = ref(false)
const isAlignMenuOpen = ref(false)
const isColorMenuOpen = ref(false)
const headingMenuPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'up' })
const alignMenuPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'up' })
const colorMenuPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'up' })
const headingMenuStyle = ref<Record<string, string>>({})
const alignMenuStyle = ref<Record<string, string>>({})
const colorMenuStyle = ref<Record<string, string>>({})
const colorPalette = computed(() => props.colorPalette ?? [])
const activeColor = computed(() => colorPalette.value.find((item) => isTextColorActive(item.token)) ?? null)
const currentColorValue = computed(() => activeColor.value?.value ?? '#18181b')
const currentColorLabel = computed(() => activeColor.value ? `文字颜色：${activeColor.value.label}` : '文字颜色')
const currentHeadingOption = computed(() => {
  if (props.editor?.isActive('heading', { level: 1 })) {
    return headingOptions[1]
  }

  if (props.editor?.isActive('heading', { level: 2 })) {
    return headingOptions[2]
  }

  if (props.editor?.isActive('heading', { level: 3 })) {
    return headingOptions[3]
  }

  return headingOptions[0]
})
const currentHeadingLabel = computed(() => currentHeadingOption.value.label)
const currentHeadingShortLabel = computed(() => currentHeadingOption.value.shortLabel)
const currentAlignOption = computed(() => {
  if (isTextAlignActive('center')) {
    return alignOptions[1]
  }

  if (isTextAlignActive('right')) {
    return alignOptions[2]
  }

  return alignOptions[0]
})
const currentAlignLabel = computed(() => currentAlignOption.value.label)
const currentAlignIcon = computed(() => currentAlignOption.value.icon)
const headingMenuClass = computed(() => menuPlacementClass(headingMenuPlacement.value))
const alignMenuClass = computed(() => menuPlacementClass(alignMenuPlacement.value))
const colorMenuClass = computed(() => menuPlacementClass(colorMenuPlacement.value))
const toolbarStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
}))

function run(command: string, attrs?: Record<string, unknown>) {
  const chain = props.editor?.chain().focus()
  if (!chain) {
    return
  }

  const target = attrs ? (chain as any)[command](attrs) : (chain as any)[command]()
  target?.run?.()
}

function isDisabled(command: string, attrs?: Record<string, unknown>) {
  if (props.disabled) {
    return true
  }

  const chain = props.editor?.can().chain().focus()
  if (!chain) {
    return true
  }

  const target = attrs ? (chain as any)[command](attrs) : (chain as any)[command]()
  return !target?.run?.()
}

function buttonClass(name: string, attrs?: Record<string, unknown>) {
  const active = attrs ? props.editor?.isActive(name, attrs) : props.editor?.isActive(name)
  return { 'is-active': Boolean(active) }
}

function isParagraphActive() {
  return props.editor?.isActive('paragraph') ?? false
}

function isHeadingOptionActive(option: HeadingOption) {
  if (option.command === 'setParagraph') {
    return isParagraphActive()
  }

  return props.editor?.isActive('heading', option.attrs) ?? false
}

function selectHeading(option: HeadingOption) {
  if (props.disabled) {
    return
  }

  run(option.command, option.attrs)
  closeMenus()
}

function isImageSelected() {
  const selection = props.editor?.state.selection as NodeSelection | undefined
  return selection?.node?.type.name === 'image'
}

function setTextAlign(align: 'left' | 'center' | 'right') {
  if (props.disabled || !props.editor) {
    return
  }

  if (isImageSelected()) {
    props.editor
      .chain()
      .focus()
      .updateAttributes('image', { 'data-align': align === 'left' ? null : align })
      .run()
    return
  }

  const chain = props.editor.chain().focus()
  const target = align === 'left' ? chain.unsetTextAlign() : chain.setTextAlign(align)
  target.run()
}

function selectAlign(align: 'left' | 'center' | 'right') {
  setTextAlign(align)
  closeMenus()
}

function isTextAlignActive(align: 'left' | 'center' | 'right') {
  if (!props.editor) {
    return false
  }

  if (isImageSelected()) {
    const imageAlign = props.editor.getAttributes('image')['data-align']
    if (align === 'left') {
      return imageAlign !== 'center' && imageAlign !== 'right'
    }

    return imageAlign === align
  }

  if (align === 'left') {
    return !props.editor.isActive({ textAlign: 'center' }) && !props.editor.isActive({ textAlign: 'right' })
  }

  return props.editor.isActive({ textAlign: align })
}

function isTextColorActive(token: string) {
  return props.editor?.isActive('textColor', { 'data-color': token }) ?? false
}

function isColorCleared() {
  if (!props.editor) {
    return false
  }

  return !colorPalette.value.some((item) => isTextColorActive(item.token))
}

function selectTextColor(token: string | null) {
  emit('text-color-select', token)
  closeMenus()
}

function menuPlacementClass(placement: DropdownPlacement) {
  return {
    'is-down': placement.vertical === 'down',
  }
}

function updateMenuPosition(kind: MenuKind) {
  const menuRef = getMenuRef(kind)
  const triggerRef = getTriggerRef(kind)
  const menuStyle = getMenuStyle(kind)
  const menuPlacement = getMenuPlacement(kind)
  const toolbarElement = toolbarRef.value

  if (!menuRef || !triggerRef || !toolbarElement) {
    return
  }

  const editorTop = props.position.editorTop ?? Number.NEGATIVE_INFINITY
  const editorBottom = props.position.editorBottom ?? Number.POSITIVE_INFINITY
  const editorLeft = props.position.editorLeft ?? Number.NEGATIVE_INFINITY
  const editorRight = props.position.editorRight ?? Number.POSITIVE_INFINITY
  const gap = 8

  const toolbarRect = toolbarElement.getBoundingClientRect()
  const triggerRect = triggerRef.getBoundingClientRect()
  const menuRect = menuRef.getBoundingClientRect()
  const dropdownRect = triggerRef.parentElement?.getBoundingClientRect() ?? triggerRect

  const spaceAbove = toolbarRect.top - editorTop
  const spaceBelow = editorBottom - toolbarRect.bottom
  const openDown = spaceAbove < menuRect.height + gap && spaceBelow > spaceAbove

  const preferredLeft = 0
  const minLeft = editorLeft - dropdownRect.left
  const maxLeft = editorRight - dropdownRect.left - menuRect.width
  const nextLeft = clamp(preferredLeft, minLeft, maxLeft)

  menuPlacement.value = {
    horizontal: 'left',
    vertical: openDown ? 'down' : 'up',
  }
  menuStyle.value = {
    left: `${nextLeft}px`,
  }
}

function getMenuRef(kind: MenuKind) {
  if (kind === 'heading') {
    return headingMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-menu') as HTMLElement | null
  }

  if (kind === 'align') {
    return alignMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-menu') as HTMLElement | null
  }

  return colorMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-menu') as HTMLElement | null
}

function getTriggerRef(kind: MenuKind) {
  if (kind === 'heading') {
    return headingMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-trigger') as HTMLElement | null
  }

  if (kind === 'align') {
    return alignMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-trigger') as HTMLElement | null
  }

  return colorMenuRef.value?.querySelector('.floating-toolbar-pc__dropdown-trigger') as HTMLElement | null
}

function getMenuStyle(kind: MenuKind) {
  if (kind === 'heading') {
    return headingMenuStyle
  }

  if (kind === 'align') {
    return alignMenuStyle
  }

  return colorMenuStyle
}

function getMenuPlacement(kind: MenuKind) {
  if (kind === 'heading') {
    return headingMenuPlacement
  }

  if (kind === 'align') {
    return alignMenuPlacement
  }

  return colorMenuPlacement
}

function onLinkClick() {
  if (props.disabled) {
    return
  }

  closeMenus()

  if (props.editor?.isActive('link')) {
    emit('open-link-dialog', {
      initialValue: props.editor.getAttributes('link').href ?? '',
      mode: 'edit',
      allowRemove: true,
    })
    return
  }

  emit('open-link-dialog', {
    mode: 'create',
    initialValue: '',
    allowRemove: false,
  })
}

function getMenuState(kind: MenuKind) {
  if (kind === 'heading') {
    return isHeadingMenuOpen
  }

  if (kind === 'align') {
    return isAlignMenuOpen
  }

  return isColorMenuOpen
}

function closeMenus() {
  isHeadingMenuOpen.value = false
  isAlignMenuOpen.value = false
  isColorMenuOpen.value = false
}

function toggleMenu(kind: MenuKind) {
  if (props.disabled) {
    return
  }

  const state = getMenuState(kind)
  const nextState = !state.value
  closeMenus()
  state.value = nextState

  if (nextState) {
    window.requestAnimationFrame(() => updateMenuPosition(kind))
  }
}

function onClickOutside(event: MouseEvent) {
  const targets = [headingMenuRef.value, alignMenuRef.value, colorMenuRef.value].filter(Boolean)
  if (!targets.length) {
    return
  }

  if (event.target instanceof Node && !targets.some((target) => target?.contains(event.target))) {
    closeMenus()
  }
}

function onWindowChange() {
  if (isHeadingMenuOpen.value) {
    updateMenuPosition('heading')
  }

  if (isAlignMenuOpen.value) {
    updateMenuPosition('align')
  }

  if (isColorMenuOpen.value) {
    updateMenuPosition('color')
  }
}

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return value
  }

  return Math.min(Math.max(value, min), max)
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})
</script>

<style scoped>
.floating-toolbar-pc {
  position: fixed;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(8px);
  transform: translate(-50%, -100%);
}

.floating-toolbar-pc__button {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #3f3f46;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  transition: all 0.18s ease;
  flex: none;
}

.floating-toolbar-pc__button:hover {
  border-color: #bfe9e3;
  color: #0f766e;
  background: #f0fdfa;
}

.floating-toolbar-pc__button.is-active {
  border-color: #99f6e4;
  background: #ccfbf1;
  color: #0f766e;
}

.floating-toolbar-pc__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.floating-toolbar-pc__dropdown {
  position: relative;
}

.floating-toolbar-pc__dropdown-trigger {
  width: auto;
  min-width: 42px;
  padding: 0 7px;
}

.floating-toolbar-pc__dropdown-trigger--text {
  gap: 2px;
}

.floating-toolbar-pc__trigger-text {
  min-width: 0;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.floating-toolbar-pc__dropdown-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  padding: 8px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  z-index: 1;
}

.floating-toolbar-pc__dropdown-menu.is-down {
  top: calc(100% + 8px);
  bottom: auto;
}

.floating-toolbar-pc__dropdown-menu--palette {
  width: max-content;
  min-width: 168px;
}

.floating-toolbar-pc__option-list {
  min-width: 148px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.floating-toolbar-pc__option-button {
  width: 100%;
  min-height: 36px;
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

.floating-toolbar-pc__option-button.is-active,
.floating-toolbar-pc__option-button:active {
  border-color: rgba(20, 184, 166, 0.2);
  background: #e6fffb;
  color: #0f766e;
}

.floating-toolbar-pc__option-label {
  font-size: 13px;
  line-height: 1.4;
}

.floating-toolbar-pc__palette-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.floating-toolbar-pc__palette-swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.floating-toolbar-pc__palette-swatch:hover {
  border-color: #14b8a6;
  background: #f0fdfa;
  transform: translateY(-1px);
}

.floating-toolbar-pc__palette-swatch.is-active {
  border-color: #14b8a6;
  background: #e6fffb;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.2);
}

.floating-toolbar-pc__palette-swatch-color {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.floating-toolbar-pc__color-chip {
  width: 16px;
  height: 10px;
  border-radius: 4px;
  border: 1px solid rgba(15, 23, 42, 0.08);
}
</style>
