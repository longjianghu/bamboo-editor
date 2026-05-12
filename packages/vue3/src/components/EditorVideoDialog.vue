<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ToolbarIcon from './ToolbarIcon.vue'

const props = defineProps<{
  visible: boolean
  device: Device
  mode: DialogMode
  initialData?: VideoDialogData
  uploadHandler?: (file: File) => Promise<{ src: string; width?: number; height?: number }>
}>()

const emit = defineEmits<{
  confirm: [data: VideoDialogData]
  remove: []
  cancel: []
}>()

declare const window: Window & typeof globalThis

type DialogMode = 'create' | 'edit'
type Device = 'pc' | 'mobile'

interface VideoDialogData {
  src: string
  poster?: string
  width?: number
  height?: number
  align?: 'left' | 'center' | 'right'
}

const OPEN_DELAY_MS = 16
const CLOSE_ANIMATION_MS = 220

const videoFileRef = ref<HTMLInputElement | null>(null)
const posterFileRef = ref<HTMLInputElement | null>(null)

const inputVideoUrl = ref('')
const inputPosterUrl = ref('')
const inputWidth = ref('')
const inputHeight = ref('')
const inputAlign = ref<'left' | 'center' | 'right'>('left')

const isUploadingVideo = ref(false)
const isUploadingPoster = ref(false)

const isRendered = ref(props.visible)
const isOpen = ref(false)

let openTimer: number | null = null
let closeTimer: number | null = null

const title = computed(() => (props.mode === 'edit' ? '编辑视频' : '插入视频'))
const confirmLabel = computed(() => (props.mode === 'edit' ? '保存' : '插入'))
const hasVideo = computed(() => !!inputVideoUrl.value.trim())
const isConfirmDisabled = computed(() => !hasVideo.value)

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
    videoFileRef.value?.parentElement?.querySelector('input')?.focus()
  })
}

function openDialog() {
  clearTimers()
  inputVideoUrl.value = props.initialData?.src ?? ''
  inputPosterUrl.value = props.initialData?.poster ?? ''
  inputWidth.value = props.initialData?.width?.toString() ?? ''
  inputHeight.value = props.initialData?.height?.toString() ?? ''
  inputAlign.value = (props.initialData as any)?.align ?? 'left'
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
  closeTimer = window.setTimeout(
    () => {
      isRendered.value = false
      closeTimer = null
    },
    props.device === 'mobile' ? CLOSE_ANIMATION_MS : 120,
  )
}

function handleConfirm() {
  const value = inputVideoUrl.value.trim()
  if (!value) {
    return
  }

  emit('confirm', {
    src: value,
    poster: inputPosterUrl.value.trim() || undefined,
    width: inputWidth.value ? Number(inputWidth.value) : undefined,
    height: inputHeight.value ? Number(inputHeight.value) : undefined,
    align: inputAlign.value,
  })
}

function triggerVideoUpload() {
  videoFileRef.value?.click()
}

function triggerPosterUpload() {
  posterFileRef.value?.click()
}

async function handleVideoFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  isUploadingVideo.value = true
  try {
    // Get video dimensions from local file
    const dimensions = await getVideoDimensions(file).catch(() => ({ width: 0, height: 0 }))

    if (dimensions.width > 0 && !inputWidth.value) {
      inputWidth.value = dimensions.width.toString()
    }
    if (dimensions.height > 0 && !inputHeight.value) {
      inputHeight.value = dimensions.height.toString()
    }

    if (props.uploadHandler) {
      const result = await props.uploadHandler(file)
      inputVideoUrl.value = result.src
    } else {
      // No upload handler, use local preview
      inputVideoUrl.value = await readAsDataUrl(file)
    }
  } catch (error) {
    console.warn('[EditorVideoDialog] video upload failed:', error)
  } finally {
    isUploadingVideo.value = false
    target.value = ''
  }
}

function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      })
      URL.revokeObjectURL(video.src)
      video.remove()
    }
    video.onerror = () => {
      reject(new Error('Failed to load video'))
      URL.revokeObjectURL(video.src)
      video.remove()
    }
    video.src = URL.createObjectURL(file)
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

async function handlePosterFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !props.uploadHandler) {
    return
  }

  isUploadingPoster.value = true
  try {
    const result = await props.uploadHandler(file)
    inputPosterUrl.value = result.src
  } catch (error) {
    console.warn('[EditorVideoDialog] poster upload failed:', error)
  } finally {
    isUploadingPoster.value = false
    target.value = ''
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      openDialog()
    } else {
      closeDialog()
    }
  },
)

