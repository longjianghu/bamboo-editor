import { watch } from 'vue'

const DRAFT_DEBOUNCE_MS = 1000

declare const window: Window & typeof globalThis

interface UseEditorDraftOptions {
  editorId: string | undefined
  draftTtl: number
  modelValue: string
  editor: { value: { commands: { setContent: (html: string, emitUpdate?: boolean) => void } } | null }
  emit: (event: 'update:modelValue', value: string) => void
}

/**
 * 编辑器草稿自动保存管理
 */
export function useEditorDraft(options: UseEditorDraftOptions) {
  const { editorId, draftTtl, modelValue, editor, emit } = options

  let draftTimer: number | null = null

  function getDraftKey() {
    if (typeof window === 'undefined' || !editorId) {
      return null
    }

    const { pathname, search, hash } = window.location
    return `bamboo_draft_${pathname}${search}${hash}_${editorId}`
  }

  function saveDraft(html: string) {
    const key = getDraftKey()
    if (!key) {
      return
    }

    try {
      localStorage.setItem(key, JSON.stringify({ html, savedAt: Date.now() }))
    } catch {
      // localStorage 不可用时静默失败
    }
  }

  function loadDraft() {
    const key = getDraftKey()
    if (!key) {
      return null
    }

    try {
      const raw = localStorage.getItem(key)
      if (!raw) {
        return null
      }

      const { html, savedAt } = JSON.parse(raw) as { html: string; savedAt: number }
      if (Date.now() - savedAt > draftTtl) {
        localStorage.removeItem(key)
        return null
      }

      return html
    } catch {
      return null
    }
  }

  function clearDraft() {
    const key = getDraftKey()
    if (!key) {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch {
      // 静默失败
    }
  }

  function scheduleDraftSave(html: string) {
    if (typeof window === 'undefined') {
      return
    }

    if (draftTimer !== null) {
      window.clearTimeout(draftTimer)
    }

    draftTimer = window.setTimeout(() => {
      saveDraft(html)
      draftTimer = null
    }, DRAFT_DEBOUNCE_MS)
  }

  // 监听 editor 初始化时加载草稿
  watch(
    () => editor.value,
    (instance) => {
      if (!instance || !editorId) {
        return
      }

      const draft = loadDraft()
      if (draft && draft !== modelValue) {
        instance.commands.setContent(draft, false)
        emit('update:modelValue', draft)
      }
    },
    { once: true },
  )

  function cleanup() {
    if (draftTimer !== null) {
      window.clearTimeout(draftTimer)
      draftTimer = null
    }
  }

  return {
    scheduleDraftSave,
    clearDraft,
    cleanup,
  }
}
