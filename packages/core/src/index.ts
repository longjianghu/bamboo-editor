import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import HardBreak from '@tiptap/extension-hard-break'
import Placeholder from '@tiptap/extension-placeholder'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import type { AnyExtension, EditorOptions } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import { DEFAULT_COLOR_TOKENS } from './colors'
import { CleanHeading } from './extensions/CleanHeading'
import { CleanImage, type CleanImageOptions } from './extensions/CleanImage'
import { CleanBulletList, CleanListItem, CleanOrderedList } from './extensions/CleanList'
import { CleanBlockquote } from './extensions/CleanBlockquote'
import { CleanCodeBlock } from './extensions/CleanCodeBlock'
import { CleanLink } from './extensions/CleanLink'
import { CleanTextAlign } from './extensions/CleanTextAlign'
import { CleanColor } from './extensions/CleanColor'
import {
  countTextCharacters,
  dispatchMaxLengthFeedback,
  getAllowedCharacterCount,
  getDocumentCharacterCount,
  insertHtmlAtSelection,
  MAX_LENGTH_FEEDBACK_EVENT,
  plainTextToHtml,
  trimDocumentToCharacterLimit,
  truncateHtmlToCharacterLimit,
  truncateText,
} from './maxLength'
import { sanitizeHtml } from './sanitize/sanitizeHtml'
import { sanitizePastedHtml } from './sanitize/pasteSanitizer'
import { validateHtml } from './sanitize/validateHtml'

export interface BambooEditorOptions {
  image?: CleanImageOptions
  placeholder?: string
  colorTokens?: string[]
  maxLength?: number
  editor?: Partial<EditorOptions>
}

export function getDefaultExtensions(options: BambooEditorOptions = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      hardBreak: false,
    }),
    HardBreak,
    Placeholder.configure({
      placeholder: options.placeholder ?? '开始输入内容…',
      emptyEditorClass: 'is-editor-empty',
    }),
    CharacterCount.configure({
      limit: options.maxLength,
      textCounter: (text) => countTextCharacters(text),
    }),
    CleanHeading,
    CleanImage.configure(options.image ?? {}),
    CleanLink,
    CleanTextAlign,
    CleanColor.configure({
      colorTokens: options.colorTokens ?? [...DEFAULT_COLOR_TOKENS],
    }),
    CleanBulletList,
    CleanOrderedList,
    CleanListItem,
    CleanBlockquote,
    CleanCodeBlock,
  ]
}

