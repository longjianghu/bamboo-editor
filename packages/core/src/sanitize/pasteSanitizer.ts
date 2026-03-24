import { sanitizeHtml } from './sanitizeHtml'

export function sanitizePastedHtml(html: string): string {
  return sanitizeHtml(html)
}
