<template>
  <div
    v-if="isRendered"
    class="editor-url-dialog"
    :class="[
      `editor-url-dialog--${device}`,
      { 'is-open': isOpen },
    ]"
  >
    <div class="editor-url-dialog__backdrop" @click="emit('cancel')"></div>

    <div class="editor-url-dialog__wrap">
      <form class="editor-url-dialog__panel" @submit.prevent="handleConfirm">
        <div class="editor-url-dialog__header">
          <h3 class="editor-url-dialog__title">{{ title }}</h3>
        </div>

        <div class="editor-url-dialog__body">
          <input
            ref="inputRef"
            v-model="inputValue"
            class="editor-url-dialog__input"
            type="url"
            :placeholder="placeholder"
            autocomplete="off"
            spellcheck="false"
          >
        </div>

        <div class="editor-url-dialog__footer">
          <button type="button" class="editor-url-dialog__button" @click="emit('cancel')">
            取消
          </button>
          <button
            v-if="allowRemove"
            type="button"
            class="editor-url-dialog__button editor-url-dialog__button--danger"
            @click="emit('remove')"
          >
            移除链接
          </button>
          <button
            type="submit"
            class="editor-url-dialog__button editor-url-dialog__button--primary"
            :disabled="isConfirmDisabled"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

declare const window: Window & typeof globalThis

type DialogType = 'link' | 'remote-image'
type DialogMode = 'create' | 'edit'
type Device = 'pc' | 'mobile'

const OPEN_DELAY_MS = 16
const CLOSE_ANIMATION_MS = 220

const props = defineProps<{
  visible: boolean
  device: Device
  type: DialogType
  mode: DialogMode
  initialValue?: string
  allowRemove?: boolean
}>()

const emit = defineEmits<{
  confirm: [url: string]
  remove: []
  cancel: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')
const isRendered = ref(props.visible)
const isOpen = ref(false)

let openTimer: number | null = null
let closeTimer: number | null = null

const title = computed(() => {
  if (props.type === 'remote-image') {
    return '插入远程图片'
  }

  return props.mode === 'edit' ? '编辑链接' : '添加链接'
})

const placeholder = computed(() => props.type === 'remote-image' ? '请输入远程图片地址' : '请输入链接地址')
const confirmLabel = computed(() => props.type === 'remote-image' ? '插入图片' : '确定')
const isConfirmDisabled = computed(() => !inputValue.value.trim())

function clearTimers() {
  if (openTimer !== null) {
    window.clearTimeout(openTimer)
    openTimer = null
  }

  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
}

function focusInput() {
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function openDialog() {
  clearTimers()
  inputValue.value = props.initialValue?.trim() ?? ''
  isRendered.value = true
  openTimer = window.setTimeout(() => {
    isOpen.value = true
    openTimer = null
    focusInput()
  }, OPEN_DELAY_MS)
}

function closeDialog() {
  clearTimers()
  isOpen.value = false
  closeTimer = window.setTimeout(() => {
    isRendered.value = false
    closeTimer = null
  }, props.device === 'mobile' ? CLOSE_ANIMATION_MS : 120)
}

function handleConfirm() {
  const value = inputValue.value.trim()
  if (!value) {
    return
  }

  emit('confirm', value)
}

watch(
  () => props.visible,
  (value) => {
    if (value) {
      openDialog()
      return
    }

    closeDialog()
  },
  { immediate: true },
)

watch(
  () => props.initialValue,
  (value) => {
    if (!props.visible) {
      return
    }

    inputValue.value = value?.trim() ?? ''
    focusInput()
  },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<style scoped>
.editor-url-dialog {
  z-index: 18;
}

.editor-url-dialog--pc {
  position: fixed;
  inset: 0;
}

.editor-url-dialog--mobile {
  position: fixed;
  inset: 0;
}

.editor-url-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
}

.editor-url-dialog__wrap {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.editor-url-dialog--pc .editor-url-dialog__wrap {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.editor-url-dialog--mobile .editor-url-dialog__wrap {
  align-items: flex-end;
  justify-content: center;
}

.editor-url-dialog__panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 420px);
  border: 1px solid #e4e7ec;
  background: #fff;
  color: #18181b;
}

.editor-url-dialog--pc .editor-url-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease;
}

.editor-url-dialog--pc.is-open .editor-url-dialog__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.editor-url-dialog--mobile .editor-url-dialog__panel {
  width: 100%;
  max-width: none;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  box-shadow: none;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.editor-url-dialog--mobile.is-open .editor-url-dialog__panel {
  transform: translateY(0);
  opacity: 1;
}

.editor-url-dialog__header {
  padding: 18px 18px 10px;
}

.editor-url-dialog__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
}

.editor-url-dialog__body {
  padding: 0 18px 18px;
}

.editor-url-dialog__input {
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  padding: 0 14px;
  border: 1px solid #d4d7de;
  border-radius: 12px;
  outline: none;
  color: #18181b;
  font-size: 14px;
  line-height: 1.4;
}

.editor-url-dialog__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
}

.editor-url-dialog__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 18px 18px;
}

.editor-url-dialog__button {
  min-width: 84px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  background: #fff;
  color: #3f3f46;
  font-size: 14px;
  line-height: 1;
}

.editor-url-dialog__button--primary {
  border-color: #14b8a6;
  background: #14b8a6;
  color: #fff;
}

.editor-url-dialog__button--primary:disabled {
  border-color: #d4d7de;
  background: #e4e4e7;
  color: #a1a1aa;
}

.editor-url-dialog__button--danger {
  color: #dc2626;
}

.editor-url-dialog--mobile .editor-url-dialog__header {
  padding-top: 14px;
}

.editor-url-dialog--mobile .editor-url-dialog__panel {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.editor-url-dialog--mobile .editor-url-dialog__footer {
  justify-content: stretch;
}

.editor-url-dialog--mobile .editor-url-dialog__button {
  flex: 1;
  min-width: 0;
}
</style>
