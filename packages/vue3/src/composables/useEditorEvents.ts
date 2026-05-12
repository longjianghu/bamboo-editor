import type { Editor } from '@tiptap/vue-3'
import { watch } from 'vue'

interface UseEditorEventsOptions {
  editor: { value: Editor | null }
  resolvedDevice: { value: string }
  disabled: boolean
  editorScopeId: string
  updateFloatingToolbar: () => void
  scheduleWordCountRefresh: (immediate?: boolean) => void
  resetWordCountState: () => void
  hideFloatingToolbar: () => void
  updateSurfaceWidth: () => void
}

/**
 * 编辑器事件管理
 */
export function useEditorEvents(options: UseEditorEventsOptions) {
  const {
    editor,
    resolvedDevice,
    disabled,
    editorScopeId,
    updateFloatingToolbar,
    scheduleWordCountRefresh,
    resetWordCountState,
    hideFloatingToolbar,
    updateSurfaceWidth,
  } = options

  // 监听 editor 变化，设置事件监听
  watch(
    [editor, resolvedDevice, () => disabled],
    (_, __, onCleanup) => {
      const instance = editor.value
      if (!instance) {
        hideFloatingToolbar()
        resetWordCountState()
        return
      }

      const handleSelectionChange = () => {
        updateFloatingToolbar()
      }
      const handleWordCountChange = () => scheduleWordCountRefresh()
      const handleBlur = ({ event }: { event?: FocusEvent }) => {
        const relatedTarget = event?.relatedTarget
        if (relatedTarget instanceof Element && relatedTarget.closest('.floating-toolbar-pc')) {
          return
        }

        window.setTimeout(() => updateFloatingToolbar(), 0)
      }

      const handleFocus = () => updateFloatingToolbar()

      instance.on('selectionUpdate', handleSelectionChange)
      instance.on('transaction', handleSelectionChange)
      instance.on('selectionUpdate', handleWordCountChange)
      instance.on('transaction', handleWordCountChange)
      instance.on('focus', handleFocus)
      instance.on('blur', handleBlur)
      window.addEventListener('resize', handleSelectionChange)
      window.addEventListener('scroll', handleSelectionChange, true)
      updateFloatingToolbar()
      scheduleWordCountRefresh(true)

      onCleanup(() => {
        instance.off('selectionUpdate', handleSelectionChange)
        instance.off('transaction', handleSelectionChange)
        instance.off('selectionUpdate', handleWordCountChange)
        instance.off('transaction', handleWordCountChange)
        instance.off('focus', handleFocus)
        instance.off('blur', handleBlur)
        window.removeEventListener('resize', handleSelectionChange)
        window.removeEventListener('scroll', handleSelectionChange, true)
      })
    },
    { immediate: true },
  )
}
