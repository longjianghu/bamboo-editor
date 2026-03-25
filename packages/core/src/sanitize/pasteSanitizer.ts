import type { SanitizeOptions } from './types'
import { sanitizeHtml } from './sanitizeHtml'

const WRAPPER_TAGS = ['article', 'section', 'main', 'header', 'footer', 'aside', 'figure', 'figcaption']

export function sanitizePastedHtml(html: string, options?: SanitizeOptions): string {
  return sanitizeHtml(normalizePastedHtml(html), options)
}

function normalizePastedHtml(html: string) {
  if (typeof document === 'undefined') {
    return html
  }

  const container = document.createElement('div')
  container.innerHTML = html

  for (const selector of ['[style]', '[class]', '[id]']) {
    for (const element of Array.from(container.querySelectorAll(selector))) {
      element.removeAttribute(selector.slice(1, -1))
    }
  }

  for (const tag of WRAPPER_TAGS) {
    unwrapElements(container, tag)
  }

  for (const div of Array.from(container.querySelectorAll('div'))) {
    const hasBlockChildren = Array.from(div.children).some((child) => isBlockLikeTag(child.tagName.toLowerCase()))
    if (hasBlockChildren) {
      unwrapElement(div)
      continue
    }

    if (div.innerHTML.trim()) {
      const paragraph = document.createElement('p')
      while (div.firstChild) {
        paragraph.appendChild(div.firstChild)
      }
      div.replaceWith(paragraph)
    }
    else {
      div.remove()
    }
  }

  return container.innerHTML
}

function unwrapElements(container: HTMLElement, tag: string) {
  for (const element of Array.from(container.querySelectorAll(tag))) {
    unwrapElement(element)
  }
}

function unwrapElement(element: Element) {
  const parent = element.parentNode
  if (!parent) {
    return
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

function isBlockLikeTag(tag: string) {
  return ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'img', 'hr'].includes(tag)
}
