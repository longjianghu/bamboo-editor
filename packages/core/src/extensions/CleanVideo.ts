import { Node } from '@tiptap/core'
import { parseAlign } from '../utils/align'

export interface CleanVideoOptions {
  accept?: string
  maxSize?: number // MB
}

export interface VideoAttrs {
  'src': string | null
  'poster'?: string | null
  'width'?: string | null
  'height'?: string | null
  'data-align'?: 'left' | 'center' | 'right' | null
  'data-width'?: string | null
  'data-height'?: string | null
  'data-local-id'?: string | null
  'data-uploading'?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cleanVideo: {
      setCleanVideo: (attrs: Partial<VideoAttrs>) => ReturnType
    }
  }
}

export const CleanVideo = Node.create<CleanVideoOptions>({
  name: 'video',

  group: 'block',

  selectable: true,

  draggable: true,

  atom: true,

  addOptions() {
    return {
      accept: 'video/mp4',
      maxSize: 50, // 50MB
    }
  },

  addAttributes() {
    return {
      'src': {
        default: null,
      },
      'poster': {
        default: null,
      },
      'controls': {
        default: 'controls',
        parseHTML: element => (element.hasAttribute('controls') ? 'controls' : null),
        renderHTML: () => ({ controls: 'controls' }),
      },
      'width': {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.getAttribute('data-width'),
        renderHTML: (attributes) => {
          if (!attributes.width)
            return {}
          return {
            'width': attributes.width,
            'data-width': attributes.width,
          }
        },
      },
      'height': {
        default: null,
        parseHTML: element => element.getAttribute('height') || element.getAttribute('data-height'),
        renderHTML: (attributes) => {
          if (!attributes.height)
            return {}
          return {
            'height': attributes.height,
            'data-height': attributes.height,
          }
        },
      },
      'data-align': {
        default: 'left',
        parseHTML: element => parseAlign(element.getAttribute('data-align') || element.getAttribute('align')),
        renderHTML: (attributes) => {
          const value = parseAlign(attributes['data-align'])
          // 如果是居左（默认），则不生成 data-align 属性
          if (value === 'left' || !value)
            return {}
          return { 'data-align': value }
        },
      },
      'data-local-id': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
      'data-uploading': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // 只保留有效属性，确保输出干净的 HTML
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key, value]) => {
        const allowed = ['src', 'poster', 'width', 'height', 'data-align', 'controls']
        // 优先使用原生 width/height，移除冗余的 data- 属性
        return allowed.includes(key) && value != null && value !== ''
      }),
    )

    // 默认添加 controls 属性以保持一致性
    if (!attrs.controls) {
      attrs.controls = 'controls'
    }

    return ['video', attrs]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node
      const { src, poster, width, height, 'data-align': align } = currentNode.attrs

      const container = document.createElement('div')
      container.className = 'clean-video-wrapper'

      // 对齐逻辑
      if (align === 'center') {
        container.style.textAlign = 'center'
      }
      else if (align === 'right') {
        container.style.textAlign = 'right'
      }
      else {
        container.style.textAlign = 'left'
      }

      const video = document.createElement('video')
      video.className = 'clean-video'
      video.setAttribute('controls', '')

      if (width) {
        video.style.width = `${width}px`
        video.style.maxWidth = '100%'
      }
      else {
        video.style.width = '100%'
        video.style.maxWidth = '100%'
      }

      if (height) {
        video.style.height = `${height}px`
      }

      if (src) {
        video.setAttribute('src', src)
      }

      if (poster) {
        video.setAttribute('poster', poster)
      }

      // 处理上传状态
      const isUploading = currentNode.attrs['data-uploading'] === 'true'
      if (isUploading) {
        video.classList.add('is-uploading')
      }

      const loadingOverlay = document.createElement('div')
      loadingOverlay.className = 'clean-video-loading'
      loadingOverlay.style.display = isUploading ? 'flex' : 'none'
      loadingOverlay.innerHTML = '<span>上传中...</span>'

      const editButton = document.createElement('button')
      editButton.className = 'clean-video-edit-button'
      editButton.type = 'button'
      editButton.title = '编辑视频'
      editButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      `
      editButton.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        video.pause()
        const pos = typeof getPos === 'function' ? getPos() : undefined
        if (pos !== undefined) {
          ;(editor as any).emit('open-video-dialog', {
            pos,
            node: currentNode,
            data: {
              src: currentNode.attrs.src,
              poster: currentNode.attrs.poster,
              width: currentNode.attrs.width,
              height: currentNode.attrs.height,
              align: currentNode.attrs['data-align'] || 'left',
            },
          })
        }
      })

      container.appendChild(video)
      container.appendChild(editButton)
      container.appendChild(loadingOverlay)

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false
          }

          currentNode = updatedNode
          const newSrc = currentNode.attrs.src
          const newPoster = currentNode.attrs.poster
          const newWidth = currentNode.attrs.width
          const newHeight = currentNode.attrs.height
          const newAlign = parseAlign(currentNode.attrs['data-align'])
          const newUploading = currentNode.attrs['data-uploading']
          const wasUploading = newUploading === 'true'

          if (newSrc !== video.getAttribute('src')) {
            video.setAttribute('src', newSrc)
          }

          if (newPoster !== video.getAttribute('poster')) {
            if (newPoster) {
              video.setAttribute('poster', newPoster)
            }
            else {
              video.removeAttribute('poster')
            }
          }

          if (newAlign === 'center') {
            container.style.textAlign = 'center'
          }
          else if (newAlign === 'right') {
            container.style.textAlign = 'right'
          }
          else {
            container.style.textAlign = 'left'
          }

          if (newWidth) {
            video.style.width = `${newWidth}px`
            video.style.maxWidth = '100%'
          }
          else {
            video.style.width = '100%'
          }

          if (newHeight) {
            video.style.height = `${newHeight}px`
          }
          else {
            video.style.height = ''
          }

          // 更新上传状态
          if (wasUploading) {
            video.classList.add('is-uploading')
            loadingOverlay.style.display = 'flex'
          }
          else {
            video.classList.remove('is-uploading')
            loadingOverlay.style.display = 'none'
          }

          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setCleanVideo:
        (attrs: Partial<VideoAttrs>) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: attrs as VideoAttrs,
            })
          },
    }
  },
})