watch(
  () => props.initialData,
  (value) => {
    if (props.visible && value) {
      inputVideoUrl.value = value.src ?? ''
      inputPosterUrl.value = value.poster ?? ''
      inputWidth.value = value.width?.toString() ?? ''
      inputHeight.value = value.height?.toString() ?? ''
      inputAlign.value = value.align ?? 'left'
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <div v-if="isRendered" class="editor-video-dialog" :class="[`editor-video-dialog--${device}`, { 'is-open': isOpen }]">
    <div class="editor-video-dialog__backdrop" @click="emit('cancel')"></div>

    <div class="editor-video-dialog__wrap">
      <form class="editor-video-dialog__panel" @submit.prevent>
        <div class="editor-video-dialog__header">
          <h3 class="editor-video-dialog__title">
            {{ title }}
          </h3>
          <button type="button" class="editor-video-dialog__close" title="关闭" @click="emit('cancel')">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
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

        <div class="editor-video-dialog__body">
          <div class="editor-video-dialog__field">
            <label class="editor-video-dialog__label">视频地址</label>
            <div class="editor-video-dialog__control">
              <div class="editor-video-dialog__input-group">
                <input
                  v-model="inputVideoUrl"
                  class="editor-video-dialog__input"
                  type="url"
                  placeholder="请输入视频地址"
                  autocomplete="off"
                  spellcheck="false"
                />
                <input
                  ref="videoFileRef"
                  type="file"
                  accept="video/*"
                  class="editor-video-dialog__file-input"
                  @change="handleVideoFileChange"
                />
                <button
                  type="button"
                  class="editor-video-dialog__upload-btn"
                  :disabled="isUploadingVideo"
                  @click="triggerVideoUpload"
                >
                  <template v-if="isUploadingVideo"> 上传中... </template>
                  <template v-else> 选择文件 </template>
                </button>
              </div>
            </div>
          </div>

          <div class="editor-video-dialog__field">
            <label class="editor-video-dialog__label">封面图片</label>
            <div class="editor-video-dialog__control">
              <div class="editor-video-dialog__input-group">
                <input
                  v-model="inputPosterUrl"
                  class="editor-video-dialog__input"
                  type="url"
                  placeholder="请输入封面图片地址"
                  autocomplete="off"
                  spellcheck="false"
                />
                <input
                  ref="posterFileRef"
                  type="file"
                  accept="image/*"
                  class="editor-video-dialog__file-input"
                  @change="handlePosterFileChange"
                />
                <button
                  type="button"
                  class="editor-video-dialog__upload-btn"
                  :disabled="isUploadingPoster"
                  @click="triggerPosterUpload"
                >
                  <template v-if="isUploadingPoster"> 上传中... </template>
                  <template v-else> 选择文件 </template>
                </button>
              </div>
            </div>
          </div>

          <div class="editor-video-dialog__field">
            <label class="editor-video-dialog__label">视频尺寸</label>
            <div class="editor-video-dialog__control">
              <div class="editor-video-dialog__size-group">
                <div class="editor-video-dialog__size-item">
                  <span class="editor-video-dialog__size-label">宽</span>
                  <input
                    v-model="inputWidth"
                    class="editor-video-dialog__input editor-video-dialog__input--small"
                    type="number"
                    placeholder="auto"
                    min="0"
                  />
                </div>
                <div class="editor-video-dialog__size-divider">×</div>
                <div class="editor-video-dialog__size-item">
                  <span class="editor-video-dialog__size-label">高</span>
                  <input
                    v-model="inputHeight"
                    class="editor-video-dialog__input editor-video-dialog__input--small"
                    type="number"
                    placeholder="auto"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="editor-video-dialog__field">
            <label class="editor-video-dialog__label">对齐方式</label>
            <div class="editor-video-dialog__control">
              <div class="editor-video-dialog__align-group">
                <button
                  type="button"
                  class="editor-video-dialog__align-button"
                  :class="{ 'is-active': inputAlign === 'left' }"
                  title="居左"
                  @click="inputAlign = 'left'"
                >
                  <ToolbarIcon name="align-left" />
                </button>
                <button
                  type="button"
                  class="editor-video-dialog__align-button"
                  :class="{ 'is-active': inputAlign === 'center' }"
                  title="居中"
                  @click="inputAlign = 'center'"
                >
                  <ToolbarIcon name="align-center" />
                </button>
                <button
                  type="button"
                  class="editor-video-dialog__align-button"
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

        <div class="editor-video-dialog__footer">
          <button
            v-if="mode === 'edit'"
            type="button"
            class="editor-video-dialog__button editor-video-dialog__button--danger"
            @click="emit('remove')"
          >
            移除视频
          </button>
          <button
            type="button"
            class="editor-video-dialog__button editor-video-dialog__button--primary"
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

<style scoped>
.editor-video-dialog {
  z-index: 18;
}

.editor-video-dialog--pc {
  position: fixed;
  inset: 0;
}

.editor-video-dialog--mobile {
  position: fixed;
  inset: 0;
}

.editor-video-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
}

.editor-video-dialog__wrap {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.editor-video-dialog--pc .editor-video-dialog__wrap {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.editor-video-dialog--mobile .editor-video-dialog__wrap {
  align-items: flex-end;
  justify-content: center;
}

.editor-video-dialog__panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 480px);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #e4e7ec;
  background: #fff;
  color: #18181b;
}

.editor-video-dialog--pc .editor-video-dialog__panel {
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.editor-video-dialog--pc.is-open .editor-video-dialog__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.editor-video-dialog--mobile .editor-video-dialog__panel {
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

.editor-video-dialog--mobile.is-open .editor-video-dialog__panel {
  transform: translateY(0);
  opacity: 1;
}

.editor-video-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 10px;
}

.editor-video-dialog__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
}

.editor-video-dialog__close {
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
  transition:
    background 0.2s,
    color 0.2s;
}

.editor-video-dialog__close:hover {
  background: #f4f4f5;
  color: #71717a;
}

.editor-video-dialog__body {
  padding: 0 18px 18px;
}

.editor-video-dialog__field {
  display: flex;
  margin-bottom: 16px;
}

.editor-video-dialog__label {
  flex-shrink: 0;
  width: 80px;
  margin-bottom: 0;
  padding-top: 10px;
  color: #71717a;
  font-size: 14px;
}

.editor-video-dialog__control {
  flex: 1;
  min-width: 0;
}

.editor-video-dialog__field-row {
  display: flex;
  gap: 12px;
}

.editor-video-dialog__field--half {
  flex: 1;
}

.editor-video-dialog__field--third {
  width: calc(33.33% - 7px);
}

.editor-video-dialog__input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.editor-video-dialog__input {
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

.editor-video-dialog__input:focus {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14);
}

.editor-video-dialog__input::placeholder {
  color: #a1a1aa;
}

.editor-video-dialog__file-input {
  display: none;
}

.editor-video-dialog__upload-btn {
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

.editor-video-dialog__upload-btn:hover:not(:disabled) {
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-video-dialog__upload-btn:disabled {
  background: #f4f4f5;
  color: #a1a1aa;
}

.editor-video-dialog__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 18px 18px;
}

.editor-video-dialog__button {
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

.editor-video-dialog__button--primary {
  border-color: #14b8a6;
  background: #14b8a6;
  color: #fff;
}

.editor-video-dialog__button--primary:disabled {
  border-color: #d4d7de;
  background: #e4e4e7;
  color: #a1a1aa;
}

.editor-video-dialog__button--danger {
  color: #dc2626;
}

.editor-video-dialog__button--danger:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.editor-video-dialog--mobile .editor-video-dialog__header {
  padding-top: 14px;
}

.editor-video-dialog--mobile .editor-video-dialog__panel {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.editor-video-dialog--mobile .editor-video-dialog__footer {
  justify-content: stretch;
}

.editor-video-dialog--mobile .editor-video-dialog__button {
  flex: 1;
  min-width: 0;
}

.editor-video-dialog__align-group {
  display: flex;
  gap: 4px;
}

.editor-video-dialog__align-button {
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

.editor-video-dialog__align-button:hover {
  background: #f4f4f5;
  border-color: #d1d5db;
}

.editor-video-dialog__align-button.is-active {
  background: #f0fdfa;
  border-color: #14b8a6;
  color: #14b8a6;
}

.editor-video-dialog__size-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-video-dialog__size-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f4f5;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.editor-video-dialog__size-item:focus-within {
  border-color: #14b8a6;
  background: #fff;
}

.editor-video-dialog__size-label {
  font-size: 12px;
  color: #a1a1aa;
  user-select: none;
}

.editor-video-dialog__input--small {
  width: 80px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none !important;
}

.editor-video-dialog__size-divider {
  color: #d4d4d8;
  font-size: 14px;
  user-select: none;
}
</style>
