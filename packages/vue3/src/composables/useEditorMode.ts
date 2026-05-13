import { computed, ref, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export type EditorMode = 'edit' | 'preview' | 'source'

export interface UseEditorModeOptions {
  editor: Ref<Editor | null>
  modelValue: Ref<string>
  emitUpdate: (html: string) => void
  updateWordCountFromHtml?: (html: string) => void
}

export function useEditorMode(options: UseEditorModeOptions) {
  const mode = ref<EditorMode>('edit')
  const sourceContent = ref('')

  // 从 editor 获取实时 HTML
  const currentHtml = computed(() => {
    return options.editor.value?.getHTML() ?? options.modelValue.value
  })

  // 监听源码变化，实时更新字数
  watch(sourceContent, (html) => {
    if (mode.value === 'source' && options.updateWordCountFromHtml) {
      options.updateWordCountFromHtml(html)
    }
  })

  // 监听 HTML 变化，在预览模式下更新字数
  watch(currentHtml, (html) => {
    if (mode.value === 'preview' && options.updateWordCountFromHtml) {
      options.updateWordCountFromHtml(html)
    }
  })

  // 切换模式
  function switchMode(newMode: EditorMode) {
    if (newMode === mode.value) return

    // 离开源码模式时，同步修改到编辑器
    if (mode.value === 'source' && newMode !== 'source') {
      applySourceChanges()
    }

    // 进入源码模式时，获取当前 HTML
    if (newMode === 'source') {
      sourceContent.value = currentHtml.value
      // 更新字数统计
      if (options.updateWordCountFromHtml) {
        options.updateWordCountFromHtml(sourceContent.value)
      }
    }

    // 进入预览模式时更新字数
    if (newMode === 'preview' && options.updateWordCountFromHtml) {
      options.updateWordCountFromHtml(currentHtml.value)
    }

    mode.value = newMode
  }

  // 应用源码修改
  function applySourceChanges() {
    if (!options.editor.value) return
    const html = sourceContent.value
    // 设置到编辑器
    options.editor.value.commands.setContent(html, false)
    options.emitUpdate(html)
  }

  // 源码变化时更新
  function onSourceChange(html: string) {
    sourceContent.value = html
  }

  return {
    mode,
    sourceContent,
    currentHtml,
    switchMode,
    onSourceChange,
    applySourceChanges,
  }
}
