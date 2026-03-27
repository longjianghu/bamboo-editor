import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createBambooEditorOptions, MAX_LENGTH_FEEDBACK_EVENT, sanitizeHtml, type MaxLengthFeedbackDetail } from '@bamboo-editor/core'

export type BambooDevice = 'pc' | 'mobile' | 'auto'

export interface BambooColorOption {
  token: string
  label: string
  value: string
}

export interface UploadResult {
  src: string
  alt?: string
  width?: number
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
  onUpdate?: (html: string) => void
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

  onMounted(() => {
    window.addEventListener('resize', handleResize)

    editor.value = new Editor({
      ...createBambooEditorOptions({
        placeholder: toValue(options.placeholder),
        colorTokens: resolveColorTokens(toValue(options.colorPalette)),
        maxLength: toValue(options.maxLength),
      }),
      content: sanitizeHtml(toValue(options.modelValue) ?? '', sanitizeOptions()),
      editable: !toValue(options.disabled),
      onUpdate: ({ editor: instance }: { editor: any }) => {
        options.onUpdate?.(sanitizeHtml(instance.getHTML(), sanitizeOptions()))
      },
    })

    editor.value.view.dom.addEventListener(MAX_LENGTH_FEEDBACK_EVENT, onMaxLengthFeedback as EventListener)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    editor.value?.view.dom.removeEventListener(MAX_LENGTH_FEEDBACK_EVENT, onMaxLengthFeedback as EventListener)
    editor.value?.destroy()
    editor.value = null
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
      if (!editor.value) {
        return
      }

      if (value == null) {
        maxLengthFeedback.value = null
        return
      }

      const current = editor.value.storage.characterCount?.characters?.() ?? 0
      if (current > value) {
        maxLengthFeedback.value = { kind: 'limit', message: '已达到字数上限' }
      }
    },
    { immediate: true },
  )

  async function insertImage(file: File) {
    const instance = editor.value
    const uploadHandler = toValue(options.uploadHandler)
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

    const uploaded = await uploadHandler(file)
    updateImageByLocalId(instance, localId, {
      src: uploaded.src,
      alt: uploaded.alt ?? file.name,
      'data-width': uploaded.width ? String(uploaded.width) : null,
      'data-uploading': null,
      'data-local-id': null,
    })
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

function normalizeUrl(rawUrl: string) {
  const value = rawUrl.trim()
  if (!value || /^\s*javascript:/i.test(value)) {
    return null
  }

  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value) || /^data:image\//i.test(value)) {
    return value
  }

  return `https://${value}`
}
