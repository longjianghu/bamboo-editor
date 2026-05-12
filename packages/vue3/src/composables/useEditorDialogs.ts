import type { Editor } from '@tiptap/vue-3'
import { ref } from 'vue'

declare const window: Window & typeof globalThis

interface UrlDialogState {
  type: 'link' | 'remote-video'
  mode: 'create' | 'edit'
  initialValue: string
  allowRemove: boolean
}

interface VideoDialogState {
  mode: 'create' | 'edit'
  initialData?: {
    src: string
    poster?: string
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  }
}

interface ImageDialogState {
  mode: 'create' | 'edit'
  initialData?: {
    src: string
    alt?: string
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  }
}

interface AudioDialogState {
  mode: 'create' | 'edit'
  initialData?: {
    src: string
    align?: 'left' | 'center' | 'right'
  }
}

interface UseEditorDialogsOptions {
  editor: { value: Editor | null }
  disabled: boolean
  setLink: (url: string) => boolean
  unsetLink: () => boolean
  insertVideo: (file: File, poster?: string) => Promise<void>
  insertRemoteVideo: (url: string, poster?: string) => boolean
}

/**
 * 编辑器对话框状态管理
 */
export function useEditorDialogs(options: UseEditorDialogsOptions) {
  const { editor, disabled, setLink, unsetLink, insertVideo, insertRemoteVideo } = options

  const urlDialogVisible = ref(false)
  const infoDialogVisible = ref(false)
  const errorDialogVisible = ref(false)
  const errorDialogMessage = ref('')
  const mobileToastVisible = ref(false)
  const mobileToastMessage = ref('')
  const shouldIgnoreVideoSelection = ref(false)
  const videoDialogVisible = ref(false)
  const imageDialogVisible = ref(false)
  const audioDialogVisible = ref(false)

  const urlDialogState = ref<UrlDialogState>({
    type: 'link',
    mode: 'create',
    initialValue: '',
    allowRemove: false,
  })

  const videoDialogState = ref<VideoDialogState>({
    mode: 'create',
  })

  const imageDialogState = ref<ImageDialogState>({
    mode: 'create',
  })

  const audioDialogState = ref<AudioDialogState>({
    mode: 'create',
  })

  // --- Toast ---

  let mobileToastTimer: number | null = null

  function showMobileToast(message: string) {
    if (typeof window === 'undefined' || !message) {
      return
    }

    mobileToastMessage.value = message
    mobileToastVisible.value = true

    if (mobileToastTimer !== null) {
      window.clearTimeout(mobileToastTimer)
    }

    mobileToastTimer = window.setTimeout(() => {
      mobileToastVisible.value = false
      mobileToastTimer = null
    }, 1800)
  }

  // --- Link Dialog ---

  function handleLinkSelect(url: string | null) {
    if (url === null) {
      return unsetLink()
    }

    return setLink(url)
  }

  function handleOpenLinkDialog(payload?: { initialValue?: string; mode?: 'create' | 'edit'; allowRemove?: boolean }) {
    if (disabled) {
      return
    }

    urlDialogState.value = {
      type: 'link',
      mode: payload?.mode ?? 'create',
      initialValue: payload?.initialValue ?? '',
      allowRemove: payload?.allowRemove ?? false,
    }
    urlDialogVisible.value = true
  }

  function closeUrlDialog() {
    urlDialogVisible.value = false
    if (urlDialogState.value.type === 'remote-video') {
      shouldIgnoreVideoSelection.value = true
      window.setTimeout(() => {
        shouldIgnoreVideoSelection.value = false
      }, 300)
    }
    window.setTimeout(() => editor.value?.commands.focus(), 0)
  }

  function handleUrlDialogConfirm(url: string) {
    if (urlDialogState.value.type === 'remote-video') {
      handleRemoteVideoSelect(url)
    } else {
      handleLinkSelect(url)
    }

    closeUrlDialog()
  }

  function handleUrlDialogRemove() {
    if (urlDialogState.value.type === 'link') {
      handleLinkSelect(null)
    }

    closeUrlDialog()
  }

  // --- Video Dialog ---

  function closeVideoDialog() {
    videoDialogVisible.value = false
    shouldIgnoreVideoSelection.value = true
    window.setTimeout(() => {
      shouldIgnoreVideoSelection.value = false
    }, 300)
    window.setTimeout(() => editor.value?.commands.focus(), 0)
  }

  function handleOpenVideoDialog() {
    if (disabled) {
      return
    }

    videoDialogState.value = {
      mode: 'create',
      initialData: undefined,
    }
    videoDialogVisible.value = true
  }

  function handleVideoDialogConfirm(data: {
    src: string
    poster?: string
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  }) {
    console.log('[BambooEditor] handleVideoDialogConfirm', data)
    const instance = editor.value
    if (!instance) {
      console.log('[BambooEditor] no editor instance')
      return
    }

    console.log('[BambooEditor] mode:', videoDialogState.value.mode)
    closeVideoDialog()

    if (videoDialogState.value.mode === 'edit') {
      instance.commands.command(({ tr }: { tr: any }) => {
        const { from, to } = instance.state.selection
        let found = false
        instance.state.doc.nodesBetween(from, to, (node) => {
          if (node.type.name === 'video' && !found) {
            const pos = from
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: data.src,
              poster: data.poster ?? node.attrs.poster,
              width: data.width ? String(data.width) : null,
              height: data.height ? String(data.height) : null,
              'data-align': data.align,
            })
            found = true
            return false
          }
          return true
        })
        return true
      })
    } else {
      instance.commands.command(({ tr }: { tr: any }) => {
        const videoNode = instance.schema.nodes.video.create({
          src: data.src,
          poster: data.poster,
          width: data.width ? String(data.width) : null,
          height: data.height ? String(data.height) : null,
          'data-align': data.align,
        })
        tr.replaceSelectionWith(videoNode)
        return true
      })
    }
  }

  function handleVideoDialogRemove() {
    const instance = editor.value
    if (!instance) {
      return
    }

    const selection = instance.state.selection as any
    const node = selection.node
    if (node && node.type.name === 'video') {
      instance.commands.deleteSelection()
    }

    closeVideoDialog()
  }

  function handleOpenVideoDialogEvent({ pos, node, data }: { pos: number; node: any; data?: any }) {
    if (disabled) {
      return
    }

    const instance = editor.value
    if (!instance) {
      return
    }

    const finalSrc = data?.src || node.attrs.src || ''
    const finalPoster = data?.poster || node.attrs.poster || ''
    const finalWidth = data?.width || node.attrs.width
    const finalHeight = data?.height || node.attrs.height
    const finalAlign = data?.align || node.attrs['data-align'] || 'left'

    videoDialogState.value = {
      mode: 'edit',
      initialData: {
        src: finalSrc,
        poster: finalPoster,
        width: finalWidth ? Number(finalWidth) : undefined,
        height: finalHeight ? Number(finalHeight) : undefined,
        align: finalAlign as any,
      },
    }
    videoDialogVisible.value = true
    instance.commands.setNodeSelection(pos)
  }

  function handleRemoteVideoSelect(url: string, poster?: string) {
    return insertRemoteVideo(url, poster)
  }

  function _handleOpenRemoteVideoDialog(payload?: { initialValue?: string }) {
    if (disabled) {
      return
    }

    urlDialogState.value = {
      type: 'remote-video',
      mode: 'create',
      initialValue: payload?.initialValue ?? '',
      allowRemove: false,
    }
    urlDialogVisible.value = true
  }

  // --- Image Dialog ---

  function handleOpenImageDialog(payload?: { pos?: number; node?: any; initialData?: any; mode?: 'create' | 'edit' }) {
    if (disabled) {
      return
    }

    imageDialogState.value = {
      mode: payload?.mode ?? 'create',
      initialData: payload?.initialData ??
        payload?.node?.attrs ?? {
          src: '',
          alt: '',
          width: undefined,
          height: undefined,
          align: 'left',
        },
    }
    imageDialogVisible.value = true
  }

  function closeImageDialog() {
    imageDialogVisible.value = false
    window.setTimeout(() => editor.value?.commands.focus(), 0)
  }

  function handleImageDialogConfirm(data: {
    src: string
    alt?: string
    width?: number
    height?: number
    align?: 'left' | 'center' | 'right'
  }) {
    const instance = editor.value
    if (!instance) return

    closeImageDialog()

    if (imageDialogState.value.mode === 'edit') {
      instance.commands.updateAttributes('image', {
        src: data.src,
        alt: data.alt,
        width: data.width ? String(data.width) : null,
        height: data.height ? String(data.height) : null,
        'data-align': data.align,
      })
    } else {
      instance.commands.insertContent({
        type: 'image',
        attrs: {
          src: data.src,
          alt: data.alt,
          width: data.width ? String(data.width) : null,
          height: data.height ? String(data.height) : null,
          'data-align': data.align,
        },
      })
    }
  }

  function handleImageDialogRemove() {
    const instance = editor.value
    if (!instance) return

    instance.commands.deleteSelection()
    closeImageDialog()
  }

  // --- Audio Dialog ---

  function handleOpenAudioDialog(payload?: { pos?: number; node?: any; initialData?: any; mode?: 'create' | 'edit' }) {
    if (disabled) {
      return
    }

    if (payload?.pos !== undefined && editor.value) {
      editor.value.commands.setNodeSelection(payload.pos)
    }

    const finalSrc = payload?.initialData?.src || payload?.node?.attrs?.src || ''
    const finalAlign =
      payload?.initialData?.align ||
      payload?.initialData?.['data-align'] ||
      payload?.node?.attrs?.['data-align'] ||
      'left'
    console.log('[BambooEditor] handleOpenAudioDialog - node attrs:', payload?.node?.attrs, 'finalAlign:', finalAlign)

    audioDialogState.value = {
      mode: payload?.mode ?? 'create',
      initialData: {
        src: finalSrc,
        align: finalAlign,
      },
    }
    audioDialogVisible.value = true
  }

  function closeAudioDialog() {
    audioDialogVisible.value = false
    window.setTimeout(() => editor.value?.commands.focus(), 0)
  }

  function handleAudioDialogConfirm(data: { src: string; align?: 'left' | 'center' | 'right' }) {
    const instance = editor.value
    if (!instance) return

    closeAudioDialog()

    if (audioDialogState.value.mode === 'edit') {
      instance.commands.command(({ tr }: { tr: any }) => {
        const { from, to } = instance.state.selection
        let found = false
        instance.state.doc.nodesBetween(from, to, (node: any) => {
          if (node.type.name === 'audio' && !found) {
            const pos = from
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: data.src,
              'data-align': data.align,
            })
            found = true
            return false
          }
          return true
        })
        return true
      })
    } else {
      instance.commands.insertContent({
        type: 'audio',
        attrs: {
          src: data.src,
          'data-align': data.align,
        },
      })
    }
  }

  function handleAudioDialogRemove() {
    const instance = editor.value
    if (!instance) return

    instance.commands.deleteSelection()
    closeAudioDialog()
  }

  function cleanup() {
    if (mobileToastTimer !== null) {
      window.clearTimeout(mobileToastTimer)
      mobileToastTimer = null
    }
  }

  return {
    // State
    urlDialogVisible,
    infoDialogVisible,
    errorDialogVisible,
    errorDialogMessage,
    mobileToastVisible,
    mobileToastMessage,
    shouldIgnoreVideoSelection,
    videoDialogVisible,
    imageDialogVisible,
    audioDialogVisible,
    urlDialogState,
    videoDialogState,
    imageDialogState,
    audioDialogState,

    // Methods
    showMobileToast,
    handleOpenLinkDialog,
    closeUrlDialog,
    handleUrlDialogConfirm,
    handleUrlDialogRemove,
    closeVideoDialog,
    handleOpenVideoDialog,
    handleVideoDialogConfirm,
    handleVideoDialogRemove,
    handleOpenVideoDialogEvent,
    _handleOpenRemoteVideoDialog,
    handleOpenImageDialog,
    closeImageDialog,
    handleImageDialogConfirm,
    handleImageDialogRemove,
    handleOpenAudioDialog,
    closeAudioDialog,
    handleAudioDialogConfirm,
    handleAudioDialogRemove,
    cleanup,
  }
}
