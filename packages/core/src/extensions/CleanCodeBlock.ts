import CodeBlock from '@tiptap/extension-code-block'

export const CleanCodeBlock = CodeBlock.extend({
  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key]) => key === 'data-language'),
    )

    return ['pre', ['code', attrs, 0]]
  },
})
