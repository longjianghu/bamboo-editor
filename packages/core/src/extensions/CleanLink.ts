import Link from '@tiptap/extension-link'

export const CleanLink = Link.extend({
  inclusive: false,

  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key, value]) => key === 'href' && value != null && value !== ''),
    )

    return ['a', attrs, 0]
  },
})
