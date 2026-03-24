import Blockquote from '@tiptap/extension-blockquote'

function getAlignAttrs(textAlign: unknown) {
  return textAlign === 'center' || textAlign === 'right'
    ? { 'data-align': textAlign }
    : {}
}

export const CleanBlockquote = Blockquote.extend({
  renderHTML({ node }) {
    return ['blockquote', getAlignAttrs(node.attrs.textAlign), 0]
  },
})
