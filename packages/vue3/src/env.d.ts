import '@tiptap/core'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  // eslint-disable-next-line ts/no-empty-object-type
  const component: DefineComponent<{}, {}, any>
  export default component
}

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
