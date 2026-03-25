import { Mark, mergeAttributes } from '@tiptap/core'
import { isValidColorToken, normalizeColorTokens } from '../colors'

export interface CleanColorOptions {
  colorTokens?: readonly string[]
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (token: string) => ReturnType
      unsetTextColor: () => ReturnType
    }
  }
}

export const CleanColor = Mark.create<CleanColorOptions>({
  name: 'textColor',

  priority: 1000,

  inclusive: false,

  addOptions() {
    return {
      colorTokens: undefined,
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-color]',
        getAttrs: (element) => {
          const token = element instanceof HTMLElement ? element.getAttribute('data-color') : null
          return token && isValidColorToken(token, this.options.colorTokens) ? { 'data-color': token } : false
        },
      },
    ]
  },

  addAttributes() {
    return {
      'data-color': {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const token = element.getAttribute('data-color')
          return token && isValidColorToken(token, this.options.colorTokens) ? token : null
        },
        renderHTML: (attributes: { 'data-color'?: string | null }) => {
          const token = attributes['data-color']
          return token && isValidColorToken(token, this.options.colorTokens) ? { 'data-color': token } : {}
        },
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const token = typeof HTMLAttributes['data-color'] === 'string' ? HTMLAttributes['data-color'] : null
    if (!token || !isValidColorToken(token, this.options.colorTokens)) {
      return ['span', 0]
    }

    return ['span', mergeAttributes(this.options.HTMLAttributes, { 'data-color': token }), 0]
  },

  addCommands() {
    return {
      setTextColor: (token) => ({ commands }) => {
        if (!isValidColorToken(token, this.options.colorTokens)) {
          return false
        }

        return commands.setMark(this.name, { 'data-color': token })
      },
      unsetTextColor: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addStorage() {
    return {
      colorTokens: normalizeColorTokens(this.options.colorTokens),
    }
  },
})
