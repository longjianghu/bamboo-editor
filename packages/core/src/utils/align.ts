export function parseAlign(value: string | null): 'left' | 'center' | 'right' | null {
  return value === 'left' || value === 'center' || value === 'right' ? value : 'left'
}
