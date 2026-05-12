import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

interface FloatingPosition {
  top: number
  left: number
  editorTop?: number
  editorBottom?: number
  editorLeft?: number
  editorRight?: number
}

interface UseEditorFloatingToolbarOptions {
  editor: { value: Editor | null }
  resolvedDevice: { value: string }
  disabled: boolean
  editorScopeId: string
}

/**
 * 编辑器浮动工具栏定位管理
 */
export function useEditorFloatingToolbar(options: UseEditorFloatingToolbarOptions) {
  const { editor, resolvedDevice, disabled, editorScopeId } = options

  const floatingToolbarVisible = ref(false)
  const floatingToolbarPosition = ref<FloatingPosition>({ top: 0, left: 0 })

  function hideFloatingToolbar() {
    floatingToolbarVisible.value = false
  }

  function clamp(value: number, min: number, max: number) {
    if (min > max) {
      return value
    }

    return Math.min(Math.max(value, min), max)
  }

  function updateFloatingToolbar() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      hideFloatingToolbar()
      return
    }

    const instance = editor.value
    if (!instance || resolvedDevice.value !== 'mobile' || disabled) {
      hideFloatingToolbar()
      return
    }

    const selection = instance.state.selection as typeof instance.state.selection & {
      node?: { type?: { name?: string } }
    }
    const isImageSelection = selection.node?.type?.name === 'image'
    const editorElement = document.querySelector(
      `[data-editor-scope='${editorScopeId}'] .bamboo-editor__content .ProseMirror`,
    ) as HTMLElement | null
    if (!editorElement) {
      hideFloatingToolbar()
      return
    }

    let rect: DOMRect | null = null

    if (isImageSelection) {
      hideFloatingToolbar()
      return
    } else {
      const { from, to, empty } = selection
      if (empty || from === to) {
        hideFloatingToolbar()
        return
      }

      if (!selection.$from.parent.isTextblock) {
        hideFloatingToolbar()
        return
      }

      const domSelection = window.getSelection()
      if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
        hideFloatingToolbar()
        return
      }

      const range = domSelection.getRangeAt(0)
      if (!editorElement.contains(range.commonAncestorContainer)) {
        hideFloatingToolbar()
        return
      }

      const rangeRect = range.getBoundingClientRect()
      if (!rangeRect.width && !rangeRect.height) {
        hideFloatingToolbar()
        return
      }

      rect = rangeRect
    }

    const editorRect = editorElement.getBoundingClientRect()
    const toolbarWidth = 420
    const toolbarHeight = 52
    const gap = 10
    const minLeft = editorRect.left + toolbarWidth / 2
    const maxLeft = editorRect.right - toolbarWidth / 2
    const centeredLeft = rect.left + rect.width / 2
    const left = clamp(centeredLeft, minLeft, maxLeft)
    const placeAboveTop = rect.top - gap
    const top =
      placeAboveTop - toolbarHeight >= editorRect.top
        ? placeAboveTop
        : Math.min(editorRect.bottom - gap, rect.bottom + toolbarHeight + gap)

    floatingToolbarPosition.value = {
      top,
      left,
      editorTop: editorRect.top,
      editorBottom: editorRect.bottom,
      editorLeft: editorRect.left,
      editorRight: editorRect.right,
    }
    floatingToolbarVisible.value = true
  }

  return {
    floatingToolbarVisible,
    floatingToolbarPosition,
    hideFloatingToolbar,
    updateFloatingToolbar,
    clamp,
  }
}
