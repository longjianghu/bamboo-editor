import Blockquote from '@tiptap/extension-blockquote'

export const CleanBlockquote = Blockquote.extend({
  renderHTML() {
    return ['blockquote', 0]
  },
})
