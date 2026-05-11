<template>
  <div
    v-if="isRendered"
    class="editor-image-dialog"
    :class="[
      `editor-image-dialog--${device}`,
      { 'is-open': isOpen },
    ]"
  >
    <div class="editor-image-dialog__backdrop" @click="emit('cancel')"></div>

    <div class="editor-image-dialog__wrap">
      <form class="editor-image-dialog__panel" @submit.prevent>
        <div class="editor-image-dialog__header">
          <h3 class="editor-image-dialog__title">{{ title }}</h3>
          <button
            type="button"
            class="editor-image-dialog__close"
            title="关闭"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="editor-image-dialog__body">
          <div class="editor-image-dialog__field">
            <label class="editor-image-dialog__label">图片地址</label>
            <div class="editor-image-dialog__control">
              <div class="editor-image-dialog__input-group">
                <input
                  v-model="inputImageUrl"
                  class="editor-image-dialog__input"
                  type="url"
                  placeholder="请输入图片地址"
                  autocomplete="off"
                  spellcheck="false"
                >
                <input
                  ref="imageFileRef"
                  type="file"
                  accept="image/*"
                  class="editor-image-dialog__file-input"
                  @change="handleImageFileChange"
                >
                <button
                  type="button"
                  class="editor-image-dialog__upload-btn"
                  :disabled="isUploading"
                  @click="triggerImageUpload"
                >
                  <template v-if="isUploading">上传中...</template>
                  <template v-else>选择文件</template>
                </button>
              </div>
            </div>
          </div>

          <div class="editor-image-dialog__field">
            <label class="editor-image-dialog__label">替代文字</label>
            <div class="editor-image-dialog__control">
              <input
                v-model="inputAlt"
                class="editor-image-dialog__input"
                type="text"
                placeholder="请输入图片描述（可选）"
                autocomplete="off"
                spellcheck="false"
              >
            </div>
          </div>

          <div class="editor-image-dialog__field">
            <label class="editor-image-dialog__label">图片尺寸</label>
            <div class="editor-image-dialog__control">
              <div class="editor-image-dialog__size-group">
                <div class="editor-image-dialog__size-item">
                  <span class="editor-image-dialog__size-label">宽</span>
                  <input
                    v-model="inputWidth"
                    class="editor-image-dialog__input editor-image-dialog__input--small"
                    type="number"
                    placeholder="auto"
                    min="0"
                  >
                </div>
                <div class="editor-image-dialog__size-divider">×</div>
                <div class="editor-image-dialog__size-item">
                  <span class="editor-image-dialog__size-label">高</span>
                  <input
                    v-model="inputHeight"
                    class="editor-image-dialog__input editor-image-dialog__input--small"
                    type="number"
                    placeholder="auto"
                    min="0"
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="editor-image-dialog__field">
            <label class="editor-image-dialog__label">对齐方式</label>
            <div class="editor-image-dialog__control">
              <div class="editor-image-dialog__align-group">
                <button
                  type="button"
                  class="editor-image-dialog__align-button"
                  :class="{ 'is-active': inputAlign === 'left' }"
                  title="居左"
                  @click="inputAlign = 'left'"
                >
                  <ToolbarIcon name="align-left" />
                </button>
                <button
                  type="button"
                  class="editor-image-dialog__align-button"
                  :class="{ 'is-active': inputAlign === 'center' }"
                  title="居中"
                  @click="inputAlign = 'center'"
                >
                  <ToolbarIcon name="align-center" />
                </button>
                <button
                  type="button"
                  class="editor-image-dialog__align-button"
                  :class="{ 'is-active': inputAlign === 'right' }"
                  title="居右"
                  @click="inputAlign = 'right'"
                >
                  <ToolbarIcon name="align-right" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-image-dialog__footer">
          <button
            v-if="mode === 'edit'"
            type="button"
            class="editor-image-dialog__button editor-image-dialog__button--danger"
            @click="emit('remove')"
          >
            移除图片
          </button>
          <button
            type="button"
            class="editor-image-dialog__button editor-image-dialog__button--primary"
            :disabled="isConfirmDisabled"
            @click="handleConfirm"
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
import ToolbarIcon from './ToolbarIcon.vue'

