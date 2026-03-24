import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { createBambooEditorOptions, sanitizeHtml } from '@bamboo-editor/core'

export type BambooDevice = 'pc' | 'mobile' | 'auto'

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
  onUpdate?: (html: string) => void
}

export function useBambooEditor(options: UseBambooEditorOptions) {
  const editor = shallowRef<Editor | null>(null)
  const windowWidth = ref(typeof window === 'undefined' ? 1024 : window.innerWidth)

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

  onMounted(() => {
    window.addEventListener('resize', handleResize)

    editor.value = new Editor({
      ...createBambooEditorOptions({
        placeholder: toValue(options.placeholder),
      }),
      content: sanitizeHtml(toValue(options.modelValue) ?? ''),
      editable: !toValue(options.disabled),
      onUpdate: ({ editor: instance }) => {
        options.onUpdate?.(sanitizeHtml(instance.getHTML()))
      },
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
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

      const nextValue = sanitizeHtml(value ?? '')
      if (nextValue !== sanitizeHtml(instance.getHTML())) {
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

  async function insertImage(file: File) {
    const instance = editor.value
    const uploadHandler = toValue(options.uploadHandler)
    if (!instance || !uploadHandler) {
      return
    }

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const previewUrl = await readAsDataUrl(file)

    instance.chain().focus().setImage({
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

  return {
    editor,
    resolvedDevice,
    insertImage,
  }
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

  const node = editor.state.doc.nodeAt(imagePosition)
  if (!node) {
    return
  }

  editor.commands.command(({ tr }) => {
    tr.setNodeMarkup(imagePosition, undefined, {
      ...node.attrs,
      ...attrs,
    })
    return true
  })
}
