import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'

export const CleanBulletList = BulletList.extend({
  renderHTML() {
    return ['ul', 0]
  },
})

export const CleanOrderedList = OrderedList.extend({
  renderHTML() {
    return ['ol', 0]
  },
})

export const CleanListItem = ListItem.extend({
  renderHTML() {
    return ['li', 0]
  },
})
