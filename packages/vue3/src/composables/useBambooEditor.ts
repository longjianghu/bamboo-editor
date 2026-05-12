import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createBambooEditorOptions, MAX_LENGTH_FEEDBACK_EVENT, sanitizeHtml, type MaxLengthFeedbackDetail } from '@bamboo-editor/core'

export type BambooDevice = 'pc' | 'mobile' | 'auto'

// 视频配置类型
export interface CleanVideoOptions {
  accept?: string
  maxSize?: number // MB
}

// 音频配置类型
export interface CleanAudioOptions {
  accept?: string
  maxSize?: number // MB
}

export interface BambooColorOption {
  token: string
  label: string
  value: string
}

export interface UploadResult {
  src: string
  alt?: string
  width?: number
  height?: number
  poster?: string
}

export type UploadHandler = (file: File) => Promise<UploadResult>

export interface UseBambooEditorOptions {
  modelValue: MaybeRefOrGetter<string>
  device?: MaybeRefOrGetter<BambooDevice | undefined>
  placeholder?: MaybeRefOrGetter<string | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  uploadHandler?: MaybeRefOrGetter<UploadHandler | undefined>
  colorPalette?: MaybeRefOrGetter<readonly BambooColorOption[] | undefined>
  maxLength?: MaybeRefOrGetter<number | undefined>
  video?: MaybeRefOrGetter<CleanVideoOptions | undefined>
  audio?: MaybeRefOrGetter<CleanAudioOptions | undefined>
  containerWidth?: MaybeRefOrGetter<number | undefined>
  onUpdate?: (html: string) => void
  onUploadError?: (error: { type: 'size' | 'type'; message: string; file: File }) => void
}