export function createBambooEditorOptions(options: BambooEditorOptions = {}): Partial<EditorOptions> {
  const baseEditorProps = options.editor?.editorProps ?? {}
  const maxLengthContext = createMaxLengthContext(options)

  return {
    extensions: getDefaultExtensions(options),
    editorProps: {
      ...baseEditorProps,
      attributes: {
        class: 'bamboo-editor-content',
        ...(baseEditorProps.attributes ?? {}),
      },
      transformPastedHTML: (html) => {
        const transformed = baseEditorProps.transformPastedHTML
          ? (baseEditorProps.transformPastedHTML as (html: string, view?: EditorView | null) => string)(html, maxLengthContext.view)
          : html
        return sanitizePastedHtml(transformed, { colorTokens: options.colorTokens })
      },
      transformPastedText: (text, plain) => {
        const transformed = baseEditorProps.transformPastedText
          ? (baseEditorProps.transformPastedText as (text: string, plain: boolean, view?: EditorView | null) => string)(text, plain, maxLengthContext.view)
          : text

        if (!options.maxLength || !maxLengthContext.view) {
          return transformed
        }

        const allowed = getAllowedCharacterCount(maxLengthContext.view.state, options.maxLength)
        if (allowed <= 0) {
          dispatchMaxLengthFeedback(maxLengthContext.view, { kind: 'limit', message: '已达到字数上限' })
          return ''
        }

        const truncated = truncateText(transformed, allowed)
        if (truncated !== transformed) {
          dispatchMaxLengthFeedback(maxLengthContext.view, { kind: 'truncated', message: '内容过长，已自动截断' })
        }

        return truncated
      },
      handleTextInput: (view, from, to, text) => {
        maxLengthContext.view = view
        const handled = baseEditorProps.handleTextInput
          ? (baseEditorProps.handleTextInput as unknown as (view: EditorView, from: number, to: number, text: string, deflt: () => boolean) => boolean)(view, from, to, text, () => false)
          : false
        if (handled || !options.maxLength || maxLengthContext.isComposing) {
          return handled ?? false
        }

        const selectionLength = countTextCharacters(view.state.doc.textBetween(from, to, '\n', '\n'))
        const allowed = Math.max(0, options.maxLength - getDocumentCharacterCount(view.state) + selectionLength)
        if (allowed <= 0) {
          dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
          return true
        }

        if (countTextCharacters(text) <= allowed) {
          return false
        }

        const truncated = truncateText(text, allowed)
        if (!truncated) {
          dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
          return true
        }

        view.dispatch(view.state.tr.insertText(truncated, from, to).scrollIntoView())
        dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
        return true
      },
      handlePaste: (view, event, slice) => {
        maxLengthContext.view = view
        const handled = baseEditorProps.handlePaste?.(view, event, slice)
        if (handled || !options.maxLength) {
          return handled ?? false
        }

        const allowed = getAllowedCharacterCount(view.state, options.maxLength)
        if (allowed <= 0) {
          dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
          return true
        }

        const clipboardData = event?.clipboardData
        const rawHtml = clipboardData?.getData('text/html') ?? ''
        const rawText = clipboardData?.getData('text/plain') ?? ''
        if (!rawHtml && !rawText) {
          return false
        }

        if (rawHtml) {
          const sanitized = sanitizePastedHtml(rawHtml, { colorTokens: options.colorTokens })
          const truncatedHtml = truncateHtmlToCharacterLimit(sanitized, allowed, { colorTokens: options.colorTokens })
          const changed = truncatedHtml !== sanitized
          if (!truncatedHtml) {
            dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
            return true
          }

          insertHtmlAtSelection(view, truncatedHtml)
          dispatchMaxLengthFeedback(view, {
            kind: changed ? 'truncated' : 'limit',
            message: changed ? '内容过长，已自动截断' : '已达到字数上限',
          })
          return true
        }

        const truncatedText = truncateText(rawText, allowed)
        if (!truncatedText) {
          dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
          return true
        }

        insertHtmlAtSelection(view, plainTextToHtml(truncatedText))
        dispatchMaxLengthFeedback(view, {
          kind: truncatedText === rawText ? 'limit' : 'truncated',
          message: truncatedText === rawText ? '已达到字数上限' : '内容过长，已自动截断',
        })
        return true
      },
      handleDOMEvents: {
        ...(baseEditorProps.handleDOMEvents ?? {}),
        compositionstart: (view, event) => {
          maxLengthContext.view = view
          maxLengthContext.isComposing = true
          return baseEditorProps.handleDOMEvents?.compositionstart?.(view, event) ?? false
        },
        compositionend: (view, event) => {
          maxLengthContext.view = view
          maxLengthContext.isComposing = false
          const handled = baseEditorProps.handleDOMEvents?.compositionend?.(view, event) ?? false
          if (options.maxLength && getDocumentCharacterCount(view.state) > options.maxLength) {
            const changed = trimDocumentToCharacterLimit(view, options.maxLength)
            if (changed) {
              dispatchMaxLengthFeedback(view, { kind: 'limit', message: '已达到字数上限' })
            }
          }
          return handled
        },
        keydown: (view, event) => {
          maxLengthContext.view = view
          return baseEditorProps.handleDOMEvents?.keydown?.(view, event) ?? false
        },
      },
    },
    ...options.editor,
  }
}

function createMaxLengthContext(options: BambooEditorOptions) {
  return {
    isComposing: false,
    view: null as EditorView | null,
    maxLength: options.maxLength,
  }
}

export {
  CleanHeading,
  CleanImage,
  CleanLink,
  CleanTextAlign,
  CleanColor,
  CleanBulletList,
  CleanOrderedList,
  CleanListItem,
  CleanBlockquote,
  CleanCodeBlock,
  sanitizeHtml,
  validateHtml,
  sanitizePastedHtml,
  MAX_LENGTH_FEEDBACK_EVENT,
}

export type { ValidationError, ValidationResult } from './sanitize/types'
export type { MaxLengthFeedbackDetail } from './maxLength'
