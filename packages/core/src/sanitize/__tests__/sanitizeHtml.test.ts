import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../sanitizeHtml'

describe('sanitizeHtml', () => {
  it('should return input HTML when document is undefined (Node.js environment)', () => {
    const input = '<p>Hello world</p>'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should allow allowed tags to pass through', () => {
    const input = '<p>Paragraph</p><h1>Heading</h1><ul><li>Item</li></ul>'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should pass through tags with allowed attributes', () => {
    const input = '<a href="https://example.com">Link</a>'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should pass through image with allowed attributes', () => {
    const input = '<img src="https://example.com/image.png" alt="Image" data-width="100" data-align="center">'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should pass through heading with data-align', () => {
    const input = '<h1 data-align="center">Centered Heading</h1>'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should pass through span with data-color', () => {
    const input = '<span data-color="primary">Colored text</span>'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })

  it('should pass through audio/video tags', () => {
    const audioInput = '<audio src="https://example.com/audio.mp3" controls></audio>'
    const videoInput = '<video src="https://example.com/video.mp4" controls></video>'

    expect(sanitizeHtml(audioInput)).toBe(audioInput)
    expect(sanitizeHtml(videoInput)).toBe(videoInput)
  })

  it('should return empty string when input is empty', () => {
    const result = sanitizeHtml('')
    expect(result).toBe('')
  })
})