export function useBambooEditor(options: UseBambooEditorOptions) {
  const editor = shallowRef<Editor | null>(null)
  const windowWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth)
  const maxLengthFeedback = ref<MaxLengthFeedbackDetail | null>(null)

  const resolvedDevice = computed(() => {
    const device = toValue(options.device)
    if (device && device !== 'auto') {
      return device
    }

    // If container width is provided and valid, use it as the primary indicator
    const cWidth = toValue(options.containerWidth)
    if (cWidth !== undefined && cWidth > 0) {
      // If the container is very narrow (e.g., <= 480px), switch to mobile mode
      // User specifically mentioned 320px, but 480px is generally the "mobile" threshold for containers
      return cWidth <= 480 ? 'mobile' : 'pc'
    }

    // Fallback to window width
    return windowWidth.value <= 768 ? 'mobile' : 'pc'
  })

  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }

  const sanitizeOptions = () => ({
    colorTokens: resolveColorTokens(toValue(options.colorPalette)),
  })

  const currentLength = computed(() => editor.value?.storage.characterCount?.characters?.() ?? 0)
  const resolvedMaxLength = computed(() => toValue(options.maxLength))
  const remainingLength = computed(() => resolvedMaxLength.value == null ? undefined : Math.max(0, resolvedMaxLength.value - currentLength.value))
  const usageRatio = computed(() => resolvedMaxLength.value ? currentLength.value / resolvedMaxLength.value : 0)
  const isNearLimit = computed(() => resolvedMaxLength.value != null && currentLength.value >= resolvedMaxLength.value * 0.9)
  const isAtLimit = computed(() => resolvedMaxLength.value != null && currentLength.value >= resolvedMaxLength.value)

  const cleanupEditor = () => {
    if (!editor.value) {
      return
    }

    editor.value.view.dom.removeEventListener(MAX_LENGTH_FEEDBACK_EVENT, onMaxLengthFeedback as EventListener)
    editor.value.destroy()
    editor.value = null
  }

  const mountEditor = (content: string) => {
    cleanupEditor()

    const videoOpts = toValue(options.video)
    const audioOpts = toValue(options.audio)

    editor.value = new Editor({
      ...createBambooEditorOptions({
        placeholder: toValue(options.placeholder),
        colorTokens: resolveColorTokens(toValue(options.colorPalette)),
        maxLength: toValue(options.maxLength),
        video: videoOpts,
        audio: audioOpts,
      }),
      content,
      editable: !toValue(options.disabled),
      onUpdate: ({ editor: instance }: { editor: any }) => {
        options.onUpdate?.(sanitizeHtml(instance.getHTML(), sanitizeOptions()))
      },
    })

    editor.value.view.dom.addEventListener(MAX_LENGTH_FEEDBACK_EVENT, onMaxLengthFeedback as EventListener)
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
    mountEditor(sanitizeHtml(toValue(options.modelValue) ?? '', sanitizeOptions()))
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    cleanupEditor()
  })

  watch(
    () => toValue(options.modelValue),
    (value) => {
      const instance = editor.value
      if (!instance) {
        return
      }

      const nextValue = sanitizeHtml(value ?? '', sanitizeOptions())
      if (nextValue !== sanitizeHtml(instance.getHTML(), sanitizeOptions())) {
        instance.commands.setContent(nextValue, false)
      }
    },
  )

  watch(
    () => toValue(options.disabled),
    (value) => {
      editor.value?.setEditable(!value)
    },
  )

  watch(
    () => toValue(options.maxLength),
    (value) => {
      const currentContent = editor.value ? sanitizeHtml(editor.value.getHTML(), sanitizeOptions()) : sanitizeHtml(toValue(options.modelValue) ?? '', sanitizeOptions())
      mountEditor(currentContent)

      if (value == null) {
        maxLengthFeedback.value = null
        return
      }

      const current = editor.value?.storage.characterCount?.characters?.() ?? 0
      if (current > value) {
        maxLengthFeedback.value = { kind: 'limit', message: '已达到字数上限' }
      }
    },
  )

  async function insertImage(file: File) {
    const instance = editor.value
    const uploadHandler = toValue(options.uploadHandler)
    const onUploadError = options.onUploadError
    if (!instance || !uploadHandler) {
      return
    }

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const previewUrl = await readAsDataUrl(file)

    ;(instance.chain().focus() as any).setImage({
      src: previewUrl,
      alt: file.name,
      'data-local-id': localId,
      'data-uploading': 'true',
    }).run()

    try {
      const uploaded = await uploadHandler(file)
      updateImageByLocalId(instance, localId, {
        src: uploaded.src,
        alt: uploaded.alt ?? file.name,
        'data-width': uploaded.width ? String(uploaded.width) : null,
        'data-uploading': null,
        'data-local-id': null,
      })
    } catch (error) {
      updateImageByLocalId(instance, localId, {
        'data-uploading': null,
        'data-local-id': null,
      })
      if (onUploadError && error instanceof Error) {
        onUploadError({ type: 'size', message: error.message, file })
      }
    }
  }

  function setLink(rawUrl: string) {
    const instance = editor.value
    const href = normalizeUrl(rawUrl)
    if (!instance || !href) {
      return false
    }

    return instance.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  function unsetLink() {
    const instance = editor.value
    if (!instance) {
      return false
    }

    return instance.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  function insertRemoteImage(rawUrl: string) {
    const instance = editor.value
    const src = normalizeUrl(rawUrl)
    if (!instance || !src) {
      return false
    }

    return (instance.chain().focus() as any).setImage({ src }).run()
  }

  function undo() {
    const instance = editor.value
    if (!instance) {
      return false
    }

    return (instance.chain().focus() as any).undo().run()
  }

  function redo() {
    const instance = editor.value
    if (!instance) {
      return false
    }

    return (instance.chain().focus() as any).redo().run()
  }

  async function insertVideo(file: File, poster?: string) {
    const instance = editor.value
    const uploadHandler = toValue(options.uploadHandler)
    const onUploadError = options.onUploadError
    if (!instance || !uploadHandler) {
      console.warn('[BambooEditor] insertVideo: no editor or uploadHandler')
      return
    }

    // 验证文件类型 - 更宽松的匹配
    const videoExt = instance.extensionManager.extensions.find((e: any) => e.name === 'video')
    const videoOptions = videoExt?.options
    const acceptType = videoOptions?.accept ?? 'video/mp4'

    // 更宽松的类型检查：检查是否是 video/* 或特定类型
    const isVideoType = file.type.startsWith('video/')
    if (!isVideoType && acceptType !== '*') {
      const errorMsg = `文件类型 "${file.type}" 不符合要求 "${acceptType}"`
      console.warn(`[BambooEditor] insertVideo: ${errorMsg}`)
      onUploadError?.({ type: 'type', message: errorMsg, file })
      return
    }

    // 验证文件大小 (MB)
    const maxSize = videoOptions?.maxSize ?? 50
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1)
      const errorMsg = `视频文件大小 ${sizeInMB}MB 超出 ${maxSize}MB 限制`
      console.warn(`[BambooEditor] insertVideo: ${errorMsg}`)
      onUploadError?.({ type: 'size', message: errorMsg, file })
      return
    }

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const previewUrl = await readAsDataUrl(file)
    const dimensions = await getVideoDimensions(file).catch(() => ({ width: 0, height: 0 }))

    ;(instance.chain().focus() as any).setVideo({
      src: previewUrl,
      poster,
      'data-local-id': localId,
      'data-uploading': 'true',
      'data-width': dimensions.width > 0 ? String(dimensions.width) : null,
    }).run()

    try {
      const uploaded = await uploadHandler(file)
      updateVideoByLocalId(instance, localId, {
        src: uploaded.src,
        poster: poster ?? uploaded.poster ?? null,
        'data-width': dimensions.width > 0 ? String(dimensions.width) : null,
        'data-uploading': null,
        'data-local-id': null,
      })
    } catch (error) {
      updateVideoByLocalId(instance, localId, {
        'data-uploading': null,
        'data-local-id': null,
      })
      if (onUploadError && error instanceof Error) {
        onUploadError({ type: 'size', message: error.message, file })
      }
    }
  }

  function insertRemoteVideo(rawUrl: string, poster?: string) {
    const instance = editor.value
    const src = normalizeUrl(rawUrl)
    if (!instance || !src) {
      return false
    }

    return (instance.chain().focus() as any).setVideo({ src, poster }).run()
  }

  function insertHorizontalRule() {
    const instance = editor.value
    if (!instance) {
      return false
    }

    return (instance.chain().focus() as any).setHorizontalRule().run()
  }

  function clearFormatting() {
    const instance = editor.value
    if (!instance) {
      return false
    }

    return instance.chain().focus().unsetAllMarks().clearNodes().run()
  }

  function onMaxLengthFeedback(event: Event) {
    const detail = (event as CustomEvent<MaxLengthFeedbackDetail>).detail
    if (!detail) {
      return
    }

    maxLengthFeedback.value = detail
  }

  const insertAudio = async (file: File) => {
    const handler = toValue(options.uploadHandler)
    if (!handler) {
      editor.value?.commands.insertContent({
        type: 'audio',
        attrs: { src: URL.createObjectURL(file) }
      })
      return
    }

    // Validate size
    const maxSize = toValue(options.audio)?.maxSize ?? 20
    if (file.size > maxSize * 1024 * 1024) {
      options.onUploadError?.({ type: 'size', message: `音频大小不能超过 ${maxSize}MB`, file })
      return
    }

    try {
      const result = await handler(file)
      editor.value?.commands.insertContent({
        type: 'audio',
        attrs: { src: result.src }
      })
    } catch (error) {
      options.onUploadError?.({ type: 'type', message: '音频上传失败', file })
    }
  }

  const insertRemoteAudio = (url: string, align?: 'left' | 'center' | 'right') => {
    editor.value?.commands.insertContent({
      type: 'audio',
      attrs: { src: url, 'data-align': align || 'left' }
    })
  }

  return {
    editor,
    resolvedDevice,
    currentLength,
    maxLength: resolvedMaxLength,
    remainingLength,
    usageRatio,
    isNearLimit,
    isAtLimit,
    maxLengthFeedback,
    insertImage,
    setLink,
    unsetLink,
    insertRemoteImage,
    insertVideo,
    insertRemoteVideo,
    insertAudio,
    insertRemoteAudio,
    undo,
    redo,
    insertHorizontalRule,
    clearFormatting,
  }
}

