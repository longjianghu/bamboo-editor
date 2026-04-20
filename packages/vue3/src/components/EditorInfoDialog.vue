<template>
  <div
    v-if="isRendered"
    class="editor-info-dialog"
    :class="[
      `editor-info-dialog--${device}`,
      { 'is-open': isOpen },
    ]"
  >
    <div class="editor-info-dialog__backdrop" @click="emit('close')"></div>

    <div class="editor-info-dialog__wrap">
      <div class="editor-info-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="editor-info-dialog-title">
        <div class="editor-info-dialog__header">
          <h3 id="editor-info-dialog-title" class="editor-info-dialog__title">关于</h3>
          <button type="button" class="editor-info-dialog__close" aria-label="关闭" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="editor-info-dialog__body">
          <div class="editor-info-dialog__logo">
            <div class="editor-info-dialog__logo-icon">
              🎋
            </div>
            <div class="editor-info-dialog__name">Bamboo Editor</div>
          </div>
          
          <div class="editor-info-dialog__version">v{{ pkg ? pkg.version : "0.1.3" }}</div>
          
          <div class="editor-info-dialog__desc">
            一款轻量级、响应式、基于 Vue 3 和 Tiptap 开发的富文本编辑器。
          </div>
          
          <div class="editor-info-dialog__links">
            <a href="https://github.com/longjianghu/bamboo-editor" target="_blank" rel="noopener noreferrer" class="editor-info-dialog__link">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" width="16" height="16">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub 仓库
            </a>
          </div>
        </div>

        <div class="editor-info-dialog__footer">
          <button type="button" class="editor-info-dialog__btn" @click="emit('close')">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import pkg from '../../package.json'

declare const window: Window & typeof globalThis

type Device = 'pc' | 'mobile'

const OPEN_DELAY_MS = 16
const CLOSE_ANIMATION_MS = 220

const props = defineProps<{
  visible: boolean
  device: Device
}>()

const emit = defineEmits<{
  close: []
}>()

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
  closeTimer = window.setTimeout(() => {
    isRendered.value = false
    closeTimer = null
  }, props.device === 'mobile' ? CLOSE_ANIMATION_MS : 120)
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

<style scoped>
.editor-info-dialog {
  z-index: 18;
}

.editor-info-dialog--pc {
  position: fixed;
  inset: 0;
}

.editor-info-dialog--mobile {
  position: fixed;
  inset: 0;
}

.editor-info-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
}

.editor-info-dialog__wrap {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.editor-info-dialog--pc .editor-info-dialog__wrap {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.editor-info-dialog--mobile .editor-info-dialog__wrap {
  align-items: flex-end;
  justify-content: center;
}

.editor-info-dialog__panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 360px);
  border: 1px solid #e4e7ec;
  background: #fff;
  color: #18181b;
}

.editor-info-dialog--pc .editor-info-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease;
}

.editor-info-dialog--pc.is-open .editor-info-dialog__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.editor-info-dialog--mobile .editor-info-dialog__panel {
  width: 100%;
  max-width: none;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  box-shadow: none;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.editor-info-dialog--mobile.is-open .editor-info-dialog__panel {
  transform: translateY(0);
  opacity: 1;
}

.editor-info-dialog__header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f4f4f5;
}

.editor-info-dialog__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  color: #0f172a;
}

.editor-info-dialog__close {
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

.editor-info-dialog__close:hover {
  background: #f4f4f5;
  color: #3f3f46;
}

.editor-info-dialog__close svg {
  width: 18px;
  height: 18px;
}

.editor-info-dialog__body {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.editor-info-dialog__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.editor-info-dialog__logo-icon {
  font-size: 32px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.editor-info-dialog__name {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.editor-info-dialog__version {
  font-size: 13px;
  color: #71717a;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.editor-info-dialog__desc {
  font-size: 14px;
  color: #52525b;
  line-height: 1.6;
  margin-bottom: 24px;
}

.editor-info-dialog__links {
  display: flex;
  gap: 12px;
  width: 100%;
}

.editor-info-dialog__link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  color: #3f3f46;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  background: #fafafa;
  transition: all 0.2s ease;
}

.editor-info-dialog__link:hover {
  background: #f4f4f5;
  border-color: #d4d4d8;
  color: #18181b;
}

.editor-info-dialog__footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #f4f4f5;
  border-radius: 0 0 18px 18px;
}

.editor-info-dialog__btn {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #14b8a6;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.editor-info-dialog__btn:hover {
  background: #0d9488;
}

.editor-info-dialog--mobile .editor-info-dialog__footer {
  border-radius: 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
</style>
