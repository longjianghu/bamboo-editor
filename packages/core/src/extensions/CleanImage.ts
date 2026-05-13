import Image from '@tiptap/extension-image'
import { parseAlign } from '../utils/align'

export interface CleanImageOptions {
  allowBase64?: boolean
}

interface CleanImageAttrs {
  src: string | null
  alt?: string | null
  title?: string | null
  width?: string | null
  height?: string | null
  'data-align'?: 'left' | 'center' | 'right' | null
  'data-local-id'?: string | null
  'data-uploading'?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cleanImage: {
      setCleanImage: (attrs: Partial<CleanImageAttrs>) => ReturnType
    }
  }
}

export const CleanImage = Image.extend<CleanImageOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height'),
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
      'data-uploading': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
      'data-local-id': {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key, value]) => {
        const allowed = ['src', 'alt', 'title', 'width', 'height', 'data-align']
        return allowed.includes(key) && value != null && value !== ''
      }),
    )

    return ['img', attrs]
  },

  addCommands() {
    return {
      setCleanImage:
        (attrs: Partial<CleanImageAttrs>) =>
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
      const { src, alt, width, height, 'data-align': align } = currentNode.attrs

      const container = document.createElement('div')
      container.className = 'clean-image-wrapper'
      container.style.display = 'flex'

      // 对齐逻辑
      if (align === 'center') {
        container.style.justifyContent = 'center'
      } else if (align === 'right') {
        container.style.justifyContent = 'flex-end'
      } else {
        container.style.justifyContent = 'flex-start'
      }

      // 内部相对定位容器，包裹图片和编辑按钮
      const innerWrapper = document.createElement('div')
      innerWrapper.style.position = 'relative'
      innerWrapper.style.display = 'block'
      innerWrapper.style.width = width ? `${width}px` : 'fit-content'
      innerWrapper.style.maxWidth = '100%'

      const img = document.createElement('img')
      img.className = 'clean-image'

      if (src) {
        img.setAttribute('src', src)
      }
      if (alt) {
        img.setAttribute('alt', alt)
      }

      if (width) {
        img.setAttribute('width', width)
        img.style.width = `${width}px`
        img.style.maxWidth = '100%'
      } else {
        img.style.width = 'auto'
        img.style.maxWidth = '100%'
      }

      if (height) {
        img.setAttribute('height', height)
        img.style.height = `${height}px`
      }

      // 处理上传状态
      const isUploading = currentNode.attrs['data-uploading'] === 'true'
      if (isUploading) {
        img.classList.add('is-uploading')
      }

      const loadingOverlay = document.createElement('div')
      loadingOverlay.className = 'clean-image-loading'
      loadingOverlay.style.display = isUploading ? 'flex' : 'none'
      loadingOverlay.innerHTML = '<span>上传中...</span>'

      const editButton = document.createElement('button')
      editButton.className = 'clean-image-edit-button'
      editButton.type = 'button'
      editButton.title = '编辑图片'
      editButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      `
      editButton.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const pos = typeof getPos === 'function' ? getPos() : undefined
        if (pos !== undefined) {
          ;(editor as any).emit('open-image-dialog', {
            pos,
            node: currentNode,
            mode: 'edit',
            initialData: {
              src: currentNode.attrs.src,
              alt: currentNode.attrs.alt,
              width: currentNode.attrs.width,
              height: currentNode.attrs.height,
              align: currentNode.attrs['data-align'] || 'left',
            },
          })
        }
      })

      innerWrapper.appendChild(img)
      innerWrapper.appendChild(editButton)
      innerWrapper.appendChild(loadingOverlay)
      container.appendChild(innerWrapper)

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false
          }

          currentNode = updatedNode
          const newSrc = currentNode.attrs.src
          const newAlt = currentNode.attrs.alt
          const newWidth = currentNode.attrs.width
          const newHeight = currentNode.attrs.height
          const newAlign = parseAlign(currentNode.attrs['data-align'])
          const newUploading = currentNode.attrs['data-uploading']
          const wasUploading = newUploading === 'true'

          if (newSrc !== img.getAttribute('src')) {
            img.setAttribute('src', newSrc)
          }

          if (newAlt !== img.getAttribute('alt')) {
            if (newAlt) {
              img.setAttribute('alt', newAlt)
            } else {
              img.removeAttribute('alt')
            }
          }

          if (newAlign === 'center') {
            container.style.justifyContent = 'center'
          } else if (newAlign === 'right') {
            container.style.justifyContent = 'flex-end'
          } else {
            container.style.justifyContent = 'flex-start'
          }

          if (newWidth) {
            img.setAttribute('width', newWidth)
            img.style.width = `${newWidth}px`
          } else {
            img.removeAttribute('width')
            img.style.width = 'auto'
          }

          if (newHeight) {
            img.setAttribute('height', newHeight)
            img.style.height = `${newHeight}px`
          } else {
            img.removeAttribute('height')
            img.style.height = ''
          }

          // 更新上传状态
          if (wasUploading) {
            img.classList.add('is-uploading')
            loadingOverlay.style.display = 'flex'
          } else {
            img.classList.remove('is-uploading')
            loadingOverlay.style.display = 'none'
          }

          return true
        },
      }
    }
  },
})
