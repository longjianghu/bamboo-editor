import Heading from '@tiptap/extension-heading'

export const CleanHeading = Heading.extend({
  levels: [1, 2, 3],

  renderHTML({ node }) {
    return [`h${node.attrs.level}`, 0]
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
        parseHTML: (element) => {
          const level = Number(element.tagName.charAt(1))
          return [1, 2, 3].includes(level) ? level : 1
        },
      },
    }
  },
})
