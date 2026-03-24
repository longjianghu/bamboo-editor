import Image from '@tiptap/extension-image'

export interface CleanImageOptions {
  allowBase64?: boolean
}

export const CleanImage = Image.extend<CleanImageOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      'data-width': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-width'),
      },
      'data-uploading': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
      'data-local-id': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key, value]) => {
        return ['src', 'alt', 'data-width'].includes(key) && value != null && value !== ''
      }),
    )

    return ['img', attrs]
  },
})
