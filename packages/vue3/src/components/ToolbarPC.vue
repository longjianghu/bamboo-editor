<template>
  <div class="toolbar-pc" role="toolbar" aria-label="PC editor toolbar">
    <button
      v-for="item in items"
      :key="item.label"
      type="button"
      class="toolbar-pc__button"
      :class="buttonClass(item.active, item.attrs)"
      :disabled="isDisabled(item.command, item.attrs)"
      :title="item.label"
      :aria-label="item.label"
      @click="run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <label class="toolbar-pc__button toolbar-pc__upload" :class="{ 'is-disabled': disabled }" title="插入图片" aria-label="插入图片">
      <input class="toolbar-pc__file" type="file" accept="image/*" :disabled="disabled" @change="onFileChange">
      <ToolbarIcon name="image" />
    </label>

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
import type { Editor } from '@tiptap/vue-3'
import ToolbarIcon from './ToolbarIcon.vue'

const props = defineProps<{
  editor: Editor | null
  disabled?: boolean
  fullscreen?: boolean
}>()

const emit = defineEmits<{
  'image-select': [file: File]
  'toggle-fullscreen': []
}>()

const items = [
  { label: '标题 1', icon: 'heading1', command: 'toggleHeading', active: 'heading', attrs: { level: 1 } },
  { label: '标题 2', icon: 'heading2', command: 'toggleHeading', active: 'heading', attrs: { level: 2 } },
  { label: '标题 3', icon: 'heading3', command: 'toggleHeading', active: 'heading', attrs: { level: 3 } },
  { label: '加粗', icon: 'bold', command: 'toggleBold', active: 'bold' },
  { label: '斜体', icon: 'italic', command: 'toggleItalic', active: 'italic' },
  { label: '删除线', icon: 'strike', command: 'toggleStrike', active: 'strike' },
  { label: '行内代码', icon: 'code', command: 'toggleCode', active: 'code' },
  { label: '无序列表', icon: 'bullet-list', command: 'toggleBulletList', active: 'bulletList' },
  { label: '有序列表', icon: 'ordered-list', command: 'toggleOrderedList', active: 'orderedList' },
  { label: '引用', icon: 'quote', command: 'toggleBlockquote', active: 'blockquote' },
  { label: '代码块', icon: 'code-block', command: 'toggleCodeBlock', active: 'codeBlock' },
] as const

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

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('image-select', file)
  }
  input.value = ''
}
</script>

<style scoped>
.toolbar-pc {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 5px;
  background-color: #dcdfe63d;
  border-bottom: 1px solid #dcdfe63d;
}

:global(.bamboo-editor.is-fullscreen) .toolbar-pc {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 5px;
  border: 0;
  border-bottom: 1px solid #dcdfe63d;
  border-radius: 0;
  background: #dcdfe63d;
  box-shadow: none;
  overflow-x: auto;
}

.toolbar-pc__button {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #3f3f46;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
  flex: none;
}

.toolbar-pc__button:hover {
  border-color: #14b8a6;
  color: #0f766e;
  background: #f0fdfa;
}

.toolbar-pc__button.is-active {
  border-color: #14b8a6;
  background: #e6fffb;
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

.toolbar-pc__fullscreen {
  margin-left: 4px;
}

:global(.bamboo-editor.is-fullscreen) .toolbar-pc__fullscreen {
  margin-left: auto;
}

.toolbar-pc__file {
  display: none;
}
</style>
