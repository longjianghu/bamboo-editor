<template>
  <div
    v-if="isRendered"
    class="editor-audio-dialog"
    :class="[
      `editor-audio-dialog--${device}`,
      { 'is-open': isOpen },
    ]"
  >
    <div class="editor-audio-dialog__backdrop" @click="emit('cancel')"></div>

    <div class="editor-audio-dialog__wrap">
      <form class="editor-audio-dialog__panel" @submit.prevent>
        <div class="editor-audio-dialog__header">
          <h3 class="editor-audio-dialog__title">{{ title }}</h3>
          <button
            type="button"
            class="editor-audio-dialog__close"
            title="关闭"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="editor-audio-dialog__body">
          <div class="editor-audio-dialog__field">
            <label class="editor-audio-dialog__label">音频地址</label>
            <div class="editor-audio-dialog__control">
              <div class="editor-audio-dialog__input-group">
                <input
                  v-model="inputAudioUrl"
                  class="editor-audio-dialog__input"
                  type="url"
                  placeholder="请输入音频地址"
                  autocomplete="off"
                  spellcheck="false"
                >
                <input
                  ref="audioFileRef"
                  type="file"
                  accept="audio/*"
                  class="editor-audio-dialog__file-input"
                  @change="handleAudioFileChange"
                >
                <button
                  type="button"
                  class="editor-audio-dialog__upload-btn"
                  :disabled="isUploading"
                  @click="triggerAudioUpload"
                >
                  <template v-if="isUploading">上传中...</template>
                  <template v-else>选择文件</template>
                </button>
              </div>
            </div>
          </div>

          <div class="editor-audio-dialog__field">
            <label class="editor-audio-dialog__label">对齐方式</label>
            <div class="editor-audio-dialog__control">
              <div class="editor-audio-dialog__align-group">
                <button
                  v-for="option in alignOptions"
                  :key="option.value"
                  type="button"
                  class="editor-audio-dialog__align-btn"
                  :class="{ 'is-active': inputAlign === option.value }"
                  :title="option.label"
                  @click="inputAlign = option.value"
                >
                  <ToolbarIcon :name="`align-${option.value}`" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-audio-dialog__footer">
          <div></div>
          <div class="editor-audio-dialog__footer-right">
            <button
              v-if="mode === 'edit'"
              type="button"
              class="editor-audio-dialog__btn editor-audio-dialog__btn--danger"
              @click="emit('remove')"
            >
              删除音频
            </button>
            <button
              type="button"
              class="editor-audio-dialog__btn editor-audio-dialog__btn--confirm"
              :disabled="!isValid"
              @click="handleConfirm"
            >
              确定
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ToolbarIcon from './ToolbarIcon.vue'

const props = defineProps<{
  visible: boolean
  device: 'pc' | 'mobile'
  mode: 'create' | 'edit'
  initialData?: {
    src: string
    align?: 'left' | 'center' | 'right'
    'data-align'?: 'left' | 'center' | 'right'
  }
  uploadHandler?: (file: File) => Promise<{ src: string }>
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [data: { src: string; align?: 'left' | 'center' | 'right' }]
  remove: []
}>()

const OPEN_DELAY_MS = 10
const CLOSE_ANIMATION_MS = 200

const isRendered = ref(false)
const isOpen = ref(false)
const isUploading = ref(false)

const inputAudioUrl = ref('')
const inputAlign = ref<'left' | 'center' | 'right'>('left')
const audioFileRef = ref<HTMLInputElement | null>(null)

const alignOptions = [
  { label: '居左', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '居右', value: 'right' },
] as const

const title = computed(() => props.mode === 'edit' ? '编辑音频' : '插入音频')
const isValid = computed(() => {
  return inputAudioUrl.value.trim().length > 0
})

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
  
  if (props.mode === 'edit' && props.initialData) {
    inputAudioUrl.value = props.initialData.src || ''
    inputAlign.value = props.initialData['data-align'] || props.initialData.align || 'left'
  } else {
    inputAudioUrl.value = ''
    inputAlign.value = 'left'
  }

  nextTick(() => {
    openTimer = window.setTimeout(() => {
      isOpen.value = true
      openTimer = null
    }, OPEN_DELAY_MS)
  })
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
  if (!isValid.value) return
  emit('confirm', {
    src: inputAudioUrl.value.trim(),
    align: inputAlign.value,
  })
}

