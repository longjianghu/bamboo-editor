import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { AnyExtension, EditorOptions } from '@tiptap/core'
import { CleanHeading } from './extensions/CleanHeading'
import { CleanImage, type CleanImageOptions } from './extensions/CleanImage'
import { CleanBulletList, CleanListItem, CleanOrderedList } from './extensions/CleanList'
import { CleanBlockquote } from './extensions/CleanBlockquote'
import { CleanCodeBlock } from './extensions/CleanCodeBlock'
import { CleanLink } from './extensions/CleanLink'
import { CleanTextAlign } from './extensions/CleanTextAlign'
import { sanitizeHtml } from './sanitize/sanitizeHtml'
import { validateHtml } from './sanitize/validateHtml'
import { sanitizePastedHtml } from './sanitize/pasteSanitizer'

export interface BambooEditorOptions {
  image?: CleanImageOptions
  placeholder?: string
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
    }),
    Placeholder.configure({
      placeholder: options.placeholder ?? '开始输入内容…',
      emptyEditorClass: 'is-editor-empty',
    }),
    CleanHeading,
    CleanImage.configure(options.image ?? {}),
    CleanLink,
    CleanTextAlign,
    CleanBulletList,
    CleanOrderedList,
    CleanListItem,
    CleanBlockquote,
    CleanCodeBlock,
  ]
}

export function createBambooEditorOptions(options: BambooEditorOptions = {}): Partial<EditorOptions> {
  return {
    extensions: getDefaultExtensions(options),
    editorProps: {
      attributes: {
        class: 'bamboo-editor-content',
      },
      transformPastedHTML: (html) => sanitizePastedHtml(html),
      ...(options.editor?.editorProps ?? {}),
    },
    ...options.editor,
  }
}

export {
  CleanHeading,
  CleanImage,
  CleanLink,
  CleanTextAlign,
  CleanBulletList,
  CleanOrderedList,
  CleanListItem,
  CleanBlockquote,
  CleanCodeBlock,
  sanitizeHtml,
  validateHtml,
  sanitizePastedHtml,
}

export type { ValidationError, ValidationResult } from './sanitize/types'
