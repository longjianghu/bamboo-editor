import { isValidColorToken, normalizeColorTokens } from '../colors'
import type { SanitizeOptions } from './types'

const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'a',
  'ul',
  'ol',
  'li',
  'img',
  'video',
  'audio',
  'pre',
  'blockquote',
  'span',
  'hr',
])

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href']),
  h1: new Set(['data-align']),
  h2: new Set(['data-align']),
  h3: new Set(['data-align']),
  p: new Set(['data-align']),
  blockquote: new Set(['data-align']),
  img: new Set(['src', 'alt', 'data-width', 'data-align']),
  video: new Set(['src', 'poster', 'data-width', 'data-height', 'data-align', 'controls']),
  audio: new Set(['src', 'data-align', 'controls']),
  span: new Set(['data-color']),
}

function isDangerousUrl(value: string) {
  return /^\s*(javascript:|data:(?!image\/|video\/|audio\/))/i.test(value)
}

function isValidSrcUrl(value: string) {
  // Allow blob:, data: (for image/video/audio), https:, http:
  return /^blob:/i.test(value) || /^data:/i.test(value) || /^https?:\/\//i.test(value)
}

function isValidAlign(value: string) {
  return value === 'center' || value === 'right'
}

function createContainer(html: string): HTMLDivElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

export function sanitizeHtml(html: string, options?: SanitizeOptions): string {
  const container = createContainer(html)
  if (!container) {
    return html
  }

  const colorTokens = normalizeColorTokens(options?.colorTokens)

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      const tag = element.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tag)) {
        const parent = element.parentNode
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element)
          }
          parent.removeChild(element)
        }
        return
      }

      const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>()
      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase()
        const value = attr.value

        if (!allowed.has(name) || isDangerousUrl(value) || name.startsWith('on')) {
          element.removeAttribute(attr.name)
          continue
        }

        if (name === 'data-align' && !isValidAlign(value)) {
          element.removeAttribute(attr.name)
          continue
        }

        if (name === 'data-color' && !isValidColorToken(value, colorTokens)) {
          element.removeAttribute(attr.name)
        }
      }

      if (tag === 'span' && !element.hasAttribute('data-color')) {
        const parent = element.parentNode
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element)
          }
          parent.removeChild(element)
        }
        return
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child)
    }
  }

  walk(container)

  const VOID_OR_MEDIA_TAGS = new Set(['br', 'img', 'hr', 'video', 'audio'])
  for (const element of Array.from(container.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()
    if (!VOID_OR_MEDIA_TAGS.has(tag) && element.childNodes.length === 0 && !element.textContent?.trim()) {
      element.remove()
    }
  }

  return container.innerHTML
}