function triggerAudioUpload() {
  audioFileRef.value?.click()
}

async function handleAudioFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    if (props.uploadHandler) {
      const result = await props.uploadHandler(file)
      inputAudioUrl.value = result.src
    } else {
      // No upload handler, use local preview
      inputAudioUrl.value = URL.createObjectURL(file)
    }
  } catch (error) {
    console.warn('[EditorAudioDialog] audio upload failed:', error)
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    openDialog()
  } else {
    closeDialog()
  }
})
</script>

<style scoped>
.editor-audio-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.editor-audio-dialog--mobile {
  align-items: flex-end;
  padding: 0;
}

.editor-audio-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.editor-audio-dialog.is-open .editor-audio-dialog__backdrop {
  opacity: 1;
}

.editor-audio-dialog__wrap {
  position: relative;
  width: 100%;
  max-width: 480px;
  transform: scale(0.95);
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.editor-audio-dialog--mobile .editor-audio-dialog__wrap {
  max-width: none;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.editor-audio-dialog.is-open .editor-audio-dialog__wrap {
  transform: scale(1);
  opacity: 1;
}

.editor-audio-dialog--mobile.is-open .editor-audio-dialog__wrap {
  transform: translateY(0);
}

.editor-audio-dialog__panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.editor-audio-dialog--mobile .editor-audio-dialog__panel {
  border-radius: 20px 20px 0 0;
}

.editor-audio-dialog__header {
  padding: 18px 18px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-audio-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: #18181b;
  margin: 0;
}

.editor-audio-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -4px -4px 0 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.editor-audio-dialog__close:hover {
  background: #f4f4f5;
  color: #71717a;
}

.editor-audio-dialog__body {
  padding: 0 18px 18px;
  display: flex;
  flex-direction: column;
}

.editor-audio-dialog__field {
  display: flex;
  margin-bottom: 16px;
}

.editor-audio-dialog__label {
  flex-shrink: 0;
  width: 80px;
  padding-top: 10px;
  font-size: 14px;
  color: #71717a;
}

.editor-audio-dialog__control {
  flex: 1;
  min-width: 0;
}

.editor-audio-dialog__input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.editor-audio-dialog__input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  outline: none;
  color: #18181b;
  font-size: 14px;
  transition: all 0.2s ease;
}

.editor-audio-dialog__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
}

.editor-audio-dialog__file-input {
  display: none;
}

.editor-audio-dialog__upload-btn {
  flex-shrink: 0;
  min-width: 64px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  background: #fff;
  color: #52525b;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.editor-audio-dialog__upload-btn:hover:not(:disabled) {
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-audio-dialog__align-group {
  display: flex;
  gap: 4px;
}

.editor-audio-dialog__align-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
  color: #52525b;
  cursor: pointer;
  transition: all 0.2s;
}

.editor-audio-dialog__align-btn:hover {
  background: #f4f4f5;
  border-color: #d1d5db;
}

.editor-audio-dialog__align-btn.is-active {
  background: #f0fdfa;
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-audio-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px 18px;
}

.editor-audio-dialog__remove-btn {
  font-size: 14px;
  color: #ef4444;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 8px 0;
}

.editor-audio-dialog__footer-right {
  display: flex;
  gap: 10px;
}

.editor-audio-dialog__btn {
  min-width: 84px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  background: #fff;
  color: #3f3f46;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.editor-audio-dialog__btn--confirm {
  border-color: #14b8a6;
  background: #14b8a6;
  color: #fff;
}

.editor-audio-dialog__btn--confirm:hover:not(:disabled) {
  background: #0d9488;
  border-color: #0d9488;
}

.editor-audio-dialog__btn--confirm:disabled {
  border-color: #d4d7de;
  background: #e4e4e7;
  color: #a1a1aa;
  cursor: not-allowed;
}

.editor-audio-dialog__btn--danger {
  color: #dc2626;
}

.editor-audio-dialog__btn--danger:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.editor-audio-dialog--mobile .editor-audio-dialog__footer {
  padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
}
</style>