function resolveColorTokens(colorPalette?: readonly BambooColorOption[]) {
  return colorPalette?.map((item) => item.token).filter(Boolean)
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

function updateImageByLocalId(editor: Editor, localId: string, attrs: Record<string, string | null>) {
  let imagePosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs['data-local-id'] === localId) {
      imagePosition = pos
      return false
    }

    return true
  })

  if (imagePosition == null) {
    return
  }

  const position = imagePosition
  const node = editor.state.doc.nodeAt(position)
  if (!node) {
    return
  }

  editor.commands.command(({ tr }: { tr: any }) => {
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      ...attrs,
    })
    return true
  })
}

function updateVideoByLocalId(editor: Editor, localId: string, attrs: Record<string, string | null>) {
  let videoPosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'video' && node.attrs['data-local-id'] === localId) {
      videoPosition = pos
      return false
    }

    return true
  })

  if (videoPosition == null) {
    return
  }

  const position = videoPosition
  const node = editor.state.doc.nodeAt(position)
  if (!node) {
    return
  }

  editor.commands.command(({ tr }: { tr: any }) => {
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      ...attrs,
    })
    return true
  })
}

function normalizeUrl(rawUrl: string) {
  const value = rawUrl.trim()
  if (!value || /^\s*javascript:/i.test(value)) {
    return null
  }

  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value) || /^data:(image|video)\//i.test(value) || /^blob:/i.test(value)) {
    return value
  }

  return `https://${value}`
}
