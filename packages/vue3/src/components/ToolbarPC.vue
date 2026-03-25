<template>
  <div class="toolbar-pc" role="toolbar" aria-label="PC editor toolbar">
    <button
      v-for="item in historyItems"
      :key="item.label"
      type="button"
      class="toolbar-pc__button"
      :disabled="item.command ? isDisabled(item.command, item.attrs) : disabled"
      :title="item.label"
      :aria-label="item.label"
      @click="item.action ? handleAction(item.action) : run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <div class="toolbar-pc__dropdown" :class="{ 'is-open': isHeadingMenuOpen }" ref="headingMenuRef">
      <button
        type="button"
        class="toolbar-pc__button toolbar-pc__dropdown-trigger toolbar-pc__dropdown-trigger--text"
        :class="{ 'is-active': isHeadingMenuOpen || !isParagraphActive() }"
        :disabled="disabled"
        :title="currentHeadingLabel"
        :aria-label="currentHeadingLabel"
        ref="headingTriggerRef"
        @click="toggleMenu('heading')"
      >
        <span class="toolbar-pc__trigger-text">{{ currentHeadingShortLabel }}</span>
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isHeadingMenuOpen"
        class="toolbar-pc__dropdown-menu toolbar-pc__option-list"
        :class="menuPlacementClass(headingDropdownPlacement)"
        :style="headingDropdownMenuStyle"
      >
        <button
          v-for="option in headingOptions"
          :key="option.label"
          type="button"
          class="toolbar-pc__option-button"
          :class="{ 'is-active': isHeadingOptionActive(option) }"
          :disabled="option.command ? isDisabled(option.command, option.attrs) : disabled"
          @click="selectHeading(option)"
        >
          <span class="toolbar-pc__option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <button
      v-for="item in inlineStyleItems"
      :key="item.label"
      type="button"
      class="toolbar-pc__button"
      :class="item.active ? buttonClass(item.active, item.attrs) : undefined"
      :disabled="item.command ? isDisabled(item.command, item.attrs) : disabled"
      :title="item.label"
      :aria-label="item.label"
      @click="item.action ? handleAction(item.action) : run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <div class="toolbar-pc__dropdown" :class="{ 'is-open': isColorMenuOpen }" ref="colorMenuRef">
      <button
        type="button"
        class="toolbar-pc__button toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': !isColorCleared() || isColorMenuOpen }"
        :disabled="disabled"
        :title="currentColorLabel"
        :aria-label="currentColorLabel"
        ref="colorTriggerRef"
        @click="toggleMenu('color')"
      >
        <span class="toolbar-pc__color-chip" :style="{ backgroundColor: currentColorValue }"></span>
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isColorMenuOpen"
        class="toolbar-pc__dropdown-menu"
        :class="menuPlacementClass(colorDropdownPlacement)"
        :style="colorDropdownMenuStyle"
      >
        <div class="toolbar-pc__palette-grid">
          <button
            type="button"
            class="toolbar-pc__palette-swatch"
            :class="{ 'is-active': isColorCleared() }"
            title="默认颜色"
            aria-label="默认颜色"
            @click="selectTextColor(null)"
          >
            <span class="toolbar-pc__palette-swatch-color" :style="{ backgroundColor: '#18181b' }"></span>
          </button>

          <button
            v-for="item in colorPalette"
            :key="item.token"
            type="button"
            class="toolbar-pc__palette-swatch"
            :class="{ 'is-active': isTextColorActive(item.token) }"
            :title="item.label"
            :aria-label="item.label"
            @click="selectTextColor(item.token)"
          >
            <span class="toolbar-pc__palette-swatch-color" :style="{ backgroundColor: item.value }"></span>
          </button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="toolbar-pc__button"
      :class="buttonClass('link')"
      :disabled="disabled"
      title="链接"
      aria-label="链接"
      @click="onLinkClick"
    >
      <ToolbarIcon name="link" />
    </button>

    <div class="toolbar-pc__dropdown" :class="{ 'is-open': isListMenuOpen }" ref="listMenuRef">
      <button
        type="button"
        class="toolbar-pc__button toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': isListMenuOpen || isListMenuActive }"
        :disabled="disabled"
        :title="currentListLabel"
        :aria-label="currentListLabel"
        ref="listTriggerRef"
        @click="toggleMenu('list')"
      >
        <ToolbarIcon :name="currentListIcon" />
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isListMenuOpen"
        class="toolbar-pc__dropdown-menu toolbar-pc__option-list"
        :class="menuPlacementClass(listDropdownPlacement)"
        :style="listDropdownMenuStyle"
      >
        <button
          v-for="option in listOptions"
          :key="option.label"
          type="button"
          class="toolbar-pc__option-button toolbar-pc__option-button--icon"
          :class="buttonClass(option.active)"
          :disabled="isDisabled(option.command)"
          @click="selectList(option)"
        >
          <ToolbarIcon :name="option.icon" />
          <span class="toolbar-pc__option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <button
      v-for="item in blockItems"
      :key="item.label"
      type="button"
      class="toolbar-pc__button"
      :class="item.active ? buttonClass(item.active, item.attrs) : undefined"
      :disabled="item.command ? isDisabled(item.command, item.attrs) : disabled"
      :title="item.label"
      :aria-label="item.label"
      @click="item.action ? handleAction(item.action) : run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <button
      v-for="item in insertItems"
      :key="item.label"
      type="button"
      class="toolbar-pc__button"
      :class="item.active ? buttonClass(item.active, item.attrs) : undefined"
      :disabled="item.command ? isDisabled(item.command, item.attrs) : disabled"
      :title="item.label"
      :aria-label="item.label"
      @click="item.action ? handleAction(item.action) : run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <div class="toolbar-pc__dropdown" :class="{ 'is-open': isImageMenuOpen }" ref="imageMenuRef">
      <button
        type="button"
        class="toolbar-pc__button toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': isImageMenuOpen }"
        :disabled="disabled"
        title="图片"
        aria-label="图片"
        ref="imageTriggerRef"
        @click="toggleMenu('image')"
      >
        <ToolbarIcon name="remote-image" />
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isImageMenuOpen"
        class="toolbar-pc__dropdown-menu toolbar-pc__option-list"
        :class="menuPlacementClass(imageDropdownPlacement)"
        :style="imageDropdownMenuStyle"
      >
        <button
          type="button"
          class="toolbar-pc__option-button toolbar-pc__option-button--icon"
          :disabled="disabled"
          @click="onImageTriggerClick"
        >
          <ToolbarIcon name="image" />
          <span class="toolbar-pc__option-label">上传图片</span>
        </button>

        <button
          type="button"
          class="toolbar-pc__option-button toolbar-pc__option-button--icon"
          :disabled="disabled"
          @click="onRemoteImageClick"
        >
          <ToolbarIcon name="remote-image" />
          <span class="toolbar-pc__option-label">远程图片</span>
        </button>
      </div>
    </div>

    <div class="toolbar-pc__dropdown" :class="{ 'is-open': isAlignMenuOpen }" ref="alignMenuRef">
      <button
        type="button"
        class="toolbar-pc__button toolbar-pc__dropdown-trigger"
        :class="{ 'is-active': isAlignMenuOpen || !isTextAlignActive('left') }"
        :disabled="disabled"
        :title="currentAlignLabel"
        :aria-label="currentAlignLabel"
        ref="alignTriggerRef"
        @click="toggleMenu('align')"
      >
        <ToolbarIcon :name="currentAlignIcon" />
        <ToolbarIcon name="chevron-down" />
      </button>

      <div
        v-if="isAlignMenuOpen"
        class="toolbar-pc__dropdown-menu toolbar-pc__option-list"
        :class="menuPlacementClass(alignDropdownPlacement)"
        :style="alignDropdownMenuStyle"
      >
        <button
          v-for="option in alignOptions"
          :key="option.label"
          type="button"
          class="toolbar-pc__option-button toolbar-pc__option-button--icon"
          :class="{ 'is-active': isTextAlignActive(option.value) }"
          :disabled="disabled"
          @click="selectAlign(option.value)"
        >
          <ToolbarIcon :name="option.icon" />
          <span class="toolbar-pc__option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <input ref="imageFileInputRef" class="toolbar-pc__file" type="file" accept="image/*" :disabled="disabled" @change="onFileChange">

    <button
      type="button"
      class="toolbar-pc__button toolbar-pc__fullscreen"
      :class="{ 'is-active': fullscreen }"
      :title="fullscreen ? '退出全屏' : '全屏编辑'"
      :aria-label="fullscreen ? '退出全屏' : '全屏编辑'"
      :disabled="disabled"
      @click="emit('toggle-fullscreen')"
    >
      <ToolbarIcon :name="fullscreen ? 'fullscreen-exit' : 'fullscreen-enter'" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { NodeSelection, Editor } from '@tiptap/vue-3'
import type { BambooColorOption } from '../composables/useBambooEditor'
import ToolbarIcon from './ToolbarIcon.vue'

declare const window: Window & typeof globalThis

type ToolbarCommand = string

type ToolbarAction = 'clearFormatting' | 'insertHorizontalRule'

type ToolbarButtonItem = {
  label: string
  icon: any
  command?: ToolbarCommand
  active?: string
  attrs?: Record<string, unknown>
  action?: ToolbarAction
}

type HeadingOption = {
  label: string
  shortLabel: string
  command: ToolbarCommand
  attrs?: Record<string, unknown>
}

type AlignOption = {
  label: string
  value: 'left' | 'center' | 'right'
  icon: 'align-left' | 'align-center' | 'align-right'
}

type ListOption = {
  label: string
  command: 'toggleBulletList' | 'toggleOrderedList'
  active: 'bulletList' | 'orderedList'
  icon: 'bullet-list' | 'ordered-list'
}

type DropdownPlacement = {
  horizontal: 'left' | 'right'
  vertical: 'down' | 'up'
}

type MenuKind = 'heading' | 'align' | 'color' | 'image' | 'list'

const props = defineProps<{
  editor: Editor | null
  disabled?: boolean
  fullscreen?: boolean
  colorPalette?: readonly BambooColorOption[]
}>()

const emit = defineEmits<{
  'image-select': [file: File]
  'link-select': [url: string | null]
  'remote-image-select': [url: string]
  'text-color-select': [token: string | null]
  'undo': []
  'redo': []
  'clear-formatting': []
  'insert-horizontal-rule': []
  'toggle-fullscreen': []
}>()

const historyItems = [
  { label: '撤销', icon: 'undo', command: 'undo' },
  { label: '重做', icon: 'redo', command: 'redo' },
  { label: '清除格式', icon: 'clear-format', action: 'clearFormatting' },
] as const satisfies readonly ToolbarButtonItem[]

const inlineStyleItems = [
  { label: '加粗', icon: 'bold', command: 'toggleBold', active: 'bold' },
  { label: '斜体', icon: 'italic', command: 'toggleItalic', active: 'italic' },
  { label: '删除线', icon: 'strike', command: 'toggleStrike', active: 'strike' },
  { label: '行内代码', icon: 'code', command: 'toggleCode', active: 'code' },
] as const satisfies readonly ToolbarButtonItem[]

const blockItems = [
  { label: '引用', icon: 'quote', command: 'toggleBlockquote', active: 'blockquote' },
  { label: '代码块', icon: 'code-block', command: 'toggleCodeBlock', active: 'codeBlock' },
] as const satisfies readonly ToolbarButtonItem[]

const insertItems = [
  { label: '分割线', icon: 'horizontal-rule', action: 'insertHorizontalRule' },
] as const satisfies readonly ToolbarButtonItem[]

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

const listOptions = [
  { label: '无序列表', command: 'toggleBulletList', active: 'bulletList', icon: 'bullet-list' },
  { label: '有序列表', command: 'toggleOrderedList', active: 'orderedList', icon: 'ordered-list' },
] as const satisfies readonly ListOption[]

const colorPalette = props.colorPalette ?? []

const isHeadingMenuOpen = ref(false)
const isAlignMenuOpen = ref(false)
const isColorMenuOpen = ref(false)
const isImageMenuOpen = ref(false)
const isListMenuOpen = ref(false)

const headingMenuRef = ref<HTMLElement | null>(null)
const headingTriggerRef = ref<HTMLElement | null>(null)
const alignMenuRef = ref<HTMLElement | null>(null)
const alignTriggerRef = ref<HTMLElement | null>(null)
const colorMenuRef = ref<HTMLElement | null>(null)
const colorTriggerRef = ref<HTMLElement | null>(null)
const imageMenuRef = ref<HTMLElement | null>(null)
const imageTriggerRef = ref<HTMLElement | null>(null)
const imageFileInputRef = ref<HTMLInputElement | null>(null)
const listMenuRef = ref<HTMLElement | null>(null)
const listTriggerRef = ref<HTMLElement | null>(null)

const headingDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'down' })
const alignDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'down' })
const colorDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'down' })
const imageDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'down' })
const listDropdownPlacement = ref<DropdownPlacement>({ horizontal: 'left', vertical: 'down' })

const headingDropdownMenuStyle = ref<Record<string, string>>({})
const alignDropdownMenuStyle = ref<Record<string, string>>({})
const colorDropdownMenuStyle = ref<Record<string, string>>({})
const imageDropdownMenuStyle = ref<Record<string, string>>({})
const listDropdownMenuStyle = ref<Record<string, string>>({})

const activeColor = computed(() => colorPalette.find((item) => isTextColorActive(item.token)) ?? null)
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

const currentListOption = computed(() => {
  if (props.editor?.isActive('orderedList')) {
    return listOptions[1]
  }

  if (props.editor?.isActive('bulletList')) {
    return listOptions[0]
  }

  return listOptions[0]
})

const currentListLabel = computed(() => currentListOption.value.label)
const currentListIcon = computed(() => currentListOption.value.icon)
const isListMenuActive = computed(() => Boolean(props.editor?.isActive(currentListOption.value.active)))

function run(command: string, attrs?: Record<string, unknown>) {
  const chain = props.editor?.chain().focus()
  if (!chain) {
    return
  }

  const target = attrs ? (chain as any)[command](attrs) : (chain as any)[command]()
  target?.run?.()
}

function handleAction(action: ToolbarAction) {
  if (props.disabled) {
    return
  }

  closeMenus()

  if (action === 'clearFormatting') {
    emit('clear-formatting')
    return
  }

  emit('insert-horizontal-rule')
}

function isImageSelected() {
  const selection = props.editor?.state.selection as NodeSelection | undefined
  return selection?.node?.type.name === 'image'
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

function askUrl(message: string, initialValue = '') {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.prompt(message, initialValue)
  if (value == null) {
    return null
  }

  return value.trim()
}

function onLinkClick() {
  if (props.disabled) {
    return
  }

  closeMenus()

  if (props.editor?.isActive('link')) {
    const shouldKeep = askUrl('请输入链接地址，留空可取消当前链接', props.editor.getAttributes('link').href ?? '')
    if (shouldKeep === null) {
      return
    }

    emit('link-select', shouldKeep || null)
    return
  }

  const url = askUrl('请输入链接地址')
  if (!url) {
    return
  }

  emit('link-select', url)
}

function onRemoteImageClick() {
  if (props.disabled) {
    return
  }

  closeMenus()

  const url = askUrl('请输入远程图片地址')
  if (!url) {
    return
  }

  emit('remote-image-select', url)
}

function onImageTriggerClick() {
  if (props.disabled) {
    return
  }

  closeMenus()
  nextTick(() => imageFileInputRef.value?.click())
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

function selectList(option: ListOption) {
  run(option.command)
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

  return !colorPalette.some((item) => isTextColorActive(item.token))
}

function getMenuState(kind: MenuKind) {
  if (kind === 'heading') {
    return isHeadingMenuOpen
  }

  if (kind === 'align') {
    return isAlignMenuOpen
  }

  if (kind === 'image') {
    return isImageMenuOpen
  }

  if (kind === 'list') {
    return isListMenuOpen
  }

  return isColorMenuOpen
}

function getMenuElements(kind: MenuKind) {
  if (kind === 'heading') {
    return {
      menuRef: headingMenuRef,
      triggerRef: headingTriggerRef,
      placementRef: headingDropdownPlacement,
      styleRef: headingDropdownMenuStyle,
      width: 168,
    }
  }

  if (kind === 'align') {
    return {
      menuRef: alignMenuRef,
      triggerRef: alignTriggerRef,
      placementRef: alignDropdownPlacement,
      styleRef: alignDropdownMenuStyle,
      width: 160,
    }
  }

  if (kind === 'image') {
    return {
      menuRef: imageMenuRef,
      triggerRef: imageTriggerRef,
      placementRef: imageDropdownPlacement,
      styleRef: imageDropdownMenuStyle,
      width: 176,
    }
  }

  if (kind === 'list') {
    return {
      menuRef: listMenuRef,
      triggerRef: listTriggerRef,
      placementRef: listDropdownPlacement,
      styleRef: listDropdownMenuStyle,
      width: 160,
    }
  }

  return {
    menuRef: colorMenuRef,
    triggerRef: colorTriggerRef,
    placementRef: colorDropdownPlacement,
    styleRef: colorDropdownMenuStyle,
    width: Math.min(240, Math.max(168, 4 * 28 + 3 * 8 + 16)),
  }
}

function closeMenus() {
  isHeadingMenuOpen.value = false
  isAlignMenuOpen.value = false
  isColorMenuOpen.value = false
  isImageMenuOpen.value = false
  isListMenuOpen.value = false
}

function toggleMenu(kind: MenuKind) {
  if (props.disabled) {
    return
  }

  const state = getMenuState(kind)
  const nextState = !state.value
  closeMenus()
  state.value = nextState

  if (!nextState) {
    return
  }

  nextTick(() => updateDropdownPosition(kind))
}

function selectTextColor(token: string | null) {
  emit('text-color-select', token)
  closeMenus()
}

function updateDropdownPosition(kind: MenuKind) {
  const { menuRef, triggerRef, placementRef, styleRef, width: menuWidth } = getMenuElements(kind)
  const trigger = triggerRef.value
  const container = menuRef.value
  if (!trigger || !container || typeof window === 'undefined') {
    return
  }

  const viewportPadding = 12
  const triggerRect = trigger.getBoundingClientRect()
  const toolbarRect = container.closest('.toolbar-pc')?.getBoundingClientRect() ?? null
  const boundaryLeft = toolbarRect ? Math.max(viewportPadding, toolbarRect.left) : viewportPadding
  const boundaryRight = toolbarRect ? Math.min(window.innerWidth - viewportPadding, toolbarRect.right) : window.innerWidth - viewportPadding
  const availableRight = Math.max(0, boundaryRight - triggerRect.left)
  const availableLeft = Math.max(0, triggerRect.right - boundaryLeft)
  const width = Math.max(148, Math.min(menuWidth, Math.max(availableRight, availableLeft, 148)))
  const wouldOverflowToolbarRight = triggerRect.left + width > boundaryRight
  const alignRight = wouldOverflowToolbarRight && availableLeft >= width
  const dropUp = window.innerHeight - triggerRect.bottom < 220 && triggerRect.top > window.innerHeight / 2

  placementRef.value = {
    horizontal: alignRight ? 'right' : 'left',
    vertical: dropUp ? 'up' : 'down',
  }
  styleRef.value = {
    width: `${Math.floor(width)}px`,
    maxWidth: `${Math.max(148, Math.floor(boundaryRight - boundaryLeft))}px`,
  }
}

function menuPlacementClass(placement: DropdownPlacement) {
  return {
    'is-align-right': placement.horizontal === 'right',
    'is-drop-up': placement.vertical === 'up',
  }
}

function onClickOutside(event: MouseEvent) {
  const targets = [headingMenuRef.value, alignMenuRef.value, colorMenuRef.value, imageMenuRef.value, listMenuRef.value].filter(Boolean)
  if (!targets.length) {
    return
  }

  if (event.target instanceof Node && !targets.some((target) => target?.contains(event.target))) {
    closeMenus()
  }
}

function onViewportChange() {
  if (isHeadingMenuOpen.value) {
    updateDropdownPosition('heading')
  }

  if (isAlignMenuOpen.value) {
    updateDropdownPosition('align')
  }

  if (isColorMenuOpen.value) {
    updateDropdownPosition('color')
  }

  if (isImageMenuOpen.value) {
    updateDropdownPosition('image')
  }

  if (isListMenuOpen.value) {
    updateDropdownPosition('list')
  }
}

function onFileChange(event: Event) {
  closeMenus()

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('image-select', file)
  }
  input.value = ''
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.toolbar-pc {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 16px;
  padding: 8px;
  background: #f7f8fa;
  border-bottom: 1px solid #e4e7ec;
}

:global(.bamboo-editor.is-fullscreen) .toolbar-pc {
  position: sticky;
  top: 0;
  z-index: 2;
  flex-wrap: wrap;
  align-items: flex-start;
  min-height: 50px;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid #e4e7ec;
  border-radius: 0;
  background: rgba(247, 248, 250, 0.96);
  backdrop-filter: blur(8px);
  box-shadow: none;
}

.toolbar-pc__button {
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

.toolbar-pc__button:hover {
  border-color: #bfe9e3;
  color: #0f766e;
  background: #f0fdfa;
}

.toolbar-pc__button.is-active {
  border-color: #99f6e4;
  background: #ccfbf1;
  color: #0f766e;
}

.toolbar-pc__button:disabled,
.toolbar-pc__upload.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toolbar-pc__upload {
  position: relative;
}

.toolbar-pc__dropdown {
  position: relative;
}

.toolbar-pc__dropdown-trigger {
  width: auto;
  min-width: 42px;
  padding: 0 7px;
}

.toolbar-pc__dropdown-trigger--text {
  min-width: 58px;
}

.toolbar-pc__trigger-text {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.toolbar-pc__dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  padding: 8px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.toolbar-pc__dropdown-menu.is-align-right {
  left: auto;
  right: 0;
}

.toolbar-pc__dropdown-menu.is-drop-up {
  top: auto;
  bottom: calc(100% + 8px);
}

.toolbar-pc__option-list {
  padding: 6px;
}

.toolbar-pc__option-button {
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #3f3f46;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.toolbar-pc__option-button:hover {
  background: #f8fafc;
  color: #0f766e;
}

.toolbar-pc__option-button.is-active {
  border-color: #99f6e4;
  background: #ccfbf1;
  color: #0f766e;
}

.toolbar-pc__option-button--icon {
  justify-content: flex-start;
}

.toolbar-pc__option-label {
  font-size: 13px;
  line-height: 1.4;
}

.toolbar-pc__palette-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.toolbar-pc__palette-swatch {
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

.toolbar-pc__palette-swatch:hover {
  border-color: #14b8a6;
  background: #f0fdfa;
  transform: translateY(-1px);
}

.toolbar-pc__palette-swatch.is-active {
  border-color: #14b8a6;
  background: #e6fffb;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.2);
}

.toolbar-pc__palette-swatch-color {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.toolbar-pc__color-chip {
  width: 16px;
  height: 10px;
  border-radius: 4px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  flex: none;
}

.toolbar-pc__fullscreen {
  margin-left: 4px;
  background: #fff;
  border-color: #e4e7ec;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

:global(.bamboo-editor.is-fullscreen) .toolbar-pc__fullscreen {
  margin-left: auto;
}

@media (max-width: 640px) {
  .toolbar-pc__dropdown-menu,
  .toolbar-pc__dropdown-menu.is-align-right {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .toolbar-pc__palette-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.toolbar-pc__file {
  display: none;
}
</style>
