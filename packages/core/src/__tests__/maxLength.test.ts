import { describe, expect, it } from 'vitest'
import { countTextCharacters, truncateText, plainTextToHtml, getVisibleTextFromHtml } from '../maxLength'

describe('countTextCharacters', () => {
  it('should count ASCII characters correctly', () => {
    expect(countTextCharacters('hello')).toBe(5)
  })

  it('should count empty string as 0', () => {
    expect(countTextCharacters('')).toBe(0)
  })

  it('should count emoji as 1 character each', () => {
    expect(countTextCharacters('😀')).toBe(1)
    expect(countTextCharacters('😀😀')).toBe(2)
  })

  it('should count Chinese characters correctly', () => {
    expect(countTextCharacters('你好世界')).toBe(4)
  })

  it('should count mixed content correctly', () => {
    expect(countTextCharacters('a😀b')).toBe(3)
  })
})

describe('truncateText', () => {
  it('should truncate text to specified length', () => {
    expect(truncateText('hello world', 5)).toBe('hello')
  })

  it('should return full text if maxLength is greater than text length', () => {
    expect(truncateText('hi', 10)).toBe('hi')
  })

  it('should return empty string if maxLength is 0', () => {
    expect(truncateText('hello', 0)).toBe('')
  })

  it('should return empty string if maxLength is negative', () => {
    expect(truncateText('hello', -1)).toBe('')
  })

  it('should handle emoji truncation correctly', () => {
    expect(truncateText('😀😂😎', 2)).toBe('😀😂')
  })

  it('should handle empty input', () => {
    expect(truncateText('', 5)).toBe('')
  })
})

describe('plainTextToHtml', () => {
  it('should wrap a single line in <p> tags', () => {
    expect(plainTextToHtml('Hello')).toBe('<p>Hello</p>')
  })

  it('should escape HTML entities', () => {
    expect(plainTextToHtml('<script>alert("xss")</script>')).toBe(
      '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>'
    )
  })

  it('should convert newlines to separate <p> elements', () => {
    expect(plainTextToHtml('Hello\nWorld')).toBe('<p>Hello</p><p>World</p>')
  })

  it('should produce <br> for empty lines', () => {
    expect(plainTextToHtml('')).toBe('')
    expect(plainTextToHtml('a\n\nb')).toBe('<p>a</p><p><br></p><p>b</p>')
  })

  it('should normalize \\r\\n to \\n', () => {
    expect(plainTextToHtml('a\r\nb')).toBe('<p>a</p><p>b</p>')
  })
})

describe('getVisibleTextFromHtml', () => {
  it('should strip HTML tags in Node.js environment', () => {
    expect(getVisibleTextFromHtml('<p>Hello</p>')).toBe('Hello')
  })

  it('should handle nested tags', () => {
    expect(getVisibleTextFromHtml('<div><p>Hello <strong>World</strong></p></div>')).toBe('Hello World')
  })

  it('should return empty string for empty HTML', () => {
    expect(getVisibleTextFromHtml('')).toBe('')
  })

  it('should return raw text if no tags', () => {
    expect(getVisibleTextFromHtml('just text')).toBe('just text')
  })
})
