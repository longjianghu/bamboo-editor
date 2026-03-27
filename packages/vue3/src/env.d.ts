declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: Record<string, unknown>) => ReturnType
    }
    history: {
      undo: () => ReturnType
      redo: () => ReturnType
    }
    horizontalRule: {
      setHorizontalRule: () => ReturnType
    }
  }
}
