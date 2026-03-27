import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { SanitizeOptions } from './sanitize/types'
import { sanitizeHtml } from './sanitize/sanitizeHtml'

export const MAX_LENGTH_FEEDBACK_EVENT = 'bamboo-editor:max-length-feedback'

export interface MaxLengthFeedbackDetail {
  kind: 'limit' | 'truncated'
  message: string
}

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'li', 'pre'])
const VOID_TAGS = new Set(['br', 'img', 'hr'])

export function countTextCharacters(value: string) {
  return Array.from(value).length
}

export function truncateText(value: string, maxLength: number) {
  if (maxLength <= 0) {
    return ''
  }

  return Array.from(value).slice(0, maxLength).join('')
}

export function getDocumentPlainText(state: EditorState) {
  return state.doc.textBetween(0, state.doc.content.size, '\n', '\n')
}

export function getSelectionPlainText(state: EditorState) {
  const { from, to, empty } = state.selection
  if (empty || from === to) {
    return ''
  }

  return state.doc.textBetween(from, to, '\n', '\n')
}

export function getDocumentCharacterCount(state: EditorState) {
  return countTextCharacters(getDocumentPlainText(state))
}

export function getSelectionCharacterCount(state: EditorState) {
  return countTextCharacters(getSelectionPlainText(state))
}

export function getAllowedCharacterCount(state: EditorState, maxLength: number) {
  return Math.max(0, maxLength - getDocumentCharacterCount(state) + getSelectionCharacterCount(state))
}

export function getVisibleTextFromHtml(html: string) {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '')
  }

  const container = document.createElement('div')
  container.innerHTML = html
  return extractTextFromNode(container).replace(/\r\n?/g, '\n')
}

export function plainTextToHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n')
  if (!normalized) {
    return ''
  }

  return normalized
    .split('\n')
    .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}

export function truncateHtmlToCharacterLimit(html: string, maxLength: number, options?: SanitizeOptions) {
  const sanitized = sanitizeHtml(html, options)
  if (typeof document === 'undefined') {
    return sanitizeHtml(plainTextToHtml(truncateText(getVisibleTextFromHtml(sanitized), maxLength)), options)
  }

  const container = document.createElement('div')
  container.innerHTML = sanitized
  const state = { remaining: maxLength }
  trimChildren(container, state)
  return sanitizeHtml(container.innerHTML, options)
}

export function trimDocumentToCharacterLimit(view: EditorView, maxLength: number) {
  let remaining = maxLength
  const ranges: Array<{ from: number, to: number }> = []

  view.state.doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text ?? ''
      const textLength = countTextCharacters(text)
      if (remaining <= 0) {
        ranges.push({ from: pos, to: pos + text.length })
        return false
      }

      if (textLength > remaining) {
        const keepText = truncateText(text, remaining)
        ranges.push({ from: pos + keepText.length, to: pos + text.length })
        remaining = 0
        return false
      }

      remaining -= textLength
      return false
    }

    if (node.type.name === 'hardBreak') {
      if (remaining <= 0) {
        ranges.push({ from: pos, to: pos + node.nodeSize })
        return false
      }

      remaining -= 1
      return false
    }

    return true
  })

  if (!ranges.length) {
    return false
  }

  let tr = view.state.tr
  for (const range of [...ranges].sort((left, right) => right.from - left.from)) {
    tr = tr.delete(range.from, range.to)
  }

  if (!tr.docChanged) {
    return false
  }

  view.dispatch(tr.scrollIntoView())
  return true
}

export function insertHtmlAtSelection(view: EditorView, html: string) {
  if (typeof document === 'undefined') {
    return
  }

  const container = view.dom.ownerDocument.createElement('div')
  container.innerHTML = html
  const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(container, { preserveWhitespace: true })
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
}

export function dispatchMaxLengthFeedback(view: EditorView, detail: MaxLengthFeedbackDetail) {
  if (typeof CustomEvent === 'undefined') {
    return
  }

  view.dom.dispatchEvent(new CustomEvent<MaxLengthFeedbackDetail>(MAX_LENGTH_FEEDBACK_EVENT, {
    detail,
  }))
}

function trimChildren(parent: Node, state: { remaining: number }) {
  for (const child of Array.from(parent.childNodes)) {
    trimNode(child, state)
  }
}

function trimNode(node: Node, state: { remaining: number }) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) {
      node.parentNode?.removeChild(node)
      return
    }

    const length = countTextCharacters(text)
    if (state.remaining <= 0) {
      node.parentNode?.removeChild(node)
      return
    }

    if (length > state.remaining) {
      node.textContent = truncateText(text, state.remaining)
      state.remaining = 0
      return
    }

    state.remaining -= length
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.parentNode?.removeChild(node)
    return
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (tag === 'br') {
    if (state.remaining <= 0) {
      element.remove()
      return
    }

    state.remaining -= 1
    return
  }

  trimChildren(element, state)

  if (BLOCK_TAGS.has(tag) && hasRenderableContent(element) && state.remaining > 0 && hasFollowingRenderableSibling(element)) {
    state.remaining -= 1
  }

  if (!VOID_TAGS.has(tag) && !hasRenderableContent(element)) {
    element.remove()
  }
}

function hasRenderableContent(element: HTMLElement): boolean {
  if (VOID_TAGS.has(element.tagName.toLowerCase())) {
    return true
  }

  if (element.textContent?.trim()) {
    return true
  }

  return Array.from(element.children).some(child => hasRenderableContent(child as HTMLElement))
}

function hasFollowingRenderableSibling(element: HTMLElement): boolean {
  let sibling = element.nextElementSibling
  while (sibling) {
    if (hasRenderableContent(sibling as HTMLElement)) {
      return true
    }
    sibling = sibling.nextElementSibling
  }

  return false
}

function extractTextFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (tag === 'img' || tag === 'hr') {
    return ''
  }

  if (tag === 'br') {
    return '\n'
  }

  let result = ''
  const children = Array.from(element.childNodes)
  children.forEach((child, index) => {
    result += extractTextFromNode(child)
    if (BLOCK_TAGS.has((child as HTMLElement | undefined)?.tagName?.toLowerCase?.() ?? '') && index < children.length - 1) {
      result += '\n'
    }
  })

  if (BLOCK_TAGS.has(tag) && result && !result.endsWith('\n')) {
    result += '\n'
  }

  return result
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
