import { describe, expect, it } from 'vitest'
import { parseAlign } from '../../utils/align'

describe('parseAlign', () => {
  it('should return "left" for input "left"', () => {
    expect(parseAlign('left')).toBe('left')
  })

  it('should return "center" for input "center"', () => {
    expect(parseAlign('center')).toBe('center')
  })

  it('should return "right" for input "right"', () => {
    expect(parseAlign('right')).toBe('right')
  })

  it('should return "left" (default) for null input', () => {
    expect(parseAlign(null)).toBe('left')
  })

  it('should return "left" for other invalid values', () => {
    expect(parseAlign('justify')).toBe('left')
    expect(parseAlign('middle')).toBe('left')
    expect(parseAlign('top')).toBe('left')
  })

  it('should return "left" for empty string', () => {
    expect(parseAlign('')).toBe('left')
  })
})