declare const window: Window & typeof globalThis

type DialogMode = 'create' | 'edit'
type Device = 'pc' | 'mobile'

interface ImageDialogData {
  src: string
  alt?: string
  width?: number
  height?: number
  align?: 'left' | 'center' | 'right'
}

const OPEN_DELAY_MS = 16
const CLOSE_ANIMATION_MS = 220

const props = defineProps<{
  visible: boolean
  device: Device
  mode: DialogMode
  initialData?: ImageDialogData
  uploadHandler?: (file: File) => Promise<{ src: string; width?: number; height?: number }>
}>()

const emit = defineEmits<{
  confirm: [data: ImageDialogData]
  remove: []
  cancel: []
}>()

const imageFileRef = ref<HTMLInputElement | null>(null)

const inputImageUrl = ref('')
const inputAlt = ref('')
const inputWidth = ref('')
const inputHeight = ref('')
const inputAlign = ref<'left' | 'center' | 'right'>('left')

const isUploading = ref(false)
const isRendered = ref(props.visible)
const isOpen = ref(false)

let openTimer: number | null = null
let closeTimer: number | null = null

const title = computed(() => props.mode === 'edit' ? '编辑图片' : '插入图片')
const confirmLabel = computed(() => props.mode === 'edit' ? '保存' : '插入')
const hasImage = computed(() => !!inputImageUrl.value.trim())
const isConfirmDisabled = computed(() => !hasImage.value)

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
    imageFileRef.value?.parentElement?.querySelector('input')?.focus()
  })
}

function openDialog() {
  clearTimers()
  inputImageUrl.value = props.initialData?.src ?? ''
  inputAlt.value = props.initialData?.alt ?? ''
  inputWidth.value = props.initialData?.width?.toString() ?? ''
  inputHeight.value = props.initialData?.height?.toString() ?? ''
  inputAlign.value = props.initialData?.align ?? 'left'
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
  const value = inputImageUrl.value.trim()
  if (!value) {
    return
  }

  emit('confirm', {
    src: value,
    alt: inputAlt.value.trim() || undefined,
    width: inputWidth.value ? Number(inputWidth.value) : undefined,
    height: inputHeight.value ? Number(inputHeight.value) : undefined,
    align: inputAlign.value,
  })
}

function triggerImageUpload() {
  imageFileRef.value?.click()
}

async function handleImageFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  isUploading.value = true
  try {
    // Get dimensions from local file first
    const dimensions = await getImageDimensionsFromFile(file).catch(() => ({ width: 0, height: 0 }))
    
    if (dimensions.width > 0) {
      inputWidth.value = dimensions.width.toString()
    }
    if (dimensions.height > 0) {
      inputHeight.value = dimensions.height.toString()
    }

    if (props.uploadHandler) {
      const result = await props.uploadHandler(file)
      inputImageUrl.value = result.src
      // If handler provides dimensions, they take precedence
      if (result.width != null) {
        inputWidth.value = result.width.toString()
      }
      if (result.height != null) {
        inputHeight.value = result.height.toString()
      }
    } else {
      // No upload handler, use local preview
      inputImageUrl.value = await readAsDataUrl(file)
    }
  } catch (error) {
    console.warn('[EditorImageDialog] image upload failed:', error)
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ 
        width: img.naturalWidth || img.width, 
        height: img.naturalHeight || img.height 
      })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

watch(() => props.visible, (val) => {
  if (val) {
    openDialog()
  } else {
    closeDialog()
  }
})

watch(() => props.initialData, (value) => {
  if (props.visible && value) {
    inputImageUrl.value = value.src ?? ''
    inputAlt.value = value.alt ?? ''
    inputWidth.value = value.width?.toString() ?? ''
    inputHeight.value = value.height?.toString() ?? ''
    inputAlign.value = value.align ?? 'left'
  }
}, { deep: true })

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<style scoped>
.editor-image-dialog {
  z-index: 18;
}

