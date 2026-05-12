import { Node } from '@tiptap/core'
import { parseAlign } from '../utils/align'

export interface CleanAudioOptions {
  accept?: string
  maxSize?: number // MB
}

export interface AudioAttrs {
  src: string | null
  'data-align'?: 'left' | 'center' | 'right' | null
  'data-local-id'?: string | null
  'data-uploading'?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cleanAudio: {
      setCleanAudio: (attrs: Partial<AudioAttrs>) => ReturnType
    }
  }
}

export const CleanAudio = Node.create<CleanAudioOptions>({
  name: 'audio',

  group: 'block',

  selectable: true,

  draggable: true,

  atom: true,

  addOptions() {
    return {
      accept: 'audio/*',
      maxSize: 20, // 20MB
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      'data-align': {
        default: 'left',
        parseHTML: (element) => parseAlign(element.getAttribute('data-align') || element.getAttribute('align')),
        renderHTML: (attributes) => {
          const value = parseAlign(attributes['data-align'])
          if (value === 'left' || !value) return {}
          return { 'data-align': value }
        },
      },
      controls: {
        default: 'controls',
        parseHTML: (element) => (element.hasAttribute('controls') ? 'controls' : null),
        renderHTML: () => ({ controls: 'controls' }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'audio',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key, value]) => {
        const allowed = ['src', 'controls', 'data-align']
        return allowed.includes(key) && value != null && value !== ''
      }),
    )

    if (!attrs.controls) {
      attrs.controls = 'controls'
    }

    return ['audio', attrs]
  },

  addCommands() {
    return {
      setCleanAudio:
        (attrs: Partial<AudioAttrs>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node
      const { src, 'data-align': align } = currentNode.attrs

      const container = document.createElement('div')
      container.className = 'clean-audio-wrapper'

      // 对齐逻辑
      if (align === 'center') {
        container.style.textAlign = 'center'
      } else if (align === 'right') {
        container.style.textAlign = 'right'
      } else {
        container.style.textAlign = 'left'
      }

      const innerWrapper = document.createElement('div')
      innerWrapper.className = 'clean-audio-inner'

      const audio = document.createElement('audio')
      audio.className = 'clean-audio'
      audio.controls = true
      if (src) {
        audio.src = src
      }

      // 选中状态效果
      innerWrapper.addEventListener('click', () => {
        if (typeof getPos === 'function') {
          editor.commands.setNodeSelection(getPos())
        }
      })

      const editButton = document.createElement('button')
      editButton.className = 'clean-audio-edit-button'
      editButton.type = 'button'
      editButton.title = '编辑音频'
      editButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      `
      editButton.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        ;(editor as any).emit('open-audio-dialog', {
          pos: typeof getPos === 'function' ? getPos() : undefined,
          node: currentNode,
          mode: 'edit',
          initialData: {
            src: currentNode.attrs.src,
            align: currentNode.attrs['data-align'] || 'left',
          },
        })
      }

      innerWrapper.appendChild(audio)
      innerWrapper.appendChild(editButton)
      container.appendChild(innerWrapper)

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false

          currentNode = updatedNode
          const newSrc = updatedNode.attrs.src
          const newAlign = updatedNode.attrs['data-align']

          if (newSrc !== audio.src) {
            audio.src = newSrc
            audio.load()
          }

          if (newAlign === 'center') {
            container.style.textAlign = 'center'
          } else if (newAlign === 'right') {
            container.style.textAlign = 'right'
          } else {
            container.style.textAlign = 'left'
          }

          return true
        },
      }
    }
  },
})
