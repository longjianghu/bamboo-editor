<template>
  <div class="toolbar-mobile" role="toolbar" aria-label="Mobile editor toolbar">
    <button
      v-for="item in items"
      :key="item.label"
      type="button"
      class="toolbar-mobile__button"
      :class="buttonClass(item.active, item.attrs)"
      :disabled="isDisabled(item.command, item.attrs)"
      :title="item.label"
      :aria-label="item.label"
      @click="run(item.command, item.attrs)"
    >
      <ToolbarIcon :name="item.icon" />
    </button>

    <label class="toolbar-mobile__button toolbar-mobile__upload" :class="{ 'is-disabled': disabled }" title="插入图片" aria-label="插入图片">
      <input class="toolbar-mobile__file" type="file" accept="image/*" :disabled="disabled" @change="onFileChange">
      <ToolbarIcon name="image" />
    </label>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import ToolbarIcon from './ToolbarIcon.vue'

const props = defineProps<{
  editor: Editor | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'image-select': [file: File]
}>()

const items = [
  { label: '加粗', icon: 'bold', command: 'toggleBold', active: 'bold' },
  { label: '斜体', icon: 'italic', command: 'toggleItalic', active: 'italic' },
  { label: '无序列表', icon: 'bullet-list', command: 'toggleBulletList', active: 'bulletList' },
  { label: '有序列表', icon: 'ordered-list', command: 'toggleOrderedList', active: 'orderedList' },
  { label: '引用', icon: 'quote', command: 'toggleBlockquote', active: 'blockquote' },
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
.toolbar-mobile {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin-top: -1px;
  padding: 8px 10px 10px;
  border: 0;
  border-top: 1px solid #dcdfe63d;
  border-radius: 0 0 12px 12px;
  background: #dcdfe63d;
  box-shadow: none;
  backdrop-filter: none;
}

.toolbar-mobile__button {
  min-height: 38px;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 9px;
  background: #fff;
  color: #3f3f46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.toolbar-mobile__button.is-active {
  border-color: #14b8a6;
  background: #e6fffb;
  color: #0f766e;
}

.toolbar-mobile__button:disabled,
.toolbar-mobile__upload.is-disabled {
  opacity: 0.45;
}

.toolbar-mobile__file {
  display: none;
}

.toolbar-mobile__upload {
  position: relative;
}
</style>
