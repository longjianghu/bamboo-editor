import type { ValidationError, ValidationResult } from './types'

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
  'ul',
  'ol',
  'li',
  'img',
  'pre',
  'blockquote',
])

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  img: new Set(['src', 'alt', 'data-width']),
}

const FORBIDDEN_TAGS = new Set(['script', 'iframe', 'video', 'style'])

function isDangerousUrl(value: string) {
  return /^\s*javascript:/i.test(value)
}

function createContainer(html: string): HTMLDivElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

export function validateHtml(html: string): ValidationResult {
  const container = createContainer(html)
  if (!container) {
    return { valid: true, errors: [] }
  }

  const errors: ValidationError[] = []

  const elements = Array.from(container.querySelectorAll('*'))

  for (const element of elements) {
    const tag = element.tagName.toLowerCase()

    if (FORBIDDEN_TAGS.has(tag) || !ALLOWED_TAGS.has(tag)) {
      errors.push({ type: 'forbidden_tag', tag })
      continue
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value
      const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>()

      if (!allowed.has(name)) {
        errors.push({ type: 'forbidden_attribute', tag, attr: name, value })
        continue
      }

      if ((name === 'src' || name === 'href') && isDangerousUrl(value)) {
        errors.push({ type: 'forbidden_url', tag, attr: name, value })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
