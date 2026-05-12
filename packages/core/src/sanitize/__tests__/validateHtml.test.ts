import { describe, expect, it } from 'vitest'
import { validateHtml } from '../validateHtml'

describe('validateHtml', () => {
  it('should return valid: true with empty errors when document is undefined (Node.js environment)', () => {
    const input = '<p>Hello world</p>'
    const result = validateHtml(input)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should return valid: true for any HTML in Node.js environment', () => {
    const testCases = [
      '<script>alert("XSS")</script>',
      '<iframe src="https://evil.com"></iframe>',
      '<p>Normal HTML</p>',
      '<audio src="https://example.com/audio.mp3"></audio>',
      '<video src="https://example.com/video.mp4"></video>',
    ]

    testCases.forEach((input) => {
      const result = validateHtml(input)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  it('should handle empty string', () => {
    const result = validateHtml('')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should handle complex HTML in Node.js environment', () => {
    const input = '<div><h1>Title</h1><p>Content with <strong>bold</strong> and <em>italic</em></p></div>'
    const result = validateHtml(input)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})
