export const DEFAULT_COLOR_TOKENS = ['primary', 'success', 'warning', 'danger', 'muted', 'purple'] as const

export type DefaultColorToken = (typeof DEFAULT_COLOR_TOKENS)[number]

export function normalizeColorTokens(tokens?: readonly string[]) {
  const values = tokens?.filter(Boolean) ?? DEFAULT_COLOR_TOKENS
  return Array.from(new Set(values))
}

export function isValidColorToken(token: string, tokens?: readonly string[]) {
  return normalizeColorTokens(tokens).includes(token)
}
