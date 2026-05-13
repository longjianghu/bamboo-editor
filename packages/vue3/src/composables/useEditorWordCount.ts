import { computed, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'

const WORD_COUNT_DEBOUNCE_MS = 300
const WORD_COUNT_TOOLTIP_DELAY_MS = 200
const WORD_COUNT_COMPACT_WIDTH = 400

interface WordCountState {
  totalCharacters: number
  chineseCharacters: number
  selectedChineseCharacters: number
  paragraphCount: number
  lineCount: number
  hasSelectedText: boolean
}

const DEFAULT_WORD_COUNT_STATE: WordCountState = {
  totalCharacters: 0,
  chineseCharacters: 0,
  selectedChineseCharacters: 0,
  paragraphCount: 0,
  lineCount: 0,
  hasSelectedText: false,
}

interface UseEditorWordCountOptions {
  editor: { value: Editor | null }
  resolvedDevice: { value: string }
  maxLength: { value: number | undefined }
  currentLength: { value: number }
  usageRatio: { value: number }
  surfaceRef: { value: HTMLElement | null }
}

/**
 * 编辑器字数统计和 tooltip 逻辑
 */
export function useEditorWordCount(options: UseEditorWordCountOptions) {
  const { editor, resolvedDevice, maxLength, currentLength, usageRatio, surfaceRef } = options

  const wordCountState = ref<WordCountState>({ ...DEFAULT_WORD_COUNT_STATE })
  const surfaceWidth = ref(0)
  const isWordCountTooltipVisible = ref(false)

  let wordCountTimer: number | null = null
  let wordCountTooltipTimer: number | null = null

  const isCompactWordCount = computed(() => surfaceWidth.value > 0 && surfaceWidth.value < WORD_COUNT_COMPACT_WIDTH)

  const wordCountAriaLabel = computed(() => {
    if (maxLength.value != null) {
      if (currentLength.value > maxLength.value) {
        return `已超出 ${formatFullWordCount(currentLength.value - maxLength.value)} 字符`
      }

      return `${formatFullWordCount(currentLength.value)}/${formatFullWordCount(maxLength.value)} 字符`
    }

    if (wordCountState.value.hasSelectedText) {
      return `已选 ${formatFullWordCount(wordCountState.value.selectedChineseCharacters)} 字，共 ${formatFullWordCount(wordCountState.value.totalCharacters)} 字符`
    }

    return `共 ${formatFullWordCount(wordCountState.value.totalCharacters)} 字符`
  })

  const maxLengthStatus = computed(() => {
    if (maxLength.value == null) {
      return 'default'
    }

    if (currentLength.value >= maxLength.value) {
      return 'danger'
    }

    if (usageRatio.value >= 0.9) {
      return 'warning'
    }

    return 'default'
  })

  function updateSurfaceWidth() {
    const surfaceElement = surfaceRef.value
    if (!surfaceElement) {
      surfaceWidth.value = 0
      return
    }

    const scrollbarGap = resolvedDevice.value === 'pc' ? 20 : 0
    surfaceWidth.value = Math.max(surfaceElement.clientWidth - scrollbarGap, 0)
  }

  function handleWordCountMouseEnter() {
    if (typeof window === 'undefined') {
      return
    }

    if (wordCountTooltipTimer !== null) {
      window.clearTimeout(wordCountTooltipTimer)
    }

    wordCountTooltipTimer = window.setTimeout(() => {
      isWordCountTooltipVisible.value = true
      wordCountTooltipTimer = null
    }, WORD_COUNT_TOOLTIP_DELAY_MS)
  }

  function handleWordCountMouseLeave() {
    if (typeof window === 'undefined') {
      return
    }

    if (wordCountTooltipTimer !== null) {
      window.clearTimeout(wordCountTooltipTimer)
      wordCountTooltipTimer = null
    }

    isWordCountTooltipVisible.value = false
  }

  function resetWordCountState() {
    clearWordCountTimer()
    wordCountState.value = { ...DEFAULT_WORD_COUNT_STATE }
    handleWordCountMouseLeave()
  }

  function scheduleWordCountRefresh(immediate = false) {
    if (typeof window === 'undefined') {
      return
    }

    clearWordCountTimer()

    if (immediate) {
      refreshWordCountNow()
      return
    }

    wordCountTimer = window.setTimeout(() => {
      refreshWordCountNow()
      wordCountTimer = null
    }, WORD_COUNT_DEBOUNCE_MS)
  }

  function clearWordCountTimer() {
    if (typeof window === 'undefined') {
      wordCountTimer = null
      return
    }

    if (wordCountTimer !== null) {
      window.clearTimeout(wordCountTimer)
      wordCountTimer = null
    }
  }

  function refreshWordCountNow() {
    const instance = editor.value
    if (!instance) {
      resetWordCountState()
      return
    }

    if (resolvedDevice.value === 'pc') {
      updateSurfaceWidth()
    }
    const plainText = getEditorPlainText(instance)
    const selectionText = getSelectionText(instance)
    const chineseCharacters = countChineseCharacters(plainText)
    const selectedChineseCharacters = countChineseCharacters(selectionText)

    wordCountState.value = {
      totalCharacters: getTotalCharacterCount(instance),
      chineseCharacters,
      selectedChineseCharacters,
      paragraphCount: countParagraphs(instance),
      lineCount: countLogicalLines(plainText),
      hasSelectedText: selectedChineseCharacters > 0,
    }
  }

  function getTotalCharacterCount(instance: Editor) {
    return instance.storage.characterCount?.characters?.() ?? instance.getText().length
  }

  function getEditorPlainText(instance: Editor) {
    return instance.state.doc.textBetween(0, instance.state.doc.content.size, '\n', '\n')
  }

  function getSelectionText(instance: Editor) {
    const { from, to, empty } = instance.state.selection
    if (empty || from === to) {
      return ''
    }

    return instance.state.doc.textBetween(from, to, '\n', '\n')
  }

  function countChineseCharacters(value: string) {
    try {
      return value.match(/\p{Unified_Ideograph}/gu)?.length ?? 0
    } catch {
      return value.match(/[㐀-䶿一-鿿豈-﫿]/g)?.length ?? 0
    }
  }

  function countParagraphs(instance: Editor) {
    let count = 0

    instance.state.doc.descendants((node) => {
      if (node.isTextblock && node.textContent.trim()) {
        count += 1
      }
    })

    return count
  }

  function countLogicalLines(value: string) {
    if (!value.trim()) {
      return 0
    }

    return value.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  }

  function countFromPlainText(text: string, html?: string): WordCountState {
    const chineseCharacters = countChineseCharacters(text)
    return {
      totalCharacters: text.length,
      chineseCharacters,
      selectedChineseCharacters: 0,
      paragraphCount: countParagraphsFromHtml(html ?? text),
      lineCount: countLogicalLines(text),
      hasSelectedText: false,
    }
  }

  function countParagraphsFromHtml(html: string): number {
    // 使用简单正则匹配 block 元素标签
    const blockTags = 'p|div|h[1-6]|blockquote|pre|li|td|th'
    const regex = new RegExp(`</?(?:${blockTags})[^>]*>`, 'gi')
    const matches = html.match(regex)
    if (!matches) return 0
    // 计算开标签数量
    const openTags = matches.filter(tag => !tag.startsWith('</'))
    return openTags.filter(tag => !tag.includes('br') && !tag.includes('hr')).length
  }

  function formatFullWordCount(value: number) {
    return value.toLocaleString('zh-CN')
  }

  function formatVisibleWordCount(value: number) {
    if (!isCompactWordCount.value) {
      return formatFullWordCount(value)
    }

    if (maxLength.value != null) {
      return `${value}`
    }

    if (value >= 1000) {
      const compactValue = value / 1000
      const displayValue = Number.isInteger(compactValue) ? compactValue.toFixed(0) : compactValue.toFixed(1)
      return `${displayValue.replace(/\.0$/, '')}k`
    }

    return `${value}`
  }

  function cleanup() {
    clearWordCountTimer()

    if (wordCountTooltipTimer !== null) {
      window.clearTimeout(wordCountTooltipTimer)
      wordCountTooltipTimer = null
    }
  }

  return {
    wordCountState,
    surfaceWidth,
    isWordCountTooltipVisible,
    isCompactWordCount,
    wordCountAriaLabel,
    maxLengthStatus,
    updateSurfaceWidth,
    handleWordCountMouseEnter,
    handleWordCountMouseLeave,
    resetWordCountState,
    scheduleWordCountRefresh,
    clearWordCountTimer,
    refreshWordCountNow,
    countFromPlainText,
    formatFullWordCount,
    formatVisibleWordCount,
    cleanup,
  }
}
