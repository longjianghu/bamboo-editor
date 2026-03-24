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
  'pre',
  'blockquote',
])

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href']),
  h1: new Set(['data-align']),
  h2: new Set(['data-align']),
  h3: new Set(['data-align']),
  p: new Set(['data-align']),
  blockquote: new Set(['data-align']),
  img: new Set(['src', 'alt', 'data-width']),
}

function isDangerousUrl(value: string) {
  return /^\s*javascript:/i.test(value)
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

export function sanitizeHtml(html: string): string {
  const container = createContainer(html)
  if (!container) {
    return html
  }

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
        }
      }
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child)
    }
  }

  walk(container)

  for (const element of Array.from(container.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()
    if (tag !== 'br' && tag !== 'img' && element.childNodes.length === 0 && !element.textContent?.trim()) {
      element.remove()
    }
  }

  return container.innerHTML
}
