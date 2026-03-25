import { isValidColorToken, normalizeColorTokens } from '../colors'
import type { SanitizeOptions, ValidationError, ValidationResult } from './types'

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
  span: new Set(['data-color']),
}

const FORBIDDEN_TAGS = new Set(['script', 'iframe', 'video', 'style'])

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

export function validateHtml(html: string, options?: SanitizeOptions): ValidationResult {
  const container = createContainer(html)
  if (!container) {
    return { valid: true, errors: [] }
  }

  const errors: ValidationError[] = []
  const colorTokens = normalizeColorTokens(options?.colorTokens)
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

      if (name === 'data-align' && !isValidAlign(value)) {
        errors.push({ type: 'forbidden_attribute', tag, attr: name, value })
      }

      if (name === 'data-color' && !isValidColorToken(value, colorTokens)) {
        errors.push({ type: 'forbidden_color', tag, attr: name, value })
      }
    }

    if (tag === 'span' && !element.hasAttribute('data-color')) {
      errors.push({ type: 'forbidden_attribute', tag, attr: 'data-color' })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
