import TextAlign from '@tiptap/extension-text-align'

type AlignValue = 'center' | 'right'

function parseAlign(value: string | null): AlignValue | null {
  return value === 'center' || value === 'right' ? value : null
}

export const CleanTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element: HTMLElement) => parseAlign(element.getAttribute('data-align')),
            renderHTML: (attributes: { textAlign?: string | null }) => {
              const value = parseAlign(attributes.textAlign ?? null)
              return value ? { 'data-align': value } : {}
            },
          },
        },
      },
    ]
  },
}).configure({
  types: ['paragraph', 'heading', 'blockquote'],
  alignments: ['center', 'right'],
})
