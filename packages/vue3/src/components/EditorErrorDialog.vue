<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  device: Device
  message: string
}>()

const emit = defineEmits<{
  close: []
}>()

declare const window: Window & typeof globalThis

type Device = 'pc' | 'mobile'

const OPEN_DELAY_MS = 16
const CLOSE_ANIMATION_MS = 220

const isRendered = ref(props.visible)
const isOpen = ref(false)

let openTimer: number | null = null
let closeTimer: number | null = null

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

function openDialog() {
  clearTimers()
  isRendered.value = true
  openTimer = window.setTimeout(() => {
    isOpen.value = true
    openTimer = null
  }, OPEN_DELAY_MS)
}

function closeDialog() {
  clearTimers()
  isOpen.value = false
  closeTimer = window.setTimeout(
    () => {
      isRendered.value = false
      closeTimer = null
    },
    props.device === 'mobile' ? CLOSE_ANIMATION_MS : 120,
  )
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

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <div v-if="isRendered" class="editor-error-dialog" :class="[`editor-error-dialog--${device}`, { 'is-open': isOpen }]">
    <div class="editor-error-dialog__backdrop" @click="emit('close')"></div>

    <div class="editor-error-dialog__wrap">
      <div
        class="editor-error-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-error-dialog-title"
      >
        <div class="editor-error-dialog__header">
          <h3 id="editor-error-dialog-title" class="editor-error-dialog__title">
            提示
          </h3>
          <button type="button" class="editor-error-dialog__close" aria-label="关闭" @click="emit('close')">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="editor-error-dialog__body">
          <div class="editor-error-dialog__icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <p class="editor-error-dialog__message">
            {{ message }}
          </p>
        </div>

        <div class="editor-error-dialog__footer">
          <button
            type="button"
            class="editor-error-dialog__button editor-error-dialog__button--primary"
            @click="emit('close')"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-error-dialog {
  z-index: 20;
}

.editor-error-dialog--pc {
  position: fixed;
  inset: 0;
}

.editor-error-dialog--mobile {
  position: fixed;
  inset: 0;
}

.editor-error-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
}

.editor-error-dialog__wrap {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.editor-error-dialog--pc .editor-error-dialog__wrap {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.editor-error-dialog--mobile .editor-error-dialog__wrap {
  align-items: flex-end;
  justify-content: center;
}

.editor-error-dialog__panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 320px);
  border: 1px solid #e4e7ec;
  background: #fff;
  color: #18181b;
}

.editor-error-dialog--pc .editor-error-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.editor-error-dialog--pc.is-open .editor-error-dialog__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.editor-error-dialog--mobile .editor-error-dialog__panel {
  width: 100%;
  max-width: none;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  box-shadow: none;
  transform: translateY(100%);
  opacity: 0;
  transition:
    transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1),
    opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.editor-error-dialog--mobile.is-open .editor-error-dialog__panel {
  transform: translateY(0);
  opacity: 1;
}

.editor-error-dialog__header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f4f4f5;
}

.editor-error-dialog__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  color: #0f172a;
}

.editor-error-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #71717a;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.editor-error-dialog__close:hover {
  background: #f4f4f5;
  color: #3f3f46;
}

.editor-error-dialog__close svg {
  width: 18px;
  height: 18px;
}

.editor-error-dialog__body {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.editor-error-dialog__icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: #ea580c;
}

.editor-error-dialog__icon svg {
  width: 100%;
  height: 100%;
}

.editor-error-dialog__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #3f3f46;
}

.editor-error-dialog__footer {
  padding: 0 20px 20px;
  display: flex;
  justify-content: center;
}

.editor-error-dialog__button {
  min-width: 100px;
  height: 40px;
  padding: 0 20px;
  border: 1px solid #d4d4d8;
  border-radius: 10px;
  background: #fff;
  color: #3f3f46;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.editor-error-dialog__button--primary {
  border-color: #14b8a6;
  background: #14b8a6;
  color: #fff;
}

.editor-error-dialog__button--primary:hover {
  background: #0d9488;
  border-color: #0d9488;
}
</style>