.editor-image-dialog--pc {
  position: fixed;
  inset: 0;
}

.editor-image-dialog--mobile {
  position: fixed;
  inset: 0;
}

.editor-image-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
}

.editor-image-dialog__wrap {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.editor-image-dialog--pc .editor-image-dialog__wrap {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.editor-image-dialog--mobile .editor-image-dialog__wrap {
  align-items: flex-end;
  justify-content: center;
}

.editor-image-dialog__panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 480px);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #e4e7ec;
  background: #fff;
  color: #18181b;
}

.editor-image-dialog--pc .editor-image-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease;
}

.editor-image-dialog--pc.is-open .editor-image-dialog__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.editor-image-dialog--mobile .editor-image-dialog__panel {
  width: 100%;
  max-width: none;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  box-shadow: none;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1), opacity 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.editor-image-dialog--mobile.is-open .editor-image-dialog__panel {
  transform: translateY(0);
  opacity: 1;
}

.editor-image-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 10px;
}

.editor-image-dialog__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
}

.editor-image-dialog__close {
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

.editor-image-dialog__close:hover {
  background: #f4f4f5;
  color: #71717a;
}

.editor-image-dialog__body {
  padding: 0 18px 18px;
}

.editor-image-dialog__field {
  display: flex;
  margin-bottom: 16px;
}

.editor-image-dialog__label {
  flex-shrink: 0;
  width: 80px;
  margin-bottom: 0;
  padding-top: 10px;
  color: #71717a;
  font-size: 14px;
}

.editor-image-dialog__control {
  flex: 1;
  min-width: 0;
}

.editor-image-dialog__input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.editor-image-dialog__input {
  flex: 1;
  height: 40px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  outline: none;
  color: #18181b;
  font-size: 14px;
  line-height: 1.4;
}

.editor-image-dialog__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
}

.editor-image-dialog__input::placeholder {
  color: #a1a1aa;
}

.editor-image-dialog__file-input {
  display: none;
}

.editor-image-dialog__upload-btn {
  flex-shrink: 0;
  min-width: 64px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d4d7de;
  border-radius: 10px;
  background: #fff;
  color: #52525b;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
}

.editor-image-dialog__upload-btn:hover:not(:disabled) {
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-image-dialog__upload-btn:disabled {
  background: #f4f4f5;
  color: #a1a1aa;
}

.editor-image-dialog__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 18px 18px;
}

.editor-image-dialog__button {
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

.editor-image-dialog__button--primary {
  border-color: #14b8a6;
  background: #14b8a6;
  color: #fff;
}

.editor-image-dialog__button--primary:disabled {
  border-color: #d4d7de;
  background: #e4e4e7;
  color: #a1a1aa;
}

.editor-image-dialog__button--danger {
  color: #dc2626;
}

.editor-image-dialog__button--danger:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.editor-image-dialog--mobile .editor-image-dialog__header {
  padding-top: 14px;
}

.editor-image-dialog--mobile .editor-image-dialog__panel {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.editor-image-dialog--mobile .editor-image-dialog__footer {
  justify-content: stretch;
}

.editor-image-dialog--mobile .editor-image-dialog__button {
  flex: 1;
  min-width: 0;
}

.editor-image-dialog__align-group {
  display: flex;
  gap: 4px;
}

.editor-image-dialog__align-button {
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

.editor-image-dialog__align-button:hover {
  background: #f4f4f5;
  border-color: #d1d5db;
}

.editor-image-dialog__align-button.is-active {
  background: #f0fdfa;
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-image-dialog__size-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-image-dialog__size-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f4f5;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.editor-image-dialog__size-item:focus-within {
  border-color: #14b8a6;
  background: #fff;
}

.editor-image-dialog__size-label {
  font-size: 12px;
  color: #a1a1aa;
  user-select: none;
}

.editor-image-dialog__input--small {
  width: 80px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none !important;
}

.editor-image-dialog__size-divider {
  color: #d4d4d8;
  font-size: 14px;
  user-select: none;
}
</style>
