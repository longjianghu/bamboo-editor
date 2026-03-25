import type { SanitizeOptions } from './types'
import { sanitizeHtml } from './sanitizeHtml'

export function sanitizePastedHtml(html: string, options?: SanitizeOptions): string {
  return sanitizeHtml(html, options)
}
